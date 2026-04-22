import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { toggleSongLike } from '@/api/list'
import { useAuthStore } from '@/stores/auth-store'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackQueueDrawerStore } from '@/stores/playback-queue-drawer-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useSearchDialogStore } from '@/stores/search-dialog-store'
import { useUserStore } from '@/stores/user'
import { getElectronWindowApi } from '@/lib/electron-runtime'
import router from '@/router'
import {
  findShortcutActionByAccelerator,
  keyboardEventToShortcut,
  normalizeShortcutBindings,
  resolveShortcutVolume,
  type ShortcutActionId,
} from '../../../shared/shortcut-keys'

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest('input, textarea, select, button, [contenteditable="true"]')
  )
}

async function toggleCurrentTrackLike() {
  const track = usePlaybackStore.getState().currentTrack

  if (!track) {
    return
  }

  const authState = useAuthStore.getState()

  if (!authState.hasHydrated || !authState.user?.userId) {
    authState.openLoginDialog()
    return
  }

  const userState = useUserStore.getState()

  if (userState.likedSongPendingIds.has(track.id)) {
    return
  }

  const nextLiked = !userState.likedSongIds.has(track.id)

  userState.toggleLikedSong(track.id, nextLiked)
  userState.setSongLikePending(track.id, true)

  try {
    await toggleSongLike({
      id: track.id,
      uid: authState.user.userId,
      like: nextLiked,
    })

    void useUserStore.getState().fetchLikedSongs()
  } catch (error) {
    console.error('shortcut toggle current song like failed', error)
    useUserStore.getState().toggleLikedSong(track.id, !nextLiked)
    toast.error(
      nextLiked ? '喜欢歌曲失败，请稍后重试' : '取消喜欢失败，请稍后重试'
    )
  } finally {
    useUserStore.getState().setSongLikePending(track.id, false)
  }
}

const PlaybackShortcutBridge = () => {
  const rawShortcutBindings = useConfigStore(
    state => state.config.shortcutBindings
  )
  const setConfig = useConfigStore(state => state.setConfig)
  const shortcutBindings = useMemo(
    () => normalizeShortcutBindings(rawShortcutBindings),
    [rawShortcutBindings]
  )

  const executeShortcutAction = useCallback(
    (actionId: ShortcutActionId) => {
      const playbackState = usePlaybackStore.getState()

      if (actionId === 'playPause') {
        playbackState.togglePlay()
        return
      }

      if (actionId === 'nextTrack') {
        playbackState.playNext()
        return
      }

      if (actionId === 'previousTrack') {
        playbackState.playPrevious()
        return
      }

      if (actionId === 'volumeUp' || actionId === 'volumeDown') {
        const nextVolume = resolveShortcutVolume(actionId, playbackState.volume)

        if (nextVolume === null) {
          return
        }

        playbackState.setVolume(nextVolume)
        void setConfig('playbackVolume', nextVolume)
        return
      }

      if (actionId === 'likeSong') {
        void toggleCurrentTrackLike()
        return
      }

      if (actionId === 'togglePlayer') {
        playbackState.setPlayerSceneOpen(!playbackState.isPlayerSceneOpen)
        return
      }

      if (actionId === 'toggleFullscreen') {
        void getElectronWindowApi()?.toggleFullScreen()
        return
      }

      if (actionId === 'toggleSearch') {
        useSearchDialogStore.getState().toggleDialog()
        return
      }

      if (actionId === 'navigateBack') {
        void router.navigate(-1)
        return
      }

      if (actionId === 'navigateForward') {
        void router.navigate(1)
        return
      }

      if (actionId === 'togglePlaylist') {
        usePlaybackQueueDrawerStore.getState().toggleDrawer()
      }
    },
    [setConfig]
  )

  useEffect(() => {
    return window.electronShortcut.onAction(executeShortcutAction)
  }, [executeShortcutAction])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) {
        return
      }

      const shortcut = keyboardEventToShortcut({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      })

      if (!shortcut) {
        return
      }

      const actionId = findShortcutActionByAccelerator(
        shortcutBindings,
        'local',
        shortcut
      )

      if (!actionId) {
        return
      }

      event.preventDefault()
      executeShortcutAction(actionId)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [executeShortcutAction, shortcutBindings])

  return null
}

export default PlaybackShortcutBridge
