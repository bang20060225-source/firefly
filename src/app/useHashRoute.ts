// 아주 작은 화면 이동 도구. 주소 뒤의 #room 같은 값으로 화면을 고른다.
// (별도 라우터 라이브러리 없이 뒤로 가기 버튼이 동작한다)
import { useEffect, useState } from 'react'

export type Route = 'sky' | 'room' | 'action' | 'settings' | 'help' | 'privacy'

/** 화면 이름 → 주소 뒤에 붙는 이름. 밤하늘(홈)은 아무것도 붙지 않는다 */
const HASH_OF: Record<Route, string> = {
  sky: '',
  room: 'room',
  action: 'action',
  settings: 'options',
  help: 'help',
  privacy: 'privacy',
}

function readRoute(): Route {
  // 예전 주소 형식(#/room)도 받아 준다
  const value = window.location.hash.replace(/^#\/?/, '')
  const found = (Object.keys(HASH_OF) as Route[]).find((route) => HASH_OF[route] === value && value !== '')
  return found ?? 'sky'
}

export function navigate(route: Route): void {
  const hash = HASH_OF[route]
  if (hash === '') {
    // 홈으로 갈 때는 # 를 지운 주소로 바꾸고, 화면에 바뀌었다고 알린다
    if (window.location.hash !== '') {
      history.pushState(null, '', window.location.pathname + window.location.search)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    return
  }
  window.location.hash = hash
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])

  return route
}
