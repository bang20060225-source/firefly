// 스피커 버튼 — 배경음과 효과음을 한꺼번에 켜고 끈다. (하나씩 따로 조절하려면 설정에서)
// 처음엔 꺼져 있다. 갑자기 소리가 나지 않도록, 사용자가 직접 켰을 때만 소리가 난다.
import { useApp } from '../app/AppProvider'
import { errorMessage } from '../services/backend'

type Props = {
  /** 밤하늘(어두운 배경) 또는 나의 방(밝은 종이 배경) */
  tone: 'night' | 'paper'
  /** 아이콘 옆에 '소리' 글자도 보일지 */
  showText?: boolean
  /** 효과음 설정을 저장하지 못했을 때 알려 줄 곳 */
  onError: (message: string) => void
}

export function SoundButton({ tone, showText = false, onError }: Props) {
  const { soundOn, setSoundOn } = useApp()
  const look =
    tone === 'night'
      ? soundOn
        ? 'bg-glow-400/15 text-glow-300 ring-1 ring-glow-400/40'
        : 'text-night-200 hover:text-night-100'
      : soundOn
        ? 'bg-glow-100 text-ink-700 ring-1 ring-glow-500/60'
        : 'text-ink-500 ring-1 ring-paper-200 hover:text-ink-700'

  return (
    <button
      type="button"
      aria-pressed={soundOn}
      aria-label={showText ? undefined : '소리'}
      title={soundOn ? '소리 끄기' : '소리 켜기'}
      onClick={() => {
        setSoundOn(!soundOn).catch((err) => onError(errorMessage(err)))
      }}
      className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors ${
        showText ? 'pl-3 pr-4' : 'w-11'
      } ${look}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4z" />
        {soundOn ? (
          <>
            <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
            <path d="M17.5 7a7 7 0 0 1 0 10" />
          </>
        ) : (
          <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
        )}
      </svg>
      {showText && <span className="text-[14px]">소리</span>}
    </button>
  )
}
