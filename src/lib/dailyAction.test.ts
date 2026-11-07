import { describe, expect, it } from 'vitest'
import { DAILY_ACTIONS } from '../data/dailyActions'
import {
  localDateKey,
  pickActionForDate,
  pickAlternative,
  resolveTodayState,
  type TodayActionState,
} from './dailyAction'

describe('하루 한 개 제안', () => {
  it('같은 날에는 항상 같은 행동이 나온다', () => {
    const a = pickActionForDate('2026-11-06')
    const b = pickActionForDate('2026-11-06')
    expect(a.id).toBe(b.id)
  })

  it('날짜가 바뀌면 다른 행동이 나올 수 있다 (한 달 동안 여러 종류)', () => {
    const ids = new Set<string>()
    for (let day = 1; day <= 30; day++) {
      ids.add(pickActionForDate(`2026-11-${String(day).padStart(2, '0')}`).id)
    }
    expect(ids.size).toBeGreaterThan(3)
  })

  it('기기 시간 기준 날짜 문자열을 만든다', () => {
    expect(localDateKey(new Date(2026, 10, 6, 23, 59))).toBe('2026-11-06')
  })
})

describe('완료와 건너뛰기', () => {
  it('오늘 상태는 그대로 유지된다', () => {
    const saved: TodayActionState = { date: '2026-11-06', actionId: 'water', status: 'done' }
    expect(resolveTodayState(saved, '2026-11-06')).toEqual(saved)
  })

  it('건너뛴 상태도 그대로 유지된다', () => {
    const saved: TodayActionState = { date: '2026-11-06', actionId: 'water', status: 'skipped' }
    expect(resolveTodayState(saved, '2026-11-06').status).toBe('skipped')
  })

  it('"다른 걸로"는 지금과 다른 행동을 고른다', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(pickAlternative('water', () => r).id === 'water').toBe(false)
    }
  })
})

describe('누적·연속 기록 없음', () => {
  it('어제 안 한 행동은 오늘로 넘어오지 않는다', () => {
    const yesterday: TodayActionState = { date: '2026-11-05', actionId: 'water', status: 'open' }
    const today = resolveTodayState(yesterday, '2026-11-06')
    expect(today.date).toBe('2026-11-06')
    expect(today.status).toBe('open')
    expect(today.actionId).toBe(pickActionForDate('2026-11-06').id)
  })

  it('저장되는 정보에는 날짜·행동·상태만 있고 횟수나 연속 기록이 없다', () => {
    const state = resolveTodayState(null, '2026-11-06')
    expect(Object.keys(state).sort()).toEqual(['actionId', 'date', 'status'])
  })

  it('목록에 없는 행동 id가 저장돼 있으면 오늘의 기본 행동으로 돌아간다', () => {
    const broken: TodayActionState = { date: '2026-11-06', actionId: 'unknown', status: 'done' }
    expect(resolveTodayState(broken, '2026-11-06').status).toBe('open')
  })
})

describe('자리에서 할 수 있는 것만', () => {
  const nearby = DAILY_ACTIONS.filter((a) => a.lowMobility)

  it('범위를 좁히면 범위 안의 행동만 나온다', () => {
    for (let day = 1; day <= 30; day++) {
      const state = resolveTodayState(null, `2026-11-${String(day).padStart(2, '0')}`, nearby)
      expect(nearby.some((a) => a.id === state.actionId)).toBe(true)
    }
  })

  it('아직 안 한 행동이 범위 밖이면 범위 안의 행동으로 바뀐다', () => {
    const saved: TodayActionState = { date: '2026-11-06', actionId: 'window', status: 'open' }
    const next = resolveTodayState(saved, '2026-11-06', nearby)
    expect(nearby.some((a) => a.id === next.actionId)).toBe(true)
    expect(next.status).toBe('open')
  })

  it('이미 한 행동은 범위를 바꿔도 그대로 둔다', () => {
    const saved: TodayActionState = { date: '2026-11-06', actionId: 'window', status: 'done' }
    expect(resolveTodayState(saved, '2026-11-06', nearby)).toEqual(saved)
  })

  it('"다른 걸로"도 범위 안에서만 고른다', () => {
    for (const r of [0, 0.4, 0.99]) {
      expect(nearby.some((a) => a.id === pickAlternative('water', () => r, nearby).id)).toBe(true)
    }
  })
})

describe('행동 문구', () => {
  it('건강이나 치료 효과를 약속하는 단어가 없다', () => {
    const banned = ['치료', '효과', '낫', '회복', '우울', '진단', '건강해']
    for (const action of DAILY_ACTIONS) {
      for (const word of banned) {
        expect(`${action.title} ${action.note}`.includes(word)).toBe(false)
      }
    }
  })

  it('몸을 크게 움직이지 않아도 되는 행동이 충분히 있다', () => {
    expect(DAILY_ACTIONS.filter((a) => a.lowMobility).length).toBeGreaterThan(4)
  })
})
