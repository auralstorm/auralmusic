import { LyricPlayer } from '@applemusic-like-lyrics/react'
import { useMemo, type CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import type { LyricLine } from './player-lyrics.model'
import { adaptLyricsToAmll } from './player-lyrics-amll.adapter'

type PlayerSceneAmllLyricsProps = {
  lines: LyricLine[]
  progressMs: number
  showTranslation: boolean
  karaokeEnabled: boolean
  playing: boolean
  loading: boolean
  error: string
}

const AMLL_PLAYER_STYLE = {
  '--amll-lp-color': 'var(--player-foreground)',
  '--amll-lp-text-main-color': 'var(--player-foreground)',
  '--amll-lp-text-sub-color': 'var(--player-muted)',
  '--amll-lp-text-inactive-color': 'var(--player-soft)',
  '--amll-lp-bg-color': 'transparent',
} as CSSProperties

const PlayerSceneAmllLyrics = ({
  lines,
  progressMs,
  showTranslation,
  karaokeEnabled,
  playing,
  loading,
  error,
}: PlayerSceneAmllLyricsProps) => {
  const lyricLines = useMemo(
    () =>
      adaptLyricsToAmll(lines, {
        showTranslation,
        karaokeEnabled,
      }),
    [karaokeEnabled, lines, showTranslation]
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
          'h-[72vh] overflow-hidden pr-8 2xl:h-[81vh]',
          '[&_.amll-lyric-player]:h-full [&_>div]:h-full'
        )}
        style={AMLL_PLAYER_STYLE}
      >
        <LyricPlayer
          lyricLines={lyricLines}
          currentTime={Math.round(progressMs)}
          playing={playing}
          alignAnchor='center'
          alignPosition={0.5}
          enableBlur={true}
          enableScale={true}
          wordFadeWidth={0.5}
          className='h-full w-full'
        />
      </div>
    </section>
  )
}

export default PlayerSceneAmllLyrics
