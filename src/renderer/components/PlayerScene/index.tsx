import { Maximize2, Minimize2, X } from 'lucide-react'
import { useEffect } from 'react'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useResolvedDarkTheme } from '@/hooks/useResolvedDarkTheme'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import PlayerSceneAmllBackground from './PlayerSceneAmllBackground'
import PlayerSceneAmllBackgroundOverlay from './PlayerSceneAmllBackgroundOverlay'
import PlayerSceneArtwork from './PlayerSceneArtwork'
import PlayerSceneAmllLyrics from './PlayerSceneAmllLyrics'
import PlayerSceneControls from './PlayerSceneControls'
import PlayerSceneProgress from './PlayerSceneProgress'
import { resolveAmllBackgroundState } from './player-background-amll.model'
import { usePlayerLyrics } from './usePlayerLyrics'

const PlayerScene = () => {
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const status = usePlaybackStore(state => state.status)
  const progress = usePlaybackStore(state => state.progress)
  const duration = usePlaybackStore(state => state.duration)
  const isOpen = usePlaybackStore(state => state.isPlayerSceneOpen)
  const isFullscreen = usePlaybackStore(state => state.isPlayerSceneFullscreen)
  const setPlayerSceneOpen = usePlaybackStore(state => state.setPlayerSceneOpen)
  const setPlayerSceneFullscreen = usePlaybackStore(
    state => state.setPlayerSceneFullscreen
  )
  const closePlayerScene = usePlaybackStore(state => state.closePlayerScene)
  const togglePlay = usePlaybackStore(state => state.togglePlay)
  const playPrevious = usePlaybackStore(state => state.playPrevious)
  const playNext = usePlaybackStore(state => state.playNext)
  const seekTo = usePlaybackStore(state => state.seekTo)
  const dynamicCoverEnabled = useConfigStore(
    state => state.config.dynamicCoverEnabled
  )
  const showLyricTranslation = useConfigStore(
    state => state.config.showLyricTranslation
  )
  const lyricsKaraokeEnabled = useConfigStore(
    state => state.config.lyricsKaraokeEnabled
  )
  const playerBackgroundMode = useConfigStore(
    state => state.config.playerBackgroundMode
  )

  const { lyrics, lyricsLoading, lyricsError } = usePlayerLyrics({
    isOpen,
    trackId: currentTrack?.id,
  })
  const isDarkTheme = useResolvedDarkTheme()

  const hasTrack = Boolean(currentTrack)
  const isPlaying = status === 'playing' || status === 'loading'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isFullscreen) {
        closePlayerScene()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closePlayerScene, isFullscreen, isOpen])

  useEffect(() => {
    let isMounted = true

    void window.electronWindow.isFullScreen().then(value => {
      if (isMounted) {
        setPlayerSceneFullscreen(value)
      }
    })

    const unsubscribe = window.electronWindow.onFullScreenChange(value => {
      setPlayerSceneFullscreen(value)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [setPlayerSceneFullscreen])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isFullscreen) {
      void window.electronWindow.toggleFullScreen().then(value => {
        setPlayerSceneFullscreen(value)
      })
    }

    setPlayerSceneOpen(nextOpen)
  }

  const handleClose = () => {
    if (isFullscreen) {
      void window.electronWindow
        .toggleFullScreen()
        .then(value => {
          setPlayerSceneFullscreen(value)
        })
        .finally(() => {
          closePlayerScene()
        })
      return
    }

    closePlayerScene()
  }

  const handleToggleFullscreen = () => {
    void window.electronWindow
      .toggleFullScreen()
      .then(value => {
        setPlayerSceneFullscreen(value)
      })
      .catch(error => {
        console.error('toggle player scene fullscreen failed', error)
      })
  }

  const coverUrl = currentTrack?.coverUrl || ''
  const title = currentTrack?.name || '暂无播放歌曲'
  const artistNames = currentTrack?.artistNames || 'AuralMusic'
  const amllBackgroundState = resolveAmllBackgroundState(
    playerBackgroundMode,
    coverUrl
  )
  const showPlayerBackground = amllBackgroundState.enabled

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction='bottom'>
      <DrawerContent className='h-[100dvh] max-h-[100dvh] overflow-hidden rounded-none border-0 bg-[var(--background)] p-0 text-[var(--player-foreground)] outline-none data-[vaul-drawer-direction=bottom]:h-[100dvh] data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-0 [&>div:first-child]:hidden'>
        <DrawerTitle className='sr-only'>播放器主界面</DrawerTitle>
        <DrawerDescription className='sr-only'>
          当前播放歌曲、播放控制、进度条和歌词
        </DrawerDescription>

        <div className='window-no-drag relative h-full overflow-hidden bg-[var(--background)]'>
          <PlayerSceneAmllBackground
            coverUrl={coverUrl}
            playing={amllBackgroundState.playing}
            hasLyrics={lyrics.length > 0}
            enabled={amllBackgroundState.enabled}
            staticMode={amllBackgroundState.staticMode}
          />
          <PlayerSceneAmllBackgroundOverlay
            enabled={showPlayerBackground}
            staticMode={amllBackgroundState.staticMode}
            isDarkTheme={isDarkTheme}
          />
          <div
            aria-hidden='true'
            className='window-drag absolute top-0 left-1/2 z-20 h-18 w-[42vw] max-w-[680px] min-w-[260px] -translate-x-1/2'
          />

          <button
            type='button'
            aria-label={isFullscreen ? '退出全屏' : '全屏播放'}
            onClick={handleToggleFullscreen}
            className='absolute top-8 left-10 z-30 flex size-11 items-center justify-center rounded-full bg-white/12 text-[var(--player-muted)] backdrop-blur-xl transition-colors hover:bg-white/20 hover:text-[var(--player-foreground)]'
          >
            {isFullscreen ? (
              <Minimize2 className='size-5' />
            ) : (
              <Maximize2 className='size-5' />
            )}
          </button>

          <button
            type='button'
            aria-label='关闭播放器'
            onClick={handleClose}
            className='absolute top-8 right-10 z-30 flex size-11 items-center justify-center rounded-full bg-white/12 text-[var(--player-muted)] backdrop-blur-xl transition-colors hover:bg-white/20 hover:text-[var(--player-foreground)]'
          >
            <X className='size-5' />
          </button>

          <div className='relative z-10 grid h-full min-h-0 grid-cols-[minmax(320px,0.86fr)_minmax(420px,1.14fr)] items-center gap-16 px-14 py-16 xl:px-20'>
            <div className='flex min-h-0 flex-col items-center gap-8 2xl:gap-12'>
              <PlayerSceneArtwork
                coverUrl={coverUrl}
                title={title}
                artistNames={artistNames}
                isPlaying={isPlaying}
                dynamicCoverEnabled={dynamicCoverEnabled}
              />
              <PlayerSceneControls
                disabled={!hasTrack}
                isPlaying={isPlaying}
                onPrevious={playPrevious}
                onTogglePlay={togglePlay}
                onNext={playNext}
              />
              <PlayerSceneProgress
                disabled={!hasTrack}
                progress={progress}
                duration={duration}
                onSeek={seekTo}
              />
            </div>

            <PlayerSceneAmllLyrics
              lines={lyrics}
              progressMs={progress}
              showTranslation={showLyricTranslation}
              karaokeEnabled={lyricsKaraokeEnabled}
              playing={isPlaying}
              loading={lyricsLoading}
              error={lyricsError}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default PlayerScene
