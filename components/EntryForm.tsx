'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ── Types ──────────────────────────────────────────────────────
interface TodoItem {
  id: string
  text: string
  done: boolean
}

interface TargetItem {
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
  onOpenFailureRegister?: () => void
}

function uid() { return Math.random().toString(36).slice(2, 10) }

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function getMonday(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}

function currentWeekKey(dateStr: string) {
  const base = new Date(dateStr + 'T00:00:00')
  const mon = getMonday(base)
  const y = mon.getFullYear()
  const m = String(mon.getMonth() + 1).padStart(2, '0')
  const d = String(mon.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekLabel(weekKey: string) {
  if (!weekKey) return ''
  const [y, m, d] = weekKey.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} – ${endStr}`
}

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
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('.todo-item-input')
      const last = textareas[textareas.length - 1]
      last?.focus()
      autoResize(last)
    }, 40)
  }
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      add()
    }
    if (e.key === 'Backspace') {
      const item = items.find(t => t.id === id)
      if (item?.text === '') {
        e.preventDefault()
        const idx = items.findIndex(t => t.id === id)
        remove(id)
        setTimeout(() => {
          const textareas = document.querySelectorAll<HTMLTextAreaElement>('.todo-item-input')
          const prev = textareas[Math.max(0, idx - 1)]
          prev?.focus()
          autoResize(prev)
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
            <textarea
              className="todo-item-input"
              rows={1}
              ref={el => autoResize(el)}
              value={item.text}
              onChange={e => {
                edit(item.id, e.target.value)
                autoResize(e.target)
              }}
              onFocus={e => autoResize(e.target)}
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
export default function EntryForm({ date, initialEntry, onSaved, onOpenFailureRegister }: EntryFormProps) {
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

  // ── Carry over unfinished tasks from previous days ──
  useEffect(() => {
    // If today already has tasks loaded from DB, don't overwrite
    if ((initialEntry?.todos ?? []).length > 0) return

    const sessionKey = `todo-migrated-${date}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) return

    let isMounted = true

    async function loadUndoneTasks() {
      try {
        // 1. Try yesterday first
        const today = new Date(date + 'T00:00:00')
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        const yStr = [
          yesterday.getFullYear(),
          String(yesterday.getMonth() + 1).padStart(2, '0'),
          String(yesterday.getDate()).padStart(2, '0'),
        ].join('-')

        const yRes = await apiFetch(`/api/entries/${yStr}`)
        if (yRes.ok) {
          const text = await yRes.text()
          const data = text ? JSON.parse(text) : null
          const unfinished: TodoItem[] = (data?.todos ?? [])
            .filter((t: TodoItem) => !t.done)
            .map((t: TodoItem) => ({ ...t, id: uid(), done: false }))
          if (unfinished.length > 0 && isMounted) {
            if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, '1')
            setTodos(prev => (prev.length === 0 ? unfinished : prev))
            setCarriedOver(unfinished.length)
            return
          }
        }

        // 2. If yesterday had no undone tasks, check most recent past entry
        const listRes = await apiFetch('/api/entries')
        if (listRes.ok) {
          const listText = await listRes.text()
          const listData = listText ? JSON.parse(listText) : []
          if (Array.isArray(listData)) {
            const pastDates = listData
              .map((e: { entry_date: string }) => e.entry_date)
              .filter((d: string) => d < date)
              .sort((a: string, b: string) => b.localeCompare(a))

            if (pastDates.length > 0 && pastDates[0] !== yStr) {
              const mRes = await apiFetch(`/api/entries/${pastDates[0]}`)
              if (mRes.ok) {
                const mText = await mRes.text()
                const mData = mText ? JSON.parse(mText) : null
                const unfinished: TodoItem[] = (mData?.todos ?? [])
                  .filter((t: TodoItem) => !t.done)
                  .map((t: TodoItem) => ({ ...t, id: uid(), done: false }))
                if (unfinished.length > 0 && isMounted) {
                  if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, '1')
                  setTodos(prev => (prev.length === 0 ? unfinished : prev))
                  setCarriedOver(unfinished.length)
                }
              }
            }
          }
        }
      } catch {
        // ignore carryover network error
      }
    }

    loadUndoneTasks()
    return () => {
      isMounted = false
    }
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

  // ── Weekly Targets ──
  const [weeklyTargets, setWeeklyTargets] = useState<TargetItem[]>([])
  const [weekKey, setWeekKey] = useState('')

  useEffect(() => {
    const wKey = currentWeekKey(date)
    setWeekKey(wKey)
    apiFetch(`/api/targets?type=weekly&key=${wKey}`)
      .then(async r => {
        if (!r.ok) return []
        const text = await r.text()
        const data = text ? JSON.parse(text) : null
        return Array.isArray(data?.items) ? data.items : []
      })
      .then(items => setWeeklyTargets(items))
      .catch(() => setWeeklyTargets([]))
  }, [date])

  const toggleWeeklyTarget = async (id: string) => {
    const updated = weeklyTargets.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    setWeeklyTargets(updated)
    try {
      await apiFetch(`/api/targets?type=weekly&key=${weekKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      })
    } catch {
      // rollback or ignore
    }
  }

  // ── Upcoming Events ──
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; event_date: string }[]>([])

  useEffect(() => {
    // Fetch upcoming events within 1 week (7 days) of selected date
    const baseDate = new Date(date + 'T00:00:00')
    const oneWeekLater = new Date(baseDate)
    oneWeekLater.setDate(baseDate.getDate() + 7)

    apiFetch(`/api/events/upcoming?from=${date}`)
      .then(async r => {
        if (!r.ok) return []
        const text = await r.text()
        const data = text ? JSON.parse(text) : []
        return Array.isArray(data) ? data : []
      })
      .then((data: { id: string; title: string; event_date: string }[]) => {
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

      {/* ── Weekly Targets Card (Displayed on TOP of Approaching Events) ── */}
      {weeklyTargets.length > 0 && (
        <div className="weekly-targets-today-card">
          <div className="weekly-targets-today-header">
            <div className="weekly-targets-today-title-wrap">
              <span className="weekly-targets-icon">⚡</span>
              <span className="weekly-targets-title">Weekly Targets</span>
              <span className="weekly-targets-range">{weekLabel(weekKey)}</span>
            </div>
            <span className="weekly-targets-badge">
              {weeklyTargets.filter(t => t.done).length}/{weeklyTargets.length} done
            </span>
          </div>
          <div className="weekly-targets-today-list">
            {weeklyTargets.map(target => (
              <div key={target.id} className={`weekly-target-item${target.done ? ' done' : ''}`}>
                <button
                  type="button"
                  className="todo-checkbox"
                  onClick={() => toggleWeeklyTarget(target.id)}
                  aria-label={target.done ? 'Mark undone' : 'Mark done'}
                >
                  {target.done ? (
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
                <span className="weekly-target-text">{target.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

            {/* Failure Register link */}
            <div className="failure-register-link-row">
              <button
                type="button"
                className="failure-register-link-btn"
                onClick={onOpenFailureRegister}
              >
                📕 Failure Register
              </button>
              <span className="failure-register-link-hint">Reflect on setbacks &amp; extract lessons</span>
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

