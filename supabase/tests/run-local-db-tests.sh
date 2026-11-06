#!/usr/bin/env bash
# 로컬 PostgreSQL 에 임시 데이터베이스를 만들고 마이그레이션 + 보안 테스트를 실행한다.
# 필요: psql 로 접속 가능한 PostgreSQL (기본 postgres 사용자)
# 사용: npm run test:db   (또는 PGHOST/PGUSER 등 환경변수로 접속 정보 지정)
set -euo pipefail

cd "$(dirname "$0")/../.."
DB="firefly_test_$$"

psql -q -v ON_ERROR_STOP=1 -d postgres -c "create database $DB" >/dev/null
cleanup() {
  psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true
  # 테스트용 역할은 클러스터 전체에 남으므로, 다른 데이터베이스가 쓰지 않으면 지운다
  for role in anon authenticated service_role; do
    psql -q -d postgres -c "drop role if exists $role" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

run() { psql -q -X -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

echo "▶ Supabase 흉내 스키마 적용 (로컬 테스트 전용)"
run -f supabase/tests/local-supabase-shim.sql

for migration in supabase/migrations/*.sql; do
  echo "▶ 마이그레이션 적용: $migration"
  run -f "$migration"
done

echo "▶ 보안·규칙 테스트 실행"
run -f supabase/tests/security.test.sql 2>&1 >/dev/null | sed -E "s/^psql:[^ ]+ (NOTICE|WARNING):  /  /"
