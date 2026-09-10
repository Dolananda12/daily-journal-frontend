'use client'

import { useState } from 'react'
import CalendarModal from './CalendarModal'
import Link from 'next/link'

type ActiveView = 'today' | 'browse' | 'stats' | 'commandments' | 'targets' | 'board' | 'photos' | 'calendar' | 'countdown'

interface TopBarProps {
  entryDates: string[]
  selectedDate: string
  onDateSelect: (date: string) => void
  missedDays: number
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
}

export default function TopBar({
  entryDates,
  selectedDate,
  onDateSelect,
  missedDays,
  activeView,
  onViewChange,
}: TopBarProps) {
  const [calOpen, setCalOpen] = useState(false)

  return (
    <>
      <header className="topbar">
        <span className="topbar-brand">Daily Journal</span>

        {/* View tabs */}
        <div className="topbar-tabs">
          <button
            id="tab-today-btn"
            className={`topbar-tab${activeView === 'today' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('today')}
          >
            Today
          </button>
          <button
            id="tab-browse-btn"
            className={`topbar-tab${activeView === 'browse' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('browse')}
          >
            Browse
          </button>
          <button
            id="tab-stats-btn"
            className={`topbar-tab${activeView === 'stats' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('stats')}
          >
            {/* Bar chart icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}>
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6"  y1="20" x2="6"  y2="14"/>
            </svg>
            Stats
          </button>
          <button
            id="tab-targets-btn"
            className={`topbar-tab${activeView === 'targets' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('targets')}
          >
            🎯 Targets
          </button>
          <button
            id="tab-board-btn"
            className={`topbar-tab${activeView === 'board' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('board')}
          >
            📌 Board
          </button>
          <button
            id="tab-photos-btn"
            className={`topbar-tab${activeView === 'photos' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('photos')}
          >
            🖼️ Photos
          </button>
          <button
            id="tab-calendar-btn"
            className={`topbar-tab${activeView === 'calendar' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('calendar')}
          >
            📅 Calendar
          </button>
          <button
            id="tab-countdown-btn"
            className={`topbar-tab${activeView === 'countdown' ? ' topbar-tab--active' : ''}`}
            onClick={() => onViewChange('countdown')}
          >
            ⏳ Countdown
          </button>
        </div>

        <div className="topbar-right">
          {/* Commandments button */}
          <button
            id="open-commandments-btn"
            className={`calendar-btn${activeView === 'commandments' ? ' calendar-btn--active' : ''}`}
            onClick={() => onViewChange(activeView === 'commandments' ? 'today' : 'commandments')}
            aria-label="Open commandments"
            title="My Commandments"
          >
            {/* Scroll / tablet icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            Commandments
          </button>

          {/* Calendar button */}
          <button
            id="open-calendar-btn"
            className="calendar-btn"
            onClick={() => setCalOpen(true)}
            aria-label="Open calendar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendar
            {missedDays > 0 && (
              <span className="missed-badge" title={`${missedDays} missed day${missedDays !== 1 ? 's' : ''} this week`}>
                {missedDays}
              </span>
            )}
          </button>
        </div>
      </header>

      {calOpen && (
        <CalendarModal
          entryDates={entryDates}
          selectedDate={selectedDate}
          onDateSelect={(date) => { onDateSelect(date); onViewChange('today') }}
          onClose={() => setCalOpen(false)}
        />
      )}
    </>
  )
}
