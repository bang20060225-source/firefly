// 나의 방 장면 — 방 안에서 바라본 작은 방.
// 들어오면 스탠드 불빛이 은은하게 켜진다. (나에게만 보이는 불빛)
// 내 불빛이 공동 밤하늘에 떠 있으면 창밖에도 작게 보인다.
// 방 안의 물건(스탠드·양말·화분·머그컵)은 눌러 볼 수 있다. 점수나 목표는 없는 그냥 장난감이다.
import type { KeyboardEvent } from 'react'

export type RoomToy = 'lamp' | 'sock' | 'plant' | 'mug'

type Props = {
  myLightInSky: boolean
  lampOn: boolean
  /** 방금 누른 물건과 누른 순간(애니메이션을 다시 재생하기 위한 key) */
  active: { toy: RoomToy; key: number } | null
  onToy: (toy: RoomToy) => void
  /** false 면 그림으로만 보여준다 (첫 안내 화면용) */
  interactive?: boolean
}

const TOY_LABEL: Record<RoomToy, string> = {
  lamp: '스탠드 켜고 끄기',
  sock: '양말 건드려 보기',
  plant: '화분 건드려 보기',
  mug: '머그컵 건드려 보기',
}

export function RoomScene({ myLightInSky, lampOn, active, onToy, interactive = true }: Props) {
  const toyProps = (toy: RoomToy) =>
    interactive
      ? {
    role: 'button',
    tabIndex: 0,
    'aria-label': toy === 'lamp' ? `${TOY_LABEL.lamp} (지금 ${lampOn ? '켜짐' : '꺼짐'})` : TOY_LABEL[toy],
    className: 'cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100',
    onClick: () => onToy(toy),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onToy(toy)
      }
    },
        }
      : {}
  const playing = (toy: RoomToy) => (active?.toy === toy ? active.key : 0)

  return (
    <svg viewBox="0 0 320 220" className="block h-auto w-full select-none" role={interactive ? 'group' : 'img'} aria-label="나의 방">
      <defs>
        <clipPath id="room-clip">
          <rect width="320" height="220" rx="28" />
        </clipPath>
        <linearGradient id="room-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2645" />
          <stop offset="100%" stopColor="#3a4377" />
        </linearGradient>
        <radialGradient id="room-lamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffd27a" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="room-my-light" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe3a3" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffe3a3" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath="url(#room-clip)">
        {/* 벽과 바닥 */}
        <rect width="320" height="220" fill="#f4eee3" />
        <rect y="178" width="320" height="42" fill="#e8dfcf" />
        <ellipse cx="118" cy="204" rx="78" ry="11" fill="#e0d3bd" />

        {/* 스탠드 불빛 — 방에 들어오면 켜진다 */}
        <g style={{ opacity: lampOn ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <circle className="animate-window-on" cx="236" cy="116" r="150" fill="url(#room-lamp-glow)" />
        </g>

        {/* 창문: 창밖은 밤하늘 */}
        <rect x="40" y="32" width="118" height="106" rx="10" fill="#3d3a4a" />
        <rect x="48" y="40" width="102" height="90" rx="6" fill="url(#room-night)" />
        <g fill="#dfe5ff">
          <rect x="60" y="52" width="1.5" height="1.5" opacity="0.7" />
          <rect x="84" y="64" width="1.5" height="1.5" opacity="0.5" />
          <rect x="70" y="100" width="1.5" height="1.5" opacity="0.6" />
          <rect x="136" y="104" width="1.5" height="1.5" opacity="0.5" />
          <rect x="112" y="50" width="1.5" height="1.5" opacity="0.6" />
        </g>
        {myLightInSky && (
          <g data-testid="room-window-light">
            <circle cx="126" cy="64" r="11" fill="url(#room-my-light)" />
            <circle cx="126" cy="64" r="2.6" fill="#fff6df" />
          </g>
        )}
        <path d="M99 40v90M48 85h102" stroke="#3d3a4a" strokeWidth="4" />
        <rect x="32" y="136" width="134" height="8" rx="3" fill="#2f2c3b" />

        {/* 책상 */}
        <rect x="194" y="150" width="108" height="8" rx="3" fill="#d9b98f" />
        <rect x="204" y="158" width="6" height="34" rx="2" fill="#c7a47a" />
        <rect x="286" y="158" width="6" height="34" rx="2" fill="#c7a47a" />

        {/* 스탠드 이 꺼지면 방이 살짝 어두워진다 */}
        <rect width="320" height="220" fill="#2a2740" style={{ opacity: lampOn ? 0 : 0.2, transition: 'opacity 0.6s ease' }} pointerEvents="none" />

        {/* 장난감: 화분 */}
        <g {...toyProps('plant')} data-testid="toy-plant">
          <rect x="128" y="104" width="32" height="34" fill="transparent" />
          <rect className="focus-ring opacity-0" x="128" y="104" width="32" height="34" rx="6" fill="none" stroke="#3d3a4a" strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M137 136h14l-2-10h-10z" fill="#c98b5a" />
          <g key={playing('plant')} className={`toy ${playing('plant') ? 'animate-plant' : ''}`}>
            <path d="M144 126c-1-7 2-11 6-12M144 126c0-5-4-8-8-8" stroke="#7fae7a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* 장난감: 스탠드 */}
        <g {...toyProps('lamp')} data-testid="toy-lamp">
          <rect x="212" y="86" width="48" height="68" fill="transparent" />
          <rect className="focus-ring opacity-0" x="212" y="86" width="48" height="68" rx="6" fill="none" stroke="#3d3a4a" strokeWidth="1.5" strokeDasharray="3 2" />
          <ellipse cx="236" cy="149" rx="13" ry="3" fill="#3d3a4a" />
          <path d="M236 149v-34" stroke="#3d3a4a" strokeWidth="3" strokeLinecap="round" />
          <path d="M219 114h34l-7-22h-20z" fill={lampOn ? '#ffe3a3' : '#e3d9c8'} style={{ transition: 'fill 0.4s ease' }} />
          {lampOn && <circle cx="236" cy="116" r="4" fill="#fff6df" />}
        </g>

        {/* 장난감: 머그컵 */}
        <g {...toyProps('mug')} data-testid="toy-mug">
          <rect x="258" y="112" width="30" height="40" fill="transparent" />
          <rect className="focus-ring opacity-0" x="258" y="112" width="30" height="40" rx="6" fill="none" stroke="#3d3a4a" strokeWidth="1.5" strokeDasharray="3 2" />
          <rect x="264" y="134" width="15" height="16" rx="3" fill="#fbf8f2" stroke="#6a6577" strokeWidth="1.5" />
          <path d="M279 138c5 0 5 8 0 8" stroke="#6a6577" strokeWidth="1.5" fill="none" />
          <g key={playing('mug')} className={`toy ${playing('mug') ? 'animate-steam' : ''}`} opacity="0.45">
            <path d="M268 129c-2-3 2-4 0-7M274 129c-2-3 2-4 0-7" stroke="#6a6577" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* 장난감: 바닥에 굴러다니는 양말 한 짝 — 약간 하찮은 귀여움 */}
        <g {...toyProps('sock')} data-testid="toy-sock">
          <rect x="48" y="174" width="40" height="36" fill="transparent" />
          <rect className="focus-ring opacity-0" x="48" y="174" width="40" height="36" rx="6" fill="none" stroke="#3d3a4a" strokeWidth="1.5" strokeDasharray="3 2" />
          <g key={playing('sock')} className={`toy ${playing('sock') ? 'animate-sock' : ''}`}>
            <path d="M58 196c0-6 2-10 2-14h8c0 5-1 8 1 11 2 3 9 3 9 7 0 3-4 4-10 4h-5c-3 0-5-2-5-8z" fill="#a9b2d6" />
            <path d="M60 186h8" stroke="#8e98c4" strokeWidth="2" />
          </g>
        </g>
      </g>
    </svg>
  )
}
