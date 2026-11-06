import { describe, expect, it } from 'vitest'
import {
  activeLights,
  cooldownLeftMs,
  describeRemaining,
  isExpired,
  LIGHT_DURATION_MS,
  LIGHT_FADE_MS,
  lightOpacity,
  randomSkyPosition,
} from './lightRules'
import type { SharedLight } from '../types'

const MIN = 60 * 1000
const created = Date.parse('2026-11-06T12:00:00Z')
const expiresAt = new Date(created + LIGHT_DURATION_MS).toISOString()

describe('불빛 유지 시간', () => {
  it('유지 시간은 120분이다', () => {
    expect(LIGHT_DURATION_MS).toBe(120 * MIN)
  })

  it('119분 59초에는 아직 남아 있고, 120분이 되면 만료된다', () => {
    expect(isExpired(expiresAt, created + 120 * MIN - 1000)).toBe(false)
    expect(isExpired(expiresAt, created + 120 * MIN)).toBe(true)
  })

  it('만료된 불빛은 목록에서 빠진다', () => {
    const lights: SharedLight[] = [
      { id: 'a', x: 0.5, y: 0.5, createdAt: '', expiresAt },
      { id: 'b', x: 0.5, y: 0.5, createdAt: '', expiresAt: new Date(created - 1).toISOString() },
    ]
    const result = activeLights(lights, created + 10 * MIN)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})

describe('마지막 15분 페이드', () => {
  it('페이드 시간은 15분이다', () => {
    expect(LIGHT_FADE_MS).toBe(15 * MIN)
  })

  it('처음부터 105분까지는 완전히 밝다', () => {
    expect(lightOpacity(expiresAt, created)).toBe(1)
    expect(lightOpacity(expiresAt, created + 60 * MIN)).toBe(1)
    expect(lightOpacity(expiresAt, created + 105 * MIN)).toBe(1)
  })

  it('마지막 15분 동안 점점 흐려진다', () => {
    const at110 = lightOpacity(expiresAt, created + 110 * MIN)
    const at115 = lightOpacity(expiresAt, created + 115 * MIN)
    const at119 = lightOpacity(expiresAt, created + 119 * MIN)
    expect(at110).toBeLessThan(1)
    expect(at115).toBeLessThan(at110)
    expect(at119).toBeLessThan(at115)
    expect(at119).toBeGreaterThan(0)
  })

  it('만료되면 밝기는 0이다', () => {
    expect(lightOpacity(expiresAt, created + 120 * MIN)).toBe(0)
    expect(lightOpacity(expiresAt, created + 200 * MIN)).toBe(0)
  })
})

describe('남은 시간 문구', () => {
  it('부드러운 표현을 쓴다', () => {
    expect(describeRemaining(120 * MIN)).toBe('약 2시간 뒤 사라져요')
    expect(describeRemaining(100 * MIN)).toBe('약 1시간 40분 뒤 사라져요')
    expect(describeRemaining(30 * MIN)).toBe('약 30분 뒤 사라져요')
    expect(describeRemaining(2 * MIN)).toBe('곧 사라져요')
    expect(describeRemaining(0)).toBe('곧 사라져요')
  })
})

describe('무작위 위치', () => {
  it('항상 화면 안쪽(0~1)에 놓인다', () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      const pos = randomSkyPosition(() => r)
      expect(pos.x).toBeGreaterThan(0)
      expect(pos.x).toBeLessThan(1)
      expect(pos.y).toBeGreaterThan(0)
      expect(pos.y).toBeLessThan(1)
    }
  })
})

describe('요청 간격', () => {
  it('처음에는 바로 가능하다', () => {
    expect(cooldownLeftMs(null, 30_000, created)).toBe(0)
  })

  it('30초 안에는 기다려야 하고, 30초가 지나면 가능하다', () => {
    expect(cooldownLeftMs(created, 30_000, created + 10_000)).toBe(20_000)
    expect(cooldownLeftMs(created, 30_000, created + 30_000)).toBe(0)
  })
})
