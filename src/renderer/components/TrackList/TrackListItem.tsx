import type { MouseEvent } from 'react'
import { formatDailySongDuration } from '@/pages/DailySongs/daily-songs.model'
import { toggleSongLike } from '@/api/list'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'
import AvatarCover from '../AvatarCover'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface songProps {
  artists: Artist[] | null | undefined
  id: number
  coverUrl: string
  name: string
  artistNames: string
  duration: number
  albumName: string
}
interface TrackListItemProps {
  item: songProps
  type?: 'default' | 'hot'
  onLikeChangeSuccess?: (songId: number, nextLiked: boolean) => void
}

interface Artist {
  id: number
  name: string
}

const TrackListItem = ({
  item,
  type = 'default',
  onLikeChangeSuccess,
}: TrackListItemProps) => {
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const fetchLikedSongs = useUserStore(state => state.fetchLikedSongs)
  const toggleLikedSong = useUserStore(state => state.toggleLikedSong)
  const setSongLikePending = useUserStore(state => state.setSongLikePending)
  const isLiked = useUserStore(state =>
    item.id ? state.likedSongIds.has(item.id) : false
  )
  const isLikePending = useUserStore(state =>
    item.id ? state.likedSongPendingIds.has(item.id) : false
  )

  const formatArtistNames = (artistNames?: Artist[] | null) => {
    if (!artistNames || artistNames.length === 0) return ''
    return artistNames.map(artist => artist.name).join(' / ')
  }

  const handleToggleSongLike = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!item.id) {
      return
    }

    if (!hasHydrated || !userId) {
      openLoginDialog('email')
      return
    }

    if (isLikePending) {
      return
    }

    const nextLiked = !isLiked

    toggleLikedSong(item.id, nextLiked)
    setSongLikePending(item.id, true)

    try {
      await toggleSongLike({
        id: item.id,
        uid: userId,
        like: nextLiked,
      })

      onLikeChangeSuccess?.(item.id, nextLiked)
      void fetchLikedSongs()
    } catch (error) {
      console.error('toggle song like failed', error)
      toggleLikedSong(item.id, !nextLiked)
      toast.error(
        nextLiked ? '喜欢歌曲失败，请稍后重试' : '取消喜欢失败，请稍后重试'
      )
    } finally {
      setSongLikePending(item.id, false)
    }
  }

  return (
    <div
      className={cn(
        'hover:bg-primary/5 grid cursor-pointer grid-cols-3 items-center rounded-[15px] px-4 py-4',
        type === 'hot' && 'grid-cols-2'
      )}
    >
      <div className='flex items-center gap-4'>
        {item.coverUrl && (
          <AvatarCover className='w-12.5 shrink-0' url={item.coverUrl} />
        )}

        <div className='flex-1 truncate'>
          <div className='truncate text-[15px] font-semibold'>{item.name}</div>
          <div className='truncate text-xs text-neutral-500 md:text-sm'>
            {type === 'default'
              ? item.artistNames
              : formatArtistNames(item.artists)}
          </div>
        </div>
      </div>
      {type === 'default' && (
        <div className='hidden truncate text-[15px] text-neutral-700 md:block'>
          {item.albumName}
        </div>
      )}

      <div className='flex items-center justify-end gap-5 text-[15px] text-neutral-700'>
        <button
          type='button'
          disabled={!item.id || isLikePending}
          onClick={handleToggleSongLike}
          aria-label={isLiked ? '取消喜欢' : '喜欢歌曲'}
          className={cn(
            'transition-opacity',
            (!item.id || isLikePending) && 'cursor-not-allowed opacity-60'
          )}
        >
          <Heart
            className={cn(
              'size-6 transition-colors',
              isLiked ? 'fill-current text-red-500' : 'text-neutral-700'
            )}
          />
        </button>
        {type === 'default' && formatDailySongDuration(item.duration)}
      </div>
    </div>
  )
}

export default TrackListItem
