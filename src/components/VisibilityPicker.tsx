// 불빛 공개 방식 고르기: 비공개 / 직접 공개 / 자동 공개
// 자동 공개는 설명을 읽고 명시적으로 동의해야 켜진다.
import { useId, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { errorMessage } from '../services/backend'
import type { VisibilityMode } from '../types'
import { ConfirmDialog, LiveMessage } from './ui'

const OPTIONS: { mode: VisibilityMode; title: string; description: string }[] = [
  { mode: 'private', title: '비공개', description: '창문 불빛은 나에게만 보여요. 밤하늘에는 남지 않아요.' },
  { mode: 'manual', title: '직접 공개', description: '"불빛 하나 보태기"를 누를 때만 밤하늘에 남아요.' },
  { mode: 'auto', title: '자동 공개', description: '앱을 새로 열 때 한 번, 불빛이 밤하늘에 조용히 남아요.' },
]

export function VisibilityPicker({ tone = 'night', hideLegend = false }: { tone?: 'night' | 'paper'; hideLegend?: boolean }) {
  const { settings, updateSettings } = useApp()
  const [askAuto, setAskAuto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const name = useId()

  if (!settings) return null
  const paper = tone === 'paper'

  async function apply(mode: VisibilityMode) {
    setBusy(true)
    setMessage(null)
    try {
      await updateSettings({
        visibilityMode: mode,
        autoConsentAt: mode === 'auto' ? new Date().toISOString() : null,
      })
      setMessage(
        mode === 'private'
          ? '비공개로 바꿨어요. 밤하늘에 있던 내 불빛도 함께 거뒀어요.'
          : mode === 'manual'
            ? '직접 공개로 바꿨어요.'
            : '자동 공개를 켰어요. 언제든 끌 수 있어요.',
      )
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
      setAskAuto(false)
    }
  }

  function choose(mode: VisibilityMode) {
    if (mode === settings?.visibilityMode) return
    if (mode === 'auto') {
      setAskAuto(true)
      return
    }
    void apply(mode)
  }

  return (
    <fieldset disabled={busy}>
      <legend
        className={hideLegend ? 'sr-only' : `mb-2 text-[15px] font-medium ${paper ? 'text-ink-700' : 'text-night-100'}`}
      >
        불빛 공개 방식
      </legend>
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const checked = settings.visibilityMode === option.mode
          return (
            <label
              key={option.mode}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition-colors ${
                paper
                  ? checked
                    ? 'bg-paper-50 ring-ink-500'
                    : 'bg-paper-100 ring-paper-200 hover:bg-paper-50'
                  : checked
                    ? 'bg-night-700 ring-glow-400/60'
                    : 'bg-night-800/60 ring-night-700 hover:bg-night-700/60'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.mode}
                checked={checked}
                onChange={() => choose(option.mode)}
                className="mt-1 h-4 w-4 accent-[#ffc861]"
              />
              <span>
                <span className={`block text-[15px] ${paper ? 'text-ink-700' : 'text-night-100'}`}>{option.title}</span>
                <span className={`block text-[13px] leading-relaxed ${paper ? 'text-ink-500' : 'text-night-300'}`}>
                  {option.description}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <div className={`mt-2 ${paper ? '[&_p]:text-ink-500' : ''}`}>
        <LiveMessage message={message} />
      </div>

      <ConfirmDialog
        open={askAuto}
        title="자동 공개를 켤까요?"
        confirmLabel="동의하고 켜기"
        cancelLabel="그냥 둘게요"
        busy={busy}
        onConfirm={() => void apply('auto')}
        onClose={() => setAskAuto(false)}
      >
        <p>앱을 새로 열 때마다 한 번, 내 불빛이 공동 밤하늘에 자동으로 남아요.</p>
        <p>불빛은 누가 남겼는지 알 수 없고, 2시간이 지나면 사라져요. 앱을 닫아도 이 시간은 바뀌지 않아요.</p>
        <p>앱이 꺼져 있는 동안 몰래 확인하거나 공개하지 않아요. 언제든 끌 수 있어요.</p>
      </ConfirmDialog>
    </fieldset>
  )
}
