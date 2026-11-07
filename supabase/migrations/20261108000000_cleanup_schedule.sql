-- 만료된 불빛 정리 일정
-- 불빛은 만료되는 순간 조회에서 빠지므로, 화면에는 이미 보이지 않는다.
-- 이 일정은 남아 있는 '만료된 불빛 행'만 30분마다 실제로 지운다.
-- (만료되지 않은 불빛, 설정, 계정 등 다른 데이터는 건드리지 않는다)
--
-- Supabase SQL Editor 에서 한 번 실행하면 된다.
-- 다시 실행해도 같은 이름의 일정이 새로 고쳐질 뿐, 두 번 만들어지지 않는다.

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'firefly-cleanup-expired-lights',
  '*/30 * * * *',
  $$ select public.cleanup_expired_lights() $$
);
