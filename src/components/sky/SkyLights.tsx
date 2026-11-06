// 실제 사용자가 남긴 불빛. 누가 남겼는지는 알 수 없고, 눌러도 아무 정보가 열리지 않는다.
import { lightOpacity } from '../../lib/lightRules'
import type { SharedLight } from '../../types'

export function SkyLights({
  lights,
  myLightId,
  nowMs,
  reduceMotion,
}: {
  lights: SharedLight[]
  myLightId: string | null
  nowMs: number
  reduceMotion: boolean
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {lights.map((light, index) => {
        const opacity = lightOpacity(light.expiresAt, nowMs)
        if (opacity <= 0) return null
        const isMine = light.id === myLightId
        return (
          <span
            key={light.id}
            data-testid="user-light"
            className={`absolute block ${reduceMotion ? '' : 'animate-firefly'}`}
            style={{
              left: `${light.x * 100}%`,
              // 서버 좌표(0.1~0.7)를 제목 줄 아래 ~ 언덕 위 사이의 열린 하늘에 놓는다
              top: `${16 + light.y * 76}%`,
              opacity,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${(index % 7) * -0.9}s`,
              transition: 'opacity 2s ease',
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,210,122,0.45)_0%,rgba(255,210,122,0)_70%)]" />
            <span className="relative block h-2.5 w-2.5 rounded-full bg-glow-300 shadow-[0_0_10px_2px_rgba(255,200,97,0.75)]" />
            {isMine && (
              <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-glow-100/60" />
            )}
          </span>
        )
      })}
    </div>
  )
}
