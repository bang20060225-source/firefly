// 만 14세 미만 안내.
// 법정대리인(보호자) 동의를 적법하게 확인하는 수단이 준비되기 전까지 실제 이용은 열지 않는다.
// 이 화면에서는 계정을 만들지 않고, 서버에 아무 정보도 보내지 않는다.
import { useState } from 'react'
import { useApp } from '../app/AppProvider'
import { Button, LiveMessage } from '../components/ui'
import { NightSky } from '../components/sky/NightSky'
import { errorMessage } from '../services/backend'
import { HelpList } from './Help'

export function Under14Notice() {
  const { resetAgeChoice, grantDemoTestConsent } = useApp()
  const [error, setError] = useState<string | null>(null)

  return (
    <NightSky className="min-h-dvh">
      <main className="relative z-10 mx-auto max-w-md px-6 pt-12 pb-16">
        <h1 className="text-2xl font-semibold leading-snug text-night-100">조금만 기다려 줄래요?</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-night-200">
          만 14세 미만 친구는 보호자의 동의가 필요해요. 보호자 동의를 안전하게 확인하는 방법을 아직 준비하고 있어서,
          지금은 반딧불이를 열 수 없어요.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-night-300">
          이 화면에서는 어떤 정보도 저장하거나 보내지 않았어요.
        </p>

        <h2 className="mt-10 mb-3 text-[15px] font-medium text-night-100">이야기할 곳이 필요하다면</h2>
        <HelpList highlightYouth />

        <div className="mt-8 flex flex-col gap-2">
          <Button variant="soft" onClick={resetAgeChoice}>
            나이를 잘못 골랐어요
          </Button>
        </div>

        {grantDemoTestConsent && (
          <div className="mt-10 rounded-2xl border border-dashed border-[#c9a8ff]/60 px-4 py-4">
            <p className="text-[13px] leading-relaxed text-[#e5d6ff]">
              <strong>개발·DEMO 전용</strong> — 운영 환경에는 이 버튼이 없어요. 실제 보호자 확인이 아니며, 화면 흐름
              시험용이에요.
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => grantDemoTestConsent().catch((err) => setError(errorMessage(err)))}
            >
              테스트용 보호자 동의로 들어가기
            </Button>
            <LiveMessage message={error} tone="warn" />
          </div>
        )}
      </main>
    </NightSky>
  )
}
