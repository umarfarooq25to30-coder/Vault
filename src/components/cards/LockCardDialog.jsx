// Dialog overlay providing PIN input with optional visibility toggles for secure folder item validation.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'

export function LockCardDialog({ 
  onConfirm, onCancel 
}) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)

  const handleSubmit = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    onConfirm(pin)
  }

  return createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        style={{ zIndex: 9997 }} 
        onClick={onCancel}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1E1E1E] rounded-2xl p-6 w-80 shadow-2xl border border-zinc-800 animate-slide-up"
        style={{ zIndex: 9998 }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#F0F0F0]">
            Lock this card profile
          </h3>
        </div>
        
        <p className="text-[12.5px] text-[#A0A0A0] mb-4 leading-relaxed">
          Set a secure numeric PIN logic. Stored cryptocard details will be filtered into the "Locked" category and expect authentication to access.
        </p>
        
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 8))
                setError('')
              }}
              placeholder="Enter PIN (4-8 digits)"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl px-4 py-3 outline-none placeholder:font-sans placeholder:text-[#444444] border-0"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPin(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 bg-transparent border-0 outline-none p-1"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            value={confirmPin}
            onChange={e => {
              setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))
              setError('')
            }}
            placeholder="Confirm PIN"
            className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl px-4 py-3 outline-none placeholder:font-sans placeholder:text-[#444444] border-0"
          />
          
          {error && (
            <p className="text-[12px] text-red-450 font-medium">
              {error}
            </p>
          )}
        </div>
        
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer bg-red-650 hover:bg-red-600 text-white transition-colors border-0"
          >
            Lock card
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-colors border-0"
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
