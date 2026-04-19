import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { memo } from 'react'

import { cn } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playback-store'
import { getPlaybackTransportState } from './model'

const buttonBaseClassName =
  'text-primary/72 hover:text-primary flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10'

const PlaybackTransportControls = () => {
  const track = usePlaybackStore(state => state.currentTrack)
  const status = usePlaybackStore(state => state.status)
  const togglePlay = usePlaybackStore(state => state.togglePlay)
  const playPrevious = usePlaybackStore(state => state.playPrevious)
  const playNext = usePlaybackStore(state => state.playNext)

  const { hasTrack, isPlaying } = getPlaybackTransportState({
    track,
    status,
  })

  return (
    <div className='flex items-center justify-center gap-4'>
      <button
        type='button'
        aria-label='上一首'
        disabled={!hasTrack}
        onClick={() => {
          playPrevious()
        }}
        className={cn(
          buttonBaseClassName,
          !hasTrack && 'cursor-not-allowed opacity-45 hover:bg-transparent'
        )}
      >
        <SkipBack className='size-5 fill-current' />
      </button>
      <button
        type='button'
        aria-label={isPlaying ? '暂停' : '播放'}
        disabled={!hasTrack}
        onClick={togglePlay}
        className={cn(
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground flex size-11 items-center justify-center rounded-full transition-colors',
          !hasTrack && 'cursor-not-allowed opacity-45 hover:bg-transparent'
        )}
      >
        {isPlaying ? (
          <Pause className='size-5 fill-current' />
        ) : (
          <Play className='ml-0.5 size-5 fill-current' />
        )}
      </button>
      <button
        type='button'
        aria-label='下一首'
        disabled={!hasTrack}
        onClick={() => {
          playNext()
        }}
        className={cn(
          buttonBaseClassName,
          !hasTrack && 'cursor-not-allowed opacity-45 hover:bg-transparent'
        )}
      >
        <SkipForward className='size-5 fill-current' />
      </button>
    </div>
  )
}

export default memo(PlaybackTransportControls)
