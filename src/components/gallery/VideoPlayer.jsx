import React, { useRef, useState, useEffect, useCallback } from 'react'
import { 
  Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward
} from 'lucide-react'
import { formatDuration } from '../../utils/mediaUtils'

export default function VideoPlayer({ 
  src, thumbnail 
}) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)
  const hideTimer = useRef(null)

  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDurationChange = () => setDuration(video.duration || 0)
    const onWaiting = () => setIsBuffering(true)
    const onCanPlay = () => setIsBuffering(false)
    const onEnded = () => setIsPlaying(false)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('ended', onEnded)

    // Reset state
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)

    // Load and play
    if (src) {
      video.load()
      video.play().catch(err => {
        console.warn("Autoplay was blocked or interrupted:", err)
        setIsPlaying(false)
      })
    }

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('ended', onEnded)
    }
  }, [src])

  // Fullscreen change
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Spacebar play/pause
  useEffect(() => {
    const handler = (e) => {
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'SELECT' || 
        document.activeElement.tagName === 'TEXTAREA'
      )) {
        return
      } // Avoid triggering in inputs
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        togglePlay()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isPlaying])

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    if (isPlaying) {
      hideTimer.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [])

  const seekTo = useCallback((e) => {
    const video = videoRef.current
    const bar = progressRef.current
    if (!video || !bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    video.currentTime = ratio * duration
  }, [duration])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  const handleVolume = useCallback((e) => {
    const val = parseFloat(e.target.value)
    const video = videoRef.current
    if (!video) return
    video.volume = val
    setVolume(val)
    setIsMuted(val === 0)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {})
    } else {
      await document.exitFullscreen().catch(() => {})
    }
  }, [])

  const cyclePlaybackRate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const idx = RATES.indexOf(playbackRate)
    const next = RATES[(idx + 1) % RATES.length]
    video.playbackRate = next
    setPlaybackRate(next)
  }, [playbackRate, RATES])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black"
      onMouseMove={resetHideTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="max-w-full max-h-full object-contain"
        playsInline
        preload="auto"
        autoPlay
        onClick={e => e.stopPropagation()}
      />

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" style={{ borderStyle: 'solid' }} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 inset-x-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient bg */}
        <div className="h-20 bg-gradient-to-t from-black/80 to-transparent" />
        
        <div className="absolute bottom-0 inset-x-0 px-4 pb-3">
          {/* Progress bar */}
          <div
            ref={progressRef}
            onClick={seekTo}
            className="w-full h-1 rounded-full bg-white/20 cursor-pointer mb-3 hover:h-2 transition-all duration-100 relative"
          >
            <div
              className="h-full rounded-full bg-white pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Skip back */}
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current
                if (v) v.currentTime -= 10
              }}
              className="text-white/70 hover:text-white cursor-pointer transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="text-white cursor-pointer hover:scale-110 transition-transform"
            >
              {isPlaying
                ? <Pause className="w-5 h-5 fill-white" />
                : <Play className="w-5 h-5 fill-white ml-0.5" />
              }
            </button>

            {/* Skip forward */}
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current
                if (v) v.currentTime += 10
              }}
              className="text-white/70 hover:text-white cursor-pointer transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Time */}
            <span className="text-[12px] text-white/70 tabular-nums select-none">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <button
              type="button"
              onClick={toggleMute}
              className="text-white/70 hover:text-white cursor-pointer transition-colors"
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
              className="w-16 cursor-pointer accent-white bg-[#555]"
            />

            {/* Speed */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="text-[12px] text-white/70 hover:text-white cursor-pointer transition-colors w-8 text-center"
            >
              {playbackRate}×
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white/70 hover:text-white cursor-pointer transition-colors"
            >
              {isFullscreen
                ? <Minimize className="w-4 h-4" />
                : <Maximize className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
