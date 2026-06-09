// Main file grid/list with context menu

import React, { useRef, useState,
  useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Eye, Download, Star, Pencil,
  Trash2, FolderInput, CheckSquare,
  Info, File,
} from 'lucide-react'
import FileItem from './FileItem'
import {
  isPreviewable, formatFileSize,
  formatRelDate, getFileCategory,
} from '../../utils/fileUtils'

export default function FileList({
  files, folders, activeFolderId, viewMode,
  selectedIds, isLoading, expectedCount,
  onPreview, onDownload, onDelete,
  onToggleFavorite, onRename,
  onSelect, onMoveToFolder,
}) {
  const [contextMenu, setContextMenu] =
    useState(null)
  const [renamingId, setRenamingId] =
    useState(null)
  const [renameValue, setRenameValue] =
    useState('')

  const isSelectMode = selectedIds.size > 0

  const openContextMenu = useCallback(
    (e, item) => {
      e.preventDefault()
      e.stopPropagation() // Stop event so window listener doesn't close it instantly
      const MENU_H = 300
      const MENU_W = 200
      const PAD = 8
      let x = e.clientX
      let y = e.clientY

      if (y + MENU_H > window.innerHeight - PAD) {
        y = y - MENU_H
      }
      if (x + MENU_W > window.innerWidth - PAD) {
        x = x - MENU_W
      }
      y = Math.max(PAD, y)
      x = Math.max(PAD, x)

      const available = window.innerHeight - y - PAD
      setContextMenu({
        item, x, y,
        maxHeight: Math.min(available, 360),
      })
    },
    []
  )

  const closeMenu = () => setContextMenu(null)

  useEffect(() => {
    if (!contextMenu) return
    const handlePointerDown = (e) => {
      if (e.target.closest('.file-context-menu-container')) return
      // If we clicked outside the menu, close it
      closeMenu()
    }

    // Capture phase so we can detect clicks before other elements do
    window.addEventListener('pointerdown', handlePointerDown, { capture: true })
    
    // We also need to listen for contextmenu specifically, because right clicks don't always fire pointerdown in all browsers exactly the same way, or contextmenu might fire after.
    const handleContextMenu = (e) => {
      if (e.target.closest('.file-context-menu-container')) {
        e.preventDefault()
        return
      }
      // If they right clicked ANOTHER file item, we let openContextMenu handle it.
      // But how do we avoid closing the NEW menu?
      // openContextMenu stops propagation, so this window listener wouldn't catch it!
      closeMenu()
    }
    
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [contextMenu])

  if (isLoading && expectedCount > 0) {
    return (
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-2 md:grid-cols-3 ' +
          'lg:grid-cols-4 gap-3 p-4'
        : 'space-y-0'
      }>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}
            className="rounded-2xl animate-pulse"
            style={{
              height: viewMode === 'grid'
                ? 140 : 60,
              backgroundColor:
                'rgba(255,255,255,0.04)',
              opacity: 0.3 + i * 0.08,
            }}
          />
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center
        justify-center h-full min-h-[300px] gap-3">
        <File className="w-12 h-12"
          style={{ color: '#2A2A2A' }} />
        <p className="text-[15px]"
          style={{ color: '#555555' }}>
          No files here
        </p>
        <p className="text-[13px]"
          style={{ color: '#444444' }}>
          Upload files to get started
        </p>
      </div>
    )
  }

  const recentFiles = activeFolderId === null 
    ? [...files].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col pb-16">
      {recentFiles.length > 0 && (
        <div className="p-4 border-b border-[#1E1E1E]">
          <h3 className="text-[13px] font-medium text-[#C0C0C0] mb-3">Recent Files</h3>
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-2">
            {recentFiles.map(item => (
              <div key={`recent-${item.id}`} className="flex-shrink-0 w-32 shrink-0">
                <FileItem
                  item={item}
                  viewMode="grid"
                  isSelected={selectedIds.has(item.id)}
                  isSelectMode={isSelectMode}
                  onPreview={() => onPreview(item)}
                  onDownload={() => onDownload(item)}
                  onDelete={() => onDelete(item)}
                  onToggleFavorite={() => onToggleFavorite(item)}
                  onSelect={(e) => onSelect(e, item.id)}
                  onContextMenu={openContextMenu}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 ' +
            'lg:grid-cols-4 xl:grid-cols-5 ' +
            'gap-3 p-4'
          : 'group'
      }>
        {files.map(item => (
          <FileItem
            key={item.id}
            item={item}
            viewMode={viewMode}
            isSelected={selectedIds.has(item.id)}
            isSelectMode={isSelectMode}
            onPreview={onPreview}
            onDownload={onDownload}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onSelect={onSelect}
            onContextMenu={openContextMenu}
          />
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && createPortal(
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
            minWidth: '200px',
            maxHeight: contextMenu.maxHeight,
            backgroundColor: '#242424',
          }}
          className="file-context-menu-container rounded-2xl py-1.5
            overflow-y-auto overflow-x-hidden
            animate-fade-in shadow-2xl"
        >
            {/* File name header */}
            <div className="px-3 py-2 mb-0.5">
              <p className="text-[12px] font-medium
                text-[#F0F0F0] truncate">
                {contextMenu.item.title}
              </p>
              <p className="text-[10px]
                text-[#555555]">
                {formatFileSize(
                  contextMenu.item.data?.size
                )}
              </p>
            </div>

            <div className="mx-3 h-px mb-1"
              style={{ backgroundColor: '#333333' }}
            />

            {/* Menu items */}
            {[
              isPreviewable(contextMenu.item.title)
                && {
                  icon: Eye,
                  label: 'Preview',
                  action: () => {
                    onPreview(contextMenu.item)
                    closeMenu()
                  },
                },
              {
                icon: Download,
                label: 'Download',
                action: () => {
                  onDownload(contextMenu.item)
                  closeMenu()
                },
              },
              {
                icon: CheckSquare,
                label: 'Select',
                action: () => {
                  onSelect(contextMenu.item.id)
                  closeMenu()
                },
              },
              {
                icon: Pencil,
                label: 'Rename',
                action: () => {
                  setRenamingId(
                    contextMenu.item.id
                  )
                  setRenameValue(
                    contextMenu.item.title
                  )
                  closeMenu()
                },
              },
              {
                icon: Star,
                label: contextMenu.item.isFavorite
                  ? 'Remove favorite'
                  : 'Add to favorites',
                action: () => {
                  onToggleFavorite(
                    contextMenu.item.id
                  )
                  closeMenu()
                },
              },
            ].filter(Boolean).map((menuItem, i) => (
              <button
                key={i}
                type="button"
                onClick={menuItem.action}
                className="w-full flex items-center
                  gap-2.5 px-3 py-2 text-[13px]
                  cursor-pointer text-[#C0C0C0]
                  hover:text-[#F0F0F0]
                  transition-colors"
                onMouseEnter={e => {
                  e.currentTarget.style
                    .backgroundColor = '#2E2E2E'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style
                    .backgroundColor = 'transparent'
                }}
              >
                <menuItem.icon className="w-4 h-4
                  flex-shrink-0" />
                {menuItem.label}
              </button>
            ))}

            <div className="mx-3 h-px my-1"
              style={{ backgroundColor: '#333333' }}
            />

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                onDelete(contextMenu.item.id)
                closeMenu()
              }}
              className="w-full flex items-center
                gap-2.5 px-3 py-2 text-[13px]
                cursor-pointer text-red-400
                hover:text-red-300 transition-colors"
              onMouseEnter={e => {
                e.currentTarget.style
                  .backgroundColor =
                  'rgba(239,68,68,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style
                  .backgroundColor = 'transparent'
              }}
            >
              <Trash2 className="w-4 h-4
                flex-shrink-0" />
              Delete
            </button>
          </div>,
        document.body
      )}

      {/* Rename modal */}
      {renamingId && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{
              zIndex: 9997,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
            onClick={() => setRenamingId(null)}
          />
          <div
            className="fixed top-1/2 left-1/2
              -translate-x-1/2 -translate-y-1/2
              p-5 rounded-2xl w-80 animate-slide-up"
            style={{
              zIndex: 9998,
              backgroundColor: '#242424',
            }}
          >
            <p className="text-[14px] font-semibold
              text-[#F0F0F0] mb-3">
              Rename file
            </p>
            <input
              autoFocus
              value={renameValue}
              onChange={e =>
                setRenameValue(e.target.value)}
              className="w-full text-[#F0F0F0]
                text-[14px] rounded-xl px-4 py-3
                outline-none
                placeholder:text-[#444444]"
              style={{ backgroundColor: '#1A1A1A' }}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  await onRename(
                    renamingId, renameValue
                  )
                  setRenamingId(null)
                }
                if (e.key === 'Escape') {
                  setRenamingId(null)
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={async () => {
                  await onRename(
                    renamingId, renameValue
                  )
                  setRenamingId(null)
                }}
                className="flex-1 py-2.5 rounded-xl
                  text-[13px] font-medium
                  cursor-pointer transition-colors"
                style={{
                  backgroundColor: '#F0F0F0',
                  color: '#141414',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setRenamingId(null)}
                className="flex-1 py-2.5 rounded-xl
                  text-[13px] cursor-pointer
                  transition-colors"
                style={{
                  backgroundColor: '#2A2A2A',
                  color: '#888888',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
