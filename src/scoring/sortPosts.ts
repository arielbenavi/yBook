// The ONE selector that turns the scored feed into a sorted feed.
// FeedList receives the result and renders it; it does not sort.
//
// Tie-breaking: many posts share replyCount 0 (and the seed could have ties on
// any axis). We always tie-break by score desc so equal keys don't jitter
// between toggles — combined with JS's stable Array.prototype.sort (ES2019+),
// that gives deterministic, repeatable ordering.

import type { Post } from '../types'

export type SortMode = 'top' | 'newest' | 'discussed' | 'funny'

const byScore = (a: Post, b: Post): number =>
  (b.comment.score ?? 0) - (a.comment.score ?? 0)

export function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const copy = posts.slice()
  if (mode === 'top') {
    return copy.sort(byScore)
  }
  if (mode === 'newest') {
    return copy.sort((a, b) => {
      const t = b.comment.timestamp.localeCompare(a.comment.timestamp)
      return t !== 0 ? t : byScore(a, b)
    })
  }
  if (mode === 'funny') {
    return copy.sort((a, b) => {
      const h = (b.comment.humor ?? 0) - (a.comment.humor ?? 0)
      return h !== 0 ? h : byScore(a, b)
    })
  }
  // discussed
  return copy.sort((a, b) => {
    const r = b.comment.replyCount - a.comment.replyCount
    return r !== 0 ? r : byScore(a, b)
  })
}
