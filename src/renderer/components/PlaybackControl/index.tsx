import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat1,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useState } from 'react'

import AvatarCover from '@/components/AvatarCover'
import PlaybackQueueDrawer from '@/components/PlaybackQueueDrawer'
import { Slider } from '@/components/ui/slider'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playback-store'
import { createPlaybackControlTrack } from './model'
import type { ControlButtonProps } from './types'
import { useCurrentTrackLike } from './useCurrentTrackLike'
import { usePlaybackControlPreferences } from './usePlaybackControlPreferences'
import { usePlaybackControlProgress } from './usePlaybackControlProgress'

const ControlButton = ({
  label,
  children,
  className,
  disabled,
  onClick,
}: ControlButtonProps) => {
  return (
    <button
      type='button'
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'text-primary/72 hover:text-primary flex size-9 items-center justify-center rounded-full transition-colors',
        'hover:bg-primary/10',
        disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent',
        className
      )}
    >
      {children}
    </button>
  )
}

const PlaybackControl = () => {
  const track = usePlaybackStore(state => state.currentTrack)
  const status = usePlaybackStore(state => state.status)
  const progress = usePlaybackStore(state => state.progress)
  const duration = usePlaybackStore(state => state.duration)
  const togglePlay = usePlaybackStore(state => state.togglePlay)
  const playPrevious = usePlaybackStore(state => state.playPrevious)
  const playNext = usePlaybackStore(state => state.playNext)
  const seekTo = usePlaybackStore(state => state.seekTo)
  const openPlayerScene = usePlaybackStore(state => state.openPlayerScene)

  const hasTrack = Boolean(track)
  const currentTrack = createPlaybackControlTrack(track)
  const isPlaying = status === 'playing' || status === 'loading'
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false)
  const { isLiked, isLikePending, handleToggleLike } =
    useCurrentTrackLike(track)
  const {
    currentProgress,
    maxProgress,
    handleProgressChange,
    handleProgressCommit,
  } = usePlaybackControlProgress({
    duration,
    hasTrack,
    progress,
    seekTo,
  })
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
    <>
      <footer className='window-no-drag bg-background/50 border-border/60 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-2xl'>
        <Slider
          aria-label='\u64ad\u653e\u8fdb\u5ea6'
          min={0}
          max={maxProgress}
          step={1000}
          value={[currentProgress]}
          disabled={!hasTrack || duration <= 0}
          onValueChange={handleProgressChange}
          onValueCommit={handleProgressCommit}
          className='**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary/30 **:data-[slot=slider-thumb]:bg-primary absolute -top-0.75 right-0 left-0 z-10 h-2 cursor-pointer **:data-[slot=slider-thumb]:size-2.5 **:data-[slot=slider-track]:h-0.5 **:data-[slot=slider-track]:rounded-none **:data-[slot=slider-track]:bg-transparent'
        />

        <div className='grid h-18 grid-cols-[minmax(220px,1fr)_minmax(260px,420px)_minmax(220px,1fr)] items-center gap-6 px-12 xl:px-25 2xl:px-50'>
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
            <ControlButton
              label={
                isLiked
                  ? '\u53d6\u6d88\u559c\u6b22'
                  : '\u559c\u6b22\u6b4c\u66f2'
              }
              disabled={!hasTrack || isLikePending}
              onClick={handleToggleLike}
            >
              <Heart
                className={cn(
                  'size-5 transition-colors',
                  isLiked ? 'fill-current text-red-500' : 'text-foreground/60'
                )}
              />
            </ControlButton>
          </div>

          <div className='flex items-center justify-center gap-4'>
            <ControlButton
              label='\u4e0a\u4e00\u9996'
              disabled={!hasTrack}
              onClick={() => {
                playPrevious()
              }}
            >
              <SkipBack className='size-5 fill-current' />
            </ControlButton>
            <ControlButton
              label={isPlaying ? '\u6682\u505c' : '\u64ad\u653e'}
              disabled={!hasTrack}
              onClick={togglePlay}
              className='bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground size-11'
            >
              {isPlaying ? (
                <Pause className='size-5 fill-current' />
              ) : (
                <Play className='ml-0.5 size-5 fill-current' />
              )}
            </ControlButton>
            <ControlButton
              label='\u4e0b\u4e00\u9996'
              disabled={!hasTrack}
              onClick={() => {
                playNext()
              }}
            >
              <SkipForward className='size-5 fill-current' />
            </ControlButton>
          </div>

          <div className='text-foreground/70 flex items-center justify-end gap-3'>
            <ControlButton
              label='\u64ad\u653e\u5217\u8868'
              onClick={() => {
                setIsQueueDrawerOpen(true)
              }}
            >
              <ListMusic className='size-5' />
            </ControlButton>
            <ControlButton
              label={playbackModeLabel}
              onClick={handleTogglePlaybackMode}
              className='text-primary hover:text-primary'
            >
              {playbackMode === 'repeat-all' ? (
                <Repeat2 className='size-5' />
              ) : playbackMode === 'shuffle' ? (
                <Shuffle className='size-5' />
              ) : (
                <Repeat1 className='size-5' />
              )}
            </ControlButton>
            <ControlButton
              label={isMuted ? '\u53d6\u6d88\u9759\u97f3' : '\u9759\u97f3'}
              onClick={handleToggleMute}
              className='size-7'
            >
              {isMuted ? (
                <VolumeX className='size-4 shrink-0' />
              ) : (
                <Volume2 className='size-4 shrink-0' />
              )}
            </ControlButton>
            <Slider
              aria-label='\u97f3\u91cf'
              min={0}
              max={100}
              step={1}
              value={[volumePercent]}
              onValueChange={handleVolumeChange}
              onValueCommit={handleVolumeCommit}
              className='**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:bg-primary **:data-[slot=slider-track]:bg-foreground/18 w-24'
            />
          </div>
        </div>
      </footer>

      <PlaybackQueueDrawer
        open={isQueueDrawerOpen}
        onOpenChange={setIsQueueDrawerOpen}
      />
    </>
  )
}

export default PlaybackControl
