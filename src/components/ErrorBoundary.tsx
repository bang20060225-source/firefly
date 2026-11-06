// 예상하지 못한 오류로 화면이 하얗게 비지 않도록 막는다.
import { Component, type ReactNode } from 'react'

type State = { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    // 개인 정보는 담기지 않은 오류 내용만 개발자 도구에 남긴다
    console.error('반딧불이 화면 오류:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[16px] leading-relaxed text-night-100">화면을 그리다 문제가 생겼어요.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-12 rounded-2xl bg-night-700 px-5 text-night-100"
        >
          다시 열기
        </button>
      </div>
    )
  }
}
