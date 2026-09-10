'use client'

import { apiFetch } from '@/lib/apiClient'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import QuoteDisplay from '@/components/QuoteDisplay'
import EntryForm from '@/components/EntryForm'
import ReadOnlyEntry from '@/components/ReadOnlyEntry'
import BrowseView from '@/components/BrowseView'
import StatsView from '@/components/StatsView'
import CommandmentsView from '@/components/CommandmentsView'
import TargetsView from '@/components/TargetsView'
import BoardView from '@/components/BoardView'
import PhotosView from '@/components/PhotosView'
import CalendarView from '@/components/CalendarView'
import CountdownView from '@/components/CountdownView'
import {
  getEffectiveTodayString,
  isToday,
  isPastDate,
  formatDisplayDate,
  getMissedDaysThisWeek,
} from '@/lib/dateUtils'

type ActiveView = 'today' | 'browse' | 'stats' | 'commandments' | 'targets' | 'board' | 'photos' | 'calendar' | 'countdown'

interface Entry {
  entry_date: string
  academics_notes: string
  life_notes: string
  hours_studied: number
  diary_notes: string
  todos: { id: string; text: string; done: boolean }[]
}

interface EntryMeta {
  entry_date: string
  hours_studied: number
}

export default function HomePage() {
  const todayStr = getEffectiveTodayString()

  const [activeView, setActiveView] = useState<ActiveView>('today')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [entryMetas, setEntryMetas] = useState<EntryMeta[]>([])
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null)
  const [loadingEntry, setLoadingEntry] = useState(true)

  // Sync activeView with localStorage so refreshing preserves selected tab
  useEffect(() => {
    const savedView = localStorage.getItem('journal_active_view') as ActiveView | null
    if (savedView) {
      setActiveView(savedView)
    }
  }, [])

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view)
    localStorage.setItem('journal_active_view', view)
  }

  const entryDates = entryMetas.map((e) => e.entry_date)
  const missedDays = getMissedDaysThisWeek(entryDates)

  // Load all entry metadata (for calendar dots)
  useEffect(() => {
    apiFetch('/api/entries')
      .then((r) => r.json())
      .then((data) => setEntryMetas(Array.isArray(data) ? data : []))
      .catch(() => setEntryMetas([]))
  }, [])

  // Load selected date's entry
  const loadEntry = useCallback(async (date: string) => {
    setLoadingEntry(true)
    setCurrentEntry(null)
    try {
      const res = await apiFetch(`/api/entries/${date}`)
      const data = await res.json()
      setCurrentEntry(data ?? null)
    } catch {
      setCurrentEntry(null)
    } finally {
      setLoadingEntry(false)
    }
  }, [])

  useEffect(() => {
    if (activeView === 'today') loadEntry(selectedDate)
  }, [selectedDate, loadEntry, activeView])

  function handleDateSelect(date: string) {
    setSelectedDate(date)
  }

  function handleEntrySaved(entry: Entry) {
    setCurrentEntry(entry)
    setEntryMetas((prev) => {
      const exists = prev.find((e) => e.entry_date === entry.entry_date)
      if (exists) {
        return prev.map((e) =>
          e.entry_date === entry.entry_date
            ? { ...e, hours_studied: entry.hours_studied }
            : e
        )
      }
      return [{ entry_date: entry.entry_date, hours_studied: entry.hours_studied }, ...prev]
    })
  }

  const isViewingToday = isToday(selectedDate)
  const isViewingPast = isPastDate(selectedDate)

  return (
    <>
      <TopBar
        entryDates={entryDates}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        missedDays={missedDays}
        activeView={activeView}
        onViewChange={handleViewChange}
      />

      {/* Commandments — full screen overlay, rendered above everything */}
      {activeView === 'commandments' && (
        <CommandmentsView onClose={() => handleViewChange('today')} />
      )}

      <main className={activeView === 'board' || activeView === 'calendar' || activeView === 'countdown' ? 'wide-container' : 'main-container'} style={{ display: activeView === 'commandments' ? 'none' : undefined }}>
        {activeView === 'browse' ? (
          <BrowseView />
        ) : activeView === 'stats' ? (
          <StatsView />
        ) : activeView === 'targets' ? (
          <TargetsView />
        ) : activeView === 'board' ? (
          <BoardView />
        ) : activeView === 'photos' ? (
          <PhotosView />
        ) : activeView === 'calendar' ? (
          <CalendarView />
        ) : activeView === 'countdown' ? (
          <CountdownView />
        ) : (
          <>
            {/* Quote — only on today's view */}
            {isViewingToday && <QuoteDisplay />}

            {/* Date heading */}
            <div>
              <h1 className="date-heading">
                {isViewingToday ? 'Today' : formatDisplayDate(selectedDate)}
              </h1>
              <p className="date-sub">
                {isViewingToday
                  ? formatDisplayDate(selectedDate)
                  : isViewingPast
                  ? 'This entry is locked and read-only.'
                  : ''}
              </p>
            </div>

            {/* Entry content */}
            {loadingEntry ? (
              <div className="entry-card" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="quote-loading">
                  <span /><span /><span />
                </div>
              </div>
            ) : isViewingToday ? (
              <EntryForm
                date={selectedDate}
                initialEntry={currentEntry}
                onSaved={handleEntrySaved}
              />
            ) : (
              <ReadOnlyEntry entry={currentEntry} />
            )}
          </>
        )}
      </main>
    </>
  )
}
