import { useState, useCallback, useEffect,
  useMemo } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import {
  createItem, getAllItems, getItem,
  updateItem, deleteItem, toggleFavorite,
} from '../db/vaultOperations'

export function useDiary() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeEntry, setActiveEntry] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = 
    useState(false)
  const [saveStatus, setSaveStatus] = 
    useState('idle')
  const [searchQuery, setSearchQuery] = 
    useState('')
  const [viewMode, setViewMode] = 
    useState('timeline')
  // 'timeline' | 'heatmap'

  // ── LOAD ALL ENTRIES ───────────────────────────
  const loadEntries = useCallback(async () => {
    if (!derivedKey) return
    setIsLoading(true)
    try {
      const result = await getAllItems(derivedKey, {
        type: 'diary',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })

      let items = result.items

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        items = items.filter(item => {
          const titleMatches = typeof item.title === 'string' && item.title.toLowerCase().includes(q);
          const previewStr = typeof item.preview === 'string' ? item.preview.toLowerCase() : '';
          const summaryStr = typeof item.data?.summary === 'string' ? item.data.summary.toLowerCase() : '';
          return titleMatches || previewStr.includes(q) || summaryStr.includes(q);
        })
      }

      setEntries(items)
    } catch (err) {
      console.error('loadEntries failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [derivedKey, searchQuery])

  useEffect(() => {
    if (derivedKey) loadEntries()
  }, [derivedKey, searchQuery])

  // ── OPEN ENTRY IN MODAL ────────────────────────
  const openEntry = useCallback(async (id) => {
    if (!derivedKey) return
    setActiveId(id)
    try {
      const full = await getItem(id, derivedKey)
      setActiveEntry(full)
      setIsEditorOpen(true)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Could not open entry',
        description: err.message,
      })
    }
  }, [derivedKey])

  // ── CREATE AND OPEN ENTRY ──────────────────────
  const openOrCreateEntry = useCallback(
    async (dateStr) => {
      if (!derivedKey) return

      // Check if entry exists for this date
      const existing = entries.find(
        e => e.data?.date === dateStr
      )

      if (existing) {
        await openEntry(existing.id)
        return
      }

      // Create new entry
      const dateObj = new Date(
        dateStr + 'T12:00:00'
      )
      const title = dateObj.toLocaleDateString(
        'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      )

      try {
        const item = await createItem({
          type: 'diary',
          title,
          data: {
            content: '',
            date: dateStr,
            mood: '',
            weather: '',
            location: '',
            summary: '',
            wordCount: 0,
            readTime: 0,
            isPrivate: false,
            photos: [],
          },
          thumbnail: null,
          folderId: null,
          tags: [],
          isFavorite: false,
        }, derivedKey)

        await loadEntries()

        const full = await getItem(
          item.id, derivedKey
        )
        setActiveEntry(full)
        setActiveId(item.id)
        setIsEditorOpen(true)
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to create entry',
          description: err.message,
        })
      }
    },
    [derivedKey, entries, openEntry, loadEntries]
  )

  // ── SAVE ENTRY ─────────────────────────────────
  const saveEntry = useCallback(
    async (id, updates) => {
      if (!derivedKey || !id) return
      setSaveStatus('saving')

      try {
        const text = (updates.content || '')
          .replace(/<[^>]*>/g, ' ')
          .trim()
        const wordCount = text
          ? text.split(/\s+/).filter(Boolean).length
          : 0
        const readTime = Math.max(
          1, Math.ceil(wordCount / 200)
        )

        // Extract preview
        const preview = text
          .substring(0, 150)
          .trim()

        await updateItem(id, {
          data: {
            ...activeEntry?.data,
            ...updates,
            wordCount,
            readTime,
          },
          preview,
          tags: updates.tags || 
            activeEntry?.tags || [],
        }, derivedKey)

        // Refresh active entry
        const updated = await getItem(
          id, derivedKey
        )
        setActiveEntry(updated)

        // Update in list
        setEntries(prev => prev.map(e =>
          e.id === id
            ? {
                ...e,
                preview,
                data: {
                  ...e.data,
                  ...updates,
                  wordCount,
                  readTime,
                },
              }
            : e
        ))

        setSaveStatus('saved')
        setTimeout(() => 
          setSaveStatus('idle'), 2000
        )
      } catch (err) {
        setSaveStatus('error')
        console.error('saveEntry failed:', err)
      }
    },
    [derivedKey, activeEntry]
  )

  // ── CLOSE EDITOR ───────────────────────────────
  const closeEditor = useCallback(() => {
    setIsEditorOpen(false)
    setActiveEntry(null)
    setActiveId(null)
  }, [])

  // ── DELETE ENTRY ───────────────────────────────
  const deleteEntry = useCallback(async (id) => {
    try {
      await deleteItem(id)
      setEntries(prev => 
        prev.filter(e => e.id !== id)
      )
      closeEditor()
      addToast({
        variant: 'success',
        title: 'Entry deleted',
        duration: 2000,
      })
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Delete failed',
        description: err.message,
      })
    }
  }, [closeEditor])

  // ── TOGGLE FAVORITE ────────────────────────────
  const toggleFavoriteEntry = useCallback(
    async (id) => {
      try {
        await toggleFavorite(id)
        setEntries(prev => prev.map(e =>
          e.id === id
            ? { ...e, isFavorite: !e.isFavorite }
            : e
        ))
        if (activeEntry?.id === id) {
          setActiveEntry(prev => prev ? {
            ...prev,
            isFavorite: !prev.isFavorite,
          } : null)
        }
      } catch (err) {
        console.error('toggleFavorite:', err)
      }
    },
    [activeEntry]
  )

  // ── QUICK CAPTURE ──────────────────────────────
  const quickCapture = useCallback(
    async (text, mood) => {
      if (!derivedKey || !text.trim()) return

      const today = new Date()
        .toISOString().split('T')[0]

      const existing = entries.find(
        e => e.data?.date === today
      )

      if (existing) {
        const existingData = await getItem(existing.id, derivedKey)
        const oldContentStr = typeof existingData?.data?.content === 'string' ? existingData.data.content : '';
        const newContent = oldContentStr ? `${oldContentStr}<br><br>${text}` : text
        
        await updateItem(existing.id, {
            data: {
                ...existingData?.data,
                content: newContent,
                wordCount: newContent.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
                mood: mood || existingData?.data?.mood
            }
        }, derivedKey)
      } else {
        const dateObj = new Date(today + 'T12:00:00')
        const title = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
        })
        await createItem({
            type: 'diary',
            title,
            data: {
              content: text,
              date: today,
              mood: mood || '',
              weather: '',
              location: '',
              summary: '',
              wordCount: text.split(/\s+/).filter(Boolean).length,
              readTime: 1,
              isPrivate: false,
              photos: [],
            },
            thumbnail: null,
            folderId: null,
            tags: [],
            isFavorite: false,
          }, derivedKey)
      }
      await loadEntries()
    },
    [derivedKey, entries, loadEntries]
  )

  // ── COMPUTED DATA ──────────────────────────────

  // Group entries by month for timeline
  const groupedEntries = useMemo(() => {
    const groups = {}
    entries.forEach(entry => {
      const date = entry.data?.date
      if (!date) return
      const d = new Date(date + 'T12:00:00')
      const key = `${d.getFullYear()}-${
        String(d.getMonth() + 1).padStart(2,'0')
      }`
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => {
        const [year, month] = key.split('-')
        const label = new Date(
          parseInt(year), parseInt(month) - 1, 1
        ).toLocaleDateString('en-US', {
          month: 'long', year: 'numeric'
        })
        return { key, label, entries: items }
      })
  }, [entries])

  // Streak calculation
  const streak = useMemo(() => {
    const dates = entries
      .map(e => e.data?.date)
      .filter(Boolean)
      .sort()
      .reverse()

    if (dates.length === 0) return 0

    const today = new Date()
      .toISOString().split('T')[0]
    const yesterday = new Date(
      Date.now() - 86400000
    ).toISOString().split('T')[0]

    if (dates[0] !== today && 
        dates[0] !== yesterday) return 0

    let count = 1
    for (let i = 1; i < dates.length; i++) {
      const a = new Date(
        dates[i-1] + 'T12:00:00'
      )
      const b = new Date(
        dates[i] + 'T12:00:00'
      )
      const diff = (a - b) / 86400000
      if (diff === 1) count++
      else break
    }
    return count
  }, [entries])

  // Has entry today
  const hasEntryToday = useMemo(() => {
    const today = new Date()
      .toISOString().split('T')[0]
    return entries.some(e => e.data?.date === today)
  }, [entries])

  // On this day (past years)
  const onThisDay = useMemo(() => {
    const today = new Date()
    const mmdd = `${String(
      today.getMonth() + 1
    ).padStart(2,'0')}-${String(
      today.getDate()
    ).padStart(2,'0')}`

    return entries.filter(e => {
      const d = e.data?.date
      if (!d) return false
      const year = d.split('-')[0]
      return d.endsWith(mmdd) && 
        year !== String(today.getFullYear())
    })
  }, [entries])

  // Mood data for last 7 days
  const last7DaysMoods = useMemo(() => {
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toISOString().split('T')[0]
      const entry = entries.find(
        e => e.data?.date === dateStr
      )
      result.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', {
          weekday: 'short'
        }),
        mood: entry?.data?.mood || null,
        hasEntry: !!entry,
      })
    }
    return result
  }, [entries])

  // Heatmap data (last 52 weeks)
  const heatmapData = useMemo(() => {
    const data = {}
    entries.forEach(e => {
      if (e.data?.date) {
        data[e.data.date] = {
          mood: e.data.mood,
          wordCount: e.data.wordCount || 0,
          id: e.id,
        }
      }
    })
    return data
  }, [entries])

  // Total stats
  const stats = useMemo(() => ({
    total: entries.length,
    streak,
    totalWords: entries.reduce(
      (s, e) => s + (e.data?.wordCount || 0), 0
    ),
    hasEntryToday,
  }), [entries, streak, hasEntryToday])

  return {
    entries, isLoading,
    activeEntry, activeId,
    isEditorOpen, saveStatus,
    searchQuery, viewMode,
    groupedEntries, streak,
    hasEntryToday, onThisDay,
    last7DaysMoods, heatmapData,
    stats,

    setSearchQuery, setViewMode,
    openEntry, openOrCreateEntry,
    saveEntry, closeEditor,
    deleteEntry, toggleFavoriteEntry,
    quickCapture,
  }
}
