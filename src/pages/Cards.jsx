// Central Payment Cards dashboard displaying secure credit, debit, prepaid, and virtual card list and detail profiles with inline editors.

import React, { useState, useRef, useCallback } from 'react'
import {
  Plus, Search, Star, CreditCard,
  AlertTriangle, Lock, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useCards } from '../hooks/useCards'
import CardVisual from '../components/cards/CardVisual'
import CardDetail from '../components/cards/CardDetail'
import CardForm from '../components/cards/CardForm'
import {
  CARD_CATEGORIES, isCardExpired, isCardExpiringSoon
} from '../utils/cardUtils'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

// ── CARD LIST ITEM ────────────────────────────────

const CardListItem = React.memo(
  function CardListItem({ item, isActive, onClick, isBlurred }) {
    const data = item.data || {}
    const expired = isCardExpired(data.expiry || '')
    const expiringSoon = isCardExpiringSoon(data.expiry || '')
    
    return (
      <div
        onClick={onClick}
        className={`p-4 cursor-pointer transition-all duration-150 relative border-b border-[#1A1A1A] ${
          isActive
            ? 'bg-[#222222]'
            : expiringSoon && !expired
              ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]'
              : expired
                ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]'
                : 'hover:bg-[#1A1A1A]'
        } ${
          expiringSoon && !expired
            ? 'border-l-[3px] border-amber-500'
            : expired
              ? 'border-l-[3px] border-red-500'
              : ''
        }`}
      >
        <div className={`transition-all duration-300 ${isBlurred ? 'filter blur-[10px] pointer-events-none select-none scale-95 opacity-50' : ''}`}>
          <div className="flex justify-center select-none overflow-hidden rounded-xl">
            <CardVisual
              card={data}
              size="small"
              showFull={false}
              enable3D={false}
            />
          </div>
          <div className="mt-3 flex items-center justify-between px-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#F0F0F0] truncate">
                {data.label || data.bankName || 'My Card'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-[#777777] uppercase tracking-wider text-[10px] font-medium truncate">
                  {CARD_CATEGORIES.find(
                    c => c.id === data.category
                  )?.label || 'Card'}
                </span>
                {!expired && expiringSoon && (
                  <span className="text-[8px] flex-shrink-0 px-1 py-0.5 select-none border border-amber-500/20 bg-amber-500/10 text-amber-500 rounded font-black tracking-wider leading-none">
                    SOON
                  </span>
                )}
                {expired && (
                  <span className="text-[8px] flex-shrink-0 px-1 py-0.5 select-none border border-red-500/20 bg-red-500/10 text-red-500 rounded font-black tracking-wider leading-none">
                    EXP
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
              {expired && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" title="Expired Card" />
              )}
              {!expired && expiringSoon && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" title="Expiring Soon" />
              )}
              {item.isFavorite && (
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              )}
              {item.isLocked && (
                <Lock className="w-3 text-[#EF4444]" />
              )}
            </div>
          </div>
        </div>

        {isBlurred && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 pointer-events-none rounded-xl">
            <Lock className="w-6 h-6 text-red-400 animate-pulse mb-1" />
            <span className="text-[10px] tracking-widest uppercase text-red-400 font-bold bg-black/40 px-2 py-0.5 rounded-md border border-red-500/20">LOCKED</span>
          </div>
        )}
      </div>
    )
  }
)

const FILTER_TABS = [
  { id: 'all',     label: 'All' },
  { id: 'credit',  label: 'Credit' },
  { id: 'debit',   label: 'Debit' },
  { id: 'locked',  label: 'Locked', icon: Lock },
  { id: 'prepaid', label: 'Prepaid' },
  { id: 'virtual', label: 'Virtual' },
]

// ── MAIN PAGE ─────────────────────────────────────

export function Cards() {
  const cards = useCards()
  const [view, setView] = useState('list')
  const [editingItem, setEditingItem] = useState(null)
  const [decryptedIds, setDecryptedIds] = useState([])

  const categoriesScrollRef = useRef(null)

  const scrollCategories = (direction) => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 140
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // PIN entry prompt states for locked items
  const [promptPinId, setPromptPinId] = useState(null)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinPromptError, setPinPromptError] = useState('')

  const searchInputRef = useRef(null)

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onNew: () => {
      setView('add')
    },
    onEscape: () => {
      if (promptPinId) {
        setPromptPinId(null)
      } else if (view === 'detail') {
        setView('list')
        cards.setActiveId(null)
      } else if (view === 'add' || view === 'edit') {
        setView('list')
      }
    }
  })

  const handleItemClick = useCallback(async (item) => {
    if (item.isLocked && !decryptedIds.includes(item.id)) {
      setPromptPinId(item.id)
      setEnteredPin('')
      setPinPromptError('')
    } else {
      await cards.openCard(item.id)
      setView('detail')
    }
  }, [cards, decryptedIds])

  const handleEdit = useCallback((item) => {
    setEditingItem(item)
    setView('edit')
  }, [])

  const handleSaveNew = useCallback(async (formData) => {
    const created = await cards.createCard(formData)
    if (created) {
      await cards.openCard(created.id)
      setView('detail')
    }
  }, [cards])

  const handleSaveEdit = useCallback(async (formData) => {
    if (!editingItem) return
    const ok = await cards.updateCard(
      editingItem.id, formData
    )
    if (ok) setView('detail')
  }, [editingItem, cards])

  const handleDelete = useCallback(async (id) => {
    const ok = await cards.deleteCard(id)
    if (ok) setView('list')
  }, [cards])

  return (
    <div className="flex h-full overflow-hidden bg-[#141414] select-none text-zinc-100">
      
      {/* LEFT PANEL */}
      <div 
        className="w-80 flex-shrink-0 flex flex-col overflow-hidden bg-[#181818] rounded-l-2xl border-r border-[#222222]"
      >
        
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-semibold text-[#F0F0F0]">
              Credit & Debit Cards
            </h2>
            <button
              type="button"
              onClick={() => {
                cards.setActiveId(null)
                setEditingItem(null)
                setView('add')
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD] transition-all border-0 outline-none"
              title="Add secure payment card"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search secure profiles..."
              value={cards.searchQuery}
              onChange={e => cards.setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] text-[#F0F0F0] text-[13px] rounded-xl pl-9 pr-4 py-2.5 outline-none placeholder:text-[#555555] border-0"
            />
          </div>

          {/* Filter tabs wrapper */}
          <div className="relative flex items-center mt-2 group select-none">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-start pl-0.5 bg-gradient-to-r from-[#181818] via-[#181818]/95 to-transparent text-[#888888] hover:text-white transition-opacity duration-100 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto border-0 bg-transparent"
              title="Scroll Left"
            >
              <div className="w-6 h-6 rounded-full bg-[#202020] hover:bg-[#2F2F2F] flex items-center justify-center transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Scrollable Container */}
            <div 
              ref={categoriesScrollRef}
              className="w-full flex gap-1 items-center overflow-x-auto scrollbar-none py-1 flex-nowrap px-6"
            >
              {FILTER_TABS.map((tab) => (
                <React.Fragment key={tab.id}>
                  <button
                    type="button"
                    onClick={() => cards.setFilterCategory(tab.id)}
                    className={`
                      flex items-center gap-1.5 flex-shrink-0
                      px-3 py-1 rounded-lg text-[12px] font-medium uppercase tracking-wider
                      cursor-pointer transition-colors border-0 outline-none
                      ${cards.filterCategory === tab.id
                        ? tab.id === 'locked'
                          ? 'bg-red-500/20 text-red-400 font-bold'
                          : 'bg-[#333333] text-[#F0F0F0]'
                        : 'text-[#666666] hover:text-[#C0C0C0] bg-transparent'
                      }`}
                  >
                    {tab.icon && (
                      <tab.icon className="w-3 h-3 text-red-500 mr-0.5" />
                    )}
                    {tab.label}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-end pr-0.5 bg-gradient-to-l from-[#181818] via-[#181818]/95 to-transparent text-[#888888] hover:text-white transition-opacity duration-100 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto border-0 bg-transparent"
              title="Scroll Right"
            >
              <div className="w-6 h-6 rounded-full bg-[#202020] hover:bg-[#2F2F2F] flex items-center justify-center transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>

        {/* Separator background boundary */}
        <div className="w-full h-[1px] bg-[#222222]" />

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto">
          {cards.isLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 3 }).map(
                (_, i) => (
                  <div key={i} className="h-44 rounded-xl bg-[#1A1A1A] animate-pulse" />
                )
              )}
            </div>
          ) : cards.cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 px-4 text-center">
              <CreditCard className="w-8 h-8 text-[#333333]" />
              <p className="text-[13px] text-[#555555]">
                {cards.searchQuery
                  ? 'No matching cards'
                  : 'Zero stored profiles'
                }
              </p>
              {!cards.searchQuery && (
                <button
                  type="button"
                  onClick={() => setView('add')}
                  className="text-[12px] text-[#888888] hover:text-[#C0C0C0] cursor-pointer transition-colors border-0 bg-transparent"
                >
                  + Add secure bank card
                </button>
              )}
            </div>
          ) : (
            cards.cards.map(item => (
              <CardListItem
                key={item.id}
                item={item}
                isActive={cards.activeId === item.id}
                isBlurred={item.isLocked && !decryptedIds.includes(item.id)}
                onClick={() => handleItemClick(item)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL (Card details side) */}
      <div className="flex-1 overflow-hidden bg-[#111111]">
        {view === 'list' && (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#181818] flex items-center justify-center border border-[#222222] text-[#333333] mb-2 shadow-inner">
              <CreditCard className="w-8 h-8" />
            </div>
            <p className="text-[14px] text-[#888888] font-medium">
              Select any card profile to securely decrypt details
            </p>
            <button
              type="button"
              onClick={() => setView('add')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F0F0F0] text-[#141414] text-[13px] font-semibold cursor-pointer hover:bg-[#DDDDDD] transition-all border-0 outline-none"
            >
              <Plus className="w-4 h-4" />
              Add bank card
            </button>
          </div>
        )}

        {view === 'detail' && cards.activeCard && (
          <CardDetail
            item={cards.activeCard}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleFavorite={cards.toggleFavoriteCard}
            onLock={cards.lockCard}
            onUnlock={cards.unlockCard}
          />
        )}

        {(view === 'add' || view === 'edit') && (
          <div className="h-full flex flex-col overflow-y-auto p-6 max-w-2xl mx-auto animate-fade-in animate-slide-up">
            <h2 className="text-[19px] font-semibold text-[#F0F0F0] mb-4">
              {view === 'add'
                ? 'Add Cryptocard Profile'
                : 'Modify Cryptocard Details'
              }
            </h2>
            <CardForm
              initial={view === 'edit' ? editingItem : null}
              onSave={view === 'add' ? handleSaveNew : handleSaveEdit}
              onCancel={() => setView(
                cards.activeCard ? 'detail' : 'list'
              )}
              isSaving={cards.isSaving}
            />
          </div>
        )}
      </div>

      {/* PIN Decrypt Verification dialog Overlay for locked card item clicking */}
      {promptPinId && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999]" 
          onClick={() => setPromptPinId(null)}
        >
          <div 
            className="bg-[#1E1E1E] rounded-2xl p-6 w-80 shadow-2xl border border-zinc-800 animate-slide-up" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#F0F0F0]">
                Enter Security PIN
              </h3>
            </div>
            <p className="text-[12.5px] text-[#A0A0A0] mb-4">
              This card profile is encrypted. Provide the security PIN configured for this specific item profile to view details.
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={enteredPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setEnteredPin(val)
                setPinPromptError('')
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && enteredPin.length === 4) {
                  const isValid = await cards.verifyPinForView(promptPinId, enteredPin)
                  if (isValid) {
                    setDecryptedIds(prev => [...prev, promptPinId])
                    await cards.openCard(promptPinId)
                    setView('detail')
                    setPromptPinId(null)
                    setEnteredPin('')
                  } else {
                    setPinPromptError('Incorrect PIN')
                  }
                }
              }}
              placeholder="Enter PIN (4 digits)"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl px-4 py-3 outline-none placeholder:font-sans placeholder:text-[#444444] border-0 mb-3"
              autoFocus
            />
            {pinPromptError && <p className="text-xs text-red-400 mb-3 font-semibold">{pinPromptError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const isValid = await cards.verifyPinForView(promptPinId, enteredPin)
                  if (isValid) {
                    setDecryptedIds(prev => [...prev, promptPinId])
                    await cards.openCard(promptPinId)
                    setView('detail')
                    setPromptPinId(null)
                    setEnteredPin('')
                  } else {
                    setPinPromptError('Incorrect PIN')
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  enteredPin.length === 4
                    ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)] border-0'
                    : 'bg-[#222] text-[#F0F0F0] hover:bg-[#333] border border-red-500/20'
                }`}
              >
                Decrypt
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptPinId(null)
                  setEnteredPin('')
                  setPinPromptError('')
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

export default Cards;
