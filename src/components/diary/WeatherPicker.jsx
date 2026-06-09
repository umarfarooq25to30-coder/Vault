// Weather condition selector
import React from 'react'

export const WEATHER_OPTIONS = [
  { id: 'sunny',  emoji: '☀️',  label: 'Sunny' },
  { id: 'cloudy', emoji: '☁️',  label: 'Cloudy' },
  { id: 'rainy',  emoji: '🌧️', label: 'Rainy' },
  { id: 'snowy',  emoji: '❄️',  label: 'Snowy' },
  { id: 'windy',  emoji: '🌬️', label: 'Windy' },
  { id: 'hot',    emoji: '🌡️', label: 'Hot' },
  { id: 'storm',  emoji: '⛈️',  label: 'Storm' },
  { id: 'foggy',  emoji: '🌫️', label: 'Foggy' },
]

export default function WeatherPicker({ 
  value, onChange 
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEATHER_OPTIONS.map(w => (
        <button
          key={w.id}
          type="button"
          onClick={() => onChange(
            value === w.id ? '' : w.id
          )}
          className="flex items-center gap-1.5
            px-2.5 py-1.5 rounded-lg cursor-pointer
            transition-all duration-150 text-[13px]"
          style={{
            backgroundColor: value === w.id
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.04)',
            color: value === w.id
              ? '#F0F0F0'
              : '#666666',
            transform: value === w.id
              ? 'scale(1.02)'
              : 'scale(1)',
          }}
        >
          <span style={{ fontSize: 16 }}>
            {w.emoji}
          </span>
          {w.label}
        </button>
      ))}
    </div>
  )
}
