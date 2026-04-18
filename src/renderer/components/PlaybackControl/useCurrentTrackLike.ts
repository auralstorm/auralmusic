import { toast } from 'sonner'
import { toggleSongLike } from '@/api/list'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'
import type { PlaybackTrack } from '../../../shared/playback.ts'

const LIKE_SONG_FAILED_MESSAGE =
  '\u559c\u6b22\u6b4c\u66f2\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'
const UNLIKE_SONG_FAILED_MESSAGE =
  '\u53d6\u6d88\u559c\u6b22\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'

export function useCurrentTrackLike(track: PlaybackTrack | null) {
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const likedSongIds = useUserStore(state => state.likedSongIds)
  const likedSongPendingIds = useUserStore(state => state.likedSongPendingIds)
  const toggleLikedSong = useUserStore(state => state.toggleLikedSong)
  const setSongLikePending = useUserStore(state => state.setSongLikePending)
  const fetchLikedSongs = useUserStore(state => state.fetchLikedSongs)

  const isLiked = track ? likedSongIds.has(track.id) : false
  const isLikePending = track ? likedSongPendingIds.has(track.id) : false

  const handleToggleLike = async () => {
    if (!track) {
      return
    }

    if (!hasHydrated || !userId) {
      openLoginDialog()
      return
    }

    if (isLikePending) {
      return
    }

    const nextLiked = !isLiked

    toggleLikedSong(track.id, nextLiked)
    setSongLikePending(track.id, true)

    try {
      await toggleSongLike({
        id: track.id,
        uid: userId,
        like: nextLiked,
      })

      void fetchLikedSongs()
    } catch (error) {
      console.error('toggle current song like failed', error)
      toggleLikedSong(track.id, !nextLiked)
      toast.error(
        nextLiked ? LIKE_SONG_FAILED_MESSAGE : UNLIKE_SONG_FAILED_MESSAGE
      )
    } finally {
      setSongLikePending(track.id, false)
    }
  }

  return {
    isLiked,
    isLikePending,
    handleToggleLike,
  }
}
