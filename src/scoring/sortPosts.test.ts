import { describe, expect, it } from 'vitest'
import type { Post } from '../types'
import { sortPosts } from './sortPosts'

const articleRef = {
  id: 'a',
  url: 'https://example.com',
  title: 'a',
  source: 'ynet' as const,
  author: 'a',
  publishedAt: '2026-06-18T05:00:00+03:00',
}

const post = (overrides: { id: string; ts: string; replies?: number; score?: number }): Post => ({
  comment: {
    id: overrides.id,
    author: overrides.id,
    timestamp: overrides.ts,
    body: 'b',
    likes: 0,
    dislikes: 0,
    replyCount: overrides.replies ?? 0,
    score: overrides.score,
  },
  quoted: articleRef,
})

const seed: Post[] = [
  post({ id: 'rachel', ts: '2026-06-18T10:30:00+03:00', replies: 2, score: 89 }), // top by score
  post({ id: 'tomer',  ts: '2026-06-19T12:00:00+03:00', replies: 0, score: 10 }), // newest, low score
  post({ id: 'avi',    ts: '2026-06-18T08:45:00+03:00', replies: 4, score: 47 }), // most replied
  post({ id: 'ilan',   ts: '2026-06-18T15:00:00+03:00', replies: 1, score: -19 }), // net-negative
  post({ id: 'zero1',  ts: '2026-06-18T07:00:00+03:00', replies: 0, score: 18 }),
  post({ id: 'zero2',  ts: '2026-06-18T09:00:00+03:00', replies: 0, score: 21 }),
]

describe('sortPosts', () => {
  it('top: score desc; net-negative sinks last', () => {
    const out = sortPosts(seed, 'top')
    expect(out[0].comment.id).toBe('rachel')
    expect(out.at(-1)?.comment.id).toBe('ilan')
  })

  it('newest: timestamp desc', () => {
    const out = sortPosts(seed, 'newest')
    expect(out[0].comment.id).toBe('tomer')
  })

  it('discussed: replyCount desc, then score desc for ties', () => {
    const out = sortPosts(seed, 'discussed')
    expect(out[0].comment.id).toBe('avi')          // 4 replies
    expect(out[1].comment.id).toBe('rachel')        // 2 replies
    // ilan has 1 reply, score -19 — should beat 0-reply posts on replyCount
    expect(out[2].comment.id).toBe('ilan')
    // remaining are 0-reply, tied → sorted by score desc → zero2 (21) before zero1 (18) before tomer (10)
    expect(out[3].comment.id).toBe('zero2')
    expect(out[4].comment.id).toBe('zero1')
    expect(out[5].comment.id).toBe('tomer')
  })

  it('three modes produce three different leaders on the seed shape', () => {
    expect(sortPosts(seed, 'top')[0].comment.id).toBe('rachel')
    expect(sortPosts(seed, 'newest')[0].comment.id).toBe('tomer')
    expect(sortPosts(seed, 'discussed')[0].comment.id).toBe('avi')
  })

  it('does not mutate the input array', () => {
    const before = seed.map(p => p.comment.id)
    sortPosts(seed, 'top')
    expect(seed.map(p => p.comment.id)).toEqual(before)
  })

  it('toggling between modes is stable: top → newest → top yields identical order both times', () => {
    const a = sortPosts(seed, 'top').map(p => p.comment.id)
    sortPosts(seed, 'newest')
    const b = sortPosts(seed, 'top').map(p => p.comment.id)
    expect(b).toEqual(a)
  })
})
