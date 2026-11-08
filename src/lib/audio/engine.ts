// 소리 엔진 — 브라우저 하나에 하나만 둔다.
// 배경음과 효과음이 같은 울림(리버브)과 소리 크기 조절기를 함께 쓴다.
// 브라우저 정책상 사용자가 화면을 한 번 누른 뒤에만 소리가 날 수 있다.

import type { DayPhase } from '../skyScene'
import { catchUp, compose, initialState, type ComposerState } from './composer'
import { makeImpulse, makeNoise, renderAmbientEvent, type Buses } from './render'
import { scheduleSfx, type SfxKind } from './sfx'

type Engine = {
  ctx: AudioContext
  sfx: Buses
  /** 배경음 전체 볼륨 (다른 탭으로 갈 때 함께 줄어드는 두 볼륨: 그대로 나가는 소리 / 울림으로 가는 소리) */
  musicDry: GainNode
  musicSend: GainNode
  noise: AudioBuffer
}

/** 배경음을 한 번 켤 때마다 새로 만드는 길. 끄면 이 길을 끊어서, 미리 정해 둔 음까지 깔끔하게 멈춘다 */
type MusicSession = { dry: GainNode; send: GainNode }

const MUSIC_LEVEL = 0.75
/** 배경음을 얼마나 앞서 미리 정해 둘지(초) */
const LOOKAHEAD = 3

let engine: Engine | null = null
let musicTimer: number | undefined
let composer: ComposerState | null = null
let session: MusicSession | null = null
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

    // 울림에는 낮은 소리를 보내지 않는다 (낮은 울림이 쌓이면 '웅웅' 뭉개진다)
    const reverbInput = ctx.createBiquadFilter()
    reverbInput.type = 'highpass'
    reverbInput.frequency.value = 220
    const reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(ctx, 3.2, Math.random)
    const reverbReturn = ctx.createGain()
    reverbReturn.gain.value = 0.8
    reverbInput.connect(reverb)
    reverb.connect(reverbReturn)
    reverbReturn.connect(limiter)

    const noise = makeNoise(ctx, 1.5, Math.random)

    const sfxDry = ctx.createGain()
    sfxDry.gain.value = 1.4
    sfxDry.connect(limiter)
    const sfxSend = ctx.createGain()
    sfxSend.connect(reverbInput)

    // 배경음의 아주 낮은 소리(100Hz 아래)는 덜어 낸다. 휴대폰에선 어차피 안 들리고, 이어폰에선 웅웅거린다
    const musicClean = ctx.createBiquadFilter()
    musicClean.type = 'highpass'
    musicClean.frequency.value = 100
    musicClean.connect(limiter)
    const musicDry = ctx.createGain()
    musicDry.gain.value = MUSIC_LEVEL
    musicDry.connect(musicClean)
    const musicSend = ctx.createGain()
    musicSend.gain.value = MUSIC_LEVEL
    musicSend.connect(reverbInput)

    return { ctx, sfx: { dry: sfxDry, send: sfxSend, noise }, musicDry, musicSend, noise }
  } catch {
    return null
  }
}

function ensureEngine(): Engine | null {
  if (typeof window === 'undefined') return null
  if (!engine) engine = createEngine()
  return engine
}

// ── 아이폰 대응 ─────────────────────────────────────────────

/** 사파리(아이폰)에만 있는 '소리 종류' 설정 */
type AudioSessionLike = { type: string }
let playbackSession = false

/**
 * 아이폰은 '무음 모드'일 때 웹에서 만든 소리(Web Audio)를 알림음처럼 취급해서 꺼 버린다.
 * 사용자가 소리를 켜 둔 동안에는 음악 앱처럼 '재생' 소리라고 알려서, 무음 모드에서도 들리게 한다.
 * 소리를 모두 끄면 원래대로(auto) 돌려 놓는다.
 * 사파리 16.4 이상에만 있는 설정이라, 다른 브라우저(안드로이드 등)에서는 아무 일도 하지 않는다.
 */
export function setPlaybackSession(on: boolean): void {
  if (playbackSession === on || typeof navigator === 'undefined') return
  const audioSession = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession
  if (!audioSession) return
  try {
    audioSession.type = on ? 'playback' : 'auto'
    playbackSession = on
  } catch {
    // 바꿀 수 없으면 그대로 둔다
  }
}

/**
 * 브라우저가 '사용자가 직접 한 동작'으로 인정해서 소리를 허락하는 순간들.
 * 아이폰은 손가락을 뗄 때(touchend)와 클릭만 인정하고, 손가락을 대는 순간(pointerdown)은 인정하지 않는다.
 */
const GESTURE_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const

/** 사용자가 화면을 누를 때마다 handler 를 부른다. 돌려받은 함수를 부르면 그만 듣는다 */
export function onUserGesture(handler: () => void): () => void {
  // capture: 화면의 다른 요소가 이벤트를 멈추더라도(stopPropagation) 먼저 듣는다
  for (const type of GESTURE_EVENTS) window.addEventListener(type, handler, { capture: true, passive: true })
  return () => {
    for (const type of GESTURE_EVENTS) window.removeEventListener(type, handler, { capture: true })
  }
}

let primed = false

/**
 * 사용자가 화면을 누를 때 불러서 소리를 낼 수 있는 상태로 만든다.
 * 아이폰은 이 순간에만 소리를 허락하므로, 소리 장치를 깨우고 아주 짧은 무음을 한 번 재생한다.
 * (전화·잠금 화면 뒤에 아이폰이 소리 장치를 멈춰 두었을 때도 다시 깨운다)
 */
export function unlockAudio(): void {
  const e = ensureEngine()
  if (!e || (primed && e.ctx.state === 'running')) return
  try {
    void e.ctx.resume().catch(() => {})
    const silent = e.ctx.createBuffer(1, 1, 22050)
    const source = e.ctx.createBufferSource()
    source.buffer = silent
    source.connect(e.ctx.destination)
    source.start(0)
    primed = true
  } catch {
    // 무시
  }
}

export function playSfx(kind: SfxKind): void {
  const e = ensureEngine()
  if (!e) return
  try {
    // 효과음은 사용자가 켜 둔 경우에만 불린다 → 아이폰 무음 모드에서도 들리게
    setPlaybackSession(true)
    if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => {})
    scheduleSfx(kind, e.ctx, e.sfx, e.ctx.currentTime + 0.01, Math.random)
  } catch {
    // 소리를 낼 수 없는 환경이면 조용히 넘어간다
  }
}

/** 다른 탭으로 갈 때·돌아올 때 배경음 전체를 천천히 줄이거나 키운다 */
function fadeMaster(e: Engine, to: number, seconds: number) {
  const now = e.ctx.currentTime
  for (const node of [e.musicDry, e.musicSend]) {
    node.gain.cancelScheduledValues(now)
    node.gain.setValueAtTime(node.gain.value, now)
    node.gain.linearRampToValueAtTime(to, now + seconds)
  }
}

function openSession(e: Engine): MusicSession {
  const now = e.ctx.currentTime
  const dry = e.ctx.createGain()
  const send = e.ctx.createGain()
  for (const node of [dry, send]) {
    node.gain.setValueAtTime(0, now)
    node.gain.linearRampToValueAtTime(1, now + 3)
  }
  dry.connect(e.musicDry)
  send.connect(e.musicSend)
  return { dry, send }
}

/** 천천히 작아지게 한 뒤 길을 끊는다. 이미 정해 둔 음들도 함께 멈춘다 */
function closeSession(e: Engine, s: MusicSession, seconds: number) {
  const now = e.ctx.currentTime
  for (const node of [s.dry, s.send]) {
    node.gain.cancelScheduledValues(now)
    node.gain.setValueAtTime(node.gain.value, now)
    node.gain.linearRampToValueAtTime(0, now + seconds)
  }
  window.setTimeout(() => {
    s.dry.disconnect()
    s.send.disconnect()
  }, (seconds + 0.2) * 1000)
}

function scheduleMusic() {
  const e = engine
  if (!e || !composer || !session || !musicOn) return
  const now = e.ctx.currentTime
  catchUp(composer, now)
  const buses: Buses = { dry: session.dry, send: session.send, noise: e.noise }
  for (const event of compose(composer, now + LOOKAHEAD, musicPhase, Math.random)) {
    try {
      renderAmbientEvent(e.ctx, event, buses, Math.random)
    } catch {
      // 음 하나를 못 만들어도 나머지 음악은 계속 흐르게 한다
    }
  }
}

/** 배경음 켜기 (이미 켜져 있으면 그대로) */
export function startMusic(phase: DayPhase): void {
  musicPhase = phase
  const e = ensureEngine()
  if (!e || musicOn) return
  musicOn = true
  setPlaybackSession(true)
  if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => {})
  session = openSession(e)
  composer = initialState(e.ctx.currentTime + 0.1)
  scheduleMusic()
  window.clearInterval(musicTimer)
  musicTimer = window.setInterval(scheduleMusic, 500)
}

/** 배경음 끄기: 천천히 작아지며 멈춘다 */
export function stopMusic(): void {
  musicOn = false
  window.clearInterval(musicTimer)
  composer = null
  const e = engine
  const s = session
  session = null
  if (e && s) closeSession(e, s, 1.2)
}

/** 시간대가 바뀌면 다음 화음부터 분위기를 바꾼다 */
export function setMusicPhase(phase: DayPhase): void {
  musicPhase = phase
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
      fadeMaster(e, 0, 0.4)
      window.setTimeout(() => {
        if (document.visibilityState === 'hidden') void e.ctx.suspend().catch(() => {})
      }, 500)
    } else {
      // 볼륨은 바로 되돌려 둔다. 아이폰이 화면을 누르기 전까지 소리 장치를 깨워 주지 않더라도,
      // 다음에 누르는 순간(unlockAudio) 원래 크기로 다시 들린다.
      fadeMaster(e, MUSIC_LEVEL, 1.5)
      if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => {})
    }
  })
}
