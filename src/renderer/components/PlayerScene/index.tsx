import { Maximize2, Minimize2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import { isWindowsPlatform } from '@/lib/electron-runtime'
import { useWindowExpandedState } from '@/hooks/useWindowExpandedState'
import { useResolvedDarkTheme } from '@/hooks/useResolvedDarkTheme'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import PlayerSceneAmllBackground from './PlayerSceneAmllBackground'
import PlayerSceneAmllBackgroundOverlay from './PlayerSceneAmllBackgroundOverlay'
import PlayerSceneArtwork from './PlayerSceneArtwork'
import PlayerSceneAmllLyrics from './PlayerSceneAmllLyrics'
import PlayerSceneChromeButton from './PlayerSceneChromeButton'
import PlayerSceneControls from './PlayerSceneControls'
import PlayerSceneProgress from './PlayerSceneProgress'
import { resolveAmllBackgroundState } from './player-background-amll.model'
import { usePlayerSceneChromeVisibility } from './usePlayerSceneChromeVisibility'
import { usePlayerLyrics } from './usePlayerLyrics'

const PlayerScene = () => {
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const status = usePlaybackStore(state => state.status)
  const progress = usePlaybackStore(state => state.progress)
  const duration = usePlaybackStore(state => state.duration)
  const isOpen = usePlaybackStore(state => state.isPlayerSceneOpen)
  const setPlayerSceneOpen = usePlaybackStore(state => state.setPlayerSceneOpen)
  const closePlayerScene = usePlaybackStore(state => state.closePlayerScene)
  const togglePlay = usePlaybackStore(state => state.togglePlay)
  const playPrevious = usePlaybackStore(state => state.playPrevious)
  const playNext = usePlaybackStore(state => state.playNext)
  const seekTo = usePlaybackStore(state => state.seekTo)
  const dynamicCoverEnabled = useConfigStore(
    state => state.config.dynamicCoverEnabled
  )
  const retroCoverPreset = useConfigStore(
    state => state.config.retroCoverPreset
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
  const immersivePlayerControls = useConfigStore(
    state => state.config.immersivePlayerControls
  )

  const { lyrics, lyricsLoading, lyricsError } = usePlayerLyrics({
    isOpen,
    trackId: currentTrack?.id,
  })
  const { chromeVisible, handleChromePointerActivity } =
    usePlayerSceneChromeVisibility({
      immersiveEnabled: immersivePlayerControls,
      isOpen,
    })
  const isWindows = isWindowsPlatform()
  const isDarkTheme = useResolvedDarkTheme()
  const { isExpanded, canExpand, toggleExpanded } = useWindowExpandedState()

  const hasTrack = useMemo(() => Boolean(currentTrack), [currentTrack])
  const isPlaying = useMemo(() => {
    return status === 'playing' || status === 'loading'
  }, [status])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExpanded) {
        closePlayerScene()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closePlayerScene, isExpanded, isOpen])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isExpanded && !isWindows && canExpand) {
        void toggleExpanded().finally(() => {
          setPlayerSceneOpen(nextOpen)
        })
        return
      }

      setPlayerSceneOpen(nextOpen)
    },
    [canExpand, isExpanded, isWindows, setPlayerSceneOpen, toggleExpanded]
  )

  const handleClose = useCallback(() => {
    if (isExpanded && !isWindows && canExpand) {
      void toggleExpanded().finally(() => {
        closePlayerScene()
      })
      return
    }

    closePlayerScene()
  }, [canExpand, closePlayerScene, isExpanded, isWindows, toggleExpanded])

  const handleToggleFullscreen = useCallback(() => {
    if (!canExpand) {
      return
    }

    void toggleExpanded().catch(error => {
      console.error('toggle player scene expanded state failed', error)
    })
  }, [canExpand, toggleExpanded])

  const coverUrl = useMemo(() => {
    return currentTrack?.coverUrl || ''
  }, [currentTrack?.coverUrl])
  const title = useMemo(() => {
    return currentTrack?.name || '暂无播放歌曲'
  }, [currentTrack?.name])
  const artistNames = useMemo(() => {
    return currentTrack?.artistNames || 'AuralMusic'
  }, [currentTrack?.artistNames])
  const amllBackgroundState = resolveAmllBackgroundState(
    playerBackgroundMode,
    coverUrl
  )
  const showPlayerBackground = useMemo(
    () => isOpen && amllBackgroundState.enabled,
    [amllBackgroundState.enabled, isOpen]
  )
  const shouldPlayAmllBackground = useMemo(
    () => isOpen && amllBackgroundState.playing,
    [amllBackgroundState.playing, isOpen]
  )
  const shouldRenderAmllLyrics = isOpen
  const shouldPlayAmllLyrics = isOpen && isPlaying
  const fullscreenToggleLabel = useMemo(() => {
    if (!isWindows) {
      return isExpanded ? '退出全屏' : '全屏播放'
    }

    return isExpanded ? '还原窗口' : '最大化窗口'
  }, [isExpanded, isWindows])
  const fullscreenToggleIcon = useMemo(() => {
    return isExpanded ? (
      <Minimize2 className='size-5' />
    ) : (
      <Maximize2 className='size-5' />
    )
  }, [isExpanded])
  const closeIcon = useMemo(() => <X className='size-5' />, [])

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction='bottom'>
      <DrawerContent
        className='bg-background h-dvh max-h-dvh overflow-hidden rounded-none border-0 p-0 text-(--player-foreground) outline-none data-[vaul-drawer-direction=bottom]:h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-0 [&>div:first-child]:hidden'
        data-vaul-no-drag
      >
        <DrawerTitle className='sr-only'>{/* 播放器主界面 */}</DrawerTitle>
        <DrawerDescription className='sr-only'>
          {/* 当前播放歌曲、播放控制、进度条和歌词 */}
        </DrawerDescription>

        <div
          className='window-no-drag bg-background relative h-full overflow-hidden'
          onPointerMove={handleChromePointerActivity}
        >
          <PlayerSceneAmllBackground
            coverUrl={coverUrl}
            playing={shouldPlayAmllBackground}
            hasLyrics={lyrics.length > 0}
            enabled={showPlayerBackground}
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

          <PlayerSceneChromeButton
            type='button'
            aria-label={fullscreenToggleLabel}
            position='left'
            visible={chromeVisible}
            onReveal={handleChromePointerActivity}
            onClick={handleToggleFullscreen}
          >
            {fullscreenToggleIcon}
          </PlayerSceneChromeButton>

          <PlayerSceneChromeButton
            type='button'
            aria-label='关闭播放器'
            position='right'
            visible={chromeVisible}
            onReveal={handleChromePointerActivity}
            onClick={handleClose}
          >
            {closeIcon}
          </PlayerSceneChromeButton>

          <div className='relative z-10 grid h-full min-h-0 grid-cols-[minmax(320px,0.86fr)_minmax(420px,1.14fr)] items-center gap-16 px-14 py-16 xl:px-20'>
            <div className='flex min-h-0 flex-col items-center gap-8 2xl:gap-12'>
              <PlayerSceneArtwork
                coverUrl={coverUrl}
                title={title}
                artistNames={artistNames}
                isPlaying={isPlaying}
                dynamicCoverEnabled={dynamicCoverEnabled}
                retroCoverPreset={retroCoverPreset}
                isSceneOpen={isOpen}
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

            {shouldRenderAmllLyrics ? (
              <PlayerSceneAmllLyrics
                trackId={currentTrack?.id ?? null}
                lines={lyrics}
                progressMs={progress}
                showTranslation={showLyricTranslation}
                karaokeEnabled={lyricsKaraokeEnabled}
                playing={shouldPlayAmllLyrics}
                loading={lyricsLoading}
                error={lyricsError}
                onSeek={seekTo}
              />
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default PlayerScene
