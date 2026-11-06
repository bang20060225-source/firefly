-- ⚠️ 로컬 테스트 전용. 실제 Supabase 프로젝트에 절대 적용하지 않는다.
-- 일반 PostgreSQL 에서 마이그레이션을 시험하기 위해, Supabase 가 기본으로 제공하는
-- 역할(anon/authenticated)·auth 스키마·realtime 스키마의 최소한의 흉내를 만든다.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key,
  is_anonymous boolean not null default true
);

-- Supabase 와 같은 방식: 요청 JWT 의 sub 값을 사용자 id 로 읽는다
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create schema realtime;
create table realtime.messages (
  id bigserial primary key,
  topic text not null,
  extension text not null,
  event text,
  payload jsonb,
  private boolean,
  inserted_at timestamptz default now()
);
alter table realtime.messages enable row level security;

create function realtime.topic() returns text
language sql stable as $$
  select current_setting('realtime.topic', true)
$$;

-- 실제 Supabase 의 realtime.send 를 흉내: 방송 내용을 realtime.messages 에 쌓는다
create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void
language sql security definer as $$
  insert into realtime.messages (topic, extension, event, payload, private)
  values (topic, 'broadcast', event, payload, private);
$$;

grant usage on schema auth, realtime, public to anon, authenticated;
grant execute on function auth.uid(), realtime.topic() to anon, authenticated;
grant select, insert on realtime.messages to authenticated;
grant usage on sequence realtime.messages_id_seq to authenticated;
-- Supabase 처럼 public 스키마의 새 테이블에 기본 권한을 준다 → 마이그레이션이 직접 걷어내는지 확인하기 위함
alter default privileges in schema public grant all on tables to anon, authenticated;
