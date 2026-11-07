// 책 한 페이지 — 나의 방 선반의 책을 누르면 열린다.
// 글귀는 한 바퀴 다 볼 때까지 겹치지 않게 섞어서 보여준다. 기록은 남기지 않는다.
import { useEffect, useId, useRef, useState } from 'react'
import { BOOK_LINES, createLineBag, pageNumber } from '../data/bookLines'
import { Button } from './ui'

// 앱을 새로 열 때마다 새로 섞인다 (화면을 옮겨 다녀도 이어진다)
const nextLine = createLineBag(BOOK_LINES.length)

export function BookDialog({ open, onClose, onTurn }: { open: boolean; onClose: () => void; onTurn: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [index, setIndex] = useState<number>(() => nextLine())
  const [turn, setTurn] = useState(0)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // 책을 펼칠 때마다 새 페이지
      setIndex(nextLine())
      setTurn((n) => n + 1)
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  function turnPage() {
    onTurn()
    setIndex(nextLine())
    setTurn((n) => n + 1)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm overflow-visible rounded-[28px] bg-transparent p-0 backdrop:bg-night-950/60"
    >
      <div className="relative rounded-[28px] bg-paper-50 px-7 pt-7 pb-6 text-ink-700 shadow-[0_18px_40px_-12px_rgba(21,27,51,0.55)] ring-1 ring-paper-200">
        {/* 책등과 종이 결 */}
        <div aria-hidden="true" className="absolute inset-y-6 left-3 w-px bg-paper-200" />
        <h2 id={titleId} className="text-center text-[12px] tracking-[0.2em] text-ink-500">
          반딧불이의 작은 책
        </h2>

        <figure key={turn} className="animate-page mt-6 flex min-h-[176px] flex-col items-center justify-center text-center">
          <span aria-hidden="true" className="mb-4 block h-1.5 w-1.5 rounded-full bg-glow-500 shadow-[0_0_10px_3px_rgba(255,200,97,0.6)]" />
          <blockquote aria-live="polite" className="font-book text-[19px] leading-[1.85] text-balance text-ink-700">
            {BOOK_LINES[index]}
          </blockquote>
          <figcaption className="mt-5 text-[12px] text-ink-500" aria-hidden="true">
            — {pageNumber(index)}쪽 —
          </figcaption>
        </figure>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="paper" onClick={turnPage}>
            한 장 더 넘기기
          </Button>
          <Button variant="paperGhost" onClick={onClose}>
            책 덮기
          </Button>
        </div>
      </div>
    </dialog>
  )
}
