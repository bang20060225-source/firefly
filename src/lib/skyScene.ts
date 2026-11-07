// 하늘 장면 계산: 시간대, 오늘의 실제 달 모양, 마을 창문 배정.
// 모두 이 기기 안에서만 계산한다. (위치·개인정보를 쓰지 않는다)

import type { SharedLight } from '../types'

/** 하루의 때. 사용자의 기기 시각 기준 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

export function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

/** 빈 하늘 문구에 쓰는 때의 이름 */
export const PHASE_WORD: Record<DayPhase, string> = {
  dawn: '새벽',
  day: '낮',
  dusk: '저녁',
  night: '밤',
}

// ── 달 ────────────────────────────────────────────────

const SYNODIC_MONTH_DAYS = 29.530588853
/** 기준이 되는 삭(새 달): 2000-01-06 18:14 UTC */
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)

/** 달의 위상 (0 = 삭, 0.5 = 보름, 1에 가까울수록 다시 삭) */
export function moonPhase(date: Date): number {
  const days = (date.getTime() - KNOWN_NEW_MOON_MS) / 86_400_000
  const phase = (days / SYNODIC_MONTH_DAYS) % 1
  return phase < 0 ? phase + 1 : phase
}

export function moonName(phase: number): string {
  if (phase < 0.03 || phase >= 0.97) return '달이 쉬는 밤'
  if (phase < 0.22) return '초승달'
  if (phase < 0.28) return '상현달'
  if (phase < 0.47) return '차오르는 달'
  if (phase < 0.53) return '보름달'
  if (phase < 0.72) return '기우는 달'
  if (phase < 0.78) return '하현달'
  return '그믐달'
}

/**
 * 달의 밝은 부분을 그리는 SVG 경로 (중심 0,0 / 반지름 r).
 * 북반구에서 보듯 차오를 때는 오른쪽이, 기울 때는 왼쪽이 밝다.
 */
export function moonLitPath(phase: number, r: number): string {
  const waxing = phase < 0.5
  const terminatorRx = Math.abs(Math.cos(2 * Math.PI * phase)) * r
  const outerSweep = waxing ? 1 : 0
  // 초승·그믐(가는 달)이면 경계선이 밝은 쪽으로, 상현~하현(통통한 달)이면 어두운 쪽으로 휜다
  const crescent = phase < 0.25 || phase > 0.75
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0
  const rx = terminatorRx.toFixed(2)
  return `M 0 ${-r} A ${r} ${r} 0 0 ${outerSweep} 0 ${r} A ${rx} ${r} 0 0 ${termSweep} 0 ${-r} Z`
}

// ── 마을 창문 ──────────────────────────────────────────

/** 문자열을 항상 같은 숫자로 바꾼다 (같은 불빛 → 같은 자리) */
export function hashId(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

/**
 * 다른 사람의 불빛 일부를 마을 창문에 배정한다.
 * - 내 불빛은 언제나 하늘로 떠오르는 빛으로 보이므로 배정하지 않는다.
 * - 대략 절반은 창문, 절반은 떠다니는 빛. 창문이 다 차면 나머지는 떠다니는 빛.
 * - 같은 불빛은 다시 그려도 같은 창문에 켜진다.
 * @returns 불빛 id → 창문 번호
 */
export function assignWindows(lights: SharedLight[], myLightId: string | null, slotCount: number): Map<string, number> {
  const result = new Map<string, number>()
  if (slotCount <= 0) return result
  const taken = new Set<number>()
  const ordered = [...lights].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))

  for (const light of ordered) {
    if (light.id === myLightId) continue
    const hash = hashId(light.id)
    if (hash % 2 !== 0) continue
    if (taken.size >= slotCount) break
    let slot = (hash >>> 1) % slotCount
    while (taken.has(slot)) slot = (slot + 1) % slotCount
    taken.add(slot)
    result.set(light.id, slot)
  }
  return result
}
