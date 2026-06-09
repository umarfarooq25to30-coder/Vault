import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function ProgressModal({
  isOpen,
  title,
  progress,  // 0-100
  status,    // 'running' | 'done' | 'error'
  errorMessage,
  onClose,
}) {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="w-80 rounded-2xl p-6 animate-in slide-in-from-bottom-4"
        style={{ backgroundColor: '#1E1E1E' }}
      >
        <p className="text-[16px] font-semibold text-[#F0F0F0] mb-5">
          {title}
        </p>

        {status === 'running' && (
          <>
            <div className="h-2 rounded-full mb-3" style={{ backgroundColor: '#252525' }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: '#F0F0F0',
                }}
              />
            </div>
            <p className="text-[13px] text-center" style={{ color: '#555555' }}>
              {progress < 30
                ? 'Reading vault data...'
                : progress < 60
                  ? 'Encrypting...'
                  : progress < 90
                    ? 'Finalizing...'
                    : 'Almost done...'
              }
            </p>
          </>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-[14px]" style={{ color: '#888888' }}>
              Completed successfully
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-[14px] font-medium cursor-pointer transition-colors mt-2"
              style={{
                backgroundColor: '#F0F0F0',
                color: '#141414',
              }}
            >
              Done
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-[13px] text-center text-red-400">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-[13px] cursor-pointer transition-colors"
              style={{
                backgroundColor: '#252525',
                color: '#888888',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
