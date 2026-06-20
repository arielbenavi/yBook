// Hebrew relative time via Intl.RelativeTimeFormat — "לפני 3 שעות", "אתמול", etc.
// `now` is injectable so tests stay deterministic. In the UI we let it default to live time.

const RTF = new Intl.RelativeTimeFormat('he', { numeric: 'auto' })

const ABS_FMT = new Intl.DateTimeFormat('he-IL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function relativeTimeHe(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const deltaSec = Math.round((then.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(deltaSec)

  if (abs < 60) return RTF.format(deltaSec, 'second')
  const deltaMin = Math.round(deltaSec / 60)
  if (Math.abs(deltaMin) < 60) return RTF.format(deltaMin, 'minute')
  const deltaHour = Math.round(deltaSec / 3600)
  if (Math.abs(deltaHour) < 24) return RTF.format(deltaHour, 'hour')
  const deltaDay = Math.round(deltaSec / 86400)
  if (Math.abs(deltaDay) < 7) return RTF.format(deltaDay, 'day')
  const deltaWeek = Math.round(deltaDay / 7)
  if (Math.abs(deltaWeek) < 5) return RTF.format(deltaWeek, 'week')
  const deltaMonth = Math.round(deltaDay / 30)
  if (Math.abs(deltaMonth) < 12) return RTF.format(deltaMonth, 'month')
  const deltaYear = Math.round(deltaDay / 365)
  return RTF.format(deltaYear, 'year')
}

export function absoluteTimeHe(iso: string): string {
  return ABS_FMT.format(new Date(iso))
}
