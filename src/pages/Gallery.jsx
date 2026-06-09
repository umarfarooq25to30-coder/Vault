// Main Gallery page — lists media categorized in key albums with dynamic actions

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useGallery } from '../hooks/useGallery'
import GalleryGrid from '../components/gallery/GalleryGrid'
import GalleryToolbar from '../components/gallery/GalleryToolbar'
import Lightbox from '../components/gallery/Lightbox'
import {
  FolderOpen, Plus, Pencil, Trash2, Images,
  Expand, CheckSquare, Tag, Info, Download, Star, X, Check,
  Image, Play, Layers, Grid
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { getMimeType } from '../utils/mediaUtils'

export default function Gallery() {
  const gallery = useGallery()
  const fileInputRef = useRef(null)
  
  const [isDragOver, setIsDragOver] = useState(false)
  const [newAlbumMode, setNewAlbumMode] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [albumMenu, setAlbumMenu] = useState(null)
  // { id, name, x, y }
  const [editingAlbumId, setEditingAlbumId] = useState(null)

  // Context menu features modals/overlays in Gallery
  const [renameItem, setRenameItem] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagsItem, setTagsItem] = useState(null)
  const [tagsInput, setTagsInput] = useState('')
  const [currentTags, setCurrentTags] = useState([])
  const [detailsItem, setDetailsItem] = useState(null)

  const [itemMenu, setItemMenu] = useState(null) // { item, x, y }

  const openItemMenu = useCallback((e, item) => {
    e.preventDefault()
    
    // Dynamic height calculation & boundary positioning
    // 10 options, each about 36px ~ 360px menu height.
    const MENU_W = 200
    const MENU_H = 360
    const PAD = 8
    
    let x = e.clientX
    let y = e.clientY
    
    if (y + MENU_H > window.innerHeight - PAD) {
      y = window.innerHeight - MENU_H - PAD
    }
    if (x + MENU_W > window.innerWidth - PAD) {
      x = window.innerWidth - MENU_W - PAD
    }
    
    y = Math.max(PAD, y)
    x = Math.max(PAD, x)
    
    setItemMenu({ item, x, y })
  }, [])

  const closeItemMenu = useCallback(() => {
    setItemMenu(null)
  }, [])

  // Keep renameValue in sync
  useEffect(() => {
    if (renameItem) {
      setRenameValue(renameItem.title)
    }
  }, [renameItem])

  // Keep tags in sync
  useEffect(() => {
    if (tagsItem) {
      setCurrentTags(tagsItem.tags || [])
      setTagsInput('')
    }
  }, [tagsItem])

  // Global drag-over for file drop
  useEffect(() => {
    const onDragOver = (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault()
        setIsDragOver(true)
      }
    }
    const onDragLeave = (e) => {
      if (!e.relatedTarget) setIsDragOver(false)
    }
    const onDrop = (e) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        gallery.uploadFiles(files)
      }
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [gallery])

  // Handle click outside for itemMenu
  useEffect(() => {
    if (!itemMenu) return

    const handleOutsideClick = (e) => {
      // If we are right-clicking on another gallery item, let its own handler handle opening/re-opening
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('[data-gallery-item="true"]')) {
        return
      }

      const menuEl = document.getElementById('gallery-item-context-menu')
      if (menuEl && !menuEl.contains(e.target)) {
        if (e.type === 'contextmenu') {
          // Instantly close old context menu allowing the new right click to trigger cleanly without delay
          closeItemMenu()
          return
        }
        closeItemMenu()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('contextmenu', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('contextmenu', handleOutsideClick)
    }
  }, [itemMenu, closeItemMenu])

  // Handle click outside for albumMenu
  useEffect(() => {
    if (!albumMenu) return

    const handleOutsideClick = (e) => {
      const menuEl = document.getElementById('gallery-album-context-menu')
      if (menuEl && !menuEl.contains(e.target)) {
        if (e.type === 'contextmenu' && e.target.closest('[data-album-item="true"]')) {
          return
        }
        setAlbumMenu(null)
      }
    }

    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('contextmenu', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('contextmenu', handleOutsideClick)
    }
  }, [albumMenu])

  const handleFileInput = (e) => {
    if (e.target.files?.length > 0) {
      gallery.uploadFiles(e.target.files)
    }
    e.target.value = ''
  }

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      setNewAlbumMode(false)
      return
    }
    await gallery.createAlbum(newAlbumName.trim())
    setNewAlbumName('')
    setNewAlbumMode(false)
  }

  const openAlbumMenu = (e, album) => {
    e.preventDefault()
    e.stopPropagation()
    const MENU_H = 130
    const MENU_W = 160
    const PAD = 8
    let x = e.clientX
    let y = e.clientY
    if (y + MENU_H > window.innerHeight - PAD) {
      y -= MENU_H
    }
    if (x + MENU_W > window.innerWidth - PAD) {
      x -= MENU_W
    }
    setAlbumMenu({ id: album.id, name: album.name, x, y })
  }

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden rounded-xl bg-[#FAFAFA] dark:bg-[#141414] select-none font-sans relative">
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Album Sidebar */}
      <div className="w-56 flex-shrink-0 bg-[#F5F5F5] dark:bg-[#1C1C1C] flex flex-col select-none justify-between h-full overflow-hidden">
        
        {/* Top of Sidebar — Albums and List */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2 custom-scrollbar space-y-4">
          
          {/* Section: Library */}
          <div>
            <div className="mb-2 px-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B9B] dark:text-[#555555]">
                Library
              </span>
            </div>

            <div className="space-y-0.5">
              {/* All Media */}
              <div
                onClick={() => gallery.setActiveAlbumId(null)}
                className={`flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  gallery.activeAlbumId === null
                    ? 'bg-[#EAEAEA] dark:bg-[#282828] text-[#1A1A1A] dark:text-[#F0F0F0] font-medium'
                    : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                }`}
              >
                <Images className="w-4 h-4 flex-shrink-0 text-[#888888] scale-105" />
                <span className="flex-1 text-[13px] truncate">
                  All Media
                </span>
                <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555] font-semibold tabular-nums">
                  {gallery.folderCounts?.all || 0}
                </span>
              </div>

              {/* Favorites */}
              <div
                onClick={() => gallery.setActiveAlbumId('favorites')}
                className={`flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  gallery.activeAlbumId === 'favorites'
                    ? 'bg-[#EAEAEA] dark:bg-[#282828] text-amber-500 dark:text-amber-400 font-medium'
                    : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                }`}
              >
                <Star className={`w-4 h-4 flex-shrink-0 scale-105 ${
                  gallery.activeAlbumId === 'favorites' ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400' : 'text-[#888888]'
                }`} />
                <span className="flex-1 text-[13px] truncate">
                  Favorites
                </span>
                <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555] font-semibold tabular-nums">
                  {gallery.folderCounts?.favorites || 0}
                </span>
              </div>

              {/* Photos */}
              <div
                onClick={() => gallery.setActiveAlbumId('photos')}
                className={`flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  gallery.activeAlbumId === 'photos'
                    ? 'bg-[#EAEAEA] dark:bg-[#282828] text-[#1A1A1A] dark:text-[#F0F0F0] font-medium'
                    : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                }`}
              >
                <Image className="w-4 h-4 flex-shrink-0 text-[#888888]" />
                <span className="flex-1 text-[13px] truncate">
                  Photos
                </span>
                <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555] font-semibold tabular-nums">
                  {gallery.folderCounts?.photos || 0}
                </span>
              </div>

              {/* Videos */}
              <div
                onClick={() => gallery.setActiveAlbumId('videos')}
                className={`flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  gallery.activeAlbumId === 'videos'
                    ? 'bg-[#EAEAEA] dark:bg-[#282828] text-[#1A1A1A] dark:text-[#F0F0F0] font-medium'
                    : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                }`}
              >
                <Play className="w-4 h-4 flex-shrink-0 text-[#888888]" />
                <span className="flex-1 text-[13px] truncate">
                  Videos
                </span>
                <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555] font-semibold tabular-nums">
                  {gallery.folderCounts?.videos || 0}
                </span>
              </div>

              {/* GIFs */}
              <div
                onClick={() => gallery.setActiveAlbumId('gifs')}
                className={`flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  gallery.activeAlbumId === 'gifs'
                    ? 'bg-[#EAEAEA] dark:bg-[#282828] text-[#1A1A1A] dark:text-[#F0F0F0] font-medium'
                    : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                }`}
              >
                <Layers className="w-4 h-4 flex-shrink-0 text-[#888888]" />
                <span className="flex-1 text-[13px] truncate">
                  GIFs
                </span>
                <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555] font-semibold tabular-nums">
                  {gallery.folderCounts?.gifs || 0}
                </span>
              </div>

              {/* Collages */}
              <div
                onClick={() => gallery.setActiveAlbumId('collages')}
                className={`flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  gallery.activeAlbumId === 'collages'
                    ? 'bg-[#EAEAEA] dark:bg-[#282828] text-[#1A1A1A] dark:text-[#F0F0F0] font-medium'
                    : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                }`}
              >
                <Grid className="w-4 h-4 flex-shrink-0 text-[#888888]" />
                <span className="flex-1 text-[13px] truncate">
                  Collages
                </span>
                <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555] font-semibold tabular-nums">
                  {gallery.folderCounts?.collages || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Custom Albums */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B9B] dark:text-[#555555]">
                My Albums
              </span>
              <button
                type="button"
                onClick={() => setNewAlbumMode(true)}
                className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 dark:text-[#555555] hover:text-zinc-800 dark:hover:text-[#C0C0C0] hover:bg-zinc-200 dark:hover:bg-[#252525] cursor-pointer transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* New custom album input */}
            {newAlbumMode && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 mb-1.5 bg-zinc-200 dark:bg-[#222222] rounded-lg">
                <FolderOpen className="w-4 h-4 text-[#888888] flex-shrink-0" />
                <input
                  autoFocus
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  placeholder="Album name..."
                  className="flex-1 bg-transparent outline-none text-[13px] text-zinc-800 dark:text-[#F0F0F0] placeholder-zinc-500 dark:placeholder-zinc-600 min-w-0"
                  style={{ border: 'none', outline: 'none' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleCreateAlbum()
                    }
                    if (e.key === 'Escape') {
                      setNewAlbumMode(false)
                      setNewAlbumName('')
                    }
                  }}
                  onBlur={handleCreateAlbum}
                />
              </div>
            )}

            {/* Custom Album list */}
            <div className="space-y-0.5">
              {gallery.albums.map(album => (
                <div
                  key={album.id}
                  onClick={() => gallery.setActiveAlbumId(album.id)}
                  onContextMenu={e => openAlbumMenu(e, album)}
                  data-album-item="true"
                  className={`group flex items-center gap-2 px-2.5 h-8.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    gallery.activeAlbumId === album.id
                      ? 'bg-[#EAEAEA] dark:bg-[#282828] text-[#1A1A1A] dark:text-[#F0F0F0] font-medium'
                      : 'text-[#6B6B6B] dark:text-[#C0C0C0] hover:bg-[#EEEEEE] dark:hover:bg-[#222222]'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0 text-[#888888]" />
                  {editingAlbumId === album.id ? (
                    <input
                      autoFocus
                      defaultValue={album.name}
                      className="flex-1 bg-transparent outline-none text-[13px] text-zinc-800 dark:text-[#F0F0F0] min-w-0"
                      style={{ border: 'none', outline: 'none' }}
                      onBlur={async e => {
                        await gallery.renameAlbum(album.id, e.target.value)
                        setEditingAlbumId(null)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                        if (e.key === 'Escape') {
                          setEditingAlbumId(null)
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 text-[13px] truncate min-w-0">
                      {album.name}
                    </span>
                  )}
                </div>
              ))}
              {gallery.albums.length === 0 && !newAlbumMode && (
                <p className="px-2.5 text-[11px] text-[#9B9B9B] dark:text-[#555555] italic">
                  No custom albums
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Storage section at bottom of sidebar — clean visual indicators and progress bar */}
        <div className="mt-auto px-3 py-4 select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#9B9B9B] dark:text-[#555555]">
              Storage
            </span>
            <span className="text-[11px] text-[#9B9B9B] dark:text-[#555555]">
              {(Math.round((gallery.galleryStats.totalSize / (5 * 1024 * 1024 * 1024)) * 100 * 10) / 10).toFixed(1)}% Used
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-[#E0E0E0] dark:bg-[#252525] mb-2">
            <div
              className="h-1 rounded-full bg-[#888888] transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.max(0, (gallery.galleryStats.totalSize / (5 * 1024 * 1024 * 1024)) * 100))}%` 
              }}
            />
          </div>
          
          <p className="text-[15px] font-semibold text-zinc-700 dark:text-[#C0C0C0]">
            {gallery.galleryStats.formattedSize}
          </p>
          <p className="text-[11px] text-[#9B9B9B] dark:text-[#555555] mt-0.5">
            of 5.0 GB
          </p>
          <p className="text-[11px] text-[#9B9B9B] dark:text-[#555555] mt-1">
            {gallery.folderCounts?.photos || 0} photo{ (gallery.folderCounts?.photos || 0) !== 1 ? 's' : '' } · {gallery.folderCounts?.videos || 0} video{ (gallery.folderCounts?.videos || 0) !== 1 ? 's' : '' }
            {gallery.folderCounts?.gifs > 0 && ` · ${gallery.folderCounts?.gifs} GIF${gallery.folderCounts?.gifs !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#FAFAFA] dark:bg-[#141414]">
        <GalleryToolbar
          gallery={gallery}
          onUploadClick={() => fileInputRef.current?.click()}
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          <GalleryGrid gallery={gallery} onContextMenu={openItemMenu} />
        </div>
      </div>

      {/* Lightbox fullscreen */}
      {gallery.lightbox && (
        <Lightbox
          lightbox={gallery.lightbox}
          items={gallery.items}
          lightboxIndex={gallery.lightboxIndex}
          onClose={gallery.closeLightbox}
          onNavigate={gallery.navigateLightbox}
          onFavorite={gallery.toggleFavoriteItem}
          onDelete={gallery.deleteGalleryItem}
          onRename={gallery.renameItem}
          onDownload={gallery.downloadItem}
          onUpdateTags={gallery.updateItemTags}
        />
      )}

      {/* Global drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-[5000] bg-black/80 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="w-20 h-20 rounded-2xl bg-[#252525] flex items-center justify-center">
            <Images className="w-10 h-10 text-[#F0F0F0]" />
          </div>
          <p className="text-[18px] font-semibold text-white">
            Drop to add to Gallery
          </p>
          <p className="text-[14px] text-white/60">
            Photos and videos supported
          </p>
        </div>
      )}

      {/* Album context menu */}
      {albumMenu && createPortal(
        <>
          <div
            id="gallery-album-context-menu"
            style={{
              position: 'fixed',
              left: albumMenu.x,
              top: albumMenu.y,
              zIndex: 9999,
              minWidth: '160px',
            }}
            className="bg-[#242424] rounded-xl py-1.5 overflow-hidden animate-fade-in"
          >
            <button
              type="button"
              onClick={() => {
                setEditingAlbumId(albumMenu.id)
                setAlbumMenu(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
            <div className="mx-3 h-px bg-[#333333] my-1" />
            <button
              type="button"
              onClick={async () => {
                const targetId = albumMenu.id
                setAlbumMenu(null)
                await gallery.deleteAlbum(targetId)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete album
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Item context menu */}
      {itemMenu && createPortal(
        <>
          <div
            id="gallery-item-context-menu"
            style={{
              position: 'fixed',
              left: itemMenu.x,
              top: itemMenu.y,
              zIndex: 9999,
              minWidth: '200px',
              maxWidth: '220px',
              maxHeight: 'min(360px, calc(100vh - 24px))',
            }}
            className="bg-[#242424] rounded-xl py-1.5 overflow-y-auto custom-scrollbar animate-fade-in"
          >
            <div className="px-3 py-1">
              <p className="text-[12px] font-semibold text-[#F0F0F0] truncate select-text">
                {itemMenu.item.title}
              </p>
              <p className="text-[11px] text-[#555555] mt-0.5 select-text">
                {(itemMenu.item.title || '').split('.').pop().toUpperCase()} File
              </p>
            </div>
            
            <div className="mx-3 h-px bg-[#333333] mb-1" />

            <button
              type="button"
              onClick={() => {
                gallery.openLightbox(itemMenu.item)
                closeItemMenu()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Expand className="w-4 h-4 text-[#888888]" />
              Open
            </button>

            <button
              type="button"
              onClick={() => {
                gallery.toggleSelect(itemMenu.item.id)
                closeItemMenu()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <CheckSquare className="w-4 h-4 text-[#888888]" />
              Select
            </button>

            <button
              type="button"
              onClick={() => {
                setRenameItem(itemMenu.item)
                closeItemMenu()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Pencil className="w-4 h-4 text-[#888888]" />
              Rename
            </button>

            <button
              type="button"
              onClick={async () => {
                const targetId = itemMenu.item.id
                const activeId = gallery.activeAlbumId
                closeItemMenu()
                await gallery.toggleFavoriteItem(targetId)
                // Reload items so the favorite icon updates on card instantly
                await gallery.loadItems(activeId)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Star className="w-4 h-4 text-[#888888]" />
              {itemMenu.item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
            </button>

            <button
              type="button"
              onClick={() => {
                setTagsItem(itemMenu.item)
                closeItemMenu()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Tag className="w-4 h-4 text-[#888888]" />
              Tags
            </button>

            <button
              type="button"
              onClick={() => {
                setDetailsItem(itemMenu.item)
                closeItemMenu()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Info className="w-4 h-4 text-[#888888]" />
              Details
            </button>

            <button
              type="button"
              onClick={() => {
                gallery.downloadItem(itemMenu.item)
                closeItemMenu()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors"
            >
              <Download className="w-4 h-4 text-[#888888]" />
              Download
            </button>

            <div className="mx-3 h-px bg-[#333333] my-1" />

            <button
              type="button"
              onClick={async () => {
                const targetId = itemMenu.item.id
                closeItemMenu()
                await gallery.deleteGalleryItem(targetId)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Inline item Rename Modal */}
      {renameItem && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 9997 }}
            onClick={() => setRenameItem(null)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#242424] rounded-2xl p-5 w-80 animate-slide-up select-none"
            style={{ zIndex: 9998 }}
          >
            <p className="text-[14px] font-semibold text-[#F0F0F0] mb-3">
              Rename file
            </p>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              className="w-full bg-[#1A1A1A] text-[#F0F0F0] text-[14px] rounded-lg px-3 py-2.5 outline-none placeholder:text-[#444444]"
              placeholder="Enter new name..."
              style={{ border: 'none', outline: 'none' }}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  const saved = await gallery.renameItem(renameItem.id, renameValue)
                  if (saved) setRenameItem(null)
                }
                if (e.key === 'Escape') {
                  setRenameItem(null)
                }
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={async () => {
                  const saved = await gallery.renameItem(renameItem.id, renameValue)
                  if (saved) setRenameItem(null)
                }}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD] transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setRenameItem(null)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Tags popup editor */}
      {tagsItem && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 9997 }}
            onClick={() => setTagsItem(null)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#242424] rounded-2xl p-5 w-80 animate-slide-up select-none"
            style={{ zIndex: 9998 }}
          >
            <p className="text-[14px] font-semibold text-[#F0F0F0] mb-1">
              Add tags
            </p>
            <p className="text-[12px] text-[#555555] mb-3">
              Tags help you search and group files easily
            </p>

            {/* Current tag pill tags */}
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3.5 max-h-24 overflow-y-auto">
                {currentTags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#333333] text-[#C0C0C0]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setCurrentTags(prev => prev.filter(t => t !== tag))}
                      className="text-[#666666] hover:text-[#F0F0F0] cursor-pointer px-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input tag entry row */}
            <div className="flex gap-2">
              <input
                autoFocus
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="New tag..."
                className="flex-1 bg-[#1A1A1A] text-[#F0F0F0] text-[13px] rounded-lg px-3 py-2 outline-none placeholder:text-[#444444]"
                style={{ border: 'none', outline: 'none' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagsInput.trim()) {
                    e.preventDefault()
                    const tag = tagsInput.trim().toLowerCase()
                    if (!currentTags.includes(tag)) {
                      setCurrentTags(prev => [...prev, tag])
                    }
                    setTagsInput('')
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const tag = tagsInput.trim().toLowerCase()
                  if (tag && !currentTags.includes(tag)) {
                    setCurrentTags(prev => [...prev, tag])
                  }
                  setTagsInput('')
                }}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-[#333333] text-[#C0C0C0] hover:bg-[#3A3A3A] transition-colors"
              >
                Add
              </button>
            </div>

            {/* Quick suggested helpers */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['nature', 'travel', 'food', 'family', 'selfie', 'logs']
                .filter(t => !currentTags.includes(t))
                .slice(0, 5)
                .map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCurrentTags(prev => [...prev, tag])}
                    className="px-2 py-1 rounded text-[11px] cursor-pointer bg-[#1E1E1E] text-[#666666] hover:text-[#C0C0C0] transition-colors"
                  >
                    + {tag}
                  </button>
                ))
              }
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={async () => {
                  await gallery.updateItemTags(tagsItem.id, currentTags)
                  setTagsItem(null)
                }}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD] transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setTagsItem(null)}
                className="flex-1 py-2 rounded-lg text-[13px] font-medium cursor-pointer bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Details inspector card popup */}
      {detailsItem && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 9997 }}
            onClick={() => setDetailsItem(null)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#242424] rounded-2xl p-5 w-80 animate-slide-up max-h-[80vh] overflow-y-auto"
            style={{ zIndex: 9998 }}
          >
            {/* Visual thumbnail inside details overlay */}
            {detailsItem.thumbnail && (
              <img
                src={`data:${getMimeType(detailsItem.title)};base64,${detailsItem.thumbnail}`}
                alt=""
                className="w-full h-36 object-cover rounded-lg mb-4 pointer-events-none"
              />
            )}

            <p className="text-[15px] font-semibold text-[#F0F0F0] mb-3 truncate select-text">
              {detailsItem.title}
            </p>

            {/* Spec lines table */}
            <div className="space-y-2 select-text">
              {[
                {
                  label: 'Format type',
                  value: detailsItem.type === 'video' ? 'Video File' : 'Photo Image',
                },
                {
                  label: 'File extension',
                  value: (detailsItem.title || '').split('.').pop().toUpperCase(),
                },
                detailsItem.tags && detailsItem.tags.length > 0 && {
                  label: 'Tag list',
                  value: detailsItem.tags.join(', '),
                },
                {
                  label: 'Registered date',
                  value: new Date(detailsItem.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                {
                  label: 'Encryption key',
                  value: 'AES-256-GCM',
                },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1 text-[12px]">
                  <span className="text-[#555555] font-medium">{label}</span>
                  <span className="text-[#C0C0C0] text-right font-medium max-w-40 truncate">{value}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDetailsItem(null)}
              className="w-full mt-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-all"
            >
              Close
            </button>
          </div>
        </>,
        document.body
      )}

    </div>
  )
}
