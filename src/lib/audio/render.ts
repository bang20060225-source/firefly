// 소리를 실제로 만드는 부분 (Web Audio).
// AudioContext 와 OfflineAudioContext 둘 다에서 동작해서, 미리듣기 파일도 같은 코드로 만든다.

import { midiToFreq, type AmbientEvent, type PianoEvent } from './composer'

/** 소리가 흘러갈 길: 그대로 나가는 길(dry)과 울림(리버브)으로 가는 길(send) */
export type Buses = { dry: AudioNode; send: AudioNode; noise: AudioBuffer }

// 소리 크기 기준값. 배경음은 아주 작게 깔리도록 맞췄다.
const PIANO_PEAK = 0.16
const BELL_PEAK = 0.05
const CRICKET_PEAK = 0.0055

/** 울림(리버브)용 잔향: 점점 작아지고 부드러워지는 잡음 */
export function makeImpulse(ctx: BaseAudioContext, seconds: number, rng: () => number): AudioBuffer {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * seconds)
  const buffer = ctx.createBuffer(2, length, rate)
  const preDelay = Math.floor(rate * 0.012)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let smooth = 0
    for (let i = preDelay; i < length; i++) {
      const t = i / rate
      // 시간이 지날수록 높은 소리가 먼저 사라지도록 점점 더 부드럽게
      const k = 0.9 - 0.75 * Math.min(1, t / seconds)
      smooth += k * (rng() * 2 - 1 - smooth)
      data[i] = smooth * Math.exp(-t / 0.85)
    }
  }
  return buffer
}

/** 효과음에 쓰는 하얀 잡음 */
export function makeNoise(ctx: BaseAudioContext, seconds: number, rng: () => number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = rng() * 2 - 1
  return buffer
}

function cleanupAfter(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
  source.onended = () => nodes.forEach((node) => node.disconnect())
}

function panner(ctx: BaseAudioContext, pan: number): StereoPannerNode {
  const node = ctx.createStereoPanner()
  node.pan.value = pan
  return node
}

/** 맑은 종소리 한 음 (기본음 + 쇠붙이 느낌의 배음 두 개) */
export function renderBell(
  ctx: BaseAudioContext,
  buses: Buses,
  time: number,
  midi: number,
  level: number,
  pan: number,
  decay = 2.6,
  sendAmount = 0.7,
) {
  const frequency = midiToFreq(midi)
  const out = ctx.createGain()
  out.gain.value = BELL_PEAK * level
  const pan1 = panner(ctx, pan)
  const send = ctx.createGain()
  send.gain.value = sendAmount
  out.connect(pan1)
  pan1.connect(buses.dry)
  pan1.connect(send)
  send.connect(buses.send)

  const partials: [number, number, number][] = [
    [1, 1, decay],
    [2.76, 0.22, decay * 0.42],
    [5.4, 0.07, decay * 0.2],
  ]
  let last: OscillatorNode | null = null
  for (const [ratio, gain, length] of partials) {
    const osc = ctx.createOscillator()
    osc.frequency.value = frequency * ratio
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(gain, time + 0.005)
    env.gain.exponentialRampToValueAtTime(0.0001, time + length)
    osc.connect(env)
    env.connect(out)
    osc.start(time)
    osc.stop(time + length + 0.05)
    if (ratio === 1) last = osc
    else cleanupAfter(osc, [env])
  }
  if (last) cleanupAfter(last, [out, pan1, send])
}

// 부드러운 피아노(펠트 피아노)의 음색: 기본음 위로 배음이 빠르게 작아진다.
// 한 번 만든 파형은 같은 오디오 장치에서 다시 쓴다.
// 사파리가 확실히 받아들이도록 Float32Array 로 넘기고, 그래도 못 만들면 null (→ 비슷하게 부드러운 기본 파형)
const pianoWaves = new WeakMap<BaseAudioContext, PeriodicWave | null>()
function pianoWave(ctx: BaseAudioContext): PeriodicWave | null {
  if (pianoWaves.has(ctx)) return pianoWaves.get(ctx) ?? null
  let wave: PeriodicWave | null = null
  try {
    const partials = new Float32Array([0, 1, 0.42, 0.2, 0.11, 0.06, 0.035, 0.02, 0.012])
    wave = ctx.createPeriodicWave(new Float32Array(partials.length), partials)
  } catch {
    wave = null
  }
  pianoWaves.set(ctx, wave)
  return wave
}

/**
 * 피아노 한 음. 누르는 순간 또렷하다가 금방 부드러워지고(높은 배음이 먼저 사라짐),
 * 낮은 음일수록 오래 울린다. 음이 어긋나게 겹치는 소리가 없어서 '웅웅' 떨리지 않는다.
 */
export function renderPiano(ctx: BaseAudioContext, buses: Buses, ev: PianoEvent) {
  const t = ev.time
  const frequency = midiToFreq(ev.midi)
  const release = t + Math.max(0.05, ev.duration)

  const osc = ctx.createOscillator()
  const wave = pianoWave(ctx)
  if (wave) osc.setPeriodicWave(wave)
  else osc.type = 'triangle'
  osc.frequency.value = frequency

  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.Q.value = 0.4
  const closed = Math.max(450, frequency * 1.6)
  const open = Math.max(closed, Math.min(5200, Math.max(900, frequency * (3 + 4 * ev.velocity) * ev.brightness)))
  tone.frequency.setValueAtTime(open, t)
  tone.frequency.setTargetAtTime(closed, t + 0.02, 0.45)

  const amp = ctx.createGain()
  // 낮은 음은 조금 작게: 낮은 소리가 오래 남으면 '웅' 하고 울린다
  const low = ev.midi < 52 ? 0.6 + (0.4 * Math.max(0, ev.midi - 38)) / 14 : 1
  const peak = PIANO_PEAK * ev.velocity ** 1.5 * low
  // 울림이 남는 시간: 도3(48) 아래는 1.8초, 높은 음일수록 짧아진다
  const ring = Math.min(1.8, 2.2 * 2 ** (-(ev.midi - 48) / 24))
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(peak, t + 0.008)
  amp.gain.setTargetAtTime(peak * 0.45, t + 0.008, 0.16)
  if (release > t + 0.35) amp.gain.setTargetAtTime(0, t + 0.35, ring)
  // 페달을 떼면 부드럽게 멎는다
  amp.gain.setTargetAtTime(0, release, 0.12)

  const pan1 = panner(ctx, Math.max(-0.3, Math.min(0.3, (ev.midi - 62) / 48)))
  const send = ctx.createGain()
  send.gain.value = 0.5
  osc.connect(tone)
  tone.connect(amp)
  amp.connect(pan1)
  pan1.connect(buses.dry)
  pan1.connect(send)
  send.connect(buses.send)

  osc.start(t)
  osc.stop(release + 0.7)
  cleanupAfter(osc, [tone, amp, pan1, send])
}

function renderCrickets(
  ctx: BaseAudioContext,
  buses: Buses,
  ev: Extract<AmbientEvent, { kind: 'crickets' }>,
  rng: () => number,
) {
  const t = ev.time
  const end = t + ev.duration
  const osc = ctx.createOscillator()
  osc.frequency.value = ev.freq
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  const pan1 = panner(ctx, ev.pan)
  const send = ctx.createGain()
  send.gain.value = 0.3
  osc.connect(amp)
  amp.connect(pan1)
  pan1.connect(buses.dry)
  pan1.connect(send)
  send.connect(buses.send)

  // 찌르르: 짧은 떨림 3번이 한 번의 울음. 노래 처음과 끝은 작게.
  for (let chirp = t + 0.2; chirp < end - 0.3; chirp += ev.chirpEvery * (0.92 + rng() * 0.16)) {
    const song = Math.sin((Math.PI * (chirp - t)) / ev.duration)
    const peak = CRICKET_PEAK * ev.level * Math.max(0.15, song)
    for (let p = 0; p < 3; p++) {
      const s = chirp + p * 0.042
      amp.gain.setValueAtTime(0, s)
      amp.gain.linearRampToValueAtTime(peak, s + 0.005)
      amp.gain.linearRampToValueAtTime(peak * 0.8, s + 0.016)
      amp.gain.linearRampToValueAtTime(0, s + 0.024)
    }
  }
  osc.start(t)
  osc.stop(end)
  cleanupAfter(osc, [amp, pan1, send])
}

/** 작곡된 소리 하나를 실제 소리로 만든다 */
export function renderAmbientEvent(ctx: BaseAudioContext, ev: AmbientEvent, buses: Buses, rng: () => number) {
  if (ev.kind === 'piano') renderPiano(ctx, buses, ev)
  else if (ev.kind === 'bell') renderBell(ctx, buses, ev.time, ev.midi, ev.level, ev.pan)
  else renderCrickets(ctx, buses, ev, rng)
}
