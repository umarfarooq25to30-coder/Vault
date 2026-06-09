// Detailed visualizer panel representing security data, CVV toggles, copy icons, metadata, and favorited states with lock/unlock actions.

import { useState, useCallback } from 'react'
import {
  Edit2, Trash2, Star, Eye, EyeOff,
  Copy, Check, CreditCard,
  Lock, Building, FileText, MapPin,
  Shield, Unlock
} from 'lucide-react'
import {
  maskCardNumber, 
  CARD_CATEGORIES, getCardTypeLabel,
  isCardExpired, isCardExpiringSoon, copyToClipboard,
} from '../../utils/cardUtils'
import CardVisual from './CardVisual'
import { LockCardDialog } from './LockCardDialog'

export default function CardDetail({
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
  onLock,
  onUnlock,
}) {
  const [showNumber, setShowNumber] = useState(false)
  const [showCVV, setShowCVV] = useState(false)
  const [showPIN, setShowPIN] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  // Lock/Unlock triggers
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState('')

  const handleCopy = useCallback(
    async (text, field) => {
      if (!text) return
      await copyToClipboard(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    },
    []
  )

  const data = item?.data || {}
  const expired = isCardExpired(data.expiry || '')
  const expiringSoon = isCardExpiringSoon(data.expiry || '')
  const categoryLabel = CARD_CATEGORIES.find(
    c => c.id === data.category
  )?.label || 'Card'

  const CopyBtn = ({ text, field }) => (
    <button
      type="button"
      onClick={() => handleCopy(text, field)}
      className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150 border-0 outline-none ${
        copiedField === field
          ? 'text-green-400 bg-green-500/10'
          : 'text-[#555555] hover:text-[#C0C0C0] hover:bg-[#252525]'
      }`}
    >
      {copiedField === field
        ? <Check className="w-4 h-4" />
        : <Copy className="w-4 h-4" />
      }
    </button>
  )

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      
      {/* Header actions */}
      <div className="flex items-center justify-end gap-1 px-6 pt-5 pb-3 flex-shrink-0">
        
        {/* Lock / Unlock secure profile action */}
        {onLock && onUnlock && (
          <button
            type="button"
            onClick={() => {
              if (item?.isLocked) {
                setShowUnlockPrompt(true)
              } else {
                setShowLockDialog(true);
              }
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-all border-0 bg-transparent ${
              item?.isLocked
                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'text-[#555555] hover:text-red-400 hover:bg-red-500/10'
            }`}
            title={item?.isLocked ? 'Unlock Card Profile' : 'Lock card profile'}
          >
            {item?.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer hover:bg-[#252525] transition-all border-0 bg-transparent"
        >
          <Star className={`w-4 h-4 ${
            item?.isFavorite
              ? 'text-amber-400 fill-amber-400'
              : 'text-[#555555]'
          }`} />
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-[#555555] hover:text-[#C0C0C0] hover:bg-[#252525] transition-all border-0 bg-transparent"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="px-3 py-1 rounded-lg text-[13px] cursor-pointer text-red-500 hover:bg-red-500/10 transition-colors border-0 bg-transparent"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg text-[13px] cursor-pointer text-[#666666] hover:text-[#C0C0C0] transition-colors border-0 bg-transparent"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-all border-0 bg-transparent"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card visual representation */}
      <div className="flex justify-center px-6 pb-6 flex-shrink-0">
        <CardVisual
          card={data}
          showFull={showNumber}
          showCVV={showCVV}
          size="normal"
          enable3D={true}
        />
      </div>

      {/* Details list */}
      <div className="px-6 pb-6 space-y-4 flex-1">
        
        {/* Automated Expiry Alerts */}
        {expired && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-start gap-3 animate-fade-in">
            <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400 flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="flex-1 text-[13px]">
              <p className="font-bold text-red-300">Automated Alert: Card Expired</p>
              <p className="text-red-400/80 mt-0.5 text-[12px] leading-relaxed">
                This secure payment card expired on <span className="font-semibold text-red-300">{data.expiry || 'N/A'}</span>. Transactions using this card will fail. Please update details or request a reissue.
              </p>
            </div>
          </div>
        )}

        {!expired && expiringSoon && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3 animate-fade-in">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="flex-1 text-[13px]">
              <p className="font-bold text-amber-300">Automated Alert: Card Expiring Soon</p>
              <p className="text-amber-400/80 mt-0.5 text-[12px] leading-relaxed">
                This secure payment card is set to expire within 30 days on <span className="font-semibold text-amber-300">{data.expiry || 'N/A'}</span>. Please verify and request a replacement to avoid interruptions.
              </p>
            </div>
          </div>
        )}
        
        {/* Label + category */}
        <div className="mb-4">
          <h2 className="text-[18px] font-semibold text-[#F0F0F0]">
            {data.label || data.bankName || 'My Card'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] text-[#888888]">
              {categoryLabel}
            </span>
            {data.cardType && data.cardType !== 'other' && (
              <span className="text-[12px] text-[#666666]">
                · {getCardTypeLabel(data.cardType)}
              </span>
            )}
            {expired && (
              <span className="text-[11px] font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded-lg uppercase tracking-wider font-semibold">
                EXPIRED
              </span>
            )}
            {!expired && expiringSoon && (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase tracking-wider animate-pulse">
                ⚠️ Expiring Soon
              </span>
            )}
            {item?.isLocked && (
              <span className="text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked Profile
              </span>
            )}
          </div>
        </div>

        {/* Card number panel */}
        <div className="rounded-xl bg-[#1A1A1A] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#555555]" />
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                Card Number
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowNumber(p => !p)}
                className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer text-[#555555] hover:text-[#C0C0C0] hover:bg-[#252525] transition-all border-0 bg-transparent"
              >
                {showNumber
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
              <CopyBtn
                text={data.cardNumber?.replace(/\s/g, '')}
                field="number"
              />
            </div>
          </div>
          <p className="font-mono text-[17px] text-[#F0F0F0] tracking-wider selection:bg-zinc-700">
            {showNumber
              ? (data.cardNumber || '•••• •••• •••• ••••')
              : maskCardNumber(data.cardNumber || '', data.cardType)
            }
          </p>
        </div>

        {/* Name + Expiry row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#1A1A1A] p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                Name
              </span>
              <CopyBtn
                text={data.cardName}
                field="name"
              />
            </div>
            <p className="text-[13px] text-[#F0F0F0] font-medium truncate">
              {data.cardName || '—'}
            </p>
          </div>
          
          <div className="rounded-xl bg-[#1A1A1A] p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                Expiry
              </span>
              <CopyBtn
                text={data.expiry}
                field="expiry"
              />
            </div>
            <p className={`text-[13px] font-mono font-medium ${
              expired ? 'text-red-400' : 'text-[#F0F0F0]'
            }`}>
              {data.expiry || '—'}
            </p>
          </div>
        </div>

        {/* CVV panel */}
        <div className="rounded-xl bg-[#1A1A1A] p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#555555]" />
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                CVV
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCVV(p => !p)}
                className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer text-[#555555] hover:text-[#C0C0C0] hover:bg-[#252525] transition-all border-0 bg-transparent"
              >
                {showCVV
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
              <CopyBtn
                text={data.cvv}
                field="cvv"
              />
            </div>
          </div>
          <p className="font-mono text-[15px] text-[#F0F0F0]">
            {showCVV
              ? (data.cvv || '—')
              : '•'.repeat(data.cvv?.length || 3)
            }
          </p>
        </div>

        {/* PIN if set */}
        {data.pin && (
          <div className="rounded-xl bg-[#1A1A1A] p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#555555]" />
                <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                  PIN
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPIN(p => !p)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer text-[#555555] hover:text-[#C0C0C0] hover:bg-[#252525] transition-all border-0 bg-transparent"
                >
                  {showPIN
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
                <CopyBtn
                  text={data.pin}
                  field="pin"
                />
              </div>
            </div>
            <p className="font-mono text-[15px] text-[#F0F0F0]">
              {showPIN
                ? data.pin
                : '•'.repeat(data.pin.length)
              }
            </p>
          </div>
        )}

        {/* Bank name */}
        {data.bankName && (
          <div className="rounded-xl bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-3.5 h-3.5 text-[#555555]" />
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                Bank name
              </span>
            </div>
            <p className="text-[14px] text-[#F0F0F0]">
              {data.bankName}
            </p>
          </div>
        )}

        {/* Billing address */}
        {data.billingAddress && (
          <div className="rounded-xl bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#555555]" />
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                Billing Address
              </span>
            </div>
            <p className="text-[13px] text-[#C0C0C0] leading-relaxed whitespace-pre-wrap">
              {data.billingAddress}
            </p>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div className="rounded-xl bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3.5 h-3.5 text-[#555555]" />
              <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
                Notes
              </span>
            </div>
            <p className="text-[13px] text-[#C0C0C0] leading-relaxed whitespace-pre-wrap">
              {data.notes}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-xl bg-[#1A1A1A] p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-[#555555]" />
            <span className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
              Security Specifications
            </span>
          </div>
          {[
            { label: 'Encryption Standard', value: 'AES-256-GCM (Offline)' },
            { 
              label: 'Added On',
              value: item?.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-[12px] text-[#555555]">
                {label}
              </span>
              <span className="text-[12px] text-[#888888]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Lock Dialog overlay - asks for card PIN specifically */}
      {showLockDialog && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999]" 
          onClick={() => {
            setShowLockDialog(false)
            setUnlockPin('')
            setUnlockError('')
          }}
        >
          <div 
            className="bg-[#1E1E1E] rounded-2xl p-6 w-80 shadow-2xl border border-zinc-800 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#F0F0F0]">
                Lock Card Profile
              </h3>
            </div>
            <p className="text-[12.5px] text-[#A0A0A0] mb-4">
              Enter this card's 4-digit security PIN to lock its profile.
            </p>

            {!data.pin ? (
              <div className="space-y-4">
                <p className="text-xs text-amber-500 font-semibold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  No PIN is configured for this card. Please click Cancel, edit your card details to add a PIN, and try again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowLockDialog(false)
                    setUnlockPin('')
                    setUnlockError('')
                  }}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-colors border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  value={unlockPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setUnlockPin(val)
                    setUnlockError('')
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && unlockPin.length === 4) {
                      if (unlockPin === data.pin) {
                        const ok = await onLock(item.id, unlockPin)
                        if (ok) {
                          setShowLockDialog(false)
                          setUnlockPin('')
                          setUnlockError('')
                        }
                      } else {
                        setUnlockError('Incorrect card PIN')
                      }
                    }
                  }}
                  placeholder="Enter Card PIN (4 digits)"
                  className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl px-4 py-3 outline-none placeholder:font-sans placeholder:text-[#444444] border-0 mb-1"
                  autoFocus
                />
                {unlockError && <p className="text-xs text-red-400 font-semibold mb-2">{unlockError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (unlockPin !== data.pin) {
                        setUnlockError('Incorrect card PIN')
                        return
                      }
                      const ok = await onLock(item.id, unlockPin)
                      if (ok) {
                        setShowLockDialog(false)
                        setUnlockPin('')
                        setUnlockError('')
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                      unlockPin.length === 4
                        ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)] border-0'
                        : 'bg-red-950/40 text-red-400 hover:bg-red-900/10 border border-red-500/20'
                    }`}
                  >
                    Lock Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLockDialog(false)
                      setUnlockPin('')
                      setUnlockError('')
                    }}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-colors border-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlock Dialog overlay */}
      {showUnlockPrompt && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center" 
          style={{ zIndex: 9999 }}
          onClick={() => setShowUnlockPrompt(false)}
        >
          <div 
            className="bg-[#1E1E1E] rounded-2xl p-6 w-80 shadow-2xl border border-zinc-800 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#F0F0F0]">
                Unlock Card Profile
              </h3>
            </div>
            <p className="text-[12.5px] text-[#A0A0A0] mb-4">
              Enter your secure 4-digit card PIN to move this card profile back to your unlocked public view.
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={unlockPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setUnlockPin(val)
                setUnlockError('')
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && unlockPin.length === 4) {
                  const ok = await onUnlock(item.id, unlockPin)
                  if (ok) {
                    setShowUnlockPrompt(false)
                    setUnlockPin('')
                    setUnlockError('')
                  } else {
                    setUnlockError('Incorrect PIN')
                  }
                }
              }}
              placeholder="Enter PIN (4 digits)"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl px-4 py-3 outline-none placeholder:font-sans placeholder:text-[#444444] border-0 mb-3"
              autoFocus
            />
            {unlockError && <p className="text-xs text-red-400 mb-3 font-semibold">{unlockError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await onUnlock(item.id, unlockPin)
                  if (ok) {
                    setShowUnlockPrompt(false)
                    setUnlockPin('')
                    setUnlockError('')
                  } else {
                    setUnlockError('Incorrect PIN')
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  unlockPin.length === 4
                    ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)] border-0'
                    : 'bg-red-950/40 text-red-400 hover:bg-red-900/10 border border-red-500/20'
                }`}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnlockPrompt(false)
                  setUnlockPin('')
                  setUnlockError('')
                }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-[#2A2A2A] text-[#888888] hover:text-[#C0C0C0] transition-colors border-0 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
