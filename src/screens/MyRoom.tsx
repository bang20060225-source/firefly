// 나의 방 — 나만의 독립적인 공간.
// 성과나 활동량은 보여주지 않는다. 방의 불빛은 나에게만 보이고, 공동 밤하늘 공개와는 따로다.
// 공개 설정은 접어 두어 방이 설정 화면처럼 보이지 않게 한다.
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { BookDialog } from '../components/BookDialog'
import { RoomScene, type RoomToy } from '../components/sky/RoomScene'
import { playSound, type SoundKind } from '../lib/sound'
import { Button, LiveMessage } from '../components/ui'
import { VisibilityPicker } from '../components/VisibilityPicker'
import { describeRemaining, remainingMs } from '../lib/lightRules'
import { errorMessage } from '../services/backend'
import type { VisibilityMode } from '../types'

const MODE_LABEL: Record<VisibilityMode, string> = {
  private: '비공개',
  manual: '직접 공개',
  auto: '자동 공개',
}

// 장난감을 눌렀을 때 나오는 한 줄. 재촉하거나 평가하지 않는, 조금 하찮은 말들.
const TOY_LINES: Record<Exclude<RoomToy, 'lamp' | 'book'>, string[]> = {
  sock: ['양말 한 짝이 짝을 찾고 있어요.', '양말이 폴짝 뛰었어요. 별일은 없어요.', '나중에 치워도 괜찮아요.'],
  plant: ['잎이 살랑 흔들렸어요.', '화분은 오늘도 천천히 자라는 중이에요.', '물은 생각날 때 주면 돼요.'],
  mug: ['따뜻한 김이 피어올라요.', '차는 천천히 식어도 괜찮아요.', '한 모금 쉬어 가요.'],
}

const LAMP_ON_CAPTION = '방에 불이 켜졌어요. 이 불빛은 나에게만 보여요.'
const LAMP_OFF_CAPTION = '스탠드를 껐어요. 창밖이 조금 더 잘 보여요.'

export function MyRoom() {
  const { sky, settings } = useApp()
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lampOn, setLampOn] = useState(true)
  const [activeToy, setActiveToy] = useState<{ toy: RoomToy; key: number } | null>(null)
  const [toyLine, setToyLine] = useState<string | null>(null)
  const lineIndex = useRef<Record<string, number>>({})
  const captionTimer = useRef<number | undefined>(undefined)
  const [bookOpen, setBookOpen] = useState(false)
  useEffect(() => () => window.clearTimeout(captionTimer.current), [])
  const soundOn = settings?.soundEnabled ?? false

  function pressToy(toy: RoomToy) {
    // 물건마다 다른 소리 (누를 때마다 조금씩 달라진다)
    const sound: SoundKind = toy === 'lamp' ? (lampOn ? 'lampOff' : 'lampOn') : toy
    playSound(sound, soundOn)
    setActiveToy({ toy, key: Date.now() })
    window.clearTimeout(captionTimer.current)
    if (toy === 'book') {
      setToyLine(null)
      setBookOpen(true)
      return
    }
    if (toy === 'lamp') {
      setLampOn((on) => !on)
      setToyLine(null)
      return
    }
    const lines = TOY_LINES[toy]
    const i = lineIndex.current[toy] ?? 0
    lineIndex.current[toy] = (i + 1) % lines.length
    setToyLine(lines[i])
    captionTimer.current = window.setTimeout(() => setToyLine(null), 4000)
  }

  const caption = toyLine ?? (lampOn ? LAMP_ON_CAPTION : LAMP_OFF_CAPTION)

  async function cancel() {
    setBusy(true)
    try {
      await sky.cancel()
      setMessage('불빛을 거뒀어요. 밤하늘에서 내 불빛이 사라졌어요.')
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper-50 pb-28 text-ink-700">
      <header className="mx-auto max-w-md px-5 pt-6">
        <h1 className="text-xl font-semibold tracking-tight">나의 방</h1>
        <p className="mt-1 text-sm text-ink-500">여기는 나만 들어올 수 있는 곳이에요.</p>
      </header>

      <main className="mx-auto max-w-md px-5">
        <figure className="mt-5">
          <div className="overflow-hidden rounded-[28px] shadow-[0_1px_0_#e8dfcf]">
            <RoomScene myLightInSky={sky.myLight !== null} lampOn={lampOn} active={activeToy} onToy={pressToy} />
          </div>
          <figcaption className="mt-3 text-center" aria-live="polite">
            <span className="block min-h-6 text-[14px] leading-relaxed text-ink-700">{caption}</span>
            <span className="mt-0.5 block text-[12px] text-ink-500">방 안의 물건을 눌러 볼 수 있어요</span>
          </figcaption>
        </figure>

        <section className="mt-5" aria-labelledby="shared-status">
          <h2 id="shared-status" className="sr-only">
            공동 밤하늘 공개 상태
          </h2>
          {sky.myLight ? (
            <div className="flex items-center justify-between gap-3 rounded-3xl bg-paper-100 px-5 py-3">
              <div className="min-w-0">
                <p className="text-[15px]">밤하늘에 내 불빛이 떠 있어요</p>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  {describeRemaining(remainingMs(sky.myLight.expiresAt, sky.now()))}
                </p>
              </div>
              <Button variant="paperGhost" size="sm" className="shrink-0" onClick={() => void cancel()} disabled={busy}>
                {busy ? '거두는 중…' : '불빛 거두기'}
              </Button>
            </div>
          ) : (
            <p className="rounded-3xl bg-paper-100 px-5 py-3 text-[14px] text-ink-500">지금 밤하늘에는 내 불빛이 없어요.</p>
          )}
          <div className="mt-1 [&_p]:text-ink-500">
            <LiveMessage message={message} />
          </div>
        </section>

        <details
          className="mt-1 rounded-3xl bg-paper-100"
          onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 [&::-webkit-details-marker]:hidden">
            <span className="text-[15px]">불빛 공개 방식</span>
            <span className="flex items-center gap-2 text-[14px] text-ink-500">
              {settings ? MODE_LABEL[settings.visibilityMode] : ''}
              <span aria-hidden="true" className={`inline-block transition-transform ${settingsOpen ? 'rotate-90' : ''}`}>
                ›
              </span>
            </span>
          </summary>
          <div className="px-4 pb-4">
            <VisibilityPicker tone="paper" hideLegend />
          </div>
        </details>
      </main>

      <BookDialog open={bookOpen} onClose={() => setBookOpen(false)} onTurn={() => playSound('page', soundOn)} />
    </div>
  )
}
