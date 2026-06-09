// Add/Edit password form
// Used for both creating new and editing existing inside a responsive modal

import { useState } from 'react'
import { 
  Eye, EyeOff, Globe, User, Lock, 
  FileText, Tag, X, Zap, Plus, Check, Trash2
} from 'lucide-react'
import { 
  checkPasswordStrength, 
  PASSWORD_CATEGORIES,
} from '../../utils/passwordUtils'
import StrengthBar from './StrengthBar'
import PasswordGenerator from './PasswordGenerator'
import { createPortal } from 'react-dom'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

const EMPTY_FORM = {
  siteName: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  category: 'other',
  tags: [],
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#EAB308', // Yellow
]

export default function PasswordForm({
  initial = null,   // null = new, object = edit
  onSave,           // async (formData) => void
  onCancel,
  isSaving = false,
  customCategories = [],
  onAddCustomCategory,
  onDeleteCustomCategory,
}) {
  const [form, setForm] = useState(
    initial ? {
      siteName: initial.data?.siteName || '',
      username: initial.data?.username || '',
      password: initial.data?.password || '',
      url: initial.data?.url || '',
      notes: initial.data?.notes || '',
      category: initial.data?.category || 'other',
      tags: initial.tags || [],
    } : { ...EMPTY_FORM }
  )
  
  const [showPassword, setShowPassword] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState({})

  // Custom Category Creator states
  const [showCreator, setShowCreator] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [catError, setCatError] = useState('')

  const validate = () => {
    const errs = {}
    if (!form.siteName.trim()) {
      errs.siteName = 'Site name is required'
    }
    if (!form.username.trim()) {
      errs.username = 'Username/email is required'
    }
    if (!form.password) {
      errs.password = 'Password is required'
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

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
    }
    setTagInput('')
  }

  const handleRemoveTag = (tag) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleCreateCategory = () => {
    if (!newCatLabel.trim()) {
      setCatError('Category name is required')
      return
    }
    const labelExists = [...PASSWORD_CATEGORIES, ...customCategories].some(
      c => c.label.toLowerCase() === newCatLabel.trim().toLowerCase()
    )
    if (labelExists) {
      setCatError('Category name already exists')
      return
    }

    const id = 'custom_' + Date.now()
    const newCat = {
      id,
      label: newCatLabel.trim(),
      color: newCatColor,
    }

    if (onAddCustomCategory) {
      onAddCustomCategory(newCat)
    }

    // Auto select the new category
    setForm(p => ({ ...p, category: id }))
    
    // Reset state
    setNewCatLabel('')
    setNewCatColor(PRESET_COLORS[0])
    setCatError('')
    setShowCreator(false)
  }

  const handleDeleteCategory = (e, catId) => {
    e.stopPropagation()
    if (onDeleteCustomCategory) {
      onDeleteCustomCategory(catId)
      // Fallback if deleted category was currently selected in form
      if (form.category === catId) {
        setForm(p => ({ ...p, category: 'other' }))
      }
    }
  }

  const activeCategories = [...PASSWORD_CATEGORIES, ...customCategories]

  return (
    <>
      <div className="space-y-4">
        
        {/* Site name */}
        <div>
          <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
            Site / Service Name *
          </label>
          <input
            type="text"
            value={form.siteName}
            onChange={e => {
              setForm(p => ({ ...p, siteName: e.target.value }))
              if (errors.siteName) {
                setErrors(p => ({ ...p, siteName: null }))
              }
            }}
            placeholder="e.g. Gmail, Netflix, GitHub"
            className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl px-4 py-3 outline-none placeholder:text-[#444444] transition-colors focus:bg-[#1A1A1A]"
          />
          {errors.siteName && (
            <p className="text-[12px] text-red-400 mt-1">
              {errors.siteName}
            </p>
          )}
        </div>

        {/* Username/email */}
        <div>
          <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
            Username / Email *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
            <input
              type="text"
              value={form.username}
              onChange={e => {
                setForm(p => ({ ...p, username: e.target.value }))
                if (errors.username) {
                  setErrors(p => ({ ...p, username: null }))
                }
              }}
              placeholder="username@example.com"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl pl-10 pr-4 py-3 outline-none placeholder:text-[#444444] transition-colors focus:bg-[#1A1A1A]"
            />
          </div>
          {errors.username && (
            <p className="text-[12px] text-red-400 mt-1">
              {errors.username}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
              Password *
            </label>
            <button
              type="button"
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-1 text-[12px] text-[#555555] hover:text-[#C0C0C0] cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => {
                setForm(p => ({ ...p, password: e.target.value }))
                if (errors.password) {
                  setErrors(p => ({ ...p, password: null }))
                }
              }}
              placeholder="Enter password"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] font-mono rounded-xl pl-10 pr-12 py-3 outline-none placeholder:text-[#444444] placeholder:font-sans transition-colors focus:bg-[#1A1A1A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#555555] hover:text-[#C0C0C0] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[12px] text-red-400 mt-1">
              {errors.password}
            </p>
          )}
          {form.password && (
            <div className="mt-2">
              <StrengthBar
                password={form.password}
                showLabel={true}
                showChecks={true}
              />
            </div>
          )}
        </div>

        {/* URL */}
        <div>
          <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
            Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              placeholder="https://example.com"
              className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl pl-10 pr-4 py-3 outline-none placeholder:text-[#444444] transition-colors focus:bg-[#1A1A1A]"
            />
          </div>
        </div>

        {/* Category Selector with Inline Creator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
              Category
            </label>
            {!showCreator && (
              <button
                type="button"
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-1 text-[12px] text-[#888888] hover:text-[#F0F0F0] cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Custom Category
              </button>
            )}
          </div>

          {/* Dynamic creator pane */}
          {showCreator && (
            <div className="p-4 bg-[#141414] rounded-xl mb-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#F0F0F0]">
                  Create Custom Category
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreator(false)
                    setCatError('')
                    setNewCatLabel('')
                  }}
                  className="text-[#666666] hover:text-[#F0F0F0] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={e => {
                    setNewCatLabel(e.target.value)
                    setCatError('')
                  }}
                  placeholder="Category name (e.g. Work, Admin)"
                  className="w-full bg-[#1C1C1C] text-[#F0F0F0] text-[13px] rounded-lg px-3 py-2 outline-none placeholder:text-[#444444]"
                />
                {catError && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {catError}
                  </p>
                )}
              </div>

              {/* Preset Colors selector */}
              <div className="space-y-1.5">
                <span className="block text-[11px] text-[#555555] uppercase tracking-wider">
                  Select Theme Color
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className="w-6 h-6 rounded-full cursor-pointer transition-transform duration-100 hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      {newCatColor === color && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="flex-1 py-1.5 bg-[#F0F0F0] text-[#141414] rounded-lg text-[12px] font-medium cursor-pointer hover:bg-[#DDDDDD] transition-colors"
                >
                  Save Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreator(false)
                    setCatError('')
                    setNewCatLabel('')
                  }}
                  className="px-3 py-1.5 bg-[#1C1C1C] text-[#888888] rounded-lg text-[12px] cursor-pointer hover:text-[#C0C0C0]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Combined Category List Grid */}
          <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
            {activeCategories.map(cat => {
              const isSelected = form.category === cat.id
              const isCustom = cat.id.startsWith('custom_')

              return (
                <div
                  key={cat.id}
                  onClick={() => setForm(p => ({ ...p, category: cat.id }))}
                  className="group relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all duration-150 select-none"
                  style={{
                    backgroundColor: isSelected ? cat.color : '#1E1E1E',
                    color: isSelected ? '#141414' : '#888888'
                  }}
                >
                  <span className="font-medium mr-1">{cat.label}</span>
                  
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCategory(e, cat.id)}
                      className="p-0.5 rounded-full hover:bg-black/10 text-current duration-100 cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-3 h-3 text-[#EF4444]" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Security questions, 2FA backup codes, etc."
            rows={3}
            className="w-full bg-[#141414] text-[#F0F0F0] text-[14px] rounded-xl px-4 py-3 outline-none placeholder:text-[#444444] resize-none transition-colors focus:bg-[#1A1A1A]"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[11px] font-medium text-[#888888] mb-1.5 uppercase tracking-wider">
            Tags
          </label>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] bg-[#252525] text-[#C0C0C0]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[#555555] hover:text-[#F0F0F0] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 bg-[#141414] text-[#F0F0F0] text-[13px] rounded-xl px-3 py-2.5 outline-none placeholder:text-[#444444]"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 rounded-xl text-[13px] cursor-pointer bg-[#252525] text-[#888888] hover:text-[#C0C0C0] transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className={`flex-1 py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150 ${
              isSaving
                ? 'opacity-50 cursor-not-allowed bg-[#333333] text-[#888888]'
                : 'bg-[#F0F0F0] text-[#141414] hover:bg-[#DDDDDD]'
            }`}
          >
            {isSaving ? 'Saving...' : initial ? 'Save changes' : 'Save password'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-xl text-[14px] cursor-pointer bg-[#1E1E1E] text-[#888888] hover:text-[#C0C0C0] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Password Generator Modal */}
      {showGenerator && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 9999 }}
            onClick={() => setShowGenerator(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-slide-up"
            style={{ zIndex: 10000 }}
          >
            <PasswordGenerator
              onUse={(pwd) => {
                setForm(p => ({ ...p, password: pwd }))
                setShowGenerator(false)
              }}
              onClose={() => setShowGenerator(false)}
            />
          </div>
        </>,
        document.body
      )}
    </>
  )
}
