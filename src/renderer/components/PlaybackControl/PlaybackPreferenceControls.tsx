import {
  ListMusic,
  Repeat1,
  Repeat2,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { memo } from 'react'

import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { usePlaybackControlPreferences } from './usePlaybackControlPreferences'

type PlaybackPreferenceControlsProps = {
  onOpenQueueDrawer: () => void
}

const buttonBaseClassName =
  'text-primary/72 hover:text-primary flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10'

const PlaybackPreferenceControls = ({
  onOpenQueueDrawer,
}: PlaybackPreferenceControlsProps) => {
  const {
    isMuted,
    playbackMode,
    playbackModeLabel,
    volumePercent,
    handleToggleMute,
    handleTogglePlaybackMode,
    handleVolumeChange,
    handleVolumeCommit,
  } = usePlaybackControlPreferences()

  return (
    <div className='text-foreground/70 flex items-center justify-end gap-3'>
      <button
        type='button'
        aria-label='播放列表'
        onClick={onOpenQueueDrawer}
        className={buttonBaseClassName}
      >
        <ListMusic className='size-5' />
      </button>
      <button
        type='button'
        aria-label={playbackModeLabel}
        onClick={handleTogglePlaybackMode}
        className={cn(buttonBaseClassName, 'text-primary hover:text-primary')}
      >
        {playbackMode === 'repeat-all' ? (
          <Repeat2 className='size-5' />
        ) : playbackMode === 'shuffle' ? (
          <Shuffle className='size-5' />
        ) : (
          <Repeat1 className='size-5' />
        )}
      </button>
      <button
        type='button'
        aria-label={isMuted ? '取消静音' : '静音'}
        onClick={handleToggleMute}
        className={cn(buttonBaseClassName, 'size-7')}
      >
        {isMuted ? (
          <VolumeX className='size-4 shrink-0' />
        ) : (
          <Volume2 className='size-4 shrink-0' />
        )}
      </button>
      <Slider
        aria-label='音量'
        min={0}
        max={100}
        step={1}
        value={[volumePercent]}
        onValueChange={handleVolumeChange}
        onValueCommit={handleVolumeCommit}
        className='**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:bg-primary **:data-[slot=slider-track]:bg-foreground/18 w-24'
      />
    </div>
  )
}

export default memo(PlaybackPreferenceControls)
