// ⚠️ DEMO 모드 전용 '예시 하늘'.
// 실제 사람의 불빛이 아니며, 화면에 항상 "예시 화면" 표시와 함께만 보여준다.
// 서버가 연결된 실제 서비스(Supabase 모드)에서는 절대 쓰지 않는다. (Home 에서 config.demoMode 로 막음)

import type { SharedLight } from '../types'

const SAMPLES: { id: string; x: number; y: number; minutesLeft: number }[] = [
  { id: 'example-a', x: 0.22, y: 0.18, minutesLeft: 110 },
  { id: 'example-b', x: 0.68, y: 0.12, minutesLeft: 95 },
  { id: 'example-c', x: 0.45, y: 0.32, minutesLeft: 70 },
  { id: 'example-d', x: 0.84, y: 0.36, minutesLeft: 40 },
  { id: 'example-e', x: 0.14, y: 0.42, minutesLeft: 9 },
  { id: 'example-f', x: 0.58, y: 0.5, minutesLeft: 118 },
  { id: 'example-g', x: 0.33, y: 0.6, minutesLeft: 64 },
  { id: 'example-h', x: 0.76, y: 0.58, minutesLeft: 25 },
  { id: 'example-i', x: 0.5, y: 0.2, minutesLeft: 88 },
  { id: 'example-j', x: 0.9, y: 0.2, minutesLeft: 52 },
  { id: 'example-k', x: 0.1, y: 0.25, minutesLeft: 101 },
  { id: 'example-l', x: 0.62, y: 0.28, minutesLeft: 13 },
]

export function exampleLights(nowMs: number): SharedLight[] {
  return SAMPLES.map((sample) => {
    const expires = nowMs + sample.minutesLeft * 60_000
    return {
      id: sample.id,
      x: sample.x,
      y: sample.y,
      createdAt: new Date(expires - 120 * 60_000).toISOString(),
      expiresAt: new Date(expires).toISOString(),
    }
  })
}
