// Left sidebar folder tree
// Drag to reorder supported

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  FolderOpen, Folder, Plus,
  Pencil, Trash2, ChevronRight,
} from 'lucide-react'

export default function FolderTree({
  folders,
  activeFolderId,
  onFolderClick,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  fileCount,
  totalCount,
}) {
  const [folderMenu, setFolderMenu] =
    useState(null)
  const [editingId, setEditingId] = useState(null)
  const [newFolderMode, setNewFolderMode] =
    useState(false)
  const [newFolderName, setNewFolderName] =
    useState('')

  const openMenu = (e, folder) => {
    e.preventDefault()
    e.stopPropagation()

    const MENU_H = 120
    const MENU_W = 160
    const PAD = 8
    let x = e.clientX
    let y = e.clientY

    if (y + MENU_H > window.innerHeight - PAD) {
      y = y - MENU_H
    }
    if (x + MENU_W > window.innerWidth - PAD) {
      x = x - MENU_W
    }

    setFolderMenu({ folder, x, y })
  }

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      setNewFolderMode(false)
      return
    }
    await onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setNewFolderMode(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center
        justify-between px-4 pt-4 pb-2">
        <span className="text-[11px] font-medium
          uppercase tracking-wider
          text-[#444444]">
          Folders
        </span>
        <button
          type="button"
          onClick={() => setNewFolderMode(true)}
          className="w-6 h-6 flex items-center
            justify-center rounded-lg
            cursor-pointer text-[#444444]
            hover:text-[#C0C0C0]
            hover:bg-[#252525] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* All files */}
      <div
        onClick={() => onFolderClick(null)}
        className="flex items-center gap-2
          px-4 py-2 mx-2 rounded-xl cursor-pointer
          transition-all duration-150"
        style={{
          backgroundColor:
            activeFolderId === null
              ? 'rgba(255,255,255,0.08)'
              : 'transparent',
        }}
        onMouseEnter={e => {
          if (activeFolderId !== null) {
            e.currentTarget.style.backgroundColor =
              'rgba(255,255,255,0.04)'
          }
        }}
        onMouseLeave={e => {
          if (activeFolderId !== null) {
            e.currentTarget.style.backgroundColor =
              'transparent'
          }
        }}
      >
        <FolderOpen className="w-4 h-4
          text-[#888888] flex-shrink-0" />
        <span className="flex-1 text-[13px]"
          style={{
            color: activeFolderId === null
              ? '#F0F0F0' : '#C0C0C0',
          }}>
          All Files
        </span>
        <span className="text-[11px]
          text-[#444444]">
          {totalCount}
        </span>
      </div>

      {/* New folder input */}
      {newFolderMode && (
        <div className="flex items-center gap-2
          px-4 py-2 mx-2">
          <Folder className="w-4 h-4
            text-[#888888] flex-shrink-0" />
          <input
            autoFocus
            value={newFolderName}
            onChange={e =>
              setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            className="flex-1 bg-transparent
              text-[13px] text-[#F0F0F0]
              outline-none
              placeholder:text-[#444444]"
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') {
                setNewFolderMode(false)
                setNewFolderName('')
              }
            }}
            onBlur={handleCreate}
          />
        </div>
      )}

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto
        px-2 pb-4">
        {folders.map(folder => (
          <div
            key={folder.id}
            onClick={() => onFolderClick(folder.id)}
            onContextMenu={e => openMenu(e, folder)}
            className="group flex items-center
              gap-2 px-3 py-2 rounded-xl
              cursor-pointer transition-all
              duration-150"
            style={{
              backgroundColor:
                activeFolderId === folder.id
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
            }}
            onMouseEnter={e => {
              if (activeFolderId !== folder.id) {
                e.currentTarget.style
                  .backgroundColor =
                  'rgba(255,255,255,0.04)'
              }
            }}
            onMouseLeave={e => {
              if (activeFolderId !== folder.id) {
                e.currentTarget.style
                  .backgroundColor = 'transparent'
              }
            }}
          >
            <FolderOpen className="w-4 h-4
              flex-shrink-0"
              style={{
                color: folder.color || '#888888',
              }} />

            {editingId === folder.id ? (
              <input
                autoFocus
                defaultValue={folder.name}
                className="flex-1 bg-transparent
                  text-[13px] text-[#F0F0F0]
                  outline-none min-w-0"
                onBlur={async e => {
                  await onRenameFolder(
                    folder.id, e.target.value
                  )
                  setEditingId(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                  if (e.key === 'Escape') {
                    setEditingId(null)
                  }
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-[13px]
                truncate min-w-0"
                style={{
                  color: activeFolderId === folder.id
                    ? '#F0F0F0'
                    : '#C0C0C0',
                }}>
                {folder.name}
              </span>
            )}

            <span className="text-[11px]
              text-[#444444]">
              {fileCount[folder.id] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {folderMenu && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setFolderMenu(null)}
          />
          <div
            style={{
              position: 'fixed',
              left: folderMenu.x,
              top: folderMenu.y,
              zIndex: 9999,
              minWidth: '160px',
              backgroundColor: '#242424'
            }}
            className="rounded-xl py-1.5
              overflow-hidden animate-fade-in"
          >
            <button
              type="button"
              onClick={() => {
                setEditingId(folderMenu.folder.id)
                setFolderMenu(null)
              }}
              className="w-full flex items-center
                gap-2.5 px-3 py-2 text-[13px]
                cursor-pointer text-[#C0C0C0]
                hover:text-[#F0F0F0] transition-colors"
              style={{
                ':hover': {
                  backgroundColor: '#2E2E2E'
                }
              }}
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
            <div className="mx-3 h-px my-1"
              style={{ backgroundColor: '#333333' }}
            />
            <button
              type="button"
              onClick={() => {
                onDeleteFolder(folderMenu.folder.id)
                setFolderMenu(null)
              }}
              className="w-full flex items-center
                gap-2.5 px-3 py-2 text-[13px]
                cursor-pointer text-red-400
                hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete folder
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
