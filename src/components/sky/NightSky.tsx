// 공동 밤하늘의 배경.
// 여기 있는 별과 집은 모두 '장식'이다. 실제 사용자 불빛(SkyLights)과 색·모양을 다르게 해서 구분한다.
//  · 장식 별: 아주 작고 차가운 흰색 점, 움직이지 않음
//  · 장식 창문: 어두운 남색, 불이 켜져 있지 않음
//  · 사용자 불빛: 따뜻한 호박색의 둥근 빛
import type { ReactNode } from 'react'

function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

const random = seeded(20261106)
const STARS = Array.from({ length: 46 }, () => ({
  x: random() * 100,
  y: random() * 62,
  size: random() > 0.85 ? 2 : 1,
  opacity: 0.25 + random() * 0.35,
}))

export function NightSky({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(180deg,#151b33_0%,#1e2645_45%,#2c3765_80%,#3a4377_100%)] ${className}`}
    >
      {/* 장식 별 */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {STARS.map((star, i) => (
          <rect
            key={i}
            x={`${star.x}%`}
            y={`${star.y}%`}
            width={star.size}
            height={star.size}
            fill="#dfe5ff"
            opacity={star.opacity}
          />
        ))}
      </svg>

      {/* 장식: 멀리 있는 언덕과 작은 집들 (불이 꺼진 창문) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 120"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] w-full"
      >
        <path d="M0 70 Q60 52 120 66 T240 60 T400 64 V120 H0Z" fill="#232b4f" />
        <path d="M0 92 Q80 76 170 88 T400 84 V120 H0Z" fill="#1a2140" />
        <g fill="#141a33">
          <path d="M44 96 l14-12 14 12 v22 h-28z" />
          <path d="M250 92 l16-13 16 13 v26 h-32z" />
          <path d="M330 98 l11-9 11 9 v20 h-22z" />
        </g>
        <g fill="#2b3460">
          <rect x="53" y="100" width="7" height="7" rx="1" />
          <rect x="261" y="98" width="8" height="8" rx="1" />
          <rect x="338" y="103" width="6" height="6" rx="1" />
        </g>
      </svg>

      {children}
    </div>
  )
}
