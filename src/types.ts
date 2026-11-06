// 앱에서 공통으로 쓰는 데이터 모양

/** 불빛 공개 방식. 기본값은 private */
export type VisibilityMode = 'private' | 'manual' | 'auto'

export type UserSettings = {
  visibilityMode: VisibilityMode
  /** auto 모드에 명시적으로 동의한 시각. auto가 아니면 null */
  autoConsentAt: string | null
  reduceMotion: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  visibilityMode: 'private',
  autoConsentAt: null,
  reduceMotion: false,
  soundEnabled: false,
  vibrationEnabled: false,
}

/** 연령 구분. 생년월일은 받지 않고 구간만 받는다. */
export type AgeCategory = 'adult' | 'teen_14_plus' | 'under_14'

/**
 * 연령 확인 상태
 * - allowed: 이용 가능 (성인, 만 14세 이상 본인 동의)
 * - guardian_required: 만 14세 미만. 적법한 보호자 확인 수단이 없어 이용 불가
 * - demo_test_consent: DEMO·개발 환경 전용 테스트 동의. 운영 서버에는 존재하지 않는다
 */
export type AgeGateStatus = 'allowed' | 'guardian_required' | 'demo_test_consent'

export type AgeGate = {
  ageCategory: AgeCategory
  status: AgeGateStatus
}

/** 공동 밤하늘에 보이는 불빛. 누가 남겼는지 알 수 있는 정보는 들어 있지 않다. */
export type SharedLight = {
  id: string
  /** 0~1 사이의 화면 좌표. 실제 위치와 무관한 무작위 값 */
  x: number
  y: number
  createdAt: string
  expiresAt: string
}

export type PublishSource = 'manual' | 'auto'

export type AccountInfo = {
  isAnonymous: boolean
  email: string | null
  /** 이메일 연결을 요청했지만 아직 확인 메일을 누르지 않은 상태 */
  pendingEmail: string | null
}

/** 실시간 연결 상태 */
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'demo'
