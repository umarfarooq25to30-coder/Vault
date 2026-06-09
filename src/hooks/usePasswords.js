// Complete password manager hook
// All operations are real and functional

import { useState, useCallback, useEffect } 
  from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import {
  createItem, getAllItems, getItem,
  updateItem, deleteItem, toggleFavorite,
} from '../db/vaultOperations'
import { 
  checkPasswordStrength,
  PASSWORD_CATEGORIES,
} from '../utils/passwordUtils'

export function usePasswords() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [passwords, setPasswords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [activePassword, setActivePassword] = 
    useState(null)
  // Full decrypted item for detail view

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = 
    useState('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFavoritesOnly, setShowFavoritesOnly] =
    useState(false)
  const [filterStrength, setFilterStrength] = useState('all')

  // ── LOAD ────────────────────────────────────────
  const loadPasswords = useCallback(async () => {
    if (!derivedKey) return
    setIsLoading(true)
    
    try {
      const result = await getAllItems(derivedKey, {
        type: 'password',
        sortBy,
        sortOrder,
      })
      
      let items = result.items
      
      // Client-side filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        items = items.filter(item =>
          item.title.toLowerCase().includes(q) ||
          (item.data?.username || '')
            .toLowerCase().includes(q) ||
          (item.data?.url || '')
            .toLowerCase().includes(q)
        )
      }
      
      if (filterCategory !== 'all') {
        items = items.filter(
          item => item.data?.category === 
            filterCategory
        )
      }
      
      if (showFavoritesOnly) {
        items = items.filter(item => item.isFavorite)
      }

      if (filterStrength === 'strong') {
        items = items.filter(item => (item.data?.strength || 0) >= 3)
      } else if (filterStrength === 'weak') {
        items = items.filter(item => (item.data?.strength || 0) <= 1)
      }
      
      setPasswords(items)
    } catch (err) {
      console.error('loadPasswords failed:', err)
      addToast({
        variant: 'danger',
        title: 'Failed to load passwords',
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [derivedKey, searchQuery, filterCategory,
      sortBy, sortOrder, showFavoritesOnly, filterStrength])

  useEffect(() => {
    if (derivedKey) loadPasswords()
  }, [derivedKey, searchQuery, filterCategory,
      sortBy, sortOrder, showFavoritesOnly, filterStrength])

  // ── OPEN (load full decrypted item) ─────────────
  const openPassword = useCallback(async (id) => {
    if (!derivedKey) return
    setActiveId(id)
    
    try {
      const full = await getItem(id, derivedKey)
      setActivePassword(full)
    } catch (err) {
      console.error('openPassword failed:', err)
      addToast({
        variant: 'danger',
        title: 'Could not open item',
        description: err.message,
      })
    }
  }, [derivedKey])

  // ── CREATE ───────────────────────────────────────
  const createPassword = useCallback(
    async (formData) => {
      if (!derivedKey) return null
      setIsSaving(true)
      
      try {
        const strength = checkPasswordStrength(
          formData.password
        )
        
        const item = await createItem({
          type: 'password',
          title: formData.siteName || 'Untitled',
          data: {
            siteName: formData.siteName || '',
            username: formData.username || '',
            password: formData.password || '',
            url: formData.url || '',
            notes: formData.notes || '',
            category: formData.category || 'other',
            strength: strength.score,
          },
          thumbnail: null,
          folderId: null,
          tags: formData.tags || [],
          isFavorite: false,
        }, derivedKey)
        
        await loadPasswords()
        
        addToast({
          variant: 'success',
          title: 'Password saved',
          description: `${
            formData.siteName
          } added to vault.`,
          duration: 3000,
        })
        
        return item
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to save',
          description: err.message,
        })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [derivedKey, loadPasswords]
  )

  // ── UPDATE ───────────────────────────────────────
  const updatePassword = useCallback(
    async (id, formData) => {
      if (!derivedKey) return false
      setIsSaving(true)
      
      try {
        const strength = checkPasswordStrength(
          formData.password
        )
        
        await updateItem(id, {
          title: formData.siteName || 'Untitled',
          data: {
            siteName: formData.siteName || '',
            username: formData.username || '',
            password: formData.password || '',
            url: formData.url || '',
            notes: formData.notes || '',
            category: formData.category || 'other',
            strength: strength.score,
          },
          tags: formData.tags || [],
        }, derivedKey)
        
        // Refresh active item
        const updated = await getItem(
          id, derivedKey
        )
        setActivePassword(updated)
        
        await loadPasswords()
        
        addToast({
          variant: 'success',
          title: 'Password updated',
          duration: 2000,
        })
        
        return true
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to update',
          description: err.message,
        })
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [derivedKey, loadPasswords]
  )

  // ── DELETE ───────────────────────────────────────
  const deletePassword = useCallback(async (id) => {
    if (!id) return false
    
    try {
      await deleteItem(id)
      
      // Update local state
      setPasswords(prev => 
        prev.filter(p => p.id !== id)
      )
      
      // Clear active if deleted
      if (activeId === id) {
        setActiveId(null)
        setActivePassword(null)
      }
      
      addToast({
        variant: 'success',
        title: 'Password deleted',
        duration: 2000,
      })
      
      return true
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Delete failed',
        description: err.message,
      })
      return false
    }
  }, [activeId, addToast])

  // ── FAVORITE ─────────────────────────────────────
  const toggleFavoritePassword = useCallback(
    async (id) => {
      try {
        await toggleFavorite(id)
        await loadPasswords()
        if (activePassword?.id === id) {
          setActivePassword(prev => prev ? {
            ...prev,
            isFavorite: !prev.isFavorite
          } : null)
        }
      } catch (err) {
        console.error('toggleFavorite failed:', err)
      }
    },
    [activePassword, loadPasswords]
  )

  // ── STATS ────────────────────────────────────────
  const getStats = useCallback(async () => {
    if (!derivedKey) return null
    
    try {
      const result = await getAllItems(derivedKey, {
        type: 'password',
      })
      
      const all = result.items
      const weak = all.filter(
        p => (p.data?.strength || 0) <= 1
      ).length
      const strong = all.filter(
        p => (p.data?.strength || 0) >= 3
      ).length
      
      return {
        total: all.length,
        weak,
        strong,
        favorites: all.filter(
          p => p.isFavorite
        ).length,
      }
    } catch {
      return null
    }
  }, [derivedKey])

  return {
    passwords,
    isLoading,
    isSaving,
    activeId,
    activePassword,
    searchQuery,
    filterCategory,
    sortBy,
    sortOrder,
    showFavoritesOnly,
    filterStrength,

    setActiveId,
    setSearchQuery,
    setFilterCategory,
    setSortBy,
    setSortOrder,
    setShowFavoritesOnly,
    setFilterStrength,

    loadPasswords,
    openPassword,
    createPassword,
    updatePassword,
    deletePassword,
    toggleFavoritePassword,
    getStats,
  }
}
