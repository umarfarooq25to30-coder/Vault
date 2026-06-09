// File preview modal
// Supports: PDF, images, text/code files

import { createPortal } from 'react-dom'
import {
  X, Download, ZoomIn, ZoomOut,
  RotateCcw, FileText, AlertCircle,
  Loader2, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import {
  isTextFile, isImageFile, isPDFFile,
  getLanguage, formatFileSize,
  getFileCategoryColor,
} from '../../utils/fileUtils'
import PDFViewer from './PDFViewer'

export default function FilePreview({
  previewItem,
  onClose,
  onDownload,
  onNavigate,
}) {
  const { item, objectURL, textContent,
    isLoading, error } = previewItem
  const [zoom, setZoom] = useState(1)
  const [touchStart, setTouchStart] = useState(null)
  
  // Handle swipe
  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX)
  const handleTouchMove = (e) => {
    if (!touchStart || !onNavigate) return
    const currentTouch = e.targetTouches[0].clientX
    const diff = touchStart - currentTouch
    if (diff > 50) {
      onNavigate('next', false)
      setTouchStart(null)
    } else if (diff < -50) {
      onNavigate('prev', false)
      setTouchStart(null)
    }
  }
  const handleTouchEnd = () => setTouchStart(null)

  // Keyboard navigation
  useEffect(() => {
    if (!onNavigate) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNavigate('next', false)
      if (e.key === 'ArrowLeft') onNavigate('prev', false)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate, onClose])

  const isText = isTextFile(item.title)
  const isImage = isImageFile(item.title)
  const isPDF = isPDFFile(item.title)
  const lang = getLanguage(item.title)
  const color = getFileCategoryColor(item.title)

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]
        flex flex-col animate-fade-in group"
      style={{ backgroundColor: '#0D0D0D' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar (hide for PDF) */}
      {!isPDF && (
        <div className="flex items-center gap-3
          px-5 py-3 flex-shrink-0"
          style={{ backgroundColor: '#141414' }}>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center
              justify-center rounded-lg
              cursor-pointer text-[#666666]
              hover:text-[#F0F0F0]
              hover:bg-[#252525] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold
              text-[#F0F0F0] truncate">
              {item.title}
            </p>
            <p className="text-[11px] text-[#555555]">
              {formatFileSize(item.data?.size)}
            </p>
          </div>

          {/* Zoom controls (image only) */}
          {isImage && objectURL && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom(z =>
                  Math.max(0.25, z - 0.25)
                )}
                className="w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-[#555555]
                  hover:text-[#F0F0F0]
                  hover:bg-[#252525] transition-all"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[12px]
                text-[#555555] w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z =>
                  Math.min(4, z + 0.25)
                )}
                className="w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-[#555555]
                  hover:text-[#F0F0F0]
                  hover:bg-[#252525] transition-all"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-[#555555]
                  hover:text-[#F0F0F0]
                  hover:bg-[#252525] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Download */}
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="flex items-center gap-1.5
              px-3 py-1.5 rounded-xl
              text-[13px] font-medium cursor-pointer
              transition-colors"
            style={{ backgroundColor: '#F0F0F0',
              color: '#141414' }}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto flex items-start justify-center relative">
        
        {/* Left/Right Buttons */}
        {onNavigate && (
          <>
            <button
              onClick={() => onNavigate('prev', false)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all z-50 opacity-0 group-hover:opacity-100 backdrop-blur-md"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => onNavigate('next', false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all z-50 opacity-0 group-hover:opacity-100 backdrop-blur-md"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col
            items-center justify-center gap-3
            h-64 self-center">
            <Loader2 className="w-8 h-8
              text-[#555555] animate-spin" />
            <p className="text-[13px]
              text-[#555555]">
              Decrypting...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col
            items-center justify-center gap-3
            h-64 self-center">
            <AlertCircle className="w-8 h-8
              text-red-400" />
            <p className="text-[14px]
              text-[#888888]">
              {error}
            </p>
          </div>
        )}

        {/* PDF */}
        {!isLoading && !error && isPDF && (
          <PDFViewer
            buffer={previewItem.buffer}
            filename={item.title}
            onDownload={() => onDownload(item)}
            onClose={onClose}
          />
        )}

        {/* Image */}
        {!isLoading && !error && isImage &&
          objectURL && (
            <div className="p-8 flex items-center
              justify-center min-h-full">
              <img
                src={objectURL}
                alt={item.title}
                style={{
                  transform: `scale(${zoom})`,
                  transition: 'transform 200ms',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
                onDoubleClick={() =>
                  setZoom(z => z === 1 ? 2 : 1)
                }
              />
            </div>
          )
        }

        {/* Text / Code */}
        {!isLoading && !error && isText &&
          textContent !== null && (
            <div className="w-full max-w-4xl p-6 self-start text-left">
              <SyntaxHighlighter
                language={lang === 'plaintext' ? 'text' : lang}
                style={atomOneDark}
                showLineNumbers={true}
                wrapLines={true}
                customStyle={{
                  backgroundColor: 'transparent',
                  padding: '16px',
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: '1.6',
                  borderRadius: '12px'
                }}
              >
                {textContent}
              </SyntaxHighlighter>
            </div>
          )
        }
      </div>
    </div>,
    document.body
  )
}
