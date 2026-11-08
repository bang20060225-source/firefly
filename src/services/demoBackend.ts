// DEMO 백엔드: 실제 서버 없이 이 기기 안에서만 동작한다.
// · 다른 사용자는 존재하지 않는다. 가짜 사용자 불빛을 절대 만들지 않는다.
// · 밤하늘에는 '내가 남긴 DEMO 불빛'만 보인다.
// · 규칙(120분, 새 불빛은 10분에 10번까지·온기는 30초 간격, 중복 방지, 비공개 전환 시 취소)은 서버와 같게 흉내 낸다.

import {
  AMBIENT_COOLDOWN_MS,
  cooldownLeftMs,
  isExpired,
  LIGHT_DURATION_MS,
  randomSkyPosition,
  takePublishSlot,
  type PublishWindow,
} from '../lib/lightRules'
import { readJson, removeKey, writeJson } from '../lib/storage'
import type { AgeCategory, AgeGate, SharedLight, UserSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { FireflyError, type FireflyBackend, type SkyEvent } from './backend'

type DemoState = {
  ageGate: AgeGate | null
  settings: UserSettings
  myLight: SharedLight | null
  lightWindow: PublishWindow
  lastWaveAt: number | null
}

const KEY = 'demo-state'
const SESSION_KEY = 'demo-session'

function emptyState(): DemoState {
  return {
    ageGate: null,
    settings: { ...DEFAULT_SETTINGS },
    myLight: null,
    lightWindow: { start: null, count: 0 },
    lastWaveAt: null,
  }
}

function load(): DemoState {
  const saved = readJson<Partial<DemoState>>(KEY)
  // 예전 버전에서 저장한 값에는 lightWindow 가 없을 수 있다
  return saved ? { ...emptyState(), ...saved, lightWindow: saved.lightWindow ?? { start: null, count: 0 } } : emptyState()
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createDemoBackend(): FireflyBackend & { grantDemoTestConsent(): Promise<AgeGate> } {
  let state = load()
  const listeners = new Set<(event: SkyEvent) => void>()

  function save() {
    writeJson(KEY, state)
  }

  function emit(event: SkyEvent) {
    listeners.forEach((listener) => listener(event))
  }

  function requireAccess() {
    if (!readJson<boolean>(SESSION_KEY)) throw new FireflyError('not_authenticated')
    const status = state.ageGate?.status
    if (status !== 'allowed' && status !== 'demo_test_consent') throw new FireflyError('access_not_allowed')
  }

  function currentLight(now: number): SharedLight | null {
    if (state.myLight && isExpired(state.myLight.expiresAt, now)) {
      state.myLight = null
      save()
    }
    return state.myLight
  }

  function removeMyLight(): boolean {
    const light = state.myLight
    state.myLight = null
    save()
    if (light) emit({ type: 'light_removed', id: light.id })
    return light !== null
  }

  return {
    mode: 'demo',

    async hasSession() {
      return readJson<boolean>(SESSION_KEY) === true
    },

    async startAnonymous() {
      writeJson(SESSION_KEY, true)
    },

    async getAgeGate() {
      return state.ageGate
    },

    async submitAgeGate(category: AgeCategory) {
      if (state.ageGate) return state.ageGate
      state.ageGate = {
        ageCategory: category,
        status: category === 'under_14' ? 'guardian_required' : 'allowed',
      }
      save()
      return state.ageGate
    },

    /** DEMO·개발 환경 전용: 만 14세 미만 테스트 동의. 운영 서버에는 이 기능이 없다. */
    async grantDemoTestConsent() {
      state.ageGate = { ageCategory: 'under_14', status: 'demo_test_consent' }
      save()
      return state.ageGate
    },

    async loadSettings() {
      return { ...state.settings }
    },

    async saveSettings(settings: UserSettings) {
      const next: UserSettings = {
        ...settings,
        autoConsentAt: settings.visibilityMode === 'auto' ? settings.autoConsentAt : null,
      }
      if (next.visibilityMode === 'auto' && !next.autoConsentAt) {
        throw new FireflyError('auto_not_enabled', 'auto mode requires consent')
      }
      state.settings = next
      save()
      if (next.visibilityMode === 'private') removeMyLight()
      return { ...next }
    },

    async getSharedSky() {
      requireAccess()
      const now = Date.now()
      const light = currentLight(now)
      return { serverTime: new Date(now).toISOString(), lights: light ? [light] : [] }
    },

    async getMyLight() {
      requireAccess()
      return currentLight(Date.now())
    },

    async publishLight(source) {
      requireAccess()
      const mode = state.settings.visibilityMode
      if (mode === 'private') throw new FireflyError('visibility_private')
      if (source === 'auto' && mode !== 'auto') throw new FireflyError('auto_not_enabled')

      const now = Date.now()
      const existing = currentLight(now)
      if (existing) {
        return { status: 'already_active', light: existing, serverTime: new Date(now).toISOString() }
      }
      const slot = takePublishSlot(state.lightWindow, now)
      if (!slot) throw new FireflyError('rate_limited')

      const position = randomSkyPosition()
      const light: SharedLight = {
        id: newId(),
        ...position,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + LIGHT_DURATION_MS).toISOString(),
      }
      state.myLight = light
      state.lightWindow = slot
      save()
      emit({ type: 'light_added', light })
      return { status: 'published', light, serverTime: new Date(now).toISOString() }
    },

    async cancelMyLight() {
      return removeMyLight()
    },

    async sendAmbientWave() {
      requireAccess()
      const now = Date.now()
      if (cooldownLeftMs(state.lastWaveAt, AMBIENT_COOLDOWN_MS, now) > 0) {
        throw new FireflyError('rate_limited')
      }
      state.lastWaveAt = now
      save()
      const waveId = newId()
      emit({ type: 'ambient_wave', waveId })
      return { waveId }
    },

    subscribeSky(onEvent, onStatus) {
      listeners.add(onEvent)
      onStatus('demo')
      return () => {
        listeners.delete(onEvent)
      }
    },

    async getAccount() {
      return { isAnonymous: true, email: null, pendingEmail: null }
    },

    async linkEmail() {
      throw new FireflyError('not_available_in_demo')
    },

    async sendSignInLink() {
      throw new FireflyError('not_available_in_demo')
    },

    async deleteMyData() {
      removeMyLight()
      state.settings = { ...DEFAULT_SETTINGS }
      save()
    },

    async deleteAccount() {
      removeMyLight()
      removeKey(KEY)
      removeKey(SESSION_KEY)
      state = emptyState()
    },
  }
}
