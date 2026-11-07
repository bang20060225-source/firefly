// 공동 밤하늘의 배경.
// 여기 있는 별과 집은 모두 '장식'이다. 실제 사용자 불빛과 색·모양을 다르게 해서 구분한다.
//  · 장식 별: 아주 작고 차가운 흰색 점, 움직이지 않음
//  · 장식 창문: 어두운 남색, 불이 켜져 있지 않음
//  · 사용자 불빛: 따뜻한 호박색 (떠다니는 빛 또는 불 켜진 창문)
// 하늘색은 기기 시각에 따라 새벽·낮·저녁·밤으로 은은하게 바뀐다.
import type { ReactNode } from 'react'
import { useDayPhase } from '../../app/useDayPhase'
import type { DayPhase } from '../../lib/skyScene'

const SKY: Record<DayPhase, { gradient: string; stars: number; hillFar: string; hillNear: string; house: string }> = {
  night: {
    gradient: 'linear-gradient(180deg,#151b33 0%,#1e2645 45%,#2c3765 80%,#3a4377 100%)',
    stars: 1,
    hillFar: '#232b4f',
    hillNear: '#1a2140',
    house: '#141a33',
  },
  dawn: {
    gradient: 'linear-gradient(180deg,#1b2147 0%,#3a3f78 45%,#7a6a9e 78%,#d9a1a0 100%)',
    stars: 0.5,
    hillFar: '#2d2c5a',
    hillNear: '#211f47',
    house: '#1a1938',
  },
  day: {
    gradient: 'linear-gradient(180deg,#26386a 0%,#3d5590 45%,#6a85bd 80%,#9db3dc 100%)',
    stars: 0.2,
    hillFar: '#33467a',
    hillNear: '#26365f',
    house: '#1f2c50',
  },
  dusk: {
    gradient: 'linear-gradient(180deg,#1a1f44 0%,#3d3670 45%,#8a5a7e 78%,#e09a76 100%)',
    stars: 0.5,
    hillFar: '#30285a',
    hillNear: '#231d46',
    house: '#1b1638',
  },
}

/** 지금 하늘에 어울리는 건물 실루엣 색 (창문 마을용) */
export function skyHouseColor(phase: DayPhase): string {
  return SKY[phase].house
}

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

export function NightSky({
  children,
  className = '',
  houses = true,
}: {
  children?: ReactNode
  className?: string
  /** 장식용 작은 집 3채. 홈에서는 대신 창문 마을(Village)을 그린다 */
  houses?: boolean
}) {
  const phase = useDayPhase()
  const sky = SKY[phase]
  return (
    <div
      data-sky-phase={phase}
      className={`relative overflow-hidden transition-[background] duration-1000 ${className}`}
      style={{ background: sky.gradient }}
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
            opacity={star.opacity * sky.stars}
          />
        ))}
      </svg>

      {/* 장식: 멀리 있는 언덕 (집은 선택) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 120"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] w-full"
      >
        <path d="M0 70 Q60 52 120 66 T240 60 T400 64 V120 H0Z" fill={sky.hillFar} />
        <path d="M0 92 Q80 76 170 88 T400 84 V120 H0Z" fill={sky.hillNear} />
        {houses && (
          <>
            <g fill={sky.house}>
              <path d="M44 96 l14-12 14 12 v22 h-28z" />
              <path d="M250 92 l16-13 16 13 v26 h-32z" />
              <path d="M330 98 l11-9 11 9 v20 h-22z" />
            </g>
            <g fill="#2b3460">
              <rect x="53" y="100" width="7" height="7" rx="1" />
              <rect x="261" y="98" width="8" height="8" rx="1" />
              <rect x="338" y="103" width="6" height="6" rx="1" />
            </g>
          </>
        )}
      </svg>

      {children}
    </div>
  )
}
