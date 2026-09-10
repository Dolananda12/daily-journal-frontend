'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiClient'

interface Quote {
  q: string
  a: string
}

export default function QuoteDisplay() {
  const [quote, setQuote] = useState<Quote | null>(null)

  useEffect(() => {
    apiFetch('/api/quote')
      .then((r) => r.json())
      .then(setQuote)
      .catch(() =>
        setQuote({ q: 'Every day is a new beginning.', a: 'Unknown' })
      )
  }, [])

  if (!quote) {
    return (
      <div className="quote-section">
        <div className="quote-loading">
          <span /><span /><span />
        </div>
      </div>
    )
  }

  return (
    <div className="quote-section anim-fade-in">
      <span className="quote-decoration">&ldquo;</span>
      <p className="quote-text">{quote.q}</p>
      <div className="quote-divider" style={{ marginBottom: '16px' }} />
      <span className="quote-author">— {quote.a}</span>
    </div>
  )
}
