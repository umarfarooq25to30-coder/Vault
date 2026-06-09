import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCcw,
  Download, Loader2, AlertCircle, X
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function PDFViewer({
  buffer, filename, onDownload, onClose
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const renderTaskRef = useRef(null)

  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [pageInput, setPageInput] = useState('1')
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRendering, setIsRendering] = useState(false)

  // 1. Load the document exactly once
  useEffect(() => {
    if (!buffer) return

    let isMounted = true
    setIsLoading(true)
    setError(null)

    // Load straight from memory buffer!
    const loadingTask = pdfjsLib.getDocument({ data: buffer })

    loadingTask.promise.then(doc => {
      if (!isMounted) return
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setPageInput('1')
      setIsLoading(false)
    }).catch(err => {
      console.error('PDF load error:', err)
      if (!isMounted) return
      setError('Failed to load PDF')
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      loadingTask.destroy()
    }
  }, [buffer])

  // 2. Render the current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    let isMounted = true
    
    async function renderPage() {
      setIsRendering(true)

      try {
        const page = await pdfDoc.getPage(currentPage)
        if (!isMounted) return

        const viewport = page.getViewport({ scale: zoom, rotation })
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        
        // High-DPI support
        const outputScale = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = Math.floor(viewport.width) + "px"
        canvas.style.height = Math.floor(viewport.height) + "px"

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        }

        // Cancel any existing render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }

        renderTaskRef.current = page.render(renderContext)
        await renderTaskRef.current.promise
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err)
        }
      } finally {
        if (isMounted) setIsRendering(false)
      }
    }

    renderPage()

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [pdfDoc, currentPage, zoom, rotation])

  const goToPrev = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1)
      setPageInput(String(currentPage - 1))
    }
  }

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1)
      setPageInput(String(currentPage + 1))
    }
  }

  const handlePageInput = (e) => {
    const val = e.target.value
    setPageInput(val)
    const num = parseInt(val)
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num)
    }
  }

  const zoomIn = () => setZoom(z => Math.min(3, z + 0.25))
  const zoomOut = () => setZoom(z => Math.max(0.25, z - 0.25))
  const zoomFit = () => {
    if (!containerRef.current || !canvasRef.current) return
    const containerW = containerRef.current.clientWidth - 48
    // Estimate width based on current canvas geometry
    const canvas = canvasRef.current
    if (canvas.width > 0) {
      // original logical width before current zoom
      const logicalW = (canvas.width / (window.devicePixelRatio || 1)) / zoom
      setZoom(Math.min(2, containerW / logicalW))
    }
  }

  const rotateCw = () => setRotation(r => (r + 90) % 360)

  const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]

  return (
    <div className="flex flex-col h-full w-full"
      style={{ backgroundColor: '#1A1A1A' }}>

      {/* PDF TOOLBAR */}
      <div
        className="flex items-center gap-2
          px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ backgroundColor: '#141414' }}
      >
        <span className="text-[13px] font-medium
          text-[#C0C0C0] truncate max-w-[200px]
          flex-shrink-0">
          {filename}
        </span>

        <div className="flex-1" />

        {/* Page navigation */}
        <div className="flex items-center gap-1
          flex-shrink-0">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentPage <= 1 || isLoading}
            className="w-8 h-8 flex items-center
              justify-center rounded-lg
              cursor-pointer transition-all"
            style={{ color: currentPage <= 1 ? '#333333' : '#888888' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            <input
              type="number"
              value={pageInput}
              onChange={handlePageInput}
              disabled={isLoading}
              min={1}
              max={totalPages || 1}
              className="w-12 text-center text-[13px]
                text-[#F0F0F0] rounded-lg py-1
                outline-none"
              style={{ backgroundColor: '#252525' }}
            />
            <span className="text-[12px] text-[#555555]">
              / {totalPages}
            </span>
          </div>

          <button
            type="button"
            onClick={goToNext}
            disabled={currentPage >= totalPages || isLoading}
            className="w-8 h-8 flex items-center
              justify-center rounded-lg
              cursor-pointer transition-all"
            style={{ color: currentPage >= totalPages ? '#333333' : '#888888' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 flex-shrink-0"
          style={{ backgroundColor: '#2A2A2A' }} />

        {/* Zoom controls */}
        <div className="flex items-center gap-1
          flex-shrink-0">
          <button
            type="button"
            onClick={zoomOut}
            disabled={isLoading}
            className="w-8 h-8 flex items-center
              justify-center rounded-lg cursor-pointer
              text-[#888888] hover:text-[#F0F0F0]
              hover:bg-[#252525] transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <select
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            disabled={isLoading}
            className="text-[12px] text-[#C0C0C0]
              rounded-lg px-2 py-1 outline-none
              cursor-pointer"
            style={{ backgroundColor: '#252525' }}
          >
            {ZOOM_PRESETS.map(z => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={zoomIn}
            disabled={isLoading}
            className="w-8 h-8 flex items-center
              justify-center rounded-lg cursor-pointer
              text-[#888888] hover:text-[#F0F0F0]
              hover:bg-[#252525] transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={zoomFit}
            disabled={isLoading}
            className="px-2 h-8 flex items-center
              justify-center rounded-lg cursor-pointer
              text-[11px] text-[#888888]
              hover:text-[#F0F0F0]
              hover:bg-[#252525] transition-all"
          >
            Fit
          </button>
        </div>

        <div className="w-px h-5 flex-shrink-0"
          style={{ backgroundColor: '#2A2A2A' }} />

        {/* Rotate */}
        <button
          type="button"
          onClick={rotateCw}
          disabled={isLoading}
          className="w-8 h-8 flex items-center
            justify-center rounded-lg cursor-pointer
            text-[#888888] hover:text-[#F0F0F0]
            hover:bg-[#252525] transition-all"
          title="Rotate 90°"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5
            px-3 py-1.5 rounded-xl text-[12px]
            font-medium cursor-pointer transition-all"
          style={{
            backgroundColor: '#F0F0F0',
            color: '#141414',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Save
        </button>

        {onClose && (
          <>
            <div className="w-px h-5 flex-shrink-0"
              style={{ backgroundColor: '#2A2A2A' }} />
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center
                justify-center rounded-lg cursor-pointer
                text-[#888888] hover:text-[#F0F0F0]
                hover:bg-[#252525] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* PDF CANVAS AREA */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex
          items-start justify-center p-6 relative"
        style={{ backgroundColor: '#2A2A2A' }}
      >
        {isLoading && (
          <div className="flex flex-col
            items-center justify-center
            gap-3 self-center h-64">
            <Loader2 className="w-8 h-8
              animate-spin text-[#555555]" />
            <p className="text-[13px] text-[#555555]">
              Loading PDF geometry...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col
            items-center justify-center
            gap-3 self-center h-64">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-[14px]
              text-[#888888] text-center max-w-sm">
              {error}
            </p>
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-2
                px-4 py-2 rounded-xl text-[13px]
                cursor-pointer transition-all mt-2
                bg-[#F0F0F0] text-[#141414]"
            >
              <Download className="w-4 h-4" />
              Download instead
            </button>
          </div>
        )}

        {(!isLoading && !error) && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="transition-opacity duration-200"
              style={{
                display: 'block',
                boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                borderRadius: 4,
                opacity: isRendering ? 0.7 : 1,
              }}
            />
            {isRendering && (
              <div className="absolute top-1/2 left-1/2
                -translate-x-1/2 -translate-y-1/2">
                <Loader2 className="w-8 h-8 animate-spin text-[#F0F0F0]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

