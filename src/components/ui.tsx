// 공통 UI 조각들. 색과 모양을 바꾸고 싶으면 여기와 src/index.css 의 토큰을 고치면 된다.
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'paper' | 'paperGhost'

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-glow-400 text-night-950 hover:bg-glow-300 shadow-[0_0_24px_-6px_var(--color-glow-400)] disabled:bg-night-700 disabled:text-night-300 disabled:shadow-none',
  soft: 'bg-night-700/70 text-night-100 ring-1 ring-night-600 hover:bg-night-700 disabled:text-night-300/70',
  ghost: 'bg-transparent text-night-200 hover:bg-night-800/60 hover:text-night-100',
  danger: 'bg-transparent text-[#ffb4a8] ring-1 ring-[#ffb4a8]/50 hover:bg-[#ffb4a8]/10',
  paper: 'bg-ink-700 text-paper-50 hover:bg-ink-500 disabled:bg-paper-200 disabled:text-ink-500',
  /** 밝은 종이 배경 위의 조용한 버튼 */
  paperGhost: 'bg-transparent text-ink-700 hover:bg-paper-100',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/** 켜고 끄는 스위치 */
export function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] text-night-100">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-night-300">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-glow-400' : 'bg-night-700 ring-1 ring-night-600'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 h-6 w-6 rounded-full bg-paper-50 shadow transition-[left] ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

/** 화면 위쪽 제목 줄 */
export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-night-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-night-300">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/** 상태 안내 문구. 스크린리더가 바뀐 내용을 읽어 준다 */
export function LiveMessage({ message, tone = 'calm' }: { message: string | null; tone?: 'calm' | 'warn' }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`min-h-6 text-center text-sm leading-relaxed ${tone === 'warn' ? 'text-[#ffcfb0]' : 'text-night-200'}`}
    >
      {message ?? ''}
    </p>
  )
}

export function LoadingState({ label = '불러오는 중이에요' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-night-300">
      <span aria-hidden="true" className="h-3 w-3 animate-pulse rounded-full bg-glow-400 shadow-[0_0_18px_var(--color-glow-400)]" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-5 flex flex-col items-center gap-4 rounded-3xl bg-night-800/80 px-6 py-8 text-center">
      <p className="text-[15px] leading-relaxed text-night-100">{message}</p>
      {onRetry && (
        <Button variant="soft" onClick={onRetry}>
          다시 시도하기
        </Button>
      )}
    </div>
  )
}

/** 섹션 카드 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-night-800/70 px-5 py-4 ring-1 ring-night-700 ${className}`}>{children}</section>
}

/**
 * 확인 창. Esc 로 닫히고, 열리면 첫 버튼으로 초점이 이동한다.
 * 브라우저 기본 <dialog> 를 사용해 키보드·스크린리더 동작을 맡긴다.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = '닫기',
  tone = 'primary',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-3xl bg-night-800 p-0 text-night-100 ring-1 ring-night-600 backdrop:bg-night-950/70"
    >
      <div className="px-6 pt-6 pb-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-night-200">{children}</div>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? '처리하는 중…' : confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
