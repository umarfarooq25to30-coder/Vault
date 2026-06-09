// Full-screen modal editor
// Opens as overlay when entry clicked
// Complete editor with all features

import { useState, useCallback, useMemo,
  useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from 
  '@tiptap/extension-placeholder'
import CharacterCount from 
  '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import {
  X, Star, Trash2, Check, Loader2,
  Bold, Italic, UnderlineIcon,
  Heading1, Heading2, List,
  Quote, Code, Highlighter,
  Plus, Tag,
} from 'lucide-react'
import { MOODS } from './MoodPicker'
import { WEATHER_OPTIONS } from './WeatherPicker'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
// Ignoring WritingPrompt import as it's not strictly necessary and not provided fully

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function DiaryEditorModal({
  entry,
  onSave,
  onDelete,
  onToggleFavorite,
  onClose,
  saveStatus,
}) {
  const data = entry?.data || {}

  const [mood, setMood] = useState(
    data.mood || ''
  )
  const [weather, setWeather] = useState(
    data.weather || ''
  )
  const [location, setLocation] = useState(
    data.location || ''
  )
  const [summary, setSummary] = useState(
    typeof data.summary === 'string' ? data.summary : ''
  )
  const [tags, setTags] = useState(
    entry?.tags || []
  )
  const [tagInput, setTagInput] = useState('')
  const [confirmDelete, setConfirmDelete] =
    useState(false)

  useEffect(() => {
    setMood(data.mood || '')
    setWeather(data.weather || '')
    setLocation(data.location || '')
    setSummary(typeof data.summary === 'string' ? data.summary : '')
    setTags(entry?.tags || [])
  }, [entry?.id])

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      CharacterCount,
    ],
    content: data.content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()

      debouncedSave({
        content: html,
        mood,
        weather,
        location,
        summary,
        tags,
      })
    },
  })

  useEffect(() => {
    if (editor && data.content !== undefined) {
      const current = editor.getHTML()
      if (current !== data.content) {
        editor.commands.setContent(
          data.content || '', false
        )
      }
    }
  }, [entry?.id])

  const debouncedSave = useMemo(
    () => debounce(async (updates) => {
      if (!entry?.id) return
      await onSave(entry.id, {
        ...updates,
        content: updates.content,
      })
    }, 1000),
    [entry?.id, onSave]
  )

  const handleMoodChange = (newMood) => {
    setMood(newMood)
    debouncedSave({
      content: editor?.getHTML() || '',
      mood: newMood,
      weather, location, summary, tags,
    })
  }

  const handleWeatherChange = (newWeather) => {
    setWeather(newWeather)
    debouncedSave({
      content: editor?.getHTML() || '',
      mood, weather: newWeather,
      location, summary, tags,
    })
  }

  const handleSummaryBlur = () => {
    debouncedSave({
      content: editor?.getHTML() || '',
      mood, weather, location, summary, tags,
    })
  }

  useKeyboardShortcuts({
    onSave: () => {
      // Force instant save
      if (!isSaving && entry) {
        setIsSaving(true)
        onSave(entry.id, {
          content: editor?.getHTML() || '',
          mood, weather, location, summary, tags,
        }).finally(() => {
          setIsSaving(false)
        })
      }
    }
  })

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag]
      setTags(newTags)
      debouncedSave({
        content: editor?.getHTML() || '',
        mood, weather, location, summary,
        tags: newTags,
      })
    }
    setTagInput('')
  }

  const removeTag = (tag) => {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    debouncedSave({
      content: editor?.getHTML() || '',
      mood, weather, location, summary,
      tags: newTags,
    })
  }

  const wordCount = editor?.storage
    .characterCount?.words() || 0
  const readTime = Math.max(
    1, Math.ceil(wordCount / 200)
  )

  const entryDate = data.date
    ? new Date(data.date + 'T12:00:00')
        .toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
    : ''

  const selectedMood = MOODS.find(
    m => m.id === mood
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]
        flex items-center justify-center
        animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-2xl h-[90vh]
          flex flex-col rounded-3xl overflow-hidden
          animate-slide-up"
        style={{ backgroundColor: '#181818' }}
        onClick={e => e.stopPropagation()}
      >
        {/* TOP BAR */}
        <div className="flex items-center gap-3
          px-6 py-4 flex-shrink-0">

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center
              justify-center rounded-full
              cursor-pointer transition-all
              hover:bg-[#252525]"
          >
            <X className="w-4 h-4 text-[#666666]" />
          </button>

          {/* Date */}
          <div className="flex-1">
            <p className="text-[14px] font-semibold
              text-[#F0F0F0]">
              {entryDate}
            </p>
          </div>

          {/* Save status */}
          <div className="flex items-center gap-1.5">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5
                  text-[#555555] animate-spin" />
                <span className="text-[11px]
                  text-[#555555]">
                  Saving
                </span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5
                  text-green-500" />
                <span className="text-[11px]
                  text-green-500">
                  Saved
                </span>
              </>
            )}
          </div>

          {/* Favorite */}
          <button
            type="button"
            onClick={() => 
              onToggleFavorite(entry.id)}
            className="w-8 h-8 flex items-center
              justify-center rounded-full
              cursor-pointer transition-all
              hover:bg-[#252525]"
          >
            <Star className={`w-4 h-4 ${
              entry?.isFavorite
                ? 'text-amber-400 fill-amber-400'
                : 'text-[#555555]'
            }`} />
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center
              gap-1">
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="text-[12px] text-red-400
                  cursor-pointer px-2 py-1 rounded-lg
                  hover:bg-red-500/10
                  transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => 
                  setConfirmDelete(false)}
                className="text-[12px] text-[#666666]
                  cursor-pointer px-2 py-1 rounded-lg
                  hover:text-[#C0C0C0]
                  transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-8 h-8 flex items-center
                justify-center rounded-full
                cursor-pointer transition-all
                hover:bg-[#252525]"
            >
              <Trash2 className="w-4 h-4
                text-[#555555] hover:text-red-400" />
            </button>
          )}
        </div>

        {/* MOOD ROW */}
        <div className="px-6 pb-3 flex-shrink-0">
          <div className="flex items-center
            gap-2 flex-wrap">

            {/* Mood picker */}
            <div className="flex gap-1.5">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMoodChange(
                    mood === m.id ? '' : m.id
                  )}
                  className="w-9 h-9 flex items-center
                    justify-center rounded-xl
                    cursor-pointer transition-all
                    duration-150"
                  style={{
                    backgroundColor: mood === m.id
                      ? m.bg
                      : 'transparent',
                    transform: mood === m.id
                      ? 'scale(1.2)'
                      : 'scale(1)',
                  }}
                  title={m.label}
                >
                  <span style={{ fontSize: 20 }}>
                    {m.emoji}
                  </span>
                </button>
              ))}
            </div>

            <div className="w-px h-5 mx-1"
              style={{ 
                backgroundColor: '#2A2A2A' 
              }} />

            {/* Weather */}
            {WEATHER_OPTIONS.slice(0, 4).map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWeatherChange(
                  weather === w.id ? '' : w.id
                )}
                className="w-8 h-8 flex items-center
                  justify-center rounded-xl
                  cursor-pointer transition-all"
                style={{
                  backgroundColor: 
                    weather === w.id
                      ? 'rgba(255,255,255,0.08)'
                      : 'transparent',
                }}
                title={w.label}
              >
                <span style={{ fontSize: 18 }}>
                  {w.emoji}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* SUMMARY LINE */}
        <div className="px-6 pb-3 flex-shrink-0">
          <input
            type="text"
            value={summary}
            onChange={e => 
              setSummary(e.target.value)}
            onBlur={handleSummaryBlur}
            placeholder="One line summary (optional)..."
            className="w-full bg-transparent
              text-[15px] font-medium
              text-[#C0C0C0] outline-none
              placeholder:text-[#333333]"
            maxLength={100}
          />
        </div>

        <div className="mx-6 h-px flex-shrink-0"
          style={{ backgroundColor: '#222222' }} />

        {/* EDITOR AREA */}
        <div className="flex-1 overflow-y-auto
          relative px-6 pt-4">

          {/* Tiptap with floating bubble menu */}
          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 100 }}
            >
              <div className="flex items-center
                gap-0.5 px-2 py-1.5 rounded-xl"
                style={{
                  backgroundColor: '#242424',
                }}>
                {[
                  {
                    icon: Bold,
                    action: () => editor.chain()
                      .focus().toggleBold().run(),
                    active: editor.isActive('bold'),
                    title: 'Bold',
                  },
                  {
                    icon: Italic,
                    action: () => editor.chain()
                      .focus().toggleItalic().run(),
                    active: editor.isActive('italic'),
                    title: 'Italic',
                  },
                  {
                    icon: UnderlineIcon,
                    action: () => editor.chain()
                      .focus().toggleUnderline().run(),
                    active: editor.isActive(
                      'underline'
                    ),
                    title: 'Underline',
                  },
                  {
                    icon: Highlighter,
                    action: () => editor.chain()
                      .focus().toggleHighlight().run(),
                    active: editor.isActive(
                      'highlight'
                    ),
                    title: 'Highlight',
                  },
                  {
                    icon: Heading1,
                    action: () => editor.chain()
                      .focus()
                      .toggleHeading({ level: 1 })
                      .run(),
                    active: editor.isActive(
                      'heading', { level: 1 }
                    ),
                    title: 'H1',
                  },
                  {
                    icon: Heading2,
                    action: () => editor.chain()
                      .focus()
                      .toggleHeading({ level: 2 })
                      .run(),
                    active: editor.isActive(
                      'heading', { level: 2 }
                    ),
                    title: 'H2',
                  },
                  {
                    icon: Quote,
                    action: () => editor.chain()
                      .focus()
                      .toggleBlockquote().run(),
                    active: editor.isActive(
                      'blockquote'
                    ),
                    title: 'Quote',
                  },
                ].map(({ icon: Icon, action,
                  active, title }) => (
                  <button
                    key={title}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      action()
                    }}
                    className="w-7 h-7 flex items-center
                      justify-center rounded-lg
                      cursor-pointer transition-colors
                      duration-100"
                    style={{
                      backgroundColor: active
                        ? '#F0F0F0'
                        : 'transparent',
                      color: active
                        ? '#141414'
                        : '#888888',
                    }}
                    title={title}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </BubbleMenu>
          )}

          <EditorContent
            editor={editor}
            className="vault-diary-modal-editor"
          />
        </div>

        {/* BOTTOM BAR */}
        <div className="px-6 py-4 flex-shrink-0"
          style={{ backgroundColor: '#181818' }}>

          {/* Tags */}
          <div className="flex items-center gap-2
            flex-wrap mb-3">
            {tags.map((tag, idx) => {
              if (typeof tag !== 'string') return null;
              return (
                <span key={tag}
                  className="flex items-center gap-1
                    px-2.5 py-1 rounded-full
                    text-[11px] cursor-pointer"
                  style={{
                    backgroundColor:
                      'rgba(255,255,255,0.06)',
                    color: '#888888',
                  }}
                  onClick={() => removeTag(tag)}
                >
                  #{tag}
                  <X className="w-2.5 h-2.5" />
                </span>
              );
            })}
            <input
              type="text"
              value={tagInput}
              onChange={e => 
                setTagInput(e.target.value)}
              placeholder="+ add tag"
              className="bg-transparent text-[11px]
                text-[#555555] outline-none
                placeholder:text-[#333333] w-16"
              onKeyDown={e => {
                if (e.key === 'Enter' || 
                    e.key === ',') {
                  e.preventDefault()
                  addTag()
                }
              }}
              onBlur={addTag}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center
            justify-between">
            <div className="flex items-center
              gap-3">
              {selectedMood && (
                <span className="text-[12px]"
                  style={{ color: selectedMood.color }}>
                  {selectedMood.emoji} {
                    selectedMood.label}
                </span>
              )}
              <span className="text-[11px]
                text-[#444444]">
                {wordCount} words
              </span>
              {wordCount > 0 && (
                <span className="text-[11px]
                  text-[#444444]">
                  {readTime} min read
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
