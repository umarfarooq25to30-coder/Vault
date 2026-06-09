import React, { useState, useRef } from 'react'
import { 
  Plus, Grid2x2, List, Trash2, X, Loader2
} from 'lucide-react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export default function GalleryToolbar({ 
  gallery, onUploadClick 
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const hasSelection = gallery.selectedIds.size > 0

  const searchInputRef = useRef(null)

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onEscape: () => {
      if (hasSelection) {
        gallery.clearSelection()
      }
    }
  })

  const handleDeleteSelected = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await gallery.deleteSelected()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex-shrink-0">
      {/* Main toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 py-3 bg-[#181818]">
        
        {/* Left — title */}
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-semibold text-[#F0F0F0] whitespace-nowrap">
            {gallery.activeAlbumId
              ? (gallery.albums.find(a => a.id === gallery.activeAlbumId)?.name || 'Album')
              : 'Gallery'
            }
          </h1>
        </div>

        <div className="flex-1 hidden sm:block" />

        {/* Right — actions */}
        {hasSelection ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-[13px] text-[#888888] select-none">
              {gallery.selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={gallery.selectAll}
              className="text-[13px] text-[#888888] hover:text-[#C0C0C0] cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-[#252525]"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 ${
                isDeleting
                  ? 'opacity-50 cursor-not-allowed text-[#666666]'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
            <button
              type="button"
              onClick={gallery.clearSelection}
              className="flex items-center gap-1 text-[13px] text-[#666666] hover:text-[#C0C0C0] cursor-pointer transition-colors p-1.5 rounded-lg hover:bg-[#252525] ml-auto sm:ml-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or tag..."
              value={gallery.searchQuery || ''}
              onChange={e => gallery.setSearchQuery(e.target.value)}
              className="bg-[#252525] text-[#C0C0C0] text-[13px] rounded-lg px-3 py-1.5 outline-none placeholder:text-[#444444] w-full sm:w-48 focus:outline-none focus:ring-0 flex-shrink-0"
            />

            {/* Filter */}
            <select
              value={gallery.filterType}
              onChange={e => gallery.setFilterType(e.target.value)}
              className="bg-[#252525] text-[#C0C0C0] text-[13px] rounded-lg px-2.5 py-1.5 cursor-pointer outline-none flex-1 sm:flex-none"
            >
              <option value="all">All</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
              <option value="favorite">Favorites</option>
            </select>

            {/* Sort */}
            <select
              value={`${gallery.sortBy}_${gallery.sortOrder}`}
              onChange={e => {
                const [by, order] = e.target.value.split('_')
                gallery.setSortBy(by)
                gallery.setSortOrder(order)
              }}
              className="bg-[#252525] text-[#C0C0C0] text-[13px] rounded-lg px-2.5 py-1.5 cursor-pointer outline-none flex-1 sm:flex-none"
            >
              <option value="createdAt_desc">Newest</option>
              <option value="createdAt_asc">Oldest</option>
              <option value="title_asc">Name A-Z</option>
              <option value="title_desc">Name Z-A</option>
            </select>

            {/* View toggle */}
            <div className="flex bg-[#252525] rounded-lg overflow-hidden p-0.5 max-sm:hidden">
              <button
                type="button"
                onClick={() => gallery.setViewMode('grid')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  gallery.viewMode === 'grid'
                    ? 'bg-[#333333] text-[#F0F0F0]'
                    : 'text-[#666666] hover:text-[#C0C0C0]'
                }`}
              >
                <Grid2x2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => gallery.setViewMode('list')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  gallery.viewMode === 'list'
                    ? 'bg-[#333333] text-[#F0F0F0]'
                    : 'text-[#666666] hover:text-[#C0C0C0]'
                }`}
              >
                <Grid2x2 className="hidden" /> {/* Placeholder fallback */}
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={onUploadClick}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD] transition-colors duration-150 flex-1 sm:flex-none whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Media
            </button>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {gallery.isUploading && (
        <div className="px-4 py-2 bg-[#1C1C1C]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-[#888888] truncate max-w-xs select-text">
              {gallery.uploadProgress.filename
                ? `Processing: ${gallery.uploadProgress.filename}`
                : 'Uploading...'
              }
            </span>
            <span className="text-[12px] text-[#555555] flex-shrink-0 ml-2 select-text">
              {gallery.uploadProgress.current}/{gallery.uploadProgress.total}
            </span>
          </div>
          <div className="h-1 rounded-full bg-[#252525]">
            <div
              className="h-1 rounded-full bg-[#F0F0F0] transition-all duration-300"
              style={{
                width: `${gallery.uploadProgress.percent}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
