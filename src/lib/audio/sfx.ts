// 효과음 — 물건마다 다른 소리, 누를 때마다 조금씩 다르게.
// 모두 짧고 작게. 놀라게 하는 소리는 만들지 않는다.

import { renderBell, type Buses } from './render'

export type SfxKind =
  | 'light' // 불빛 하나 보태기
  | 'warmth' // 온기 퍼뜨리기
  | 'tap' // 기본
  | 'moon' // 달
  | 'lampOn'
  | 'lampOff'
  | 'sock'
  | 'plant'
  | 'mug'
  | 'book' // 책 펼치기
  | 'page' // 책장 넘기기

export const SFX_KINDS: SfxKind[] = ['light', 'warmth', 'tap', 'moon', 'lampOn', 'lampOff', 'sock', 'plant', 'mug', 'book', 'page']

type Ctx = BaseAudioContext
const between = (rng: () => number, a: number, b: number) => a + rng() * (b - a)

/** 음높이가 미끄러지는 짧은 소리 (뿅, 삑) */
function glide(
  ctx: Ctx,
  buses: Buses,
  t: number,
  points: [number, number][],
  level: number,
  type: OscillatorType = 'triangle',
) {
  const osc = ctx.createOscillator()
  osc.type = type
  const env = ctx.createGain()
  const end = t + points[points.length - 1][0]
  osc.frequency.setValueAtTime(points[0][1], t)
  for (const [at, freq] of points.slice(1)) osc.frequency.exponentialRampToValueAtTime(freq, t + at)
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(level, t + 0.008)
  env.gain.setValueAtTime(level, end - 0.03)
  env.gain.exponentialRampToValueAtTime(0.0001, end + 0.04)
  const send = ctx.createGain()
  send.gain.value = 0.2
  osc.connect(env)
  env.connect(buses.dry)
  env.connect(send)
  send.connect(buses.send)
  osc.start(t)
  osc.stop(end + 0.06)
  osc.onended = () => [env, send].forEach((n) => n.disconnect())
}

/** 걸러진 잡음 한 줄기 (바스락, 촤락, 후—) */
function noiseBurst(
  ctx: Ctx,
  buses: Buses,
  t: number,
  opts: { duration: number; from: number; to?: number; q: number; level: number; attack?: number; pan?: number; send?: number },
  rng: () => number,
) {
  const source = ctx.createBufferSource()
  source.buffer = buses.noise
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = opts.q
  filter.frequency.setValueAtTime(opts.from, t)
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, t + opts.duration)
  const env = ctx.createGain()
  const attack = Math.min(opts.attack ?? 0.004, opts.duration * 0.8)
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(opts.level, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration)
  const pan = ctx.createStereoPanner()
  pan.pan.value = opts.pan ?? 0
  const send = ctx.createGain()
  send.gain.value = opts.send ?? 0.2
  source.connect(filter)
  filter.connect(env)
  env.connect(pan)
  pan.connect(buses.dry)
  pan.connect(send)
  send.connect(buses.send)
  const offset = rng() * Math.max(0, buses.noise.duration - opts.duration - 0.05)
  source.start(t, offset, opts.duration + 0.02)
  source.onended = () => [filter, env, pan, send].forEach((n) => n.disconnect())
}

/** 사기 그릇 같은 '팅' */
function ceramic(ctx: Ctx, buses: Buses, t: number, base: number, level: number) {
  const out = ctx.createGain()
  out.gain.value = level
  const send = ctx.createGain()
  send.gain.value = 0.35
  out.connect(buses.dry)
  out.connect(send)
  send.connect(buses.send)
  const partials: [number, number, number][] = [
    [1, 1, 0.45],
    [1.66, 0.4, 0.3],
    [2.38, 0.15, 0.2],
  ]
  partials.forEach(([ratio, gain, decay], index) => {
    const osc = ctx.createOscillator()
    osc.frequency.value = base * ratio
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(gain, t + 0.002)
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    osc.connect(env)
    env.connect(out)
    osc.start(t)
    osc.stop(t + decay + 0.03)
    osc.onended = () => {
      env.disconnect()
      if (index === 0) [out, send].forEach((n) => n.disconnect())
    }
  })
}

/** 스위치 '딸깍' */
function click(ctx: Ctx, buses: Buses, t: number, high: number, bodyFrom: number, bodyTo: number, rng: () => number) {
  noiseBurst(ctx, buses, t, { duration: 0.012, from: high, q: 2, level: 0.22, send: 0.05 }, rng)
  glide(ctx, buses, t, [[0, bodyFrom], [0.05, bodyTo]], 0.1, 'sine')
}

/** 효과음 하나를 t 시각에 낸다 */
export function scheduleSfx(kind: SfxKind, ctx: Ctx, buses: Buses, t: number, rng: () => number) {
  const variant = Math.floor(rng() * 3)
  const detune = 2 ** (between(rng, -0.25, 0.25) / 12) // 누를 때마다 음높이가 조금씩 다르게

  switch (kind) {
    case 'light': {
      const notes = [72, 76, 79, 84]
      notes.forEach((midi, i) => renderBell(ctx, buses, t + i * 0.09, midi, 0.9 - i * 0.1, -0.3 + i * 0.2, 2.2))
      renderBell(ctx, buses, t + 0.45, 88, 0.35, 0.2, 3)
      break
    }
    case 'warmth': {
      const chord = [60, 64, 67, 72]
      chord.forEach((midi, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = 440 * 2 ** ((midi - 69) / 12)
        const env = ctx.createGain()
        const start = t + i * 0.05
        env.gain.setValueAtTime(0, start)
        env.gain.linearRampToValueAtTime(0.022, start + 0.45)
        env.gain.exponentialRampToValueAtTime(0.0001, start + 2.4)
        const send = ctx.createGain()
        send.gain.value = 0.6
        osc.connect(env)
        env.connect(buses.dry)
        env.connect(send)
        send.connect(buses.send)
        osc.start(start)
        osc.stop(start + 2.5)
        osc.onended = () => [env, send].forEach((n) => n.disconnect())
      })
      noiseBurst(ctx, buses, t, { duration: 1.4, from: 500, to: 1600, q: 0.7, level: 0.03, attack: 0.5, send: 0.5 }, rng)
      break
    }
    case 'tap':
      renderBell(ctx, buses, t, 81, 0.5, 0, 0.8, 0.4)
      break
    case 'moon':
      renderBell(ctx, buses, t, 84, 0.6, 0.3, 3)
      renderBell(ctx, buses, t + 0.16, 91, 0.4, 0.4, 3)
      break
    case 'lampOn':
      click(ctx, buses, t, 3500 * detune, 190, 110, rng)
      renderBell(ctx, buses, t + 0.08, 76, 0.35, 0.2, 1.2, 0.5)
      renderBell(ctx, buses, t + 0.2, 79, 0.3, 0.25, 1.4, 0.5)
      break
    case 'lampOff':
      click(ctx, buses, t, 2800 * detune, 150, 85, rng)
      renderBell(ctx, buses, t + 0.1, 74, 0.25, 0.2, 1.1, 0.5)
      renderBell(ctx, buses, t + 0.24, 69, 0.2, 0.15, 1.3, 0.5)
      break
    case 'sock': {
      const f = detune * between(rng, 0.9, 1.1)
      if (variant === 0) {
        // 뿅
        glide(ctx, buses, t, [[0, 420 * f], [0.09, 860 * f], [0.2, 640 * f]], 0.06)
      } else if (variant === 1) {
        // 폴짝폴짝
        glide(ctx, buses, t, [[0, 380 * f], [0.08, 760 * f]], 0.05)
        glide(ctx, buses, t + 0.12, [[0, 520 * f], [0.08, 980 * f]], 0.045)
      } else {
        // 삑삑
        glide(ctx, buses, t, [[0, 1000 * f], [0.035, 1400 * f], [0.07, 1150 * f]], 0.035, 'sine')
        glide(ctx, buses, t + 0.09, [[0, 1050 * f], [0.035, 1450 * f], [0.07, 1200 * f]], 0.03, 'sine')
      }
      break
    }
    case 'plant': {
      // 바스락: 잎이 스치는 짧은 소리 여러 개
      const bursts = 6 + Math.floor(rng() * 4)
      for (let i = 0; i < bursts; i++) {
        noiseBurst(
          ctx,
          buses,
          t + between(rng, 0, 0.38),
          { duration: between(rng, 0.02, 0.05), from: between(rng, 3500, 6500), q: 1.5, level: between(rng, 0.03, 0.07), pan: between(rng, -0.3, 0.3) },
          rng,
        )
      }
      if (rng() < 0.5) renderBell(ctx, buses, t + 0.25, [88, 91, 93][Math.floor(rng() * 3)], 0.25, between(rng, -0.4, 0.4), 1.8)
      break
    }
    case 'mug': {
      if (variant === 0) {
        // 팅, 팅
        ceramic(ctx, buses, t, 2350 * detune, 0.05)
        ceramic(ctx, buses, t + 0.13, 2400 * detune, 0.03)
      } else if (variant === 1) {
        // 후— (김 부는 소리)
        noiseBurst(ctx, buses, t, { duration: 0.75, from: 750, to: 1000, q: 0.9, level: 0.07, attack: 0.28, send: 0.3 }, rng)
      } else {
        // 호록
        noiseBurst(ctx, buses, t, { duration: 0.05, from: 1600, q: 3, level: 0.05 }, rng)
        noiseBurst(ctx, buses, t + 0.09, { duration: 0.05, from: 1750, q: 3, level: 0.045 }, rng)
        ceramic(ctx, buses, t + 0.25, 2500 * detune, 0.025)
      }
      break
    }
    case 'book':
      // 촤락 — 책장이 펼쳐지는 소리, 그리고 작은 종소리
      noiseBurst(ctx, buses, t, { duration: 0.17, from: 1400, to: 5200, q: 0.9, level: 0.12, attack: 0.01 }, rng)
      noiseBurst(ctx, buses, t + 0.06, { duration: 0.03, from: 4500, q: 2, level: 0.05 }, rng)
      noiseBurst(ctx, buses, t + 0.11, { duration: 0.03, from: 4000, q: 2, level: 0.04 }, rng)
      renderBell(ctx, buses, t + 0.22, 79, 0.4, -0.1, 2)
      renderBell(ctx, buses, t + 0.34, 86, 0.3, 0.15, 2.2)
      break
    case 'page':
      noiseBurst(ctx, buses, t, { duration: 0.13, from: 1600 * detune, to: 5000, q: 0.9, level: 0.09, attack: 0.008 }, rng)
      if (rng() < 0.5) renderBell(ctx, buses, t + 0.15, 84, 0.2, 0.1, 1.5)
      break
  }
}
