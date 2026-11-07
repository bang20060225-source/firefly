// 화면이 사용하는 백엔드 기능 목록.
// Supabase 버전(supabaseBackend)과 DEMO 버전(demoBackend)이 똑같은 모양을 가진다.

import type {
  AccountInfo,
  AgeCategory,
  AgeGate,
  ConnectionState,
  PublishSource,
  SharedLight,
  UserSettings,
} from '../types'

export type SkyEvent =
  | { type: 'light_added'; light: SharedLight }
  | { type: 'light_removed'; id: string }
  | { type: 'ambient_wave'; waveId: string }

export type SkySnapshot = {
  /** 서버 기준 현재 시각. 기기 시계가 틀려도 만료를 정확히 계산하기 위해 쓴다 */
  serverTime: string
  lights: SharedLight[]
}

export type PublishResult = {
  status: 'published' | 'already_active'
  light: SharedLight
  serverTime: string
}

export interface FireflyBackend {
  readonly mode: 'supabase' | 'demo'

  /** 이 기기에 남아 있는 익명 세션이 있는지 */
  hasSession(): Promise<boolean>
  /** 가입 없이 익명으로 시작 */
  startAnonymous(): Promise<void>

  getAgeGate(): Promise<AgeGate | null>
  submitAgeGate(category: AgeCategory, consentVersion: string): Promise<AgeGate>

  loadSettings(): Promise<UserSettings>
  saveSettings(settings: UserSettings): Promise<UserSettings>

  getSharedSky(): Promise<SkySnapshot>
  getMyLight(): Promise<SharedLight | null>
  publishLight(source: PublishSource): Promise<PublishResult>
  cancelMyLight(): Promise<boolean>
  sendAmbientWave(): Promise<{ waveId: string }>
  /** 실시간 밤하늘 구독. 돌려받은 함수를 부르면 구독을 끝낸다 */
  subscribeSky(onEvent: (event: SkyEvent) => void, onStatus: (state: ConnectionState) => void): () => void

  getAccount(): Promise<AccountInfo>
  /** 지금의 익명 계정에 이메일을 연결 (같은 사용자 id 유지) */
  linkEmail(email: string): Promise<void>
  /** 다른 기기에서 연결된 이메일로 로그인 링크 받기 */
  sendSignInLink(email: string): Promise<void>

  /** 서버의 불빛·설정 삭제 (연령 확인 기록과 계정은 유지) */
  deleteMyData(): Promise<void>
  /** 계정과 모든 데이터 삭제 */
  deleteAccount(): Promise<void>
}

export type FireflyErrorCode =
  | 'rate_limited'
  | 'visibility_private'
  | 'auto_not_enabled'
  | 'access_not_allowed'
  | 'not_authenticated'
  | 'email_exists'
  | 'invalid_email'
  | 'network'
  | 'not_available_in_demo'
  | 'unknown'

export class FireflyError extends Error {
  readonly code: FireflyErrorCode

  constructor(code: FireflyErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'FireflyError'
    this.code = code
  }
}

/** 오류를 사용자에게 보여줄 한국어 문장으로 바꾼다. 원인을 숨기지 않되 탓하지 않는 말투로. */
export function errorMessage(error: unknown): string {
  const code = error instanceof FireflyError ? error.code : 'unknown'
  switch (code) {
    case 'rate_limited':
      return '조금 전에 이미 보냈어요. 잠시 뒤에 다시 할 수 있어요.'
    case 'visibility_private':
      return '지금은 불빛이 나에게만 보이는 설정이에요.'
    case 'auto_not_enabled':
      return '자동 공개가 꺼져 있어요.'
    case 'access_not_allowed':
      return '지금은 이 기능을 쓸 수 없는 상태예요.'
    case 'not_authenticated':
      return '연결이 끊어졌어요. 앱을 다시 열어 주세요.'
    case 'email_exists':
      return '이미 다른 공간에 연결된 이메일이에요. 두 공간을 자동으로 합치지는 않아요.'
    case 'invalid_email':
      return '이메일 주소를 다시 확인해 주세요.'
    case 'network':
      return '인터넷 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.'
    case 'not_available_in_demo':
      return 'DEMO 모드에서는 쓸 수 없는 기능이에요. 실제 서버를 연결하면 사용할 수 있어요.'
    default:
      return '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.'
  }
}

/**
 * 오류의 기술적인 내용 (예: "Anonymous sign-ins are disabled").
 * 서버 설정이 빠졌을 때 원인을 찾기 쉽도록 화면에 작게 보여준다. 개인정보는 담기지 않는다.
 */
export function errorDetail(error: unknown): string | null {
  const err = toFireflyError(error)
  if (err.code !== 'unknown' && err.code !== 'network') return null
  return err.message && err.message !== err.code ? err.message.slice(0, 160) : null
}

/** Supabase·네트워크 오류 메시지를 반딧불이 오류 코드로 바꾼다 */
export function toFireflyError(error: unknown): FireflyError {
  if (error instanceof FireflyError) return error
  const message = error instanceof Error ? error.message : String(error ?? '')
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''

  const known: FireflyErrorCode[] = [
    'rate_limited',
    'visibility_private',
    'auto_not_enabled',
    'access_not_allowed',
    'not_authenticated',
  ]
  for (const item of known) {
    if (message.includes(item)) return new FireflyError(item, message)
  }
  if (code === 'email_exists' || /already (been )?registered|already exists/i.test(message)) {
    return new FireflyError('email_exists', message)
  }
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(message)) {
    return new FireflyError('invalid_email', message)
  }
  if (/failed to fetch|network|load failed|fetch/i.test(message)) {
    return new FireflyError('network', message)
  }
  return new FireflyError('unknown', message)
}

/** 아주 기본적인 이메일 모양 확인 (실제 확인은 메일 인증으로) */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
