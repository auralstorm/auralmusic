import type { MouseEvent } from 'react'
import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { toggleSongLike } from '@/api/list'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { formatDailySongDuration } from '@/pages/DailySongs/daily-songs.model'
import { useAuthStore } from '@/stores/auth-store'
import { useCollectToPlaylistStore } from '@/stores/collect-to-playlist-store'
import { useConfigStore } from '@/stores/config-store'
import { useUserStore } from '@/stores/user'
import AvatarCover from '../AvatarCover'
import MusicContextMenu from '../MusicContextMenu'
import {
  handleTrackDownload,
  TRACK_DOWNLOAD_TOASTS,
} from './track-list-download.model'
import {
  formatTrackListArtistNames,
  shouldNavigateToArtistDetail,
} from './model'
import type { TrackListItemProps } from './types'
import { Button } from '../ui/button'

const TrackListItem = ({
  item,
  type = 'default',
  coverUrl,
  isActive = false,
  isPlaying = false,
  onPlay,
  onAddToQueue,
  onLikeChangeSuccess,
}: TrackListItemProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const fetchLikedSongs = useUserStore(state => state.fetchLikedSongs)
  const toggleLikedSong = useUserStore(state => state.toggleLikedSong)
  const setSongLikePending = useUserStore(state => state.setSongLikePending)
  const openCollectToPlaylistDrawer = useCollectToPlaylistStore(
    state => state.openDrawer
  )
  const downloadEnabled = useConfigStore(state => state.config.downloadEnabled)
  const downloadQuality = useConfigStore(state => state.config.downloadQuality)
  const downloadQualityPolicy = useConfigStore(
    state => state.config.downloadQualityPolicy
  )
  const isLiked = useUserStore(state =>
    item.id ? state.likedSongIds.has(item.id) : false
  )
  const isLikePending = useUserStore(state =>
    item.id ? state.likedSongPendingIds.has(item.id) : false
  )

  const artistName =
    item.artistNames || formatTrackListArtistNames(item.artists)
  const artistList = (item.artists || []).filter(artist =>
    Boolean(artist.name?.trim())
  )
  const hotArtistName = formatTrackListArtistNames(artistList)
  const displayedArtistName =
    type === 'hot' ? hotArtistName || artistName : artistName
  const shouldRenderArtistLinks = artistList.some(artist => Boolean(artist.id))

  const handleOpenArtistDetail = (
    event: MouseEvent<HTMLButtonElement>,
    artistId?: number
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (!artistId) {
      return
    }

    if (!shouldNavigateToArtistDetail(location.pathname, artistId)) {
      return
    }

    navigate(`/artists/${artistId}`)
  }

  const renderArtistName = () => {
    if (!shouldRenderArtistLinks) {
      return displayedArtistName
    }

    return artistList.map((artist, index) => (
      <span key={`${artist.id || artist.name}-${index}`} className='inline'>
        {artist.id ? (
          <Button
            variant='link'
            onClick={event => handleOpenArtistDetail(event, artist.id)}
            onDoubleClick={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            className='hover:text-foreground text-foreground/50 inline cursor-pointer px-0 py-0 underline-offset-2 transition-colors hover:underline focus-visible:underline focus-visible:outline-none'
          >
            {artist.name}
          </Button>
        ) : (
          <span>{artist.name}</span>
        )}
        {index < artistList.length - 1 ? (
          <span className='text-foreground/50 mx-1'>/</span>
        ) : null}
      </span>
    ))
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
      openLoginDialog()
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

  const handleCollectToPlaylist = () => {
    if (!item.id) {
      return
    }

    if (!hasHydrated || !userId) {
      openLoginDialog()
      return
    }

    openCollectToPlaylistDrawer({
      songId: item.id,
      songName: item.name,
      artistName,
      coverUrl: item.coverUrl || coverUrl || '',
    })
  }

  const handleDownloadClick = async () => {
    const electronDownload = window.electronDownload

    if (!electronDownload) {
      toast.error(TRACK_DOWNLOAD_TOASTS.unavailable)
      return
    }

    try {
      const didEnqueue = await handleTrackDownload({
        item,
        coverUrl,
        requestedQuality: downloadQuality,
        downloadEnabled,
        downloadQualityPolicy,
        enqueueSongDownload: payload =>
          electronDownload.enqueueSongDownload(payload),
        toastError: message => {
          toast.error(message)
        },
      })

      if (didEnqueue) {
        toast.success(TRACK_DOWNLOAD_TOASTS.enqueued)
      }
    } catch (error) {
      console.error('enqueue song download failed', error)
      toast.error(
        error instanceof Error
          ? error.message
          : TRACK_DOWNLOAD_TOASTS.enqueueFailed
      )
    }
  }

  return (
    <MusicContextMenu
      songId={item.id}
      name={item.name}
      artistName={artistName}
      coverUrl={item.coverUrl || coverUrl}
      likeStatus={isLiked}
      onPlayClick={() => onPlay?.()}
      onAddToQueueClick={() => onAddToQueue?.()}
      onToggleClick={handleToggleSongLike}
      onCollectToPlaylist={handleCollectToPlaylist}
      onDownload={
        downloadEnabled ? () => void handleDownloadClick() : undefined
      }
    >
      <div
        onDoubleClick={() => onPlay?.()}
        className={cn(
          'hover:bg-foreground/8 grid cursor-pointer items-center rounded-[15px] px-4 py-4 transition-colors',
          isActive && 'bg-primary/8',
          type === 'default'
            ? 'grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_120px] gap-4'
            : 'grid-cols-[minmax(0,1fr)_30px] gap-0'
        )}
      >
        <div className='flex items-center gap-4'>
          {(item.coverUrl || coverUrl) && (
            <AvatarCover
              className='w-12.5 shrink-0'
              url={resizeImageUrl(
                item.coverUrl || coverUrl || '',
                imageSizes.listCover.width,
                imageSizes.listCover.height
              )}
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
            <div className='text-foreground/70 truncate text-xs md:text-sm'>
              {renderArtistName()}
            </div>
          </div>
        </div>

        {type === 'default' && (
          <div className='text-foreground/70 hidden truncate text-[15px] md:block'>
            {item.albumName}
          </div>
        )}

        <div className='text-foreground/70 flex items-center justify-end gap-5 text-[15px]'>
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
