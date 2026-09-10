'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/apiClient'

interface CalendarEvent {
  id: string
  title: string
  event_date: string
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed

  const todayStr = formatDate(new Date())

  useEffect(() => {
    fetchMonthEvents()
    fetchUpcomingEvents()
  }, [year, month])

  const fetchMonthEvents = async () => {
    try {
      setLoading(true)
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      
      const startStr = formatDate(start)
      const endStr = formatDate(end)

      const res = await apiFetch(`/api/events?start=${startStr}&end=${endStr}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }
    } catch (err) {
      console.error('Failed to fetch month events:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingEvents = async () => {
    try {
      const res = await apiFetch(`/api/events/upcoming?from=${todayStr}`)
      if (res.ok) {
        const data = await res.json()
        setUpcomingEvents(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch upcoming events:', err)
    }
  }

  function formatDate(d: Date) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function getRelativeDateLabel(eventDateStr: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(eventDateStr + 'T00:00:00')
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `In ${weeks} week${weeks > 1 ? 's' : ''}`
    }
    const months = Math.floor(diffDays / 30)
    return `In ${months} month${months > 1 ? 's' : ''}`
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventTitle.trim() || !selectedDay) return

    try {
      setIsSubmitting(true)
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventTitle.trim(),
          event_date: selectedDay,
        }),
      })

      if (res.ok) {
        setNewEventTitle('')
        setSelectedDay(null)
        await fetchMonthEvents()
        await fetchUpcomingEvents()
      } else {
        alert('Failed to save event')
      }
    } catch (err) {
      console.error('Error adding event:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const res = await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents(prev => prev.filter(ev => ev.id !== id))
        setUpcomingEvents(prev => prev.filter(ev => ev.id !== id))
      }
    } catch (err) {
      console.error('Error deleting event:', err)
    }
  }

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  // Starting day index (0 = Mon, ..., 6 = Sun)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  const daysInMonth = lastDayOfMonth.getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="calendar-container anim-fade-in">
      
      {/* Month / Year Header */}
      <div className="calendar-header-card">
        <div className="calendar-title-group">
          <div className="calendar-icon-badge">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h1 className="calendar-month-title">
              {monthNames[month]} {year}
            </h1>
            <p className="calendar-month-sub">Monthly Schedule & Reminders</p>
          </div>
        </div>

        <div className="calendar-nav-group">
          <button
            onClick={handlePrevMonth}
            className="calendar-nav-btn"
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="calendar-nav-btn calendar-today-btn"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="calendar-nav-btn"
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="calendar-grid-card">
        
        {/* Day of Week Headers */}
        <div className="calendar-week-header">
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
          <div>SUN</div>
        </div>

        {/* Calendar Days Grid */}
        <div className="calendar-days-grid">
          {/* Empty cells for leading days */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day-empty" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const dateObj = new Date(year, month, dayNum)
            const dateStr = formatDate(dateObj)
            const isToday = dateStr === todayStr
            
            const dayEvents = events.filter(ev => ev.event_date === dateStr)

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(dateStr)}
                className={`calendar-day-cell ${isToday ? 'calendar-day-cell--today' : ''}`}
              >
                <div className="calendar-day-top">
                  <span className="calendar-day-number">
                    {dayNum}
                  </span>
                  <span className="calendar-add-event-icon">
                    <Plus size={14} />
                  </span>
                </div>

                {/* Events list inside cell */}
                <div className="calendar-events-list">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="calendar-event-pill">
                      <span className="calendar-event-pill-title">{ev.title}</span>
                      <button
                        onClick={(e) => handleDeleteEvent(ev.id, e)}
                        className="calendar-event-del-btn"
                        title="Delete Event"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── NEW SECTION: Important Dates From Present Day ── */}
      <div className="calendar-upcoming-card">
        <div className="calendar-upcoming-title">
          <Clock size={20} style={{ color: 'var(--accent-dark)' }} />
          <span>Important Upcoming Dates (From Today)</span>
        </div>

        {upcomingEvents.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No upcoming events scheduled. Click any date on the calendar above to add one!
          </p>
        ) : (
          <div className="calendar-upcoming-grid custom-scrollbar">
            {upcomingEvents.map((ev) => {
              const dateObj = new Date(ev.event_date + 'T00:00:00')
              const dateFormatted = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              const badgeLabel = getRelativeDateLabel(ev.event_date)

              return (
                <div key={ev.id} className="calendar-upcoming-item-card">
                  <div className="calendar-upcoming-item-header">
                    <span className="calendar-upcoming-item-title">{ev.title}</span>
                    <button
                      onClick={(e) => handleDeleteEvent(ev.id, e)}
                      className="calendar-event-del-btn"
                      title="Delete Event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="calendar-upcoming-item-date">{dateFormatted}</div>
                  <span className="calendar-upcoming-badge">{badgeLabel}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {selectedDay && (
        <div 
          className="calendar-modal-backdrop anim-fade-in"
          onClick={() => setSelectedDay(null)}
        >
          <div 
            className="calendar-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="calendar-modal-title">Add Event</h3>
            <p className="calendar-modal-sub">
              Date: <strong style={{ color: 'var(--text)' }}>{selectedDay}</strong>
            </p>

            <form onSubmit={handleAddEvent}>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="e.g. [ACMOS] Quiz, [Embedded Systems] Exam..."
                className="calendar-modal-input"
                autoFocus
              />

              <div className="calendar-modal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="calendar-modal-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newEventTitle.trim()}
                  className="calendar-modal-btn-save"
                >
                  {isSubmitting ? 'Saving...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
