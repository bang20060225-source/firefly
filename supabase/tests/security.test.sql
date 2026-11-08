-- 반딧불이 데이터베이스 보안·규칙 테스트
-- run-local-db-tests.sh 가 로컬 PostgreSQL 에서 실행한다.
-- 실패하면 오류 메시지와 함께 즉시 멈춘다.

\set ON_ERROR_STOP 1
\set QUIET 1

-- 테스트 도우미 ─────────────────────────────────────────────
create schema t;
grant usage on schema t to anon, authenticated;

create function t.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end $$;

-- 주어진 SQL 이 특정 오류 문구로 실패하는지 확인
create function t.fails(sql text, expected text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL (오류가 나야 함): %', label;
exception when others then
  if sqlerrm like 'FAIL (오류가%' then raise; end if;
  if position(expected in sqlerrm) = 0 then
    raise exception 'FAIL: % — 예상 "%" / 실제 "%"', label, expected, sqlerrm;
  end if;
  raise notice 'PASS: %', label;
end $$;
grant execute on all functions in schema t to anon, authenticated;

create function t.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;
grant execute on function t.act_as(uuid) to anon, authenticated;

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),  -- A: 성인
  ('bbbbbbbb-0000-0000-0000-000000000002'),  -- B: 만 14세 이상 청소년
  ('cccccccc-0000-0000-0000-000000000003'),  -- C: 만 14세 미만
  ('dddddddd-0000-0000-0000-000000000004');  -- D: 연령 확인 전

\warn '── 1. 로그인하지 않은 사용자(anon) ──'
set role anon;
select t.fails('select * from public.user_settings', 'permission denied', 'anon 은 설정 테이블을 읽을 수 없다');
select t.fails('select * from public.presence_lights', 'permission denied', 'anon 은 불빛 테이블을 읽을 수 없다');
select t.fails($$select public.publish_light('manual')$$, 'permission denied', 'anon 은 불빛을 남길 수 없다');
select t.fails('select public.get_shared_sky()', 'permission denied', 'anon 은 밤하늘을 조회할 수 없다');
reset role;

\warn '── 2. 연령 확인 ──'
set role authenticated;
select t.act_as('dddddddd-0000-0000-0000-000000000004');
select t.fails($$select public.publish_light('manual')$$, 'access_not_allowed', '연령 확인 전에는 불빛을 남길 수 없다');
select t.fails('select public.get_shared_sky()', 'access_not_allowed', '연령 확인 전에는 밤하늘을 볼 수 없다');

select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.submit_age_gate('adult', 'draft-2026-11-06') = 'allowed', '성인은 이용 가능으로 기록된다');
select t.ok(public.submit_age_gate('under_14', 'draft-2026-11-06') = 'allowed', '한 번 기록된 연령은 덮어쓰지 않는다');
select t.fails($$insert into public.age_gate_records values (auth.uid(), 'adult', 'allowed', 'x', null, now())$$,
  'permission denied', '연령 기록을 직접 만들 수 없다');
select t.fails($$update public.age_gate_records set consent_status = 'allowed'$$,
  'permission denied', '연령 기록을 직접 바꿀 수 없다');

select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok(public.submit_age_gate('teen_14_plus', 'draft-2026-11-06') = 'allowed', '만 14세 이상 청소년은 이용 가능');

select t.act_as('cccccccc-0000-0000-0000-000000000003');
select t.ok(public.submit_age_gate('under_14', 'draft-2026-11-06') = 'guardian_required', '만 14세 미만은 보호자 확인 필요로 기록된다');
select t.fails($$select public.publish_light('manual')$$, 'access_not_allowed', '만 14세 미만은 불빛을 남길 수 없다');
select t.fails('select public.get_shared_sky()', 'access_not_allowed', '만 14세 미만은 밤하늘을 볼 수 없다');
select t.fails('select public.send_ambient_wave()', 'access_not_allowed', '만 14세 미만은 온기를 보낼 수 없다');
select t.fails($$select public.submit_age_gate('invalid', 'v')$$, 'invalid_age_category', '잘못된 연령 구분은 거절된다');
reset role;
select t.fails($$insert into public.age_gate_records (user_id, age_category, consent_status, consent_version)
  values ('dddddddd-0000-0000-0000-000000000004', 'under_14', 'allowed', 'v')$$,
  'under_14_requires_verification', '관리자라도 보호자 확인 없이 만 14세 미만을 허용할 수 없다');

\warn '── 3. 설정 RLS ──'
set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.user_settings (user_id) values (auth.uid());
select t.ok((select visibility_mode from public.user_settings) = 'private', '기본 공개 설정은 private');
select t.fails($$insert into public.user_settings (user_id) values ('bbbbbbbb-0000-0000-0000-000000000002')$$,
  'row-level security', '다른 사람의 설정을 만들 수 없다');
select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.user_settings (user_id, visibility_mode) values (auth.uid(), 'manual');
select t.ok((select count(*) from public.user_settings) = 1, '본인 설정만 보인다');
update public.user_settings set reduce_motion = true where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select t.ok((select reduce_motion from public.user_settings where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = false,
  '다른 사람의 설정을 바꿀 수 없다');

\warn '── 4. 불빛 등록 규칙 ──'
set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.fails('select * from public.presence_lights', 'permission denied', '불빛 원본 테이블은 로그인 사용자도 읽을 수 없다');
select t.fails($$select public.publish_light('manual')$$, 'visibility_private', 'private 상태에서는 공개되지 않는다');
update public.user_settings set visibility_mode = 'manual';
select t.fails($$select public.publish_light('auto')$$, 'auto_not_enabled', 'manual 모드에서는 자동 공개되지 않는다');
select t.fails($$update public.user_settings set visibility_mode = 'auto'$$, 'auto_requires_consent', '자동 공개는 동의 없이 켤 수 없다');

select public.publish_light('manual') as first \gset first_
reset role;
select t.ok((:'first_first')::jsonb ->> 'status' = 'published', '직접 공개하면 불빛이 생긴다');
select t.ok((select count(*) from public.presence_lights where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, '불빛 행은 1개');
select t.ok((select expires_at - created_at from public.presence_lights where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  = interval '120 minutes', '유지 시간은 서버 기준 120분');
select t.ok(not ((:'first_first')::jsonb -> 'light' ? 'owner_id'), '응답에 owner_id 가 없다');
select t.ok(position('aaaaaaaa' in :'first_first') = 0, '응답 어디에도 사용자 id 가 없다');
select t.ok((select array_agg(k order by k) from jsonb_object_keys(
  (select payload from realtime.messages where event = 'light_added' order by id desc limit 1)) k)
  = array['created_at', 'expires_at', 'id', 'x', 'y'], '실시간 방송에는 안전한 필드만 담긴다');

-- 시간이 조금 흐른 것처럼 만든다
update public.presence_lights set created_at = created_at - interval '10 minutes', expires_at = expires_at - interval '10 minutes'
  where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select expires_at as before_expires from public.presence_lights where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001' \gset

set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select public.publish_light('manual') as second \gset second_
reset role;
select t.ok((:'second_second')::jsonb ->> 'status' = 'already_active', '이미 불빛이 있으면 중복 등록하지 않는다');
select t.ok((:'second_second')::jsonb -> 'light' ->> 'id' = (:'first_first')::jsonb -> 'light' ->> 'id', '같은 불빛이 그대로 유지된다');
select t.ok((select expires_at from public.presence_lights where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001') = :'before_expires',
  '다시 눌러도 만료 시간이 늘어나지 않는다');
select t.fails($$insert into public.presence_lights (owner_id, x_position, y_position, expires_at)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 0.5, 0.5, now() + interval '1 hour')$$,
  'duplicate key', '데이터베이스 수준에서도 한 사람당 불빛 1개');

\warn '── 5. 밤하늘 조회 ──'
set role authenticated;
select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok(jsonb_array_length(public.get_shared_sky() -> 'lights') = 1, '다른 사람은 익명 불빛을 볼 수 있다');
select t.ok(position('aaaaaaaa' in public.get_shared_sky()::text) = 0, '밤하늘 조회 결과에 사용자 id 가 없다');
select t.ok(public.get_shared_sky() ? 'server_time', '서버 시간이 함께 온다');
select t.ok(public.cancel_my_light() = false, '다른 사람의 불빛은 취소할 수 없다');
select t.ok(jsonb_array_length(public.get_shared_sky() -> 'lights') = 1, '취소 시도 후에도 A 의 불빛은 그대로');
select t.ok(public.get_my_light() is null, 'B 는 자기 불빛이 없다');
reset role;

\warn '── 6. 만료 ──'
update public.presence_lights set created_at = now() - interval '121 minutes', expires_at = now() - interval '1 minute'
  where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.user_rate_limits set last_light_at = now() - interval '2 hours';
set role authenticated;
select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok(jsonb_array_length(public.get_shared_sky() -> 'lights') = 0, '만료된 불빛은 조회에서 바로 빠진다');
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.get_my_light() is null, '만료된 내 불빛은 없는 것으로 본다');
select t.ok(public.publish_light('manual') ->> 'status' = 'published', '만료 후에는 새 불빛을 남길 수 있다');
reset role;
select t.ok((select count(*) from public.presence_lights where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, '만료 행은 정리되고 새 행 1개만 남는다');

\warn '── 7. 공개 취소 · 도배 방지 · 비공개 전환 ──'
set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.cancel_my_light() = true, '내 불빛은 즉시 취소할 수 있다');
reset role;
select t.ok((select event from realtime.messages order by id desc limit 1) = 'light_removed', '취소하면 다른 사람에게도 사라짐을 알린다');
set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.publish_light('manual') ->> 'status' = 'published', '불빛을 거두고 바로 다시 남길 수 있다 (기다리는 시간 없음)');
reset role;
-- 껐다 켰다 도배: 10분 동안 새 불빛 10번을 이미 채운 상태를 만든다
update public.user_rate_limits set light_window_count = 10 where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.cancel_my_light() = true, '다시 거둘 수 있다');
select t.fails($$select public.publish_light('manual')$$, 'rate_limited', '10분 안에 11번째 새 불빛은 막힌다 (껐다 켰다 도배 방지)');
reset role;
update public.user_rate_limits set light_window_start = now() - interval '10 minutes 1 second'
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
set role authenticated;
select t.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.publish_light('manual') ->> 'status' = 'published', '10분이 지나면 다시 처음부터 센다');
update public.user_settings set visibility_mode = 'auto', auto_consent_at = now();
select t.ok(public.publish_light('auto') ->> 'status' = 'already_active', '자동 공개도 기존 불빛이 있으면 새로 만들지 않는다');
update public.user_settings set visibility_mode = 'manual';
select t.ok((select auto_consent_at from public.user_settings) is null, '자동 공개를 끄면 동의 기록도 지워진다');
update public.user_settings set visibility_mode = 'private';
select t.ok(public.get_my_light() is null, 'private 로 바꾸면 현재 공개 불빛도 취소된다');
reset role;
select t.ok((select event from realtime.messages order by id desc limit 1) = 'light_removed', '비공개 전환도 사라짐을 알린다');

\warn '── 8. 온기 퍼뜨리기 ──'
set role authenticated;
select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok(public.send_ambient_wave() ? 'wave_id', '온기를 퍼뜨릴 수 있다');
select t.fails('select public.send_ambient_wave()', 'rate_limited', '30초 안에 다시 보내면 서버가 막는다');
reset role;
select t.ok((select array_agg(k) from jsonb_object_keys(
  (select payload from realtime.messages where event = 'ambient_wave' order by id desc limit 1)) k) = array['wave_id'],
  '파동 방송에는 보낸 사람 정보가 없다');
select t.ok(not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name like '%ambient%'),
  '파동 기록 테이블이 없다');

\warn '── 9. 실시간 채널 권한 ──'
set role authenticated;
select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select set_config('realtime.topic', 'shared-sky', false);
select t.ok((select count(*) from realtime.messages) > 0, '이용 가능한 사용자는 밤하늘 방송을 받는다');
select t.fails($$insert into realtime.messages (topic, extension, event, payload) values ('shared-sky', 'broadcast', 'light_added', '{}')$$,
  'row-level security', '브라우저는 밤하늘에 직접 방송할 수 없다');
select set_config('realtime.topic', 'other-room', false);
select t.ok((select count(*) from realtime.messages) = 0, '다른 채널 이름으로는 받을 수 없다');
select t.act_as('cccccccc-0000-0000-0000-000000000003');
select set_config('realtime.topic', 'shared-sky', false);
select t.ok((select count(*) from realtime.messages) = 0, '만 14세 미만(이용 불가)은 방송을 받지 못한다');
reset role;

\warn '── 10. 데이터 삭제 · 계정 삭제 ──'
set role authenticated;
select t.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select public.delete_my_data();
select t.ok((select count(*) from public.user_settings) = 0, '데이터 삭제 시 설정이 지워진다');
select t.fails('select public.cleanup_expired_lights()', 'permission denied', '정리 작업은 일반 사용자가 실행할 수 없다');
reset role;
select t.ok(public.cleanup_expired_lights() >= 0, '관리자는 만료 불빛 정리를 실행할 수 있다');
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.ok(not exists (select 1 from public.user_settings where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.age_gate_records where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.presence_lights where owner_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.user_rate_limits where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '계정을 삭제하면 그 사람의 모든 데이터가 함께 지워진다');

\warn '── 모든 데이터베이스 테스트 통과 ──'
