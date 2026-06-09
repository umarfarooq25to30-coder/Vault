// "On this day" past entries

import { Clock } from 'lucide-react'
import { MOODS } from './MoodPicker'

export default function OnThisDay({
  entries,
  onEntryClick,
}) {
  if (entries.length === 0) return null

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5
          text-[#555555]" />
        <p className="text-[11px] uppercase
          tracking-wider text-[#444444]
          font-medium">
          On this day
        </p>
      </div>

      <div className="space-y-2">
        {entries.map(entry => {
          const mood = MOODS.find(
            m => m.id === entry.data?.mood
          )
          const year = entry.data?.date
            ?.split('-')[0]
          const yearsAgo = new Date().getFullYear() -
            parseInt(year)

          return (
            <div
              key={entry.id}
              onClick={() => onEntryClick(entry.id)}
              className="rounded-xl p-3 cursor-pointer
                transition-all duration-150"
              style={{
                backgroundColor:
                  'rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-center
                gap-2 mb-1">
                {mood && (
                  <span style={{ fontSize: 14 }}>
                    {mood.emoji}
                  </span>
                )}
                <span className="text-[11px]
                  text-[#555555]">
                  {yearsAgo} year{
                    yearsAgo !== 1 ? 's' : ''
                  } ago
                </span>
              </div>
              <p className="text-[12px]
                text-[#888888] line-clamp-2">
                {typeof entry.preview === 'string' ? entry.preview : 'No content'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
