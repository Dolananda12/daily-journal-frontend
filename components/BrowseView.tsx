'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTodayString, formatDisplayDate } from '@/lib/dateUtils'
import { apiFetch } from '@/lib/apiClient'

interface Entry {
  entry_date: string
  academics_notes: string
  life_notes: string
  hours_studied: number
  diary_notes: string
}

type FilterType = 'all' | 'academics' | 'life' | 'diary' | 'hours'

function getDefaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().split('T')[0]
}

export default function BrowseView() {
  const today = getTodayString()
  const [from, setFrom] = useState(getDefaultFrom())
  const [to, setTo] = useState(today)
  const [filter, setFilter] = useState<FilterType>('all')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const fetchEntries = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await apiFetch(`/api/entries?from=${from}&to=${to}`)
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [from, to])

  // Auto-fetch on mount
  useEffect(() => { fetchEntries() }, [fetchEntries])

  const totalHours = entries.reduce((sum, e) => sum + (e.hours_studied ?? 0), 0)
  const entriesWithAcademics = entries.filter((e) => e.academics_notes?.trim())
  const entriesWithLife = entries.filter((e) => e.life_notes?.trim())

  const filteredEntries = entries.filter((e) => {
    if (filter === 'academics') return !!e.academics_notes?.trim()
    if (filter === 'life') return !!e.life_notes?.trim()
    if (filter === 'diary') return !!e.diary_notes?.trim()
    if (filter === 'hours') return (e.hours_studied ?? 0) > 0
    return true
  })

  return (
    <div className="browse-view anim-fade-in">
      {/* ── Filter bar ── */}
      <div className="browse-controls">
        <div className="browse-range">
          <div className="range-group">
            <label className="range-label" htmlFor="from-date">From</label>
            <input
              id="from-date"
              type="date"
              className="range-input"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <span className="range-sep">→</span>
          <div className="range-group">
            <label className="range-label" htmlFor="to-date">To</label>
            <input
              id="to-date"
              type="date"
              className="range-input"
              value={to}
              min={from}
              max={today}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            id="browse-search-btn"
            className="browse-search-btn"
            onClick={fetchEntries}
            disabled={loading}
          >
            {loading ? (
              <span className="save-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.35)' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
            Search
          </button>
        </div>

        <div className="filter-pills">
          {([
            { key: 'all',       label: 'All',       icon: '✦' },
            { key: 'academics', label: 'Academics',  icon: '📚' },
            { key: 'life',      label: 'Life',       icon: '🌱' },
            { key: 'diary',     label: 'Diary',      icon: '📓' },
            { key: 'hours',     label: 'Hours',      icon: '⏱' },
          ] as { key: FilterType; label: string; icon: string }[]).map(({ key, label, icon }) => (
            <button
              key={key}
              id={`filter-${key}-btn`}
              className={`filter-pill${filter === key ? ' filter-pill--active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary stats ── */}
      {searched && !loading && entries.length > 0 && (
        <div className="browse-stats anim-slide-up">
          <div className="stat-chip">
            <span className="stat-value">{entries.length}</span>
            <span className="stat-label">entries</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{totalHours.toFixed(1)}</span>
            <span className="stat-label">hours studied</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{entriesWithAcademics.length}</span>
            <span className="stat-label">with academics</span>
          </div>
          <div className="stat-chip">
            <span className="stat-value">{entriesWithLife.length}</span>
            <span className="stat-label">with life lessons</span>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div className="quote-loading" style={{ justifyContent: 'center' }}>
            <span /><span /><span />
          </div>
        </div>
      ) : searched && filteredEntries.length === 0 ? (
        <div className="no-entry-box" style={{ marginTop: '24px' }}>
          <span className="no-entry-icon">🔍</span>
          <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-2)' }}>
            No entries found
          </strong>
          Try adjusting the date range or filter.
        </div>
      ) : (
        <div className="browse-entries">
          {filteredEntries.map((entry, idx) => (
            <BrowseEntryCard key={entry.entry_date} entry={entry} filter={filter} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrowseEntryCard({
  entry,
  filter,
  index,
}: {
  entry: Entry
  filter: FilterType
  index: number
}) {
  const showAcademics = filter === 'all' || filter === 'academics'
  const showLife = filter === 'all' || filter === 'life'
  const showDiary = filter === 'all' || filter === 'diary'
  const showHours = filter === 'all' || filter === 'hours'

  return (
    <div
      className="browse-entry-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="bec-header">
        <div>
          <div className="bec-date">{formatDisplayDate(entry.entry_date)}</div>
          <div className="bec-date-raw">{entry.entry_date}</div>
        </div>
        {(filter === 'all' || filter === 'hours') && (
          <div className="bec-hours-badge">
            <span className="bec-hours-num">{entry.hours_studied ?? 0}</span>
            <span className="bec-hours-unit">hrs</span>
          </div>
        )}
      </div>

      {showAcademics && entry.academics_notes?.trim() && (
        <div className="bec-section">
          <div className="bec-section-label"><span>📚</span> Academics</div>
          <div className="bec-section-text">{entry.academics_notes}</div>
        </div>
      )}

      {showLife && entry.life_notes?.trim() && (
        <div className="bec-section">
          <div className="bec-section-label"><span>🌱</span> Life</div>
          <div className="bec-section-text">{entry.life_notes}</div>
        </div>
      )}

      {showDiary && entry.diary_notes?.trim() && (
        <div className="bec-section bec-diary-section">
          <div className="bec-section-label diary-label"><span>📓</span> Dear Diary</div>
          <div className="bec-section-text diary-browse-text">{entry.diary_notes}</div>
        </div>
      )}

      {filter === 'hours' && (
        <div className="bec-hours-only">
          <span className="readonly-hours-value">{entry.hours_studied ?? 0}</span>
          <span className="readonly-hours-label">hours studied this day</span>
        </div>
      )}

      {filter === 'all' && !entry.academics_notes?.trim() && !entry.life_notes?.trim() && !entry.diary_notes?.trim() && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          No notes recorded.
        </div>
      )}
    </div>
  )
}
