// 앱 전체에서 쓰는 설정값.
// Supabase 주소와 키가 둘 다 있어야 실제 서버에 연결하고, 하나라도 없으면 DEMO 모드로 동작한다.

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

export const config = {
  supabaseUrl,
  supabaseKey,
  /** 실제 Supabase 서버 없이 이 기기 안에서만 동작하는 모드 */
  demoMode: supabaseUrl === '' || supabaseKey === '',
  /** `npm run dev`로 실행 중인지 여부. 운영 빌드에서는 항상 false */
  isDev: import.meta.env.DEV,
} as const

/** 약관·개인정보 안내문 버전. 법률 검토 후 확정 버전으로 바꾼다. */
export const CONSENT_VERSION = 'draft-2026-11-06'
