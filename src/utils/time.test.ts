import { describe, expect, it } from 'vitest'
import { absoluteTimeHe, relativeTimeHe } from './time'

const NOW = new Date('2026-06-20T12:00:00+03:00')

describe('relativeTimeHe', () => {
  it('returns Hebrew "ago" forms for past timestamps', () => {
    expect(relativeTimeHe('2026-06-20T11:30:00+03:00', NOW)).toMatch(/לפני/)
    expect(relativeTimeHe('2026-06-19T12:00:00+03:00', NOW)).toMatch(/אתמול|לפני/)
  })

  it('is deterministic given a fixed now', () => {
    const iso = '2026-06-19T12:00:00+03:00'
    expect(relativeTimeHe(iso, NOW)).toBe(relativeTimeHe(iso, NOW))
  })

  it('handles future timestamps with forward forms', () => {
    expect(relativeTimeHe('2026-06-21T12:00:00+03:00', NOW)).toMatch(/בעוד|מחר/)
  })

  it('picks an appropriate unit for far-past timestamps', () => {
    // 90 days back → months
    expect(relativeTimeHe('2026-03-22T12:00:00+03:00', NOW)).toMatch(/חודש|חודשים/)
    // 2 years back → years
    expect(relativeTimeHe('2024-06-20T12:00:00+03:00', NOW)).toMatch(/שנה|שנתיים|שנים/)
  })
})

describe('absoluteTimeHe', () => {
  it('returns a formatted Hebrew date+time string', () => {
    const out = absoluteTimeHe('2026-06-18T10:30:00+03:00')
    expect(out).toMatch(/2026/)
    expect(out.length).toBeGreaterThan(5)
  })
})
