const LATE_NIGHT_CUTOFF_HOUR = 2 // entries editable until 2 AM

/** Returns YYYY-MM-DD in the browser/server's LOCAL timezone (not UTC). */
function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns the "effective today" for journalling.
 * Before 2 AM, rolls back to yesterday so you can still finish last night's entry.
 */
export function getEffectiveTodayString(): string {
  const now = new Date()
  if (now.getHours() < LATE_NIGHT_CUTOFF_HOUR) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return localDateString(yesterday)
  }
  return localDateString(now)
}

/** Wall-clock calendar date — same as effective today (no grace period). */
export function getTodayString(): string {
  return localDateString()
}

/** A date is "in the future" relative to today. */
export function isFutureDate(dateStr: string): boolean {
  return dateStr > localDateString()
}

/** Is this date today? */
export function isToday(dateStr: string): boolean {
  return dateStr === getEffectiveTodayString()
}

export function isPastDate(dateStr: string): boolean {
  return dateStr < getEffectiveTodayString()
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function getMissedDaysThisWeek(entryDates: string[]): number {
  const today = localDateString()
  const base = new Date(today + 'T00:00:00')
  let missed = 0
  for (let i = 6; i >= 1; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    const dStr = localDateString(d)
    if (dStr < today && !entryDates.includes(dStr)) missed++
  }
  return missed
}
