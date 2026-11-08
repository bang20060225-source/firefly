// 불빛 시스템의 규칙. 서버(SQL)와 같은 숫자를 쓴다.
// 이 값을 바꾸면 supabase/migrations 의 같은 값도 함께 바꿔야 한다.

import type { SharedLight } from '../types'

const MINUTE = 60 * 1000

/** 불빛이 공동 밤하늘에 머무는 시간 (120분) */
export const LIGHT_DURATION_MS = 120 * MINUTE
/** 사라지기 전 서서히 흐려지는 시간 (마지막 15분) */
export const LIGHT_FADE_MS = 15 * MINUTE
/**
 * 새 불빛 도배 방지: 10분 동안 새 불빛은 10번까지.
 * 기다리는 시간은 없어서, 불빛을 거두고 바로 다시 보탤 수 있다. 껐다 켰다를 아주 여러 번 할 때만 잠시 쉰다.
 */
export const LIGHT_PUBLISH_LIMIT = 10
export const LIGHT_PUBLISH_WINDOW_MS = 10 * MINUTE

/** 새 불빛을 센 기록 (이력이 아니라 '언제부터 몇 번'만 남긴다) */
export type PublishWindow = { start: number | null; count: number }

/** 새 불빛을 하나 더 보탤 수 있으면 보탠 뒤의 기록을, 아니면 null 을 돌려준다. 서버 publish_light 와 같은 규칙이다 */
export function takePublishSlot(current: PublishWindow, nowMs: number): PublishWindow | null {
  // 처음이거나 10분이 지났으면 새로 센다
  if (current.start === null || nowMs - current.start >= LIGHT_PUBLISH_WINDOW_MS) return { start: nowMs, count: 1 }
  if (current.count >= LIGHT_PUBLISH_LIMIT) return null
  return { start: current.start, count: current.count + 1 }
}

/** 온기 퍼뜨리기 요청 간격 (30초) */
export const AMBIENT_COOLDOWN_MS = 30 * 1000
/** 온기 파동 애니메이션 길이 (약 5초) */
export const AMBIENT_WAVE_DURATION_MS = 5000

/** 흐려지는 마지막 순간에도 이 밝기 아래로는 내려가지 않다가, 만료되면 사라진다 */
const MIN_FADE_OPACITY = 0.15

/** 남은 시간(ms). 이미 지났으면 0 */
export function remainingMs(expiresAt: string, nowMs: number): number {
  return Math.max(0, Date.parse(expiresAt) - nowMs)
}

export function isExpired(expiresAt: string, nowMs: number): boolean {
  return remainingMs(expiresAt, nowMs) <= 0
}

/**
 * 불빛의 밝기 (0~1).
 * - 남은 시간이 15분보다 많으면 1
 * - 마지막 15분 동안 점점 흐려짐
 * - 만료되면 0
 */
export function lightOpacity(expiresAt: string, nowMs: number): number {
  const left = remainingMs(expiresAt, nowMs)
  if (left <= 0) return 0
  if (left >= LIGHT_FADE_MS) return 1
  const ratio = left / LIGHT_FADE_MS
  return MIN_FADE_OPACITY + (1 - MIN_FADE_OPACITY) * ratio
}

/** 만료되지 않은 불빛만 남긴다 */
export function activeLights(lights: SharedLight[], nowMs: number): SharedLight[] {
  return lights.filter((light) => !isExpired(light.expiresAt, nowMs))
}

/**
 * "약 1시간 40분" 같은 부드러운 남은 시간 문구.
 * 초 단위 카운트다운은 재촉하는 느낌을 주므로 쓰지 않는다.
 */
export function describeRemaining(ms: number): string {
  if (ms <= 0) return '곧 사라져요'
  const totalMinutes = Math.ceil(ms / MINUTE)
  if (totalMinutes < 5) return '곧 사라져요'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `약 ${minutes}분 뒤 사라져요`
  if (minutes === 0) return `약 ${hours}시간 뒤 사라져요`
  return `약 ${hours}시간 ${minutes}분 뒤 사라져요`
}

/**
 * 화면에 놓을 무작위 위치 (0~1).
 * 실제 지리적 위치와는 아무 관계가 없다.
 * 글자나 버튼과 겹치지 않도록 가장자리는 조금 비워 둔다.
 */
export function randomSkyPosition(random: () => number = Math.random): { x: number; y: number } {
  return {
    x: 0.08 + random() * 0.84,
    y: 0.1 + random() * 0.6,
  }
}

/** 다음 요청까지 남은 대기 시간(ms). 0이면 바로 가능 */
export function cooldownLeftMs(lastAtMs: number | null, cooldownMs: number, nowMs: number): number {
  if (lastAtMs === null) return 0
  return Math.max(0, lastAtMs + cooldownMs - nowMs)
}
