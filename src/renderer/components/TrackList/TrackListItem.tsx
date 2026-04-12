import type { MouseEvent } from 'react'
import { formatDailySongDuration } from '@/pages/DailySongs/daily-songs.model'
import { toggleSongLike } from '@/api/list'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'
import AvatarCover from '../AvatarCover'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import MusicContextMenu from '../MusicContextMenu'

export interface songProps {
  artists?: Artist[] | null
  id: number
  coverUrl?: string
  name: string
  artistNames?: string
  duration: number
  albumName?: string
}
interface TrackListItemProps {
  item: songProps
  type?: 'default' | 'hot' | 'quick'
  coverUrl?: string
  isActive?: boolean
  isPlaying?: boolean
  onPlay?: () => void
  onLikeChangeSuccess?: (songId: number, nextLiked: boolean) => void
}

interface Artist {
  id?: number
  name: string
}

const TrackListItem = ({
  item,
  type = 'default',
  coverUrl,
  isActive = false,
  isPlaying = false,
  onPlay,
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

  const handleToggleSongLike = async (
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    event?.preventDefault()
    event?.stopPropagation()

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
    <MusicContextMenu
      coverUrl={item.coverUrl || coverUrl}
      artistName={item?.artistNames}
      onPlayClick={() => onPlay?.()}
      onToggleClick={handleToggleSongLike}
      name={item.name}
      likeStatus={isLiked}
    >
      <div
        onDoubleClick={() => onPlay?.()}
        className={cn(
          'hover:bg-primary/5 grid cursor-pointer grid-cols-3 items-center rounded-[15px] px-4 py-4 transition-colors',
          isActive && 'bg-primary/8',
          type === 'default'
            ? 'grid-cols-[2.5fr_1fr_auto] gap-4'
            : 'grid-cols-[1.5fr_auto] gap-2'
        )}
      >
        <div className='flex items-center gap-4'>
          {(item.coverUrl || coverUrl) && (
            <AvatarCover
              className='w-12.5 shrink-0'
              url={item.coverUrl || coverUrl || ''}
            />
          )}

          <div className='flex-1 truncate'>
            <div
              className={cn(
                'truncate text-[15px] font-semibold',
                isPlaying && 'text-primary'
              )}
            >
              {item.name}
            </div>
            <div className='text-primary/50 truncate text-xs md:text-sm'>
              {type === 'hot'
                ? formatArtistNames(item.artists)
                : item.artistNames}
            </div>
          </div>
        </div>
        {type === 'default' && (
          <div className='text-primary/50 hidden truncate text-[15px] md:block'>
            {item.albumName}
          </div>
        )}

        <div className='text-primary/50 flex items-center justify-end gap-5 text-[15px]'>
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
    </MusicContextMenu>
  )
}

export default TrackListItem
