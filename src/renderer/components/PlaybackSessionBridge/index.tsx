import { useEffect, useRef } from 'react'
import { useConfigStore } from '@/stores/config-store'
import {
  clearPlaybackSessionSnapshot,
  createPlaybackSessionSnapshot,
  readPlaybackSessionSnapshot,
  withPlaybackSessionTiming,
  writePlaybackSessionSnapshot,
} from '@/stores/playback-session-storage'
import type { PlaybackSessionSnapshot } from '@/types/core'
import { usePlaybackStore } from '@/stores/playback-store'

const PLAYBACK_SESSION_PERSIST_INTERVAL = 2000

const PlaybackSessionBridge = () => {
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const rememberPlaybackSession = useConfigStore(
    state => state.config.rememberPlaybackSession
  )
  const queue = usePlaybackStore(state => state.queue)
  const currentIndex = usePlaybackStore(state => state.currentIndex)
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const progress = usePlaybackStore(state => state.progress)
  const duration = usePlaybackStore(state => state.duration)
  const playbackMode = usePlaybackStore(state => state.playbackMode)
  const status = usePlaybackStore(state => state.status)
  const restoreSession = usePlaybackStore(state => state.restoreSession)

  const hasRestoredRef = useRef(false)
  const latestSnapshotRef = useRef<PlaybackSessionSnapshot | null>(null)
  const latestProgressRef = useRef(0)
  const latestDurationRef = useRef(0)

  useEffect(() => {
    latestProgressRef.current = progress
  }, [progress])

  useEffect(() => {
    latestDurationRef.current = duration
  }, [duration])

  useEffect(() => {
    latestSnapshotRef.current = createPlaybackSessionSnapshot({
      queue,
      currentIndex,
      progress: latestProgressRef.current,
      duration: latestDurationRef.current,
      playbackMode,
    })
  }, [currentIndex, playbackMode, queue])

  useEffect(() => {
    if (isConfigLoading || hasRestoredRef.current) {
      return
    }

    hasRestoredRef.current = true

    if (!rememberPlaybackSession) {
      clearPlaybackSessionSnapshot(window.localStorage)
      return
    }

    const snapshot = readPlaybackSessionSnapshot(window.localStorage)
    if (snapshot) {
      restoreSession(snapshot)
    }
  }, [isConfigLoading, rememberPlaybackSession, restoreSession])

  useEffect(() => {
    const persistSnapshot = () => {
      if (!rememberPlaybackSession) {
        clearPlaybackSessionSnapshot(window.localStorage)
        return
      }

      const snapshot = latestSnapshotRef.current
      if (!snapshot || !currentTrack) {
        clearPlaybackSessionSnapshot(window.localStorage)
        return
      }

      writePlaybackSessionSnapshot(
        window.localStorage,
        withPlaybackSessionTiming(snapshot, {
          progress: latestProgressRef.current,
          duration: latestDurationRef.current,
        })
      )
    }

    if (isConfigLoading) {
      return
    }

    if (!rememberPlaybackSession) {
      clearPlaybackSessionSnapshot(window.localStorage)
      return
    }

    persistSnapshot()

    const intervalId = window.setInterval(
      persistSnapshot,
      PLAYBACK_SESSION_PERSIST_INTERVAL
    )
    const handleBeforeUnload = () => {
      persistSnapshot()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (status === 'paused' || status === 'error') {
        persistSnapshot()
      }
    }
  }, [
    currentIndex,
    currentTrack,
    isConfigLoading,
    playbackMode,
    rememberPlaybackSession,
    status,
  ])

  return null
}

export default PlaybackSessionBridge
