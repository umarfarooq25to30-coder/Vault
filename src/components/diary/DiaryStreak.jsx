import { Flame, Target } from 'lucide-react'

export default function DiaryStreak({
  streak, hasEntryToday, stats,
  onWriteToday
}) {
  return (
    <div className="px-4 py-3">

      {/* Streak display */}
      <div className="rounded-2xl p-4 mb-3"
        style={{
          background: streak > 0
            ? `linear-gradient(135deg,
               rgba(255,107,53,0.15) 0%,
               rgba(255,215,0,0.08) 100%)`
            : 'rgba(255,255,255,0.03)',
        }}>

        <div className="flex items-center
          justify-between mb-1">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 24 }}>
              {streak > 0 ? '🔥' : '💤'}
            </span>
            <div>
              <p className="text-[22px] font-bold
                text-[#F0F0F0] leading-none">
                {streak}
              </p>
              <p className="text-[11px]
                text-[#888888]">
                day streak
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[13px] font-semibold
              text-[#C0C0C0]">
              {stats.total}
            </p>
            <p className="text-[11px]
              text-[#555555]">
              entries
            </p>
          </div>
        </div>

        {/* Write today nudge */}
        {!hasEntryToday && (
          <button
            type="button"
            onClick={onWriteToday}
            className="w-full mt-2 py-2 rounded-xl
              text-[12px] font-medium cursor-pointer
              transition-all duration-150"
            style={{
              backgroundColor:
                'rgba(255,215,0,0.15)',
              color: '#FFD700',
            }}
          >
            ✍️ Write today's entry
          </button>
        )}

        {hasEntryToday && (
          <p className="text-[11px] text-[#666666]
            mt-2 text-center">
            ✅ You've written today!
          </p>
        )}
      </div>

      {/* Total words */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3"
          style={{ 
            backgroundColor: 
              'rgba(255,255,255,0.03)' 
          }}>
          <p className="text-[18px] font-bold
            text-[#F0F0F0] leading-none">
            {stats.totalWords >= 1000
              ? `${(stats.totalWords/1000)
                  .toFixed(1)}k`
              : stats.totalWords
            }
          </p>
          <p className="text-[10px] text-[#555555]
            mt-0.5">
            words written
          </p>
        </div>
        <div className="rounded-xl p-3"
          style={{ 
            backgroundColor: 
              'rgba(255,255,255,0.03)' 
          }}>
          <p className="text-[18px] font-bold
            text-[#F0F0F0] leading-none">
            {Math.max(1, Math.ceil(
              stats.totalWords / 200
            ))}m
          </p>
          <p className="text-[10px] text-[#555555]
            mt-0.5">
            total read time
          </p>
        </div>
      </div>
    </div>
  )
}
