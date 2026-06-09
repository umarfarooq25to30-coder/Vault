// Storage Manager — shows all vault data
// organized by module with sizes and counts

import { useState, useEffect, useCallback,
  useMemo } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { useToastStore } from '../store/toastStore'
import { useUiStore } from '../store/uiStore'
import { db } from '../db/database'
import { useStorage } from '../hooks/useStorage'
import {
  HardDrive, Image, FileText, Key,
  CreditCard, BookOpen, File,
  Trash2, RefreshCw, AlertTriangle, X
} from 'lucide-react'

// Storage limit management
const STORAGE_LIMIT_KEY = 'vault_storage_limit_gb'
const DEFAULT_LIMIT_GB = 5

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B','KB','MB','GB','TB']
  const i = Math.floor(
    Math.log(bytes) / Math.log(k)
  )
  return `${(bytes / Math.pow(k,i)).toFixed(
    i > 1 ? 1 : 0
  )} ${sizes[Math.min(i,4)]}`
}

function getPercent(used, total) {
  if (!total) return 0
  return Math.min(100, (used / total) * 100)
}

function formatPercentDisplay(percent) {
  if (percent > 0 && percent < 0.1) return '<0.1'
  return percent.toFixed(1)
}

const MODULE_CONFIG = [
  {
    key: 'gallery',
    label: 'Gallery',
    types: ['photo', 'video'],
    icon: Image,
    color: '#EC4899',
    description: 'Photos, videos and GIFs',
    path: '/gallery',
  },
  {
    key: 'notes',
    label: 'Notes',
    types: ['note'],
    icon: FileText,
    color: '#3B82F6',
    description: 'Text notes and documents',
    path: '/notes',
  },
  {
    key: 'files',
    label: 'Files',
    types: ['file'],
    icon: File,
    color: '#14B8A6',
    description: 'Uploaded files and PDFs',
    path: '/files',
  },
  {
    key: 'diary',
    label: 'Diary',
    types: ['diary'],
    icon: BookOpen,
    color: '#F97316',
    description: 'Journal entries',
    path: '/diary',
  },
  {
    key: 'passwords',
    label: 'Passwords',
    types: ['password'],
    icon: Key,
    color: '#22C55E',
    description: 'Saved passwords',
    path: '/passwords',
  },
  {
    key: 'cards',
    label: 'Cards',
    types: ['card'],
    icon: CreditCard,
    color: '#8B5CF6',
    description: 'Payment cards',
    path: '/cards',
  },
]

export default function StorageManager() {
  const derivedKey = useVaultStore(
    s => s.derivedKey
  )
  const addToast = useToastStore(s => s.addToast)

  const { stats, isLoading, refresh } = useStorage()
  
  const [isRefreshing, setIsRefreshing] =
    useState(false)
  
  const storageLimit = useUiStore(s => s.storageLimit)
  const setStorageLimit = useUiStore(s => s.setStorageLimit)

  const [limitInput, setLimitInput] =
    useState(String(storageLimit))
  const [showLimitEditor, setShowLimitEditor] =
    useState(false)
  const [deleteConfirm, setDeleteConfirm] =
    useState(null)

  // Create derived moduleStats
  const moduleStats = useMemo(() => {
    const calculated = {}
    if (!stats || !stats.itemsByType || !stats.sizeByType) return calculated;

    MODULE_CONFIG.forEach(module => {
      let count = 0;
      let size = 0;
      module.types.forEach(type => {
        count += (stats.itemsByType[type] || 0);
        size += (stats.sizeByType[type] || 0);
      })
      calculated[module.key] = { count, size }
    })
    return calculated
  }, [stats])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    refresh()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 400)
  }

  // Total used storage
  const totalUsed = stats?.estimatedSize || 0

  const limitBytes = storageLimit *
    1024 * 1024 * 1024

  const usagePercent = getPercent(
    totalUsed, limitBytes
  )

  const saveLimit = () => {
    const val = parseFloat(limitInput)
    if (isNaN(val) || val < 0.1 || val > 2000) {
      addToast({
        variant: 'warning',
        title: 'Invalid storage limit',
        description: 'Enter a value between ' +
          '0.1 GB and 2000 GB',
      })
      return
    }
    setStorageLimit(val)
    setShowLimitEditor(false)
    addToast({
      variant: 'success',
      title: 'Storage limit updated',
      description: `Limit set to ${val} GB`,
      duration: 2000,
    })
  }

  // Delete all items of a module type
  const handleDeleteModule = async (module) => {
    if (!derivedKey) return
    try {
      const stat = moduleStats[module.key]
      if (!stat?.count) return

      for (const type of module.types) {
        const matchingItems = await db.items.where('type').equals(type).toArray();
        for (const item of matchingItems) {
           await db.items.delete(item.id);
           await db.item_tags.where('itemId').equals(item.id).delete();
        }
      }

      setDeleteConfirm(null)

      addToast({
        variant: 'success',
        title: `${module.label} cleared`,
        description: `${stat.count} items deleted`,
        duration: 3000,
      })
    } catch (err) {
      addToast({
        variant: 'danger',
        title: 'Failed to delete',
        description: err.message,
      })
    }
  }

  const getUsageColor = (percent) => {
    if (percent >= 90) return '#EF4444'
    if (percent >= 70) return '#F97316'
    if (percent >= 50) return '#EAB308'
    return '#22C55E'
  }

  if (isLoading && Object.keys(moduleStats).length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#555]" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto"
      style={{ backgroundColor: '#141414' }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center
          justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold
              text-[#F0F0F0]">
              Storage
            </h1>
            <p className="text-[13px] mt-1"
              style={{ color: '#555555' }}>
              Manage your vault storage
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLimitInput(String(storageLimit))
                setShowLimitEditor(true)
              }}
              className="w-9 h-9 flex items-center
                justify-center rounded-xl cursor-pointer
                text-[#555555] hover:text-[#F0F0F0] hover:bg-[#252525]
                transition-all"
              title="Change Storage Limit"
            >
              <HardDrive className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 flex items-center
                justify-center rounded-xl cursor-pointer
                text-[#555555] hover:text-[#F0F0F0]
                transition-all"
              style={{
                backgroundColor: isRefreshing
                  ? '#252525' : 'transparent'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${
                isRefreshing ? 'animate-spin' : ''
              }`} />
            </button>
          </div>
        </div>

        {/* TOTAL STORAGE CARD */}
        <div className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#1E1E1E' }}>

          {/* Used / Limit */}
          <div className="flex items-end
            justify-between mb-3">
            <div>
              <p className="text-[32px] font-bold
                text-[#F0F0F0] leading-none">
                {formatBytes(totalUsed)}
              </p>
              <p className="text-[13px] mt-1"
                style={{ color: '#555555' }}>
                used of {storageLimit} GB
              </p>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-semibold"
                style={{
                  color: getUsageColor(usagePercent)
                }}>
                {formatPercentDisplay(usagePercent)}%
              </p>
              <p className="text-[12px]"
                style={{ color: '#555555' }}>
                {formatBytes(
                  limitBytes - totalUsed
                )} free
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full mb-4"
            style={{ backgroundColor: '#252525' }}>
            <div
              className="h-3 rounded-full
                transition-all duration-500"
              style={{
                width: `${usagePercent}%`,
                backgroundColor: getUsageColor(
                  usagePercent
                ),
                minWidth: usagePercent > 0
                  ? '8px' : '0',
              }}
            />
          </div>

          {/* Warning if > 80% */}
          {usagePercent > 80 && (
            <div className="flex items-center gap-2
              px-3 py-2 rounded-xl"
              style={{
                backgroundColor:
                  'rgba(239,68,68,0.08)',
              }}>
              <AlertTriangle className="w-4 h-4
                text-red-400 flex-shrink-0" />
              <p className="text-[12px] text-red-400">
                Storage almost full. Consider
                deleting unused items.
              </p>
            </div>
          )}
        </div>

        {/* MODULE BREAKDOWN */}
        <h2 className="text-[12px] font-medium
          uppercase tracking-wider mb-3 mt-8"
          style={{ color: '#444444' }}>
          Storage by module
        </h2>

        <div className="space-y-2 mb-6">
          {MODULE_CONFIG.map(module => {
            const stat = moduleStats[module.key]
            const size = stat?.size || 0
            const count = stat?.count || 0
            const modulePercent = getPercent(
              size, limitBytes
            )

            return (
              <div
                key={module.key}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: '#1E1E1E'
                }}
              >
                <div className="flex items-center
                  gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10
                    rounded-xl flex items-center
                    justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        module.color + '18',
                    }}>
                    <module.icon
                      className="w-5 h-5"
                      style={{ color: module.color }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center
                      justify-between mb-1">
                      <p className="text-[14px]
                        font-medium text-[#F0F0F0]">
                        {module.label}
                      </p>
                      <div className="flex items-center
                        gap-3">
                        <span className="text-[12px]"
                          style={{ color: '#666666' }}>
                          {count} item{
                            count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[13px]
                          font-medium"
                          style={{
                            color: module.color
                          }}>
                          {formatBytes(size)}
                        </span>
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    <div className="h-1.5 rounded-full"
                      style={{
                        backgroundColor: '#252525'
                      }}>
                      <div
                        className="h-1.5 rounded-full
                          transition-all duration-700"
                        style={{ width: `${modulePercent}%`, backgroundColor: module.color, minWidth: modulePercent > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>

                  {/* Delete module data */}
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm(module)}
                      className="w-8 h-8 flex items-center
                        justify-center rounded-xl
                        cursor-pointer transition-all
                        flex-shrink-0"
                      style={{
                        color: '#444444',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color =
                          '#EF4444'
                        e.currentTarget.style
                          .backgroundColor =
                          'rgba(239,68,68,0.1)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color =
                          '#444444'
                        e.currentTarget.style
                          .backgroundColor =
                          'transparent'
                      }}
                      title={`Clear ${module.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* DATABASE SIZE NOTE */}
        <div className="rounded-2xl p-4 my-8"
          style={{ backgroundColor: '#1A1A1A' }}>
          <div className="flex items-start gap-3">
            <HardDrive className="w-4 h-4 mt-0.5
              text-[#555555] flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium
                text-[#C0C0C0] mb-1">
                About storage calculation
              </p>
              <p className="text-[12px] leading-relaxed"
                style={{ color: '#555555' }}>
                Storage is calculated from original
                file sizes. Encrypted data in
                IndexedDB may be slightly larger
                due to AES-256-GCM overhead.
                The storage limit is a soft limit
                to help you manage your data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex
            items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="rounded-2xl p-6 w-80
              animate-slide-up"
            style={{ backgroundColor: '#1E1E1E' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3
              mb-3">
              <div className="w-10 h-10 rounded-xl
                flex items-center justify-center"
                style={{
                  backgroundColor:
                    'rgba(239,68,68,0.15)'
                }}>
                <Trash2 className="w-5 h-5
                  text-red-400" />
              </div>
              <div>
                <p className="text-[15px]
                  font-semibold text-[#F0F0F0]">
                  Clear {deleteConfirm.label}
                </p>
                <p className="text-[12px]"
                  style={{ color: '#888888' }}>
                  {moduleStats[deleteConfirm.key]
                    ?.count || 0} items will be
                  permanently deleted
                </p>
              </div>
            </div>

            <p className="text-[13px] mb-4
              leading-relaxed"
              style={{ color: '#666666' }}>
              This will permanently delete all
              {' '}{deleteConfirm.label.toLowerCase()}
              {' '}data from your vault. This cannot
              be undone.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDeleteModule(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl
                  text-[13px] font-medium cursor-pointer
                  text-white transition-colors"
                style={{ backgroundColor: '#EF4444' }}
              >
                Delete all
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl
                  text-[13px] cursor-pointer
                  transition-colors"
                style={{
                  backgroundColor: '#252525',
                  color: '#888888',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Storage Limit Modal */}
      {showLimitEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#333333]">
            <div className="p-5 border-b border-[#333333] flex justify-between items-center bg-[#252525]/50">
              <h3 className="font-semibold text-white">Change Storage Limit</h3>
              <button onClick={() => setShowLimitEditor(false)} className="text-[#888888] hover:text-[#F0F0F0]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#888888] mb-4">Set the maximum storage limit for your vault (GB).</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={limitInput}
                  onChange={e => setLimitInput(e.target.value)}
                  min={0.1}
                  max={2000}
                  step={0.5}
                  className="flex-1 bg-[#141414] border border-[#333333] text-white rounded-lg px-4 py-2 outline-none focus:border-[#555555]"
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveLimit()
                    if (e.key === 'Escape') setShowLimitEditor(false)
                  }}
                  autoFocus
                />
                <button onClick={saveLimit} className="px-4 py-2 bg-[#F0F0F0] text-[#141414] font-medium rounded-lg hover:bg-white transition-colors cursor-pointer">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
