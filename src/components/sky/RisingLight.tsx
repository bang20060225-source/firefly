// 불빛 하나 보태기 연출: 내 창문에서 작은 빛이 떠올라 밤하늘의 자리로 날아간다.
// '나의 창문'과 '공동의 밤하늘'이 이어져 있다는 걸 한 번에 보여주는 장면.
// 움직임 줄이기가 켜져 있으면 이 연출은 쓰지 않는다. (Home 에서 처리)
import { useEffect, useRef } from 'react'

type Point = { x: number; y: number }

export function RisingLight({ from, to, onDone }: { from: Point; to: Point; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const element = ref.current
    if (!element || typeof element.animate !== 'function') {
      doneRef.current()
      return
    }
    // 곧게 가지 않고 살짝 둥글게 떠오르도록 중간 지점을 위로 올린다
    const mid = { x: (from.x + to.x) / 2 - 12, y: Math.min(from.y, to.y) - 36 }
    const at = (p: Point, scale: number) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${scale})`
    const animation = element.animate(
      [
        { transform: at(from, 0.4), opacity: 0 },
        { transform: at(from, 0.7), opacity: 1, offset: 0.12 },
        { transform: at(mid, 1.1), opacity: 1, offset: 0.6 },
        { transform: at(to, 1), opacity: 1 },
      ],
      { duration: 1800, easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)', fill: 'forwards' },
    )
    animation.onfinish = () => doneRef.current()
    return () => animation.cancel()
  }, [from, to])

  return (
    <span ref={ref} aria-hidden="true" data-testid="rising-light" className="pointer-events-none absolute left-0 top-0 z-10 block">
      <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,210,122,0.55)_0%,rgba(255,210,122,0)_70%)]" />
      <span className="relative block h-3 w-3 rounded-full bg-glow-100 shadow-[0_0_14px_4px_rgba(255,200,97,0.8)]" />
    </span>
  )
}
