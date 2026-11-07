// 오늘의 작은 행동 상태. 이 기기에만, 오늘 하루치만 저장한다. 서버로 보내지 않는다.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAILY_ACTIONS, type DailyAction } from '../data/dailyActions'
import { findAction, localDateKey, pickAlternative, resolveTodayState, type TodayActionState } from '../lib/dailyAction'
import { readJson, writeJson } from '../lib/storage'

const KEY = 'today-action'
const NEARBY_KEY = 'nearby-actions-only'

function poolFor(nearbyOnly: boolean): DailyAction[] {
  return nearbyOnly ? DAILY_ACTIONS.filter((action) => action.lowMobility) : DAILY_ACTIONS
}

function loadToday(nearbyOnly: boolean): TodayActionState {
  return resolveTodayState(readJson<TodayActionState>(KEY), localDateKey(new Date()), poolFor(nearbyOnly))
}

export function useTodayAction() {
  const [nearbyOnly, setNearbyOnlyState] = useState(() => readJson<boolean>(NEARBY_KEY) === true)
  const [state, setState] = useState<TodayActionState>(() => loadToday(nearbyOnly))
  const pool = useMemo(() => poolFor(nearbyOnly), [nearbyOnly])

  // 자정을 넘겨 다시 열었을 때 새 날로 바뀌게 한다
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setState(loadToday(nearbyOnly))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [nearbyOnly])

  const update = useCallback((next: TodayActionState) => {
    writeJson(KEY, next)
    setState(next)
  }, [])

  const setNearbyOnly = useCallback(
    (value: boolean) => {
      writeJson(NEARBY_KEY, value)
      setNearbyOnlyState(value)
      // 아직 하지 않은 행동이 범위 밖이면 범위 안의 행동으로 바꾼다. 이미 한 기록은 그대로 둔다.
      update(resolveTodayState(state, state.date, poolFor(value)))
    },
    [state, update],
  )

  const action = findAction(state.actionId) as DailyAction

  return {
    action,
    status: state.status,
    nearbyOnly,
    setNearbyOnly,
    markDone: () => update({ ...state, status: 'done' }),
    skip: () => update({ ...state, status: 'skipped' }),
    reopen: () => update({ ...state, status: 'open' }),
    swap: () => update({ ...state, actionId: pickAlternative(state.actionId, Math.random, pool).id, status: 'open' }),
  }
}
