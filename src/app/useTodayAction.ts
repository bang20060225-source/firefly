// 오늘의 작은 행동 상태. 이 기기에만, 오늘 하루치만 저장한다. 서버로 보내지 않는다.
import { useCallback, useEffect, useState } from 'react'
import { findAction, localDateKey, pickAlternative, resolveTodayState, type TodayActionState } from '../lib/dailyAction'
import { readJson, writeJson } from '../lib/storage'
import type { DailyAction } from '../data/dailyActions'

const KEY = 'today-action'

function loadToday(): TodayActionState {
  return resolveTodayState(readJson<TodayActionState>(KEY), localDateKey(new Date()))
}

export function useTodayAction() {
  const [state, setState] = useState<TodayActionState>(loadToday)

  // 자정을 넘겨 다시 열었을 때 새 날로 바뀌게 한다
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setState(loadToday())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const update = useCallback((next: TodayActionState) => {
    writeJson(KEY, next)
    setState(next)
  }, [])

  const action = findAction(state.actionId) as DailyAction

  return {
    action,
    status: state.status,
    markDone: () => update({ ...state, status: 'done' }),
    skip: () => update({ ...state, status: 'skipped' }),
    reopen: () => update({ ...state, status: 'open' }),
    swap: () => update({ ...state, actionId: pickAlternative(state.actionId).id, status: 'open' }),
  }
}
