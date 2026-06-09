import { useState, useCallback, useEffect,
  useMemo } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import {
  createItem, getAllItems, getItem,
  updateItem, deleteItem, toggleFavorite,
  createFolder, getFolders,
  updateFolder, deleteFolder,
  getFileCountsByFolder
} from '../db/vaultOperations'
import { encryptFile, decryptFile }
  from '../crypto/engine'
import {
  getExtension, getMimeFromFilename,
  getFileCategory, formatFileSize,
  isPreviewable,
} from '../utils/fileUtils'
import {
  getMediaType,
  generateImageThumbnail, generateVideoThumbnail,
  compressImage, getImageDimensions,
  getVideoDuration,
} from '../utils/mediaUtils'
import { useUiStore } from '../store/uiStore'

export function useFiles() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [fileCounts, setFileCounts] = useState({ total: 0 })
  const [activeFolderId, setActiveFolderId] =
    useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] =
    useState(false)
  const [uploadProgress, setUploadProgress] =
    useState({
      current: 0, total: 0,
      percent: 0, filename: '',
    })
  const [previewItem, setPreviewItem] =
    useState(null)
  // { item, objectURL, textContent, isLoading }
  const [selectedIds, setSelectedIds] =
    useState(new Set())
  const [searchQuery, setSearchQuery] =
    useState('')
  const [filterCategory, setFilterCategory] =
    useState('all')
  const [sortBy, setSortBy] =
    useState('updatedAt')
  const [sortOrder, setSortOrder] =
    useState('desc')
  // 'grid' | 'list'
  
  const globalViewMode = useUiStore((state) => state.viewMode);
  const localViewMode = useUiStore((state) => state.folderViews['files']);
  const setFolderView = useUiStore((state) => state.setFolderView);

  const viewMode = localViewMode || globalViewMode;
  const setViewMode = useCallback((mode) => {
    setFolderView('files', mode);
  }, [setFolderView]);

  // ── LOAD COUNTS ────────────────────────────────
  const loadFileCounts = useCallback(async () => {
    try {
      const counts = await getFileCountsByFolder()
      setFileCounts(counts)
    } catch (err) {
      console.error('loadFileCounts failed:', err)
    }
  }, [])

  // ── LOAD FILES ─────────────────────────────────
  const loadFiles = useCallback(async () => {
    if (!derivedKey) return
    setIsLoading(true)
    try {
      const filters = {
        type: ['file', 'photo', 'video'],
      }
      if (activeFolderId !== null) {
        filters.folderId = activeFolderId
      }

      const result = await getAllItems(
        derivedKey, filters
      )
      let items = result.items

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        items = items.filter(item =>
          item.title.toLowerCase().includes(q) ||
          (item.data?.description || '')
            .toLowerCase().includes(q) ||
          (item.tags || []).some(t =>
            t.toLowerCase().includes(q)
          )
        )
      }

      if (filterCategory !== 'all') {
        items = items.filter(item =>
          getFileCategory(item.title) ===
            filterCategory
        )
      }
      
      // In-memory sorting for multiple criteria
      items.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'updatedAt') {
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        } else if (sortBy === 'title') {
          cmp = a.title.localeCompare(b.title);
        } else if (sortBy === 'size') {
          const aSize = a.data?.size || 0;
          const bSize = b.data?.size || 0;
          cmp = aSize - bSize;
        } else if (sortBy === 'type') {
          cmp = getFileCategory(a.title).localeCompare(getFileCategory(b.title));
        }

        if (sortOrder === 'desc') {
          cmp = -cmp;
        }
        return cmp;
      })

      setFiles(items)
    } catch (err) {
      console.error('loadFiles failed:', err)
      addToast({
        variant: 'danger',
        title: 'Failed to load files',
        description: err.message,
      })
    } finally {
      setIsLoading(false)
      // Update counts whenever we reload files
      loadFileCounts()
    }
  }, [derivedKey, activeFolderId, searchQuery,
      filterCategory, sortBy, sortOrder, loadFileCounts])

  // ── LOAD FOLDERS ───────────────────────────────
  const loadFolders = useCallback(async () => {
    try {
      const all = await getFolders()
      // File module uses its own folders
      // Filter out default system folders
      setFolders(all.filter(f => !f.isDefault))
    } catch (err) {
      console.error('loadFolders failed:', err)
    }
  }, [])

  useEffect(() => {
    if (derivedKey) {
      loadFiles()
      loadFolders()
      loadFileCounts()
    }
  }, [derivedKey, activeFolderId, searchQuery, filterCategory, sortBy, sortOrder, loadFiles, loadFolders, loadFileCounts])

  // ── UPLOAD FILES ───────────────────────────────
  const uploadFiles = useCallback(
    async (fileList) => {
      if (!derivedKey) return
      const fileArray = Array.from(fileList)
      if (fileArray.length === 0) return

      // Validate
      const valid = []
      for (const file of fileArray) {
        if (file.size > 500 * 1024 * 1024) {
          addToast({
            variant: 'warning',
            title: 'File too large',
            description: `${file.name} 
              exceeds 500MB limit.`,
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
        const isMedia = mediaType === 'photo' || mediaType === 'video'

        setUploadProgress({
          current: i + 1,
          total: batch.length,
          percent: Math.round(
            (i / batch.length) * 100
          ),
          filename: file.name,
        })

        try {
          let processedFile = file
          let thumbnail = null
          let width = 0
          let height = 0
          let duration = 0
          
          if (isMedia) {
            processedFile = mediaType === 'photo' ? await compressImage(file) : file
            
            if (mediaType === 'photo') {
              const dims = await getImageDimensions(processedFile)
              width = dims.width
              height = dims.height
              thumbnail = await generateImageThumbnail(processedFile)
            } else {
              duration = await getVideoDuration(file)
              thumbnail = await generateVideoThumbnail(file)
            }
          }

          const buffer = await processedFile.arrayBuffer()
          const { encryptedData, iv } =
            await encryptFile(buffer, derivedKey)

          const ext = getExtension(file.name)
          const mimeType = processedFile.type ||
            getMimeFromFilename(file.name)

          await createItem({
            type: isMedia ? mediaType : 'file',
            title: file.name,
            data: {
              mimeType,
              size: file.size,
              extension: ext,
              description: '',
              encryptedData,
              iv,
              ...(isMedia && {
                compressedSize: processedFile.size,
                width,
                height,
                duration
              })
            },
            thumbnail,
            folderId: activeFolderId,
            tags: [],
            isFavorite: false,
          }, derivedKey)

          successCount++
        } catch (err) {
          console.error(
            `Upload failed: ${file.name}`, err
          )
          addToast({
            variant: 'danger',
            title: `Failed: ${file.name}`,
            description: 'Could not encrypt file.',
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

      await loadFiles()

      if (successCount > 0) {
        addToast({
          variant: 'success',
          title: 'Upload complete',
          description: `${successCount} file${
            successCount > 1 ? 's' : ''
          } encrypted and saved.`,
          duration: 3000,
        })
      }
    },
    [derivedKey, activeFolderId, loadFiles, addToast]
  )

  // ── PREVIEW FILE ───────────────────────────────
  const previewFile = useCallback(async (item) => {
    if (!derivedKey) return
    if (!isPreviewable(item.title)) {
      // Not previewable — offer download instead
      addToast({
        variant: 'info',
        title: 'Preview not available',
        description: 
          'This file type cannot be previewed. ' +
          'Use download instead.',
        duration: 4000,
      })
      return
    }

    setPreviewItem({
      item,
      objectURL: null,
      textContent: null,
      isLoading: true,
      error: null,
    })

    try {
      const full = await getItem(
        item.id, derivedKey
      )
      
      // Use set timeout to allow React to render loading state
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const buffer = await decryptFile(
        full.data.encryptedData,
        full.data.iv,
        derivedKey
      )

      const mimeType = full.data.mimeType ||
        getMimeFromFilename(full.title)

      // Text files — decode to string
      const { isTextFile, isImageFile,
        isPDFFile } = await import(
          '../utils/fileUtils'
        )

      if (isTextFile(full.title)) {
        const text = new TextDecoder().decode(buffer)
        setPreviewItem(prev => prev ? {
          ...prev,
          textContent: text,
          isLoading: false,
        } : null)
      } else {
        // Binary: image or PDF
        const blob = new Blob([buffer],
          { type: mimeType })
        const url = URL.createObjectURL(blob)
        setPreviewItem(prev => prev ? {
          ...prev,
          objectURL: url,
          buffer: new Uint8Array(buffer),
          isLoading: false,
        } : null)
      }
    } catch (err) {
      setPreviewItem(prev => prev ? {
        ...prev,
        isLoading: false,
        error: 'Failed to decrypt file.',
      } : null)
    }
  }, [derivedKey, addToast])

  // ── NAVIGATE PREVIEW ───────────────────────────
  const navigatePreview = useCallback(async (direction, isMediaMode = true) => {
    if (!previewItem || files.length === 0) return
    
    let validFiles = files;
    if (isMediaMode) {
      validFiles = files.filter(f => {
        const mediaType = getMediaType({
          name: f.title,
          type: f.data?.mimeType || f.type
        });
        return mediaType === 'photo' || mediaType === 'video';
      });
    } else {
      validFiles = files.filter(f => isPreviewable(f.title));
    }
    
    if (validFiles.length === 0) return

    const currentIndex = validFiles.findIndex(f => f.id === previewItem.item.id)
    let newIdx = currentIndex + (direction === 'next' ? 1 : -1)
    newIdx = Math.max(0, Math.min(newIdx, validFiles.length - 1))
    
    if (newIdx === currentIndex || newIdx < 0) return
    
    // Cleanup previous objectURL
    if (previewItem.objectURL) {
      URL.revokeObjectURL(previewItem.objectURL)
    }
    
    await previewFile(validFiles[newIdx])
  }, [previewItem, files, previewFile])

  // ── UPDATE ITEM TAGS ───────────────────────────
  const updateItemTags = useCallback(async (id, tags) => {
    if (!derivedKey) return
    try {
      await updateItem(id, { tags }, derivedKey)
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, tags } : f
      ))
      if (previewItem?.item?.id === id) {
        setPreviewItem(prev => prev ? {
          ...prev,
          item: { ...prev.item, tags }
        } : null)
      }
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to save tags',
        description: err.message,
      })
    }
  }, [derivedKey, previewItem, addToast])

  // ── CLOSE PREVIEW ──────────────────────────────
  const closePreview = useCallback(() => {
    if (previewItem?.objectURL) {
      URL.revokeObjectURL(previewItem.objectURL)
    }
    setPreviewItem(null)
  }, [previewItem])

  // ── DOWNLOAD FILE ──────────────────────────────
  const downloadFile = useCallback(
    async (item) => {
      if (!derivedKey) return
      try {
        const full = await getItem(
          item.id, derivedKey
        )
        const buffer = await decryptFile(
          full.data.encryptedData,
          full.data.iv,
          derivedKey
        )
        const mimeType = full.data.mimeType ||
          getMimeFromFilename(full.title)
        const blob = new Blob([buffer],
          { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = full.title
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() =>
          URL.revokeObjectURL(url), 2000
        )
        addToast({
          variant: 'success',
          title: 'Download started',
          description: full.title,
          duration: 2000,
        })
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Download failed',
          description: err.message,
        })
      }
    },
    [derivedKey, addToast]
  )

  // ── RENAME FILE ────────────────────────────────
  const renameFile = useCallback(
    async (id, newName) => {
      const trimmed = newName?.trim()
      if (!trimmed || !derivedKey) return false
      try {
        setFiles(prev => prev.map(f =>
          f.id === id
            ? { ...f, title: trimmed }
            : f
        ))
        await updateItem(
          id, { title: trimmed }, derivedKey
        )
        return true
      } catch (err) {
        await loadFiles()
        addToast({
          variant: 'danger',
          title: 'Rename failed',
          description: err.message,
        })
        return false
      }
    },
    [derivedKey, loadFiles, addToast]
  )

  // ── UPDATE DESCRIPTION ─────────────────────────
  const updateDescription = useCallback(
    async (id, description) => {
      if (!derivedKey) return
      try {
        const item = files.find(f => f.id === id)
        if (!item) return
        await updateItem(id, {
          data: {
            ...item.data,
            description,
          },
        }, derivedKey)
        setFiles(prev => prev.map(f =>
          f.id === id
            ? {
                ...f,
                data: { ...f.data, description },
              }
            : f
        ))
      } catch (err) {
        console.error('updateDescription:', err)
      }
    },
    [derivedKey, files]
  )

  // ── DELETE ─────────────────────────────────────
  const deleteFile = useCallback(async (id) => {
    try {
      await deleteItem(id)
      setFiles(prev => prev.filter(f => f.id !== id))
      if (previewItem?.item?.id === id) {
        closePreview()
      }
      setSelectedIds(prev => {
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
  }, [previewItem, closePreview, addToast])

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      await deleteItem(id)
    }
    setFiles(prev =>
      prev.filter(f => !selectedIds.has(f.id))
    )
    setSelectedIds(new Set())
    addToast({
      variant: 'success',
      title: `${ids.length} file${
        ids.length > 1 ? 's' : ''
      } deleted`,
      duration: 2500,
    })
  }, [selectedIds, addToast])

  // ── FAVORITE ───────────────────────────────────
  const toggleFavoriteFile = useCallback(
    async (id) => {
      try {
        await toggleFavorite(id)
        setFiles(prev => prev.map(f =>
          f.id === id
            ? { ...f, isFavorite: !f.isFavorite }
            : f
        ))
      } catch (err) {
        console.error('toggleFavorite:', err)
      }
    },
    []
  )

  // ── MOVE TO FOLDER ─────────────────────────────
  const moveToFolder = useCallback(
    async (itemIds, folderId) => {
      if (!derivedKey) return
      try {
        for (const id of itemIds) {
          await updateItem(
            id, { folderId }, derivedKey
          )
        }
        setSelectedIds(new Set())
        await loadFiles()
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Move failed',
          description: err.message,
        })
      }
    },
    [derivedKey, loadFiles, addToast]
  )

  // ── FOLDER OPERATIONS ──────────────────────────
  const createNewFolder = useCallback(
    async (name, parentId = null) => {
      if (!name?.trim()) return null
      try {
        const id = await createFolder(
          name.trim(), parentId,
          '#888888', false
        )
        await loadFolders()
        return id
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to create folder',
          description: err.message,
        })
        return null
      }
    },
    [loadFolders, addToast]
  )

  const renameFolderFunc = useCallback(
    async (id, newName) => {
      if (!newName?.trim()) return false
      try {
        await updateFolder(
          id, { name: newName.trim() }
        )
        await loadFolders()
        return true
      } catch { return false }
    },
    [loadFolders]
  )

  const deleteFolderItem = useCallback(
    async (id) => {
      try {
        await deleteFolder(id)
        if (activeFolderId === id) {
          setActiveFolderId(null)
        }
        await loadFolders()
        await loadFiles()
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to delete folder',
          description: err.message,
        })
      }
    },
    [activeFolderId, loadFolders, loadFiles, addToast]
  )

  // ── SELECTION ──────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(files.map(f => f.id)))
  }, [files])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // ── STATS ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = files.length
    const totalSize = files.reduce(
      (s, f) => s + (f.data?.size || 0), 0
    )
    const byCategory = {}
    files.forEach(f => {
      const cat = getFileCategory(f.title)
      byCategory[cat] = (byCategory[cat] || 0) + 1
    })
    return {
      total,
      totalSize,
      formattedSize: formatFileSize(totalSize),
      byCategory,
    }
  }, [files])

  const downloadSelectedAsZip = useCallback(async () => {
    if (!derivedKey || selectedIds.size === 0) return
    setIsLoading(true);
    addToast({
      variant: 'info',
      title: 'Zipping files...',
      description: 'Please wait while files are being decrypted and zipped.',
    })

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const id of selectedIds) {
        const full = await getItem(id, derivedKey);
        if (!full?.data) continue;

        const buffer = await decryptFile(
          full.data.encryptedData,
          full.data.iv,
          derivedKey
        );
        
        let filename = full.title;
        // ensure unique name or basic name
        zip.file(filename, buffer);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vault_Files_${new Date().getTime()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        variant: 'success',
        title: 'Download complete',
        description: 'Zip file has been downloaded.',
      })
      clearSelection()
    } catch (err) {
      console.error(err)
      addToast({
        variant: 'danger',
        title: 'Download failed',
        description: err.message,
      })
    } finally {
      setIsLoading(false);
    }
  }, [derivedKey, selectedIds, addToast, clearSelection]);

  return {
    files, folders, activeFolderId,
    isLoading, isUploading, uploadProgress,
    previewItem, selectedIds, fileCounts,
    searchQuery, filterCategory,
    sortBy, sortOrder, viewMode, stats,

    setActiveFolderId, setSearchQuery,
    setFilterCategory, setSortBy,
    setSortOrder, setViewMode,

    loadFiles, loadFolders,
    uploadFiles, previewFile, closePreview, navigatePreview, updateItemTags,
    downloadFile, renameFile,
    updateDescription, deleteFile,
    deleteSelected, downloadSelectedAsZip, toggleFavoriteFile,
    moveToFolder,
    createNewFolder, renameFolder: renameFolderFunc,
    deleteFolderItem,
    toggleSelect, selectAll, clearSelection,
  }
}
