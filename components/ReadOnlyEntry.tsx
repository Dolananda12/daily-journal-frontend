'use client'

import { useState } from 'react'

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

interface ReadOnlyEntryProps {
  entry: Entry | null
}

export default function ReadOnlyEntry({ entry }: ReadOnlyEntryProps) {
  const [journalOpen, setJournalOpen] = useState(false)

  if (!entry) {
    return (
      <div className="no-entry-box anim-slide-up">
        <span className="no-entry-icon">📭</span>
        <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-2)' }}>
          No entry recorded
        </strong>
        This day has passed without a journal entry.
      </div>
    )
  }

  const todos = entry.todos ?? []
  const done  = todos.filter(t => t.done).length
  const total = todos.length
  const hasJournal = !!(entry.academics_notes || entry.life_notes || entry.diary_notes)

  return (
    <div className="readonly-card anim-slide-up">
      <div className="readonly-badge"><span>🔒</span> Read-only</div>

      {/* ── Todos ── */}
      {todos.length > 0 && (
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
            {todos.map(item => (
              <li key={item.id} className={`todo-item${item.done ? ' todo-item--done' : ''}`}>
                <span className="todo-checkbox" aria-hidden>
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
                </span>
                <span className="todo-item-text">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Journal accordion ── */}
      {hasJournal && (
        <div className="journal-accordion">
          <button
            type="button"
            className="journal-accordion-toggle"
            onClick={() => setJournalOpen(o => !o)}
            aria-expanded={journalOpen}
          >
            <span className="journal-accordion-label"><span>📖</span> Journal & Hours</span>
            <span className={`journal-accordion-arrow${journalOpen ? ' open' : ''}`}>›</span>
          </button>

          {journalOpen && (
            <div className="journal-accordion-body">
              <div className="readonly-section">
                <div className="readonly-section-label"><span>📚</span> What I Learnt — Academics</div>
                <div className={`readonly-text${!entry.academics_notes ? ' empty' : ''}`}>
                  {entry.academics_notes || 'Nothing recorded.'}
                </div>
              </div>

              <div className="readonly-section">
                <div className="readonly-section-label"><span>🌱</span> What I Learnt — Life</div>
                <div className={`readonly-text${!entry.life_notes ? ' empty' : ''}`}>
                  {entry.life_notes || 'Nothing recorded.'}
                </div>
              </div>

              {entry.diary_notes ? (
                <div className="readonly-section">
                  <div className="readonly-section-label diary-label"><span>📓</span> Dear Diary</div>
                  <div className="readonly-text diary-readonly-text">{entry.diary_notes}</div>
                </div>
              ) : null}

              <div className="readonly-section">
                <div className="readonly-section-label"><span>⏱</span> Hours Studied</div>
                <div className="readonly-hours">
                  <span className="readonly-hours-value">{entry.hours_studied ?? 0}</span>
                  <span className="readonly-hours-label">hours</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hours shown outside accordion if no journal content */}
      {!hasJournal && (
        <div className="readonly-section">
          <div className="readonly-section-label"><span>⏱</span> Hours Studied</div>
          <div className="readonly-hours">
            <span className="readonly-hours-value">{entry.hours_studied ?? 0}</span>
            <span className="readonly-hours-label">hours</span>
          </div>
        </div>
      )}
    </div>
  )
}
