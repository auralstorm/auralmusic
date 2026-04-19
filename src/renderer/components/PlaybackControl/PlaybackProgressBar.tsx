import { Slider } from '@/components/ui/slider'
import { usePlaybackStore } from '@/stores/playback-store'
import { usePlaybackControlProgress } from './usePlaybackControlProgress'
import { memo } from 'react'

const PlaybackProgressBar = () => {
  const track = usePlaybackStore(state => state.currentTrack)
  const progress = usePlaybackStore(state => state.progress)
  const duration = usePlaybackStore(state => state.duration)
  const seekTo = usePlaybackStore(state => state.seekTo)

  const {
    currentProgress,
    maxProgress,
    handleProgressChange,
    handleProgressCommit,
  } = usePlaybackControlProgress({
    duration,
    hasTrack: Boolean(track),
    progress,
    seekTo,
  })

  return (
    <Slider
      aria-label='播放进度'
      min={0}
      max={maxProgress}
      step={1000}
      value={[currentProgress]}
      disabled={!track || duration <= 0}
      onValueChange={handleProgressChange}
      onValueCommit={handleProgressCommit}
      className='**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary/30 **:data-[slot=slider-thumb]:bg-primary absolute -top-0.75 right-0 left-0 z-10 h-2 cursor-pointer **:data-[slot=slider-thumb]:size-2.5 **:data-[slot=slider-track]:h-0.5 **:data-[slot=slider-track]:rounded-none **:data-[slot=slider-track]:bg-transparent'
    />
  )
}

export default memo(PlaybackProgressBar)
