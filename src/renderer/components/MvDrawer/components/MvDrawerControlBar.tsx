import { Maximize2, Minimize2, Pause, Play } from 'lucide-react'

import { Slider } from '@/components/ui/slider'
import {
  formatMvDrawerRemainingTime,
  resolveMvDrawerVolumeIcon,
} from '../model'
import type { MvDrawerControlBarProps } from '../types'

const buttonClassName =
  'app-intel-dark-surface inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/38 text-white shadow-[0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-md transition-colors hover:bg-black/56 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 cursor-pointer'

const MvDrawerControlBar = ({
  canPlay,
  currentTime,
  duration,
  isFullscreen,
  isMuted,
  isPlaying,
  volume,
  onSeekChange,
  onSeekCommit,
  onToggleFullscreen,
  onToggleMute,
  onTogglePlay,
  onVolumeChange,
}: MvDrawerControlBarProps) => {
  const progressMax = Math.max(duration, 0.1)
  const VolumeIcon = resolveMvDrawerVolumeIcon(isMuted, volume)

  return (
    <div className='pointer-events-none absolute inset-x-0 bottom-0 w-full bg-gradient-to-t from-black/88 via-black/52 to-transparent px-5 pt-10 pb-3'>
      <div className='pointer-events-auto flex items-center gap-3 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]'>
        <button
          type='button'
          aria-label={isPlaying ? '暂停播放' : '开始播放'}
          disabled={!canPlay}
          onClick={onTogglePlay}
          className={buttonClassName}
        >
          {isPlaying ? (
            <Pause className='size-4.5 fill-current' />
          ) : (
            <Play className='ml-0.5 size-4.5 fill-current' />
          )}
        </button>

        <div className='app-intel-dark-surface min-w-0 flex-1 rounded-full bg-black/28 px-2 py-2 backdrop-blur-sm'>
          <Slider
            aria-label='MV 播放进度'
            min={0}
            max={progressMax}
            step={0.1}
            value={[Math.min(currentTime, progressMax)]}
            disabled={!canPlay || duration <= 0}
            onValueChange={onSeekChange}
            onValueCommit={onSeekCommit}
            className='cursor-pointer **:data-[slot=slider-range]:bg-indigo-500 **:data-[slot=slider-thumb]:size-3.5 **:data-[slot=slider-thumb]:border-white/35 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-track]:h-1 **:data-[slot=slider-track]:bg-white/20'
          />
        </div>

        <span className='min-w-13 text-right text-xs font-medium text-white/90 tabular-nums'>
          {formatMvDrawerRemainingTime(currentTime, duration)}
        </span>

        <button
          type='button'
          aria-label={isMuted ? '取消静音' : '静音'}
          disabled={!canPlay}
          onClick={onToggleMute}
          className={buttonClassName}
        >
          <VolumeIcon className='size-4.5' />
        </button>

        <div className='app-intel-dark-surface w-24 rounded-full bg-black/28 px-2 py-2 backdrop-blur-sm'>
          <Slider
            aria-label='MV 音量'
            min={0}
            max={100}
            step={1}
            value={[volume]}
            disabled={!canPlay}
            onValueChange={onVolumeChange}
            className='cursor-pointer **:data-[slot=slider-range]:bg-indigo-500 **:data-[slot=slider-thumb]:size-3.5 **:data-[slot=slider-thumb]:border-white/35 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-track]:h-1 **:data-[slot=slider-track]:bg-white/20'
          />
        </div>

        <button
          type='button'
          aria-label={isFullscreen ? '退出全屏播放' : '全屏播放'}
          onClick={onToggleFullscreen}
          className={buttonClassName}
        >
          {isFullscreen ? (
            <Minimize2 className='size-4.5' />
          ) : (
            <Maximize2 className='size-4.5' />
          )}
        </button>
      </div>
    </div>
  )
}

export default MvDrawerControlBar
