import { describe, expect, it } from 'vitest'
import { authorInitial, avatarColor } from './avatarColor'

describe('avatarColor', () => {
  it('is deterministic for the same author', () => {
    expect(avatarColor('אבי')).toBe(avatarColor('אבי'))
    expect(avatarColor('רחל')).toBe(avatarColor('רחל'))
  })

  it('returns one of the palette colors', () => {
    const palette = new Set([
      '#c8492d', '#8a6913', '#3f6b4a', '#7b3d5e', '#4a5a6e',
      '#9f4b2e', '#306e66', '#42477a', '#5e5a1f', '#7b2c2c',
    ])
    for (const name of ['אבי', 'רחל', 'חחחחחח', 'ר.ש.', '', 'G7Fan']) {
      expect(palette.has(avatarColor(name))).toBe(true)
    }
  })

  it('distributes different authors across the palette', () => {
    const names = ['אבי', 'רחל', 'חחחחחח', 'ר.ש.', 'תומר', 'מיכל ל.', 'יוסי', 'אסף']
    const hues = new Set(names.map(avatarColor))
    expect(hues.size).toBeGreaterThanOrEqual(4)
  })
})

describe('authorInitial', () => {
  it('returns the first Hebrew letter for Hebrew names', () => {
    expect(authorInitial('אבי')).toBe('א')
    expect(authorInitial('רחל')).toBe('ר')
    expect(authorInitial('חחחחחח')).toBe('ח')
  })

  it('strips leading whitespace', () => {
    expect(authorInitial('  אבי')).toBe('א')
  })

  it('falls back to "?" on empty / whitespace input', () => {
    expect(authorInitial('')).toBe('?')
    expect(authorInitial('   ')).toBe('?')
  })

  it('uppercases Latin initials', () => {
    expect(authorInitial('avi')).toBe('A')
  })
})
