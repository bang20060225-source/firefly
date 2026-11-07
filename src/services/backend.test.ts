import { describe, expect, it } from 'vitest'
import { errorMessage, toFireflyError } from './backend'

// Supabase 오류는 { message, code } 모양으로 온다
function supabaseError(message: string, code: string) {
  return Object.assign(new Error(message), { code })
}

describe('오류 안내', () => {
  it('메일 발송이 준비되지 않았으면 알기 쉬운 한국어로 알려 준다', () => {
    const err = toFireflyError(
      supabaseError('Email address "friend@example.com" cannot be used as it is not authorized', 'email_address_not_authorized'),
    )
    expect(err.code).toBe('email_unavailable')
    expect(errorMessage(err)).toContain('메일 발송이 아직 준비되지 않았어요')
  })

  it('메일을 너무 자주 보내면 잠시 뒤에 하라고 알려 준다', () => {
    expect(toFireflyError(supabaseError('email rate limit exceeded', 'over_email_send_rate_limit')).code).toBe('rate_limited')
  })

  it('서버의 요청 제한·비공개 오류를 알아본다', () => {
    expect(toFireflyError(new Error('rate_limited')).code).toBe('rate_limited')
    expect(toFireflyError(new Error('visibility_private')).code).toBe('visibility_private')
  })

  it('이미 쓰는 이메일과 잘못된 이메일을 구분한다', () => {
    expect(toFireflyError(supabaseError('A user with this email address has already been registered', 'email_exists')).code).toBe(
      'email_exists',
    )
    expect(toFireflyError(supabaseError('Unable to validate email address: invalid format', 'email_address_invalid')).code).toBe(
      'invalid_email',
    )
  })

  it('모르는 오류는 숨기지 않고 unknown 으로 남긴다', () => {
    expect(toFireflyError(new Error('something odd')).code).toBe('unknown')
  })
})
