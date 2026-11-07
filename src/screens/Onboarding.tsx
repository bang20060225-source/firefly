// 첫 방문 안내 → 연령 확인 → 개인정보 안내 확인 → 익명으로 시작
import { useEffect, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { navigate } from '../app/useHashRoute'
import { Button, LiveMessage } from '../components/ui'
import { NightSky } from '../components/sky/NightSky'
import { MyWindow } from '../components/sky/MyWindow'
import { errorMessage } from '../services/backend'
import type { AgeCategory } from '../types'

const INTRO = [
  {
    title: '아무것도 하지 않아도 괜찮은 곳',
    body: '대화도, 답장도, 출석도 없어요. 밤하늘을 바라보다 그냥 가도 괜찮아요.',
  },
  {
    title: '작은 불빛으로 안부를 전해요',
    body: '원할 때만 불빛 하나를 밤하늘에 남길 수 있어요. 누가 남겼는지는 알 수 없고, 2시간이 지나면 조용히 사라져요.',
  },
  {
    title: '처음엔 나에게만 보여요',
    body: '불빛은 처음에 비공개로 시작해요. 공개 방식은 언제든 바꿀 수 있어요.',
  },
]

const AGE_OPTIONS: { value: AgeCategory; label: string }[] = [
  { value: 'adult', label: '만 19세 이상' },
  { value: 'teen_14_plus', label: '만 14세 ~ 18세' },
  { value: 'under_14', label: '만 14세 미만' },
]

type Step = 'splash' | 'intro' | 'age' | 'consent'

export function Onboarding({ startAt = 'splash' }: { startAt?: Step }) {
  const { completeOnboarding, reduceMotion } = useApp()
  const [step, setStep] = useState<Step>(startAt)
  const [introIndex, setIntroIndex] = useState(0)
  const [age, setAge] = useState<AgeCategory | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 첫 화면은 잠깐만 보여주고 넘어간다 (눌러서 바로 넘어갈 수도 있다)
  useEffect(() => {
    if (step !== 'splash') return
    const timer = window.setTimeout(() => setStep('intro'), reduceMotion ? 1200 : 2200)
    return () => window.clearTimeout(timer)
  }, [step, reduceMotion])

  // 단계가 바뀌면 화면 맨 위부터 보이게 한다 (앞 단계의 스크롤 위치가 남지 않도록)
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  async function start() {
    if (!age) return
    setBusy(true)
    setError(null)
    try {
      await completeOnboarding(age)
      navigate('sky')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (step === 'splash') {
    return (
      <button
        type="button"
        onClick={() => setStep('intro')}
        className="block w-full text-left"
        aria-label="반딧불이 시작 화면. 눌러서 넘어가기"
      >
        <NightSky className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <div className="relative z-10 animate-fade-in">
            <MyWindow size="small" />
          </div>
          <h1 className="relative z-10 mt-6 text-3xl font-semibold tracking-tight text-night-100">반딧불이</h1>
          <p className="relative z-10 mt-3 text-[15px] text-night-200">말하지 않아도, 안부가 닿는 곳</p>
        </NightSky>
      </button>
    )
  }

  return (
    <NightSky className="min-h-dvh">
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-12 pb-10">
        {step === 'intro' && (
          <>
            <p className="text-sm text-night-300" aria-hidden="true">
              {introIndex + 1} / {INTRO.length}
            </p>
            <section key={introIndex} className="mt-10 flex-1 animate-fade-in" aria-live="polite">
              <h1 className="text-2xl font-semibold leading-snug text-night-100">{INTRO[introIndex].title}</h1>
              <p className="mt-4 text-[16px] leading-relaxed text-night-200">{INTRO[introIndex].body}</p>
            </section>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => (introIndex < INTRO.length - 1 ? setIntroIndex(introIndex + 1) : setStep('age'))}
              >
                {introIndex < INTRO.length - 1 ? '다음' : '시작해 볼게요'}
              </Button>
              {introIndex < INTRO.length - 1 && (
                <Button variant="ghost" onClick={() => setStep('age')}>
                  건너뛰기
                </Button>
              )}
            </div>
          </>
        )}

        {step === 'age' && (
          <>
            <h1 className="text-2xl font-semibold leading-snug text-night-100">나이를 알려 주세요</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-night-200">
              생년월일은 묻지 않아요. 나이에 맞는 보호 설정을 위해서만 사용해요.
            </p>
            <fieldset className="mt-8 flex-1">
              <legend className="sr-only">나이 구간</legend>
              <div className="space-y-3">
                {AGE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-5 ring-1 ${
                      age === option.value ? 'bg-night-700 ring-glow-400/70' : 'bg-night-800/70 ring-night-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="age"
                      value={option.value}
                      checked={age === option.value}
                      onChange={() => setAge(option.value)}
                      className="h-4 w-4 accent-[#ffc861]"
                    />
                    <span className="text-[16px] text-night-100">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              disabled={!age}
              onClick={() => (age === 'under_14' ? void start() : setStep('consent'))}
            >
              다음
            </Button>
          </>
        )}

        {step === 'consent' && (
          <>
            <h1 className="text-2xl font-semibold leading-snug text-night-100">시작하기 전에</h1>
            <div className="mt-6 flex-1 space-y-4 text-[15px] leading-relaxed text-night-200">
              <p>
                <strong className="font-medium text-night-100">가입 없이 시작해요.</strong> 이름, 전화번호, 정확한 위치,
                연락처는 받지 않아요. 마음 상태를 묻거나 판단하지도 않아요.
              </p>
              <p>
                이 기기에 익명 공간이 만들어져요. 브라우저 데이터를 지우거나 기기를 바꾸면 지금 공간에 다시 들어오지
                못할 수 있어요. 원하면 나중에 이메일을 연결할 수 있어요.
              </p>
              {age === 'teen_14_plus' && (
                <p>청소년에게는 개인정보를 최소한으로 다루는 안전한 기본 설정이 적용돼요.</p>
              )}
              <p>반딧불이는 전문 상담이나 의료 서비스를 대신하지 않아요. 도움이 필요할 땐 언제든 '도움받기'를 열어 주세요.</p>
              <p className="rounded-2xl bg-night-800/80 px-4 py-3 text-[13px] text-night-300">
                이용약관과 개인정보 처리방침은 아직 법률 검토 전 초안이에요. 자세한 내용은 설정의 '개인정보 안내'에서 볼
                수 있어요.
              </p>
              <label className="flex cursor-pointer items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#ffc861]"
                />
                <span className="text-night-100">위 내용을 확인했어요</span>
              </label>
            </div>
            <LiveMessage message={error} tone="warn" />
            <div className="mt-2 flex flex-col gap-2">
              <Button disabled={!agreed || busy} onClick={() => void start()}>
                {busy ? '공간을 준비하는 중…' : '익명으로 시작하기'}
              </Button>
              <Button variant="ghost" onClick={() => setStep('age')} disabled={busy}>
                이전으로
              </Button>
            </div>
          </>
        )}
      </main>
    </NightSky>
  )
}
