import { useRef } from 'react'
import {
  Plus, Search, X, Grid2x2, List,
  Trash2, FolderInput, Loader2, SlidersHorizontal, Download
} from 'lucide-react'
import { useState } from 'react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const FILE_CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'document',     label: 'Docs' },
  { id: 'spreadsheet',  label: 'Sheets' },
  { id: 'presentation', label: 'Slides' },
  { id: 'image',        label: 'Images' },
  { id: 'video',        label: 'Videos' },
  { id: 'code',         label: 'Code' },
  { id: 'archive',      label: 'Archives' },
  { id: 'other',        label: 'Other' },
]

export default function FileToolbar({
  files,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  selectedIds,
  onUpload,
  onDeleteSelected,
  onSelectAll,
  onClearSelection,
  isUploading,
  uploadProgress,
  stats,
  onDownloadZip,
}) {
  const fileInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const [isDeleting, setIsDeleting] =
    useState(false)

  const hasSelection = selectedIds.size > 0

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onNew: () => {
      fileInputRef.current?.click()
    },
    onEscape: () => {
      if (hasSelection) {
        onClearSelection()
      }
    }
  })

  const handleDeleteSelected = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    await onDeleteSelected()
    setIsDeleting(false)
  }

  return (
    <div className="flex-shrink-0">
      {/* Main toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3
        px-4 py-3"
        style={{ backgroundColor: '#181818' }}>

        {/* Left — title + stats */}
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold
            text-[#F0F0F0]">
            {hasSelection
              ? `${selectedIds.size} selected`
              : 'Files'
            }
          </h2>
          {!hasSelection && files.length > 0 && (
            <p className="text-[11px] text-[#888888] hidden sm:block">
              {(() => {
                const total = files.length;
                let size = 0;
                let pdfs = 0;
                let images = 0;
                let other = 0;
                files.forEach(f => {
                  size += f.data?.size || 0;
                  const ext = (f.data?.extension || '').toLowerCase();
                  const mime = f.data?.mimeType || '';
                  if (ext === 'pdf' || mime.includes('pdf')) pdfs++;
                  else if (mime.startsWith('image/')) images++;
                  else other++;
                });
                
                const mb = (size / (1024 * 1024)).toFixed(1);
                const parts = [`${total} files`, `${mb} MB`];
                if (pdfs) parts.push(`${pdfs} PDFs`);
                if (images) parts.push(`${images} images`);
                if (other) parts.push(`${other} other`);
                
                return parts.join(' · ');
              })()}
            </p>
          )}
        </div>

        {/* Right */}
        {hasSelection ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[13px] text-[#888888]
                hover:text-[#C0C0C0] cursor-pointer
                transition-colors"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onDownloadZip}
              className="flex items-center justify-center gap-1.5
                px-3 py-1.5 rounded-xl text-[13px]
                font-medium cursor-pointer
                transition-all flex-1 sm:flex-none"
              style={{
                color: '#141414',
                backgroundColor: '#F0F0F0',
              }}
            >
              <Download className="w-4 h-4" />
              Download Zip
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center justify-center gap-1.5
                px-3 py-1.5 rounded-xl text-[13px]
                font-medium cursor-pointer
                transition-all flex-1 sm:flex-none"
              style={{
                color: isDeleting
                  ? '#555555' : '#EF4444',
                backgroundColor: isDeleting
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(239,68,68,0.1)',
              }}
            >
              {isDeleting
                ? <Loader2 className="w-4 h-4
                    animate-spin" />
                : <Trash2 className="w-4 h-4" />
              }
              {isDeleting
                ? 'Deleting...'
                : `Delete`
              }
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="w-8 h-8 flex items-center
                justify-center rounded-xl
                cursor-pointer text-[#555555]
                hover:text-[#F0F0F0]
                hover:bg-[#252525] transition-all ml-auto sm:ml-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-shrink-0 w-full sm:w-48">
              <Search className="absolute left-3
                top-1/2 -translate-y-1/2 w-4 h-4
                text-[#444444] pointer-events-none"/>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={e =>
                  setSearchQuery(e.target.value)}
                className="text-[#F0F0F0] text-[13px]
                  rounded-xl pl-9 pr-4 py-2
                  outline-none w-full
                  placeholder:text-[#444444]"
                style={{ backgroundColor: '#141414' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2
                    -translate-y-1/2 cursor-pointer
                    text-[#555555]
                    hover:text-[#F0F0F0]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={e => {
                const [by, ord] =
                  e.target.value.split('_')
                setSortBy(by)
                setSortOrder(ord)
              }}
              className="text-[#C0C0C0] text-[13px]
                rounded-xl px-3 py-2 outline-none
                cursor-pointer flex-1 sm:flex-none"
              style={{ backgroundColor: '#252525' }}
            >
              <option value="updatedAt_desc">
                Newest
              </option>
              <option value="updatedAt_asc">
                Oldest
              </option>
              <option value="title_asc">
                Name A-Z
              </option>
              <option value="title_desc">
                Name Z-A
              </option>
              <option value="size_desc">
                Size (Large)
              </option>
              <option value="size_asc">
                Size (Small)
              </option>
              <option value="type_asc">
                File Type
              </option>
            </select>

            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden max-sm:hidden"
              style={{ backgroundColor: '#252525' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="p-2 cursor-pointer
                  transition-colors"
                style={{
                  backgroundColor:
                    viewMode === 'grid'
                      ? '#3A3A3A'
                      : 'transparent',
                  color: viewMode === 'grid'
                    ? '#F0F0F0' : '#666666',
                }}
              >
                <Grid2x2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 cursor-pointer
                  transition-colors"
                style={{
                  backgroundColor:
                    viewMode === 'list'
                      ? '#3A3A3A'
                      : 'transparent',
                  color: viewMode === 'list'
                    ? '#F0F0F0' : '#666666',
                }}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()}
              className="flex items-center gap-1.5
                px-3 py-2 rounded-xl text-[13px]
                font-medium cursor-pointer
                transition-colors"
              style={{
                backgroundColor: '#F0F0F0',
                color: '#141414',
              }}
            >
              <Plus className="w-4 h-4" />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files?.length) {
                  onUpload(e.target.files)
                }
                e.target.value = ''
              }}
            />
          </div>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 px-4 pb-2
        overflow-x-auto scrollbar-none">
        {FILE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              setFilterCategory(cat.id)}
            className="px-3 py-1.5 rounded-xl
              text-[12px] flex-shrink-0
              cursor-pointer transition-all"
            style={{
              backgroundColor:
                filterCategory === cat.id
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
              color: filterCategory === cat.id
                ? '#F0F0F0' : '#555555',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="px-4 py-2"
          style={{ backgroundColor: '#1A1A1A' }}>
          <div className="flex justify-between mb-1">
            <span className="text-[12px]
              text-[#888888] truncate max-w-xs">
              {uploadProgress.filename
                ? `Encrypting: ${
                    uploadProgress.filename}`
                : 'Uploading...'
              }
            </span>
            <span className="text-[12px]
              text-[#555555]">
              {uploadProgress.current}/
              {uploadProgress.total}
            </span>
          </div>
          <div className="h-1 rounded-full"
            style={{ backgroundColor: '#252525' }}>
            <div
              className="h-1 rounded-full
                transition-all duration-300"
              style={{
                width: `${uploadProgress.percent}%`,
                backgroundColor: '#F0F0F0',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
