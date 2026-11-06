// 앱 전체 상태: 시작 단계, 연령 확인, 설정, 밤하늘
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CONSENT_VERSION } from '../config'
import { readJson, removeKey, writeJson } from '../lib/storage'
import { toFireflyError, type FireflyErrorCode } from '../services/backend'
import type { AgeCategory, AgeGate, UserSettings } from '../types'
import { backend, demoBackend } from './backendInstance'
import { useSharedSky, type SkyState } from './useSharedSky'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * 앱 단계
 * - loading: 저장된 세션 확인 중
 * - onboarding: 첫 방문 안내
 * - blocked: 만 14세 미만 (보호자 확인 수단이 준비되기 전까지 이용 불가)
 * - ready: 이용 중
 * - error: 시작하지 못함 (원인 표시)
 */
export type AppPhase = 'loading' | 'onboarding' | 'blocked' | 'ready' | 'error'

const UNDER_14_KEY = 'under-14-notice'

type AppContextValue = {
  phase: AppPhase
  startError: FireflyErrorCode | null
  ageGate: AgeGate | null
  settings: UserSettings | null
  /** 설정의 '움직임 줄이기' 또는 기기의 움직임 줄이기 설정 */
  reduceMotion: boolean
  sky: SkyState
  retryStart: () => void
  completeOnboarding: (category: AgeCategory) => Promise<void>
  /** 만 14세 미만 안내에서 '나이를 잘못 골랐어요' */
  resetAgeChoice: () => void
  /** DEMO·개발 환경 전용 테스트 동의. 운영에서는 null */
  grantDemoTestConsent: (() => Promise<void>) | null
  updateSettings: (patch: Partial<UserSettings>) => Promise<UserSettings>
  /** 데이터·계정 삭제 후 처음 상태로 */
  restartFromScratch: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children, allowDemoTestConsent }: { children: ReactNode; allowDemoTestConsent: boolean }) {
  const [phase, setPhase] = useState<AppPhase>('loading')
  const [startError, setStartError] = useState<FireflyErrorCode | null>(null)
  const [ageGate, setAgeGate] = useState<AgeGate | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [attempt, setAttempt] = useState(0)
  const systemReduceMotion = usePrefersReducedMotion()

  const enterWithGate = useCallback(async (gate: AgeGate | null) => {
    setAgeGate(gate)
    if (!gate) {
      setPhase('onboarding')
      return
    }
    if (gate.status === 'guardian_required') {
      setPhase('blocked')
      return
    }
    setSettings(await backend.loadSettings())
    setPhase('ready')
  }, [])

  // 앱을 열 때: 저장된 세션이 있으면 이어서, 없으면 첫 방문 안내
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        if (await backend.hasSession()) {
          const gate = await backend.getAgeGate()
          if (!cancelled) await enterWithGate(gate)
          return
        }
        if (cancelled) return
        setPhase(readJson<boolean>(UNDER_14_KEY) ? 'blocked' : 'onboarding')
      } catch (err) {
        if (cancelled) return
        setStartError(toFireflyError(err).code)
        setPhase('error')
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [attempt, enterWithGate])

  const completeOnboarding = useCallback(
    async (category: AgeCategory) => {
      if (category === 'under_14') {
        // 계정을 만들지 않고, 서버에 아무것도 보내지 않는다
        writeJson(UNDER_14_KEY, true)
        setAgeGate({ ageCategory: 'under_14', status: 'guardian_required' })
        setPhase('blocked')
        return
      }
      if (!(await backend.hasSession())) await backend.startAnonymous()
      const gate = await backend.submitAgeGate(category, CONSENT_VERSION)
      await enterWithGate(gate)
    },
    [enterWithGate],
  )

  const resetAgeChoice = useCallback(() => {
    removeKey(UNDER_14_KEY)
    setAgeGate(null)
    setPhase('onboarding')
  }, [])

  const grantDemoTestConsent = useMemo(() => {
    if (!allowDemoTestConsent || !demoBackend) return null
    return async () => {
      removeKey(UNDER_14_KEY)
      await demoBackend.startAnonymous()
      const gate = await demoBackend.grantDemoTestConsent()
      await enterWithGate(gate)
    }
  }, [allowDemoTestConsent, enterWithGate])

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!settings) throw new Error('settings not loaded')
      const saved = await backend.saveSettings({ ...settings, ...patch })
      setSettings(saved)
      return saved
    },
    [settings],
  )

  const restartFromScratch = useCallback(() => {
    setSettings(null)
    setAgeGate(null)
    setPhase('loading')
    setAttempt((n) => n + 1)
  }, [])

  const sky = useSharedSky(backend, settings, phase === 'ready')

  const value: AppContextValue = {
    phase,
    startError,
    ageGate,
    settings,
    reduceMotion: systemReduceMotion || (settings?.reduceMotion ?? false),
    sky,
    retryStart: () => {
      setPhase('loading')
      setAttempt((n) => n + 1)
    },
    completeOnboarding,
    resetAgeChoice,
    grantDemoTestConsent,
    updateSettings,
    restartFromScratch,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
