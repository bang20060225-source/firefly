// 나의 작은 창문. 이 불빛은 나에게만 보인다. (온라인 표시가 아니다)

export function MyWindow({ size = 'small', lit = true }: { size?: 'small' | 'large'; lit?: boolean }) {
  const large = size === 'large'
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 96"
      className={large ? 'h-56 w-auto' : 'h-16 w-auto'}
    >
      <defs>
        <radialGradient id={`window-glow-${size}`} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#fff2cc" />
          <stop offset="60%" stopColor="#ffd27a" />
          <stop offset="100%" stopColor="#f3a94c" />
        </radialGradient>
      </defs>
      {/* 창틀 */}
      <rect x="4" y="4" width="72" height="84" rx="10" fill="#3d3a4a" />
      {/* 밤 (불 꺼진 상태) */}
      <rect x="10" y="10" width="60" height="72" rx="6" fill="#283158" />
      {/* 켜지는 불빛 */}
      {lit && (
        <rect
          className="animate-window-on"
          x="10"
          y="10"
          width="60"
          height="72"
          rx="6"
          fill={`url(#window-glow-${size})`}
        />
      )}
      {/* 창살 */}
      <path d="M40 10v72M10 46h60" stroke="#3d3a4a" strokeWidth="4" />
      {/* 창턱 */}
      <rect x="0" y="86" width="80" height="8" rx="3" fill="#2f2c3b" />
      {/* 창가의 작은 화분 — 약간 하찮은 귀여움 */}
      <path d="M58 86 h12 l-2 -8 h-8 z" fill="#c98b5a" />
      <path d="M64 78 c-1-5 1-8 4-9 M64 78 c0-4-3-6-6-6" stroke="#7fae7a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
