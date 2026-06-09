import React, { useState } from 'react'
import {
  FileText, Sheet, Image, Video,
  Music, Archive, Code, Layers,
  File, Star, Download, Eye,
  Trash2, MoreHorizontal,
} from 'lucide-react'
import {
  getFileCategory, getFileCategoryColor,
  formatFileSize, getExtension,
  isPreviewable,
} from '../../utils/fileUtils'
import { createPortal } from 'react-dom'

const CATEGORY_ICONS = {
  document:     FileText,
  spreadsheet:  Sheet,
  presentation: File,
  image:        Image,
  video:        Video,
  audio:        Music,
  archive:      Archive,
  code:         Code,
  design:       Layers,
  other:        File,
}

const FileIcon = React.memo(
  function FileIcon({ filename, size = 20 }) {
    const cat = getFileCategory(filename)
    const color = getFileCategoryColor(filename)
    const Icon = CATEGORY_ICONS[cat] || File
    const ext = getExtension(filename)
      .toUpperCase().slice(0, 4)

    return (
      <div className="relative flex items-center
        justify-center flex-shrink-0"
        style={{ width: size, height: size }}>
        <Icon style={{
          width: size, height: size,
          color,
        }} />
      </div>
    )
  }
)

const FileItem = React.memo(function FileItem({
  item, viewMode, isSelected, isSelectMode,
  onPreview, onDownload, onDelete,
  onToggleFavorite, onSelect, onContextMenu,
}) {
  const data = item.data || {}
  const canPreview = isPreviewable(item.title)
  const color = getFileCategoryColor(item.title)
  const ext = getExtension(item.title)
    .toUpperCase()

  const handleClick = () => {
    if (isSelectMode) {
      onSelect(item.id)
    } else {
      onPreview(item)
    }
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        onContextMenu={e => {
          e.preventDefault()
          onContextMenu(e, item)
        }}
        className="flex items-center gap-3
          px-4 py-3 cursor-pointer
          transition-colors duration-150"
        style={{
          backgroundColor: isSelected
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            e.currentTarget.style
              .backgroundColor =
              'rgba(255,255,255,0.03)'
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            e.currentTarget.style
              .backgroundColor = 'transparent'
          }
        }}
      >
        {/* Checkbox */}
        {isSelectMode && (
          <div
            onClick={e => {
              e.stopPropagation()
              onSelect(item.id)
            }}
            className="w-5 h-5 rounded-full
              flex items-center justify-center
              flex-shrink-0 cursor-pointer
              transition-all"
            style={{
              backgroundColor: isSelected
                ? '#F0F0F0'
                : 'rgba(255,255,255,0.1)',
            }}
          >
            {isSelected && (
              <svg width="10" height="10"
                viewBox="0 0 10 10">
                <path d="M2 5l2.5 2.5L8 3"
                  stroke="#141414"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"/>
              </svg>
            )}
          </div>
        )}

        {/* File icon */}
        <div className="w-10 h-10 rounded-xl
          flex items-center justify-center
          flex-shrink-0"
          style={{
            backgroundColor: color + '18',
          }}>
          <FileIcon
            filename={item.title}
            size={20}
          />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium
            text-[#F0F0F0] truncate">
            {item.title}
          </p>
          <p className="text-[12px] text-[#666666]
            mt-0.5">
            {formatFileSize(data.size)}
            {data.description && (
              <span className="ml-2 text-[#555555]">
                · {data.description}
              </span>
            )}
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2
          flex-shrink-0">
          {/* Extension badge */}
          <span className="text-[10px] font-bold
            px-2 py-0.5 rounded-lg uppercase"
            style={{
              backgroundColor: color + '18',
              color,
            }}>
            {ext || 'FILE'}
          </span>

          {item.isFavorite && (
            <Star className="w-3.5 h-3.5
              text-amber-400 fill-amber-400" />
          )}

          {/* Actions on hover */}
          <div className="flex items-center gap-1
            opacity-0 group-hover:opacity-100
            transition-opacity">
            {canPreview && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onPreview(item)
                }}
                className="w-7 h-7 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-[#555555]
                  hover:text-[#F0F0F0]
                  hover:bg-[#252525] transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onDownload(item)
              }}
              className="w-7 h-7 flex items-center
                justify-center rounded-lg
                cursor-pointer text-[#555555]
                hover:text-[#F0F0F0]
                hover:bg-[#252525] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // GRID VIEW
  return (
    <div
      onClick={handleClick}
      onContextMenu={e => {
        e.preventDefault()
        onContextMenu(e, item)
      }}
      className="group rounded-2xl p-4
        cursor-pointer transition-all duration-150
        hover:scale-[1.01]"
      style={{
        backgroundColor: isSelected
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.03)',
      }}
    >
      {/* Top */}
      <div className="flex items-start
        justify-between mb-3">
        {/* File type icon */}
        <div className="w-12 h-12 rounded-2xl
          flex items-center justify-center"
          style={{ backgroundColor: color + '18' }}>
          <FileIcon
            filename={item.title}
            size={24}
          />
        </div>

        <div className="flex items-center gap-1">
          {item.isFavorite && (
            <Star className="w-3.5 h-3.5
              text-amber-400 fill-amber-400" />
          )}
          {/* Checkbox */}
          <div
            onClick={e => {
              e.stopPropagation()
              onSelect(item.id)
            }}
            className={`w-5 h-5 rounded-full
              flex items-center justify-center
              cursor-pointer transition-all
              ${isSelectMode
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
              }`}
            style={{
              backgroundColor: isSelected
                ? '#F0F0F0'
                : 'rgba(255,255,255,0.15)',
            }}
          >
            {isSelected && (
              <svg width="10" height="10"
                viewBox="0 0 10 10">
                <path d="M2 5l2.5 2.5L8 3"
                  stroke="#141414"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"/>
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* File name */}
      <p className="text-[13px] font-medium
        text-[#F0F0F0] truncate mb-1">
        {item.title}
      </p>

      {/* Description */}
      {data.description && (
        <p className="text-[11px] text-[#555555]
          truncate mb-1">
          {data.description}
        </p>
      )}

      {/* Bottom */}
      <div className="flex items-center
        justify-between mt-2">
        <span className="text-[10px] font-bold
          px-2 py-0.5 rounded-lg uppercase"
          style={{
            backgroundColor: color + '18',
            color,
          }}>
          {ext || 'FILE'}
        </span>
        <span className="text-[11px]
          text-[#555555]">
          {formatFileSize(data.size)}
        </span>
      </div>

      {/* Quick actions — show on hover */}
      <div className="flex gap-1 mt-3
        opacity-0 group-hover:opacity-100
        transition-opacity duration-150">
        {canPreview && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onPreview(item)
            }}
            className="flex-1 py-1.5 rounded-xl
              text-[11px] cursor-pointer
              text-[#888888] transition-colors"
            style={{
              backgroundColor:
                'rgba(255,255,255,0.05)',
            }}
          >
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onDownload(item)
          }}
          className="flex-1 py-1.5 rounded-xl
            text-[11px] cursor-pointer
            text-[#888888] transition-colors"
          style={{
            backgroundColor:
              'rgba(255,255,255,0.05)',
          }}
        >
          Download
        </button>
      </div>
    </div>
  )
})

export default FileItem
