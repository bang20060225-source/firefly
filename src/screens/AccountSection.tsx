// 선택적 계정 연결.
// · 지금의 익명 계정에 이메일을 연결한다 → 사용자 번호가 그대로 유지되고 데이터를 복사하지 않는다.
// · 이미 다른 계정에 쓰인 이메일이면 자동으로 합치지 않는다.
// · 다른 기기에서는 연결된 이메일로 로그인 링크를 받아 들어온다.
import { useEffect, useState } from 'react'
import { backend } from '../app/backendInstance'
import { Button, LiveMessage } from '../components/ui'
import { config } from '../config'
import { errorMessage } from '../services/backend'
import type { AccountInfo } from '../types'

export function AccountSection() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'link' | 'signin'>('link')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    backend
      .getAccount()
      .then(setAccount)
      .catch((err) => setLoadError(errorMessage(err)))
  }, [])

  async function submit() {
    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'link') {
        await backend.linkEmail(email)
        setMessage('확인 메일을 보냈어요. 메일의 링크를 누르면 연결이 끝나요.')
        setAccount(await backend.getAccount())
      } else {
        await backend.sendSignInLink(email)
        setMessage('로그인 링크를 보냈어요. 이 기기의 지금 익명 공간은 이어지지 않으니 참고해 주세요.')
      }
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <LiveMessage message={loadError} tone="warn" />
  if (!account) return <p className="text-[13px] text-night-300">계정 정보를 불러오는 중이에요</p>

  if (!account.isAnonymous && account.email) {
    return (
      <div className="text-[14px] leading-relaxed text-night-200">
        <p>
          <span className="text-night-100">{account.email}</span> 에 연결되어 있어요.
        </p>
        <p className="mt-1 text-[13px] text-night-300">다른 기기에서도 이 이메일로 로그인 링크를 받아 들어올 수 있어요.</p>
      </div>
    )
  }

  return (
    <div className="text-[14px] leading-relaxed text-night-200">
      <p>지금은 가입 없이 익명으로 쓰고 있어요.</p>
      <p className="mt-1 text-[13px] text-night-300">
        브라우저 데이터를 지우거나 기기를 바꾸면 지금 공간에 다시 들어오지 못할 수 있어요. 이메일을 연결하면 다른 기기에서도
        이어서 쓸 수 있어요. 연결은 선택이에요.
      </p>
      {account.pendingEmail && (
        <p className="mt-2 rounded-2xl bg-night-700/60 px-4 py-2 text-[13px]">
          {account.pendingEmail} 확인을 기다리고 있어요. 메일의 링크를 눌러 주세요.
        </p>
      )}

      {config.demoMode ? (
        <p className="mt-3 rounded-2xl border border-dashed border-night-600 px-4 py-3 text-[13px] text-night-300">
          DEMO 모드에서는 이메일 연결을 쓸 수 없어요. Supabase 서버를 연결하면 사용할 수 있어요.
        </p>
      ) : (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div role="radiogroup" aria-label="이메일로 할 일" className="mb-2 grid grid-cols-2 gap-1 rounded-2xl bg-night-900 p-1">
            {(
              [
                ['link', '이 공간에 연결'],
                ['signin', '다른 기기에서 로그인'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={`min-h-10 rounded-xl text-[13px] ${mode === value ? 'bg-night-700 text-night-100' : 'text-night-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block text-[13px] text-night-300" htmlFor="account-email">
            이메일
          </label>
          <input
            id="account-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-2xl bg-night-900 px-4 text-[15px] text-night-100 ring-1 ring-night-600 placeholder:text-night-300/60"
            placeholder="name@example.com"
          />
          <Button type="submit" variant="soft" className="mt-2 w-full" disabled={busy || email.trim() === ''}>
            {busy ? '보내는 중…' : mode === 'link' ? '확인 메일 받기' : '로그인 링크 받기'}
          </Button>
          <LiveMessage message={message} />
        </form>
      )}
    </div>
  )
}
