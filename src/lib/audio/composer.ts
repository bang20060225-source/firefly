// 배경음 작곡 규칙 — 소리를 직접 내지 않고 "언제 어떤 음을 낼지"만 정한다.
// 부드러운 피아노가 화음을 천천히 펼쳐 치고, 가끔 짧은 선율과 오르골 같은 반짝임이 얹힌다.
// 밤에는 풀벌레가 조금 운다. 화음 진행·반주·선율이 매번 무작위로 골라져서 같은 구간이 그대로 반복되지 않는다.
// (소리를 실제로 만드는 부분은 render.ts)

import type { DayPhase } from '../skyScene'

/** MIDI 음 번호 → 주파수(Hz). 69 = 라(A4) = 440Hz */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export type PianoEvent = {
  kind: 'piano'
  time: number
  midi: number
  /** 건반을 누르는 세기 0~1 */
  velocity: number
  /** 페달을 뗄 때까지의 길이(초). 그 전에 소리가 자연스럽게 작아진다 */
  duration: number
  /** 음색 밝기 (1 = 기본, 작을수록 포근하고 어둡다) */
  brightness: number
}

export type AmbientEvent =
  | PianoEvent
  | { kind: 'bell'; time: number; midi: number; level: number; pan: number }
  | { kind: 'crickets'; time: number; duration: number; freq: number; pan: number; level: number; chirpEvery: number }

type PhaseStyle = {
  /** 빠르기 (1분에 몇 박) */
  tempo: number
  /** 피아노 음색 밝기 */
  brightness: number
  /** 화음을 흐르듯 펼쳐 치는 구간이 나올 확률 (나머지는 여백이 많은 반주) */
  flowing: number
  /** 화음마다 짧은 선율이 얹힐 확률 */
  melody: number
  /** 화음마다 오르골 반짝임이 날 확률 */
  sparkle: number
  /** 밤에만 풀벌레 소리 */
  crickets: boolean
}

export const PHASE_STYLE: Record<DayPhase, PhaseStyle> = {
  night: { tempo: 56, brightness: 0.78, flowing: 0.3, melody: 0.4, sparkle: 0.35, crickets: true },
  dusk: { tempo: 60, brightness: 0.88, flowing: 0.5, melody: 0.5, sparkle: 0.4, crickets: false },
  dawn: { tempo: 62, brightness: 0.95, flowing: 0.55, melody: 0.55, sparkle: 0.45, crickets: false },
  day: { tempo: 66, brightness: 1.05, flowing: 0.65, melody: 0.6, sparkle: 0.5, crickets: false },
}

/** 다 장조의 맑은 5음 (도 레 미 솔 라). 선율과 오르골이 어떤 화음 위에서도 부딪히지 않게 한다 */
export const PENTATONIC = [0, 2, 4, 7, 9]
/** 다 장조 음계 (피아노는 이 안의 음만 친다) */
export const C_MAJOR = [0, 2, 4, 5, 7, 9, 11]

export type ChordName = 'C' | 'Am' | 'F' | 'G' | 'Em' | 'Dm' | 'C/E'

/**
 * 화음: 낮은 근음부터 위로 넓게 펼친 6개의 음(MIDI)과, 선율이 머물기 좋은 화음 구성음(음 이름 0~11).
 * 9도 음을 섞어 포근하고 맑게 울리도록 했다.
 */
export const CHORDS: Record<ChordName, { voicing: number[]; tones: number[] }> = {
  C: { voicing: [48, 55, 62, 64, 67, 71], tones: [0, 2, 4, 7, 11] },
  Am: { voicing: [45, 52, 57, 60, 64, 71], tones: [9, 0, 4, 7, 11] },
  F: { voicing: [41, 48, 55, 57, 60, 64], tones: [5, 9, 0, 4, 7] },
  G: { voicing: [43, 50, 57, 59, 62, 67], tones: [7, 11, 2, 9] },
  Em: { voicing: [40, 47, 55, 59, 62, 67], tones: [4, 7, 11, 2] },
  Dm: { voicing: [38, 45, 53, 57, 60, 64], tones: [2, 5, 9, 0, 4] },
  'C/E': { voicing: [40, 48, 55, 60, 64, 67], tones: [0, 4, 7, 2] },
}

/** 화음 진행 (네 화음이 한 구간). 다 장조에서 편안하게 들리는 진행들 */
export const PROGRESSIONS: ChordName[][] = [
  ['F', 'G', 'Em', 'Am'],
  ['C', 'G', 'Am', 'F'],
  ['Am', 'F', 'C', 'G'],
  ['F', 'C/E', 'Dm', 'G'],
  ['Dm', 'G', 'C', 'Am'],
  ['F', 'Em', 'Dm', 'C'],
]

/** 화음 하나는 2마디(8박) 동안 울린다 */
const BEATS_PER_CHORD = 8

/** 흐르듯 펼쳐 치기: 한 마디에 8분음표 8개. 숫자는 위 voicing 의 몇 번째 음인지 */
const FLOW_PATTERNS: number[][] = [
  [0, 1, 2, 3, 4, 3, 2, 1],
  [0, 1, 2, 3, 5, 4, 3, 2],
  [0, 2, 1, 3, 2, 4, 3, 5],
]
/** 한 마디 안에서 박마다 누르는 세기 (첫 박이 가장 크다) */
const FLOW_ACCENT = [0.7, 0.42, 0.5, 0.42, 0.56, 0.4, 0.46, 0.38]

/** 여백이 많은 반주: [박, voicing 번호들, 세기, 화음을 살짝 흩어 치는지] */
type Hit = [beat: number, notes: number[], velocity: number, roll: boolean]
const GENTLE_PATTERNS: Hit[][] = [
  [
    [0, [0, 1], 0.6, false],
    [2, [3, 4, 5], 0.42, true],
    [4, [2], 0.5, false],
    [6, [4, 5], 0.4, true],
  ],
  [
    [0, [0], 0.62, false],
    [1, [1], 0.42, false],
    [2, [3, 4, 5], 0.44, true],
    [5, [2], 0.42, false],
    [6, [4], 0.4, false],
  ],
  [
    [0, [0, 1], 0.6, false],
    [3, [3, 4], 0.42, true],
    [4, [2], 0.48, false],
    [6, [3, 5], 0.4, true],
  ],
]

/** 선율의 리듬: [시작 박, 길이(박)]. 짧게 몇 음 부르고 길게 쉰다 */
const MELODY_RHYTHMS: [number, number][][] = [
  [
    [1, 1],
    [2, 1],
    [3, 3],
  ],
  [
    [0.5, 0.5],
    [1, 1],
    [2, 2],
    [4, 3],
  ],
  [
    [2, 1.5],
    [3.5, 0.5],
    [4, 4],
  ],
  [
    [0, 2],
    [2, 1],
    [3, 1],
    [4, 4],
  ],
  [
    [1.5, 0.5],
    [2, 2],
    [5, 3],
  ],
]

/** 선율이 노는 음역 (솔4 ~ 레6). 휴대폰 스피커로도 또렷하게 들린다 */
const MELODY_LOW = 67
const MELODY_HIGH = 86
/** 구간 안에서 화음마다 살짝 커졌다가 작아지는 세기 */
const SECTION_SWELL = [0.92, 1, 1.04, 0.95]

export type ComposerState = {
  /** 다음 화음이 시작하는 시각(초) */
  nextChord: number
  /** 지금 구간의 화음 진행 (PROGRESSIONS 번호, 아직 없으면 -1) */
  progression: number
  /** 진행 안에서 몇 번째 화음인지 */
  step: number
  /** 이 구간이 흐르듯 펼쳐 치는 반주인지 */
  flowing: boolean
  pattern: number
  /** 구간 안에서 반복되는 선율의 리듬과 오르내림 (반복이 있어야 노래처럼 들린다) */
  rhythm: number
  contour: number[]
  /** 마지막 선율 음 (MIDI) */
  lastMelody: number
  lastChord: ChordName | null
  nextCricket: [number, number]
}

export function initialState(start: number): ComposerState {
  return {
    nextChord: start,
    progression: -1,
    step: 0,
    flowing: false,
    pattern: 0,
    rhythm: 0,
    contour: [],
    lastMelody: 72,
    lastChord: null,
    nextCricket: [start + 4, start + 11],
  }
}

const between = (rng: () => number, a: number, b: number) => a + rng() * (b - a)
const pickIndex = (rng: () => number, length: number) => Math.min(length - 1, Math.floor(rng() * length))
const pick = <T,>(rng: () => number, items: T[]): T => items[pickIndex(rng, items.length)]
const pitchClass = (midi: number) => ((midi % 12) + 12) % 12

/**
 * 다음 구간의 화음 진행을 고른다.
 * 방금 들은 진행은 피하고, 앞 화음과 같은 화음으로 시작하는 진행도 피한다 (같은 화음이 연달아 나오지 않게).
 */
export function pickProgression(current: number, lastChord: ChordName | null, rng: () => number): number {
  const options = PROGRESSIONS.map((_, i) => i).filter((i) => i !== current && PROGRESSIONS[i][0] !== lastChord)
  return pick(rng, options)
}

/** 선율에 쓸 수 있는 음들 (5음 + 지금 화음의 구성음), 낮은 음부터 */
function melodyScale(tones: number[]): number[] {
  const allowed = new Set([...PENTATONIC, ...tones])
  const notes: number[] = []
  for (let midi = MELODY_LOW; midi <= MELODY_HIGH; midi++) if (allowed.has(pitchClass(midi))) notes.push(midi)
  return notes
}

/**
 * 가장 가까운 화음 구성음 (선율의 시작과 끝, 센 박은 화음 안의 음에 머문다).
 * avoid(바로 앞 음)와 같은 음은 고르지 않고, 거리가 같으면 선율이 가던 쪽(direction)을 고른다.
 */
function nearestChordTone(midi: number, tones: number[], avoid: number | null = null, direction = 0): number {
  let best = midi
  let bestScore = Infinity
  for (let candidate = MELODY_LOW; candidate <= MELODY_HIGH; candidate++) {
    if (!tones.includes(pitchClass(candidate)) || candidate === avoid) continue
    const offset = candidate - midi
    const score = Math.abs(offset) + (direction !== 0 && Math.sign(offset) !== Math.sign(direction) ? 0.5 : 0)
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

function startSection(state: ComposerState, style: PhaseStyle, rng: () => number) {
  state.progression = pickProgression(state.progression, state.lastChord, rng)
  state.flowing = rng() < style.flowing
  state.pattern = pickIndex(rng, state.flowing ? FLOW_PATTERNS.length : GENTLE_PATTERNS.length)
  state.rhythm = pickIndex(rng, MELODY_RHYTHMS.length)
  // 선율의 오르내림: 대부분 한 칸씩 움직이고 가끔 두 칸 (같은 음에 머무르지 않는다)
  state.contour = MELODY_RHYTHMS[state.rhythm].slice(1).map(() => pick(rng, [-2, -1, -1, 1, 1, 2]))
}

/**
 * 화음이 바뀌면 페달을 바꾸듯 앞의 음들을 멈춘다. (멈출 때도 0.1초쯤 부드럽게 잦아든다)
 * 같은 음을 다시 치면 앞 소리는 그때 멈춘다 (진짜 피아노 줄처럼 소리가 쌓이지 않게).
 */
function applyPedal(notes: PianoEvent[], chordEnd: number): PianoEvent[] {
  notes.sort((a, b) => a.time - b.time)
  // 거의 동시에 같은 음을 두 번 치게 되면 하나로 합친다
  const merged: PianoEvent[] = []
  for (const note of notes) {
    const twin = merged.find((other) => other.midi === note.midi && note.time - other.time < 0.1)
    if (twin) twin.velocity = Math.max(twin.velocity, note.velocity)
    else merged.push(note)
  }
  merged.forEach((note, i) => {
    const again = merged.slice(i + 1).find((other) => other.midi === note.midi)
    note.duration = again ? again.time - note.time : Math.min(note.duration, chordEnd - note.time)
  })
  return merged
}

/**
 * until(초)까지 아직 정하지 않은 소리들을 정한다. state 는 이어서 쓸 수 있게 갱신된다.
 * 시간대(phase)가 바뀌면 그 뒤에 새로 정하는 화음부터 빠르기와 분위기가 바뀐다.
 */
export function compose(state: ComposerState, until: number, phase: DayPhase, rng: () => number): AmbientEvent[] {
  const style = PHASE_STYLE[phase]
  const events: AmbientEvent[] = []
  const human = () => between(rng, -0.012, 0.012)

  while (state.nextChord < until) {
    if (state.step === 0 || state.progression < 0) {
      state.step = 0
      startSection(state, style, rng)
    }
    const name = PROGRESSIONS[state.progression][state.step]
    const chord = CHORDS[name]
    const beat = 60 / style.tempo
    const start = state.nextChord
    const end = start + BEATS_PER_CHORD * beat
    const swell = SECTION_SWELL[state.step % SECTION_SWELL.length]
    const brightness = () => style.brightness * between(rng, 0.94, 1.06)
    const notes: PianoEvent[] = []
    const play = (time: number, midi: number, velocity: number) =>
      notes.push({
        kind: 'piano',
        time: Math.max(start, time),
        midi,
        velocity: Math.min(1, velocity * swell * between(rng, 0.92, 1.08)),
        duration: end - time,
        brightness: brightness(),
      })

    // 반주
    if (state.flowing) {
      const pattern = FLOW_PATTERNS[state.pattern]
      for (let bar = 0; bar < 2; bar++) {
        // 두 번째 마디는 가끔 끝의 두 음을 쉬어서 숨 쉴 틈을 만든다
        const length = bar === 1 && rng() < 0.3 ? 6 : 8
        for (let i = 0; i < length; i++) {
          play(start + (bar * 4 + i / 2) * beat + human(), chord.voicing[pattern[i]], FLOW_ACCENT[i] * (bar === 1 ? 0.94 : 1))
        }
      }
    } else {
      for (const [at, indexes, velocity, roll] of GENTLE_PATTERNS[state.pattern]) {
        indexes.forEach((index, k) => {
          // 흩어 치는 화음은 아래 음부터 45ms 간격으로
          play(start + at * beat + (roll ? k * 0.045 : k * 0.012) + human(), chord.voicing[index], velocity)
        })
      }
    }

    // 선율: 구간 안에서 같은 리듬·같은 오르내림을 화음에 맞춰 되풀이한다
    if (rng() < style.melody) {
      const scale = melodyScale(chord.tones)
      const rhythm = MELODY_RHYTHMS[state.rhythm]
      let note = nearestChordTone(state.lastMelody, chord.tones)
      rhythm.forEach(([at, length], i) => {
        const previous = note
        const step = i > 0 ? (state.contour[i - 1] ?? 1) : 0
        if (i > 0) {
          let index = scale.indexOf(note) + step
          // 음역 끝에 닿으면 반대쪽으로 움직인다
          if (index < 0 || index >= scale.length) index = scale.indexOf(note) - step
          note = scale[Math.max(0, Math.min(scale.length - 1, index))]
        }
        const strong = at === 0 || at === 4 || i === rhythm.length - 1
        if (strong) note = nearestChordTone(note, chord.tones, i > 0 ? previous : null, step)
        const time = start + at * beat + 0.015 + human()
        notes.push({
          kind: 'piano',
          time,
          midi: note,
          velocity: Math.min(1, between(rng, 0.5, 0.6) * swell),
          duration: length * beat + 0.3,
          brightness: brightness() * 1.05,
        })
      })
      state.lastMelody = note
    }

    events.push(...applyPedal(notes, end))

    // 오르골 반짝임: 두 번째 마디에 높은 음 한두 개 (반딧불이가 반짝이듯)
    if (rng() < style.sparkle) {
      const roll = rng()
      const count = roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3
      const choices: number[] = []
      for (let midi = 84; midi <= 96; midi++) {
        if (PENTATONIC.includes(pitchClass(midi)) && chord.tones.includes(pitchClass(midi))) choices.push(midi)
      }
      let index = pickIndex(rng, choices.length)
      const direction = rng() < 0.5 ? -1 : 1
      let at = pick(rng, [4.5, 5, 5.5, 6])
      for (let i = 0; i < count && choices.length > 0; i++) {
        events.push({
          kind: 'bell',
          time: start + at * beat + human(),
          midi: choices[index],
          level: between(rng, 0.6, 0.85) * (i === 0 ? 1 : 0.8),
          pan: between(rng, -0.6, 0.6),
        })
        index = Math.max(0, Math.min(choices.length - 1, index + direction))
        at += 0.5
      }
    }

    state.lastChord = name
    state.nextChord = end
    state.step = (state.step + 1) % PROGRESSIONS[state.progression].length
  }

  // 풀벌레: 밤에만, 두 마리가 서로 다른 박자로 노래하다 쉬다 한다
  for (const s of [0, 1] as const) {
    while (state.nextCricket[s] < until) {
      if (!style.crickets) {
        state.nextCricket[s] += 5
        continue
      }
      const duration = between(rng, 9, 20)
      events.push({
        kind: 'crickets',
        time: state.nextCricket[s],
        duration,
        freq: between(rng, 4200, 4900),
        pan: s === 0 ? between(rng, -0.7, -0.2) : between(rng, 0.2, 0.7),
        level: between(rng, 0.7, 1),
        chirpEvery: between(rng, 0.85, 1.3),
      })
      state.nextCricket[s] += duration + between(rng, 6, 16)
    }
  }

  return events.sort((a, b) => a.time - b.time)
}

/**
 * 화면이 멈췄다 돌아오는 등으로 계획이 지금 시각보다 뒤처졌으면,
 * 밀린 소리를 한꺼번에 내지 않고 지금부터 새 구간으로 다시 시작한다.
 */
export function catchUp(state: ComposerState, now: number): void {
  if (state.nextChord < now) {
    state.nextChord = now + 0.2
    state.step = 0
  }
  state.nextCricket = [Math.max(state.nextCricket[0], now + 1), Math.max(state.nextCricket[1], now + 3)]
}
