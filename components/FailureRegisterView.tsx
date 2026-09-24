'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiClient'

interface FailureEntry {
  id: number
  entryDate: string
  description: string
  tag: 'Academic' | 'Life'
  lesson: string
  createdAt: string
}

interface Props {
  onClose: () => void
  defaultDate: string
}

const QUOTES = [
  { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "Every adversity, every failure, every heartache carries with it the seed of an equal or greater benefit.", author: "Napoleon Hill" },
  { text: "Failure is the condiment that gives success its flavor.", author: "Truman Capote" },
  { text: "Do not be embarrassed by your failures, learn from them and start again.", author: "Richard Branson" },
  { text: "It's fine to celebrate success but it is more important to heed the lessons of failure.", author: "Bill Gates" },
  { text: "We need to accept that we won't always make the right decisions — that's what makes us human.", author: "Arianna Huffington" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "The only real mistake is the one from which we learn nothing.", author: "Henry Ford" },
]

export default function FailureRegisterView({ onClose, defaultDate }: Props) {
  const [entries, setEntries] = useState<FailureEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [quoteVisible, setQuoteVisible] = useState(true)

  // Form state
  const [formDate, setFormDate] = useState(defaultDate)
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState<'Academic' | 'Life'>('Academic')
  const [lesson, setLesson] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchEntries = useCallback(() => {
    setLoading(true)
    apiFetch('/api/failures')
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Cycle quotes every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % QUOTES.length)
        setQuoteVisible(true)
      }, 400)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  async function handleSubmit() {
    if (!description.trim()) return
    setSaving(true)
    try {
      await apiFetch('/api/failures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryDate: formDate, description, tag, lesson }),
      })
      setDescription('')
      setLesson('')
      setShowForm(false)
      fetchEntries()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this entry from your Failure Register?')) return
    await apiFetch(`/api/failures/${id}`, { method: 'DELETE' })
    fetchEntries()
  }

  const quote = QUOTES[quoteIndex]

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="failure-overlay anim-fade-in" role="dialog" aria-modal="true">
      <div className="failure-panel">

        {/* ── Header ── */}
        <div className="failure-header">
          <div className="failure-header-left">
            <span className="failure-header-icon">📕</span>
            <div>
              <h1 className="failure-title">Failure Register</h1>
              <p className="failure-subtitle">Document failures. Extract lessons. Grow.</p>
            </div>
          </div>
          <button className="failure-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Quote Banner ── */}
        <div className="failure-quote-card">
          <div className={`failure-quote-text ${quoteVisible ? 'failure-quote-visible' : 'failure-quote-hidden'}`}>
            <span className="failure-quote-mark">"</span>
            {quote.text}
            <span className="failure-quote-mark">"</span>
          </div>
          <div className={`failure-quote-author ${quoteVisible ? 'failure-quote-visible' : 'failure-quote-hidden'}`}>
            — {quote.author}
          </div>
        </div>

        {/* ── Add New Button ── */}
        <div className="failure-add-row">
          <button
            className="failure-add-btn"
            onClick={() => setShowForm(f => !f)}
          >
            {showForm ? '✕ Cancel' : '+ Log a Failure'}
          </button>
          <span className="failure-count-badge">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {/* ── Form ── */}
        {showForm && (
          <div className="failure-form anim-slide-up">
            <div className="failure-form-grid">
              <div className="failure-field">
                <label className="failure-field-label">📅 Date</label>
                <input
                  type="date"
                  className="failure-input"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                />
              </div>
              <div className="failure-field">
                <label className="failure-field-label">🏷 Tag</label>
                <select
                  className="failure-input"
                  value={tag}
                  onChange={e => setTag(e.target.value as 'Academic' | 'Life')}
                >
                  <option value="Academic">📚 Academic</option>
                  <option value="Life">🌱 Life</option>
                </select>
              </div>
            </div>
            <div className="failure-field">
              <label className="failure-field-label">💥 What Failed?</label>
              <textarea
                className="failure-textarea"
                placeholder="Describe what happened — be honest with yourself..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="failure-field">
              <label className="failure-field-label">💡 Lesson Learned</label>
              <textarea
                className="failure-textarea"
                placeholder="What will you do differently? What did this teach you?"
                value={lesson}
                onChange={e => setLesson(e.target.value)}
                rows={3}
              />
            </div>
            <button
              className="failure-save-btn"
              onClick={handleSubmit}
              disabled={saving || !description.trim()}
            >
              {saving ? 'Saving…' : '📕 Add to Register'}
            </button>
          </div>
        )}

        {/* ── Entries List ── */}
        <div className="failure-list">
          {loading ? (
            <div className="failure-empty">Loading your register…</div>
          ) : entries.length === 0 ? (
            <div className="failure-empty">
              <span style={{ fontSize: '2rem' }}>🌱</span>
              <p>No failures logged yet. Your register is clean.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Every master was once a beginner.</p>
            </div>
          ) : (
            entries.map(e => (
              <div key={e.id} className="failure-card anim-fade-in">
                <div className="failure-card-header">
                  <div className="failure-card-meta">
                    <span className="failure-date-badge">{formatDate(e.entryDate)}</span>
                    <span className={`failure-tag-pill failure-tag-${e.tag.toLowerCase()}`}>
                      {e.tag === 'Academic' ? '📚' : '🌱'} {e.tag}
                    </span>
                  </div>
                  <button
                    className="failure-delete-btn"
                    onClick={() => handleDelete(e.id)}
                    aria-label="Delete entry"
                  >✕</button>
                </div>
                <p className="failure-card-description">{e.description}</p>
                {e.lesson && (
                  <div className="failure-lesson-box">
                    <span className="failure-lesson-label">💡 Lesson:</span>
                    <span className="failure-lesson-text">{e.lesson}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
