import React, { useCallback, useRef, useEffect, useState } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import { 
  Play, Star, Lock, Images
} from 'lucide-react'
import { getMimeType } from '../../utils/mediaUtils'

// Determine custom fallback icon based on file extension
function getFileIcon(title, type) {
  if (type === 'video') {
    return <Play className="w-8 h-8 text-[#555555]" />
  }
  return <Images className="w-8 h-8 text-[#555555]" />
}

const GalleryItem = React.memo(function GalleryItem({
  item, onOpen, onSelect, onContextMenu, isSelected,
  isSelectMode, viewMode,
}) {
  const longPressRef = useRef(null)

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => {
      onSelect(item.id)
    }, 500)
  }
  const handleTouchEnd = () => {
    clearTimeout(longPressRef.current)
  }
  const handleClick = () => {
    if (isSelectMode) onSelect(item.id)
    else onOpen(item)
  }

  const mimeType = item.data?.mimeType || getMimeType(item.title)
  const thumbSrc = item.thumbnail
    ? `data:${mimeType};base64,${item.thumbnail}`
    : null
  const ext = (item.title || '').split('.').pop().toLowerCase()

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        onContextMenu={e => {
          e.preventDefault()
          if (onContextMenu) onContextMenu(e, item)
        }}
        data-gallery-item="true"
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors duration-150 rounded-lg ${
          isSelected ? 'bg-[#282828]' : 'hover:bg-[#1E1E1E]'
        }`}
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#252525] flex items-center justify-center">
          {thumbSrc ? (
            <img src={thumbSrc} alt={item.title}
              className="w-full h-full object-cover font-sans select-none pointer-events-none" />
          ) : (
            getFileIcon(item.title, item.type)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[#E0E0E0] truncate">
            {item.title}
          </p>
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5 mt-0.5 truncate animate-none">
              {item.tags.map(tag => (
                <span key={tag} className="text-[11px] bg-[#222222] text-[#888888] px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {item.isFavorite && (
          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={e => {
        e.preventDefault()
        if (onContextMenu) onContextMenu(e, item)
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      data-gallery-item="true"
      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer select-none bg-[#1E1E1E] transition-all duration-150 group ${
        isSelected ? 'scale-[0.93]' : 'hover:scale-[0.98]'
      }`}
    >
      {/* Thumbnail */}
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={item.title}
          className="w-full h-full object-cover pointer-events-none select-none"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#252525]">
          {getFileIcon(item.title, item.type)}
        </div>
      )}

      {/* Video play indicator */}
      {item.type === 'video' && !isSelectMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Selected dimming overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200 ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        {/* File name at bottom */}
        <div className="absolute bottom-0 inset-x-0 p-2">
          <p className="text-white text-[11px] font-medium truncate leading-tight">
            {item.title}
          </p>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {item.isFavorite && (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          )}
          {item.isLocked && (
            <Lock className="w-3.5 h-3.5 text-white" />
          )}
        </div>
      </div>

      {/* Checkbox badge */}
      <div
        className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'bg-white scale-100'
            : 'bg-black/40 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
        }`}
        onClick={e => {
          e.stopPropagation()
          onSelect(item.id)
        }}
      >
        {isSelected && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3"
              stroke="#1A1A1A" strokeWidth="1.5"
              strokeLinecap="round" fill="none"/>
          </svg>
        )}
      </div>
    </div>
  )
})

const GalleryGrid = React.memo(function GalleryGrid({ gallery, onContextMenu }) {
  const containerRef = useRef(null)
  const [columns, setColumns] = useState(4)

  const {
    items,
    openLightbox,
    toggleSelect,
    selectedIds,
    viewMode,
    isLoading
  } = gallery

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w < 480) setColumns(2)
      else if (w < 768) setColumns(3)
      else if (w < 1200) setColumns(4)
      else setColumns(5)
    })
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

  const isSelectMode = selectedIds.size > 0

  const itemContent = useCallback((index) => {
    const item = items[index]
    if (!item) return null
    return (
      <div key={item.id} className="p-1">
        <GalleryItem
          item={item}
          onOpen={openLightbox}
          onSelect={toggleSelect}
          onContextMenu={onContextMenu}
          isSelected={selectedIds.has(item.id)}
          isSelectMode={isSelectMode}
          viewMode={viewMode}
        />
      </div>
    )
  }, [items, openLightbox, toggleSelect, onContextMenu, selectedIds, isSelectMode, viewMode])

  if (isLoading && items.length === 0) {
    return (
      <div
        ref={containerRef}
        className="p-4 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-[#1E1E1E] animate-pulse"
            style={{ 
              opacity: 0.3 + (i % 4) * 0.15 
            }}
          />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center h-64 gap-3">
        <Images className="w-12 h-12 text-[#333333]" />
        <p className="text-[15px] text-[#666666]">
          No media yet
        </p>
        <p className="text-[13px] text-[#444444]">
          Upload photos or videos to get started
        </p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div ref={containerRef} className="p-4 space-y-1">
        {items.map(item => (
          <GalleryItem
            key={item.id}
            item={item}
            onOpen={openLightbox}
            onSelect={toggleSelect}
            onContextMenu={onContextMenu}
            isSelected={selectedIds.has(item.id)}
            isSelectMode={isSelectMode}
            viewMode="list"
          />
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full min-h-[400px]">
      <VirtuosoGrid
        totalCount={gallery.items.length}
        overscan={400}
        style={{ height: '100%', width: '100%' }}
        components={{
          List: React.forwardRef(({ style, children, ...props }, ref) => (
            <div
              ref={ref}
              {...props}
              style={{
                ...style,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: '8px',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingBottom: '32px',
              }}
            >
              {children}
            </div>
          )),
          Item: ({ children, ...props }) => (
            <div {...props}>{children}</div>
          ),
        }}
        itemContent={itemContent}
      />
    </div>
  )
})

export default GalleryGrid
