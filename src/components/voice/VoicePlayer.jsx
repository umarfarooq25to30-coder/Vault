import { useState, useRef, useEffect,
  useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Download,
} from 'lucide-react'
import { formatDuration } from '../../hooks/useVoice'

export default function VoicePlayer({
  src,
  duration: initialDuration,
  onDownload,
}) {
  const audioRef = useRef(null)
  const progressRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(
    initialDuration || 0
  )
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // Attach audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onTimeUpdate = () =>
      setCurrentTime(audio.currentTime)
    const onDurationChange = () => {
      if (audio.duration && 
          !isNaN(audio.duration) &&
          isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const onCanPlay = () => setIsLoading(false)
    const onWaiting = () => setIsLoading(true)

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener(
      'durationchange', onDurationChange)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('waiting', onWaiting)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener(
        'timeupdate', onTimeUpdate)
      audio.removeEventListener(
        'durationchange', onDurationChange)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('waiting', onWaiting)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  const seek = useCallback((e) => {
    const audio = audioRef.current
    const bar = progressRef.current
    const validDuration = isFinite(duration) ? duration : 0;
    if (!audio || !bar || validDuration <= 0) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1,
      (e.clientX - rect.left) / rect.width
    ))
    audio.currentTime = ratio * validDuration
  }, [duration])

  const skip = (seconds) => {
    const audio = audioRef.current
    if (!audio) return
    const validDuration = isFinite(duration) ? duration : 0;
    if (validDuration <= 0) return;
    
    audio.currentTime = Math.max(0,
      Math.min(validDuration,
        audio.currentTime + seconds
      )
    )
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setIsMuted(audio.muted)
  }

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value)
    const audio = audioRef.current
    if (!audio) return
    audio.volume = val
    setVolume(val)
    setIsMuted(val === 0)
  }

  const cycleRate = () => {
    const audio = audioRef.current
    if (!audio) return
    const idx = RATES.indexOf(playbackRate)
    const next = RATES[(idx + 1) % RATES.length]
    audio.playbackRate = next
    setPlaybackRate(next)
  }

  const progress = duration > 0
    ? (currentTime / duration) * 100
    : 0

  // Generate fake waveform bars based on position
  // In a real implementation you would store
  // actual waveform data. For now we use a
  // seeded random pattern that looks good.
  const BAR_COUNT = 60
  const waveformBars = Array.from(
    { length: BAR_COUNT },
    (_, i) => {
      const seed = Math.sin(i * 2.3 + 1.5) * 0.5 +
                   Math.sin(i * 0.7) * 0.3 +
                   Math.sin(i * 4.1) * 0.2
      return 0.15 + Math.abs(seed) * 0.85
    }
  )

  const playedBars = Math.floor(
    (progress / 100) * BAR_COUNT
  )

  return (
    <div className="w-full">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
      />

      {/* Waveform progress bar */}
      <div
        ref={progressRef}
        onClick={seek}
        className="flex items-end gap-0.5
          h-16 cursor-pointer px-1 py-2"
      >
        {waveformBars.map((height, i) => {
          const played = i < playedBars
          const isCurrent = i === playedBars

          return (
            <div
              key={i}
              className="flex-1 rounded-full
                transition-colors duration-75"
              style={{
                height: `${height * 100}%`,
                backgroundColor: played || isCurrent
                  ? '#F0F0F0'
                  : '#2A2A2A',
                opacity: isCurrent ? 1 : undefined,
                transform: isCurrent
                  ? 'scaleY(1.1)' : undefined,
              }}
            />
          )
        })}
      </div>

      {/* Time */}
      <div className="flex items-center
        justify-between mb-3 px-1">
        <span className="text-[12px] font-mono
          tabular-nums"
          style={{ color: '#666666' }}>
          {formatDuration(currentTime)}
        </span>
        <span className="text-[12px] font-mono
          tabular-nums"
          style={{ color: '#555555' }}>
          {formatDuration(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center
        justify-between px-1">

        {/* Left — volume */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="cursor-pointer
              transition-colors"
            style={{ color: '#555555' }}
          >
            {isMuted || volume === 0
              ? <VolumeX className="w-4 h-4" />
              : <Volume2 className="w-4 h-4" />
            }
          </button>
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="w-16 cursor-pointer
              accent-[#F0F0F0]"
          />
        </div>

        {/* Center — playback controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => skip(-10)}
            className="cursor-pointer
              transition-colors"
            style={{ color: '#666666' }}
            title="Back 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full
              flex items-center justify-center
              cursor-pointer transition-all
              hover:scale-105 active:scale-95"
            style={{ backgroundColor: '#F0F0F0' }}
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full
                border-2 border-[#141414]/30
                border-t-[#141414] animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5
                text-[#141414] fill-[#141414]" />
            ) : (
              <Play className="w-5 h-5
                text-[#141414] fill-[#141414]
                ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(10)}
            className="cursor-pointer
              transition-colors"
            style={{ color: '#666666' }}
            title="Forward 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right — speed + download */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cycleRate}
            className="text-[12px] font-medium
              cursor-pointer transition-colors
              w-8 text-center"
            style={{ color: '#666666' }}
          >
            {playbackRate}×
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="cursor-pointer
                transition-colors"
              style={{ color: '#555555' }}
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
