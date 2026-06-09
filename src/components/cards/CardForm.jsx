// Form control component for editing or creating credit profile metadata, styles, codes, and details.

import { useState } from 'react'
import { 
  CreditCard, User, Calendar, Lock,
  Building, Eye, EyeOff, Check
} from 'lucide-react'
import {
  formatCardNumber, formatExpiry,
  detectCardType, getCardTypeLabel,
  CARD_CATEGORIES,
} from '../../utils/cardUtils'
import { BANK_CARD_STYLES } from '../../utils/cardStyles'
import CardVisual from './CardVisual'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const EMPTY = {
  label: '',
  cardNumber: '',
  cardName: '',
  expiry: '',
  cvv: '',
  bankName: '',
  category: 'debit',
  colorId: 'custom-black',
  billingAddress: '',
  notes: '',
  pin: '',
}

export default function CardForm({
  initial = null,
  onSave,
  onCancel,
  isSaving = false,
}) {
  const [form, setForm] = useState(
    initial ? {
      label: initial.data?.label || '',
      cardNumber: initial.data?.cardNumber || '',
      cardName: initial.data?.cardName || '',
      expiry: initial.data?.expiry || '',
      cvv: initial.data?.cvv || '',
      bankName: initial.data?.bankName || '',
      category: initial.data?.category || 'debit',
      colorId: initial.data?.colorId || 'custom-black',
      billingAddress: initial.data?.billingAddress || '',
      notes: initial.data?.notes || '',
      pin: initial.data?.pin || '',
    } : { ...EMPTY }
  )

  const [showCVV, setShowCVV] = useState(false)
  const [showPIN, setShowPIN] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeSection, setActiveSection] = useState('basic')

  const cardType = detectCardType(form.cardNumber)

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key]) {
      setErrors(p => ({ ...p, [key]: null }))
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.cardNumber.replace(/\D/g, '')) {
      errs.cardNumber = 'Card number required'
    }
    if (!form.cardName.trim()) {
      errs.cardName = 'Cardholder name required'
    }
    if (!form.expiry) {
      errs.expiry = 'Expiry date required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await onSave(form)
  }

  useKeyboardShortcuts({
    onSave: () => {
      handleSubmit()
    }
  })

  return (
    <div className="space-y-5">
      
      {/* Live card preview */}
      <div className="flex justify-center py-4">
        <CardVisual
          card={{
            cardNumber: form.cardNumber,
            cardName: form.cardName,
            expiry: form.expiry,
            cvv: form.cvv,
            bankName: form.bankName,
            colorId: form.colorId,
          }}
          showFull={true}
        />
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#141414]">
        {[
          { id: 'basic', label: 'Card Details' },
          { id: 'style', label: 'Style' },
          { id: 'extra', label: 'Extra' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 ${
              activeSection === tab.id
                ? 'bg-[#2A2A2A] text-[#F0F0F0]'
                : 'text-[#666666] hover:text-[#888888]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* BASIC SECTION */}
      {activeSection === 'basic' && (
        <div className="space-y-4">
          
          {/* Card label/nickname */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Card Nickname
            </label>
            <input
              type="text"
              value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="e.g. My Salary Card"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl px-4 py-3 outline-none placeholder:text-[#444444] focus:bg-[#1A1A1A] transition-colors border-0"
            />
          </div>

          {/* Card number */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Card Number *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
              <input
                type="text"
                inputMode="numeric"
                value={form.cardNumber}
                onChange={e => {
                  const formatted = formatCardNumber(e.target.value, cardType)
                  set('cardNumber', formatted)
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={cardType === 'amex' ? 17 : 19}
                className={`w-full text-[#F0F0F0] text-[14px] font-mono rounded-xl pl-10 pr-16 py-3 outline-none placeholder:text-[#444444] placeholder:font-sans focus:bg-[#1A1A1A] transition-colors border-0 ${
                  errors.cardNumber
                    ? 'bg-[#2A1313]'
                    : 'bg-[#141414]'
                }`}
              />
              {/* Card type indicator */}
              {cardType !== 'other' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#888888] tracking-wider uppercase">
                  {getCardTypeLabel(cardType)}
                </span>
              )}
            </div>
            {errors.cardNumber && (
              <p className="text-[12px] text-red-400 mt-1">
                {errors.cardNumber}
              </p>
            )}
          </div>

          {/* Cardholder name */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Cardholder Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
              <input
                type="text"
                value={form.cardName}
                onChange={e => set('cardName', e.target.value.toUpperCase())}
                placeholder="AS ON CARD"
                className={`w-full text-[#F0F0F0] text-[14px] rounded-xl pl-10 pr-4 py-3 outline-none uppercase placeholder:text-[#444444] focus:bg-[#1A1A1A] transition-colors border-0 ${
                  errors.cardName
                    ? 'bg-[#2A1313]'
                    : 'bg-[#141414]'
                }`}
              />
            </div>
            {errors.cardName && (
              <p className="text-[12px] text-red-400 mt-1">
                {errors.cardName}
              </p>
            )}
          </div>

          {/* Expiry + CVV row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
                Expiry *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.expiry}
                  onChange={e => set('expiry', formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className={`w-full text-[#F0F0F0] text-[14px] rounded-xl pl-10 pr-3 py-3 outline-none font-mono placeholder:text-[#444444] placeholder:font-sans focus:bg-[#1A1A1A] transition-colors border-0 ${
                    errors.expiry
                      ? 'bg-[#2A1313]'
                      : 'bg-[#141414]'
                  }`}
                />
              </div>
              {errors.expiry && (
                <p className="text-[12px] text-red-400 mt-1">
                  {errors.expiry}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
                CVV
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
                <input
                  type={showCVV ? 'text' : 'password'}
                  inputMode="numeric"
                  value={form.cvv}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, cardType === 'amex' ? 4 : 3)
                    set('cvv', v)
                  }}
                  placeholder={cardType === 'amex' ? '4 digits' : '3 digits'}
                  maxLength={cardType === 'amex' ? 4 : 3}
                  className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl pl-10 pr-10 py-3 outline-none font-mono placeholder:text-[#444444] placeholder:font-sans focus:bg-[#1A1A1A] transition-colors border-0"
                />
                <button
                  type="button"
                  onClick={() => setShowCVV(p => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[#555555] hover:text-[#C0C0C0] transition-colors bg-transparent border-0 outline-none p-1"
                >
                  {showCVV
                    ? <EyeOff className="w-4 h-4 text-[#888888]" />
                    : <Eye className="w-4 h-4 text-[#888888]" />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Bank name */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Bank Name
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
              <input
                type="text"
                value={form.bankName}
                onChange={e => set('bankName', e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl pl-10 pr-4 py-3 outline-none placeholder:text-[#444444] focus:bg-[#1A1A1A] transition-colors border-0"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Card Type Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CARD_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => set('category', cat.id)}
                  className={`py-2 rounded-xl text-[13px] cursor-pointer transition-all duration-150 border-0 ${
                    form.category === cat.id
                      ? 'bg-[#F0F0F0] text-[#141414] font-medium'
                      : 'bg-[#1E1E1E] text-[#888888] hover:text-[#C0C0C0]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STYLE SECTION */}
      {activeSection === 'style' && (
        <div className="space-y-3">
          
          {/* Live preview */}
          <div className="flex justify-center py-2">
            <CardVisual
              card={{ ...form }}
              showFull={false}
              size="small"
              enable3D={false}
            />
          </div>
          
          {/* Style grid */}
          <p className="text-[11px] uppercase tracking-wider text-[#555555] font-medium">
            Choose style
          </p>
          
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {BANK_CARD_STYLES.map(style => (
              <button
                key={style.id}
                type="button"
                onClick={() => set('colorId', style.id)}
                className={`relative h-16 rounded-xl cursor-pointer transition-all overflow-hidden text-left border-0 ${
                  form.colorId === style.id
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141414]'
                    : 'hover:scale-[1.02] opacity-80'
                }`}
                style={{ background: style.bg }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: style.pattern,
                }} />
                <div style={{
                  position: 'relative',
                  padding: '8px 10px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: style.textColor,
                    opacity: 0.8,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    {style.bank || 'Custom'}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: style.textColor,
                  }}>
                    {style.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* EXTRA SECTION */}
      {activeSection === 'extra' && (
        <div className="space-y-4">
          {/* PIN */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              PIN (optional)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
              <input
                type={showPIN ? 'text' : 'password'}
                inputMode="numeric"
                value={form.pin}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                  set('pin', v)
                }}
                placeholder="4-6 digit PIN"
                maxLength={6}
                className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl pl-10 pr-10 py-3 outline-none placeholder:text-[#444444] placeholder:font-sans focus:bg-[#1A1A1A] transition-colors border-0"
              />
              <button
                type="button"
                onClick={() => setShowPIN(p => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[#555555] hover:text-[#C0C0C0] bg-transparent border-0 outline-none p-1"
              >
                {showPIN
                  ? <EyeOff className="w-4 h-4 text-[#888888]" />
                  : <Eye className="w-4 h-4 text-[#888888]" />
                }
              </button>
            </div>
          </div>

          {/* Billing address */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Billing Address
            </label>
            <textarea
              value={form.billingAddress}
              onChange={e => set('billingAddress', e.target.value)}
              placeholder="Street, City, Country..."
              rows={3}
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl px-4 py-3 outline-none placeholder:text-[#444444] resize-none focus:bg-[#1A1A1A] transition-colors border-0"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Customer service number, reward benefits, etc."
              rows={3}
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl px-4 py-3 outline-none placeholder:text-[#444444] resize-none focus:bg-[#1A1A1A] transition-colors border-0"
            />
          </div>
        </div>
      )}

      {/* Submit buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className={`flex-1 py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150 border-0 ${
            isSaving
              ? 'opacity-50 cursor-not-allowed bg-[#333333] text-[#888888]'
              : 'bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD]'
          }`}
        >
          {isSaving
            ? 'Saving...'
            : initial ? 'Save changes' : 'Save card'
          }
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl text-[14px] cursor-pointer bg-[#1E1E1E] text-[#888888] hover:text-[#C0C0C0] transition-colors border-0"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
