import { useState, useRef, useEffect,
  useCallback } from 'react'
import {
  Mic, Square, Pause, Play,
  Loader2,
} from 'lucide-react'
import { useToastStore } from '../../store/toastStore'

export default function VoiceRecorder({
  onSave,
  isSaving,
}) {
  const [status, setStatus] = useState('idle')
  // idle | requesting | recording | paused | saving

  const [duration, setDuration] = useState(0)
  const [audioLevels, setAudioLevels] = useState(new Array(30).fill(0))

  const addToast = useToastStore(s => s.addToast)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks()
        .forEach(t => t.stop())
      streamRef.current = null
    }
  }

  // Animate audio level meter
  const startLevelMeter = (stream) => {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(
      analyser.frequencyBinCount
    )

    const tick = () => {
      analyser.getByteFrequencyData(data)
      const numBars = 30
      const step = Math.floor((data.length * 0.8) / numBars) // use ~80% of bins to ignore very high freq
      const levels = []
      
      for (let i = 0; i < numBars; i++) {
        let max = 0
        for (let j = 0; j < step; j++) {
          const val = data[i * step + j]
          if (val > max) max = val
        }
        levels.push(Math.min(100, Math.round((max / 255) * 100)))
      }
      setAudioLevels(levels)
      
      animFrameRef.current =
        requestAnimationFrame(tick)
    }
    tick()
  }

  const startRecording = async () => {
    try {
      setStatus('requesting')
      const stream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick best supported MIME
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find(m => MediaRecorder.isTypeSupported(m))
        || 'audio/webm'

      const recorder = new MediaRecorder(
        stream, { mimeType }
      )
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.start(100) // collect every 100ms
      setStatus('recording')
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      // Start level meter
      startLevelMeter(stream)

      addToast({
        variant: 'success',
        title: 'Recording started',
        description: 'Microphone access granted.',
        duration: 3000,
      })

    } catch (err) {
      setStatus('idle')
      if (err.name === 'NotAllowedError') {
        alert('Microphone permission denied. ' +
          'Please allow microphone access.')
        addToast({
          variant: 'danger',
          title: 'Permission Denied',
          description: 'Please allow microphone access to record voice notes.'
        })
      } else {
        addToast({
          variant: 'danger',
          title: 'Recording failed',
          description: err.message
        })
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state ===
        'recording') {
      mediaRecorderRef.current.pause()
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      setAudioLevels(new Array(30).fill(0))
      setStatus('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state ===
        'paused') {
      mediaRecorderRef.current.resume()
      setStatus('recording')
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
      if (streamRef.current) {
        startLevelMeter(streamRef.current)
      }
    }
  }

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return

    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevels(new Array(30).fill(0))

    mediaRecorderRef.current.onstop = async () => {
      const mimeType =
        mediaRecorderRef.current.mimeType ||
        'audio/webm'
      const blob = new Blob(
        chunksRef.current, { type: mimeType }
      )
      stopStream()
      setStatus('saving')
      await onSave(blob, duration)
      setStatus('idle')
      setDuration(0)
      chunksRef.current = []
    }

    mediaRecorderRef.current.stop()
  }, [duration, onSave])

  const cancelRecording = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current?.state !==
        'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopStream()
    chunksRef.current = []
    setStatus('idle')
    setDuration(0)
    setAudioLevels(new Array(30).fill(0))

    addToast({
      variant: 'default',
      title: 'Recording cancelled',
      description: 'Audio discarded.',
      duration: 2000,
    })
  }

  // Format duration
  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${
      String(sec).padStart(2,'0')}`
  }

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isActive = isRecording || isPaused

  return (
    <div className="flex flex-col items-center
      gap-6 py-8">

      {/* Main record button */}
      <div className="relative">
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0
              rounded-full animate-ping"
              style={{
                backgroundColor:
                  'rgba(239,68,68,0.2)',
                animationDuration: '1.5s',
              }}
            />
            <div className="absolute inset-0
              rounded-full animate-ping"
              style={{
                backgroundColor:
                  'rgba(239,68,68,0.1)',
                animationDuration: '1.5s',
                animationDelay: '0.5s',
              }}
            />
          </>
        )}

        <button
          type="button"
          onClick={status === 'idle'
            ? startRecording
            : isActive
              ? stopRecording
              : undefined
          }
          disabled={status === 'requesting' ||
                    status === 'saving'}
          className="relative w-20 h-20 rounded-full
            flex items-center justify-center
            cursor-pointer transition-all duration-200
            hover:scale-105 active:scale-95"
          style={{
            backgroundColor: isRecording
              ? '#EF4444'
              : isPaused
                ? '#F97316'
                : '#F0F0F0',
          }}
        >
          {status === 'requesting' ||
           status === 'saving' ? (
            <Loader2 className="w-8 h-8
              animate-spin text-[#141414]" />
          ) : isActive ? (
            <Square className="w-7 h-7
              text-white fill-white" />
          ) : (
            <Mic className="w-8 h-8
              text-[#141414]" />
          )}
        </button>
      </div>

      {/* Timer */}
      <div className="text-center">
        <p className="text-[36px] font-mono
          font-semibold text-[#F0F0F0]
          tabular-nums leading-none">
          {formatTime(duration)}
        </p>
        <p className="text-[13px] mt-1"
          style={{ color: '#555555' }}>
          {status === 'idle' && 'Tap to record'}
          {status === 'requesting' &&
            'Requesting microphone...'}
          {status === 'recording' && 'Recording...'}
          {status === 'paused' && 'Paused'}
          {status === 'saving' &&
            'Encrypting and saving...'}
        </p>
      </div>

      {/* Audio level bars */}
      {isActive && (
        <div className="flex items-end gap-1
          h-12 w-full max-w-[280px] justify-center mx-auto mb-4">
          {audioLevels.map((level, i) => {
            const height = Math.max(4, (level / 100) * 48)
            const active = level > 5
            return (
              <div
                key={i}
                className="w-1.5 rounded-full
                  transition-all duration-75"
                style={{
                  height: `${height}px`,
                  backgroundColor: active
                    ? isRecording
                      ? '#EF4444'
                      : '#F97316'
                    : '#2A2A2A',
                }}
              />
            )
          })}
        </div>
      )}

      {/* Pause / Resume / Cancel controls */}
      {isActive && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={cancelRecording}
            className="px-4 py-2 rounded-xl
              text-[13px] cursor-pointer
              transition-colors"
            style={{
              backgroundColor: '#252525',
              color: '#888888',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={isRecording
              ? pauseRecording
              : resumeRecording
            }
            className="px-4 py-2 rounded-xl
              text-[13px] cursor-pointer
              transition-colors flex items-center
              gap-1.5"
            style={{
              backgroundColor: '#252525',
              color: '#C0C0C0',
            }}
          >
            {isRecording ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Resume
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
