import type { KeyboardEvent } from 'react'
import type { SortMode } from '../scoring/sortPosts'

const OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'top',       label: 'מעניין' },
  { mode: 'newest',    label: 'חדש' },
  { mode: 'discussed', label: 'הכי נדון' },
]

type Props = {
  mode: SortMode
  onChange: (mode: SortMode) => void
}

export default function SortToggle({ mode, onChange }: Props) {
  // Arrow-key navigation per the WAI radiogroup pattern, swapped for RTL:
  // in RTL the visually-next option sits to the left, so ArrowLeft / ArrowDown
  // advances and ArrowRight / ArrowUp goes back.
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
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
