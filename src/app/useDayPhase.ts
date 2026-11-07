import { useEffect, useState } from 'react'
import { dayPhase, type DayPhase } from '../lib/skyScene'

/** 지금이 새벽·낮·저녁·밤 중 언제인지. 5분마다 다시 확인한다 */
export function useDayPhase(): DayPhase {
  const [phase, setPhase] = useState<DayPhase>(() => dayPhase(new Date().getHours()))
  useEffect(() => {
    const timer = window.setInterval(() => setPhase(dayPhase(new Date().getHours())), 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])
  return phase
}
