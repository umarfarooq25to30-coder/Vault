import { useState, useCallback,
  useEffect, useRef } from 'react'
import { useVaultStore }
  from '../store/vaultStore'
import { useToastStore }
  from '../store/toastStore'
import {
  createItem, getAllItems, getItem,
  updateItem, deleteItem, toggleFavorite,
} from '../db/vaultOperations'
import { encryptFile, decryptFile }
  from '../crypto/engine'

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export { formatDuration, formatDate }

export function useVoice() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeNote, setActiveNote] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [playerObjectURL, setPlayerObjectURL] =
    useState(null)
  const [isDecrypting, setIsDecrypting] =
    useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const activeURLRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeURLRef.current) {
        URL.revokeObjectURL(activeURLRef.current)
      }
    }
  }, [])

  // ── LOAD ──────────────────────────────────────
  const loadNotes = useCallback(async () => {
    if (!derivedKey) return
    setIsLoading(true)
    try {
      const result = await getAllItems(derivedKey, {
        type: 'voice',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })

      let items = result.items
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        items = items.filter(item =>
          item.title.toLowerCase().includes(q) ||
          (item.data?.transcription || '')
            .toLowerCase().includes(q)
        )
      }

      setNotes(items)
    } catch (err) {
      console.error('loadNotes failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [derivedKey, searchQuery])

  useEffect(() => {
    if (derivedKey) loadNotes()
  }, [derivedKey, searchQuery])

  // ── OPEN (decrypt + create blob URL) ──────────
  const openNote = useCallback(async (id) => {
    if (!derivedKey) return
    setActiveId(id)
    setIsDecrypting(true)

    // Revoke previous URL
    if (activeURLRef.current) {
      URL.revokeObjectURL(activeURLRef.current)
      activeURLRef.current = null
      setPlayerObjectURL(null)
    }

    try {
      const full = await getItem(id, derivedKey)
      setActiveNote(full)

      if (!full?.data?.encryptedData) {
        throw new Error('No audio data found')
      }

      const buffer = await decryptFile(
        full.data.encryptedData,
        full.data.iv,
        derivedKey
      )

      const mimeType = full.data.mimeType ||
        'audio/webm'
      const blob = new Blob([buffer],
        { type: mimeType })
      const url = URL.createObjectURL(blob)
      activeURLRef.current = url
      setPlayerObjectURL(url)
    } catch (err) {
      console.error('openNote failed:', err)
      addToast({
        variant: 'danger',
        title: 'Could not open recording',
        description: err.message,
      })
    } finally {
      setIsDecrypting(false)
    }
  }, [derivedKey])

  // ── SAVE RECORDING ────────────────────────────
  const saveRecording = useCallback(
    async (audioBlob, duration) => {
      if (!derivedKey) return null
      setIsSaving(true)

      try {
        const now = new Date()
        const title = `Voice Note — ${
          now.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
          })
        } ${now.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit',
        })}`

        const buffer = await audioBlob.arrayBuffer()
        const { encryptedData, iv } =
          await encryptFile(buffer, derivedKey)

        const item = await createItem({
          type: 'voice',
          title,
          data: {
            mimeType: audioBlob.type || 'audio/webm',
            size: audioBlob.size,
            duration,
            encryptedData,
            iv,
            transcription: '',
          },
          thumbnail: null,
          folderId: null,
          tags: [],
          isFavorite: false,
        }, derivedKey)

        await loadNotes()

        addToast({
          variant: 'success',
          title: 'Recording saved',
          description: `${formatDuration(duration)}
            · encrypted`,
          duration: 3000,
        })

        return item
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to save recording',
          description: err.message,
        })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [derivedKey, loadNotes]
  )

  // ── UPLOAD AUDIO FILE ────────────────────────
  const uploadAudioFile = useCallback(
    async (file) => {
      if (!derivedKey) return

      const supportedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav',
        'audio/ogg', 'audio/webm', 'audio/mp4',
        'audio/m4a', 'audio/aac', 'audio/flac',
      ]

      if (!supportedTypes.includes(file.type) &&
          !file.name.match(
            /\.(mp3|wav|ogg|webm|m4a|aac|flac|opus)$/i
          )) {
        addToast({
          variant: 'warning',
          title: 'Unsupported format',
          description: 'Please upload an audio file.',
        })
        return
      }

      if (file.size > 200 * 1024 * 1024) {
        addToast({
          variant: 'warning',
          title: 'File too large',
          description: 'Max 200MB per audio file.',
        })
        return
      }

      setIsSaving(true)
      try {
        // Get duration
        const duration = await new Promise(
          resolve => {
            const audio = new Audio()
            const url = URL.createObjectURL(file)
            audio.onloadedmetadata = () => {
              URL.revokeObjectURL(url)
              resolve(isFinite(audio.duration) ? audio.duration : 0)
            }
            audio.onerror = () => {
              URL.revokeObjectURL(url)
              resolve(0)
            }
            audio.src = url
          }
        )

        const buffer = await file.arrayBuffer()
        const { encryptedData, iv } =
          await encryptFile(buffer, derivedKey)

        await createItem({
          type: 'voice',
          title: file.name.replace(
            /\.[^.]+$/, ''
          ),
          data: {
            mimeType: file.type || 'audio/mpeg',
            size: file.size,
            duration,
            encryptedData,
            iv,
            transcription: '',
          },
          thumbnail: null,
          folderId: null,
          tags: [],
          isFavorite: false,
        }, derivedKey)

        await loadNotes()

        addToast({
          variant: 'success',
          title: 'Audio file imported',
          description: file.name,
          duration: 3000,
        })
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Import failed',
          description: err.message,
        })
      } finally {
        setIsSaving(false)
      }
    },
    [derivedKey, loadNotes]
  )

  // ── UPDATE TRANSCRIPTION ──────────────────────
  const updateTranscription = useCallback(
    async (id, transcription) => {
      if (!derivedKey) return
      try {
        const note = notes.find(n => n.id === id)
        if (!note) return
        await updateItem(id, {
          data: {
            ...note.data,
            transcription,
          },
        }, derivedKey)
        setNotes(prev => prev.map(n =>
          n.id === id
            ? {
                ...n,
                data: { ...n.data, transcription },
              }
            : n
        ))
        if (activeNote?.id === id) {
          setActiveNote(prev => prev ? {
            ...prev,
            data: { ...prev.data, transcription },
          } : null)
        }
      } catch (err) {
        console.error('updateTranscription:', err)
      }
    },
    [derivedKey, notes, activeNote]
  )

  // ── RENAME ────────────────────────────────────
  const renameNote = useCallback(
    async (id, newTitle) => {
      const trimmed = newTitle?.trim()
      if (!trimmed || !derivedKey) return false
      try {
        setNotes(prev => prev.map(n =>
          n.id === id
            ? { ...n, title: trimmed }
            : n
        ))
        await updateItem(
          id, { title: trimmed }, derivedKey
        )
        if (activeNote?.id === id) {
          setActiveNote(prev => prev
            ? { ...prev, title: trimmed }
            : null
          )
        }
        return true
      } catch (err) {
        await loadNotes()
        return false
      }
    },
    [derivedKey, activeNote, loadNotes]
  )

  // ── DELETE ────────────────────────────────────
  const deleteNote = useCallback(async (id) => {
    try {
      await deleteItem(id)
      setNotes(prev => prev.filter(n => n.id !== id))
      if (activeId === id) {
        setActiveId(null)
        setActiveNote(null)
        if (activeURLRef.current) {
          URL.revokeObjectURL(activeURLRef.current)
          activeURLRef.current = null
          setPlayerObjectURL(null)
        }
      }
      addToast({
        variant: 'success',
        title: 'Recording deleted',
        duration: 2000,
      })
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Delete failed',
        description: err.message,
      })
    }
  }, [activeId])

  // ── FAVORITE ─────────────────────────────────
  const toggleFavoriteNote = useCallback(
    async (id) => {
      try {
        await toggleFavorite(id)
        setNotes(prev => prev.map(n =>
          n.id === id
            ? { ...n, isFavorite: !n.isFavorite }
            : n
        ))
        if (activeNote?.id === id) {
          setActiveNote(prev => prev ? {
            ...prev,
            isFavorite: !prev.isFavorite,
          } : null)
        }
      } catch (err) {
        console.error('toggleFavorite:', err)
      }
    },
    [activeNote]
  )

  // ── CLOSE ─────────────────────────────────────
  const closeNote = useCallback(() => {
    if (activeURLRef.current) {
      URL.revokeObjectURL(activeURLRef.current)
      activeURLRef.current = null
    }
    setActiveId(null)
    setActiveNote(null)
    setPlayerObjectURL(null)
  }, [])

  return {
    notes, isLoading, isSaving,
    activeNote, activeId,
    playerObjectURL, isDecrypting,
    searchQuery,

    setSearchQuery,
    loadNotes, openNote, closeNote,
    saveRecording, uploadAudioFile,
    updateTranscription, renameNote,
    deleteNote, toggleFavoriteNote,
    formatDuration, formatDate,
  }
}
