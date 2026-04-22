import { Heart } from 'lucide-react'
import { memo } from 'react'

import AvatarCover from '@/components/AvatarCover'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playback-store'
import { DEFAULT_PLAYBACK_CONTROL_TRACK } from './model'
import { useCurrentTrackLike } from './useCurrentTrackLike'

type PlaybackTrackInfoProps = {
  hasTrack: boolean
}

const PlaybackTrackInfo = ({ hasTrack }: PlaybackTrackInfoProps) => {
  const trackId = usePlaybackStore(state => state.currentTrack?.id ?? null)
  const trackName = usePlaybackStore(
    state => state.currentTrack?.name ?? DEFAULT_PLAYBACK_CONTROL_TRACK.name
  )
  const trackArtistName = usePlaybackStore(
    state =>
      state.currentTrack?.artistNames ??
      DEFAULT_PLAYBACK_CONTROL_TRACK.artistName
  )
  const trackCoverUrl = usePlaybackStore(
    state =>
      state.currentTrack?.coverUrl ?? DEFAULT_PLAYBACK_CONTROL_TRACK.coverUrl
  )
  const openPlayerScene = usePlaybackStore(state => state.openPlayerScene)
  const { isLiked, isLikePending, handleToggleLike } =
    useCurrentTrackLike(trackId)

  return (
    <div className='flex min-w-0 items-center gap-3'>
      <button
        type='button'
        onClick={openPlayerScene}
        className='group flex min-w-0 items-center gap-3 rounded-2xl pr-2 text-left transition-colors outline-none'
      >
        <AvatarCover
          url={resizeImageUrl(
            trackCoverUrl,
            imageSizes.listCover.width,
            imageSizes.listCover.height
          )}
          className='size-11 shrink-0'
          wrapperClass='shrink-0'
          rounded='12px'
          isAutoHovered
        />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold'>{trackName}</div>
          <div className='text-muted-foreground truncate text-xs'>
            {trackArtistName}
          </div>
        </div>
      </button>
      <button
        type='button'
        aria-label={isLiked ? '取消喜欢' : '喜欢歌曲'}
        disabled={!hasTrack || isLikePending}
        onClick={handleToggleLike}
        className={cn(
          'text-primary/72 hover:text-primary flex size-9 items-center justify-center rounded-full transition-colors',
          'hover:bg-primary/10',
          (!hasTrack || isLikePending) &&
            'cursor-not-allowed opacity-45 hover:bg-transparent'
        )}
      >
        <Heart
          className={cn(
            'size-5 transition-colors',
            isLiked ? 'fill-current text-red-500' : 'text-foreground/60'
          )}
        />
      </button>
    </div>
  )
}

export default memo(PlaybackTrackInfo)
