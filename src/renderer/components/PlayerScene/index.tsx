import { Maximize2, Minimize2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getLyric } from '@/api/list'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import PlayerSceneArtwork from './PlayerSceneArtwork'
import PlayerSceneControls from './PlayerSceneControls'
import PlayerSceneLyrics from './PlayerSceneLyrics'
import PlayerSceneProgress from './PlayerSceneProgress'
import WaterRipple3DCover from './WaterRippleCover'
import {
  findActiveLyricIndex,
  parseLrc,
  type LyricLine,
} from './player-lyrics.model'

function readLyricText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const record = payload as Record<string, unknown>
  const directLrc = record.lrc

  if (directLrc && typeof directLrc === 'object') {
    const lyric = (directLrc as Record<string, unknown>).lyric

    if (typeof lyric === 'string') {
      return lyric
    }
  }

  const nestedData = record.data

  if (nestedData && typeof nestedData === 'object') {
    return readLyricText(nestedData)
  }

  return ''
}

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
  const playerBackgroundMode = useConfigStore(
    state => state.config.playerBackgroundMode
  )

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsError, setLyricsError] = useState('')

  const hasTrack = Boolean(currentTrack)
  const isPlaying = status === 'playing' || status === 'loading'
  const activeLyricIndex = useMemo(
    () => findActiveLyricIndex(lyrics, progress),
    [lyrics, progress]
  )

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

  useEffect(() => {
    if (!isOpen || !currentTrack) {
      setLyrics([])
      setLyricsError('')
      setLyricsLoading(false)
      return
    }

    let cancelled = false

    const loadLyrics = async () => {
      setLyricsLoading(true)
      setLyricsError('')

      try {
        const response = await getLyric({ id: currentTrack.id })
        const nextLyrics = parseLrc(readLyricText(response.data))
        if (cancelled) {
          return
        }

        setLyrics(nextLyrics)
        setLyricsError(
          nextLyrics.length && !JSON.stringify(nextLyrics).includes('暂无歌词')
            ? ''
            : '暂无歌词'
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('load lyric failed', error)
        setLyrics([])
        setLyricsError('暂无歌词')
      } finally {
        if (!cancelled) {
          setLyricsLoading(false)
        }
      }
    }

    void loadLyrics()

    return () => {
      cancelled = true
    }
  }, [currentTrack, isOpen])

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
  const showPlayerBackground = playerBackgroundMode !== 'off'
  const showDynamicPlayerBackground =
    playerBackgroundMode === 'dynamic' && Boolean(coverUrl)
  const showStaticPlayerBackground =
    playerBackgroundMode === 'static' && Boolean(coverUrl)

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction='bottom'>
      <DrawerContent className='h-[100dvh] max-h-[100dvh] overflow-hidden rounded-none border-0 bg-[var(--background)] p-0 text-[var(--player-foreground)] outline-none data-[vaul-drawer-direction=bottom]:h-[100dvh] data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none data-[vaul-drawer-direction=bottom]:border-0 [&>div:first-child]:hidden'>
        <DrawerTitle className='sr-only'>播放器主界面</DrawerTitle>
        <DrawerDescription className='sr-only'>
          当前播放歌曲、播放控制、进度条和歌词
        </DrawerDescription>

        <div className='window-no-drag relative h-full overflow-hidden bg-[var(--background)]'>
          {showDynamicPlayerBackground ? (
            <div
              aria-hidden='true'
              className='absolute inset-0 scale-110 overflow-hidden opacity-[var(--player-cover-opacity)]'
            >
              <WaterRipple3DCover src={coverUrl} className='h-full w-full' />
            </div>
          ) : null}
          {showStaticPlayerBackground ? (
            <div
              aria-hidden='true'
              className='absolute inset-0 scale-110 bg-cover bg-center opacity-[var(--player-cover-opacity)] blur-3xl'
              style={{ backgroundImage: `url("${coverUrl}")` }}
            />
          ) : null}
          {showPlayerBackground ? (
            <>
              <div className='absolute inset-0 bg-[radial-gradient(circle_at_24%_42%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(110deg,var(--player-top-wash),var(--player-scene-veil)_45%,var(--player-bottom-wash))]' />
              <div className='absolute inset-y-0 right-0 w-[45vw] bg-[linear-gradient(90deg,transparent,var(--player-scene-side))]' />
            </>
          ) : null}
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

            <PlayerSceneLyrics
              lines={lyrics}
              activeIndex={activeLyricIndex}
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
