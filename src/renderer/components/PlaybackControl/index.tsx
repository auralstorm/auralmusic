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
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { toggleSongLike } from '@/api/list'
import AvatarCover from '@/components/AvatarCover'
import PlaybackQueueDrawer from '@/components/PlaybackQueueDrawer'
import { Slider } from '@/components/ui/slider'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useUserStore } from '@/stores/user'
import {
  getNextPlaybackMode,
  normalizePlaybackMode,
  normalizePlaybackVolume,
  type PlaybackMode,
} from '../../../shared/playback.ts'

type PlaybackControlTrack = {
  name: string
  artistName: string
  coverUrl: string
}

const DEFAULT_TRACK: PlaybackControlTrack = {
  name: '暂无播放歌曲',
  artistName: 'AuralMusic',
  coverUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="%2393c5fd"/><stop offset="1" stop-color="%23f9a8d4"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(%23g)"/><path d="M78 31v47.5a16 16 0 1 1-8-13.85V42.2l-30 6.24V84.5a16 16 0 1 1-8-13.85V42z" fill="white" fill-opacity=".88"/></svg>',
}

const PLAYBACK_MODE_LABELS: Record<PlaybackMode, string> = {
  'repeat-all': '循环播放',
  shuffle: '随机播放',
  'repeat-one': '单曲循环',
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

type ControlButtonProps = {
  label: string
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

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
  const volume = usePlaybackStore(state => state.volume)
  const playbackMode = usePlaybackStore(state => state.playbackMode)
  const togglePlay = usePlaybackStore(state => state.togglePlay)
  const playPrevious = usePlaybackStore(state => state.playPrevious)
  const playNext = usePlaybackStore(state => state.playNext)
  const setPlaybackMode = usePlaybackStore(state => state.setPlaybackMode)
  const setVolume = usePlaybackStore(state => state.setVolume)
  const toggleMute = usePlaybackStore(state => state.toggleMute)
  const seekTo = usePlaybackStore(state => state.seekTo)
  const openPlayerScene = usePlaybackStore(state => state.openPlayerScene)
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const persistedVolume = useConfigStore(state => state.config.playbackVolume)
  const persistedPlaybackMode = useConfigStore(
    state => state.config.playbackMode
  )
  const setConfig = useConfigStore(state => state.setConfig)
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const likedSongIds = useUserStore(state => state.likedSongIds)
  const likedSongPendingIds = useUserStore(state => state.likedSongPendingIds)
  const toggleLikedSong = useUserStore(state => state.toggleLikedSong)
  const setSongLikePending = useUserStore(state => state.setSongLikePending)
  const fetchLikedSongs = useUserStore(state => state.fetchLikedSongs)

  const hasTrack = Boolean(track)
  const currentTrack = track
    ? {
        name: track.name,
        artistName: track.artistNames,
        coverUrl: track.coverUrl,
      }
    : DEFAULT_TRACK
  const isPlaying = status === 'playing' || status === 'loading'
  const isLiked = track ? likedSongIds.has(track.id) : false
  const isLikePending = track ? likedSongPendingIds.has(track.id) : false
  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false)
  const maxProgress = Math.max(duration, 1)
  const currentProgress = Math.min(dragProgress ?? progress, maxProgress)
  const volumePercent = clampPercent(volume)
  const isMuted = volumePercent === 0
  const playbackModeLabel = PLAYBACK_MODE_LABELS[playbackMode]

  useEffect(() => {
    if (hasTrack && duration > 0) {
      return
    }

    setDragProgress(null)
  }, [duration, hasTrack])

  useEffect(() => {
    if (isConfigLoading) {
      return
    }

    setVolume(normalizePlaybackVolume(persistedVolume))
    setPlaybackMode(normalizePlaybackMode(persistedPlaybackMode))
  }, [
    isConfigLoading,
    persistedPlaybackMode,
    persistedVolume,
    setPlaybackMode,
    setVolume,
  ])

  const handleProgressChange = (value: number[]) => {
    setDragProgress(value[0] ?? 0)
  }

  const handleProgressCommit = (value: number[]) => {
    const nextProgress = value[0] ?? 0

    setDragProgress(null)
    seekTo(nextProgress)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(normalizePlaybackVolume(value[0]))
  }

  const handleVolumeCommit = (value: number[]) => {
    void setConfig('playbackVolume', normalizePlaybackVolume(value[0]))
  }

  const handleToggleMute = () => {
    toggleMute()
    void setConfig(
      'playbackVolume',
      normalizePlaybackVolume(usePlaybackStore.getState().volume)
    )
  }

  const handleTogglePlaybackMode = () => {
    const nextMode = getNextPlaybackMode(playbackMode)

    setPlaybackMode(nextMode)
    void setConfig('playbackMode', nextMode)
  }

  const handleToggleLike = async () => {
    if (!track) {
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

    toggleLikedSong(track.id, nextLiked)
    setSongLikePending(track.id, true)

    try {
      await toggleSongLike({
        id: track.id,
        uid: userId,
        like: nextLiked,
      })

      void fetchLikedSongs()
    } catch (error) {
      console.error('toggle current song like failed', error)
      toggleLikedSong(track.id, !nextLiked)
      toast.error(
        nextLiked ? '喜欢歌曲失败，请稍后重试' : '取消喜欢失败，请稍后重试'
      )
    } finally {
      setSongLikePending(track.id, false)
    }
  }

  return (
    <>
      <footer className='window-no-drag bg-background/50 border-border/60 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-2xl'>
        <Slider
          aria-label='播放进度'
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
              label={isLiked ? '取消喜欢' : '喜欢歌曲'}
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
              label='上一首'
              disabled={!hasTrack}
              onClick={() => {
                playPrevious()
              }}
            >
              <SkipBack className='size-5 fill-current' />
            </ControlButton>
            <ControlButton
              label={isPlaying ? '暂停' : '播放'}
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
              label='下一首'
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
              label='播放列表'
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
              label={isMuted ? '取消静音' : '静音'}
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
