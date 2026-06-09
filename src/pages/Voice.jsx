import React, { useState, useRef,
  useCallback } from 'react'
import {
  Search, X, Mic, Upload,
  Star, Trash2, Edit2, Check,
  FileAudio,
} from 'lucide-react'
import { useVoice }
  from '../hooks/useVoice'
import VoiceRecorder
  from '../components/voice/VoiceRecorder'
import VoicePlayer
  from '../components/voice/VoicePlayer'
import VoiceItem
  from '../components/voice/VoiceItem'

export default function Voice() {
  const voice = useVoice()
  const fileInputRef = useRef(null)

  const [isRenamingId, setIsRenamingId] =
    useState(null)
  const [renameValue, setRenameValue] =
    useState('')
  const [editTranscript, setEditTranscript] =
    useState(false)
  const [transcriptValue, setTranscriptValue] =
    useState('')
  const [confirmDeleteId, setConfirmDeleteId] =
    useState(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) voice.uploadAudioFile(file)
    e.target.value = ''
  }

  const handleOpenNote = async (item) => {
    await voice.openNote(item.id)
    setEditTranscript(false)
    setTranscriptValue(
      item.data?.transcription || ''
    )
  }

  const handleSaveTranscript = async () => {
    if (!voice.activeNote) return
    await voice.updateTranscription(
      voice.activeNote.id,
      transcriptValue
    )
    setEditTranscript(false)
  }

  const handleDownload = useCallback(async () => {
    if (!voice.playerObjectURL ||
        !voice.activeNote) return
    const a = document.createElement('a')
    a.href = voice.playerObjectURL
    const ext = voice.activeNote.data?.mimeType
      ?.split('/')[1]?.split(';')[0] || 'webm'
    a.download = `${voice.activeNote.title}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [voice.playerObjectURL, voice.activeNote])

  return (
    <div className="flex h-full overflow-hidden"
      style={{ backgroundColor: '#141414' }}>

      {/* LEFT PANEL */}
      <div className="w-72 flex-shrink-0 flex
        flex-col overflow-hidden rounded-l-2xl"
        style={{ backgroundColor: '#181818' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3
          flex-shrink-0">
          <div className="flex items-center
            justify-between mb-3">
            <h2 className="text-[18px] font-semibold
              text-[#F0F0F0]">
              Voice Notes
            </h2>
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center
                justify-center rounded-lg
                cursor-pointer text-[#555555]
                hover:text-[#F0F0F0]
                hover:bg-[#252525] transition-all"
              title="Import audio file"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3
              top-1/2 -translate-y-1/2 w-4 h-4
              text-[#444444] pointer-events-none"/>
            <input
              type="text"
              placeholder="Search recordings..."
              value={voice.searchQuery}
              onChange={e =>
                voice.setSearchQuery(e.target.value)
              }
              className="w-full text-[#F0F0F0]
                text-[13px] rounded-xl pl-9 pr-4
                py-2.5 outline-none
                placeholder:text-[#444444]"
              style={{ backgroundColor: '#141414' }}
            />
            {voice.searchQuery && (
              <button
                type="button"
                onClick={() =>
                  voice.setSearchQuery('')}
                className="absolute right-3 top-1/2
                  -translate-y-1/2 cursor-pointer
                  text-[#555555]
                  hover:text-[#F0F0F0]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Voice notes list */}
        <div className="flex-1 overflow-y-auto">
          {voice.isLoading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 4 }).map(
                (_, i) => (
                  <div key={i}
                    className="h-16 rounded-xl
                      animate-pulse"
                    style={{
                      backgroundColor:
                        'rgba(255,255,255,0.04)',
                      opacity: 0.3 + i * 0.15,
                    }}
                  />
                )
              )}
            </div>
          ) : voice.notes.length === 0 ? (
            <div className="flex flex-col
              items-center justify-center
              h-48 gap-2">
              <Mic className="w-8 h-8"
                style={{ color: '#2A2A2A' }} />
              <p className="text-[14px]"
                style={{ color: '#555555' }}>
                {voice.searchQuery
                  ? 'No recordings found'
                  : 'No recordings yet'
                }
              </p>
            </div>
          ) : (
            voice.notes.map(item => (
              <VoiceItem
                key={item.id}
                item={item}
                isActive={voice.activeId === item.id}
                onClick={() => handleOpenNote(item)}
                onDelete={voice.deleteNote}
                onToggleFavorite={
                  voice.toggleFavoriteNote}
              />
            ))
          )}
        </div>

        {/* Stats */}
        {voice.notes.length > 0 && (
          <div className="px-4 py-3 flex-shrink-0">
            <p className="text-[11px]"
              style={{ color: '#444444' }}>
              {voice.notes.length} recording{
                voice.notes.length !== 1
                  ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px flex-shrink-0"
        style={{ backgroundColor: '#1E1E1E' }} />

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col
        overflow-hidden">

        {/* RECORDER SECTION TOP */}
        <div className="flex-shrink-0 px-8 pt-6"
          style={{ backgroundColor: '#141414' }}>
          <p className="text-[11px] uppercase
            tracking-wider font-medium mb-4"
            style={{ color: '#444444' }}>
            New recording
          </p>
          <VoiceRecorder
            onSave={voice.saveRecording}
            isSaving={voice.isSaving}
          />
        </div>

        {/* DIVIDER */}
        <div className="mx-8 my-4 h-px"
          style={{ backgroundColor: '#1E1E1E' }} />

        {/* PLAYER SECTION */}
        <div className="flex-1 overflow-y-auto
          px-8 pb-8">

          {!voice.activeNote ? (
            <div className="flex flex-col
              items-center justify-center
              h-48 gap-3">
              <FileAudio className="w-10 h-10"
                style={{ color: '#2A2A2A' }} />
              <p className="text-[15px]"
                style={{ color: '#555555' }}>
                Select a recording to play
              </p>
            </div>
          ) : (
            <div>
              {/* Note header */}
              <div className="flex items-start
                justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  {isRenamingId ===
                    voice.activeNote.id ? (
                    <div className="flex items-center
                      gap-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e =>
                          setRenameValue(
                            e.target.value
                          )}
                        className="flex-1 text-[18px]
                          font-semibold bg-transparent
                          text-[#F0F0F0] outline-none
                          min-w-0"
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            await voice.renameNote(
                              voice.activeNote.id,
                              renameValue
                            )
                            setIsRenamingId(null)
                          }
                          if (e.key === 'Escape') {
                            setIsRenamingId(null)
                          }
                        }}
                        onBlur={async () => {
                          await voice.renameNote(
                            voice.activeNote.id,
                            renameValue
                          )
                          setIsRenamingId(null)
                        }}
                      />
                      <Check className="w-4 h-4
                        text-green-500 cursor-pointer"
                        onClick={async () => {
                          await voice.renameNote(
                            voice.activeNote.id,
                            renameValue
                          )
                          setIsRenamingId(null)
                        }}
                      />
                    </div>
                  ) : (
                    <h3 className="text-[18px]
                      font-semibold text-[#F0F0F0]
                      truncate cursor-pointer"
                      onDoubleClick={() => {
                        setIsRenamingId(
                          voice.activeNote.id
                        )
                        setRenameValue(
                          voice.activeNote.title
                        )
                      }}
                    >
                      {voice.activeNote.title}
                    </h3>
                  )}
                  <p className="text-[12px] mt-0.5"
                    style={{ color: '#555555' }}>
                    {voice.formatDate(
                      voice.activeNote.createdAt
                    )}
                    {voice.activeNote.data?.duration
                      ? ` · ${voice.formatDuration(
                          voice.activeNote.data.duration
                        )}`
                      : ''
                    }
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center
                  gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      voice.toggleFavoriteNote(
                        voice.activeNote.id
                      )}
                    className="w-8 h-8 flex items-center
                      justify-center rounded-xl
                      cursor-pointer transition-all
                      hover:bg-[#252525]"
                  >
                    <Star className={`w-4 h-4 ${
                      voice.activeNote.isFavorite
                        ? 'text-amber-400 ' +
                          'fill-amber-400'
                        : 'text-[#555555]'
                    }`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDeleteId ===
                          voice.activeNote.id) {
                        voice.deleteNote(
                          voice.activeNote.id
                        )
                        setConfirmDeleteId(null)
                      } else {
                        setConfirmDeleteId(
                          voice.activeNote.id
                        )
                        setTimeout(() =>
                          setConfirmDeleteId(null),
                          3000
                        )
                      }
                    }}
                    className="w-8 h-8 flex items-center
                      justify-center rounded-xl
                      cursor-pointer transition-all
                      hover:bg-[#252525]"
                    style={{
                      color: confirmDeleteId ===
                        voice.activeNote.id
                        ? '#EF4444'
                        : '#555555',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Player */}
              {voice.isDecrypting ? (
                <div className="flex items-center
                  gap-3 py-8 justify-center">
                  <div className="w-5 h-5 rounded-full
                    border-2 border-[#333333]
                    border-t-[#888888] animate-spin"
                  />
                  <p className="text-[13px]"
                    style={{ color: '#555555' }}>
                    Decrypting audio...
                  </p>
                </div>
              ) : voice.playerObjectURL ? (
                <VoicePlayer
                  src={voice.playerObjectURL}
                  duration={
                    voice.activeNote.data?.duration
                  }
                  onDownload={handleDownload}
                />
              ) : null}

              {/* Transcription */}
              <div className="mt-6">
                <div className="flex items-center
                  justify-between mb-2">
                  <p className="text-[11px] uppercase
                    tracking-wider font-medium"
                    style={{ color: '#444444' }}>
                    Transcription
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (editTranscript) {
                        handleSaveTranscript()
                      } else {
                        setTranscriptValue(
                          voice.activeNote.data
                            ?.transcription || ''
                        )
                        setEditTranscript(true)
                      }
                    }}
                    className="text-[12px]
                      cursor-pointer transition-colors"
                    style={{
                      color: editTranscript
                        ? '#22C55E' : '#555555',
                    }}
                  >
                    {editTranscript
                      ? 'Save'
                      : 'Edit'
                    }
                  </button>
                </div>

                {editTranscript ? (
                  <textarea
                    autoFocus
                    value={transcriptValue}
                    onChange={e =>
                      setTranscriptValue(
                        e.target.value
                      )}
                    placeholder="Type transcription
                      here..."
                    rows={4}
                    className="w-full text-[14px]
                      rounded-xl px-4 py-3 outline-none
                      resize-none leading-relaxed
                      placeholder:text-[#333333]
                      text-[#C0C0C0]"
                    style={{
                      backgroundColor: '#1A1A1A',
                    }}
                  />
                ) : (
                  <p className="text-[14px]
                    leading-relaxed"
                    style={{
                      color: voice.activeNote.data
                        ?.transcription
                        ? '#C0C0C0'
                        : '#333333',
                      fontStyle: voice.activeNote
                        .data?.transcription
                        ? 'normal' : 'italic',
                    }}
                  >
                    {voice.activeNote.data
                      ?.transcription ||
                      'No transcription yet. ' +
                      'Click Edit to add one.'
                    }
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
