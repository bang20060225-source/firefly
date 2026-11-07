// 나의 방 장면 — 방 안에서 바라본 작은 방.
// 들어오면 스탠드 불빛이 은은하게 켜진다. (나에게만 보이는 불빛)
// 내 불빛이 공동 밤하늘에 떠 있으면 창밖에도 작게 보인다.

export function RoomScene({ myLightInSky }: { myLightInSky: boolean }) {
  return (
    <svg viewBox="0 0 320 220" className="block h-auto w-full" aria-hidden="true">
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
        <circle className="animate-window-on" cx="236" cy="116" r="150" fill="url(#room-lamp-glow)" />

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

        {/* 창가 화분 */}
        <path d="M137 136h14l-2-10h-10z" fill="#c98b5a" />
        <path d="M144 126c-1-7 2-11 6-12M144 126c0-5-4-8-8-8" stroke="#7fae7a" strokeWidth="2.2" fill="none" strokeLinecap="round" />

        {/* 책상과 스탠드, 머그컵 */}
        <rect x="194" y="150" width="108" height="8" rx="3" fill="#d9b98f" />
        <rect x="204" y="158" width="6" height="34" rx="2" fill="#c7a47a" />
        <rect x="286" y="158" width="6" height="34" rx="2" fill="#c7a47a" />
        <ellipse cx="236" cy="149" rx="13" ry="3" fill="#3d3a4a" />
        <path d="M236 149v-34" stroke="#3d3a4a" strokeWidth="3" strokeLinecap="round" />
        <path d="M219 114h34l-7-22h-20z" fill="#ffe3a3" />
        <circle cx="236" cy="116" r="4" fill="#fff6df" />
        <rect x="264" y="134" width="15" height="16" rx="3" fill="#fbf8f2" stroke="#6a6577" strokeWidth="1.5" />
        <path d="M279 138c5 0 5 8 0 8" stroke="#6a6577" strokeWidth="1.5" fill="none" />
        <path d="M268 129c-2-3 2-4 0-7M274 129c-2-3 2-4 0-7" stroke="#6a6577" strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round" />

        {/* 바닥에 굴러다니는 양말 한 짝 — 약간 하찮은 귀여움 */}
        <path d="M58 196c0-6 2-10 2-14h8c0 5-1 8 1 11 2 3 9 3 9 7 0 3-4 4-10 4h-5c-3 0-5-2-5-8z" fill="#a9b2d6" />
        <path d="M60 186h8" stroke="#8e98c4" strokeWidth="2" />
      </g>
    </svg>
  )
}
