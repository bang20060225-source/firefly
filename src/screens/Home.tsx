// 홈 — 공동의 밤하늘
// 아무것도 하지 않고 바라보다 닫아도 괜찮은 화면.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { useDayPhase } from '../app/useDayPhase'
import { navigate } from '../app/useHashRoute'
import { useTodayAction } from '../app/useTodayAction'
import { AmbientWaves } from '../components/sky/AmbientWaves'
import { Moon } from '../components/sky/Moon'
import { MyWindow } from '../components/sky/MyWindow'
import { NightSky, skyHouseColor } from '../components/sky/NightSky'
import { RisingLight } from '../components/sky/RisingLight'
import { SkyLights, skyTopPercent } from '../components/sky/SkyLights'
import { Village, VILLAGE_WINDOWS } from '../components/sky/Village'
import { Button, ConfirmDialog, ErrorState, LiveMessage } from '../components/ui'
import { config } from '../config'
import { exampleLights } from '../data/exampleSky'
import { softVibrate } from '../lib/haptics'
import { describeRemaining, lightOpacity, remainingMs } from '../lib/lightRules'
import { assignWindows, PHASE_WORD } from '../lib/skyScene'
import { playSound } from '../lib/sound'
import { errorMessage, FireflyError } from '../services/backend'
import type { ConnectionState, SharedLight } from '../types'

const CONNECTION_TEXT: Partial<Record<ConnectionState, string>> = {
  connecting: '밤하늘에 연결하는 중이에요',
  reconnecting: '연결이 잠시 끊겼어요. 다시 잇는 중이에요',
  offline: '인터넷이 끊겨 있어요. 다시 연결되면 밤하늘을 새로 불러올게요',
}

type Point = { x: number; y: number }

export function Home() {
  const { sky, settings, reduceMotion, updateSettings, musicEnabled, setMusicEnabled } = useApp()
  const today = useTodayAction()
  const phase = useDayPhase()
  const layerRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLButtonElement>(null)
  const [rising, setRising] = useState<{ id: string; from: Point; to: Point } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'light' | 'wave' | null>(null)
  const [privateInfoOpen, setPrivateInfoOpen] = useState(false)
  const [example, setExample] = useState(false)
  const [localNotice, setLocalNotice] = useState<{ key: number; text: string } | null>(null)
  const localNoticeTimer = useRef<number | undefined>(undefined)

  const nowMs = sky.now()
  const isPrivate = settings?.visibilityMode === 'private'
  const soundOn = settings?.soundEnabled ?? false
  const waveResting = sky.waveResting

  function showLocalNotice(text: string) {
    window.clearTimeout(localNoticeTimer.current)
    setLocalNotice({ key: Date.now(), text })
    localNoticeTimer.current = window.setTimeout(() => setLocalNotice(null), 5000)
  }
  useEffect(() => () => window.clearTimeout(localNoticeTimer.current), [])

  // DEMO 예시 하늘: 켜져 있는 동안 가끔 예시 온기가 번진다. (실제 서비스에서는 존재하지 않는 기능)
  const { playWave } = sky
  useEffect(() => {
    if (!config.demoMode || !example) return
    const spread = () => {
      playWave(`example-wave-${Date.now()}`)
      showLocalNotice('예시 · 누군가 온기를 퍼뜨렸어요')
    }
    const first = window.setTimeout(spread, 1200)
    const timer = window.setInterval(spread, 20_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [example, playWave])

  // 화면에 그릴 불빛: 실제 불빛 (+ DEMO 예시가 켜져 있으면 예시 불빛)
  const exampleSet = useMemo(() => (config.demoMode && example ? exampleLights(Date.now()) : []), [example])
  const displayLights = useMemo(() => [...sky.lights, ...exampleSet], [sky.lights, exampleSet])
  const myLightId = sky.myLight?.id ?? null
  const windowAssignment = useMemo(
    () => assignWindows(displayLights, myLightId, VILLAGE_WINDOWS.length),
    [displayLights, myLightId],
  )
  const litWindows = new Map<number, number>()
  for (const light of displayLights) {
    const slot = windowAssignment.get(light.id)
    if (slot !== undefined) litWindows.set(slot, lightOpacity(light.expiresAt, nowMs))
  }
  const floatingLights = displayLights.filter((light) => !windowAssignment.has(light.id))

  // 내 창문에서 하늘의 자리까지 떠오르는 연출. 화면 좌표(px)로 계산한다.
  function startRising(light: SharedLight) {
    if (reduceMotion) return
    const layer = layerRef.current?.getBoundingClientRect()
    const windowBox = windowRef.current?.getBoundingClientRect()
    if (!layer || !windowBox) return
    setRising({
      id: light.id,
      from: { x: windowBox.left - layer.left + 28, y: windowBox.top - layer.top + 22 },
      to: { x: light.x * layer.width, y: (skyTopPercent(light.y) / 100) * layer.height },
    })
  }

  async function publishLight() {
    const result = await sky.publish()
    softVibrate(settings?.vibrationEnabled ?? false)
    if (result.status === 'published') {
      startRising(result.light)
      playSound('light', soundOn)
    }
    setMessage(
      result.status === 'already_active'
        ? '이미 내 불빛이 밤하늘에 떠 있어요.'
        : '불빛 하나를 보탰어요. 2시간 동안 조용히 머물다 사라져요.',
    )
  }

  async function addLight() {
    if (isPrivate) {
      setPrivateInfoOpen(true)
      return
    }
    setBusy('light')
    setMessage(null)
    try {
      await publishLight()
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  // 비공개 상태에서 버튼을 눌렀을 때: 안내를 읽고 동의하면 한 번에 '직접 공개'로 바꾸고 불빛을 남긴다
  async function switchToManualAndPublish() {
    setBusy('light')
    setMessage(null)
    try {
      await updateSettings({ visibilityMode: 'manual', autoConsentAt: null })
      setPrivateInfoOpen(false)
      await publishLight()
    } catch (err) {
      setPrivateInfoOpen(false)
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function cancelLight() {
    setBusy('light')
    try {
      await sky.cancel()
      setMessage('내 불빛을 거뒀어요.')
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function spreadWarmth() {
    setBusy('wave')
    setMessage(null)
    try {
      await sky.sendWave()
      softVibrate(settings?.vibrationEnabled ?? false)
      playSound('warmth', soundOn)
      setMessage('밤하늘에 온기가 번졌어요.')
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  function pressMoon(name: string) {
    playSound('moon', soundOn)
    showLocalNotice(
      name === '달이 쉬는 밤'
        ? '오늘은 달이 쉬는 밤이에요. 진짜 하늘에서도 달이 잘 보이지 않아요.'
        : `오늘 진짜 하늘에도 ${name}이 떠 있어요. 창밖을 한번 볼까요?`,
    )
  }

  // 오늘의 작은 행동 카드: 쉬기로 했거나 이미 했으면 다시 권하지 않는다
  const actionCard =
    today.status === 'open'
      ? { label: '오늘의 작은 행동 · 안 해도 괜찮아요', title: today.action.title }
      : today.status === 'done'
        ? { label: '오늘의 작은 행동', title: '오늘은 이걸로 충분해요' }
        : { label: '오늘의 작은 행동', title: '오늘은 쉬어가요' }

  const skyEmpty = displayLights.length === 0
  const connectionText = CONNECTION_TEXT[sky.connection]
  const notice = localNotice ?? sky.notice

  return (
    <div className="pb-24">
      <NightSky className="h-[58dvh] min-h-[380px]" houses={false}>
        <header className="relative z-10 flex items-center justify-between px-5 pt-5">
          <p className="text-[17px] font-semibold tracking-tight text-night-100">반딧불이</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={musicEnabled}
              aria-label={musicEnabled ? '배경음 끄기' : '배경음 켜기'}
              title={musicEnabled ? '배경음 끄기' : '배경음 켜기'}
              onClick={() => setMusicEnabled(!musicEnabled)}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                musicEnabled ? 'bg-glow-400/15 text-glow-300 ring-1 ring-glow-400/40' : 'text-night-200 hover:text-night-100'
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V6l10-2v12" />
                <circle cx="6.5" cy="18" r="2.5" />
                <circle cx="16.5" cy="16" r="2.5" />
                {!musicEnabled && <path d="M3 3l18 18" />}
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate('help')}
              className="min-h-11 rounded-full px-3 text-[13px] text-night-200 hover:text-night-100"
            >
              도움이 필요할 때
            </button>
          </div>
        </header>

        <div className="absolute right-3 top-[68px] z-10">
          <Moon dim={phase === 'day'} onPress={pressMoon} />
        </div>

        {example && (
          <p className="absolute left-5 top-[76px] z-10 rounded-full bg-[#3a2f52]/90 px-3 py-1 text-[12px] font-medium text-[#f1e4ff]">
            예시 화면 · 실제 사람의 불빛이 아니에요
          </p>
        )}

        {/* 창문 마을: 꺼진 창문은 장식, 불 켜진 창문은 누군가 남긴 불빛 */}
        <div className="pointer-events-none absolute bottom-0 right-0 w-[min(calc(100%_-_150px),440px)]">
          <Village lit={litWindows} color={skyHouseColor(phase)} />
        </div>

        <SkyLights
          lights={floatingLights}
          myLightId={myLightId}
          hiddenId={rising?.id ?? null}
          nowMs={nowMs}
          reduceMotion={reduceMotion}
        />
        <AmbientWaves waves={sky.waves} reduceMotion={reduceMotion} />
        {/* 떠오르는 불빛의 좌표 기준이 되는 층 */}
        <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {rising && <RisingLight from={rising.from} to={rising.to} onDone={() => setRising(null)} />}
        </div>

        {/* 다른 사람의 불빛·온기가 닿았을 때, 또는 달을 눌렀을 때의 조용한 알림 */}
        <div className="pointer-events-none absolute inset-x-0 top-[24%] z-20 flex justify-center px-6" aria-live="polite">
          {notice && (
            <p
              key={notice.key}
              className="animate-notice max-w-[300px] rounded-2xl bg-night-950/75 px-4 py-2 text-center text-[13px] leading-relaxed text-glow-100 backdrop-blur-sm"
            >
              {notice.text}
            </p>
          )}
        </div>

        {/* 스크린리더용 요약. 개수는 경쟁 지표가 되지 않도록 말하지 않는다 */}
        <p className="sr-only" aria-live="polite">
          {skyEmpty ? `지금 하늘은 조용해요.` : '하늘과 창문에 누군가 남긴 불빛이 있어요.'}
          {sky.myLight ? ' 내 불빛도 함께 떠 있어요.' : ''}
        </p>

        {!sky.loading && skyEmpty && !sky.error && !notice && (
          <div className="absolute inset-x-0 top-[34%] z-10 px-8 text-center">
            <p className="text-[15px] leading-relaxed text-night-100/90">
              지금은 하늘이 조용해요.
              <br />
              조용한 {PHASE_WORD[phase]}도 괜찮아요.
            </p>
            <p className="mt-3 text-[12px] text-night-200/80">누군가 불빛을 남기면 하늘과 창문에 켜져요</p>
          </div>
        )}

        <button
          ref={windowRef}
          type="button"
          onClick={() => navigate('room')}
          className="absolute bottom-4 left-5 z-10 flex items-end gap-2 rounded-xl p-1 text-left"
          aria-label="나의 방으로 가기. 창문 불빛은 나에게만 보여요"
        >
          <MyWindow size="small" />
          <span className="mb-1 text-[12px] leading-tight text-night-100/90">
            나의 창문
            <br />
            <span className="text-night-200/80">나에게만 보여요</span>
          </span>
        </button>
      </NightSky>

      <main className="mx-auto max-w-md px-5">
        {/* 장식과 실제 불빛을 구분하는 범례 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-[12px] text-night-300">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-glow-300 shadow-[0_0_6px_rgba(255,200,97,0.9)]" />
              <span className="h-2 w-2 rounded-[2px] bg-glow-400 shadow-[0_0_6px_rgba(255,200,97,0.8)]" />
            </span>
            누군가 남긴 불빛{config.demoMode && !example ? ' (DEMO: 내 불빛만)' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-flex items-center gap-1">
              <span className="h-[3px] w-[3px] bg-[#dfe5ff]/70" />
              <span className="h-2 w-2 rounded-[2px] bg-[#2b3460] ring-1 ring-night-600" />
            </span>
            별·꺼진 창문은 장식
          </span>
        </div>

        {config.demoMode && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              aria-pressed={example}
              onClick={() => setExample((v) => !v)}
              className={`min-h-11 rounded-full px-4 text-[12px] ring-1 ${
                example ? 'bg-[#3a2f52] text-[#f1e4ff] ring-[#c9a8ff]/50' : 'text-night-300 ring-night-700 hover:text-night-100'
              }`}
            >
              {example ? '예시 끄기' : 'DEMO · 사람이 많을 때의 예시 하늘 보기'}
            </button>
          </div>
        )}

        {connectionText && (
          <p role="status" className="mt-3 rounded-2xl bg-night-800/80 px-4 py-2 text-center text-[13px] text-night-200">
            {connectionText}
          </p>
        )}

        {sky.error ? (
          <div className="mt-4">
            <ErrorState message={errorMessage(new FireflyError(sky.error))} detail={sky.errorDetail} onRetry={() => void sky.reload()} />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {sky.myLight ? (
                <Button variant="soft" onClick={() => void cancelLight()} disabled={busy !== null}>
                  불빛 거두기
                </Button>
              ) : (
                <Button onClick={() => void addLight()} disabled={busy !== null || sky.loading}>
                  {busy === 'light' ? '보태는 중…' : '불빛 하나 보태기'}
                </Button>
              )}
              <Button
                variant="soft"
                onClick={() => void spreadWarmth()}
                disabled={busy !== null || waveResting || sky.loading}
              >
                {waveResting ? '잠시 쉬는 중' : busy === 'wave' ? '퍼뜨리는 중…' : '온기 퍼뜨리기'}
              </Button>
            </div>
            {sky.myLight && (
              <p className="mt-2 text-center text-[13px] text-night-300">
                내 불빛이 떠 있어요 · {describeRemaining(remainingMs(sky.myLight.expiresAt, nowMs))}
              </p>
            )}
            <div className="mt-2">
              <LiveMessage message={message} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate('action')}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-3xl bg-paper-100 px-5 py-4 text-left text-ink-700"
        >
          <span>
            <span className="block text-[12px] text-ink-500">{actionCard.label}</span>
            <span className="mt-0.5 block text-[16px] font-medium">{actionCard.title}</span>
          </span>
          <span aria-hidden="true" className="text-ink-500">
            ›
          </span>
        </button>
      </main>

      <ConfirmDialog
        open={privateInfoOpen}
        title="지금은 나에게만 보이는 설정이에요"
        confirmLabel="직접 공개로 바꾸고 불빛 남기기"
        cancelLabel="그대로 둘게요"
        busy={busy === 'light'}
        onConfirm={() => void switchToManualAndPublish()}
        onClose={() => setPrivateInfoOpen(false)}
      >
        <p>불빛 공개 방식이 '비공개'라서 밤하늘에 불빛이 남지 않아요.</p>
        <p>
          '직접 공개'로 바꾸면 지금처럼 버튼을 누를 때만 불빛이 남아요. 누가 남겼는지는 아무도 알 수 없고, 2시간 뒤
          사라져요.
        </p>
        <p>공개 방식은 나의 방이나 설정에서 언제든 다시 바꿀 수 있어요.</p>
      </ConfirmDialog>
    </div>
  )
}
