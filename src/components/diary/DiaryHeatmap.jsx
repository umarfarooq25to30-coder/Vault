// GitHub-style mood heatmap
// 52 weeks x 7 days grid

import { useState } from 'react'
import { MOODS } from './MoodPicker'

export default function DiaryHeatmap({
  heatmapData,
  onDayClick,
}) {
  const [tooltip, setTooltip] = useState(null)

  // Build 52 weeks of data
  const today = new Date()
  const weeks = []

  // Start from 52 weeks ago, align to Sunday
  const startDate = new Date(today)
  startDate.setDate(
    startDate.getDate() - 52 * 7
  )
  // Align to Sunday
  startDate.setDate(
    startDate.getDate() - startDate.getDay()
  )

  for (let w = 0; w < 53; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(
        startDate.getDate() + w * 7 + d
      )
      const dateStr = date
        .toISOString().split('T')[0]
      const isFuture = date > today
      const data = heatmapData[dateStr]
      const isToday = dateStr === today
        .toISOString().split('T')[0]

      week.push({
        date: dateStr,
        data,
        isFuture,
        isToday,
        day: d,
      })
    }
    weeks.push(week)
  }

  const getMoodColor = (mood) => {
    const m = MOODS.find(x => x.id === mood)
    return m?.color || null
  }

  const getCellColor = (cell) => {
    if (cell.isFuture) return 'transparent'
    if (!cell.data) return '#1E1E1E'
    return getMoodColor(cell.data.mood) || 
      '#3A3A3A'
  }

  const dayLabels = ['S','M','T','W','T','F','S']

  return (
    <div className="p-4">
      <div className="flex items-start gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5
          pt-5 flex-shrink-0">
          {dayLabels.map((d, i) => (
            <div key={i}
              className="h-7 flex items-center
                justify-center text-[10px] font-medium
                text-[#A0A0A0] w-5">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="overflow-x-auto flex-1">
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi}
                className="flex flex-col gap-0.5">
                {/* Month label (first week
                    of each month) */}
                <div className="h-5 flex items-end">
                  {week[0] && !week[0].isFuture &&
                   new Date(week[0].date).getDate() 
                   <= 7 ? (
                    <span className="text-[10px] font-medium
                      text-[#A0A0A0]">
                      {new Date(
                        week[0].date + 'T12:00:00'
                      ).toLocaleDateString('en-US', {
                        month: 'short'
                      })}
                    </span>
                  ) : null}
                </div>

                {/* Day cells */}
                {week.map((cell, di) => (
                  <div
                    key={di}
                    onClick={() => {
                      if (!cell.isFuture) {
                        onDayClick(cell.date)
                      }
                    }}
                    onMouseEnter={() => 
                      setTooltip(cell)}
                    onMouseLeave={() => 
                      setTooltip(null)}
                    className="group w-7 h-7 rounded flex items-center justify-center
                      transition-all duration-100"
                    style={{
                      backgroundColor: 
                        getCellColor(cell),
                      cursor: cell.isFuture
                        ? 'default'
                        : 'pointer',
                      opacity: cell.isFuture
                        ? 0
                        : 1,
                      boxShadow: cell.isToday
                        ? '0 0 0 1.5px #F0F0F0'
                        : 'none',
                      transform: tooltip?.date === 
                        cell.date
                        ? 'scale(1.15)'
                        : 'scale(1)',
                    }}
                  >
                    {!cell.isFuture && (
                      <span className="text-[11px] font-medium text-[rgba(255,255,255,0.7)] group-hover:text-white transition-colors duration-150">
                        {new Date(cell.date + 'T12:00:00').getDate()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.date && (
        <div className="mt-4 text-center">
          <p className="text-[13px] text-[#A0A0A0]">
            {new Date(
              tooltip.date + 'T12:00:00'
            ).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            {tooltip.data?.mood && ` · ${
              MOODS.find(
                m => m.id === tooltip.data.mood
              )?.emoji
            } ${
              MOODS.find(
                m => m.id === tooltip.data.mood
              )?.label
            }`}
            {tooltip.data?.wordCount > 0 && 
              ` · ${tooltip.data.wordCount} words`}
            {!tooltip.data && ' · No entry'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4
        mt-5 flex-wrap">
        <span className="text-[11px] font-medium
          text-[#A0A0A0]">
          Moods:
        </span>
        {MOODS.map(mood => (
          <div key={mood.id}
            className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm"
              style={{ 
                backgroundColor: mood.color 
              }} />
            <span className="text-[11px] font-medium"
              style={{ color: mood.color }}>
              {mood.emoji}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
