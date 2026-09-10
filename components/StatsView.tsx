'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { getEffectiveTodayString } from '@/lib/dateUtils'
import { apiFetch } from '@/lib/apiClient'

type Range = '7' | '30' | 'all'

interface DayData {
  date: string        // YYYY-MM-DD
  label: string       // e.g. "Jul 12"
  hours: number
  hasEntry: boolean
}

interface StatsViewProps {}

function buildDateRange(range: Range, effectiveToday: string): string[] {
  const today = new Date(effectiveToday + 'T00:00:00')
  if (range === 'all') return []   // handled separately — use API data min date

  const days = range === '7' ? 7 : 30
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function formatLabel(dateStr: string, range: Range): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (range === '7') {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) // "Sat 12"
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // "Jul 12"
}

function calcStreak(data: DayData[]): number {
  let max = 0
  let cur = 0
  for (const d of data) {
    if (d.hours > 0) { cur++; max = Math.max(max, cur) }
    else cur = 0
  }
  return max
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const hours = payload[0].value as number
  return (
    <div className="stats-tooltip">
      <div className="stats-tooltip-date">{label}</div>
      <div className="stats-tooltip-hours">
        {hours > 0 ? `${hours} hr${hours !== 1 ? 's' : ''}` : 'No study logged'}
      </div>
    </div>
  )
}

export default function StatsView(_props: StatsViewProps) {
  const [range, setRange] = useState<Range>('7')
  const [chartData, setChartData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const effectiveToday = getEffectiveTodayString()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const today = effectiveToday

      let from: string
      let to = today

      if (range === 'all') {
        // Fetch everything — use a very early date
        from = '2020-01-01'
      } else {
        const days = range === '7' ? 7 : 30
        const d = new Date(today + 'T00:00:00')
        d.setDate(d.getDate() - (days - 1))
        from = d.toISOString().split('T')[0]
      }

      const res = await apiFetch(`/api/entries?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Failed to load entries')
      const entries: { entry_date: string; hours_studied: number }[] = await res.json()

      // Build a map for quick lookup
      const entryMap = new Map(entries.map((e) => [e.entry_date, e.hours_studied ?? 0]))

      // Build the full date array
      let dates: string[]
      if (range === 'all') {
        if (entries.length === 0) {
          setChartData([])
          return
        }
        const earliest = entries[0].entry_date
        dates = buildDateRange('all', today)
        // generate from earliest to today
        const start = new Date(earliest + 'T00:00:00')
        const end = new Date(today + 'T00:00:00')
        dates = []
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0])
        }
      } else {
        dates = buildDateRange(range, today)
      }

      const data: DayData[] = dates.map((date) => ({
        date,
        label: formatLabel(date, range),
        hours: entryMap.get(date) ?? 0,
        hasEntry: entryMap.has(date),
      }))

      setChartData(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [range, effectiveToday])

  useEffect(() => { loadData() }, [loadData])

  // Computed stats
  const totalHours = chartData.reduce((s, d) => s + d.hours, 0)
  const daysWithStudy = chartData.filter((d) => d.hours > 0).length
  const avgHours = chartData.length > 0 ? (totalHours / chartData.length) : 0
  const streak = calcStreak(chartData)

  const RANGES: { key: Range; label: string }[] = [
    { key: '7',   label: 'Last 7 days'  },
    { key: '30',  label: 'Last 30 days' },
    { key: 'all', label: 'All time'     },
  ]

  return (
    <div className="stats-view anim-slide-up">
      <div className="stats-header">
        <h2 className="stats-title">Study Hours</h2>
        <p className="stats-subtitle">Your consistency at a glance</p>
      </div>

      {/* Range toggle */}
      <div className="stats-range-toggle">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            id={`stats-range-${key}`}
            className={`stats-range-btn${range === key ? ' active' : ''}`}
            onClick={() => setRange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats chips */}
      {!loading && chartData.length > 0 && (
        <div className="stats-chips">
          <div className="stats-chip">
            <span className="stats-chip-value">{totalHours.toFixed(1)}</span>
            <span className="stats-chip-label">Total hrs</span>
          </div>
          <div className="stats-chip">
            <span className="stats-chip-value">{avgHours.toFixed(1)}</span>
            <span className="stats-chip-label">Avg hrs/day</span>
          </div>
          <div className="stats-chip">
            <span className="stats-chip-value">{daysWithStudy}</span>
            <span className="stats-chip-label">Days studied</span>
          </div>
          <div className="stats-chip">
            <span className="stats-chip-value">{streak}</span>
            <span className="stats-chip-label">Best streak</span>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div className="stats-chart-wrap">
        {loading ? (
          <div className="stats-loading">
            <span className="save-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            <span>Loading…</span>
          </div>
        ) : error ? (
          <div className="stats-empty">
            <span className="no-entry-icon">⚠️</span>
            <strong>{error}</strong>
          </div>
        ) : chartData.length === 0 ? (
          <div className="stats-empty">
            <span className="no-entry-icon">📊</span>
            <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-2)' }}>
              No entries yet
            </strong>
            Log your first day to see your chart here.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.06)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                axisLine={false}
                tickLine={false}
                interval={range === 'all' ? Math.floor(chartData.length / 10) : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,169,110,0.08)' }} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.hours > 0 ? 'var(--accent)' : 'rgba(201,169,110,0.18)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
