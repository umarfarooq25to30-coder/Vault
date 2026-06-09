import React, { useState, useEffect,
  useCallback } from 'react'
import { useFiles } from '../hooks/useFiles'
import FolderTree from 
  '../components/files/FolderTree'
import FileToolbar from 
  '../components/files/FileToolbar'
import FileList from 
  '../components/files/FileList'
import FilePreview from 
  '../components/files/FilePreview'
import StorageManager from '../components/files/StorageManager'
import FileDetailsPanel from '../components/files/FileDetailsPanel'
import Lightbox from '../components/gallery/Lightbox'
import { getMediaType } from '../utils/mediaUtils'
import { useMemo } from 'react'
import { FolderDown } from 'lucide-react'

export function Files() {
  const files = useFiles()
  const [isDragOver, setIsDragOver] =
    useState(false)

  const isMediaPreview = useMemo(() => {
    if (!files.previewItem?.item) return false
    const mediaType = getMediaType({
      name: files.previewItem.item.title,
      type: files.previewItem.item.data?.mimeType 
        || files.previewItem.item.type
    })
    return mediaType === 'photo' || mediaType === 'video'
  }, [files.previewItem])

  // Global drag and drop
  useEffect(() => {
    const onDragOver = e => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault()
        setIsDragOver(true)
      }
    }
    const onDragLeave = e => {
      if (!e.relatedTarget) setIsDragOver(false)
    }
    const onDrop = e => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        files.uploadFiles(e.dataTransfer.files)
      }
    }

    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener(
        'dragover', onDragOver)
      window.removeEventListener(
        'dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [files.uploadFiles])

  return (
    <div className="flex h-full overflow-hidden"
      style={{ backgroundColor: '#141414' }}>

      {/* LEFT SIDEBAR */}
      <div className="w-56 flex-shrink-0 flex
        flex-col rounded-l-2xl overflow-hidden"
        style={{ backgroundColor: '#181818' }}>
        <div className="flex-1 overflow-hidden">
          <FolderTree
            folders={files.folders}
            activeFolderId={files.activeFolderId}
            onFolderClick={files.setActiveFolderId}
            onCreateFolder={files.createNewFolder}
            onRenameFolder={files.renameFolder}
            onDeleteFolder={files.deleteFolderItem}
            fileCount={files.fileCounts}
            totalCount={files.fileCounts.total || 0}
          />
        </div>
        <StorageManager />
      </div>

      {/* Divider */}
      <div className="w-px flex-shrink-0"
        style={{ backgroundColor: '#1E1E1E' }} />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col
        overflow-hidden">
        <FileToolbar
          files={files.files}
          searchQuery={files.searchQuery}
          setSearchQuery={files.setSearchQuery}
          filterCategory={files.filterCategory}
          setFilterCategory={
            files.setFilterCategory}
          sortBy={files.sortBy}
          setSortBy={files.setSortBy}
          sortOrder={files.sortOrder}
          setSortOrder={files.setSortOrder}
          viewMode={files.viewMode}
          setViewMode={files.setViewMode}
          selectedIds={files.selectedIds}
          onUpload={files.uploadFiles}
          onDeleteSelected={files.deleteSelected}
          onDownloadZip={files.downloadSelectedAsZip}
          onSelectAll={files.selectAll}
          onClearSelection={files.clearSelection}
          isUploading={files.isUploading}
          uploadProgress={files.uploadProgress}
          stats={files.stats}
        />

        <div className="flex-1 overflow-y-auto flex flex-row">
          <div className="flex-1 overflow-y-auto min-w-0">
            <FileList
              files={files.files}
              folders={files.folders}
              activeFolderId={files.activeFolderId}
              viewMode={files.viewMode}
              selectedIds={files.selectedIds}
              isLoading={files.isLoading}
              expectedCount={files.activeFolderId === null ? files.fileCounts.total : (files.fileCounts[files.activeFolderId] || 0)}
              onPreview={files.previewFile}
              onDownload={files.downloadFile}
              onDelete={files.deleteFile}
              onToggleFavorite={
                files.toggleFavoriteFile}
              onRename={files.renameFile}
              onSelect={files.toggleSelect}
              onMoveToFolder={files.moveToFolder}
            />
          </div>
          {files.selectedIds.size === 1 && (
            <FileDetailsPanel
              files={files.files}
              selectedIds={files.selectedIds}
              onClose={() => files.clearSelection()}
              onDownload={files.downloadFile}
            />
          )}
        </div>
      </div>

      {/* File preview modal */}
      {files.previewItem && (
        isMediaPreview ? (
          <Lightbox
            lightbox={{
              item: files.previewItem.item,
              objectURL: files.previewItem.objectURL,
              isDecrypting: files.previewItem.isLoading,
              error: files.previewItem.error,
              mimeType: files.previewItem.item.data?.mimeType || files.previewItem.item.type
            }}
            items={files.files.filter(f => {
              const mt = getMediaType({ name: f.title, type: f.data?.mimeType });
              return mt === 'photo' || mt === 'video';
            })}
            lightboxIndex={files.files.filter(f => {
              const mt = getMediaType({ name: f.title, type: f.data?.mimeType });
              return mt === 'photo' || mt === 'video';
            }).findIndex(f => f.id === files.previewItem.item.id)}
            onClose={files.closePreview}
            onNavigate={files.navigatePreview}
            onFavorite={files.toggleFavoriteFile}
            onDelete={files.deleteFile}
            onRename={files.renameFile}
            onDownload={files.downloadFile}
            onUpdateTags={files.updateItemTags}
          />
        ) : (
          <FilePreview
            previewItem={files.previewItem}
            onClose={files.closePreview}
            onDownload={files.downloadFile}
            onNavigate={files.navigatePreview}
          />
        )
      )}

      {/* Global drop overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50
            flex flex-col items-center
            justify-center gap-4
            pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <div className="w-20 h-20 rounded-2xl
            flex items-center justify-center"
            style={{ backgroundColor: '#252525' }}>
            <FolderDown className="w-10 h-10" style={{ color: '#C0C0C0' }} />
          </div>
          <p className="text-[20px] font-semibold
            text-[#F0F0F0]">
            Drop files to encrypt and save
          </p>
          <p className="text-[14px]"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            All file types supported · Max 500MB
            per file
          </p>
        </div>
      )}
    </div>
  )
}
