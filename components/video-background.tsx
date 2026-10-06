"use client"

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const AUDIO_MUTED_KEY = 'thabat-background-audio-muted'
const FULL_RESOLUTION_VIDEO = '/videos/login-bg-pingpong-normal.mp4'
const LOW_RESOLUTION_VIDEO = '/videos/login-bg-pingpong-low.mp4'

type DeviceCapabilities = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

export function VideoBackground() {
  const { locale } = useLanguage()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoSource, setVideoSource] = useState<string | null>(null)

  useEffect(() => {
    const device = navigator as DeviceCapabilities
    const lowCapability =
      (device.deviceMemory !== undefined && device.deviceMemory <= 2) ||
      device.connection?.saveData === true
    setVideoSource(lowCapability ? LOW_RESOLUTION_VIDEO : FULL_RESOLUTION_VIDEO)
  }, [])

  useEffect(() => {
    const savedMute = localStorage.getItem(AUDIO_MUTED_KEY) === 'true'
    setIsMuted(savedMute)
    const audio = audioRef.current
    if (audio) {
      audio.volume = 0.2
      audio.muted = savedMute
    }
    const startAudio = () => {
      if (!audio || savedMute) return
      audio.volume = 0.2
      audio.muted = false
      void audio.play().then(() => {
        setIsPlaying(true)
        document.removeEventListener('pointerdown', startAudio)
      }).catch(() => setIsPlaying(false))
    }

    startAudio()
    document.addEventListener('pointerdown', startAudio)
    return () => {
      document.removeEventListener('pointerdown', startAudio)
      audio?.pause()
    }
  }, [])

  const toggleMute = () => {
    const nextMuted = isPlaying && !isMuted
    setIsMuted(nextMuted)
    localStorage.setItem(AUDIO_MUTED_KEY, String(nextMuted))
    if (audioRef.current) {
      audioRef.current.muted = nextMuted
      if (!nextMuted) {
        void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
      } else {
        setIsPlaying(false)
      }
    }
  }

  const muteLabel = isMuted || !isPlaying
    ? (locale === 'ar' ? 'تشغيل الموسيقى الخلفية' : 'Unmute background music')
    : (locale === 'ar' ? 'كتم الموسيقى الخلفية' : 'Mute background music')

  return <>
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {videoSource && <video
        autoPlay
        loop
        muted
        playsInline
        preload={videoSource === LOW_RESOLUTION_VIDEO ? 'metadata' : 'auto'}
        src={videoSource}
        className="w-full h-full object-cover scale-110 transform origin-center"
        aria-hidden="true"
      />}
      <audio ref={audioRef} loop preload="auto" src="/audio/Breathing_Stone.mp3" aria-hidden="true" />
    </div>
    <button type="button" onClick={toggleMute} aria-label={muteLabel} title={muteLabel} className="pointer-events-auto fixed bottom-5 end-5 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-slate-950/70 text-emerald-300 shadow-xl shadow-black/20 backdrop-blur-md transition hover:scale-105 hover:border-emerald-400/60 hover:bg-slate-900/85 focus:outline-none focus:ring-2 focus:ring-emerald-400">
      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  </>
}
