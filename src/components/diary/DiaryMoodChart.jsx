// Last 7 days mood visualization

import { MOODS } from './MoodPicker'

export default function DiaryMoodChart({
  last7Days
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] uppercase
        tracking-wider text-[#444444]
        font-medium mb-3">
        Last 7 days
      </p>

      <div className="flex items-end gap-1.5
        justify-between">
        {last7Days.map((day, i) => {
          const mood = MOODS.find(
            m => m.id === day.mood
          )

          return (
            <div key={i}
              className="flex flex-col items-center
                gap-1.5 flex-1">
              {/* Mood emoji or empty */}
              <span style={{
                fontSize: 16,
                opacity: mood ? 1 : 0.2,
              }}>
                {mood?.emoji || '○'}
              </span>

              {/* Day label */}
              <span className="text-[9px]
                uppercase tracking-wider"
                style={{
                  color: i === 6
                    ? '#F0F0F0'
                    : '#444444',
                }}>
                {day.day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
