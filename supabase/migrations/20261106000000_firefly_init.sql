-- ════════════════════════════════════════════════════════════════
-- 반딧불이 MVP 1.0 — 초기 데이터베이스 구성
--
-- 원칙
--  · 모든 테이블에 RLS(행 단위 보안)를 켠다.
--  · 공개 불빛 테이블(presence_lights)은 브라우저에서 직접 읽을 수 없다.
--    owner_id 를 숨기기 위해 아래 서버 함수로만 안전한 필드를 돌려준다.
--  · 시간은 항상 서버 시간(now())을 쓴다.
--  · 온기 퍼뜨리기는 기록 테이블을 만들지 않는다. (도배 방지용 마지막 시각만 보관)
--
-- 숫자 규칙 (src/lib/lightRules.ts 와 같아야 한다)
--  · 불빛 유지 120분 / 새 불빛 간격 30초 / 온기 간격 30초
-- ════════════════════════════════════════════════════════════════


-- ── 1. 사용자 설정 ─────────────────────────────────────────────

create table public.user_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  visibility_mode   text not null default 'private'
                    check (visibility_mode in ('private', 'manual', 'auto')),
  -- 자동 공개에 명시적으로 동의한 시각. auto 가 아니면 항상 null
  auto_consent_at   timestamptz,
  reduce_motion     boolean not null default false,
  sound_enabled     boolean not null default false,
  vibration_enabled boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint auto_requires_consent
    check (visibility_mode <> 'auto' or auto_consent_at is not null)
);

comment on table public.user_settings is '사용자별 설정. 본인만 읽고 쓸 수 있다.';


-- ── 2. 연령 확인 기록 ───────────────────────────────────────────
-- 생년월일, 주민등록번호, 신분증 이미지는 저장하지 않는다. 연령 구간만 저장한다.

create table public.age_gate_records (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  age_category           text not null
                         check (age_category in ('adult', 'teen_14_plus', 'under_14')),
  -- allowed: 이용 가능 / guardian_required: 만 14세 미만, 보호자 확인 수단이 없어 이용 불가
  consent_status         text not null
                         check (consent_status in ('allowed', 'guardian_required')),
  consent_version        text not null check (length(consent_version) between 1 and 64),
  -- 적법한 보호자 확인 수단이 도입되면 그 확인 결과의 참조값을 넣는다. 지금은 항상 null
  verification_reference text,
  created_at             timestamptz not null default now(),
  -- 만 14세 미만은 보호자 확인 없이는 절대 allowed 가 될 수 없다
  constraint under_14_requires_verification
    check (age_category <> 'under_14' or consent_status = 'guardian_required'
           or verification_reference is not null)
);

comment on table public.age_gate_records is
  '연령 구간과 동의 상태. 브라우저는 읽기만 가능하고, 기록은 submit_age_gate() 로만 만든다.';


-- ── 3. 공동 밤하늘의 불빛 ───────────────────────────────────────

create table public.presence_lights (
  id          uuid primary key default gen_random_uuid(),
  -- unique: 한 사람당 불빛 행은 최대 1개 → 중복 등록을 데이터베이스 수준에서 막는다
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  -- 0~1 사이의 화면 좌표. 실제 위치와 무관한 무작위 값
  x_position  real not null check (x_position between 0 and 1),
  y_position  real not null check (y_position between 0 and 1),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  check (expires_at > created_at)
);

create index presence_lights_expires_at_idx on public.presence_lights (expires_at);

comment on table public.presence_lights is
  '공개 불빛. owner_id 보호를 위해 브라우저 접근 정책이 없다. 서버 함수로만 다룬다.';


-- ── 4. 도배 방지용 마지막 요청 시각 ─────────────────────────────
-- 이력이 아니라 사람당 한 줄. 새 요청마다 덮어쓴다.

create table public.user_rate_limits (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  last_light_at timestamptz,
  last_wave_at  timestamptz
);


-- ── 5. 권한: 기본 권한을 모두 걷어낸 뒤 필요한 것만 연다 ──────

revoke all on public.user_settings, public.age_gate_records,
              public.presence_lights, public.user_rate_limits
  from anon, authenticated;

grant select, insert, update on public.user_settings to authenticated;
grant select on public.age_gate_records to authenticated;
-- presence_lights, user_rate_limits: 브라우저 권한 없음

alter table public.user_settings    enable row level security;
alter table public.age_gate_records enable row level security;
alter table public.presence_lights  enable row level security;
alter table public.user_rate_limits enable row level security;

create policy "본인 설정 읽기" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "본인 설정 만들기" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "본인 설정 바꾸기" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "본인 연령 확인 상태 읽기" on public.age_gate_records
  for select to authenticated
  using ((select auth.uid()) = user_id);


-- ── 6. 내부 도우미 함수 ─────────────────────────────────────────

-- 지금 요청한 사용자가 서비스를 이용할 수 있는지
create function public.has_service_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.age_gate_records
    where user_id = auth.uid() and consent_status = 'allowed'
  );
$$;

-- 불빛을 브라우저에 보내도 되는 모양으로 바꾼다 (owner_id 제외)
create function public._light_public_json(l public.presence_lights)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id,
    'x', l.x_position,
    'y', l.y_position,
    'created_at', l.created_at,
    'expires_at', l.expires_at
  );
$$;

-- 특정 사용자의 공개 불빛을 내리고, 다른 사람 화면에서도 사라지도록 알린다
create function public._remove_light_of(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_id uuid;
  was_active boolean;
begin
  delete from public.presence_lights
  where owner_id = p_user
  returning id, expires_at > now() into removed_id, was_active;

  if removed_id is null then
    return false;
  end if;

  if was_active then
    perform realtime.send(
      jsonb_build_object('id', removed_id),
      'light_removed',
      'shared-sky',
      true
    );
  end if;
  return true;
end;
$$;

-- 요청하는 사용자를 확인한다 (로그인 + 연령 확인)
create function public._require_access()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.has_service_access() then
    raise exception 'access_not_allowed' using errcode = '42501';
  end if;
  return uid;
end;
$$;


-- ── 7. 설정 변경 시 자동 처리 ───────────────────────────────────

create function public._user_settings_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- 자동 공개를 해제하면 동의도 함께 지운다
  if new.visibility_mode <> 'auto' then
    new.auto_consent_at := null;
  end if;
  return new;
end;
$$;

create trigger user_settings_before_write
  before insert or update on public.user_settings
  for each row execute function public._user_settings_before_write();

-- 비공개로 바꾸면 지금 떠 있는 공개 불빛도 함께 내린다
create function public._user_settings_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility_mode = 'private' then
    perform public._remove_light_of(new.user_id);
  end if;
  return null;
end;
$$;

create trigger user_settings_after_write
  after insert or update of visibility_mode on public.user_settings
  for each row execute function public._user_settings_after_write();


-- ── 8. 브라우저에서 부르는 함수 ─────────────────────────────────

-- 연령 확인 기록. 한 번 기록되면 덮어쓰지 않는다.
create function public.submit_age_gate(p_age_category text, p_consent_version text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing text;
  status text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_age_category not in ('adult', 'teen_14_plus', 'under_14') then
    raise exception 'invalid_age_category' using errcode = '22023';
  end if;
  if p_consent_version is null or length(p_consent_version) not between 1 and 64 then
    raise exception 'invalid_consent_version' using errcode = '22023';
  end if;

  select consent_status into existing from public.age_gate_records where user_id = uid;
  if existing is not null then
    return existing;
  end if;

  -- 만 14세 미만: 적법한 보호자 확인 수단이 준비되기 전까지 이용 불가로 기록한다.
  status := case when p_age_category = 'under_14' then 'guardian_required' else 'allowed' end;

  insert into public.age_gate_records (user_id, age_category, consent_status, consent_version)
  values (uid, p_age_category, status, p_consent_version);

  return status;
end;
$$;

-- 공동 밤하늘 조회: 만료되지 않은 불빛의 안전한 필드만 돌려준다
create function public.get_shared_sky()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_access();
  return jsonb_build_object(
    'server_time', now(),
    'lights', coalesce(
      (select jsonb_agg(public._light_public_json(l) order by l.created_at)
       from (select * from public.presence_lights
             where expires_at > now()
             order by created_at desc
             limit 500) l),
      '[]'::jsonb
    )
  );
end;
$$;

-- 내 불빛 조회 (없거나 만료되었으면 null)
create function public.get_my_light()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_access();
  mine public.presence_lights;
begin
  select * into mine from public.presence_lights
  where owner_id = uid and expires_at > now();
  if mine.id is null then
    return null;
  end if;
  return public._light_public_json(mine);
end;
$$;

-- 불빛 하나 보태기
--  p_source = 'manual' : 사용자가 버튼을 눌렀을 때 (manual, auto 모드에서 가능)
--  p_source = 'auto'   : 새 앱 세션에서 자동 공개 (auto 모드 + 동의가 있어야 가능)
create function public.publish_light(p_source text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_access();
  mode text;
  limits public.user_rate_limits;
  existing public.presence_lights;
  created public.presence_lights;
begin
  if p_source not in ('manual', 'auto') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;

  select visibility_mode into mode from public.user_settings where user_id = uid;
  mode := coalesce(mode, 'private');

  if mode = 'private' then
    raise exception 'visibility_private' using errcode = '42501';
  end if;
  if p_source = 'auto' and mode <> 'auto' then
    raise exception 'auto_not_enabled' using errcode = '42501';
  end if;

  -- 같은 사용자의 동시 요청을 한 줄로 세운다
  insert into public.user_rate_limits (user_id) values (uid) on conflict (user_id) do nothing;
  select * into limits from public.user_rate_limits where user_id = uid for update;

  -- 이미 떠 있는 불빛이 있으면 새로 만들지 않고, 만료 시간도 늘리지 않는다
  select * into existing from public.presence_lights where owner_id = uid;
  if existing.id is not null and existing.expires_at > now() then
    return jsonb_build_object(
      'status', 'already_active',
      'server_time', now(),
      'light', public._light_public_json(existing)
    );
  end if;

  if limits.last_light_at is not null and limits.last_light_at > now() - interval '30 seconds' then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- 만료된 내 불빛 행이 남아 있으면 정리
  delete from public.presence_lights where owner_id = uid;

  insert into public.presence_lights (owner_id, x_position, y_position, created_at, expires_at)
  values (
    uid,
    0.08 + random() * 0.84,
    0.10 + random() * 0.60,
    now(),
    now() + interval '120 minutes'
  )
  returning * into created;

  update public.user_rate_limits set last_light_at = now() where user_id = uid;

  perform realtime.send(public._light_public_json(created), 'light_added', 'shared-sky', true);

  return jsonb_build_object(
    'status', 'published',
    'server_time', now(),
    'light', public._light_public_json(created)
  );
end;
$$;

-- 공개 취소: 내 불빛을 바로 내린다
create function public.cancel_my_light()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return public._remove_light_of(uid);
end;
$$;

-- 온기 퍼뜨리기: 특정 사람이 아니라 밤하늘 전체에 짧은 파동을 보낸다.
-- 누가 보냈는지는 전달하지 않고, 기록도 남기지 않는다.
create function public.send_ambient_wave()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public._require_access();
  limits public.user_rate_limits;
  wave uuid := gen_random_uuid();
begin
  insert into public.user_rate_limits (user_id) values (uid) on conflict (user_id) do nothing;
  select * into limits from public.user_rate_limits where user_id = uid for update;

  if limits.last_wave_at is not null and limits.last_wave_at > now() - interval '30 seconds' then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  update public.user_rate_limits set last_wave_at = now() where user_id = uid;

  perform realtime.send(jsonb_build_object('wave_id', wave), 'ambient_wave', 'shared-sky', true);

  return jsonb_build_object('wave_id', wave);
end;
$$;

-- 데이터 삭제: 공개 불빛과 설정을 지운다.
-- 연령 확인 기록은 서비스 이용 조건이라 남기고, 계정 탈퇴 시 함께 삭제된다.
create function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform public._remove_light_of(uid);
  delete from public.user_settings where user_id = uid;
end;
$$;

-- 만료된 불빛 행 정리 (운영자용). 조회에서는 이미 제외되므로 화면에는 영향이 없다.
-- 실행 주기(pg_cron 등)는 운영 방식이 정해진 뒤 설정한다.
create function public.cleanup_expired_lights()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.presence_lights where expires_at <= now() returning 1
  )
  select count(*)::integer from removed;
$$;


-- ── 9. 함수 실행 권한 ───────────────────────────────────────────
-- Postgres 는 기본으로 모든 사람(PUBLIC)에게 함수 실행을 허용하므로 먼저 걷어낸다.

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.has_service_access(),
  public.submit_age_gate(text, text),
  public.get_shared_sky(),
  public.get_my_light(),
  public.publish_light(text),
  public.cancel_my_light(),
  public.send_ambient_wave(),
  public.delete_my_data()
to authenticated;

-- 앞으로 이 스키마에 만드는 함수도 기본으로는 공개하지 않는다
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;


-- ── 10. 실시간 채널 권한 ───────────────────────────────────────
-- 'shared-sky' 비공개 채널: 이용 가능한 로그인 사용자만 받을 수 있다.
-- 보내는(insert) 정책은 만들지 않는다 → 브라우저는 직접 방송할 수 없고, 위 서버 함수만 보낼 수 있다.

create policy "밤하늘 방송 받기" on realtime.messages
  for select to authenticated
  using (
    (select realtime.topic()) = 'shared-sky'
    and realtime.messages.extension in ('broadcast')
    and (select public.has_service_access())
  );
