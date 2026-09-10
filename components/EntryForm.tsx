'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ── Types ──────────────────────────────────────────────────────
interface TodoItem {
  id: string
  text: string
  done: boolean
}

interface Entry {
  entry_date: string
  academics_notes: string
  life_notes: string
  hours_studied: number
  diary_notes: string
  todos: TodoItem[]
}

interface EntryFormProps {
  date: string
  initialEntry: Entry | null
  onSaved: (entry: Entry) => void
}

function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Todo list inline component ─────────────────────────────────
function TodoList({ items, onChange }: { items: TodoItem[]; onChange: (i: TodoItem[]) => void }) {
  function toggle(id: string) {
    onChange(items.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  function edit(id: string, text: string) {
    onChange(items.map(t => t.id === id ? { ...t, text } : t))
  }
  function remove(id: string) {
    onChange(items.filter(t => t.id !== id))
  }
  function add() {
    const next = [...items, { id: uid(), text: '', done: false }]
    onChange(next)
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.todo-item-input')
      inputs[inputs.length - 1]?.focus()
    }, 40)
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace') {
      const item = items.find(t => t.id === id)
      if (item?.text === '') {
        e.preventDefault()
        const idx = items.findIndex(t => t.id === id)
        remove(id)
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('.todo-item-input')
          inputs[Math.max(0, idx - 1)]?.focus()
        }, 40)
      }
    }
  }

  const done  = items.filter(t => t.done).length
  const total = items.length

  return (
    <div className="todo-section">
      <div className="todo-header-row">
        <span className="field-label">
          <span className="field-label-icon">✅</span> Tasks
        </span>
        {total > 0 && (
          <div className="todo-progress-pill">
            <div className="todo-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
            <span className="todo-progress-text">{done}/{total}</span>
          </div>
        )}
      </div>

      <ul className="todo-list">
        {items.map(item => (
          <li key={item.id} className={`todo-item${item.done ? ' todo-item--done' : ''}`}>
            <button
              type="button"
              className="todo-checkbox"
              onClick={() => toggle(item.id)}
              aria-label={item.done ? 'Mark undone' : 'Mark done'}
            >
              {item.done ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" fill="var(--accent)" />
                  <path d="M5 9l2.8 3L13 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="var(--border-strong)" strokeWidth="1.5"/>
                </svg>
              )}
            </button>
            <input
              className="todo-item-input"
              value={item.text}
              onChange={e => edit(item.id, e.target.value)}
              onKeyDown={e => onKey(e, item.id)}
              placeholder="Add a task…"
            />
            <button
              type="button"
              className="todo-delete-btn"
              onClick={() => remove(item.id)}
              aria-label="Delete task"
            >×</button>
          </li>
        ))}
      </ul>

      <button type="button" className="todo-add-btn" onClick={add}>
        <span>＋</span> Add task
      </button>
    </div>
  )
}

// ── Main EntryForm ─────────────────────────────────────────────
export default function EntryForm({ date, initialEntry, onSaved }: EntryFormProps) {
  const [todos,     setTodos]     = useState<TodoItem[]>(initialEntry?.todos ?? [])
  const [academics, setAcademics] = useState(initialEntry?.academics_notes ?? '')
  const [life,      setLife]      = useState(initialEntry?.life_notes ?? '')
  const [diary,     setDiary]     = useState(initialEntry?.diary_notes ?? '')
  const [hours,     setHours]     = useState<number>(initialEntry?.hours_studied ?? 0)
  const [journalOpen, setJournalOpen] = useState(
    !!(initialEntry?.academics_notes || initialEntry?.life_notes || initialEntry?.diary_notes)
  )
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [carriedOver, setCarriedOver] = useState(0) // count of tasks carried from previous day

  useEffect(() => {
    setTodos(initialEntry?.todos ?? [])
    setAcademics(initialEntry?.academics_notes ?? '')
    setLife(initialEntry?.life_notes ?? '')
    setDiary(initialEntry?.diary_notes ?? '')
    setHours(initialEntry?.hours_studied ?? 0)
    setJournalOpen(!!(initialEntry?.academics_notes || initialEntry?.life_notes || initialEntry?.diary_notes))
    setSaved(false)
    setCarriedOver(0)
  }, [date, initialEntry])

  // ── Carry over unfinished tasks from exactly the previous day ──
  useEffect(() => {
    // Guard 1: entry already saved in DB → always trust DB, never overwrite
    if (initialEntry !== null) return

    // Guard 2: migration already ran for this date this browser session
    //          (handles: user deletes tasks → refresh → they stay gone)
    const sessionKey = `todo-migrated-${date}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) return

    // Mark as done *before* the async fetch so concurrent renders can't double-run
    if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, '1')

    // Build EXACTLY yesterday's date string (one day back, no further)
    const today = new Date(date + 'T00:00:00')
    const prev  = new Date(today)
    prev.setDate(today.getDate() - 1)
    const prevStr = [
      prev.getFullYear(),
      String(prev.getMonth() + 1).padStart(2, '0'),
      String(prev.getDate()).padStart(2, '0'),
    ].join('-')

    apiFetch(`/api/entries/${prevStr}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const unfinished: TodoItem[] = (data.todos ?? [])
          .filter((t: TodoItem) => !t.done)
          .map((t: TodoItem) => ({ ...t, id: uid(), done: false }))
        if (unfinished.length > 0) {
          setTodos(unfinished)
          setCarriedOver(unfinished.length)
        }
      })
      .catch(() => {})
  }, [date, initialEntry])


  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await apiFetch(`/api/entries/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academics_notes: academics,
          life_notes: life,
          hours_studied: hours,
          diary_notes: diary,
          todos,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Failed to save.')
        return
      }
      const updated = await res.json()
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function adjustHours(delta: number) {
    setHours(h => Math.max(0, Math.min(24, parseFloat((h + delta).toFixed(1)))))
  }

  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; event_date: string }[]>([])

  useEffect(() => {
    // Fetch upcoming events within 1 week (7 days) of selected date
    const baseDate = new Date(date + 'T00:00:00')
    const oneWeekLater = new Date(baseDate)
    oneWeekLater.setDate(baseDate.getDate() + 7)

    apiFetch(`/api/events/upcoming?from=${date}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; title: string; event_date: string }[]) => {
        if (!Array.isArray(data)) {
          setUpcomingEvents([])
          return
        }
        // Filter events taking place within 7 days
        const filtered = data.filter(ev => {
          const evDate = new Date(ev.event_date + 'T00:00:00')
          return evDate >= baseDate && evDate <= oneWeekLater
        })
        setUpcomingEvents(filtered)
      })
      .catch(() => setUpcomingEvents([]))
  }, [date])

  return (
    <div className="entry-card anim-slide-up">

      {/* ── Approaching Events Banner (1 Week Window) ── */}
      {upcomingEvents.length > 0 && (
        <div className="upcoming-events-card">
          <div className="upcoming-events-header">
            <span>📅</span> Approaching Events (Next 7 Days)
          </div>
          <div className="upcoming-events-list">
            {upcomingEvents.map(ev => {
              const evDate = new Date(ev.event_date + 'T00:00:00')
              const formatted = evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return (
                <div key={ev.id} className="upcoming-event-item">
                  <span className="upcoming-event-title">{ev.title}</span>
                  <span className="upcoming-event-date">{formatted}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tasks ── */}
      {carriedOver > 0 && (
        <div className="todo-carryover-banner">
          <span>↩</span>
          {carriedOver} unfinished task{carriedOver !== 1 ? 's' : ''} carried over from yesterday — save to keep them.
        </div>
      )}
      <TodoList items={todos} onChange={setTodos} />


      {/* ── Journal accordion ── */}
      <div className="journal-accordion">
        <button
          type="button"
          className="journal-accordion-toggle"
          onClick={() => setJournalOpen(o => !o)}
          aria-expanded={journalOpen}
          id="journal-accordion-btn"
        >
          <span className="journal-accordion-label">
            <span>📖</span> Journal & Hours
          </span>
          <span className={`journal-accordion-arrow${journalOpen ? ' open' : ''}`}>›</span>
        </button>

        {journalOpen && (
          <div className="journal-accordion-body">
            {/* Academics */}
            <div className="field-group">
              <label className="field-label" htmlFor="academics-input">
                <span className="field-label-icon">📚</span> What I Learnt — Academics
              </label>
              <textarea
                id="academics-input"
                className="field-textarea"
                placeholder="What concepts, topics, or skills did you study today?"
                value={academics}
                onChange={e => setAcademics(e.target.value)}
                rows={4}
              />
            </div>

            {/* Life */}
            <div className="field-group">
              <label className="field-label" htmlFor="life-input">
                <span className="field-label-icon">🌱</span> What I Learnt — Life
              </label>
              <textarea
                id="life-input"
                className="field-textarea"
                placeholder="What life lessons, observations, or insights did today bring?"
                value={life}
                onChange={e => setLife(e.target.value)}
                rows={4}
              />
            </div>

            {/* Diary */}
            <div className="field-group">
              <label className="field-label" htmlFor="diary-input">
                <span className="field-label-icon">📓</span> Dear Diary
              </label>
              <textarea
                id="diary-input"
                className="field-textarea diary-textarea"
                placeholder="Write freely — how was your day? What's on your mind?"
                value={diary}
                onChange={e => setDiary(e.target.value)}
                rows={6}
              />
            </div>

            {/* Hours */}
            <div className="field-group">
              <label className="field-label">
                <span className="field-label-icon">⏱</span> Hours Studied
              </label>
              <div className="hours-row">
                <div className="hours-input-wrap">
                  <button type="button" className="hours-btn" onClick={() => adjustHours(-0.5)} aria-label="Decrease" id="hours-decrease-btn">−</button>
                  <input
                    id="hours-input"
                    type="number"
                    className="hours-number"
                    value={hours}
                    min={0} max={24} step={0.5}
                    onChange={e => setHours(parseFloat(e.target.value) || 0)}
                  />
                  <button type="button" className="hours-btn" onClick={() => adjustHours(0.5)} aria-label="Increase" id="hours-increase-btn">+</button>
                </div>
                <span className="hours-label">hours</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Save ── */}
      <div className="save-row">
        <button id="save-entry-btn" type="button" className="save-btn" onClick={handleSave} disabled={saving}>
          {saving && <span className="save-spinner" />}
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
        {saved && <span className="save-confirm">✓ Saved</span>}
      </div>
    </div>
  )
}
