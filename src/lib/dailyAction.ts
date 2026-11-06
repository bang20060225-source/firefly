// 오늘의 작은 행동 고르기.
// 모든 기록은 이 기기 안에만, 그리고 '오늘 하루치'만 저장한다.
// 지난 날의 기록, 연속 기록, 완료 횟수는 만들지 않는다.

import { DAILY_ACTIONS, type DailyAction } from '../data/dailyActions'

export type ActionStatus = 'open' | 'done' | 'skipped'

/** 기기에 저장되는 오늘의 상태. 날짜가 바뀌면 통째로 버린다. */
export type TodayActionState = {
  date: string
  actionId: string
  status: ActionStatus
}

/** 사용자의 기기 시간 기준 날짜 문자열 (YYYY-MM-DD) */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 날짜 문자열을 숫자로 바꾸는 간단한 해시 (같은 날짜 → 항상 같은 숫자) */
function hashString(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

/** 날짜마다 정해지는 기본 행동. 같은 날에는 언제 열어도 같은 행동이 나온다. */
export function pickActionForDate(dateKey: string, actions: DailyAction[] = DAILY_ACTIONS): DailyAction {
  return actions[hashString(dateKey) % actions.length]
}

/** "다른 걸로" — 지금 행동과 다른 행동 하나를 고른다 */
export function pickAlternative(
  currentId: string,
  random: () => number = Math.random,
  actions: DailyAction[] = DAILY_ACTIONS,
): DailyAction {
  const others = actions.filter((action) => action.id !== currentId)
  if (others.length === 0) return actions[0]
  return others[Math.floor(random() * others.length)]
}

export function findAction(id: string, actions: DailyAction[] = DAILY_ACTIONS): DailyAction | undefined {
  return actions.find((action) => action.id === id)
}

/**
 * 저장된 상태를 오늘 기준으로 정리한다.
 * 날짜가 지난 기록은 이어 붙이지 않고 버린다 → 미완료가 쌓이지 않는다.
 */
export function resolveTodayState(saved: TodayActionState | null, todayKey: string): TodayActionState {
  if (saved && saved.date === todayKey && findAction(saved.actionId)) {
    return saved
  }
  return { date: todayKey, actionId: pickActionForDate(todayKey).id, status: 'open' }
}
