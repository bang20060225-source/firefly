import { describe, expect, it } from 'vitest'
import { BELL_NOTES, CHORDS, compose, initialState, midiToFreq, NEXT_CHORD, type AmbientEvent } from './composer'
import { SFX_KINDS } from './sfx'

// 테스트마다 같은 결과가 나오도록 고정된 난수
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

const run = (phase: 'night' | 'day' | 'dawn' | 'dusk', seconds: number, seed = 7): AmbientEvent[] =>
  compose(initialState(0), seconds, phase, seeded(seed))

describe('음 높이', () => {
  it('라(A4)는 440Hz, 한 옥타브 위는 두 배', () => {
    expect(midiToFreq(69)).toBe(440)
    expect(Math.abs(midiToFreq(81) - 880) < 1e-9).toBe(true)
  })

  it('배경 화음은 휴대폰 스피커로도 들리는 높이에 있다', () => {
    for (const chord of CHORDS) {
      for (const note of chord.notes) {
        expect(midiToFreq(note)).toBeGreaterThan(140)
        expect(midiToFreq(note)).toBeLessThan(1000)
      }
    }
  })
})

describe('배경음 작곡', () => {
  it('같은 화음이 연달아 나오지 않는다', () => {
    NEXT_CHORD.forEach((options, index) => {
      expect(options.includes(index)).toBe(false)
    })
    const chords = run('night', 600).filter((e) => e.kind === 'chord')
    for (let i = 1; i < chords.length; i++) {
      expect(JSON.stringify(chords[i].kind === 'chord' && chords[i].notes) === JSON.stringify(chords[i - 1].kind === 'chord' && chords[i - 1].notes)).toBe(false)
    }
  })

  it('화음은 끊기지 않고 겹치며 이어진다 (10분 동안 빈틈 없음)', () => {
    const chords = run('night', 600).filter((e): e is Extract<AmbientEvent, { kind: 'chord' }> => e.kind === 'chord')
    for (let i = 1; i < chords.length; i++) {
      const prevEnd = chords[i - 1].time + chords[i - 1].duration
      expect(chords[i].time).toBeLessThan(prevEnd)
    }
  })

  it('종소리는 늘 5음 음계 안에서 난다', () => {
    const bells = run('day', 600).filter((e) => e.kind === 'bell')
    expect(bells.length).toBeGreaterThan(30)
    for (const bell of bells) {
      if (bell.kind !== 'bell') continue
      const base = bell.midi >= 84 + 12 ? bell.midi - 12 : bell.midi
      expect(BELL_NOTES.includes(base) || BELL_NOTES.includes(bell.midi - 12)).toBe(true)
    }
  })

  it('풀벌레 소리는 밤에만 난다', () => {
    expect(run('night', 300).some((e) => e.kind === 'crickets')).toBe(true)
    for (const phase of ['day', 'dawn', 'dusk'] as const) {
      expect(run(phase, 300).some((e) => e.kind === 'crickets')).toBe(false)
    }
  })

  it('낮에는 밤보다 밝고 종소리가 조금 더 자주 난다', () => {
    const avgCutoff = (events: AmbientEvent[]) => {
      const chords = events.filter((e): e is Extract<AmbientEvent, { kind: 'chord' }> => e.kind === 'chord')
      return chords.reduce((sum, c) => sum + c.cutoff, 0) / chords.length
    }
    expect(avgCutoff(run('day', 600))).toBeGreaterThan(avgCutoff(run('night', 600)))
    expect(run('day', 600).filter((e) => e.kind === 'bell').length).toBeGreaterThan(run('night', 600).filter((e) => e.kind === 'bell').length)
  })

  it('이어서 작곡해도 앞에서 정한 소리를 다시 정하지 않는다', () => {
    const state = initialState(0)
    const rng = seeded(3)
    const first = compose(state, 30, 'night', rng)
    const second = compose(state, 60, 'night', rng)
    expect(first.every((e) => e.time < 30)).toBe(true)
    expect(second.every((e) => e.time >= 29)).toBe(true)
  })
})

describe('효과음 목록', () => {
  it('방의 물건마다 소리가 있다', () => {
    for (const kind of ['lampOn', 'lampOff', 'sock', 'plant', 'mug', 'book', 'page'] as const) {
      expect(SFX_KINDS.includes(kind)).toBe(true)
    }
  })
})
