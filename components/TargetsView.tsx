'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/apiClient'

// ── Types ─────────────────────────────────────────────────────
interface TargetItem {
  id: string
  text: string
  done: boolean
}

type SubTab = 'monthly' | 'semester'

// ── Helpers ───────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function currentMonthKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Target list (shared by both tabs) ─────────────────────────
function TargetList({
  items,
  onChange,
  saving,
  onSave,
  saved,
}: {
  items: TargetItem[]
  onChange: (items: TargetItem[]) => void
  saving: boolean
  onSave: () => void
  saved: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function toggleDone(id: string) {
    onChange(items.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function editText(id: string, text: string) {
    onChange(items.map(t => t.id === id ? { ...t, text } : t))
  }

  function deleteItem(id: string) {
    onChange(items.filter(t => t.id !== id))
  }

  function addItem() {
    const newItem: TargetItem = { id: uid(), text: '', done: false }
    onChange([...items, newItem])
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.target-item-input')
      inputs[inputs.length - 1]?.focus()
    }, 50)
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
    if (e.key === 'Backspace') {
      const item = items.find(t => t.id === id)
      if (item && item.text === '') {
        e.preventDefault()
        const idx = items.findIndex(t => t.id === id)
        deleteItem(id)
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('.target-item-input')
          inputs[Math.max(0, idx - 1)]?.focus()
        }, 50)
      }
    }
  }

  const done  = items.filter(t => t.done).length
  const total = items.length

  return (
    <div className="target-list-wrap">
      {total > 0 && (
        <div className="target-progress-row">
          <div className="target-progress-bar-bg">
            <div
              className="target-progress-bar-fill"
              style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
            />
          </div>
          <span className="target-progress-label">{done}/{total} done</span>
        </div>
      )}

      <ul className="target-list">
        {items.map((item) => (
          <li key={item.id} className={`target-item${item.done ? ' target-item--done' : ''}`}>
            <button
              className="target-checkbox"
              onClick={() => toggleDone(item.id)}
              aria-label={item.done ? 'Mark undone' : 'Mark done'}
              type="button"
            >
              {item.done ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="var(--accent)" strokeWidth="1.5" fill="var(--accent)"/>
                  <path d="M4.5 8l2.5 2.5L11 5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="var(--border-strong)" strokeWidth="1.5"/>
                </svg>
              )}
            </button>
            <input
              className="target-item-input"
              value={item.text}
              onChange={e => editText(item.id, e.target.value)}
              onKeyDown={e => handleKeyDown(e, item.id)}
              placeholder="Write a target…"
            />
            <button
              className="target-delete-btn"
              onClick={() => deleteItem(item.id)}
              aria-label="Delete target"
              type="button"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button className="target-add-btn" onClick={addItem} type="button">
        <span>＋</span> Add target
      </button>

      <div className="save-row" style={{ marginTop: 24 }}>
        <button
          className="save-btn"
          onClick={onSave}
          disabled={saving}
          type="button"
          id="targets-save-btn"
        >
          {saving && <span className="save-spinner" />}
          {saving ? 'Saving…' : 'Save Targets'}
        </button>
        {saved && <span className="save-confirm">✓ Saved</span>}
      </div>
    </div>
  )
}

// ── Monthly Panel ─────────────────────────────────────────────
function MonthlyPanel() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [items, setItems] = useState<TargetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/targets?type=monthly&key=${key}`)
      const data = await res.json()
      setItems(data.items ?? [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(monthKey) }, [monthKey, load])

  async function save() {
    setSaving(true)
    try {
      await apiFetch(`/api/targets?type=monthly&key=${monthKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  return (
    <div className="targets-panel anim-slide-up">
      {/* Month nav */}
      <div className="targets-month-nav">
        <button className="targets-nav-btn" onClick={() => setMonthKey(k => shiftMonth(k, -1))} aria-label="Previous month">‹</button>
        <h2 className="targets-month-label">{monthLabel(monthKey)}</h2>
        <button className="targets-nav-btn" onClick={() => setMonthKey(k => shiftMonth(k, 1))} aria-label="Next month">›</button>
      </div>

      {loading ? (
        <div className="stats-loading"><span className="save-spinner" style={{ width: 20, height: 20 }} /> Loading…</div>
      ) : (
        <TargetList items={items} onChange={setItems} saving={saving} onSave={save} saved={saved} />
      )}
    </div>
  )
}

// ── Semester Panel ────────────────────────────────────────────
function SemesterPanel() {
  const [semesters, setSemesters] = useState<string[]>([])
  const [activeSem, setActiveSem] = useState<string>('')
  const [items, setItems] = useState<TargetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  // Load semester list
  useEffect(() => {
    fetch('/api/targets?type=semester&key=__list__')
      .then(() => {}) // ignore, use DELETE hack
    // Use the DELETE endpoint (repurposed) to get list
    fetch('/api/targets', { method: 'DELETE' })
      .catch(() => {})
    // Actually, let's just fetch with a list flag
    loadSemesters()
  }, [])

  async function loadSemesters() {
    try {
      // Fetch all semester keys via query
      const res = await apiFetch('/api/targets/list?type=semester')
      if (res.ok) {
        const data = await res.json()
        const keys: string[] = data.map((d: any) => d.target_key)
        setSemesters(keys)
        if (keys.length > 0) loadSem(keys[0])
        else setLoading(false)
      } else {
        setLoading(false)
      }
    } catch { setLoading(false) }
  }

  async function loadSem(key: string) {
    setActiveSem(key)
    setLoading(true)
    try {
      const res = await apiFetch(`/api/targets?type=semester&key=${encodeURIComponent(key)}`)
      const data = await res.json()
      setItems(data.items ?? [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      await apiFetch(`/api/targets?type=semester&key=${encodeURIComponent(activeSem)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  async function createSemester() {
    if (!newName.trim()) return
    const key = newName.trim()
    await apiFetch(`/api/targets?type=semester&key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    })
    setSemesters(s => [key, ...s])
    setNewName('')
    setAdding(false)
    loadSem(key)
  }

  return (
    <div className="targets-panel anim-slide-up">
      {/* Semester selector */}
      <div className="targets-sem-header">
        {semesters.length > 0 && (
          <div className="targets-sem-tabs">
            {semesters.map(s => (
              <button
                key={s}
                className={`targets-sem-tab${activeSem === s ? ' active' : ''}`}
                onClick={() => loadSem(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <button className="target-add-sem-btn" onClick={() => setAdding(a => !a)}>
          {adding ? '✕ Cancel' : '＋ New Semester'}
        </button>
      </div>

      {adding && (
        <div className="targets-new-sem-row">
          <input
            className="targets-new-sem-input"
            placeholder="e.g. Sem 1 · 2026-27"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSemester()}
            autoFocus
          />
          <button className="save-btn" style={{ padding: '10px 20px' }} onClick={createSemester}>Create</button>
        </div>
      )}

      {semesters.length === 0 && !adding ? (
        <div className="stats-empty">
          <span className="no-entry-icon">🎓</span>
          <strong style={{ display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>No semesters yet</strong>
          Click "＋ New Semester" to create your first semester goals.
        </div>
      ) : loading ? (
        <div className="stats-loading"><span className="save-spinner" style={{ width: 20, height: 20 }} /> Loading…</div>
      ) : activeSem ? (
        <TargetList items={items} onChange={setItems} saving={saving} onSave={save} saved={saved} />
      ) : null}
    </div>
  )
}

// ── Main TargetsView ──────────────────────────────────────────
export default function TargetsView() {
  const [sub, setSub] = useState<SubTab>('monthly')

  return (
    <div className="targets-view">
      <div className="targets-header">
        <h2 className="stats-title">Targets</h2>
        <p className="stats-subtitle">Set goals, track what matters</p>
      </div>

      {/* Sub-tabs */}
      <div className="targets-subtabs">
        <button
          id="targets-tab-monthly"
          className={`targets-subtab${sub === 'monthly' ? ' active' : ''}`}
          onClick={() => setSub('monthly')}
        >
          📅 Monthly
        </button>
        <button
          id="targets-tab-semester"
          className={`targets-subtab${sub === 'semester' ? ' active' : ''}`}
          onClick={() => setSub('semester')}
        >
          🎓 Semester
        </button>
      </div>

      {sub === 'monthly' ? <MonthlyPanel /> : <SemesterPanel />}
    </div>
  )
}
