// Mood selector — emoji based
// Smooth, interactive, instant feedback

import React, { useState } from 'react'

export const MOODS = [
  { 
    id: 'happy', 
    emoji: '😊', 
    label: 'Happy',
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.15)',
  },
  { 
    id: 'excited', 
    emoji: '🤩', 
    label: 'Excited',
    color: '#FF6B35',
    bg: 'rgba(255,107,53,0.15)',
  },
  { 
    id: 'good', 
    emoji: '🙂', 
    label: 'Good',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.15)',
  },
  { 
    id: 'neutral', 
    emoji: '😐', 
    label: 'Neutral',
    color: '#888888',
    bg: 'rgba(136,136,136,0.15)',
  },
  { 
    id: 'tired', 
    emoji: '😴', 
    label: 'Tired',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.15)',
  },
  { 
    id: 'anxious', 
    emoji: '😰', 
    label: 'Anxious',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.15)',
  },
  { 
    id: 'sad', 
    emoji: '😢', 
    label: 'Sad',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
  },
  { 
    id: 'angry', 
    emoji: '😠', 
    label: 'Angry',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)',
  },
]

export default function MoodPicker({ 
  value, onChange, compact = false 
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const selected = MOODS.find(m => m.id === value)

  if (compact) {
    return (
      <div className="relative group">
        <button
          type="button"
          className="flex items-center gap-1.5
            px-2.5 py-1.5 rounded-lg cursor-pointer
            transition-all duration-150
            hover:bg-[#252525]"
          style={selected ? {
            backgroundColor: selected.bg,
          } : {}}
          title="Set mood"
        >
          <span style={{ fontSize: 18 }}>
            {selected?.emoji || '😶'}
          </span>
          {selected && (
            <span className="text-[12px]"
              style={{ color: selected.color }}>
              {selected.label}
            </span>
          )}
        </button>

        {/* Popover */}
        <div className="absolute top-full left-0
          mt-1 bg-[#1E1E1E] rounded-xl p-2
          hidden group-hover:grid
          grid-cols-4 gap-1 z-50 w-48">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              type="button"
              onClick={() => onChange(mood.id)}
              className="flex flex-col items-center
                gap-0.5 p-2 rounded-lg cursor-pointer
                transition-all duration-100"
              style={{
                backgroundColor: 
                  value === mood.id
                    ? mood.bg
                    : 'transparent',
              }}
              onMouseEnter={() => setHoveredId(mood.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span style={{ fontSize: 20 }}>
                {mood.emoji}
              </span>
              <span className="text-[10px]"
                style={{
                  color: value === mood.id || hoveredId === mood.id
                    ? mood.color
                    : '#555555'
                }}>
                {mood.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Full mode — show all moods in grid
  return (
    <div>
      <p className="text-[11px] uppercase 
        tracking-wider text-[#555555] 
        font-medium mb-2">
        How are you feeling?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MOODS.map(mood => (
          <button
            key={mood.id}
            type="button"
            onClick={() => onChange(
              value === mood.id ? '' : mood.id
            )}
            onMouseEnter={() => setHoveredId(mood.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="flex flex-col items-center
              gap-1 py-3 rounded-xl cursor-pointer
              transition-all duration-150"
            style={{
              backgroundColor: 
                value === mood.id
                  ? mood.bg
                  : hoveredId === mood.id
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.02)',
              transform: value === mood.id
                ? 'scale(1.05)'
                : hoveredId === mood.id
                  ? 'scale(1.02)'
                  : 'scale(1)',
            }}
          >
            <span style={{
              fontSize: 28,
              filter: value === mood.id
                ? 'none'
                : 'grayscale(30%)',
            }}>
              {mood.emoji}
            </span>
            <span className="text-[11px] 
              font-medium transition-colors"
              style={{
                color: value === mood.id
                  ? mood.color
                  : '#666666',
              }}>
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
