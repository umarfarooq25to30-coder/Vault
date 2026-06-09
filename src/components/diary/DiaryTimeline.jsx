// Vertical timeline grouped by month
// Each entry is a card with mood tint

import React from 'react'
import { MOODS } from './MoodPicker'
import { WEATHER_OPTIONS } from './WeatherPicker'
import { Star, Image as ImageIcon } from 'lucide-react'

function EntryCard({ entry, onClick }) {
  const data = entry.data || {}
  const mood = MOODS.find(m => m.id === data.mood)
  const weather = WEATHER_OPTIONS.find(
    w => w.id === data.weather
  )

  const dateObj = data.date
    ? new Date(data.date + 'T12:00:00')
    : null

  const dayName = dateObj?.toLocaleDateString(
    'en-US', { weekday: 'long' }
  )
  const dateDisplay = dateObj?.toLocaleDateString(
    'en-US', { month: 'long', day: 'numeric' }
  )

  const readTime = data.readTime || 
    Math.max(1, Math.ceil(
      (data.wordCount || 0) / 200
    ))

  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer
        transition-all duration-200
        hover:scale-[1.005]"
      style={{
        backgroundColor: mood
          ? mood.bg
          : 'rgba(255,255,255,0.03)',
        // Subtle mood tint on entire card
      }}
    >
      {/* Top row */}
      <div className="flex items-start
        justify-between mb-3">
        <div>
          <div className="flex items-center gap-2
            mb-0.5">
            {mood && (
              <span style={{ fontSize: 22 }}>
                {mood.emoji}
              </span>
            )}
            <div>
              <p className="text-[11px] font-medium
                uppercase tracking-wider"
                style={{
                  color: mood
                    ? mood.color
                    : '#555555'
                }}>
                {dayName}
              </p>
              <p className="text-[16px] font-semibold
                text-[#F0F0F0] leading-tight">
                {dateDisplay}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2
          flex-shrink-0">
          {weather && (
            <span style={{ fontSize: 18 }}
              title={weather.label}>
              {weather.emoji}
            </span>
          )}
          {entry.isFavorite && (
            <Star className="w-4 h-4
              text-amber-400 fill-amber-400" />
          )}
        </div>
      </div>

      {/* Summary line (if exists) */}
      {typeof data.summary === 'string' && data.summary && (
        <p className="text-[14px] font-medium
          text-[#E0E0E0] mb-2 leading-snug">
          {data.summary}
        </p>
      )}

      {/* Preview text */}
      {typeof entry.preview === 'string' && entry.preview && (
        <p className="text-[14px] text-[#888888]
          line-clamp-3 leading-relaxed mb-3">
          {entry.preview}
        </p>
      )}

      {(!entry.preview || typeof entry.preview !== 'string') && (!data.summary || typeof data.summary !== 'string') && (
        <p className="text-[13px] text-[#444444]
          italic mb-3">
          No content yet...
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center gap-3
        flex-wrap">
        {/* Tags */}
        {(entry.tags || []).slice(0, 3)
          .map((tag, idx) => {
            if (typeof tag !== 'string') return null;
            return (
              <span key={typeof tag === 'string' ? tag : idx}
                className="text-[11px] px-2 py-0.5
                  rounded-full"
                style={{
                  backgroundColor:
                    'rgba(255,255,255,0.06)',
                  color: '#666666',
                }}>
                #{tag}
              </span>
            );
          })
        }

        <div className="ml-auto flex items-center
          gap-3">
          {/* Photos count */}
          {(data.photos?.length || 0) > 0 && (
            <div className="flex items-center
              gap-1">
              <ImageIcon className="w-3.5 h-3.5
                text-[#555555]" />
              <span className="text-[11px]
                text-[#555555]">
                {data.photos.length}
              </span>
            </div>
          )}

          {/* Word count + read time */}
          {data.wordCount > 0 && (
            <span className="text-[11px]
              text-[#444444]">
              {data.wordCount} words
              · {readTime} min read
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DiaryTimeline({
  groupedEntries,
  onEntryClick,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}
            className="rounded-2xl p-5 animate-pulse"
            style={{
              backgroundColor:
                'rgba(255,255,255,0.03)',
              height: 140,
              opacity: 0.4 + i * 0.1,
            }}
          />
        ))}
      </div>
    )
  }

  if (groupedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center
        justify-center h-64 gap-3">
        <span style={{ fontSize: 48 }}>📖</span>
        <p className="text-[16px] text-[#555555]">
          Your story starts here
        </p>
        <p className="text-[13px] text-[#444444]
          text-center max-w-xs">
          Every day is worth remembering.
          Start writing today.
        </p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {groupedEntries.map(group => (
        <div key={group.key} className="mb-8">
          {/* Month header */}
          <div className="px-6 py-3 sticky top-0
            z-10"
            style={{ 
              backgroundColor: '#141414' 
            }}>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1"
                style={{ 
                  backgroundColor: '#2A2A2A' 
                }} />
              <span className="text-[12px]
                font-semibold uppercase
                tracking-widest text-[#555555]">
                {group.label}
              </span>
              <div className="h-px flex-1"
                style={{ 
                  backgroundColor: '#2A2A2A' 
                }} />
            </div>
          </div>

          {/* Entries */}
          <div className="px-6 space-y-3">
            {group.entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onClick={() => 
                  onEntryClick(entry.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
