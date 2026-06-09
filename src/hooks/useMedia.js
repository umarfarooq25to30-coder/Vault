// useMedia hook — all media operations
// Manages upload queue, decryption lifecycle, selection state, and album operations

import { useState, useCallback, useRef, useEffect } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { 
  createItem, getAllItems, getItem, updateItem,
  deleteItem, toggleFavorite, createFolder,
  getFolders, deleteFolder, updateFolder
} from '../db/vaultOperations'
import { encryptFile, decryptFile } from '../crypto/engine'
import { 
  getMediaType, getMimeType, generateImageThumbnail,
  generateVideoThumbnail, compressImage,
  createObjectURL, revokeObjectURL,
  getImageDimensions, getVideoDuration, formatFileSize,
  formatRelativeDate
} from '../utils/mediaUtils'
import { useToastStore } from '../store/toastStore'

export function useMedia() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)
  
  // ── STATE ──────────────────────────────────────
  const [mediaItems, setMediaItems] = useState([])
  const [albums, setAlbums] = useState([])
  const [activeAlbum, setActiveAlbum] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,      // current file index (1-based)
    total: 0,        // total files in queue
    percent: 0,      // 0-100
    filename: '',    // current file being processed
  })
  const [lightboxItem, setLightboxItem] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterType, setFilterType] = useState('all')
  // 'all' | 'photo' | 'video' | 'favorite'
  
  // Track active object URLs for cleanup
  const activeURLRef = useRef(null)
  
  // ── CLEANUP ────────────────────────────────────
  useEffect(() => {
    return () => {
      // Revoke any active object URL on unmount
      if (activeURLRef.current) {
        revokeObjectURL(activeURLRef.current)
        activeURLRef.current = null
      }
    }
  }, [])

  // ── LOAD MEDIA ─────────────────────────────────
  const loadMedia = useCallback(async (albumId = null) => {
    if (!derivedKey) return
    setIsLoading(true)
    
    try {
      const filters = {
        sortBy,
        sortOrder,
        ...(albumId !== null && { folderId: albumId }),
      }
      
      // Get items of type photo and video
      const [photoResult, videoResult] = await Promise.all([
        getAllItems(derivedKey, { ...filters, type: 'photo' }),
        getAllItems(derivedKey, { ...filters, type: 'video' }),
      ])
      
      let combined = [
        ...photoResult.items,
        ...videoResult.items,
      ]
      
      // Filter by active album if applicable
      if (albumId !== null) {
        combined = combined.filter(i => i.folderId === albumId)
      }
      
      // Apply filter type
      if (filterType === 'photo') {
        combined = combined.filter(i => i.type === 'photo')
      } else if (filterType === 'video') {
        combined = combined.filter(i => i.type === 'video')
      } else if (filterType === 'favorite') {
        combined = combined.filter(i => i.isFavorite)
      }
      
      // Sort combined results
      combined.sort((a, b) => {
        let valA, valB
        if (sortBy === 'createdAt') {
          valA = new Date(a.createdAt || 0).getTime()
          valB = new Date(b.createdAt || 0).getTime()
        } else if (sortBy === 'title') {
          valA = a.title || ''
          valB = b.title || ''
          return sortOrder === 'desc' 
            ? valB.localeCompare(valA) 
            : valA.localeCompare(valB)
        } else if (sortBy === 'size') {
          valA = a.data?.size || 0
          valB = b.data?.size || 0
        } else {
          valA = new Date(a.updatedAt || 0).getTime()
          valB = new Date(b.updatedAt || 0).getTime()
        }
        
        return sortOrder === 'desc' 
          ? valB - valA 
          : valA - valB
      })
      
      setMediaItems(combined)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to load media',
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [derivedKey, sortBy, sortOrder, filterType, addToast])
  
  // ── LOAD ALBUMS ────────────────────────────────
  const loadAlbums = useCallback(async () => {
    try {
      const all = await getFolders()
      // Only show folders that are not default system folders (Notes, Files, etc.)
      const photoAlbums = all.filter(f => !f.isDefault)
      setAlbums(photoAlbums)
    } catch (err) {
      console.error('Failed to load albums:', err)
    }
  }, [])
  
  // Initial load
  useEffect(() => {
    if (derivedKey) {
      loadMedia(activeAlbum)
      loadAlbums()
    }
  }, [derivedKey, activeAlbum, sortBy, sortOrder, filterType, loadMedia, loadAlbums])
  
  // ── UPLOAD ─────────────────────────────────────
  const uploadFiles = useCallback(async (files) => {
    if (!derivedKey || !files || files.length === 0) return
    
    // Convert FileList to Array
    const fileArray = Array.from(files)
    
    // Validate files
    const validFiles = []
    for (const file of fileArray) {
      const type = getMediaType(file)
      if (type === 'unknown') {
        addToast({
          variant: 'warning',
          title: 'Unsupported file',
          description: `${file.name} is not a supported photo or video format.`,
        })
        continue
      }
      if (file.size > 500 * 1024 * 1024) { // 500MB
        addToast({
          variant: 'warning',
          title: 'File too large',
          description: `${file.name} exceeds 500MB limit.`,
        })
        continue
      }
      validFiles.push(file)
    }
    
    if (validFiles.length === 0) return
    
    // Cap at 50 files per batch
    const batch = validFiles.slice(0, 50)
    if (validFiles.length > 50) {
      addToast({
        variant: 'info',
        title: 'Batch limited',
        description: 'Processing first 50 files. Upload remaining files separately.',
      })
    }
    
    setIsUploading(true)
    setUploadProgress({ 
      current: 0, total: batch.length, 
      percent: 0, filename: '' 
    })
    
    // Process files SEQUENTIALLY (not parallel)
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
        // Step 1: Compress if image
        const processedFile = mediaType === 'photo'
          ? await compressImage(file)
          : file
          
        // Step 2: Get metadata
        let dimensions = null
        let duration = 0
        
        if (mediaType === 'photo') {
          dimensions = await getImageDimensions(processedFile)
        } else {
          duration = await getVideoDuration(file)
        }
        
        // Step 3: Generate thumbnail
        let thumbnailBase64 = null
        if (mediaType === 'photo') {
          thumbnailBase64 = await generateImageThumbnail(processedFile)
        } else {
          thumbnailBase64 = await generateVideoThumbnail(file)
        }
        
        // Step 4: Convert to ArrayBuffer
        const arrayBuffer = await processedFile.arrayBuffer()
          
        // Step 5: Encrypt the file data
        const { encryptedData, iv } = await encryptFile(arrayBuffer, derivedKey)
        
        // Step 6: Build item data object
        const itemData = {
          type: mediaType,
          title: file.name,
          data: {
            mimeType: file.type || getMimeType(file.name),
            size: file.size,
            compressedSize: processedFile.size,
            ...(dimensions && { 
              width: dimensions.width,
              height: dimensions.height 
            }),
            ...(duration && { duration }),
            encryptedData, // store encrypted file here
            iv,
          },
          thumbnail: thumbnailBase64,
          folderId: activeAlbum,
          tags: [],
          isFavorite: false,
        }
        
        await createItem(itemData, derivedKey)
        
      } catch (err) {
        addToast({
          variant: 'danger',
          title: `Failed: ${file.name}`,
          description: 'Could not encrypt and save this file.',
        })
      }
    }
    
    // Final progress
    setUploadProgress({
      current: batch.length,
      total: batch.length,
      percent: 100,
      filename: '',
    })
    
    // Small delay then hide progress
    await new Promise(r => setTimeout(r, 800))
    setIsUploading(false)
    setUploadProgress({ 
      current: 0, total: 0, percent: 0, filename: '' 
    })
    
    // Reload media list
    await loadMedia(activeAlbum)
    
    addToast({
      variant: 'success',
      title: 'Upload complete',
      description: `${batch.length} file${batch.length > 1 ? 's' : ''} added to vault.`,
    })
    
  }, [derivedKey, activeAlbum, loadMedia, addToast])
  
  // ── OPEN ITEM (Lightbox) ───────────────────────
  const openItem = useCallback(async (item) => {
    if (!derivedKey) return
    
    // Find index in current list
    const index = mediaItems.findIndex(m => m.id === item.id)
    setLightboxIndex(index >= 0 ? index : 0)
    
    // Set item with loading state
    setLightboxItem({ 
      ...item, 
      objectURL: null, 
      isDecrypting: true 
    })
    
    try {
      // Get full item with encrypted data
      const fullItem = await getItem(item.id, derivedKey)
      
      if (!fullItem?.data?.encryptedData) {
        throw new Error('No encrypted data found')
      }
      
      // Decrypt the file
      const decryptedBuffer = await decryptFile(
        fullItem.data.encryptedData,
        fullItem.data.iv,
        derivedKey
      )
      
      // Create object URL
      const mimeType = fullItem.data.mimeType || getMimeType(fullItem.title)
      const objectURL = createObjectURL(decryptedBuffer, mimeType)
      
      // Revoke previous URL if any
      if (activeURLRef.current) {
        revokeObjectURL(activeURLRef.current)
      }
      activeURLRef.current = objectURL
      
      setLightboxItem({
        ...fullItem,
        objectURL,
        isDecrypting: false,
      })
      
    } catch (err) {
      setLightboxItem(prev => ({ 
        ...prev, 
        isDecrypting: false, 
        error: 'Failed to decrypt file.' 
      }))
      addToast({
        variant: 'danger',
        title: 'Cannot open file',
        description: 'Decryption failed. The file may be corrupted.',
      })
    }
  }, [derivedKey, mediaItems, addToast])
  
  // ── NAVIGATE LIGHTBOX ──────────────────────────
  const navigateLightbox = useCallback(async (dir) => {
    // dir: 'prev' | 'next'
    const newIndex = dir === 'next'
      ? Math.min(lightboxIndex + 1, mediaItems.length - 1)
      : Math.max(lightboxIndex - 1, 0)
      
    if (newIndex === lightboxIndex) return
    
    setLightboxIndex(newIndex)
    await openItem(mediaItems[newIndex])
  }, [lightboxIndex, mediaItems, openItem])
  
  // ── CLOSE LIGHTBOX ─────────────────────────────
  const closeLightbox = useCallback(() => {
    // Revoke object URL to free memory
    if (activeURLRef.current) {
      revokeObjectURL(activeURLRef.current)
      activeURLRef.current = null
    }
    setLightboxItem(null)
    setLightboxIndex(0)
  }, [])
  
  // ── RENAME ─────────────────────────────────────
  const renameItem = useCallback(async (id, newTitle) => {
    const trimmed = newTitle.trim()
    if (!trimmed || !derivedKey) return false
    
    try {
      // Optimistic update
      setMediaItems(prev => prev.map(item =>
        item.id === id 
          ? { ...item, title: trimmed } 
          : item
      ))
      if (lightboxItem?.id === id) {
        setLightboxItem(prev => ({ 
          ...prev, title: trimmed 
        }))
      }
      
      // Persist to DB
      await updateItem(id, { title: trimmed }, derivedKey)
      return true
    } catch (err) {
      // Revert on failure
      await loadMedia(activeAlbum)
      addToast({
        variant: 'danger',
        title: 'Rename failed',
        description: err.message,
      })
      return false
    }
  }, [derivedKey, lightboxItem, activeAlbum, loadMedia, addToast])
  
  // ── DELETE ─────────────────────────────────────
  const deleteMediaItem = useCallback(async (id) => {
    try {
      await deleteItem(id)
      setMediaItems(prev => prev.filter(i => i.id !== id))
      if (lightboxItem?.id === id) {
        closeLightbox()
      }
      setSelectedItems(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Delete failed',
        description: err.message,
      })
    }
  }, [lightboxItem, closeLightbox, addToast])
  
  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedItems)
    for (const id of ids) {
      await deleteMediaItem(id)
    }
    setSelectedItems(new Set())
  }, [selectedItems, deleteMediaItem])
  
  // ── FAVORITE ───────────────────────────────────
  const toggleFavoriteItem = useCallback(async (id) => {
    try {
      await toggleFavorite(id)
      setMediaItems(prev => prev.map(item =>
        item.id === id 
          ? { ...item, isFavorite: !item.isFavorite }
          : item
      ))
      if (lightboxItem?.id === id) {
        setLightboxItem(prev => ({
          ...prev, isFavorite: !prev.isFavorite
        }))
      }
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to update favorite',
        description: err.message,
      })
    }
  }, [lightboxItem, addToast])
  
  // ── LOCK ───────────────────────────────────────
  const lockItem = useCallback(async (id, password) => {
    if (!password.trim() || !derivedKey) return false
    try {
      // Hash the item password with SHA-256
      const encoded = new TextEncoder().encode(password)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      await updateItem(id, { 
        isLocked: 1, 
        itemPassword: hashHex 
      }, derivedKey)
      
      setMediaItems(prev => prev.map(item =>
        item.id === id 
          ? { ...item, isLocked: 1 } 
          : item
      ))
      
      if (lightboxItem?.id === id) {
        setLightboxItem(prev => ({
          ...prev, isLocked: 1
        }))
      }
      return true
    } catch {
      return false
    }
  }, [derivedKey, lightboxItem])
  
  const unlockItem = useCallback(async (id, password) => {
    try {
      const fullItem = await getItem(id, derivedKey)
      if (!fullItem?.itemPassword) return true // not locked
      
      const encoded = new TextEncoder().encode(password)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (hashHex !== fullItem.itemPassword) {
        return false // wrong password
      }
      
      // Temporarily unlock for this session
      await openItem(fullItem)
      return true
    } catch {
      return false
    }
  }, [derivedKey, openItem])

  // ── MULTI SELECT ───────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  
  const selectAll = useCallback(() => {
    setSelectedItems(new Set(mediaItems.map(i => i.id)))
  }, [mediaItems])
  
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])
  
  // ── ALBUM OPERATIONS ───────────────────────────
  const createAlbum = useCallback(async (name) => {
    if (!name.trim()) return null
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
    if (!newName.trim()) return false
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
      if (activeAlbum === id) setActiveAlbum(null)
      await loadAlbums()
      await loadMedia(null)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to delete album',
        description: err.message,
      })
    }
  }, [activeAlbum, loadAlbums, loadMedia, addToast])
  
  const moveToAlbum = useCallback(async (itemIds, albumId) => {
    if (!derivedKey) return
    try {
      for (const id of itemIds) {
        await updateItem(id, { folderId: albumId }, derivedKey)
      }
      clearSelection()
      await loadMedia(activeAlbum)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to move items',
        description: err.message,
      })
    }
  }, [derivedKey, activeAlbum, loadMedia, clearSelection, addToast])
  
  // ── DOWNLOAD ───────────────────────────────────
  const downloadItem = useCallback(async (item) => {
    if (!derivedKey) return
    try {
      const fullItem = await getItem(item.id, derivedKey)
      const decryptedBuffer = await decryptFile(
        fullItem.data.encryptedData,
        fullItem.data.iv,
        derivedKey
      )
      const mimeType = fullItem.data.mimeType || getMimeType(fullItem.title)
      const blob = new Blob([decryptedBuffer], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fullItem.title
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Download failed',
        description: err.message,
      })
    }
  }, [derivedKey, addToast])

  return {
    // State
    mediaItems, albums, activeAlbum, isLoading,
    isUploading, uploadProgress, lightboxItem,
    lightboxIndex, selectedItems, viewMode,
    sortBy, sortOrder, filterType,
    
    // Setters
    setActiveAlbum, setViewMode, setSortBy,
    setSortOrder, setFilterType,
    
    // Operations
    loadMedia, loadAlbums, uploadFiles,
    openItem, closeLightbox, navigateLightbox,
    renameItem, deleteMediaItem, deleteSelected,
    toggleFavoriteItem, lockItem, unlockItem,
    toggleSelect, selectAll, clearSelection,
    createAlbum, renameAlbum, deleteAlbum,
    moveToAlbum, downloadItem,
  }
}
