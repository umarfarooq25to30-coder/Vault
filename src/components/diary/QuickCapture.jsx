// Floating quick capture button
// Opens mini modal for fast entry

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Check } from 'lucide-react'
import { MOODS } from './MoodPicker'

export default function QuickCapture({
  onCapture
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!text.trim()) return
    setIsSaving(true)
    await onCapture(text, mood)
    setText('')
    setMood('')
    setIsOpen(false)
    setIsSaving(false)
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6
          w-14 h-14 rounded-full flex items-center
          justify-center cursor-pointer
          transition-all duration-200
          hover:scale-110 active:scale-95 z-50"
        style={{
          backgroundColor: '#F0F0F0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <Plus className="w-6 h-6 text-[#141414]" />
      </button>

      {/* Quick entry modal */}
      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[999]"
            style={{ backgroundColor: 
              'rgba(0,0,0,0.6)' }}
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed bottom-24 right-6
              w-80 rounded-2xl p-5 z-[1000]
              animate-slide-up"
            style={{ backgroundColor: '#1E1E1E' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center
              justify-between mb-3">
              <p className="text-[14px] font-semibold
                text-[#F0F0F0]">
                Quick capture
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer
                  text-[#555555]
                  hover:text-[#C0C0C0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mood row */}
            <div className="flex gap-1.5 mb-3">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(
                    mood === m.id ? '' : m.id
                  )}
                  className="w-8 h-8 flex items-center
                    justify-center rounded-xl
                    cursor-pointer transition-all"
                  style={{
                    backgroundColor: mood === m.id
                      ? m.bg
                      : 'transparent',
                    transform: mood === m.id
                      ? 'scale(1.2)'
                      : 'scale(1)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {m.emoji}
                  </span>
                </button>
              ))}
            </div>

            {/* Text area */}
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full bg-transparent
                text-[14px] text-[#F0F0F0]
                outline-none resize-none
                placeholder:text-[#333333]
                leading-relaxed"
              onKeyDown={e => {
                if (e.key === 'Enter' && 
                    e.metaKey) handleSave()
              }}
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim() || isSaving}
              className="w-full mt-3 py-2.5
                rounded-xl text-[13px] font-medium
                cursor-pointer transition-all"
              style={{
                backgroundColor: text.trim()
                  ? '#F0F0F0'
                  : '#252525',
                color: text.trim()
                  ? '#141414'
                  : '#444444',
              }}
            >
              {isSaving ? 'Saving...' : 'Save entry'}
            </button>

            <p className="text-center text-[10px]
              text-[#333333] mt-2">
              ⌘ + Enter to save
            </p>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
