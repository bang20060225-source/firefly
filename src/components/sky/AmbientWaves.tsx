// 온기 퍼뜨리기: 밤하늘 전체로 약 5초간 번지는 빛의 파동.
// 특정 사람을 가리키지 않는다. 움직임 줄이기가 켜져 있으면 크기 변화 없이 은은하게 밝아졌다 사라진다.
import { AMBIENT_WAVE_DURATION_MS } from '../../lib/lightRules'

export function AmbientWaves({ waves, reduceMotion }: { waves: string[]; reduceMotion: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {waves.map((id) =>
        reduceMotion ? (
          <span
            key={id}
            data-testid="ambient-wave"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,214,140,0.5),rgba(255,214,140,0)_70%)]"
            style={{ animation: `ambient-glow ${AMBIENT_WAVE_DURATION_MS}ms ease-out forwards` }}
          />
        ) : (
          <span
            key={id}
            data-testid="ambient-wave"
            className="absolute left-1/2 top-[55%] aspect-square w-[260%] rounded-full bg-[radial-gradient(circle,rgba(255,214,140,0.06)_25%,rgba(255,214,140,0.4)_46%,rgba(255,214,140,0)_58%)]"
            style={{ animation: `ambient-wave ${AMBIENT_WAVE_DURATION_MS}ms ease-out forwards` }}
          />
        ),
      )}
    </div>
  )
}
