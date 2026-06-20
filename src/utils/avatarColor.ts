// Deterministic author → avatar color + first-grapheme initial.
// Palette is hand-picked to (a) sit on the warm-paper background without clashing
// and (b) carry white text at >= WCAG AA contrast.

const PALETTE = [
  '#c8492d', // deep coral
  '#8a6913', // deep mustard
  '#3f6b4a', // forest
  '#7b3d5e', // plum
  '#4a5a6e', // slate
  '#9f4b2e', // rust
  '#306e66', // teal
  '#42477a', // indigo
  '#5e5a1f', // deep olive
  '#7b2c2c', // burgundy
] as const

// djb2-style string hash; unsigned so the modulo lands in [0, PALETTE.length).
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  return h >>> 0
}

export function avatarColor(author: string): string {
  return PALETTE[hashString(author) % PALETTE.length]
}

// Array.from splits by grapheme cluster, so Hebrew / emoji / surrogate pairs all
// yield the visible first character (not a stray code unit).
export function authorInitial(author: string): string {
  const trimmed = author.trim()
  if (!trimmed) return '?'
  const first = Array.from(trimmed)[0]
  return first ? first.toUpperCase() : '?'
}
