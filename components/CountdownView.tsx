'use client'

import React, { useState, useEffect } from 'react'
import { Timer, Sparkles, Award, Target, Calendar } from 'lucide-react'

interface TimeLeft {
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
  isDone: boolean
}

export default function CountdownView() {
  const targetDate = new Date('2026-12-31T23:59:59')
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(new Date(), targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(new Date(), targetDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  function calculateTimeLeft(now: Date, target: Date): TimeLeft {
    if (now >= target) {
      return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isDone: true }
    }

    let temp = new Date(now)
    let months = 0
    while (true) {
      const nextMonth = new Date(temp)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      if (nextMonth <= target) {
        months++
        temp = nextMonth
      } else {
        break
      }
    }

    const remainingSec = Math.floor((target.getTime() - temp.getTime()) / 1000)
    const days = Math.floor(remainingSec / (3600 * 24))
    const hours = Math.floor((remainingSec % (3600 * 24)) / 3600)
    const minutes = Math.floor((remainingSec % 3600) / 60)
    const seconds = remainingSec % 60

    return { months, days, hours, minutes, seconds, isDone: false }
  }

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0')

  return (
    <div className="countdown-container anim-fade-in">
      
      {/* Header Banner */}
      <div className="countdown-header-card">
        <div className="countdown-badge-pill">
          <Sparkles size={14} className="countdown-sparkle-icon" />
          <span>2026 Goal Tracker</span>
        </div>
        <h1 className="countdown-main-heading">
          Placement Preparation Time Left
        </h1>
        <p className="countdown-sub-heading">
          Target Date: <strong>December 31, 2026 (End of Year)</strong> — Make every second count!
        </p>
      </div>

      {/* Main Countdown Grid */}
      {timeLeft.isDone ? (
        <div className="countdown-finished-card anim-scale-in">
          <Award size={48} className="text-amber-500 mb-3" />
          <h2 className="text-2xl font-bold text-black/80">Placement Prep Time Completed!</h2>
          <p className="text-black/60 text-sm mt-1">Best of luck with your interviews and career journey!</p>
        </div>
      ) : (
        <div className="countdown-timer-grid">
          
          {/* Months Box */}
          <div className="countdown-card">
            <div className="countdown-number">{formatTwoDigits(timeLeft.months)}</div>
            <div className="countdown-unit-label">MONTHS</div>
            <div className="countdown-subtext">{timeLeft.months === 1 ? '1 month' : `${timeLeft.months} months`} remaining</div>
          </div>

          {/* Days Box */}
          <div className="countdown-card">
            <div className="countdown-number">{formatTwoDigits(timeLeft.days)}</div>
            <div className="countdown-unit-label">DAYS</div>
            <div className="countdown-subtext">{timeLeft.days === 1 ? '1 day' : `${timeLeft.days} days`} remaining</div>
          </div>

          {/* Hours Box */}
          <div className="countdown-card">
            <div className="countdown-number">{formatTwoDigits(timeLeft.hours)}</div>
            <div className="countdown-unit-label">HOURS</div>
            <div className="countdown-subtext">{timeLeft.hours === 1 ? '1 hour' : `${timeLeft.hours} hours`} remaining</div>
          </div>

          {/* Minutes Box */}
          <div className="countdown-card">
            <div className="countdown-number">{formatTwoDigits(timeLeft.minutes)}</div>
            <div className="countdown-unit-label">MINUTES</div>
            <div className="countdown-subtext">{timeLeft.minutes === 1 ? '1 minute' : `${timeLeft.minutes} mins`} remaining</div>
          </div>

          {/* Seconds Box */}
          <div className="countdown-card countdown-card--accent">
            <div className="countdown-number countdown-number--pulse">{formatTwoDigits(timeLeft.seconds)}</div>
            <div className="countdown-unit-label countdown-unit-label--accent">SECONDS</div>
            <div className="countdown-subtext">Real-time ticking</div>
          </div>

        </div>
      )}

      {/* Motivational Quote & Tips Footer Card */}
      <div className="countdown-footer-card">
        <div className="countdown-footer-title">
          <Target size={18} style={{ color: 'var(--accent-dark)' }} />
          <span>Daily Preparation Focus</span>
        </div>
        <p className="countdown-footer-quote">
          "Success doesn't come from what you do occasionally, it comes from what you do consistently."
        </p>
        <div className="countdown-footer-tags">
          <span className="countdown-tag">📚 Academics & DSA</span>
          <span className="countdown-tag">💻 Core Concepts</span>
          <span className="countdown-tag">🎯 Daily Journaling</span>
        </div>
      </div>

    </div>
  )
}
