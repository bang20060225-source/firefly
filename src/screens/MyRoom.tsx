// 나의 방 — 나만의 독립적인 공간.
// 성과나 활동량은 보여주지 않는다. 창문 불빛은 나에게만 보이고, 공동 밤하늘 공개와는 따로다.
import { useState } from 'react'
import { useApp } from '../app/AppProvider'
import { MyWindow } from '../components/sky/MyWindow'
import { Button, LiveMessage } from '../components/ui'
import { VisibilityPicker } from '../components/VisibilityPicker'
import { describeRemaining, remainingMs } from '../lib/lightRules'
import { errorMessage } from '../services/backend'

export function MyRoom() {
  const { sky } = useApp()
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
        <figure className="mt-6 flex flex-col items-center rounded-[2rem] bg-paper-100 px-6 pt-8 pb-6">
          <MyWindow size="large" />
          <figcaption className="mt-4 text-center text-[14px] leading-relaxed text-ink-500">
            창문에 불이 켜졌어요.
            <br />이 불빛은 나에게만 보여요.
          </figcaption>
        </figure>

        <section className="mt-6" aria-labelledby="shared-status">
          <h2 id="shared-status" className="sr-only">
            공동 밤하늘 공개 상태
          </h2>
          {sky.myLight ? (
            <div className="rounded-3xl bg-paper-100 px-5 py-4">
              <p className="text-[15px]">지금 공동 밤하늘에 내 불빛이 있어요.</p>
              <p className="mt-1 text-[13px] text-ink-500">{describeRemaining(remainingMs(sky.myLight.expiresAt, sky.now()))}</p>
              <Button variant="paper" className="mt-3 w-full" onClick={() => void cancel()} disabled={busy}>
                {busy ? '거두는 중…' : '불빛 거두기'}
              </Button>
            </div>
          ) : (
            <p className="rounded-3xl bg-paper-100 px-5 py-4 text-[14px] text-ink-500">
              지금 공동 밤하늘에는 내 불빛이 없어요.
            </p>
          )}
          <div className="mt-2 [&_p]:text-ink-500">
            <LiveMessage message={message} />
          </div>
        </section>

        <section className="mt-4">
          <VisibilityPicker tone="paper" />
        </section>
      </main>
    </div>
  )
}
