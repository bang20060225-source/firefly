import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from './app/AppProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { config } from './config'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root 요소가 없어요')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      {/* 테스트용 보호자 동의는 DEMO 모드 + 개발 실행(npm run dev)에서만 허용한다 */}
      <AppProvider allowDemoTestConsent={config.demoMode && config.isDev}>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
)
