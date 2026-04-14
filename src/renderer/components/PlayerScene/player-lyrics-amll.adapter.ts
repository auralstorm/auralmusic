import type {
  LyricLine as AmllLyricLine,
  LyricWord,
} from '@applemusic-like-lyrics/core'

import type { LyricLine as PlayerLyricLine } from './player-lyrics.model'

const DEFAULT_LINE_DURATION_MS = 4000

type AdaptLyricsToAmllOptions = {
  showTranslation: boolean
  karaokeEnabled: boolean
}

function resolveLineEndTime(
  line: PlayerLyricLine,
  nextLine?: PlayerLyricLine
): number {
  if (nextLine && nextLine.time > line.time) {
    return nextLine.time - 1
  }

  if (typeof line.duration === 'number' && line.duration > 0) {
    return line.time + line.duration
  }

  return line.time + DEFAULT_LINE_DURATION_MS
}

function buildLineWords(
  line: PlayerLyricLine,
  endTime: number,
  karaokeEnabled: boolean
): LyricWord[] {
  if (karaokeEnabled && line.segments?.length) {
    return line.segments.map(segment => ({
      startTime: line.time + segment.start,
      endTime: line.time + segment.start + segment.duration,
      word: segment.text,
    }))
  }

  return [
    {
      startTime: line.time,
      endTime,
      word: line.text,
    },
  ]
}

export function adaptLyricsToAmll(
  lines: PlayerLyricLine[],
  options: AdaptLyricsToAmllOptions
): AmllLyricLine[] {
  return lines.map((line, index) => {
    const endTime = resolveLineEndTime(line, lines[index + 1])

    return {
      words: buildLineWords(line, endTime, options.karaokeEnabled),
      translatedLyric: options.showTranslation ? line.translation || '' : '',
      romanLyric: '',
      startTime: line.time,
      endTime,
      isBG: false,
      isDuet: false,
    }
  })
}
