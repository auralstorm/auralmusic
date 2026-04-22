import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { getMvDetail, getMvPlayback } from '@/api/mv'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useWindowExpandedState } from '@/hooks/useWindowExpandedState'
import {
  normalizeMvDetailHero,
  normalizeMvPlayback,
} from '@/pages/Mv/mv-detail.model'
import { useMvDrawerStore } from '@/stores/mv-drawer-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { cn } from '@/lib/utils'
import {
  MV_DRAWER_INITIAL_PLAYBACK_STATE,
  MV_DRAWER_INITIAL_STATE,
  pickMvPlaybackQuality,
} from './model'
import MvDrawerControlBar from './components/MvDrawerControlBar'
import type { MvDrawerPlayerRef } from './types'

const MvDrawer = () => {
  const open = useMvDrawerStore(state => state.open)
  const mvId = useMvDrawerStore(state => state.mvId)
  const setOpen = useMvDrawerStore(state => state.setOpen)
  const closeDrawer = useMvDrawerStore(state => state.closeDrawer)
  const playbackStatus = usePlaybackStore(state => state.status)
  const pausePlayback = usePlaybackStore(state => state.markPlaybackPaused)
  const [state, setState] = useState(MV_DRAWER_INITIAL_STATE)
  const [playbackState, setPlaybackState] = useState(
    MV_DRAWER_INITIAL_PLAYBACK_STATE
  )
  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const playerRef = useRef<MvDrawerPlayerRef | null>(null)
  const lastVolumeRef = useRef(MV_DRAWER_INITIAL_PLAYBACK_STATE.volume)
  const suppressDrawerCloseRef = useRef(false)
  const { isExpanded, canExpand, toggleExpanded } = useWindowExpandedState()

  useEffect(() => {
    if (!open || !mvId) {
      setState(MV_DRAWER_INITIAL_STATE)
      setPlaybackState(MV_DRAWER_INITIAL_PLAYBACK_STATE)
      setDragProgress(null)
      lastVolumeRef.current = MV_DRAWER_INITIAL_PLAYBACK_STATE.volume
      return
    }

    if (playbackStatus === 'playing' || playbackStatus === 'loading') {
      pausePlayback()
    }

    let isActive = true

    const fetchMvData = async () => {
      setState({
        ...MV_DRAWER_INITIAL_STATE,
        loading: true,
      })

      try {
        const detailResponse = await getMvDetail({ mvid: mvId })

        if (!isActive) {
          return
        }

        const hero = normalizeMvDetailHero(detailResponse.data)

        if (!hero) {
          setState({
            ...MV_DRAWER_INITIAL_STATE,
            error: '暂无 MV 详情数据',
          })
          return
        }

        const playbackResponse = await getMvPlayback({
          id: mvId,
          r: pickMvPlaybackQuality(hero.resolutions),
        })

        if (!isActive) {
          return
        }

        setState({
          hero,
          playback: normalizeMvPlayback(playbackResponse.data),
          loading: false,
          error: '',
        })
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('mv drawer fetch failed', fetchError)
        setState({
          ...MV_DRAWER_INITIAL_STATE,
          error: 'MV 加载失败，请稍后重试',
        })
      }
    }

    void fetchMvData()

    return () => {
      isActive = false
    }
  }, [mvId, open, pausePlayback, playbackStatus])

  const videoUrl = state.playback?.url || ''
  const canPlay = Boolean(state.hero && videoUrl)
  const currentTime = dragProgress ?? playbackState.currentTime
  const displayVolume = playbackState.isMuted ? 0 : playbackState.volume

  const syncPlaybackState = () => {
    const player = playerRef.current

    if (!player) {
      return
    }

    const nextVolume = Math.round((player.volume || 0) * 100)

    if (!player.muted && nextVolume > 0) {
      lastVolumeRef.current = nextVolume
    }

    setPlaybackState({
      currentTime: player.currentTime || 0,
      duration: Number.isFinite(player.duration) ? player.duration : 0,
      isMuted: player.muted || player.volume <= 0,
      isPlaying: !player.paused && !player.ended,
      volume: nextVolume,
    })
  }

  const handleTogglePlay = () => {
    const player = playerRef.current

    if (!player) {
      return
    }

    if (player.paused || player.ended) {
      void player.play().catch(error => {
        console.error('mv drawer play failed', error)
      })
      return
    }

    player.pause()
  }

  const handleSeekChange = (value: number[]) => {
    setDragProgress(value[0] ?? 0)
  }

  const handleSeekCommit = (value: number[]) => {
    const player = playerRef.current
    const nextTime = value[0] ?? 0

    setDragProgress(null)

    if (!player) {
      return
    }

    player.currentTime = nextTime
    syncPlaybackState()
  }

  const handleToggleMute = () => {
    const player = playerRef.current

    if (!player) {
      return
    }

    if (player.muted || player.volume <= 0) {
      const restoredVolume = Math.max(lastVolumeRef.current, 1)
      player.volume = restoredVolume / 100
      player.muted = false
    } else {
      lastVolumeRef.current = Math.round(player.volume * 100)
      player.muted = true
    }

    syncPlaybackState()
  }

  const handleVolumeChange = (value: number[]) => {
    const player = playerRef.current
    const nextVolume = Math.max(0, Math.min(value[0] ?? 0, 100))

    if (!player) {
      return
    }

    player.volume = nextVolume / 100
    player.muted = nextVolume === 0

    if (nextVolume > 0) {
      lastVolumeRef.current = nextVolume
    }

    syncPlaybackState()
  }

  const handleToggleFullscreen = async () => {
    if (!canExpand) {
      return
    }

    suppressDrawerCloseRef.current = true

    try {
      await toggleExpanded()
    } catch (error) {
      console.error('toggle mv drawer fullscreen failed', error)
    } finally {
      window.setTimeout(() => {
        suppressDrawerCloseRef.current = false
      }, 400)
    }
  }

  const handleClose = async () => {
    playerRef.current?.pause()

    if (isExpanded && canExpand) {
      try {
        await toggleExpanded()
      } catch (error) {
        console.error('exit mv drawer fullscreen failed', error)
      }
    }

    closeDrawer()
  }

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen) {
          setOpen(true)
          return
        }

        if (suppressDrawerCloseRef.current) {
          return
        }

        void handleClose()
      }}
      direction='bottom'
    >
      <DrawerContent
        className='h-dvh max-h-dvh overflow-hidden rounded-none border-0 bg-black p-0 text-(--player-foreground) text-white outline-none data-[vaul-drawer-direction=bottom]:h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-0'
        data-vaul-no-drag
      >
        {/* header */}
        <header className='pointer-events-none absolute top-0 z-10 flex w-full items-center justify-end gap-4 bg-gradient-to-b from-black/88 via-black/52 to-transparent px-6 py-5'>
          <div className='pointer-events-auto min-w-0'>
            <h2 className='truncate text-xl font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]'>
              {state.hero?.name || 'MV 播放器'}-
              {state.hero?.artistName || '正在准备播放'}
            </h2>
          </div>
          <button
            type='button'
            aria-label='关闭 MV 播放器'
            onClick={() => void handleClose()}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-black/38 text-white shadow-[0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-md transition-colors hover:bg-black/56 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none',
              'pointer-events-auto cursor-pointer'
            )}
          >
            <X className='size-5' />
          </button>
        </header>
        {/* video */}
        <div className='relative flex h-full w-full items-center justify-center overflow-hidden'>
          {canPlay ? (
            <video
              key={`${mvId}-${videoUrl}`}
              ref={playerRef}
              src={videoUrl}
              // poster={state.hero?.coverUrl}
              title={state.hero?.name}
              autoPlay
              playsInline
              preload='auto'
              className='block h-auto max-h-full w-full bg-black object-cover object-center'
              onClick={handleTogglePlay}
              onDurationChange={syncPlaybackState}
              onEnded={syncPlaybackState}
              onLoadedMetadata={syncPlaybackState}
              onPause={syncPlaybackState}
              onPlay={syncPlaybackState}
              onTimeUpdate={syncPlaybackState}
              onVolumeChange={syncPlaybackState}
            />
          ) : state.loading ? (
            <div className='flex h-full w-full items-center justify-center text-sm text-white/70'>
              正在加载 MV...
            </div>
          ) : (
            <div className='flex h-full items-center justify-center text-sm text-white/70'>
              {state.error || '暂时无法播放这个 MV'}
            </div>
          )}
        </div>
        {/* control */}
        <MvDrawerControlBar
          canPlay={canPlay}
          currentTime={currentTime}
          duration={playbackState.duration}
          isFullscreen={isExpanded}
          isMuted={playbackState.isMuted}
          isPlaying={playbackState.isPlaying}
          volume={displayVolume}
          onSeekChange={handleSeekChange}
          onSeekCommit={handleSeekCommit}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleMute={handleToggleMute}
          onTogglePlay={handleTogglePlay}
          onVolumeChange={handleVolumeChange}
        />
      </DrawerContent>
    </Drawer>
  )
}

export default MvDrawer
