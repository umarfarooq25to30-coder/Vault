import React, { useState } from 'react'
import { HardDrive, ChevronRight, X } from 'lucide-react'
import { useStorage } from '../../hooks/useStorage'

export default function StorageManager() {
  const { stats, isLoading } = useStorage()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) return null

  // Calculate generic storage breakdown for progress bar
  const categories = [
    { label: 'Photos', key: 'photo', color: '#3B82F6' },
    { label: 'Videos', key: 'video', color: '#8B5CF6' },
    { label: 'Files', key: 'file', color: '#10B981' },
    { label: 'Notes', key: 'note', color: '#F59E0B' },
    { label: 'Other', key: 'other', color: '#6B7280' },
  ]

  const itemsByType = stats?.itemsByType || {}
  
  return (
    <>
      <div 
        onClick={() => setModalOpen(true)}
        className="px-4 py-4 mx-2 mb-2 rounded-xl border border-transparent hover:bg-[#252525] hover:border-[#333333] cursor-pointer transition-all flex flex-col gap-2 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#C0C0C0] group-hover:text-[#F0F0F0]">
            <HardDrive className="w-4 h-4 text-[#888888] group-hover:text-[#F0F0F0]" />
            <span className="text-[13px] font-medium">Storage</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#444444] group-hover:text-[#888888]" />
        </div>
        
        <div className="w-full h-1.5 bg-[#252525] rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-blue-500 rounded-full" 
            style={{ width: `${Math.max(1, stats.percentage)}%` }} 
          />
        </div>
        
        <div className="flex items-center justify-between text-[11px] text-[#888888]">
          <span>{stats.formattedSize} used</span>
          <span>{stats.formattedQuota} max</span>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C1C] rounded-2xl w-full max-w-md p-6 border border-[#333333] shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#888888] hover:text-[#F0F0F0] hover:bg-[#252525] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#F0F0F0]">Storage Manager</h2>
                <p className="text-xs text-[#888888]">Encrypted Vault Usage</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-[#F0F0F0]">{stats.formattedSize}</span>
                <span className="text-sm text-[#888888]">used of {stats.formattedQuota}</span>
              </div>
              
              <div className="w-full h-3 bg-[#252525] rounded-full overflow-hidden flex mb-2">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${Math.max(1, stats.percentage)}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-[#888888]">
                <span>{stats.percentage}% used</span>
              </div>
            </div>

            <h3 className="text-sm font-medium text-[#C0C0C0] mb-4 uppercase tracking-wider">Storage Breakdown (Items)</h3>
            
            <div className="space-y-3">
              {categories.map(cat => {
                let count = 0;
                if (cat.key === 'other') {
                  count = (itemsByType.password || 0) + (itemsByType.card || 0) + (itemsByType.diary || 0) + (itemsByType.voice || 0);
                } else {
                  count = itemsByType[cat.key] || 0;
                }
                
                if (count === 0 && cat.key !== 'other') return null;

                return (
                  <div key={cat.key} className="flex items-center justify-between p-3 rounded-xl bg-[#252525] border border-[#333333]">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-[#F0F0F0]">{cat.label}</span>
                    </div>
                    <span className="text-sm text-[#888888] font-medium">{count} items</span>
                  </div>
                )
              })}
            </div>
            
          </div>
        </div>
      )}
    </>
  )
}
