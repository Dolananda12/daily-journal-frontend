'use client'

import { useState } from 'react'
import { getMonthDays, getTodayString, isFutureDate } from '@/lib/dateUtils'

interface CalendarModalProps {
  entryDates: string[]
  selectedDate: string
  onDateSelect: (date: string) => void
  onClose: () => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarModal({
  entryDates,
  selectedDate,
  onDateSelect,
  onClose,
}: CalendarModalProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayStr = getTodayString()

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    // Don't navigate past the current month
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const days = getMonthDays(viewYear, viewMonth)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  function handleDayClick(dateStr: string) {
    if (isFutureDate(dateStr)) return
    onDateSelect(dateStr)
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Calendar navigation"
    >
      <div className="calendar-modal">
        {/* Header */}
        <div className="cal-header">
          <button
            id="cal-prev-btn"
            className="cal-nav-btn"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="cal-month-label">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            id="cal-next-btn"
            className="cal-nav-btn"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Grid */}
        <div className="cal-grid">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday">{d}</div>
            ))}
          </div>

          <div className="cal-days">
            {/* Empty leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <button key={`empty-${i}`} className="cal-day cal-day--empty" tabIndex={-1} />
            ))}

            {days.map((d) => {
              const dateStr = d.toISOString().split('T')[0]
              const isFuture = isFutureDate(dateStr)
              const isCurrentDay = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const hasEntry = entryDates.includes(dateStr)

              let cls = 'cal-day'
              if (isFuture) cls += ' cal-day--future'
              else if (isCurrentDay) cls += ' cal-day--today'
              else if (isSelected) cls += ' cal-day--selected'
              if (hasEntry) cls += ' cal-day--has-entry'

              return (
                <button
                  key={dateStr}
                  id={`cal-day-${dateStr}`}
                  className={cls}
                  onClick={() => handleDayClick(dateStr)}
                  disabled={isFuture}
                  aria-label={`${dateStr}${hasEntry ? ', has entry' : ''}${isCurrentDay ? ', today' : ''}`}
                  aria-current={isCurrentDay ? 'date' : undefined}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
