// 공동 밤하늘 상태: 불빛 목록, 내 불빛, 온기 파동, 실시간 연결
import { useCallback, useEffect, useRef, useState } from 'react'
import { activeLights, AMBIENT_COOLDOWN_MS, AMBIENT_WAVE_DURATION_MS } from '../lib/lightRules'
import { readJson, safeSession, writeJson } from '../lib/storage'
import type { FireflyBackend, SkyEvent } from '../services/backend'
import { toFireflyError, type FireflyErrorCode } from '../services/backend'
import type { ConnectionState, SharedLight, UserSettings } from '../types'

/** 화면을 다시 그려 페이드·만료를 반영하는 간격. 1분이면 충분히 부드럽다 */
const TICK_MS = 60 * 1000

export type SkyState = {
  lights: SharedLight[]
  myLight: SharedLight | null
  waves: string[]
  connection: ConnectionState
  /** 서버 기준 현재 시각(ms) */
  now: () => number
  loading: boolean
  error: FireflyErrorCode | null
  reload: () => Promise<void>
  publish: () => Promise<'published' | 'already_active'>
  cancel: () => Promise<void>
  sendWave: () => Promise<void>
  /** 온기를 보낸 뒤 30초 동안 true */
  waveResting: boolean
}

export function useSharedSky(backend: FireflyBackend, settings: UserSettings | null, enabled: boolean): SkyState {
  const [lights, setLights] = useState<SharedLight[]>([])
  const [myLight, setMyLight] = useState<SharedLight | null>(null)
  const [waves, setWaves] = useState<string[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<FireflyErrorCode | null>(null)
  const [, setTick] = useState(0)

  const offsetRef = useRef(0)
  const seenWaves = useRef(new Set<string>())
  const now = useCallback(() => Date.now() + offsetRef.current, [])

  const reload = useCallback(async () => {
    try {
      const [snapshot, mine] = await Promise.all([backend.getSharedSky(), backend.getMyLight()])
      offsetRef.current = Date.parse(snapshot.serverTime) - Date.now()
      setLights(snapshot.lights)
      setMyLight(mine)
      setError(null)
    } catch (err) {
      // 오류를 숨기지 않는다: 화면에 그대로 알린다
      setError(toFireflyError(err).code)
    } finally {
      setLoading(false)
    }
  }, [backend])

  const playWave = useCallback((waveId: string) => {
    if (seenWaves.current.has(waveId)) return
    seenWaves.current.add(waveId)
    setWaves((current) => [...current, waveId])
    window.setTimeout(() => {
      setWaves((current) => current.filter((id) => id !== waveId))
    }, AMBIENT_WAVE_DURATION_MS)
  }, [])

  // 실시간 구독 + 재연결 시 서버 상태로 복구
  useEffect(() => {
    if (!enabled) return
    void reload()

    const handleEvent = (event: SkyEvent) => {
      if (event.type === 'light_added') {
        setLights((current) => [...current.filter((l) => l.id !== event.light.id), event.light])
      } else if (event.type === 'light_removed') {
        setLights((current) => current.filter((l) => l.id !== event.id))
        setMyLight((current) => (current?.id === event.id ? null : current))
      } else {
        playWave(event.waveId)
      }
    }

    let wasDisconnected = false
    const unsubscribe = backend.subscribeSky(handleEvent, (state) => {
      setConnection(state)
      if (state === 'reconnecting' || state === 'offline') wasDisconnected = true
      // 끊겼다가 다시 연결되면, 그 사이 놓친 변화를 서버에서 다시 가져온다
      if (state === 'connected' && wasDisconnected) {
        wasDisconnected = false
        void reload()
      }
    })

    const handleOnline = () => void reload()
    const handleOffline = () => setConnection((c) => (c === 'demo' ? c : 'offline'))
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisible)

    const timer = window.setInterval(() => setTick((t) => t + 1), TICK_MS)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisible)
      window.clearInterval(timer)
    }
  }, [backend, enabled, reload, playWave])

  // 자동 공개: 동의한 사용자에 한해, 앱 세션(탭)이 시작될 때 딱 한 번만 확인한다.
  // 세션 도중에 자동 공개를 켜면 지금 바로 공개하지 않고, 다음에 앱을 열 때부터 적용된다.
  // (동의 창에 "앱을 새로 열 때"라고 안내하므로 그 약속을 지킨다)
  // 백그라운드에서 감시하지 않는다.
  const autoChecked = useRef(false)
  useEffect(() => {
    if (!enabled || loading || !settings || autoChecked.current) return
    autoChecked.current = true
    const session = safeSession()
    if (readJson<boolean>('auto-checked', session)) return
    writeJson('auto-checked', true, session)
    if (settings.visibilityMode !== 'auto' || !settings.autoConsentAt) return
    void backend
      .publishLight('auto')
      .then((result) => {
        setMyLight(result.light)
        setLights((current) => [...current.filter((l) => l.id !== result.light.id), result.light])
      })
      .catch(() => {
        // 자동 공개는 조용히 시도한다. 실패해도 사용자를 재촉하지 않는다.
      })
  }, [backend, enabled, loading, settings])

  const publish = useCallback(async () => {
    const result = await backend.publishLight('manual')
    offsetRef.current = Date.parse(result.serverTime) - Date.now()
    setMyLight(result.light)
    setLights((current) => [...current.filter((l) => l.id !== result.light.id), result.light])
    return result.status
  }, [backend])

  const cancel = useCallback(async () => {
    const id = myLight?.id
    await backend.cancelMyLight()
    setMyLight(null)
    if (id) setLights((current) => current.filter((l) => l.id !== id))
  }, [backend, myLight])

  // 온기 퍼뜨리기 쉬는 시간. 화면을 옮겨 다녀도 유지되도록 여기(앱 전체 상태)에 둔다.
  const [waveRestUntil, setWaveRestUntil] = useState(0)
  const startWaveRest = useCallback(() => {
    setWaveRestUntil(Date.now() + AMBIENT_COOLDOWN_MS)
  }, [])
  useEffect(() => {
    const left = waveRestUntil - Date.now()
    if (left <= 0) return
    const timer = window.setTimeout(() => setWaveRestUntil(0), left)
    return () => window.clearTimeout(timer)
  }, [waveRestUntil])

  const sendWave = useCallback(async () => {
    try {
      const { waveId } = await backend.sendAmbientWave()
      startWaveRest()
      playWave(waveId)
    } catch (err) {
      // 서버가 "아직 쉬는 중"이라고 하면 버튼도 같이 쉬게 한다
      if (toFireflyError(err).code === 'rate_limited') startWaveRest()
      throw err
    }
  }, [backend, playWave, startWaveRest])

  const nowMs = now()
  const visibleMyLight = myLight && activeLights([myLight], nowMs).length > 0 ? myLight : null

  return {
    lights: activeLights(lights, nowMs),
    myLight: visibleMyLight,
    waves,
    connection,
    now,
    loading,
    error,
    reload,
    publish,
    cancel,
    sendWave,
    waveResting: waveRestUntil > 0,
  }
}
