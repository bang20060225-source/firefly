// 소리 엔진 — 브라우저 하나에 하나만 둔다.
// 배경음과 효과음이 같은 울림(리버브)과 소리 크기 조절기를 함께 쓴다.
// 브라우저 정책상 사용자가 화면을 한 번 누른 뒤에만 소리가 날 수 있다.

import type { DayPhase } from '../skyScene'
import { compose, initialState, PHASE_STYLE, type ComposerState } from './composer'
import { makeAirLoop, makeImpulse, makeNoise, renderAmbientEvent, type Buses } from './render'
import { scheduleSfx, type SfxKind } from './sfx'

type Engine = {
  ctx: AudioContext
  sfx: Buses
  music: Buses
  /** 배경음을 켜고 끌 때 함께 움직이는 두 볼륨 (그대로 나가는 소리 / 울림으로 가는 소리) */
  musicDry: GainNode
  musicSend: GainNode
  air: { source: AudioBufferSourceNode; gain: GainNode } | null
}

const MUSIC_LEVEL = 0.75
const AIR_LEVEL = 0.02

let engine: Engine | null = null
let musicTimer: number | undefined
let composer: ComposerState | null = null
let musicPhase: DayPhase = 'night'
let musicOn = false

function createEngine(): Engine | null {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()

    // 큰 소리가 갑자기 튀지 않도록 마지막에 소리 크기를 다듬는다
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -18
    limiter.knee.value = 12
    limiter.ratio.value = 3
    limiter.attack.value = 0.01
    limiter.release.value = 0.3
    limiter.connect(ctx.destination)

    const reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(ctx, 3.2, Math.random)
    const reverbReturn = ctx.createGain()
    reverbReturn.gain.value = 0.8
    reverb.connect(reverbReturn)
    reverbReturn.connect(limiter)

    const noise = makeNoise(ctx, 1.5, Math.random)

    const sfxDry = ctx.createGain()
    sfxDry.gain.value = 1.4
    sfxDry.connect(limiter)
    const sfxSend = ctx.createGain()
    sfxSend.connect(reverb)

    const musicDry = ctx.createGain()
    musicDry.gain.value = 0
    musicDry.connect(limiter)
    const musicSend = ctx.createGain()
    musicSend.gain.value = 0
    musicSend.connect(reverb)

    return {
      ctx,
      sfx: { dry: sfxDry, send: sfxSend, noise },
      music: { dry: musicDry, send: musicSend, noise },
      musicDry,
      musicSend,
      air: null,
    }
  } catch {
    return null
  }
}

function ensureEngine(): Engine | null {
  if (typeof window === 'undefined') return null
  if (!engine) engine = createEngine()
  return engine
}

/**
 * 사용자가 화면을 누를 때 불러서 소리를 낼 수 있는 상태로 만든다.
 * (iOS 사파리는 누르는 순간에만 소리를 허락하므로, 아주 짧은 무음을 한 번 재생한다)
 */
export function unlockAudio(): void {
  const e = ensureEngine()
  if (!e) return
  try {
    if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => {})
    const silent = e.ctx.createBuffer(1, 1, 22050)
    const source = e.ctx.createBufferSource()
    source.buffer = silent
    source.connect(e.ctx.destination)
    source.start(0)
  } catch {
    // 무시
  }
}

export function playSfx(kind: SfxKind): void {
  const e = ensureEngine()
  if (!e) return
  try {
    if (e.ctx.state === 'suspended') void e.ctx.resume().catch(() => {})
    scheduleSfx(kind, e.ctx, e.sfx, e.ctx.currentTime + 0.01, Math.random)
  } catch {
    // 소리를 낼 수 없는 환경이면 조용히 넘어간다
  }
}

function fadeMusic(e: Engine, to: number, seconds: number) {
  const now = e.ctx.currentTime
  for (const node of [e.musicDry, e.musicSend]) {
    node.gain.cancelScheduledValues(now)
    node.gain.setValueAtTime(node.gain.value, now)
    node.gain.linearRampToValueAtTime(to, now + seconds)
  }
}

function scheduleMusic() {
  const e = engine
  if (!e || !composer || !musicOn) return
  const events = compose(composer, e.ctx.currentTime + 3, musicPhase, Math.random)
  for (const event of events) renderAmbientEvent(e.ctx, event, e.music, Math.random)
}

function startAir(e: Engine) {
  if (e.air) return
  const source = e.ctx.createBufferSource()
  source.buffer = makeAirLoop(e.ctx, 8, Math.random)
  source.loop = true
  const filter = e.ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 450
  const gain = e.ctx.createGain()
  gain.gain.value = AIR_LEVEL * PHASE_STYLE[musicPhase].air
  source.connect(filter)
  filter.connect(gain)
  gain.connect(e.music.dry)
  source.start()
  e.air = { source, gain }
}

function stopAir(e: Engine, at: number) {
  if (!e.air) return
  e.air.source.stop(at)
  e.air = null
}

/** 배경음 켜기 (이미 켜져 있으면 그대로) */
export function startMusic(phase: DayPhase): void {
  musicPhase = phase
  const e = ensureEngine()
  if (!e || musicOn) return
  musicOn = true
  if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => {})
  composer = initialState(e.ctx.currentTime + 0.1)
  startAir(e)
  fadeMusic(e, MUSIC_LEVEL, 3)
  scheduleMusic()
  window.clearInterval(musicTimer)
  musicTimer = window.setInterval(scheduleMusic, 500)
}

/** 배경음 끄기: 천천히 작아지며 멈춘다 */
export function stopMusic(): void {
  const e = engine
  musicOn = false
  window.clearInterval(musicTimer)
  composer = null
  if (!e) return
  fadeMusic(e, 0, 1.2)
  stopAir(e, e.ctx.currentTime + 1.3)
}

/** 시간대가 바뀌면 다음 소리부터 분위기를 바꾼다 */
export function setMusicPhase(phase: DayPhase): void {
  musicPhase = phase
  const e = engine
  if (e?.air) e.air.gain.gain.setTargetAtTime(AIR_LEVEL * PHASE_STYLE[phase].air, e.ctx.currentTime, 2)
}

export function isMusicPlaying(): boolean {
  return musicOn
}

// 다른 앱이나 탭으로 가면 소리를 멈추고, 돌아오면 다시 낸다 (배터리와 주변을 배려)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const e = engine
    if (!e) return
    if (document.visibilityState === 'hidden') {
      if (musicOn) fadeMusic(e, 0, 0.4)
      window.setTimeout(() => {
        if (document.visibilityState === 'hidden') void e.ctx.suspend().catch(() => {})
      }, 500)
    } else {
      void e.ctx
        .resume()
        .then(() => {
          if (musicOn) fadeMusic(e, MUSIC_LEVEL, 1.5)
        })
        .catch(() => {})
    }
  })
}
