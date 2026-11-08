-- 불빛을 거두고 바로 다시 보탤 수 있게 하기
-- 전에는 새 불빛을 30초에 한 번만 보탤 수 있어서, 불빛을 거두자마자 다시 보태면 막혔다.
-- 이제는 기다리는 시간 없이 바로 다시 보탤 수 있고,
-- 껐다 켰다를 아주 여러 번 하는 도배만 '10분 동안 새 불빛 10번까지'로 막는다.
-- (한 사람당 떠 있는 불빛은 여전히 1개. 이미 떠 있으면 새로 만들지 않고 만료 시간도 늘리지 않는다)
--
-- Supabase SQL Editor 에서 한 번 실행하면 된다. 다시 실행해도 안전하다.
-- 기존 데이터는 지우지 않는다. (요청 제한 표에 칸 두 개를 더하고, 불빛 보태기 함수만 바꾼다)

alter table public.user_rate_limits
  add column if not exists light_window_start timestamptz,
  add column if not exists light_window_count integer not null default 0;

-- 불빛 하나 보태기
--  p_source = 'manual' : 사용자가 버튼을 눌렀을 때 (manual, auto 모드에서 가능)
--  p_source = 'auto'   : 새 앱 세션에서 자동 공개 (auto 모드 + 동의가 있어야 가능)
-- (create or replace 라서 기존 실행 권한은 그대로 유지된다)
create or replace function public.publish_light(p_source text)
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
  window_start timestamptz;
  window_count integer;
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

  -- 도배 방지: 10분 동안 새 불빛은 10번까지. 처음이거나 10분이 지났으면 새로 센다.
  -- (기다리는 시간이 없어서, 불빛을 거두고 바로 다시 보탤 수 있다)
  if limits.light_window_start is null or limits.light_window_start <= now() - interval '10 minutes' then
    window_start := now();
    window_count := 0;
  else
    window_start := limits.light_window_start;
    window_count := limits.light_window_count;
  end if;
  if window_count >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- 만료되었거나 거둔 내 불빛 행이 남아 있으면 정리
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

  update public.user_rate_limits
     set last_light_at = now(),
         light_window_start = window_start,
         light_window_count = window_count + 1
   where user_id = uid;

  perform realtime.send(public._light_public_json(created), 'light_added', 'shared-sky', true);

  return jsonb_build_object(
    'status', 'published',
    'server_time', now(),
    'light', public._light_public_json(created)
  );
end;
$$;
