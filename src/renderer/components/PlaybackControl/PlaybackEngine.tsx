import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { toast } from 'sonner'

import { getSongUrlV1 } from '@/api/list'
import { applyAudioOutputDevice } from '@/lib/audio-output'
import { resolveTrackWithLxMusicSource } from '@/services/music-source/lx-playback-resolver'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import {
  applyPlaybackSpeedToAudio,
  normalizePlaybackSpeedValue,
} from '@/pages/Settings/components/playback-speed.model'
import {
  createSongUrlRequestAttempts,
  normalizeSongUrlV1Response,
} from '../../../shared/playback.ts'

const PLAYBACK_UNAVAILABLE_MESSAGE = '暂时无法播放'

// 定义暴露的方法类型
interface PlaybackEngineRef {
  getAudioElement: () => HTMLAudioElement | null
}

const PlaybackEngine = forwardRef<PlaybackEngineRef>((_, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const volumeRef = useRef(70)
  const configRef = useRef(useConfigStore.getState().config)
  const qualityRef = useRef(useConfigStore.getState().config.quality)
  const unblockRef = useRef(useConfigStore.getState().config.musicSourceEnabled)
  const playbackSpeedRef = useRef(
    normalizePlaybackSpeedValue(useConfigStore.getState().config.playbackSpeed)
  )
  const audioOutputDeviceIdRef = useRef(
    useConfigStore.getState().config.audioOutputDeviceId
  )

  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const requestId = usePlaybackStore(state => state.requestId)
  const status = usePlaybackStore(state => state.status)
  const volume = usePlaybackStore(state => state.volume)
  const seekRequestId = usePlaybackStore(state => state.seekRequestId)
  const seekPosition = usePlaybackStore(state => state.seekPosition)
  const config = useConfigStore(state => state.config)
  const quality = useConfigStore(state => state.config.quality)
  const musicSourceEnabled = useConfigStore(
    state => state.config.musicSourceEnabled
  )
  const playbackSpeed = useConfigStore(state => state.config.playbackSpeed)
  const audioOutputDeviceId = useConfigStore(
    state => state.config.audioOutputDeviceId
  )

  // 🔥 暴露获取 audio 实例的方法
  useImperativeHandle(
    ref,
    () => ({
      getAudioElement: () => audioRef.current,
    }),
    []
  )

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    qualityRef.current = quality
  }, [quality])

  useEffect(() => {
    unblockRef.current = musicSourceEnabled
  }, [musicSourceEnabled])

  useEffect(() => {
    const normalizedPlaybackSpeed = normalizePlaybackSpeedValue(playbackSpeed)
    playbackSpeedRef.current = normalizedPlaybackSpeed

    const audio = audioRef.current

    if (!audio) {
      return
    }

    applyPlaybackSpeedToAudio(audio, normalizedPlaybackSpeed)
  }, [playbackSpeed])

  useEffect(() => {
    volumeRef.current = volume
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  useEffect(() => {
    audioOutputDeviceIdRef.current = audioOutputDeviceId
    const audio = audioRef.current

    if (!audio) {
      return
    }

    void applyAudioOutputDevice(audio, audioOutputDeviceId).catch(error => {
      console.error('apply audio output device failed', error)
      toast.error('音频输出设备切换失败')
    })
  }, [audioOutputDeviceId])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = volumeRef.current / 100
    applyPlaybackSpeedToAudio(audio, playbackSpeedRef.current)
    audioRef.current = audio
    let frameId = 0

    const stopProgressSync = () => {
      if (!frameId) {
        return
      }

      cancelAnimationFrame(frameId)
      frameId = 0
    }

    const syncProgress = () => {
      frameId = 0

      if (audio.paused || audio.ended) {
        return
      }

      usePlaybackStore.getState().setProgress(audio.currentTime * 1000)
      frameId = requestAnimationFrame(syncProgress)
    }

    const startProgressSync = () => {
      if (frameId) {
        return
      }

      frameId = requestAnimationFrame(syncProgress)
    }

    const handleTimeUpdate = () => {
      usePlaybackStore.getState().setProgress(audio.currentTime * 1000)
    }

    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration)) {
        usePlaybackStore.getState().setDuration(audio.duration * 1000)
      }
    }

    const handleEnded = () => {
      stopProgressSync()
      const hasNext = usePlaybackStore.getState().playNext('auto')

      if (!hasNext) {
        usePlaybackStore.getState().markPlaybackPaused()
      }
    }

    const handleError = () => {
      stopProgressSync()
      usePlaybackStore
        .getState()
        .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
      toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('loadedmetadata', handleDurationChange)
    audio.addEventListener('play', startProgressSync)
    audio.addEventListener('playing', startProgressSync)
    audio.addEventListener('pause', stopProgressSync)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      stopProgressSync()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('loadedmetadata', handleDurationChange)
      audio.removeEventListener('play', startProgressSync)
      audio.removeEventListener('playing', startProgressSync)
      audio.removeEventListener('pause', stopProgressSync)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentTrack || requestId <= 0) {
      return
    }

    let cancelled = false
    const expectedRequestId = requestId
    const expectedTrackId = currentTrack.id

    const loadAndPlay = async () => {
      usePlaybackStore.getState().markPlaybackLoading()

      try {
        let result = null

        for (const unblock of createSongUrlRequestAttempts(
          unblockRef.current
        )) {
          const response = await getSongUrlV1({
            id: currentTrack.id,
            level: qualityRef.current,
            unblock,
          })

          result = normalizeSongUrlV1Response(response.data)

          if (cancelled) {
            return
          }

          if (result?.url) {
            break
          }
        }

        if (!result?.url) {
          result = await resolveTrackWithLxMusicSource({
            track: currentTrack,
            quality: qualityRef.current,
            config: configRef.current,
          })
        }

        const latestState = usePlaybackStore.getState()

        if (
          cancelled ||
          latestState.requestId !== expectedRequestId ||
          latestState.currentTrack?.id !== expectedTrackId
        ) {
          return
        }

        if (!result?.url) {
          latestState.markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
          toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
          return
        }

        let resolvedAudioUrl = result.url
        try {
          const cacheKey = `audio:${currentTrack.id}:${qualityRef.current}:${result.url}`
          const cachedResult = await window.electronCache.resolveAudioSource(
            cacheKey,
            result.url
          )
          resolvedAudioUrl = cachedResult.url || result.url
        } catch (error) {
          console.error('resolve cached audio source failed', error)
        }

        audio.pause()
        audio.src = resolvedAudioUrl
        audio.currentTime = 0
        audio.volume = volumeRef.current / 100
        applyPlaybackSpeedToAudio(audio, playbackSpeedRef.current)
        latestState.setProgress(0)
        latestState.setDuration(result.time || currentTrack.duration)

        try {
          await applyAudioOutputDevice(audio, audioOutputDeviceIdRef.current)
        } catch (error) {
          console.error('apply audio output device failed', error)
          toast.error('音频输出设备切换失败，将使用默认输出设备播放')
        }

        if (usePlaybackStore.getState().status === 'paused') {
          audio.pause()
          return
        }

        await audio.play()
        usePlaybackStore.getState().markPlaybackPlaying()
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('load song url failed', error)
        usePlaybackStore
          .getState()
          .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
        toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
      }
    }

    void loadAndPlay()

    return () => {
      cancelled = true
    }
  }, [currentTrack, requestId])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (status === 'paused' || status === 'idle' || status === 'error') {
      audio.pause()
      return
    }

    if (status === 'playing' && audio.src && audio.paused) {
      void audio.play().catch(error => {
        console.error('resume playback failed', error)
        usePlaybackStore
          .getState()
          .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
        toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
      })
    }
  }, [status])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || seekRequestId <= 0) {
      return
    }

    const nextTime = Math.max(0, seekPosition) / 1000

    if (Number.isFinite(nextTime)) {
      try {
        audio.currentTime = nextTime
        usePlaybackStore.getState().setProgress(seekPosition)
      } catch (error) {
        console.error('seek playback failed', error)
      }
    }
  }, [seekRequestId, seekPosition])

  return null
})

export default PlaybackEngine
