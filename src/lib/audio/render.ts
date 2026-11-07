// 소리를 실제로 만드는 부분 (Web Audio).
// AudioContext 와 OfflineAudioContext 둘 다에서 동작해서, 미리듣기 파일도 같은 코드로 만든다.

import { midiToFreq, type AmbientEvent } from './composer'

/** 소리가 흘러갈 길: 그대로 나가는 길(dry)과 울림(리버브)으로 가는 길(send) */
export type Buses = { dry: AudioNode; send: AudioNode; noise: AudioBuffer }

// 소리 크기 기준값. 배경음은 아주 작게 깔리도록 맞췄다.
const PAD_PEAK = 0.022
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

/** 끊김 없이 반복되는 낮은 바람결 소리 (갈색 잡음, 끝과 시작을 부드럽게 이어 붙임) */
export function makeAirLoop(ctx: BaseAudioContext, seconds: number, rng: () => number): AudioBuffer {
  const rate = ctx.sampleRate
  const fade = Math.floor(rate * 0.25)
  const length = Math.floor(rate * seconds)
  const raw = new Float32Array(length + fade)
  let value = 0
  let peak = 0
  for (let i = 0; i < raw.length; i++) {
    value = value * 0.995 + (rng() * 2 - 1) * 0.05
    raw[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  const buffer = ctx.createBuffer(1, length, rate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = raw[i] / (peak || 1)
  // 끝부분을 처음 부분에 겹쳐 섞어서 반복 지점에서 '틱' 소리가 나지 않게 한다
  for (let i = 0; i < fade; i++) {
    const a = i / fade
    data[i] = (raw[i] * Math.sqrt(a) + raw[length + i] * Math.sqrt(1 - a)) / (peak || 1)
  }
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

function renderChord(ctx: BaseAudioContext, buses: Buses, ev: Extract<AmbientEvent, { kind: 'chord' }>) {
  const t = ev.time
  const end = t + ev.duration
  const peak = PAD_PEAK * ev.level

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.6
  filter.frequency.setValueAtTime(ev.cutoff * 0.55, t)
  filter.frequency.linearRampToValueAtTime(ev.cutoff, t + ev.duration * 0.45)
  filter.frequency.linearRampToValueAtTime(ev.cutoff * 0.65, end)

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0, t)
  amp.gain.linearRampToValueAtTime(peak, t + 3.5)
  amp.gain.setValueAtTime(peak, end - 4.5)
  amp.gain.linearRampToValueAtTime(0, end)

  const send = ctx.createGain()
  send.gain.value = 0.45
  filter.connect(amp)
  amp.connect(buses.dry)
  amp.connect(send)
  send.connect(buses.send)

  const sources: OscillatorNode[] = []
  for (const note of ev.notes) {
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = midiToFreq(note)
      osc.detune.value = detune
      osc.connect(filter)
      sources.push(osc)
    }
  }
  const bass = ctx.createOscillator()
  bass.frequency.value = midiToFreq(ev.bass)
  const bassGain = ctx.createGain()
  bassGain.gain.value = 0.6
  bass.connect(bassGain)
  bassGain.connect(amp)
  sources.push(bass)

  for (const source of sources) {
    source.start(t)
    source.stop(end + 0.1)
  }
  cleanupAfter(bass, [bassGain, filter, amp, send])
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
  if (ev.kind === 'chord') renderChord(ctx, buses, ev)
  else if (ev.kind === 'bell') renderBell(ctx, buses, ev.time, ev.midi, ev.level, ev.pan)
  else renderCrickets(ctx, buses, ev, rng)
}
