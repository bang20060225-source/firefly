import { useApp } from './app/AppProvider'
import { useHashRoute } from './app/useHashRoute'
import { BottomNav } from './components/BottomNav'
import { DemoBanner } from './components/DemoBanner'
import { ErrorState, LoadingState } from './components/ui'
import { errorMessage, FireflyError } from './services/backend'
import { Help } from './screens/Help'
import { Home } from './screens/Home'
import { LittleAction } from './screens/LittleAction'
import { MyRoom } from './screens/MyRoom'
import { Onboarding } from './screens/Onboarding'
import { PrivacyInfo } from './screens/PrivacyInfo'
import { Settings } from './screens/Settings'
import { Under14Notice } from './screens/Under14Notice'

export function App() {
  const { phase, startError, startErrorDetail, retryStart, reduceMotion } = useApp()
  const route = useHashRoute()

  return (
    <div
      className={`min-h-dvh ${reduceMotion ? 'reduce-motion' : ''} ${
        phase === 'ready' && (route === 'room' || route === 'action') ? 'bg-paper-50' : ''
      }`}
    >
      <DemoBanner />
      {phase === 'loading' && <LoadingState label="밤하늘을 여는 중이에요" />}
      {phase === 'error' && (
        <div className="pt-16">
          <ErrorState message={errorMessage(new FireflyError(startError ?? 'unknown'))} detail={startErrorDetail} onRetry={retryStart} />
        </div>
      )}
      {phase === 'onboarding' && <Onboarding />}
      {/* 만 14세 미만 안내 화면에서도 도움받기는 언제나 열 수 있다 */}
      {phase === 'blocked' && (route === 'help' ? <Help /> : <Under14Notice />)}
      {phase === 'ready' && (
        <>
          {route === 'sky' && <Home />}
          {route === 'room' && <MyRoom />}
          {route === 'action' && <LittleAction />}
          {route === 'settings' && <Settings />}
          {route === 'help' && <Help />}
          {route === 'privacy' && <PrivacyInfo />}
          <BottomNav current={route} />
        </>
      )}
    </div>
  )
}
