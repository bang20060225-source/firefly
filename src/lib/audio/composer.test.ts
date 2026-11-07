import { describe, expect, it } from 'vitest'
import {
  C_MAJOR,
  catchUp,
  compose,
  initialState,
  midiToFreq,
  PENTATONIC,
  pickProgression,
  PROGRESSIONS,
  type AmbientEvent,
  type PianoEvent,
} from './composer'
import { SFX_KINDS } from './sfx'

// 테스트마다 같은 결과가 나오도록 고정된 난수
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

type Phase = 'night' | 'day' | 'dawn' | 'dusk'
const run = (phase: Phase, seconds: number, seed = 7): AmbientEvent[] =>
  compose(initialState(0), seconds, phase, seeded(seed))
const pianoOf = (events: AmbientEvent[]) => events.filter((e): e is PianoEvent => e.kind === 'piano')
const pitchClass = (midi: number) => midi % 12

describe('음 높이', () => {
  it('라(A4)는 440Hz, 한 옥타브 위는 두 배', () => {
    expect(midiToFreq(69)).toBe(440)
    expect(Math.abs(midiToFreq(81) - 880) < 1e-9).toBe(true)
  })

  it('피아노는 다 장조 음계 안의 음만, 편안한 음역에서 친다', () => {
    for (const phase of ['night', 'day'] as const) {
      for (const note of pianoOf(run(phase, 600))) {
        expect(C_MAJOR.includes(pitchClass(note.midi))).toBe(true)
        expect(note.midi).toBeGreaterThan(36)
        expect(note.midi).toBeLessThan(90)
      }
    }
  })

  it('오르골 반짝임은 맑은 5음(도 레 미 솔 라) 안에서 난다', () => {
    const bells = run('day', 600).filter((e) => e.kind === 'bell')
    expect(bells.length).toBeGreaterThan(10)
    for (const bell of bells) {
      if (bell.kind === 'bell') expect(PENTATONIC.includes(pitchClass(bell.midi))).toBe(true)
    }
  })
})

describe('배경음 작곡', () => {
  it('화음 진행 안에서도, 진행이 바뀔 때도 같은 화음이 연달아 나오지 않는다', () => {
    for (const progression of PROGRESSIONS) {
      for (let i = 1; i < progression.length; i++) expect(progression[i] === progression[i - 1]).toBe(false)
    }
    const rng = seeded(11)
    let current = 0
    for (let i = 0; i < 200; i++) {
      const last = PROGRESSIONS[current][PROGRESSIONS[current].length - 1]
      const next = pickProgression(current, last, rng)
      expect(next === current).toBe(false)
      expect(PROGRESSIONS[next][0] === last).toBe(false)
      current = next
    }
  })

  it('음악이 오래 끊기지 않는다 (10분 동안 음과 음 사이가 3.5초를 넘지 않음)', () => {
    for (const phase of ['night', 'dusk', 'dawn', 'day'] as const) {
      const notes = pianoOf(run(phase, 600))
      for (let i = 1; i < notes.length; i++) expect(notes[i].time - notes[i - 1].time).toBeLessThan(3.5)
    }
  })

  it('잔잔하다: 1초에 3음이 넘지 않고, 밤은 낮보다 더 느리고 여유롭다', () => {
    const perSecond = (phase: Phase) => pianoOf(run(phase, 600)).length / 600
    expect(perSecond('day')).toBeLessThan(3)
    expect(perSecond('night')).toBeLessThan(perSecond('day'))
  })

  it('웅웅 울리는 긴 소리가 없다: 모든 음은 10초 안에 멎는다', () => {
    for (const note of pianoOf(run('night', 600))) {
      expect(note.duration).toBeGreaterThan(0)
      expect(note.duration).toBeLessThan(10)
    }
  })

  it('누르는 세기는 0~1 사이이고, 크게 튀는 음이 없다', () => {
    for (const note of pianoOf(run('day', 600))) {
      expect(note.velocity).toBeGreaterThan(0)
      expect(note.velocity).toBeLessThan(0.85)
    }
  })

  it('같은 음을 다시 치면 앞 소리는 그때 멈춘다 (소리가 쌓이지 않음)', () => {
    const notes = pianoOf(run('day', 300))
    for (let i = 0; i < notes.length; i++) {
      const again = notes.slice(i + 1).find((n) => n.midi === notes[i].midi)
      if (again) expect(notes[i].time + notes[i].duration).toBeLessThan(again.time + 0.05)
    }
  })

  it('풀벌레 소리는 밤에만 난다', () => {
    expect(run('night', 300).some((e) => e.kind === 'crickets')).toBe(true)
    for (const phase of ['day', 'dawn', 'dusk'] as const) {
      expect(run(phase, 300).some((e) => e.kind === 'crickets')).toBe(false)
    }
  })

  it('낮에는 밤보다 음색이 조금 더 밝다', () => {
    const avg = (phase: Phase) => {
      const notes = pianoOf(run(phase, 600))
      return notes.reduce((sum, n) => sum + n.brightness, 0) / notes.length
    }
    expect(avg('day')).toBeGreaterThan(avg('night'))
  })

  it('이어서 작곡해도 앞에서 정한 소리를 다시 정하지 않는다', () => {
    const state = initialState(0)
    const rng = seeded(3)
    const first = compose(state, 30, 'night', rng)
    const second = compose(state, 60, 'night', rng)
    const lastStart = Math.max(...first.map((e) => e.time))
    expect(second.every((e) => e.time > lastStart - 0.05)).toBe(true)
  })

  it('화면이 오래 멈췄다 돌아와도 밀린 소리를 한꺼번에 내지 않는다', () => {
    const state = initialState(0)
    const rng = seeded(5)
    compose(state, 20, 'night', rng)
    catchUp(state, 500)
    const events = compose(state, 510, 'night', rng)
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((e) => e.time >= 500)).toBe(true)
  })
})

describe('효과음 목록', () => {
  it('방의 물건마다 소리가 있다', () => {
    for (const kind of ['lampOn', 'lampOff', 'sock', 'plant', 'mug', 'book', 'page'] as const) {
      expect(SFX_KINDS.includes(kind)).toBe(true)
    }
  })
})
