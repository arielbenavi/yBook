// The ONE place ranking logic lives.
// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER FORMULA — swappable. Treat this as a stand-in so the UI has a
// stable number to rank by while the rest of yBook ships. The real "interest
// score" comes later: replace the body of `scoreComment` (the export name is
// the contract) and every consumer picks it up. Don't sprinkle ranking math
// into components, hooks, or the data layer.
// ─────────────────────────────────────────────────────────────────────────────

import type { Comment } from '../types'

export type ScoreContext = {
  // When provided, enables a mild recency boost. When omitted, recency is OFF
  // and the function is a pure function of `c` alone — tests pass it via ctx
  // so they stay deterministic; UI passes new Date() at render time.
  now?: Date
}

const RECENCY_HALF_LIFE_HOURS = 72   // 50% of the recency boost at 72h old
const RECENCY_BOOST_MAX = 5          // caps the recency contribution

export function scoreComment(c: Comment, ctx?: ScoreContext): number {
  const base = (c.likes - c.dislikes) + 1.5 * c.replyCount
  if (!ctx?.now) return base

  const ageHours =
    (ctx.now.getTime() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60)
  // Future-stamped comments get the base — no negative penalty, no boost.
  if (!Number.isFinite(ageHours) || ageHours < 0) return base

  const recency = 1 / (1 + ageHours / RECENCY_HALF_LIFE_HOURS)
  return base + RECENCY_BOOST_MAX * recency
}
