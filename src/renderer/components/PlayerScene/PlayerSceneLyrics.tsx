import { useEffect, useLayoutEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import type { KaraokeSegment, LyricLine } from './player-lyrics.model'

type PlayerSceneLyricsProps = {
  lines: LyricLine[]
  activeIndex: number
  progressMs: number
  showTranslation: boolean
  karaokeEnabled: boolean
  loading: boolean
  error: string
}

function clamp01(value: number) {
  if (value <= 0) {
    return 0
  }

  if (value >= 1) {
    return 1
  }

  return value
}

function getSegmentProgress(
  segment: KaraokeSegment,
  lineStart: number,
  progressMs: number
) {
  const elapsed = progressMs - lineStart - segment.start
  return clamp01(elapsed / segment.duration)
}

function renderKaraokeText(line: LyricLine, progressMs: number) {
  if (!line.segments?.length) {
    return line.text
  }

  return line.segments.map((segment, index) => {
    const segmentProgress = getSegmentProgress(segment, line.time, progressMs)
    const fillPercent = Math.round(segmentProgress * 100)
    const isComplete = segmentProgress >= 1
    const isPending = segmentProgress <= 0

    return (
      <span
        key={`${line.time}-${index}-${segment.start}`}
        className='inline-block whitespace-pre'
        style={
          isComplete
            ? { color: 'var(--player-foreground)' }
            : isPending
              ? { color: 'var(--player-soft)' }
              : {
                  color: 'transparent',
                  backgroundImage: `linear-gradient(90deg, var(--player-foreground) ${fillPercent}%, var(--player-soft) ${fillPercent}%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }
        }
      >
        {segment.text}
      </span>
    )
  })
}

const PlayerSceneLyrics = ({
  lines,
  activeIndex,
  progressMs,
  showTranslation,
  karaokeEnabled,
  loading,
  error,
}: PlayerSceneLyricsProps) => {
  const containerRef = useRef<HTMLElement | null>(null)
  const lineRefs = useRef<Array<HTMLDivElement | null>>([])

  useLayoutEffect(() => {
    if (!lines.length) {
      containerRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      lineRefs.current = []
      return
    }

    const firstLine = lineRefs.current[0]
    if (!firstLine) {
      return
    }

    firstLine.scrollIntoView({
      block: 'center',
      behavior: 'auto',
    })
  }, [lines])

  useEffect(() => {
    if (activeIndex < 0) {
      return
    }

    lineRefs.current[activeIndex]?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  }, [activeIndex])

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
    <section
      ref={containerRef}
      className='no-scrollbar max-h-[72vh] overflow-y-auto py-[28vh] pr-16 2xl:max-h-[81vh]'
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 25%, black 70%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 25%, black 70%, transparent 100%)',
      }}
    >
      <div className='space-y-8'>
        {lines.map((line, index) => {
          const isActive = index === activeIndex
          const renderKaraoke =
            karaokeEnabled && isActive && Boolean(line.segments?.length)

          return (
            <div
              key={`${line.time}-${index}`}
              ref={node => {
                lineRefs.current[index] = node
              }}
              className={cn(
                'text-md md:text-2xl 2xl:text-3xl',
                'leading-[1.45] 2xl:leading-loose',
                'font-extrabold tracking-tight',
                'flex min-h-[1.5em] flex-col items-start justify-center',
                'pr-10 pl-8 md:pr-19 md:pl-10',
                'origin-left',
                'transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
                'will-change-opacity will-change-color will-change-transform',
                isActive
                  ? 'scale-[1.3] font-black tracking-normal text-(--player-foreground)'
                  : 'scale-100 font-extrabold tracking-tight text-(--player-soft)'
              )}
            >
              <div className='flex min-h-[1.45em] items-center'>
                {renderKaraoke
                  ? renderKaraokeText(line, progressMs)
                  : line.text}
              </div>
              {showTranslation && line.translation ? (
                <p
                  className={cn(
                    'mt-2 text-xs leading-relaxed font-semibold tracking-normal md:text-base 2xl:text-lg',
                    isActive ? 'opacity-90' : 'opacity-70'
                  )}
                  style={{ color: 'var(--player-muted)' }}
                >
                  {line.translation}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PlayerSceneLyrics
