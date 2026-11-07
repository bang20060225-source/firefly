// 마음 날려 보내기 — 걱정, 바람, 고마움을 한 줄 적어 밤하늘로 날려 보낸다.
//
// 지키는 약속
//  · 적은 글은 저장하지 않고, 서버로도 보내지 않는다. (이 화면의 메모리에만 잠깐 있다가 지워진다)
//  · 날려 보내면 글자가 흩어지며 사라진다. 하늘에는 다른 불빛과 똑같은 불빛 하나만 남는다.
//  · 앱은 글을 읽거나 분석하지 않는다. 꼭 적지 않아도 되는 선택 단계다.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { navigate } from '../app/useHashRoute'
import { Button } from './ui'

const MAX_LENGTH = 100
/** 글자가 다 흩어지는 데 걸리는 시간 */
const DISSOLVE_MS = 1700

type Props = {
  open: boolean
  reduceMotion: boolean
  /** 글자가 다 흩어진 뒤 불린다. 글 내용은 넘기지 않는다 */
  onSent: () => void
  onClose: () => void
}

export function MindDialog({ open, reduceMotion, onSent, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const noteId = useId()
  const [text, setText] = useState('')
  /** 흩어지는 중인 글 (화면 연출용, 끝나면 지운다) */
  const [flying, setFlying] = useState<string | null>(null)
  const onSentRef = useRef(onSent)
  useEffect(() => {
    onSentRef.current = onSent
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open) {
      // 닫으면 적던 글도 함께 지운다
      setText('')
      setFlying(null)
    }
  }, [open])

  useEffect(() => {
    if (flying === null) return
    const timer = window.setTimeout(
      () => {
        setFlying(null)
        onSentRef.current()
      },
      reduceMotion ? 400 : DISSOLVE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [flying, reduceMotion])

  function send() {
    const words = text.trim()
    if (!words) return
    setText('')
    setFlying(words)
  }

  const letters = flying ? Array.from(flying) : []

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-3xl bg-night-800 p-0 text-night-100 ring-1 ring-night-600 backdrop:bg-night-950/70"
    >
      <div className="px-6 pt-6 pb-5">
        <h2 id={titleId} className="text-lg font-semibold">
          마음 날려 보내기
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-night-200">
          걱정도, 바람도, 고마움도 괜찮아요. 한 줄 적어 밤하늘로 날려 보내 보세요.
        </p>

        <div className="relative mt-4 min-h-[124px]">
          {flying === null ? (
            <>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
                maxLength={MAX_LENGTH}
                rows={3}
                aria-label="날려 보낼 마음"
                aria-describedby={noteId}
                placeholder="여기에 적어 보세요"
                // 브라우저의 맞춤법 검사·자동 완성이 글을 다른 곳으로 보내지 않게 끈다
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                className="block w-full resize-none rounded-2xl bg-night-900/70 px-4 py-3 text-[16px] leading-relaxed text-night-100 ring-1 ring-night-600 placeholder:text-night-300 focus:outline-none focus:ring-2 focus:ring-glow-400/70"
              />
              <p className="mt-1 text-right text-[12px] text-night-300" aria-hidden="true">
                {text.length}/{MAX_LENGTH}
              </p>
            </>
          ) : (
            <div className="flex min-h-[124px] flex-col items-center justify-center px-2 text-center">
              <p className="sr-only" role="status">
                마음을 날려 보내는 중이에요
              </p>
              <p aria-hidden="true" data-testid="mind-dissolve" className="text-[17px] leading-relaxed text-night-100">
                {letters.map((letter, i) => (
                  <span
                    key={i}
                    className="animate-dissolve"
                    style={
                      {
                        animationDelay: `${Math.round((i / Math.max(1, letters.length - 1)) * 500)}ms`,
                        '--dx': `${((i * 37) % 29) - 14}px`,
                      } as CSSProperties
                    }
                  >
                    {letter}
                  </span>
                ))}
              </p>
              <span
                aria-hidden="true"
                className="animate-spark mt-3 block h-2 w-2 rounded-full bg-glow-300 shadow-[0_0_12px_4px_rgba(255,200,97,0.7)]"
              />
            </div>
          )}
        </div>

        <p id={noteId} className="mt-2 rounded-2xl bg-night-900/60 px-4 py-3 text-[13px] leading-relaxed text-night-300">
          적은 글은 저장되지 않고, 누구에게도 보이지 않아요. 날려 보내면 글은 흩어지고 작은 불빛만 남아요.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={send} disabled={flying !== null || text.trim() === ''}>
            {flying !== null ? '날아가는 중…' : '날려 보내기'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={flying !== null}>
            닫기
          </Button>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('help')
          }}
          className="mx-auto mt-3 block min-h-11 px-3 text-[13px] text-night-300 underline underline-offset-4 hover:text-night-100"
        >
          혼자 감당하기 어려울 땐 · 도움받기
        </button>
      </div>
    </dialog>
  )
}
