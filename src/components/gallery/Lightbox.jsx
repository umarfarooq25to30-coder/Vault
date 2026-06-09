import React, { useEffect, useState, useRef, useCallback } from 'react'
import { 
  X, ChevronLeft, ChevronRight, Star,
  Download, Trash2, Loader2, AlertCircle,
  Pencil, Check, Tag, Info
} from 'lucide-react'
import { formatFileSize, getMimeType } from '../../utils/mediaUtils'
import VideoPlayer from './VideoPlayer'

export default function Lightbox({
  lightbox, items, lightboxIndex,
  onClose, onNavigate, onFavorite,
  onDelete, onRename, onDownload,
  onUpdateTags,
}) {
  const { item, objectURL, isDecrypting, error } = lightbox

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(item?.title || '')
  const [zoom, setZoom] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activePanel, setActivePanel] = useState(null) // 'tags' or 'info' or null
  const [newTagInput, setNewTagInput] = useState('')
  const controlsTimer = useRef(null)
  const touchStartX = useRef(null)

  // Update name when item changes
  useEffect(() => {
    setNameValue(item?.title || '')
    setZoom(1)
    setIsEditingName(false)
    setConfirmDelete(false)
  }, [item?.id])

  // Keyboard events
  useEffect(() => {
    const handler = (e) => {
      if (isEditingName) return
      if (e.key === 'Escape') {
        if (confirmDelete) setConfirmDelete(false)
        else onClose()
      }
      if (e.key === 'ArrowLeft') onNavigate('prev')
      if (e.key === 'ArrowRight') onNavigate('next')
      if (e.key === 'f' || e.key === 'F') {
        onFavorite(item?.id)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isEditingName, confirmDelete, item?.id, onClose, onNavigate, onFavorite])

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    if (lightbox?.item) {
      controlsTimer.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [lightbox])

  useEffect(() => {
    resetControlsTimer()
    return () => clearTimeout(controlsTimer.current)
  }, [resetControlsTimer])

  const isVideo = item?.data?.mimeType?.startsWith('video/') || item?.type === 'video'

  const handleSaveRename = async () => {
    if (nameValue.trim() && nameValue.trim() !== item.title) {
      await onRename(item.id, nameValue.trim())
    }
    setIsEditingName(false)
  }

  const handleRemoveTag = async (tagName) => {
    if (!onUpdateTags) return
    const freshTags = (item?.tags || []).filter(t => t !== tagName)
    await onUpdateTags(item.id, freshTags)
  }

  const handleAddTagSubmit = async (e) => {
    e.preventDefault()
    if (!onUpdateTags) return
    const name = newTagInput.trim()
    if (!name) return
    const currentList = item?.tags || []
    if (currentList.includes(name)) {
      setNewTagInput('')
      return
    }
    const freshTags = [...currentList, name]
    await onUpdateTags(item.id, freshTags)
    setNewTagInput('')
  }

  // Touch swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      onNavigate(diff > 0 ? 'next' : 'prev')
    }
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/95 flex flex-col animate-fade-in"
      onMouseMove={resetControlsTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className={`flex items-center gap-3 px-4 py-3 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Editable filename */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {isEditingName ? (
            <>
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                className="bg-white/10 text-white text-[14px] font-medium rounded-lg px-3 py-1.5 outline-none flex-1 min-w-0 max-w-xs focus:outline-none focus:ring-0"
                style={{ border: 'none', outline: 'none' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSaveRename()
                  }
                  if (e.key === 'Escape') {
                    setNameValue(item.title)
                    setIsEditingName(false)
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="text-green-400 cursor-pointer p-1"
              >
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-[14px] font-medium text-white/80 hover:text-white cursor-pointer truncate max-w-xs text-left"
            >
              {item?.title}
            </button>
          )}
        </div>

        {/* Position indicator */}
        {items.length > 1 && (
          <span className="text-[13px] text-white/50 flex-shrink-0 select-none">
            {lightboxIndex + 1} / {items.length}
          </span>
        )}
      </div>

      {/* Media area */}
      <div className="flex-1 relative flex flex-row items-stretch justify-center overflow-hidden min-h-0 w-full">
        
        {/* Left/Center Area: Media Display */}
        <div className="flex-1 h-full relative flex items-center justify-center overflow-hidden">
          {/* Loading state */}
          {isDecrypting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/50">
              {item?.thumbnail && (
                <img
                  src={`data:${getMimeType(item.title)};base64,${item.thumbnail}`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ 
                    filter: 'blur(20px)',
                    transform: 'scale(1.1)'
                  }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-2 bg-[#1A1A1A]/80 p-6 rounded-2xl">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="text-[13px] text-white/60 select-none">
                  Decrypting...
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-3 bg-[#1A1A1A]/90 p-6 rounded-2xl max-w-sm text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-[15px] text-white/70 select-text">
                {error}
              </p>
            </div>
          )}

          {/* Image */}
          {objectURL && !isVideo && (
            <img
              src={objectURL}
              alt={item?.title}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${zoom})`,
                transition: zoom === 1 ? 'transform 200ms ease' : 'none',
                cursor: zoom > 1 ? 'move' : 'default',
              }}
              onDoubleClick={() => setZoom(z => z === 1 ? 2.5 : 1)}
              draggable={false}
            />
          )}

          {/* Video */}
          {objectURL && isVideo && (
            <VideoPlayer
              src={objectURL}
              thumbnail={item?.thumbnail}
            />
          )}

          {/* Navigation arrows */}
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('prev')}
                disabled={lightboxIndex === 0}
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 bg-white/10 hover:bg-white/20 text-white ${
                  lightboxIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'opacity-100'
                } ${showControls ? 'opacity-100' : 'opacity-0'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('next')}
                disabled={lightboxIndex === items.length - 1}
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 bg-white/10 hover:bg-white/20 text-white ${
                  lightboxIndex === items.length - 1
                    ? 'opacity-30 cursor-not-allowed'
                    : 'opacity-100'
                } ${showControls ? 'opacity-100' : 'opacity-0'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Right Area: Inspector Sidebar (Slide-in from right, borderless) */}
        {activePanel && (
          <div className="w-80 h-full bg-[#161616] flex flex-col flex-shrink-0 animate-slide-in-right p-6 overflow-y-auto select-none gap-6 relative">
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {activePanel === 'info' && (
              <div className="space-y-4">
                <p className="text-[11px] font-semibold tracking-[0.06em] text-[#9B9B9B] uppercase">
                  Media Info
                </p>
                <div className="space-y-3.5">
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-[#888888]">Title</p>
                    <p className="text-[13px] font-medium text-white break-all">{item?.title}</p>
                  </div>
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-[#888888]">Type</p>
                    <p className="text-[13px] font-medium text-white capitalize">{item?.type === 'photo' ? 'Photo' : 'Video'}</p>
                  </div>
                  <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-[#888888]">File Extension</p>
                    <p className="text-[13px] font-medium text-white uppercase font-mono">{(item?.title || '').split('.').pop().toUpperCase()}</p>
                  </div>
                  {item?.data?.mimeType && (
                    <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-[#888888]">Format</p>
                      <p className="text-[13px] font-medium text-white">{item.data.mimeType}</p>
                    </div>
                  )}
                  {item?.data?.size && (
                    <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-[#888888]">Original Size</p>
                      <p className="text-[13px] font-medium text-white">{formatFileSize(item.data.size)}</p>
                    </div>
                  )}
                  {item?.data?.width && item?.data?.height && (
                    <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-[#888888]">Dimensions</p>
                      <p className="text-[13px] font-medium text-white">{item.data.width} × {item.data.height} px</p>
                    </div>
                  )}
                  {item?.data?.duration && (
                    <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-[#888888]">Duration</p>
                      <p className="text-[13px] font-medium text-white">{item.data.duration.toFixed(1)}s</p>
                    </div>
                  )}
                  {item?.createdAt && (
                    <div className="bg-[#1E1E1E] p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-[#888888]">Imported On</p>
                      <p className="text-[13px] font-medium text-white">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activePanel === 'tags' && (
              <div className="space-y-4 flex flex-col h-full min-h-0">
                <p className="text-[11px] font-semibold tracking-[0.06em] text-[#9B9B9B] uppercase">
                  Media Tags
                </p>
                
                {/* Current tags cloud with background contrasts (no borders) */}
                <div className="bg-[#1E1E1E] p-4 rounded-xl flex flex-wrap gap-1.5 min-h-[140px] align-top items-start content-start">
                  {(item?.tags || []).length > 0 ? (
                    (item.tags || []).map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d2d2d] text-[12px] text-white">
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-white/40 hover:text-red-400 cursor-pointer text-[10px] focus:outline-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-[12px] text-white/40 italic m-auto">No tags assigned</p>
                  )}
                </div>

                {/* Tags assign inputs */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-semibold text-[#888888]">Assign New Tag</p>
                  <form onSubmit={handleAddTagSubmit} className="flex gap-1 bg-[#1E1E1E] p-1.5 rounded-xl">
                    <input
                      type="text"
                      placeholder="Enter tag name..."
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      className="flex-1 bg-transparent px-2.5 py-1.5 text-[13px] text-white outline-none placeholder-white/30"
                      style={{ border: 'none', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      disabled={!newTagInput.trim()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none flex items-center justify-center transition-all ${
                        newTagInput.trim()
                          ? 'bg-white text-black cursor-pointer'
                          : 'bg-[#2a2a2a] text-white/35 cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className={`flex items-center gap-4 px-6 py-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        
        {/* Favorite */}
        <button
          type="button"
          onClick={() => onFavorite(item?.id)}
          className="cursor-pointer transition-all duration-150 hover:scale-110 p-2 rounded-lg hover:bg-white/10 text-white"
        >
          <Star className={`w-5 h-5 ${
            item?.isFavorite
              ? 'text-amber-400 fill-amber-400'
              : 'text-white/50 hover:text-white/80'
          }`} />
        </button>

        {/* Tags */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'tags' ? null : 'tags')}
          className={`cursor-pointer transition-all duration-150 p-2 rounded-lg text-white ${
            activePanel === 'tags'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
          title="Manage Tags"
        >
          <Tag className="w-5 h-5" />
        </button>

        {/* Info */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'info' ? null : 'info')}
          className={`cursor-pointer transition-all duration-150 p-2 rounded-lg text-white ${
            activePanel === 'info'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
          title="Media Information"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={() => onDownload(item)}
          className="cursor-pointer text-white/50 hover:text-white/80 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Rename */}
        <button
          type="button"
          onClick={() => setIsEditingName(true)}
          className="cursor-pointer text-white/50 hover:text-white/80 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Pencil className="w-5 h-5" />
        </button>

        <div className="flex-1" />

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 bg-[#252525] px-3 py-1.5 rounded-xl">
            <span className="text-[13px] text-white/60 select-none">
              Delete this item?
            </span>
            <button
              type="button"
              onClick={async () => {
                await onDelete(item.id)
                onClose()
              }}
              className="px-3 py-1 rounded-lg text-[13px] text-red-400 hover:bg-red-500/20 cursor-pointer font-semibold transition-colors"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg text-[13px] text-white/50 hover:text-white/80 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="cursor-pointer text-white/40 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className={`flex items-center gap-1.5 px-4 pb-3 overflow-x-auto custom-scrollbar transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          {items.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onNavigate(idx > lightboxIndex ? 'next' : 'prev')}
              className={`flex-shrink-0 cursor-pointer rounded-md overflow-hidden transition-all duration-150 ${
                idx === lightboxIndex
                  ? 'bg-white p-0.5 w-14 h-14'
                  : 'opacity-50 hover:opacity-80 w-12 h-12'
              }`}
            >
              {it.thumbnail ? (
                <img
                  src={`data:${getMimeType(it.title)};base64,${it.thumbnail}`}
                  alt=""
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full bg-[#333333] rounded" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
