import React from 'react'
import {
  Mic, Play, Star, Trash2,
  FileAudio,
} from 'lucide-react'
import { formatDuration, formatDate }
  from '../../hooks/useVoice'

const VoiceItem = React.memo(
  function VoiceItem({
    item, isActive, onClick, onDelete,
    onToggleFavorite,
  }) {
    const data = item.data || {}
    const duration = data.duration || 0
    const hasTranscription =
      !!data.transcription?.trim()

    return (
      <div
        onClick={onClick}
        className="group flex items-center
          gap-3 px-4 py-3.5 cursor-pointer
          transition-all duration-150"
        style={{
          backgroundColor: isActive
            ? 'rgba(255,255,255,0.07)'
            : 'transparent',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor =
              'rgba(255,255,255,0.03)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor =
              'transparent'
          }
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl
            flex items-center justify-center
            flex-shrink-0"
          style={{
            backgroundColor: isActive
              ? 'rgba(240,240,240,0.15)'
              : 'rgba(255,255,255,0.05)',
          }}
        >
          {isActive ? (
            <Play className="w-4 h-4
              text-[#F0F0F0] ml-0.5" />
          ) : (
            <Mic className="w-4 h-4
              text-[#888888]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium
            truncate"
            style={{
              color: isActive
                ? '#F0F0F0' : '#C0C0C0',
            }}>
            {item.title}
          </p>
          <div className="flex items-center
            gap-2 mt-0.5">
            <span className="text-[12px] font-mono"
              style={{ color: '#555555' }}>
              {formatDuration(duration)}
            </span>
            {hasTranscription && (
              <span className="text-[10px] px-1.5
                py-0.5 rounded-md"
                style={{
                  backgroundColor:
                    'rgba(255,255,255,0.06)',
                  color: '#666666',
                }}>
                transcript
              </span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1
          flex-shrink-0">
          {item.isFavorite && (
            <Star className="w-3.5 h-3.5
              text-amber-400 fill-amber-400" />
          )}
          <span className="text-[10px]"
            style={{ color: '#444444' }}>
            {formatDate(item.createdAt)}
          </span>
        </div>
      </div>
    )
  }
)

export default VoiceItem
