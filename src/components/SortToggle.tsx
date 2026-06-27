import type { KeyboardEvent } from 'react'
import type { SortMode } from '../scoring/sortPosts'

const OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'top',       label: 'מעניין' },
  { mode: 'newest',    label: 'חדש' },
  { mode: 'discussed', label: 'הכי נדון' },
  { mode: 'funny',     label: 'מצחיק' },
]

type Props = {
  mode: SortMode
  onChange: (mode: SortMode) => void
  funnyOnly: boolean
  onFunnyOnlyChange: (v: boolean) => void
}

export default function SortToggle({ mode, onChange, funnyOnly, onFunnyOnlyChange }: Props) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = OPTIONS.findIndex(o => o.mode === mode)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(OPTIONS[(i + 1) % OPTIONS.length].mode)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(OPTIONS[(i - 1 + OPTIONS.length) % OPTIONS.length].mode)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-label="מיון פיד"
        onKeyDown={handleKeyDown}
        className="inline-flex items-center gap-1 self-start rounded-full border border-rule bg-surface p-1"
      >
        {OPTIONS.map(o => {
          const active = mode === o.mode
          return (
            <button
              key={o.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.mode)}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:min-h-0 md:px-3 md:py-1 ${
                active
                  ? 'bg-brand text-white'
                  : 'text-ink-muted hover:bg-paper-deep hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        aria-pressed={funnyOnly}
        onClick={() => onFunnyOnlyChange(!funnyOnly)}
        className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:min-h-0 md:px-3 md:py-1 ${
          funnyOnly
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-rule bg-surface text-ink-muted hover:bg-paper-deep hover:text-ink'
        }`}
      >
        {funnyOnly ? 'מצחיק בלבד' : 'הכל'}
      </button>
    </div>
  )
}
