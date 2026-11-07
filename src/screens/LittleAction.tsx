// 오늘의 작은 행동 — 하루 한 개. 해도 되고 안 해도 된다.
// 기록은 이 기기에만, 오늘 하루치만 남는다. 연속 기록·점수·재촉 알림은 없다.
import { useId } from 'react'
import { useTodayAction } from '../app/useTodayAction'
import { Button } from '../components/ui'

export function LittleAction() {
  const { action, status, markDone, skip, reopen, swap, nearbyOnly, setNearbyOnly } = useTodayAction()
  const nearbyId = useId()

  return (
    <div className="min-h-dvh bg-paper-50 pb-28 text-ink-700">
      <header className="mx-auto max-w-md px-5 pt-6">
        <h1 className="text-xl font-semibold tracking-tight">오늘의 작은 행동</h1>
        <p className="mt-1 text-sm text-ink-500">아주 작은 것 하나. 안 해도 괜찮아요.</p>
      </header>

      <main className="mx-auto max-w-md px-5">
        <section className="mt-6 rounded-[2rem] bg-paper-100 px-6 py-8 text-center" aria-live="polite">
          {status === 'open' && (
            <>
              <p className="text-[13px] text-ink-500">오늘은</p>
              <h2 className="mt-2 text-2xl font-semibold leading-snug">{action.title}</h2>
              <p className="mt-3 text-[15px] text-ink-500">{action.note}</p>
            </>
          )}
          {status === 'done' && (
            <>
              <h2 className="text-xl font-semibold">좋아요. 그걸로 충분해요.</h2>
              <p className="mt-2 text-[14px] text-ink-500">{action.title}</p>
            </>
          )}
          {status === 'skipped' && (
            <>
              <h2 className="text-xl font-semibold">괜찮아요. 오늘은 쉬어가요.</h2>
              <p className="mt-2 text-[14px] text-ink-500">내일 열면 새로운 작은 행동이 기다릴 거예요.</p>
            </>
          )}
        </section>

        {status === 'open' ? (
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="paper" onClick={markDone}>
              해봤어요
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="paperGhost" onClick={swap}>
                다른 걸로
              </Button>
              <Button variant="paperGhost" onClick={skip}>
                오늘은 쉴래요
              </Button>
            </div>
          </div>
        ) : (
          // 쉬기로 했거나 이미 했으면 크게 권하지 않고, 작은 링크로만 남긴다
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={reopen}
              className="min-h-11 rounded-xl px-3 text-[14px] text-ink-500 underline underline-offset-4 hover:text-ink-700"
            >
              오늘의 행동 다시 보기
            </button>
          </div>
        )}

        <label
          htmlFor={nearbyId}
          className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl bg-paper-100 px-4 py-3 text-[14px]"
        >
          <input
            id={nearbyId}
            type="checkbox"
            checked={nearbyOnly}
            onChange={(event) => setNearbyOnly(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#3d3a4a]"
          />
          <span>
            <span className="block text-ink-700">자리에서 할 수 있는 것만 보기</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-500">
              일어나거나 걸어가지 않아도 되는 행동만 골라 드려요. 이 기기에만 저장돼요.
            </span>
          </span>
        </label>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-500">
          이 기록은 이 기기에만, 오늘 하루만 남아요.
          <br />
          다른 사람에게 보이지 않고 서버로 보내지 않아요.
        </p>
      </main>
    </div>
  )
}
