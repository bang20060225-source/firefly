// 홈 — 공동의 밤하늘
// 아무것도 하지 않고 바라보다 닫아도 괜찮은 화면.
import { useRef, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { navigate } from '../app/useHashRoute'
import { useTodayAction } from '../app/useTodayAction'
import { AmbientWaves } from '../components/sky/AmbientWaves'
import { MyWindow } from '../components/sky/MyWindow'
import { NightSky } from '../components/sky/NightSky'
import { RisingLight } from '../components/sky/RisingLight'
import { SkyLights, skyTopPercent } from '../components/sky/SkyLights'
import { Button, ConfirmDialog, ErrorState, LiveMessage } from '../components/ui'
import { config } from '../config'
import { softVibrate } from '../lib/haptics'
import { describeRemaining, remainingMs } from '../lib/lightRules'
import { errorMessage, FireflyError } from '../services/backend'
import type { ConnectionState, SharedLight } from '../types'

const CONNECTION_TEXT: Partial<Record<ConnectionState, string>> = {
  connecting: '밤하늘에 연결하는 중이에요',
  reconnecting: '연결이 잠시 끊겼어요. 다시 잇는 중이에요',
  offline: '인터넷이 끊겨 있어요. 다시 연결되면 밤하늘을 새로 불러올게요',
}

export function Home() {
  const { sky, settings, reduceMotion, updateSettings } = useApp()
  const today = useTodayAction()
  const layerRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLButtonElement>(null)
  const [rising, setRising] = useState<{ id: string; from: { x: number; y: number }; to: { x: number; y: number } } | null>(
    null,
  )
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'light' | 'wave' | null>(null)
  const waveResting = sky.waveResting
  const [privateInfoOpen, setPrivateInfoOpen] = useState(false)

  const nowMs = sky.now()
  const isPrivate = settings?.visibilityMode === 'private'

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
    if (result.status === 'published') startRising(result.light)
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
      setMessage('밤하늘에 온기가 번졌어요.')
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  // 오늘의 작은 행동 카드: 쉬기로 했거나 이미 했으면 다시 권하지 않는다
  const actionCard =
    today.status === 'open'
      ? { label: '오늘의 작은 행동 · 안 해도 괜찮아요', title: today.action.title }
      : today.status === 'done'
        ? { label: '오늘의 작은 행동', title: '오늘은 이걸로 충분해요' }
        : { label: '오늘의 작은 행동', title: '오늘은 쉬어가요' }

  const skyEmpty = sky.lights.length === 0
  const connectionText = CONNECTION_TEXT[sky.connection]

  return (
    <div className="pb-24">
      <NightSky className="h-[58dvh] min-h-[360px]">
        <header className="relative z-10 flex items-center justify-between px-5 pt-5">
          <p className="text-[17px] font-semibold tracking-tight text-night-100">반딧불이</p>
          <button
            type="button"
            onClick={() => navigate('help')}
            className="min-h-11 rounded-full px-3 text-[13px] text-night-200 hover:text-night-100"
          >
            도움이 필요할 때
          </button>
        </header>

        <SkyLights
          lights={sky.lights}
          myLightId={sky.myLight?.id ?? null}
          hiddenId={rising?.id ?? null}
          nowMs={nowMs}
          reduceMotion={reduceMotion}
        />
        <AmbientWaves waves={sky.waves} reduceMotion={reduceMotion} />
        {/* 떠오르는 불빛의 좌표 기준이 되는 층 */}
        <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {rising && <RisingLight from={rising.from} to={rising.to} onDone={() => setRising(null)} />}
        </div>

        {/* 스크린리더용 요약. 개수는 경쟁 지표가 되지 않도록 말하지 않는다 */}
        <p className="sr-only" aria-live="polite">
          {skyEmpty ? '지금 밤하늘은 조용해요.' : '밤하늘에 누군가 남긴 불빛이 떠 있어요.'}
          {sky.myLight ? ' 내 불빛도 함께 떠 있어요.' : ''}
        </p>

        {!sky.loading && skyEmpty && !sky.error && (
          <div className="absolute inset-x-0 top-[32%] z-10 px-8 text-center">
            <p className="text-[15px] leading-relaxed text-night-200/90">
              지금은 하늘이 조용해요.
              <br />
              조용한 밤도 괜찮아요.
            </p>
            <p className="mt-3 text-[12px] text-night-300">누군가 불빛을 남기면 여기에 떠올라요</p>
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
          <span className="mb-1 text-[12px] leading-tight text-night-200">
            나의 창문
            <br />
            <span className="text-night-300">나에게만 보여요</span>
          </span>
        </button>
      </NightSky>

      <main className="mx-auto max-w-md px-5">
        {/* 장식과 실제 불빛을 구분하는 작은 범례 */}
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-[12px] text-night-300">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-glow-300 shadow-[0_0_6px_rgba(255,200,97,0.9)]" />
            누군가 남긴 불빛{config.demoMode ? ' (DEMO: 내 불빛만)' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-[3px] w-[3px] bg-[#dfe5ff]/70" />
            배경 장식 별
          </span>
        </p>

        {connectionText && (
          <p role="status" className="mt-3 rounded-2xl bg-night-800/80 px-4 py-2 text-center text-[13px] text-night-200">
            {connectionText}
          </p>
        )}

        {sky.error ? (
          <div className="mt-4">
            <ErrorState message={errorMessage(new FireflyError(sky.error))} onRetry={() => void sky.reload()} />
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
