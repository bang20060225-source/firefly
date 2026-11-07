// 오늘의 실제 달 모양. 기기 날짜로 계산한다.
// 눌러 보면 진짜 하늘에도 같은 달이 떠 있다고 알려 준다. (창밖을 한번 보게 하는 작은 계기)
import { moonLitPath, moonName, moonPhase } from '../../lib/skyScene'

export function Moon({ dim = false, onPress }: { dim?: boolean; onPress: (name: string) => void }) {
  const phase = moonPhase(new Date())
  const name = moonName(phase)
  const resting = name === '달이 쉬는 밤'
  return (
    <button
      type="button"
      onClick={() => onPress(name)}
      aria-label={`오늘의 달: ${name}`}
      className="flex h-14 w-14 items-center justify-center rounded-full"
      style={{ opacity: dim ? 0.55 : 1 }}
    >
      <svg viewBox="-24 -24 48 48" className="h-12 w-12" aria-hidden="true">
        {!dim && <circle r="20" fill="#fff6df" opacity="0.08" />}
        {/* 어두운 부분도 희미하게 보이게 (지구조) */}
        <circle r="11" fill="#5a6494" opacity={resting ? 0.5 : 0.28} />
        {!resting && <path d={moonLitPath(phase, 11)} fill="#fff3d6" />}
      </svg>
    </button>
  )
}
