// 배경음 작곡 규칙 — 소리를 직접 내지 않고 "언제 어떤 음을 낼지"만 정한다.
// 매번 화음 순서와 종소리가 무작위로 바뀌어, 같은 구간이 반복되지 않는다.
// (소리를 실제로 만드는 부분은 render.ts)

import type { DayPhase } from '../skyScene'

/** MIDI 음 번호 → 주파수(Hz). 69 = 라(A4) = 440Hz */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export type AmbientEvent =
  | {
      kind: 'chord'
      time: number
      duration: number
      /** 화음 구성음 (MIDI) */
      notes: number[]
      /** 아주 작게 깔리는 낮은 음 (MIDI) */
      bass: number
      /** 밝기: 낮을수록 부드럽고 어둡다 (Hz) */
      cutoff: number
      level: number
    }
  | { kind: 'bell'; time: number; midi: number; level: number; pan: number }
  | { kind: 'crickets'; time: number; duration: number; freq: number; pan: number; level: number; chirpEvery: number }

type PhaseStyle = {
  cutoff: number
  padLevel: number
  /** 종소리 사이 간격(초) */
  bellGap: [number, number]
  bellLevel: number
  /** 종소리가 한 옥타브 위에서 날 확률 */
  bellOctaveUp: number
  /** 밤에만 풀벌레 소리 */
  crickets: boolean
  /** 바람결 같은 아주 작은 바탕 소리 */
  air: number
}

export const PHASE_STYLE: Record<DayPhase, PhaseStyle> = {
  night: { cutoff: 850, padLevel: 1, bellGap: [5.5, 11], bellLevel: 0.8, bellOctaveUp: 0, crickets: true, air: 1 },
  dusk: { cutoff: 1050, padLevel: 1, bellGap: [5, 10], bellLevel: 0.85, bellOctaveUp: 0.1, crickets: false, air: 0.8 },
  dawn: { cutoff: 1250, padLevel: 0.9, bellGap: [4.5, 9], bellLevel: 0.9, bellOctaveUp: 0.3, crickets: false, air: 0.6 },
  day: { cutoff: 1500, padLevel: 0.85, bellGap: [4, 8], bellLevel: 0.9, bellOctaveUp: 0.4, crickets: false, air: 0.5 },
}

/** 다 장조 / 가 단조 안의 부드러운 화음들 (C3~B4 사이) */
export const CHORDS: { name: string; notes: number[]; bass: number }[] = [
  { name: 'Am9', notes: [57, 60, 64, 71], bass: 45 },
  { name: 'Fmaj7', notes: [53, 57, 60, 64], bass: 41 },
  { name: 'Cmaj7', notes: [55, 60, 64, 71], bass: 48 },
  { name: 'Em7', notes: [52, 55, 59, 62], bass: 40 },
  { name: 'Dm9', notes: [50, 53, 57, 64], bass: 38 },
  { name: 'G6', notes: [55, 59, 62, 64], bass: 43 },
]

/** 다음에 올 수 있는 화음 (같은 화음이 연달아 오지 않는다) */
export const NEXT_CHORD: number[][] = [
  [1, 3, 4],
  [2, 5, 0],
  [1, 3, 5],
  [1, 4, 0],
  [5, 2, 1],
  [2, 0, 3],
]

/** 종소리 음: 다 장조 5음 음계 (어떤 화음 위에서도 잘 어울린다) */
export const BELL_NOTES = [72, 74, 76, 79, 81, 84]

export type ComposerState = {
  chord: number
  nextChord: number
  nextBell: number
  nextCricket: [number, number]
  lastBell: number
}

export function initialState(start: number): ComposerState {
  return { chord: 0, nextChord: start, nextBell: start + 2.5, nextCricket: [start + 3, start + 9], lastBell: -1 }
}

const between = (rng: () => number, a: number, b: number) => a + rng() * (b - a)
const pick = <T,>(rng: () => number, items: T[]): T => items[Math.floor(rng() * items.length) % items.length]

/**
 * until(초)까지 아직 정하지 않은 소리들을 정한다. state 는 이어서 쓸 수 있게 갱신된다.
 * 시간대(phase)가 바뀌면 그 뒤에 새로 정하는 소리부터 분위기가 바뀐다.
 */
export function compose(state: ComposerState, until: number, phase: DayPhase, rng: () => number): AmbientEvent[] {
  const style = PHASE_STYLE[phase]
  const events: AmbientEvent[] = []

  // 화음: 11~14초씩, 앞뒤 4초가 겹치며 천천히 바뀐다
  while (state.nextChord < until) {
    const chord = CHORDS[state.chord]
    const duration = between(rng, 11, 14)
    events.push({
      kind: 'chord',
      time: state.nextChord,
      duration,
      notes: chord.notes,
      bass: chord.bass,
      cutoff: style.cutoff * between(rng, 0.9, 1.1),
      level: style.padLevel,
    })
    state.nextChord += duration - 4
    state.chord = pick(rng, NEXT_CHORD[state.chord])
  }

  // 종소리: 가끔 한 음, 가끔 두세 음의 짧은 선율
  while (state.nextBell < until) {
    const roll = rng()
    const count = roll < 0.6 ? 1 : roll < 0.85 ? 2 : 3
    let time = state.nextBell
    for (let i = 0; i < count; i++) {
      let note = pick(rng, BELL_NOTES)
      if (note === state.lastBell) note = BELL_NOTES[(BELL_NOTES.indexOf(note) + 2) % BELL_NOTES.length]
      state.lastBell = note
      events.push({
        kind: 'bell',
        time,
        midi: note + (rng() < style.bellOctaveUp ? 12 : 0),
        level: style.bellLevel * between(rng, 0.7, 1) * (i === 0 ? 1 : 0.8),
        pan: between(rng, -0.6, 0.6),
      })
      time += between(rng, 0.3, 0.5)
    }
    state.nextBell += between(rng, style.bellGap[0], style.bellGap[1]) + (count - 1) * 0.4
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
