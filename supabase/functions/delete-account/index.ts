// 계정 탈퇴 Edge Function
// 요청한 사람 본인의 계정만 삭제한다. 데이터베이스의 모든 반딧불이 데이터는
// auth.users 와 연결된 on delete cascade 로 함께 지워진다.
//
// 서버 비밀 키는 이 함수 안에서만 쓰이고 브라우저로 나가지 않는다.
// 배포: Supabase 대시보드 → Edge Functions → Via Editor 에 이 파일을 붙여넣기 (또는 supabase functions deploy delete-account)
// ⚠️ 함수 설정의 'Verify JWT' 는 끈다. 아래에서 Auth 서버에 토큰을 직접 확인하므로 안전하다.
//    (새 JWT 서명 키를 쓰는 프로젝트에서도 문제없이 동작하게 하기 위함)

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** 새 방식(SUPABASE_SECRET_KEYS)을 먼저 쓰고, 없으면 기존 service_role 키를 쓴다 */
function readSecretKey(): string | null {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch {
      // 형식이 다르면 아래 기존 키로 넘어간다
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const secretKey = readSecretKey()
  if (!supabaseUrl || !secretKey) {
    return json({ error: 'server_not_configured' }, 500)
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'not_authenticated' }, 401)

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 토큰이 실제로 유효한 사용자 토큰인지 Auth 서버에 확인한다
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json({ error: 'not_authenticated' }, 401)

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) {
    // 사용자 정보는 로그에 남기지 않는다
    console.error('delete-account failed:', deleteError.message)
    return json({ error: 'delete_failed' }, 500)
  }

  return json({ deleted: true })
})
