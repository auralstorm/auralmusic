import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { memo, useCallback } from 'react'

import { cn } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playback-store'

const buttonBaseClassName =
  'text-primary/72 hover:text-primary flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10'

const PlaybackTransportControls = () => {
  const hasTrack = usePlaybackStore(state => Boolean(state.currentTrack))
  const isPlaying = usePlaybackStore(
    state => state.status === 'playing' || state.status === 'loading'
  )
  const togglePlay = usePlaybackStore(state => state.togglePlay)
  const playPrevious = usePlaybackStore(state => state.playPrevious)
  const playNext = usePlaybackStore(state => state.playNext)

  const handlePlayPrevious = useCallback(() => {
    playPrevious()
  }, [playPrevious])

  const handlePlayNext = useCallback(() => {
    playNext()
  }, [playNext])

  return (
    <div className='flex items-center justify-center gap-4'>
      <button
        type='button'
        aria-label='上一首'
        disabled={!hasTrack}
        onClick={handlePlayPrevious}
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
        onClick={handlePlayNext}
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
