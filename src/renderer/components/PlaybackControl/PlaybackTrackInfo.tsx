import { Heart } from 'lucide-react'
import { memo } from 'react'

import AvatarCover from '@/components/AvatarCover'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playback-store'
import { createPlaybackControlTrack } from './model'
import { useCurrentTrackLike } from './useCurrentTrackLike'

type PlaybackTrackInfoProps = {
  hasTrack: boolean
}

const PlaybackTrackInfo = ({ hasTrack }: PlaybackTrackInfoProps) => {
  const track = usePlaybackStore(state => state.currentTrack)
  const openPlayerScene = usePlaybackStore(state => state.openPlayerScene)
  const currentTrack = createPlaybackControlTrack(track)
  const { isLiked, isLikePending, handleToggleLike } =
    useCurrentTrackLike(track)

  return (
    <div className='flex min-w-0 items-center gap-3'>
      <button
        type='button'
        onClick={openPlayerScene}
        className='group flex min-w-0 items-center gap-3 rounded-2xl pr-2 text-left transition-colors outline-none'
      >
        <AvatarCover
          url={resizeImageUrl(
            currentTrack.coverUrl,
            imageSizes.listCover.width,
            imageSizes.listCover.height
          )}
          className='size-11 shrink-0'
          wrapperClass='shrink-0'
          rounded='12px'
          isAutoHovered
        />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold'>
            {currentTrack.name}
          </div>
          <div className='text-muted-foreground truncate text-xs'>
            {currentTrack.artistName}
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
