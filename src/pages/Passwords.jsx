// Main Passwords page
// Left list takes full responsive space, right side is detailed preview
// Password create/edit forms open in popup modal

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Plus, Search, Star, X, Filter,
  Key, Shield, AlertTriangle, TrendingUp,
  ChevronRight, ChevronLeft, Lock, Globe, SlidersHorizontal,
  Zap, History
} from 'lucide-react'
import { usePasswords } from '../hooks/usePasswords'
import PasswordDetail from '../components/passwords/PasswordDetail'
import PasswordAvatar from '../components/passwords/PasswordAvatar'
import PasswordForm from '../components/passwords/PasswordForm'
import PasswordGenerator from '../components/passwords/PasswordGenerator'
import { 
  checkPasswordStrength,
  PASSWORD_CATEGORIES,
  getCategoryColor,
} from '../utils/passwordUtils'
import { createPortal } from 'react-dom'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import { getVaultMeta, saveVaultMeta } from '../db/vaultOperations'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// ── PASSWORD LIST ITEM ────────────────────────────

const PasswordListItem = React.memo(
  function PasswordListItem({ 
    item, isActive, onClick, customCategories = []
  }) {
    const data = item.data || {}
    const strength = checkPasswordStrength(
      data.password || ''
    )
    
    // Resolve custom category color if custom, otherwise use default lookup
    const combined = [...PASSWORD_CATEGORIES, ...customCategories]
    const matchedCategory = combined.find(c => c.id === data.category)
    const catColor = matchedCategory?.color || '#888888'

    const initial = (data.siteName || item.title || '?')
      .charAt(0).toUpperCase()

    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-all duration-150 ${
          isActive 
            ? 'bg-zinc-200 dark:bg-[#252525] text-zinc-900 dark:text-white' 
            : 'hover:bg-zinc-100 dark:hover:bg-[#1E1E1E]'
        }`}
      >
        {/* Avatar */}
        <PasswordAvatar
          url={data.url}
          siteName={data.siteName || item.title}
          catColor={catColor}
          size="w-10 h-10"
          textSize="text-[16px]"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-zinc-800 dark:text-[#F0F0F0] truncate">
              {data.siteName || item.title || 'Untitled'}
            </p>
            {item.isFavorite && (
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-[12px] text-zinc-500 dark:text-[#888888] truncate mt-0.5">
            {data.username || 'No email or username'}
          </p>
        </div>

        {/* Strength dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ 
            backgroundColor: data.password
              ? strength.color
              : '#333333'
          }}
          title={`Password: ${strength.label}`}
        />
      </div>
    )
  }
)

// ── MAIN PAGE ─────────────────────────────────────

export function Passwords() {
  const pw = usePasswords()
  
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [view, setView] = useState('list')
  // 'list' | 'detail' | 'add' | 'edit'

  const [editingItem, setEditingItem] = useState(null)
  const [stats, setStats] = useState(null)
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false)
  const [showHistoryOnlyModal, setShowHistoryOnlyModal] = useState(false)
  const [generatorInitialShowHistory, setGeneratorInitialShowHistory] = useState(false)
  const [customCategories, setCustomCategories] = useState([])

  const searchInputRef = useRef(null)

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onNew: () => {
      handleAddNew()
    },
    onEscape: () => {
      if (view === 'detail') {
        setView('list')
        pw.setActiveId(null)
      } else if (view === 'add' || view === 'edit') {
        setView('list')
      }
    }
  })

  // Resizable panel states & refs
  const [leftWidthPercent, setLeftWidthPercent] = useState(40)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = React.useRef(null)
  const categoriesScrollRef = React.useRef(null)

  const scrollCategories = (direction) => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 180
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Track responsive screen sizing
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Start drag interaction
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  // Run dynamic calculation on drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidthPx = e.clientX - containerRect.left
      const percent = (newWidthPx / containerRect.width) * 100
      // Clamped between 25% and 65% for ultimate visual stability
      const clampedPercent = Math.max(25, Math.min(65, percent))
      setLeftWidthPercent(clampedPercent)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Load stats on mount
  useEffect(() => {
    if (pw.getStats) {
      pw.getStats().then(setStats)
    }
  }, [pw.passwords, pw.getStats])

  // Load custom categories from encrypted vault metadata
  useEffect(() => {
    async function loadCats() {
      if (!derivedKey) return
      try {
        const stored = await getVaultMeta('custom_password_categories', derivedKey)
        if (stored && Array.isArray(stored)) {
          setCustomCategories(stored)
        }
      } catch (err) {
        console.error('Failed to load custom password categories:', err)
      }
    }
    loadCats()
  }, [derivedKey])

  const handleAddCustomCategory = async (newCat) => {
    if (!derivedKey) return
    const updated = [...customCategories, newCat]
    setCustomCategories(updated)
    try {
      await saveVaultMeta('custom_password_categories', updated, derivedKey)
      addToast({
        variant: 'success',
        title: 'Category Created',
        description: `Theme category "${newCat.label}" has been added.`,
        duration: 2000
      })
    } catch (err) {
      console.error('Failed to save categories:', err)
    }
  }

  const handleDeleteCustomCategory = async (idOfCat) => {
    if (!derivedKey) return
    const updated = customCategories.filter(c => c.id !== idOfCat)
    setCustomCategories(updated)
    try {
      await saveVaultMeta('custom_password_categories', updated, derivedKey)
      addToast({
        variant: 'success',
        title: 'Category Deleted',
        description: 'Category removed from your custom list.',
        duration: 2000
      })
      // Reset active filter if matches deleted custom category
      if (pw.filterCategory === idOfCat) {
        pw.setFilterCategory('all')
      }
    } catch (err) {
      console.error('Failed to delete category:', err)
    }
  }

  const handleItemClick = async (item) => {
    await pw.openPassword(item.id)
    setView('detail')
  }

  const handleAddNew = () => {
    setEditingItem(null)
    setView('add')
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setView('edit')
  }

  const handleSaveNew = async (formData) => {
    const created = await pw.createPassword(formData)
    if (created) {
      await pw.openPassword(created.id)
      setView('detail')
      // Refresh stats
      pw.getStats().then(setStats)
    }
  }

  const handleSaveEdit = async (formData) => {
    if (!editingItem) return
    const ok = await pw.updatePassword(
      editingItem.id, formData
    )
    if (ok) {
      setView('detail')
      pw.getStats().then(setStats)
    }
  }

  const handleDelete = async (id) => {
    const ok = await pw.deletePassword(id)
    if (ok) {
      setView('list')
      pw.getStats().then(setStats)
    }
  }

  const handleToggleFavorite = async (id) => {
    await pw.toggleFavoritePassword(id)
    if (pw.getStats) {
      pw.getStats().then(setStats)
    }
  }

  const combinedCategoriesForFilter = [...PASSWORD_CATEGORIES, ...customCategories]

  return (
    <div 
      ref={containerRef} 
      className={`flex h-full overflow-hidden w-full ${isDragging ? 'select-none' : ''}`}
    >
      
      {/* RESPONSIVE LEFT PANEL — Wide password list */}
      <div 
        className="w-full flex-shrink-0 flex flex-col overflow-hidden bg-[#F5F5F5] dark:bg-[#1C1C1C] rounded-l-2xl"
        style={{ 
          width: isMobile ? '100%' : `${leftWidthPercent}%`,
          flex: isMobile ? '1' : 'none'
        }}
      >
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-[24px] font-semibold text-zinc-900 dark:text-[#F0F0F0]">
              Passwords
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowHistoryOnlyModal(true)
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-700 dark:text-[#888888] dark:hover:text-[#C0C0C0] hover:bg-zinc-200 dark:hover:bg-[#252525] transition-all"
                title="Generation History"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeneratorInitialShowHistory(false)
                  setShowGeneratorPanel(true)
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-zinc-400 hover:text-zinc-700 dark:text-[#888888] dark:hover:text-[#C0C0C0] hover:bg-zinc-200 dark:hover:bg-[#252525] transition-all"
                title="Password Generator"
              >
                <Zap className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleAddNew}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl cursor-pointer bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] hover:bg-[#333333] dark:hover:bg-[#DDDDDD] transition-all text-[13px] font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Password
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 dark:text-[#555555] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by service name, username, or website..."
              value={pw.searchQuery}
              onChange={e => pw.setSearchQuery(e.target.value)}
              className="w-full bg-[#EAEAEA] dark:bg-[#141414] text-zinc-800 dark:text-[#F0F0F0] text-[13.5px] rounded-xl pl-10 pr-5 py-3 outline-none placeholder:text-zinc-500 dark:placeholder:text-[#444444] transition-colors focus:bg-[#E2E2E2] dark:focus:bg-[#1A1A1A]"
            />
            {pw.searchQuery && (
              <button
                type="button"
                onClick={() => pw.setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-[#555555] hover:text-[#C0C0C0]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Combined Category filter list */}
          <div className="relative flex items-center mt-3.5 group select-none">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="absolute left-0 top-0 bottom-1.5 z-10 w-12 flex items-center justify-start pl-1 bg-gradient-to-r from-[#F5F5F5] dark:from-[#181818] via-[#F5F5F5]/90 dark:via-[#181818]/90 to-transparent text-[#888888] hover:text-white transition-opacity duration-150 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              title="Scroll Left"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-[#202020] hover:bg-zinc-300 dark:hover:bg-[#2F2F2F] flex items-center justify-center transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Scrollable List container */}
            <div 
              ref={categoriesScrollRef}
              className="w-full flex gap-2 overflow-x-auto scrollbar-none pb-1.5 px-8"
            >
              <button
                type="button"
                onClick={() => {
                  pw.setFilterCategory('all')
                  pw.setShowFavoritesOnly(false)
                  pw.setFilterStrength('all')
                }}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium flex-shrink-0 cursor-pointer transition-colors ${
                  pw.filterCategory === 'all' && !pw.showFavoritesOnly && pw.filterStrength === 'all'
                    ? 'bg-zinc-250 dark:bg-[#333333] text-zinc-900 dark:text-[#F0F0F0]'
                    : 'text-zinc-500 dark:text-[#666666] hover:text-zinc-800 dark:hover:text-[#C0C0C0] hover:bg-zinc-200 dark:hover:bg-[#202020]'
                }`}
              >
                All
              </button>
              
              <button
                type="button"
                onClick={() => {
                  pw.setShowFavoritesOnly(true)
                  pw.setFilterCategory('all')
                  pw.setFilterStrength('all')
                }}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium flex-shrink-0 cursor-pointer transition-colors flex items-center gap-1 ${
                  pw.showFavoritesOnly
                    ? 'bg-amber-550/20 dark:bg-amber-500/20 text-amber-620 dark:text-amber-400'
                    : 'text-zinc-500 dark:text-[#666666] hover:text-[#C0C0C0] hover:bg-[#202020]'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-current fill-current" />
                Starred
              </button>

              {combinedCategoriesForFilter.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    pw.setFilterCategory(cat.id)
                    pw.setShowFavoritesOnly(false)
                    pw.setFilterStrength('all')
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium flex-shrink-0 cursor-pointer transition-all ${
                    pw.filterCategory === cat.id && !pw.showFavoritesOnly
                      ? 'text-zinc-800 dark:text-[#F0F0F0]'
                      : 'text-zinc-500 dark:text-[#666666] hover:text-zinc-800 dark:hover:text-[#C0C0C0] hover:bg-zinc-250 dark:hover:bg-[#202020]'
                  }`}
                  style={pw.filterCategory === cat.id && !pw.showFavoritesOnly
                    ? { backgroundColor: cat.color + '25', color: cat.color }
                    : {}
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="absolute right-0 top-0 bottom-1.5 z-10 w-12 flex items-center justify-end pr-1 bg-gradient-to-l from-[#F5F5F5] dark:from-[#181818] via-[#F5F5F5]/90 dark:via-[#181818]/90 to-transparent text-[#888888] hover:text-white transition-opacity duration-150 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              title="Scroll Right"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-[#202020] hover:bg-zinc-300 dark:hover:bg-[#2F2F2F] flex items-center justify-center transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && stats.total > 0 && (
          <div className="px-6 py-2 flex items-center gap-2.5 flex-shrink-0 bg-zinc-200 dark:bg-[#161616]">
            <div 
              onClick={() => {
                const next = pw.filterStrength === 'strong' ? 'all' : 'strong'
                pw.setFilterStrength(next)
                if (next === 'strong') {
                  pw.setFilterCategory('all')
                  pw.setShowFavoritesOnly(false)
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                pw.filterStrength === 'strong'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                  : 'text-zinc-500 dark:text-[#888888] hover:text-zinc-800 dark:hover:text-[#C0C0C0] hover:bg-[#202020]'
              }`}
            >
              <Shield className="w-4 h-4 text-green-550" />
              <span className="text-[12px] selection:bg-transparent">
                {stats.strong} strong passwords
              </span>
            </div>
            
            {stats.weak > 0 && (
              <div 
                onClick={() => {
                  const next = pw.filterStrength === 'weak' ? 'all' : 'weak'
                  pw.setFilterStrength(next)
                  if (next === 'weak') {
                     pw.setFilterCategory('all')
                     pw.setShowFavoritesOnly(false)
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  pw.filterStrength === 'weak'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-medium'
                    : 'text-zinc-500 dark:text-[#888888] hover:text-zinc-800 dark:hover:text-[#C0C0C0] hover:bg-[#202020]'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-[12px] selection:bg-transparent">
                  {stats.weak} weak passwords
                </span>
              </div>
            )}
            
            <span className="text-[12px] text-zinc-500 dark:text-[#555555] ml-auto select-none">
              Total: {stats.total} passwords
            </span>
          </div>
        )}

        {/* Password list */}
        <div className="flex-1 overflow-y-auto">
          {pw.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map(
                (_, i) => (
                  <div key={i}
                    className="h-16 rounded-xl bg-zinc-250 dark:bg-[#1A1A1A] animate-pulse"
                    style={{ opacity: 0.3 + i * 0.1 }}
                  />
                )
              )}
            </div>
          ) : pw.passwords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
              <Key className="w-10 h-10 text-zinc-300 dark:text-[#2C2C2C]" />
              <p className="text-[15px] font-medium text-zinc-500 dark:text-[#666666]">
                {pw.searchQuery ? 'No matched passwords' : 'No passwords stored yet'}
              </p>
              {!pw.searchQuery && (
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="text-[13px] text-zinc-400 hover:text-zinc-700 dark:text-[#888888] dark:hover:text-[#C0C0C0] cursor-pointer transition-colors mt-1"
                >
                  + Add your first password credential
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {pw.passwords.map(item => (
                <PasswordListItem
                  key={item.id}
                  item={item}
                  customCategories={customCategories}
                  isActive={pw.activeId === item.id}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Splitter Drag Handle */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className="w-[3px] flex-shrink-0 resizer-horiz-custom select-none relative bg-transparent hover:bg-transparent"
          title="Drag to resize panels"
        >
          {/* Transparent hit area so it is incredibly easy to grab */}
          <div className="absolute -inset-x-2.5 top-0 bottom-0 resizer-horiz-custom z-50 pointer-events-auto" />
        </div>
      )}

      {/* COMPACT DETAILED PREVIEW */}
      <div 
        className="w-full flex-shrink-0 overflow-hidden bg-white dark:bg-[#1E1E1E]"
        style={{ 
          width: isMobile ? '100%' : `${100 - leftWidthPercent}%`,
          flex: isMobile ? '1' : 'none'
        }}
      >
        {pw.activePassword ? (
          <PasswordDetail
            item={pw.activePassword}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            customCategories={customCategories}
          />
        ) : (
          /* Detail Empty State */
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-[#141414] flex items-center justify-center">
              <Key className="w-8 h-8 text-zinc-400 dark:text-[#555555]" />
            </div>
            <p className="text-[15px] font-medium text-zinc-500 dark:text-[#888888]">
              No Password Selected
            </p>
            <p className="text-[13px] text-zinc-400 dark:text-[#555555] max-w-sm">
              Select a password from the list to view its contents, notes, and strength details.
            </p>
            <button
              type="button"
              onClick={handleAddNew}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] dark:bg-[#F0F0F0] text-white dark:text-[#141414] text-[13px] font-medium cursor-pointer hover:bg-[#333333] dark:hover:bg-[#DDDDDD] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Password
            </button>
          </div>
        )}
      </div>

      {/* NEW/EDIT POPUP MODAL */}
      {(view === 'add' || view === 'edit') && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9990] animate-fade-in">
          <div className="bg-white dark:bg-[#1C1C1C] w-full max-w-lg rounded-2xl max-h-[90vh] flex flex-col p-6 animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-[18px] font-semibold text-zinc-900 dark:text-[#F0F0F0]">
                {view === 'add' ? 'Add Vault Password' : 'Edit Credentials'}
              </h3>
              <button
                type="button"
                onClick={() => setView(pw.activePassword ? 'detail' : 'list')}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-[#252525] text-zinc-500 dark:text-[#888888] hover:text-zinc-800 dark:hover:text-[#C0C0C0] transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 pr-1">
              <PasswordForm
                initial={view === 'edit' ? editingItem : null}
                onSave={view === 'add' ? handleSaveNew : handleSaveEdit}
                onCancel={() => setView(pw.activePassword ? 'detail' : 'list')}
                isSaving={pw.isSaving}
                customCategories={customCategories}
                onAddCustomCategory={handleAddCustomCategory}
                onDeleteCustomCategory={handleDeleteCustomCategory}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Password Generator Sidebar Panel */}
      {showGeneratorPanel && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 9996 }}
            onClick={() => setShowGeneratorPanel(false)}
          />
          <div
            className="fixed right-0 top-0 h-full w-96 overflow-y-auto py-6 px-4 bg-white dark:bg-[#181818]"
            style={{ zIndex: 9997 }}
            onClick={e => e.stopPropagation()}
          >
            <PasswordGenerator
              key={showGeneratorPanel ? `gen-${generatorInitialShowHistory}` : 'inactive'}
              passwords={pw.passwords}
              defaultShowHistory={generatorInitialShowHistory}
              onClose={() => setShowGeneratorPanel(false)}
            />
          </div>
        </>,
        document.body
      )}

      {/* Standalone History Only Modal Overlay */}
      {showHistoryOnlyModal && (
        <PasswordGenerator
          historyOnly={true}
          passwords={pw.passwords}
          onCloseHistory={() => setShowHistoryOnlyModal(false)}
        />
      )}
    </div>
  )
}

export default Passwords;
