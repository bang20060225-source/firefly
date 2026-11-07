// 창문 마을 — 공동 밤하늘 아래의 작은 동네.
// 꺼진 창문은 장식이고, 불이 켜진 창문은 누군가 남긴 실제 불빛이다.
// (누구의 창문인지는 알 수 없고, 창문 위치도 실제 위치와 아무 관계가 없다)

type WindowSlot = { x: number; y: number; w: number; h: number }

/** 마을의 창문 자리. 순서가 창문 번호다 */
export const VILLAGE_WINDOWS: WindowSlot[] = [
  // 집 A
  { x: 15, y: 72, w: 8, h: 8 },
  { x: 31, y: 72, w: 8, h: 8 },
  // 낮은 아파트 B (3 × 3)
  ...[40, 56, 72].flatMap((y) => [60, 73, 86].map((x) => ({ x, y, w: 8, h: 8 }))),
  // 집 C
  { x: 113, y: 72, w: 8, h: 8 },
  { x: 127, y: 72, w: 8, h: 8 },
  // 좁은 건물 D (2 × 4)
  ...[30, 44, 58, 72].flatMap((y) => [154, 168].map((x) => ({ x, y, w: 8, h: 8 }))),
  // 집 E
  { x: 196, y: 76, w: 8, h: 8 },
  { x: 212, y: 76, w: 8, h: 8 },
  // 작은 건물 F
  { x: 236, y: 66, w: 7, h: 8 },
  { x: 248, y: 66, w: 7, h: 8 },
]

export function Village({ lit, color = '#141a33' }: { lit: Map<number, number>; color?: string }) {
  return (
    <svg
      viewBox="0 0 260 100"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
      data-testid="village"
      className="pointer-events-none block h-auto w-full"
    >
      <defs>
        <filter id="village-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* 건물 실루엣 */}
      <g fill={color}>
        <path d="M8 100V62l20-16 20 16v38z" />
        <path d="M54 100V30h46v70z" />
        <rect x="52" y="27" width="50" height="4" rx="1" />
        <path d="M106 100V62l18-14 18 14v38z" />
        <path d="M148 100V22h34v78z" />
        <path d="M188 100V66l20-15 20 15v34z" />
        <path d="M232 100V56h26v44z" />
        {/* 지붕 위 작은 안테나 — 하찮은 디테일 */}
        <path d="M165 22v-8M162 16h6" stroke={color} strokeWidth="1.5" />
      </g>

      {/* 창문: 꺼진 창문(장식) / 불 켜진 창문(실제 불빛) */}
      {VILLAGE_WINDOWS.map((slot, index) => {
        const opacity = lit.get(index)
        if (opacity === undefined) {
          return <rect key={index} data-testid="dark-window" x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="1" fill="#2b3460" />
        }
        return (
          <g key={index} data-testid="lit-window" className="animate-window-on" opacity={opacity}>
            <rect
              x={slot.x - 3}
              y={slot.y - 3}
              width={slot.w + 6}
              height={slot.h + 6}
              rx="3"
              fill="#ffc861"
              opacity="0.55"
              filter="url(#village-glow)"
            />
            <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="1" fill="#ffd27a" />
            <path d={`M${slot.x + slot.w / 2} ${slot.y}v${slot.h}`} stroke="#d99a4a" strokeWidth="0.8" opacity="0.6" />
          </g>
        )
      })}
    </svg>
  )
}
