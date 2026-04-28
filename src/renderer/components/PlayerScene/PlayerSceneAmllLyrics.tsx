import { LyricPlayer } from '@applemusic-like-lyrics/react'
import { useCallback, useMemo, type CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import {
  adaptLyricsToAmll,
  resolveAmllLyricClickSeekTime,
} from './player-lyrics-amll.adapter'
import type { LyricLineClickHandler, PlayerSceneAmllLyricsProps } from './types'

const AMLL_PLAYER_STYLE = {
  '--amll-lp-color': 'var(--player-foreground)',
  '--amll-lp-text-main-color': 'var(--player-foreground)',
  '--amll-lp-text-sub-color': 'var(--player-muted)',
  '--amll-lp-text-inactive-color': 'var(--player-soft)',
  '--amll-lp-bg-color': 'transparent',
} as CSSProperties

const PlayerSceneAmllLyrics = ({
  trackId,
  lines,
  progressMs,
  showTranslation,
  karaokeEnabled,
  playing,
  loading,
  error,
  onSeek,
}: PlayerSceneAmllLyricsProps) => {
  const lyricLines = useMemo(
    () =>
      adaptLyricsToAmll(lines, {
        showTranslation,
        karaokeEnabled,
      }),
    [karaokeEnabled, lines, showTranslation]
  )
  const lyricPlayerKey = trackId ?? 'no-track'

  const handleLyricLineClick = useCallback<LyricLineClickHandler>(
    event => {
      const seekTime = resolveAmllLyricClickSeekTime(event)

      if (seekTime === null) {
        return
      }

      onSeek(seekTime)
    },
    [onSeek]
  )

  if (loading) {
    return (
      <section className='flex min-h-[460px] items-center justify-center text-(--player-soft)'>
        歌词加载中...
      </section>
    )
  }

  if (error || !lines.length) {
    return (
      <section className='flex min-h-[460px] items-center justify-center text-(--player-soft)'>
        {error || '暂无歌词'}
      </section>
    )
  }

  return (
    <section className='relative min-h-0'>
      <div
        className={cn(
          'h-[74vh] overflow-hidden pr-8 2xl:h-[81vh]',
          '[&_.amll-lyric-player]:h-full [&_>div]:h-full'
        )}
        style={AMLL_PLAYER_STYLE}
      >
        <LyricPlayer
          key={lyricPlayerKey}
          lyricLines={lyricLines}
          currentTime={Math.round(progressMs)}
          playing={playing}
          alignAnchor='center'
          alignPosition={0.5}
          enableBlur={true}
          enableScale={true}
          wordFadeWidth={0.5}
          className='h-full w-full'
          onLyricLineClick={handleLyricLineClick}
        />
      </div>
    </section>
  )
}

export default PlayerSceneAmllLyrics
