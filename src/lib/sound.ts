// 아주 작은 소리. 설정에서 '소리'를 켠 경우에만 난다. (기본은 꺼짐)
// 소리 파일 없이 브라우저에서 바로 만든다. 자극적이지 않게 짧고 작게.

export type SoundKind = 'light' | 'warmth' | 'tap'

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  try {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      context = new Ctor()
    }
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

/** 부드러운 음 하나: 천천히 커졌다가 사라진다 */
function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.08, duration / 4))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return
  const ctx = getContext()
  if (!ctx) return
  try {
    const t = ctx.currentTime + 0.01
    if (kind === 'light') {
      // 맑은 두 음: 불빛이 떠오르는 느낌
      tone(ctx, 659.25, t, 1.2, 0.05)
      tone(ctx, 987.77, t + 0.18, 1.4, 0.04)
    } else if (kind === 'warmth') {
      // 따뜻한 화음이 천천히 번진다
      for (const [i, f] of [523.25, 659.25, 783.99].entries()) tone(ctx, f, t + i * 0.06, 1.8, 0.025)
    } else {
      tone(ctx, 880, t, 0.12, 0.025, 'triangle')
    }
  } catch {
    // 소리를 낼 수 없는 환경이면 조용히 넘어간다
  }
}
