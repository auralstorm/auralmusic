import { useEffect, useState } from 'react'
import { createRendererLogger } from '../../lib/logger.ts'
import { buildLyricLines } from './player-lyrics.model'
import { fetchLyricTextBundle } from './player-lyrics.service'
import type { LyricLine, UsePlayerLyricsParams } from './types'

const EMPTY_LYRICS: LyricLine[] = []
const NO_LYRIC_ERROR = '暂无歌词'
const lyricsLogger = createRendererLogger('lyrics')

export function usePlayerLyrics({
  isOpen,
  trackId,
  currentTrack,
}: UsePlayerLyricsParams) {
  const [lyrics, setLyrics] = useState<LyricLine[]>(EMPTY_LYRICS)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsError, setLyricsError] = useState('')

  useEffect(() => {
    if (!isOpen || trackId === undefined || trackId === null) {
      setLyrics(EMPTY_LYRICS)
      setLyricsError('')
      setLyricsLoading(false)
      return
    }

    let cancelled = false

    const loadLyrics = async () => {
      setLyrics(EMPTY_LYRICS)
      setLyricsLoading(true)
      setLyricsError('')

      try {
        const lyricBundle = await fetchLyricTextBundle(trackId, currentTrack)
        const nextLyrics = buildLyricLines(lyricBundle)
        if (cancelled) {
          return
        }

        setLyrics(nextLyrics)
        setLyricsError(
          nextLyrics.length &&
            !JSON.stringify(nextLyrics).includes(NO_LYRIC_ERROR)
            ? ''
            : NO_LYRIC_ERROR
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        lyricsLogger.warn('load lyric failed', {
          error,
          lockedLxSourceId: currentTrack?.lockedLxSourceId,
          lockedPlatform: currentTrack?.lockedPlatform,
          trackId,
        })
        setLyrics(EMPTY_LYRICS)
        setLyricsError(NO_LYRIC_ERROR)
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
  }, [currentTrack, isOpen, trackId])

  return {
    lyrics,
    lyricsLoading,
    lyricsError,
  }
}
