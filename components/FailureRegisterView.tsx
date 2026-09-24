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

interface QuoteItem {
  text: string
  author: string
}

const LOCAL_FALLBACK_QUOTES: QuoteItem[] = [
  { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "Every adversity, every failure, every heartache carries with it the seed of an equal or greater benefit.", author: "Napoleon Hill" },
  { text: "Failure is the condiment that gives success its flavor.", author: "Truman Capote" },
  { text: "Do not be embarrassed by your failures, learn from them and start again.", author: "Richard Branson" },
  { text: "It's fine to celebrate success but it is more important to heed the lessons of failure.", author: "Bill Gates" },
  { text: "The only real mistake is the one from which we learn nothing.", author: "Henry Ford" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" }
]

export default function FailureRegisterView({ onClose, defaultDate }: Props) {
  const [entries, setEntries] = useState<FailureEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentQuote, setCurrentQuote] = useState<QuoteItem>(() => {
    const idx = Math.floor(Math.random() * LOCAL_FALLBACK_QUOTES.length)
    return LOCAL_FALLBACK_QUOTES[idx]
  })
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

  // Fetch a fresh quote from API
  const fetchNewQuote = useCallback(async () => {
    setQuoteVisible(false)
    try {
      const res = await apiFetch('/api/quote/random')
      if (res.ok) {
        const data = await res.json()
        if (data?.q) {
          setTimeout(() => {
            setCurrentQuote({ text: data.q, author: data.a || 'Unknown' })
            setQuoteVisible(true)
          }, 350)
          return
        }
      }
    } catch {
      // fallback handled below
    }

    // Fallback to rotating local curated list
    setTimeout(() => {
      const idx = Math.floor(Math.random() * LOCAL_FALLBACK_QUOTES.length)
      setCurrentQuote(LOCAL_FALLBACK_QUOTES[idx])
      setQuoteVisible(true)
    }, 350)
  }, [])

  // Cycle quote by calling the API every 7 seconds
  useEffect(() => {
    fetchNewQuote()
    const interval = setInterval(() => {
      fetchNewQuote()
    }, 7000)
    return () => clearInterval(interval)
  }, [fetchNewQuote])

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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="failure-page anim-fade-in">
      <div className="failure-container">

        {/* ── Top Header Navigation Bar ── */}
        <div className="failure-topbar">
          <button className="failure-back-btn" onClick={onClose}>
            ← Back to Journal
          </button>
          <div className="failure-topbar-title">
            <span className="failure-badge-pill">📕 Resilience &amp; Growth</span>
          </div>
          <span className="failure-count-badge-top">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {/* ── Main Hero Title Banner ── */}
        <div className="failure-hero-card">
          <div className="failure-hero-header">
            <span className="failure-hero-icon">📕</span>
            <div>
              <h1 className="failure-main-title">Failure Register</h1>
              <p className="failure-main-subtitle">Document failures. Extract wisdom. Level up.</p>
            </div>
          </div>

          {/* ── Live API Cycling Quote Banner ── */}
          <div className="failure-live-quote-card">
            <div className="failure-live-quote-header">
              <span className="failure-quote-live-indicator" />
              <span className="failure-quote-live-label">Daily Inspiration (Auto-Refreshing)</span>
              <button className="failure-quote-refresh-btn" onClick={fetchNewQuote} title="Get new quote">
                ↻ Next Quote
              </button>
            </div>
            <div className={`failure-quote-text ${quoteVisible ? 'failure-quote-visible' : 'failure-quote-hidden'}`}>
              <span className="failure-quote-mark">“</span>
              {currentQuote.text}
              <span className="failure-quote-mark">”</span>
            </div>
            <div className={`failure-quote-author ${quoteVisible ? 'failure-quote-visible' : 'failure-quote-hidden'}`}>
              — {currentQuote.author}
            </div>
          </div>
        </div>

        {/* ── Action Row ── */}
        <div className="failure-actions-bar">
          <button
            className="failure-primary-add-btn"
            onClick={() => setShowForm(f => !f)}
          >
            {showForm ? '✕ Close Form' : '+ Log New Failure'}
          </button>
        </div>

        {/* ── Add Failure Form ── */}
        {showForm && (
          <div className="failure-form-card anim-slide-up">
            <h3 className="failure-form-heading">Record a Setback &amp; Lesson</h3>
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
                <label className="failure-field-label">🏷 Category</label>
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
              <label className="failure-field-label">💥 What Happened / What Failed?</label>
              <textarea
                className="failure-textarea"
                placeholder="Be completely honest with yourself. What went wrong?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="failure-field">
              <label className="failure-field-label">💡 Lesson Learned &amp; Actionable Takeaway</label>
              <textarea
                className="failure-textarea"
                placeholder="What will you do differently next time? What wisdom did this provide?"
                value={lesson}
                onChange={e => setLesson(e.target.value)}
                rows={3}
              />
            </div>
            <div className="failure-form-footer">
              <button
                className="failure-save-submit-btn"
                onClick={handleSubmit}
                disabled={saving || !description.trim()}
              >
                {saving ? 'Saving…' : '📕 Save to Failure Register'}
              </button>
            </div>
          </div>
        )}

        {/* ── Entries History Section ── */}
        <div className="failure-entries-section">
          <h2 className="failure-section-title">Past Logs &amp; Wisdom</h2>
          {loading ? (
            <div className="failure-empty-card">Loading your register…</div>
          ) : entries.length === 0 ? (
            <div className="failure-empty-card">
              <span style={{ fontSize: '2.5rem' }}>🌱</span>
              <p className="failure-empty-main-text">No failures recorded yet.</p>
              <p className="failure-empty-sub-text">"Success consists of going from failure to failure without loss of enthusiasm."</p>
            </div>
          ) : (
            <div className="failure-cards-grid">
              {entries.map(e => (
                <div key={e.id} className="failure-entry-item-card anim-fade-in">
                  <div className="failure-card-top">
                    <div className="failure-card-meta-tags">
                      <span className="failure-date-pill">{formatDate(e.entryDate)}</span>
                      <span className={`failure-tag-badge failure-tag-${e.tag.toLowerCase()}`}>
                        {e.tag === 'Academic' ? '📚' : '🌱'} {e.tag}
                      </span>
                    </div>
                    <button
                      className="failure-delete-icon-btn"
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete log"
                      title="Delete log"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="failure-entry-description">{e.description}</p>
                  {e.lesson && (
                    <div className="failure-lesson-callout">
                      <span className="failure-lesson-tag-label">💡 LESSON LEARNED</span>
                      <p className="failure-lesson-content">{e.lesson}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
