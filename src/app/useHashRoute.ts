// 아주 작은 화면 이동 도구. 주소 뒤의 #/room 같은 값으로 화면을 고른다.
// (별도 라우터 라이브러리 없이 뒤로 가기 버튼이 동작한다)
import { useEffect, useState } from 'react'

export type Route = 'sky' | 'room' | 'action' | 'settings' | 'help' | 'privacy'

const ROUTES: Route[] = ['sky', 'room', 'action', 'settings', 'help', 'privacy']

function readRoute(): Route {
  const value = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(value) ? (value as Route) : 'sky'
}

export function navigate(route: Route): void {
  window.location.hash = route === 'sky' ? '/' : `/${route}`
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
