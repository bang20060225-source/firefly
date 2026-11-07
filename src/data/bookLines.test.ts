import { describe, expect, it } from 'vitest'
import { BOOK_LINES, createLineBag, pageNumber } from './bookLines'

describe('책 글귀', () => {
  it('충분히 여러 개가 있고 겹치지 않는다', () => {
    expect(BOOK_LINES.length).toBeGreaterThan(30)
    expect(new Set(BOOK_LINES).size).toBe(BOOK_LINES.length)
  })

  it('짧게 읽을 수 있는 길이다', () => {
    for (const line of BOOK_LINES) expect(line.length).toBeLessThan(60)
  })

  it('재촉하거나 진단·치료를 약속하는 말이 없다', () => {
    const banned = ['힘내', '해야', '극복', '치료', '우울', '진단', '회복', '노력', '열심히', '죽', '사라지']
    for (const line of BOOK_LINES) {
      for (const word of banned) expect(line.includes(word)).toBe(false)
    }
  })

  it('한 바퀴 동안은 같은 글귀가 다시 나오지 않는다', () => {
    let seed = 5
    const rng = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const next = createLineBag(BOOK_LINES.length, rng)
    const firstRound = Array.from({ length: BOOK_LINES.length }, () => next())
    expect(new Set(firstRound).size).toBe(BOOK_LINES.length)
    const lastOfRound = firstRound[firstRound.length - 1]
    expect(next() === lastOfRound).toBe(false)
  })

  it('페이지 번호는 장식용 숫자다', () => {
    for (let i = 0; i < BOOK_LINES.length; i++) {
      expect(pageNumber(i)).toBeGreaterThan(2)
      expect(pageNumber(i)).toBeLessThan(184)
    }
  })
})
