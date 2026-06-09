// React hook managing fetch, decrypt, insert, modify, and delete operations of payment cards in Dexie DB.

import { useState, useCallback, useEffect } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import {
  createItem, getAllItems, getItem,
  updateItem, deleteItem, toggleFavorite,
} from '../db/vaultOperations'
import { detectCardType } from '../utils/cardUtils'

export function useCards() {
  const derivedKey = useVaultStore(s => s.derivedKey)
  const addToast = useToastStore(s => s.addToast)

  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [activeCard, setActiveCard] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const loadCards = useCallback(async (silent = false) => {
    if (!derivedKey) return
    if (!silent) setIsLoading(true)
    try {
      const result = await getAllItems(derivedKey, {
        type: 'card',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      })
      
      let items = result.items || []
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        items = items.filter(item =>
          (item.title || '').toLowerCase().includes(q) ||
          (item.data?.bankName || '').toLowerCase().includes(q) ||
          (item.data?.cardName || '').toLowerCase().includes(q)
        )
      }
      
      if (filterCategory === 'locked') {
        items = items.filter(item => item.isLocked)
      } else if (filterCategory !== 'all') {
        items = items.filter(
          item => item.data?.category === filterCategory && !item.isLocked
        )
      } else {
        // All — exclude locked from main view
        items = items.filter(item => !item.isLocked)
      }
      
      setCards(items)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to load cards',
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [derivedKey, searchQuery, filterCategory, addToast])

  useEffect(() => {
    if (derivedKey) {
      loadCards()
    }
  }, [derivedKey, searchQuery, filterCategory, loadCards])

  const openCard = useCallback(async (id) => {
    if (!derivedKey) return
    setActiveId(id)
    try {
      const full = await getItem(id, derivedKey)
      setActiveCard(full)
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Could not open card',
        description: err.message,
      })
    }
  }, [derivedKey, addToast])

  const createCard = useCallback(
    async (formData) => {
      if (!derivedKey) return null
      setIsSaving(true)
      try {
        const cardType = detectCardType(formData.cardNumber || '')
        const item = await createItem({
          type: 'card',
          title: formData.label || formData.bankName || 'My Card',
          data: {
            label: formData.label || '',
            cardNumber: formData.cardNumber || '',
            cardName: formData.cardName || '',
            expiry: formData.expiry || '',
            cvv: formData.cvv || '',
            bankName: formData.bankName || '',
            category: formData.category || 'debit',
            cardType,
            colorId: formData.colorId || 'custom-black',
            billingAddress: formData.billingAddress || '',
            notes: formData.notes || '',
            pin: formData.pin || '',
          },
          thumbnail: null,
          folderId: null,
          tags: [],
          isFavorite: false,
        }, derivedKey)
        
        await loadCards()
        addToast({
          variant: 'success',
          title: 'Card saved',
          description: `${formData.label || formData.bankName || 'Card'} added to vault.`,
          duration: 3000,
          id: Math.random().toString(),
        })
        return item
      } catch (err) {
        addToast({
          variant: 'danger',
          title: 'Failed to save card',
          description: err.message,
        })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [derivedKey, loadCards, addToast]
  )

  const updateCard = useCallback(
    async (id, formData) => {
      if (!derivedKey) return false
      setIsSaving(true)
      try {
        const cardType = detectCardType(formData.cardNumber || '')
        await updateItem(id, {
          title: formData.label || formData.bankName || 'My Card',
          data: {
            label: formData.label || '',
            cardNumber: formData.cardNumber || '',
            cardName: formData.cardName || '',
            expiry: formData.expiry || '',
            cvv: formData.cvv || '',
            bankName: formData.bankName || '',
            category: formData.category || 'debit',
            cardType,
            colorId: formData.colorId || 'custom-black',
            billingAddress: formData.billingAddress || '',
            notes: formData.notes || '',
            pin: formData.pin || '',
          },
        }, derivedKey)
        
        const updated = await getItem(id, derivedKey)
        setActiveCard(updated)
        await loadCards()
        
        addToast({
          variant: 'success',
          title: 'Card updated',
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
    [derivedKey, loadCards, addToast]
  )

  const deleteCard = useCallback(async (id) => {
    try {
      await deleteItem(id)
      setCards(prev => prev.filter(c => c.id !== id))
      if (activeId === id) {
        setActiveId(null)
        setActiveCard(null)
      }
      addToast({
        variant: 'success',
        title: 'Card deleted',
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

  const toggleFavoriteCard = useCallback(
    async (id) => {
      try {
        await toggleFavorite(id)
        setCards(prev => prev.map(c =>
          c.id === id
            ? { ...c, isFavorite: !c.isFavorite }
            : c
        ))
        if (activeCard?.id === id) {
          setActiveCard(prev => prev ? {
            ...prev,
            isFavorite: !prev.isFavorite,
          } : null)
        }
      } catch (err) {
        console.error('toggleFavorite:', err)
      }
    },
    [activeCard]
  )

  const lockCard = useCallback(async (id, pin) => {
    if (!derivedKey) return false
    try {
      const encoded = new TextEncoder().encode(pin)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      await updateItem(id, {
        isLocked: true,
        itemPassword: pinHash,
      }, derivedKey)

      // Update local state
      setCards(prev => prev.map(c =>
        c.id === id ? { ...c, isLocked: true } : c
      ))

      if (activeCard?.id === id) {
        setActiveCard(prev => prev ? { ...prev, isLocked: true } : null)
      }

      addToast({
        variant: 'success',
        title: 'Card locked',
        description: 'Card moved to locked folder.',
        duration: 3000,
      })
      
      // Reload cards list silently so the locked card disappears instantly from active view
      await loadCards(true)
      return true
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Lock failed',
        description: err.message,
      })
      return false
    }
  }, [derivedKey, activeCard, addToast, loadCards])

  const unlockCard = useCallback(async (id, pin) => {
    if (!derivedKey) return false
    try {
      // Need a full decrypted load to get current itemPassword 
      const full = await getItem(id, derivedKey)
      if (!full?.itemPassword) {
        // No PIN password stored, unlock directly
        await updateItem(id, {
          isLocked: false,
          itemPassword: null,
        }, derivedKey)

        setCards(prev => prev.map(c =>
          c.id === id ? { ...c, isLocked: false } : c
        ))
        
        await loadCards(true)
        return true
      }

      const encoded = new TextEncoder().encode(pin)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      if (pinHash !== full.itemPassword) {
        return false
      }

      await updateItem(id, {
        isLocked: false,
        itemPassword: null,
      }, derivedKey)

      setCards(prev => prev.map(c =>
        c.id === id ? { ...c, isLocked: false } : c
      ))

      if (activeCard?.id === id) {
        setActiveCard(prev => prev ? { ...prev, isLocked: false } : null)
      }

      addToast({
        variant: 'success',
        title: 'Card unlocked',
        duration: 2000,
      })
      
      await loadCards(true)
      return true
    } catch (err) {
      console.error('Unlock card error:', err)
      return false
    }
  }, [derivedKey, activeCard, addToast, loadCards])

  // Simple PIN validator (without unlocking) for when users click a locked card to view its details
  const verifyPinForView = useCallback(async (id, pin) => {
    if (!derivedKey) return false
    try {
      const full = await getItem(id, derivedKey)
      if (!full?.itemPassword) return true

      const encoded = new TextEncoder().encode(pin)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      return pinHash === full.itemPassword
    } catch {
      return false
    }
  }, [derivedKey])

  return {
    cards, isLoading, isSaving,
    activeId, activeCard,
    searchQuery, filterCategory,

    setActiveId, setSearchQuery,
    setFilterCategory,

    loadCards, openCard, createCard,
    updateCard, deleteCard,
    toggleFavoriteCard,
    lockCard, unlockCard, verifyPinForView,
  }
}
