// Complete gallery hook — all operations working

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import { db } from '../db/database'
import { decryptData } from '../crypto/engine'
import {
  createItem, getAllItems, getItem,
  updateItem, deleteItem, toggleFavorite,
  createFolder, getFolders,
  updateFolder, deleteFolder,
} from '../db/vaultOperations'
import { encryptFile, decryptFile } from '../crypto/engine'
import {
  getMediaType, getMimeType,
  generateImageThumbnail, generateVideoThumbnail,
  compressImage, getImageDimensions,
  getVideoDuration, createObjectURL, revokeObjectURL,
  formatFileSize,
} from '../utils/mediaUtils'
import { useUiStore } from '../store/uiStore'

export function useGallery() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [items, setItems] = useState([])
  const itemsRef = useRef([])
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const [albums, setAlbums] = useState([])
  const [activeAlbumId, setActiveAlbumId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ 
    current: 0, 
    total: 0, 
    percent: 0, 
    filename: '' 
  })
  const [lightbox, setLightbox] = useState(null)
  // { item, objectURL, isDecrypting, error }
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const globalViewMode = useUiStore((state) => state.viewMode)
  const localViewMode = useUiStore((state) => state.folderViews['gallery'])
  const setFolderView = useUiStore((state) => state.setFolderView)

  const viewMode = localViewMode || globalViewMode
  const setViewMode = useCallback((mode) => {
    setFolderView('gallery', mode)
  }, [setFolderView])

  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // New features state
  const [searchQuery, setSearchQuery] = useState('')

  const [folderCounts, setFolderCounts] = useState({
    all: 0,
    favorites: 0,
    photos: 0,
    videos: 0,
    gifs: 0,
    collages: 0,
  })

  const refreshFolderCounts = useCallback(async () => {
    if (!derivedKey) return
    
    try {
      const [photoResult, videoResult] = 
        await Promise.all([
          getAllItems(derivedKey, { type: 'photo' }),
          getAllItems(derivedKey, { type: 'video' }),
        ])
      
      const allItems = [
        ...photoResult.items,
        ...videoResult.items,
      ]
      
      const counts = {
        all: allItems.length,
        favorites: allItems.filter(
          i => i.isFavorite
        ).length,
        photos: photoResult.items.filter(
          i => i.data?.mimeType !== 'image/gif'
        ).length,
        videos: videoResult.items.length,
        gifs: photoResult.items.filter(
          i => i.data?.mimeType === 'image/gif'
        ).length,
        collages: 0, // future feature
      }
      
      setFolderCounts(counts)
    } catch (err) {
      console.error('refreshFolderCounts:', err)
    }
  }, [derivedKey])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase().trim()
    return items.filter(item =>
      item.title.toLowerCase().includes(q) ||
      (item.tags || []).some(tag => tag.toLowerCase().includes(q))
    )
  }, [items, searchQuery])

  const lastAlbumIdRef = useRef(activeAlbumId)
  const lastFilterTypeRef = useRef(filterType)

  const [galleryStats, setGalleryStats] = useState({
    totalSize: 0,
    formattedSize: '0 B',
    photoCount: 0,
    videoCount: 0,
    gifCount: 0,
    favoriteCount: 0,
    collageCount: 0,
    totalCount: 0,
  })

  const activeURLRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeURLRef.current) {
        revokeObjectURL(activeURLRef.current)
        activeURLRef.current = null
      }
    }
  }, [])

  // ── LOAD GALLERY STATS ───────────────────────────
  const loadGalleryStats = useCallback(async () => {
    if (!derivedKey) return
    try {
      const dbItems = await db.items.where('type').anyOf(['photo', 'video']).toArray()
      let totalSize = 0
      let photoCount = 0
      let videoCount = 0
      let gifCount = 0
      let favoriteCount = 0
      let collageCount = 0

      for (const item of dbItems) {
        try {
          const decryptedStr = await decryptData(item.encryptedData, item.dataIv, derivedKey)
          const rawData = typeof decryptedStr === 'string' ? JSON.parse(decryptedStr) : decryptedStr
          
          if (rawData && rawData.size) {
            totalSize += rawData.size
          }

          if (item.isFavorite === true || item.isFavorite === 1) {
            favoriteCount++
          }

          const titleLower = item.title.toLowerCase()
          const isCollageOrCollege = titleLower.includes('collage') || titleLower.includes('college')

          if (item.type === 'video') {
            videoCount++
          } else {
            if (rawData?.mimeType === 'image/gif') {
              gifCount++
            } else if (isCollageOrCollege) {
              collageCount++
            } else {
              photoCount++
            }
          }
        } catch (err) {
          console.warn('Stat decryption failed for item:', item.id, err)
        }
      }

      setGalleryStats({
        totalSize,
        formattedSize: formatFileSize(totalSize),
        photoCount,
        videoCount,
        gifCount,
        favoriteCount,
        collageCount,
        totalCount: dbItems.length,
      })
    } catch (err) {
      console.error('loadGalleryStats failed:', err)
    }
  }, [derivedKey])

  // ── LOAD ITEMS ──────────────────────────────────
  const loadItems = useCallback(async (albumId) => {
    if (!derivedKey) return

    const isSpecialChange = 
      lastAlbumIdRef.current !== albumId || 
      lastFilterTypeRef.current !== filterType;

    if (itemsRef.current.length === 0 || isSpecialChange) {
      setIsLoading(true)
    }

    lastAlbumIdRef.current = albumId
    lastFilterTypeRef.current = filterType

    try {
      const filters = { sortBy, sortOrder }
      const isSystemView = albumId === null || typeof albumId === 'string'

      if (!isSystemView) {
        filters.folderId = Number(albumId)
      }

      // Load photos and videos
      const [photos, videos] = await Promise.all([
        getAllItems(derivedKey, { ...filters, type: 'photo' }),
        getAllItems(derivedKey, { ...filters, type: 'video' }),
      ])

      let combined = [
        ...photos.items,
        ...videos.items,
      ]

      if (!isSystemView) {
        combined = combined.filter(i => i.folderId === Number(albumId))
      }

      // Filter by system view
      if (albumId === 'favorites') {
        combined = combined.filter(i => i.isFavorite)
      } else if (albumId === 'photos') {
        combined = combined.filter(i => 
          i.type === 'photo' && 
          i.data?.mimeType !== 'image/gif' && 
          !i.title.toLowerCase().includes('collage') &&
          !i.title.toLowerCase().includes('college') &&
          !(i.tags || []).some(t => t.toLowerCase().includes('collage') || t.toLowerCase().includes('college'))
        )
      } else if (albumId === 'videos') {
        combined = combined.filter(i => i.type === 'video')
      } else if (albumId === 'gifs') {
        combined = combined.filter(i => i.data?.mimeType === 'image/gif')
      } else if (albumId === 'collages') {
        combined = combined.filter(i => 
          i.title.toLowerCase().includes('collage') || 
          i.title.toLowerCase().includes('college') ||
          (i.tags || []).some(t => t.toLowerCase().includes('collage') || t.toLowerCase().includes('college'))
        )
      }

      // Filter by type selection in dropdown
      if (filterType === 'gif') {
        combined = combined.filter(
          i => i.data?.mimeType === 'image/gif'
        )
      } else if (filterType === 'photo') {
        // Photos excludes GIFs
        combined = combined.filter(
          i => i.type === 'photo' && 
          i.data?.mimeType !== 'image/gif'
        )
      } else if (filterType === 'video') {
        combined = combined.filter(i => i.type === 'video')
      } else if (filterType === 'favorite') {
        combined = combined.filter(i => i.isFavorite)
      }

      // Sort
      combined.sort((a, b) => {
        const va = new Date(a[sortBy] || 0).getTime()
        const vb = new Date(b[sortBy] || 0).getTime()
        return sortOrder === 'desc' ? vb - va : va - vb
      })

      setItems(combined)
    } catch (err) {
      console.error('loadItems failed:', err)
      addToast({
        variant: 'danger',
        title: 'Failed to load gallery',
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [derivedKey, sortBy, sortOrder, filterType, addToast])

  // ── LOAD ALBUMS ─────────────────────────────────
  const loadAlbums = useCallback(async () => {
    try {
      const all = await getFolders()
      // Show only non-default folders as albums
      const galleryAlbums = all.filter(f => !f.isDefault)
      setAlbums(galleryAlbums)
    } catch (err) {
      console.error('loadAlbums failed:', err)
    }
  }, [])

  // Auto-load
  useEffect(() => {
    if (derivedKey) {
      loadItems(activeAlbumId)
      loadAlbums()
      loadGalleryStats()
      refreshFolderCounts()
    }
  }, [derivedKey, activeAlbumId, sortBy, sortOrder, filterType, loadItems, loadAlbums, loadGalleryStats, refreshFolderCounts])

  // ── UPLOAD FILES ────────────────────────────────
  const uploadFiles = useCallback(async (files) => {
    if (!derivedKey) {
      addToast({
        variant: 'danger',
        title: 'Not unlocked',
        description: 'Vault must be unlocked first.',
      })
      return
    }

    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Validate
    const valid = []
    for (const file of fileArray) {
      const type = getMediaType(file)
      if (type === 'unknown') {
        addToast({
          variant: 'warning',
          title: 'Unsupported file',
          description: `${file.name} skipped — not a supported photo/video format.`,
          duration: 4000,
        })
        continue
      }
      if (file.size > 500 * 1024 * 1024) {
        addToast({
          variant: 'warning',
          title: 'File too large',
          description: `${file.name} is over 500MB.`,
          duration: 4000,
        })
        continue
      }
      valid.push(file)
    }

    if (valid.length === 0) return

    const batch = valid.slice(0, 50)
    setIsUploading(true)
    let successCount = 0

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i]
      const mediaType = getMediaType(file)

      setUploadProgress({
        current: i + 1,
        total: batch.length,
        percent: Math.round((i / batch.length) * 100),
        filename: file.name,
      })

      try {
        // Step 1: Compress if photo
        const processed = mediaType === 'photo'
          ? await compressImage(file)
          : file

        // Step 2: Get metadata
        let width = 0, height = 0, duration = 0
        if (mediaType === 'photo') {
          const dims = await getImageDimensions(processed)
          width = dims.width
          height = dims.height
        } else {
          duration = await getVideoDuration(file)
        }

        // Step 3: Generate thumbnail
        let thumbnail = null
        if (mediaType === 'photo') {
          thumbnail = await generateImageThumbnail(processed)
        } else {
          thumbnail = await generateVideoThumbnail(file)
        }

        // Step 4: Encrypt file data
        const buffer = await processed.arrayBuffer()
        const { encryptedData, iv } = await encryptFile(buffer, derivedKey)

        // Step 5: Save to DB
        const mimeType = processed.type || getMimeType(file.name)

        // Save inside folder if currently in a custom numerical album
        let autoFolderId = typeof activeAlbumId === 'number' ? activeAlbumId : null

        await createItem({
          type: mediaType,
          title: file.name,
          data: {
            mimeType,
            size: file.size,
            compressedSize: processed.size,
            width,
            height,
            duration,
            encryptedData,
            iv,
          },
          thumbnail,
          folderId: autoFolderId,
          tags: [],
          isFavorite: false,
        }, derivedKey)

        successCount++

      } catch (err) {
        console.error(`Upload failed: ${file.name}`, err)
        addToast({
          variant: 'danger',
          title: `Failed: ${file.name}`,
          description: 'Could not encrypt this file.',
          duration: 4000,
        })
      }
    }

    setUploadProgress({
      current: batch.length,
      total: batch.length,
      percent: 100,
      filename: '',
    })

    await new Promise(r => setTimeout(r, 600))
    setIsUploading(false)
    setUploadProgress({
      current: 0, total: 0,
      percent: 0, filename: '',
    })

    // Reload gallery items & stats
    await loadItems(activeAlbumId)
    await loadGalleryStats()
    await refreshFolderCounts()

    if (successCount > 0) {
      addToast({
        variant: 'success',
        title: 'Upload complete',
        description: `${successCount} file${successCount > 1 ? 's' : ''} added to gallery.`,
        duration: 3000,
      })
    }
  }, [derivedKey, activeAlbumId, loadItems, loadGalleryStats, addToast])

  // ── OPEN LIGHTBOX ───────────────────────────────
  const openLightbox = useCallback(async (item) => {
    if (!derivedKey) return
    
    const idx = items.findIndex(i => i.id === item.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    
    // Show immediately with loading state
    setLightbox({
      item,
      objectURL: null,
      isDecrypting: true,
      error: null,
    })
    
    // Revoke previous URL immediately
    if (activeURLRef.current) {
      revokeObjectURL(activeURLRef.current)
      activeURLRef.current = null
    }
    
    try {
      // ALWAYS fetch full item from DB
      // Never rely on item from list — it has no
      // encryptedData field (only title + metadata)
      const full = await getItem(item.id, derivedKey)
      
      console.log('full item data:', full?.data)
      
      if (!full) {
        throw new Error('Item not found in database')
      }
      
      if (!full.data) {
        throw new Error('Item data is empty')
      }
      
      if (!full.data.encryptedData) {
        throw new Error(
          'No encrypted file data found. ' +
          'Item: ' + JSON.stringify({
            id: full.id,
            type: full.type,
            dataKeys: Object.keys(full.data || {}),
          })
        )
      }
      
      const fileSizeMB = (full.data?.size || 0) / (1024 * 1024)
      
      if (fileSizeMB > 100) {
        // Show "large file" notice in loading state
        setLightbox(prev => prev ? {
          ...prev,
          loadingMessage: `Loading ${Math.round(fileSizeMB)}MB file...`,
        } : null)
      }
      
      // Decrypt in a non-blocking way
      // Use setTimeout(0) to allow UI to render 
      // loading state first
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const buffer = await decryptFile(
        full.data.encryptedData,
        full.data.iv,
        derivedKey
      )
      
      const mimeType = full.data.mimeType ||
        getMimeType(full.title)
      
      const blob = new Blob([buffer], 
        { type: mimeType })
      const objectURL = URL.createObjectURL(blob)
      activeURLRef.current = objectURL
      
      setLightbox({
        item: full,
        objectURL,
        isDecrypting: false,
        error: null,
        mimeType,
      })
      
    } catch (err) {
      console.error('openLightbox error:', err)
      setLightbox(prev => prev ? {
        ...prev,
        isDecrypting: false,
        error: err.message,
      } : null)
    }
  }, [derivedKey, items])

  // ── NAVIGATE LIGHTBOX ───────────────────────────
  const navigateLightbox = useCallback(async (direction) => {
    if (items.length === 0) return
    let newIdx = lightboxIndex + (direction === 'next' ? 1 : -1)
    newIdx = Math.max(0, Math.min(newIdx, items.length - 1))
    if (newIdx === lightboxIndex) return
    setLightboxIndex(newIdx)
    await openLightbox(items[newIdx])
  }, [lightboxIndex, items, openLightbox])

  // ── CLOSE LIGHTBOX ──────────────────────────────
  const closeLightbox = useCallback(() => {
    if (activeURLRef.current) {
      revokeObjectURL(activeURLRef.current)
      activeURLRef.current = null
    }
    setLightbox(null)
    setLightboxIndex(0)
  }, [])

  // ── RENAME ──────────────────────────────────────
  const renameItem = useCallback(async (id, newTitle) => {
    const trimmed = newTitle?.trim()
    if (!trimmed || !derivedKey) return false
    try {
      setItems(prev => prev.map(i =>
        i.id === id ? { ...i, title: trimmed } : i
      ))
      if (lightbox?.item?.id === id) {
        setLightbox(prev => prev ? {
          ...prev,
          item: { ...prev.item, title: trimmed }
        } : null)
      }
      await updateItem(id, { title: trimmed }, derivedKey)
      return true
    } catch (err) {
      await loadItems(activeAlbumId)
      addToast({
        variant: 'danger',
        title: 'Rename failed',
        description: err.message,
      })
      return false
    }
  }, [derivedKey, lightbox, activeAlbumId, loadItems, addToast])

  // ── DELETE ──────────────────────────────────────
  const deleteGalleryItem = useCallback(async (id) => {
    if (!id) return false
    try {
      await deleteItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
      if (lightbox?.item?.id === id) {
        closeLightbox()
      }
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await loadGalleryStats()
      await refreshFolderCounts()
      return true
    } catch (err) {
      console.error('deleteGalleryItem failed:', err)
      addToast({
        variant: 'danger',
        title: 'Delete failed',
        description: err.message || 'Could not delete item.',
      })
      return false
    }
  }, [lightbox, closeLightbox, loadGalleryStats, refreshFolderCounts, addToast])

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    
    let deletedCount = 0
    for (const id of ids) {
      try {
        await deleteItem(id)
        deletedCount++
      } catch (err) {
        console.error(`Failed to delete ${id}:`, err)
      }
    }

    setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
    setSelectedIds(new Set())

    if (lightbox?.item && selectedIds.has(lightbox.item.id)) {
      closeLightbox()
    }

    await loadGalleryStats()
    await refreshFolderCounts()

    addToast({
      variant: 'success',
      title: `${deletedCount} item${deletedCount > 1 ? 's' : ''} deleted`,
      duration: 3000,
    })
  }, [selectedIds, lightbox, closeLightbox, loadGalleryStats, refreshFolderCounts, addToast])

  // ── FAVORITE ────────────────────────────────────
  const toggleFavoriteItem = useCallback(async (id) => {
    try {
      await toggleFavorite(id)
      setItems(prev => {
        let updated = prev.map(i =>
          i.id === id ? { ...i, isFavorite: !i.isFavorite } : i
        )
        if (activeAlbumId === 'favorites') {
          updated = updated.filter(i => i.isFavorite)
        }
        return updated
      })
      if (lightbox?.item?.id === id) {
        setLightbox(prev => prev ? {
          ...prev,
          item: {
            ...prev.item,
            isFavorite: !prev.item.isFavorite
          }
        } : null)
      }
      await loadGalleryStats()
      await refreshFolderCounts()
    } catch (err) {
      console.error('toggleFavorite failed:', err)
    }
  }, [lightbox, activeAlbumId, loadGalleryStats, refreshFolderCounts])

  // ── DOWNLOAD ────────────────────────────────────
  const downloadItem = useCallback(async (item) => {
    if (!derivedKey) return
    try {
      const full = await getItem(item.id, derivedKey)
      const buffer = await decryptFile(
        full.data.encryptedData,
        full.data.iv,
        derivedKey
      )
      const mimeType = full.data.mimeType || getMimeType(full.title)
      const blob = new Blob([buffer], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = full.title
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Download failed',
        description: err.message,
      })
    }
  }, [derivedKey, addToast])

  // ── SELECTION ───────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)))
  }, [filteredItems])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // ── ALBUMS ──────────────────────────────────────
  const createAlbum = useCallback(async (name) => {
    if (!name?.trim()) return null
    try {
      const id = await createFolder(name.trim(), null, '#888888', false)
      await loadAlbums()
      return id
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to create album',
        description: err.message,
      })
      return null
    }
  }, [loadAlbums, addToast])

  const renameAlbum = useCallback(async (id, newName) => {
    if (!newName?.trim()) return false
    try {
      await updateFolder(id, { name: newName.trim() })
      await loadAlbums()
      return true
    } catch { 
      return false 
    }
  }, [loadAlbums])

  const deleteAlbum = useCallback(async (id) => {
    try {
      await deleteFolder(id)
      if (activeAlbumId === id) {
        setActiveAlbumId(null)
      }
      await loadAlbums()
      await loadItems(activeAlbumId === id ? null : activeAlbumId)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to delete album',
        description: err.message,
      })
    }
  }, [activeAlbumId, loadAlbums, loadItems, addToast])

  const moveToAlbum = useCallback(async (itemIds, albumId) => {
    if (!derivedKey) return
    try {
      for (const id of itemIds) {
        await updateItem(id, { folderId: albumId }, derivedKey)
      }
      clearSelection()
      await loadItems(activeAlbumId)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Move failed',
        description: err.message,
      })
    }
  }, [derivedKey, activeAlbumId, loadItems, clearSelection, addToast])

  // ── UPDATE ITEM TAGS ────────────────────────────
  const updateItemTags = useCallback(async (id, tags) => {
    if (!derivedKey) return
    try {
      await updateItem(id, { tags }, derivedKey)
      setItems(prev => prev.map(i =>
        i.id === id ? { ...i, tags } : i
      ))
      if (lightbox?.item?.id === id) {
        setLightbox(prev => prev ? {
          ...prev,
          item: { ...prev.item, tags }
        } : null)
      }
      await loadGalleryStats()
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to save tags',
        description: err.message,
      })
    }
  }, [derivedKey, lightbox, addToast, loadGalleryStats])

  return {
    items: filteredItems, albums, activeAlbumId, isLoading,
    isUploading, uploadProgress,
    lightbox, lightboxIndex,
    selectedIds, viewMode, filterType,
    sortBy, sortOrder,
    
    galleryStats,
    searchQuery,
    folderCounts,

    setActiveAlbumId, setViewMode,
    setFilterType, setSortBy, setSortOrder,
    setSearchQuery,

    loadItems, loadAlbums, uploadFiles,
    openLightbox, closeLightbox, navigateLightbox,
    renameItem, deleteGalleryItem, deleteSelected,
    toggleFavoriteItem, downloadItem,
    toggleSelect, selectAll, clearSelection,
    createAlbum, renameAlbum, deleteAlbum,
    moveToAlbum,
    updateItemTags,
    loadGalleryStats,
  }
}
