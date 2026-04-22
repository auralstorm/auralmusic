import { toast } from 'sonner'
import { toggleSongLike } from '@/api/list'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'

const LIKE_SONG_FAILED_MESSAGE =
  '\u559c\u6b22\u6b4c\u66f2\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'
const UNLIKE_SONG_FAILED_MESSAGE =
  '\u53d6\u6d88\u559c\u6b22\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'

export function useCurrentTrackLike(trackId: number | null) {
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const likedSongIds = useUserStore(state => state.likedSongIds)
  const likedSongPendingIds = useUserStore(state => state.likedSongPendingIds)
  const toggleLikedSong = useUserStore(state => state.toggleLikedSong)
  const setSongLikePending = useUserStore(state => state.setSongLikePending)
  const fetchLikedSongs = useUserStore(state => state.fetchLikedSongs)

  const isLiked = trackId !== null ? likedSongIds.has(trackId) : false
  const isLikePending =
    trackId !== null ? likedSongPendingIds.has(trackId) : false

  const handleToggleLike = async () => {
    if (trackId === null) {
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

    toggleLikedSong(trackId, nextLiked)
    setSongLikePending(trackId, true)

    try {
      await toggleSongLike({
        id: trackId,
        uid: userId,
        like: nextLiked,
      })

      void fetchLikedSongs()
    } catch (error) {
      console.error('toggle current song like failed', error)
      toggleLikedSong(trackId, !nextLiked)
      toast.error(
        nextLiked ? LIKE_SONG_FAILED_MESSAGE : UNLIKE_SONG_FAILED_MESSAGE
      )
    } finally {
      setSongLikePending(trackId, false)
    }
  }

  return {
    isLiked,
    isLikePending,
    handleToggleLike,
  }
}
