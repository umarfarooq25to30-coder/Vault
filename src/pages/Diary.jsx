import React, { useState, useCallback, useRef } 
  from 'react'
import {
  Search, X, CalendarDays,
  LayoutList, SlidersHorizontal,
} from 'lucide-react'
import { useDiary } from '../hooks/useDiary'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import DiaryTimeline from 
  '../components/diary/DiaryTimeline'
import DiaryHeatmap from 
  '../components/diary/DiaryHeatmap'
import DiaryEditorModal from 
  '../components/diary/DiaryEditorModal'
import DiaryStreak from 
  '../components/diary/DiaryStreak'
import DiaryMoodChart from 
  '../components/diary/DiaryMoodChart'
import OnThisDay from 
  '../components/diary/OnThisDay'
import QuickCapture from 
  '../components/diary/QuickCapture'
import { MOODS } from 
  '../components/diary/MoodPicker'

export function Diary() {
  const diary = useDiary()
  const [moodFilter, setMoodFilter] = 
    useState('all')

  const todayStr = new Date()
    .toISOString().split('T')[0]

  const handleWriteToday = useCallback(
    async () => {
      await diary.openOrCreateEntry(todayStr)
    },
    [diary.openOrCreateEntry, todayStr]
  )

  const searchInputRef = useRef(null)

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onNew: () => {
      handleWriteToday()
    },
    onEscape: () => {
      if (diary.activeEntryId) {
        diary.setActiveEntryId(null)
      }
    }
  })

  // Filter entries by mood
  const filteredGroups = moodFilter === 'all'
    ? diary.groupedEntries
    : diary.groupedEntries.map(group => ({
        ...group,
        entries: group.entries.filter(
          e => e.data?.mood === moodFilter
        ),
      })).filter(g => g.entries.length > 0)

  return (
    <div className="flex h-full overflow-hidden"
      style={{ backgroundColor: '#141414' }}>

      {/* LEFT SIDEBAR */}
      <div className="w-72 flex-shrink-0 flex
        flex-col overflow-hidden rounded-l-2xl"
        style={{ backgroundColor: '#181818' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3
          flex-shrink-0">
          <div className="flex items-center
            justify-between mb-3">
            <h2 className="text-[18px] font-semibold
              text-[#F0F0F0]">
              Journal
            </h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => diary.setViewMode(
                  diary.viewMode === 'timeline'
                    ? 'heatmap' : 'timeline'
                )}
                className="w-8 h-8 flex items-center
                  justify-center rounded-lg
                  cursor-pointer text-[#555555]
                  hover:text-[#F0F0F0]
                  hover:bg-[#252525] transition-all"
                title={diary.viewMode === 'timeline'
                  ? 'Heatmap view'
                  : 'Timeline view'
                }
              >
                {diary.viewMode === 'timeline'
                  ? <CalendarDays className="w-4 h-4"/>
                  : <LayoutList className="w-4 h-4"/>
                }
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3
              top-1/2 -translate-y-1/2 w-4 h-4
              text-[#444444] pointer-events-none"/>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search entries..."
              value={diary.searchQuery}
              onChange={e =>
                diary.setSearchQuery(e.target.value)
              }
              className="w-full text-[#F0F0F0]
                text-[13px] rounded-xl pl-9 pr-4
                py-2.5 outline-none
                placeholder:text-[#444444]"
              style={{ backgroundColor: '#141414' }}
            />
            {diary.searchQuery && (
              <button
                type="button"
                onClick={() =>
                  diary.setSearchQuery('')}
                className="absolute right-3 top-1/2
                  -translate-y-1/2 cursor-pointer
                  text-[#555555]
                  hover:text-[#F0F0F0]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mood filter */}
          <div className="flex gap-1 mt-2
            flex-wrap">
            <button
              type="button"
              onClick={() => setMoodFilter('all')}
              className="px-2 py-1 rounded-lg
                text-[11px] cursor-pointer
                transition-colors"
              style={{
                backgroundColor: moodFilter === 'all'
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
                color: moodFilter === 'all'
                  ? '#F0F0F0' : '#555555',
              }}
            >
              All
            </button>
            {MOODS.map(mood => (
              <button
                key={mood.id}
                type="button"
                onClick={() => setMoodFilter(
                  moodFilter === mood.id
                    ? 'all' : mood.id
                )}
                className="w-7 h-7 flex items-center
                  justify-center rounded-lg
                  cursor-pointer transition-all"
                style={{
                  backgroundColor:
                    moodFilter === mood.id
                      ? mood.bg
                      : 'transparent',
                  transform:
                    moodFilter === mood.id
                      ? 'scale(1.15)'
                      : 'scale(1)',
                }}
                title={mood.label}
              >
                <span style={{ fontSize: 14 }}>
                  {mood.emoji}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable sidebar content */}
        <div className="flex-1 overflow-y-auto">

          {/* Streak */}
          <DiaryStreak
            streak={diary.streak}
            hasEntryToday={diary.hasEntryToday}
            stats={diary.stats}
            onWriteToday={handleWriteToday}
          />

          <div className="mx-4 h-px"
            style={{ 
              backgroundColor: '#1E1E1E' 
            }} />

          {/* Mood chart */}
          <DiaryMoodChart
            last7Days={diary.last7DaysMoods}
          />

          <div className="mx-4 h-px"
            style={{ 
              backgroundColor: '#1E1E1E' 
            }} />

          {/* On this day */}
          <OnThisDay
            entries={diary.onThisDay}
            onEntryClick={diary.openEntry}
          />
        </div>
      </div>

      {/* Vertical divider */}
      <div className="w-px flex-shrink-0"
        style={{ backgroundColor: '#1E1E1E' }} />

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto
        relative">

        {diary.viewMode === 'timeline' ? (
          <DiaryTimeline
            groupedEntries={filteredGroups}
            onEntryClick={diary.openEntry}
            isLoading={diary.isLoading}
          />
        ) : (
          <div className="p-6">
            <h3 className="text-[16px] font-semibold
              text-[#F0F0F0] mb-4">
              Mood heatmap
            </h3>
            <DiaryHeatmap
              heatmapData={diary.heatmapData}
              onDayClick={diary.openOrCreateEntry}
            />
          </div>
        )}
      </div>

      {/* Quick capture FAB */}
      <QuickCapture
        onCapture={diary.quickCapture}
      />

      {/* Entry editor modal */}
      {diary.isEditorOpen && diary.activeEntry && (
        <DiaryEditorModal
          entry={diary.activeEntry}
          onSave={diary.saveEntry}
          onDelete={diary.deleteEntry}
          onToggleFavorite={
            diary.toggleFavoriteEntry
          }
          onClose={diary.closeEditor}
          saveStatus={diary.saveStatus}
        />
      )}
    </div>
  )
}
