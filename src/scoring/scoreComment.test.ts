import { describe, expect, it } from 'vitest'
import type { Comment } from '../types'
import { scoreComment } from './scoreComment'

const baseComment: Comment = {
  id: 'c1',
  author: 'a',
  timestamp: '2026-06-18T10:00:00+03:00',
  body: 'body',
  likes: 0,
  dislikes: 0,
  replyCount: 0,
}

describe('scoreComment — default formula (no ctx)', () => {
  it('returns (likes - dislikes) + 1.5 * replyCount', () => {
    expect(scoreComment({ ...baseComment, likes: 10, dislikes: 2, replyCount: 4 })).toBe(14)
    expect(scoreComment({ ...baseComment, likes: 0, dislikes: 0, replyCount: 0 })).toBe(0)
  })

  it('net-negative posts score below break-even posts', () => {
    const negative = scoreComment({ ...baseComment, likes: 3, dislikes: 14 })
    const breakEven = scoreComment(baseComment)
    expect(negative).toBe(-11)
    expect(negative).toBeLessThan(breakEven)
  })

  it('high-reply posts rank above same-net low-reply posts', () => {
    const noReplies = scoreComment({ ...baseComment, likes: 10, replyCount: 0 })
    const manyReplies = scoreComment({ ...baseComment, likes: 10, replyCount: 10 })
    expect(manyReplies - noReplies).toBe(15)
    expect(manyReplies).toBeGreaterThan(noReplies)
  })

  it('is deterministic — same input yields same output', () => {
    const c: Comment = { ...baseComment, likes: 7, dislikes: 2, replyCount: 3 }
    expect(scoreComment(c)).toBe(scoreComment(c))
  })

  it('is pure — output depends only on the input, not wall clock', () => {
    const c: Comment = { ...baseComment, likes: 10 }
    // No ctx → no recency → answer is the base regardless of when the test runs.
    expect(scoreComment(c)).toBe(10)
  })
})

describe('scoreComment — recency (ctx.now provided)', () => {
  const NOW = new Date('2026-06-20T12:00:00+03:00')

  it('rewards recent posts above older ones at equal base', () => {
    const recent = { ...baseComment, likes: 10, timestamp: '2026-06-20T11:00:00+03:00' }
    const old = { ...baseComment, likes: 10, timestamp: '2026-04-01T12:00:00+03:00' }
    expect(scoreComment(recent, { now: NOW })).toBeGreaterThan(scoreComment(old, { now: NOW }))
  })

  it('keeps the recency boost MILD — never flips a clearly higher-base post', () => {
    const lowBaseFresh = { ...baseComment, likes: 5, timestamp: '2026-06-20T12:00:00+03:00' }
    const highBaseOld = { ...baseComment, likes: 50, timestamp: '2026-04-01T12:00:00+03:00' }
    expect(scoreComment(highBaseOld, { now: NOW })).toBeGreaterThan(scoreComment(lowBaseFresh, { now: NOW }))
  })

  it('caps the recency contribution (mildness is enforced)', () => {
    // base = 0 + 1.5*0 = 0; recency at ageHours=0 → 5
    const justNow = { ...baseComment, timestamp: '2026-06-20T12:00:00+03:00' }
    expect(scoreComment(justNow, { now: NOW })).toBeLessThanOrEqual(5)
    expect(scoreComment(justNow, { now: NOW })).toBeGreaterThan(0)
  })

  it('handles future timestamps without throwing or going negative', () => {
    const future = { ...baseComment, likes: 5, timestamp: '2027-01-01T00:00:00+03:00' }
    expect(() => scoreComment(future, { now: NOW })).not.toThrow()
    expect(scoreComment(future, { now: NOW })).toBe(5)
  })

  it('ctx without `now` skips recency (same as omitting ctx)', () => {
    const c: Comment = { ...baseComment, likes: 10 }
    expect(scoreComment(c, {})).toBe(scoreComment(c))
  })
})
