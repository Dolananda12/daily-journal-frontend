'use client'

import { useEffect } from 'react'

const COMMANDMENTS = [
  'The universe is transient; the only permanent thing is change — both in the personal and professional spheres.',
  'I am the chosen one. I shall never give up the visions I have received, or continue to receive.',
  'I shall compare myself with myself, and myself only — it does not matter if I am competing with 1, 1,000, or 1 million.',
  'Worrying about the future will not make us feel better, nor will it solve anything.',
  'Be the magnanimous Sun that holds the planets — the people we care about: parents and friends.',
  'We have a lot to improve, both in skills and in body, with only three years of time.',
]

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

interface CommandmentsViewProps {
  onClose: () => void
}

export default function CommandmentsView({ onClose }: CommandmentsViewProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="cmd-overlay" role="dialog" aria-modal="true" aria-label="Commandments">
      {/* Header */}
      <div className="cmd-header">
        <span className="cmd-title-label">THE COMMANDMENTS</span>
        <button
          className="cmd-close"
          onClick={onClose}
          aria-label="Close commandments"
          id="commandments-close-btn"
        >
          ✕
        </button>
      </div>

      {/* Commandments list */}
      <ol className="cmd-list">
        {COMMANDMENTS.map((text, i) => (
          <li key={i} className="cmd-item">
            <span className="cmd-numeral">{ROMAN[i]}</span>
            <p className="cmd-text">{text}</p>
          </li>
        ))}
      </ol>

      {/* Footer rule */}
      <div className="cmd-footer">
        <div className="cmd-footer-line" />
        <span className="cmd-footer-text">Non-negotiable.</span>
        <div className="cmd-footer-line" />
      </div>
    </div>
  )
}
