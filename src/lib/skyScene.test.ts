import { describe, expect, it } from 'vitest'
import type { SharedLight } from '../types'
import { assignWindows, dayPhase, moonLitPath, moonName, moonPhase } from './skyScene'

describe('하루의 때', () => {
  it('시각에 따라 새벽·낮·저녁·밤으로 나뉜다', () => {
    expect(dayPhase(4)).toBe('night')
    expect(dayPhase(5)).toBe('dawn')
    expect(dayPhase(7)).toBe('dawn')
    expect(dayPhase(8)).toBe('day')
    expect(dayPhase(16)).toBe('day')
    expect(dayPhase(17)).toBe('dusk')
    expect(dayPhase(19)).toBe('dusk')
    expect(dayPhase(20)).toBe('night')
    expect(dayPhase(0)).toBe('night')
  })
})

describe('오늘의 달', () => {
  // 실제 천문 기록: 2024-01-11 11:57 UTC 삭, 2024-01-25 17:54 UTC 보름
  it('실제 삭 날짜에는 위상이 0(또는 1) 근처다', () => {
    const p = moonPhase(new Date(Date.UTC(2024, 0, 11, 11, 57)))
    expect(Math.min(p, 1 - p)).toBeLessThan(0.02)
  })

  it('실제 보름 날짜에는 위상이 0.5 근처다', () => {
    const p = moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54)))
    expect(Math.abs(p - 0.5)).toBeLessThan(0.02)
  })

  it('위상에 맞는 이름을 붙인다', () => {
    expect(moonName(0.01)).toBe('달이 쉬는 밤')
    expect(moonName(0.1)).toBe('초승달')
    expect(moonName(0.25)).toBe('상현달')
    expect(moonName(0.5)).toBe('보름달')
    expect(moonName(0.75)).toBe('하현달')
    expect(moonName(0.9)).toBe('그믐달')
  })

  it('달 모양 경로는 위아래 끝점을 잇는 닫힌 도형이다', () => {
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const d = moonLitPath(p, 10)
      expect(d.startsWith('M 0 -10')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
    }
  })
})

describe('마을 창문 배정', () => {
  const make = (n: number): SharedLight[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `light-${i}`,
      x: 0.5,
      y: 0.5,
      createdAt: new Date(Date.UTC(2026, 10, 7, 12, 0, i)).toISOString(),
      expiresAt: new Date(Date.UTC(2026, 10, 7, 14, 0, i)).toISOString(),
    }))

  it('내 불빛은 창문에 배정하지 않는다', () => {
    const lights = make(40)
    for (const light of lights) {
      expect(assignWindows(lights, light.id, 25).has(light.id)).toBe(false)
    }
  })

  it('한 창문에는 한 불빛만 켜진다', () => {
    const slots = [...assignWindows(make(60), null, 25).values()]
    expect(new Set(slots).size).toBe(slots.length)
    expect(slots.every((s) => s >= 0 && s < 25)).toBe(true)
  })

  it('창문이 다 차면 나머지는 떠다니는 빛이 된다', () => {
    expect(assignWindows(make(200), null, 5).size).toBe(5)
  })

  it('일부는 창문, 일부는 떠다니는 빛으로 섞인다', () => {
    const size = assignWindows(make(40), null, 100).size
    expect(size).toBeGreaterThan(5)
    expect(size).toBeLessThan(35)
  })

  it('같은 불빛은 다시 계산해도 같은 창문에 켜진다', () => {
    const lights = make(30)
    expect([...assignWindows(lights, null, 25)]).toEqual([...assignWindows([...lights].reverse(), null, 25)])
  })
})
