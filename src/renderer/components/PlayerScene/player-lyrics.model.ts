export type LyricLine = {
  time: number
  text: string
  translation?: string
  duration?: number
  segments?: KaraokeSegment[]
}

const LRC_TIMESTAMP_PATTERN = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g
const YRC_LINE_PATTERN = /^\[(\d+),(\d+)\]/
const YRC_SEGMENT_PATTERN = /\((\d+),(\d+),[^)]*\)/g
const LYRIC_MERGE_THRESHOLD_MS = 400
const LYRIC_TEXT_MATCH_THRESHOLD_MS = 1500

export type KaraokeSegment = {
  start: number
  duration: number
  text: string
}

export type KaraokeLine = {
  time: number
  duration: number
  text: string
  segments: KaraokeSegment[]
}

type BuildLyricLinesInput = {
  lrc: string
  tlyric?: string
  yrc?: string
}

function normalizeMilliseconds(value?: string) {
  if (!value) {
    return 0
  }

  const normalized = value.padEnd(3, '0').slice(0, 3)
  return Number.parseInt(normalized, 10) || 0
}

function parseTimestamp(
  minutes: string,
  seconds: string,
  milliseconds?: string
) {
  return (
    (Number.parseInt(minutes, 10) || 0) * 60_000 +
    (Number.parseInt(seconds, 10) || 0) * 1000 +
    normalizeMilliseconds(milliseconds)
  )
}

function normalizeLyricMatchText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function parseLrc(raw: string): LyricLine[] {
  if (!raw.trim()) {
    return []
  }

  const lines: LyricLine[] = []

  raw.split(/\r?\n/).forEach(line => {
    const timestamps = [...line.matchAll(LRC_TIMESTAMP_PATTERN)]
    const text = line.replace(LRC_TIMESTAMP_PATTERN, '').trim()

    if (!timestamps.length || !text) {
      return
    }

    timestamps.forEach(match => {
      lines.push({
        time: parseTimestamp(match[1] || '0', match[2] || '0', match[3]),
        text,
      })
    })
  })

  return lines.sort((first, second) => first.time - second.time)
}

function parseYrcLineSegments(
  raw: string,
  lineStartTime: number
): KaraokeSegment[] {
  const marks = [...raw.matchAll(YRC_SEGMENT_PATTERN)]

  if (!marks.length) {
    return []
  }

  const firstStart = Number.parseInt(marks[0]?.[1] || '0', 10)
  const usesAbsoluteTime =
    Number.isFinite(firstStart) && firstStart >= lineStartTime

  return marks
    .map((mark, index): KaraokeSegment | null => {
      const markIndex = mark.index
      const nextMarkIndex = marks[index + 1]?.index
      if (markIndex === undefined) {
        return null
      }

      const rawStart = Number.parseInt(mark[1] || '0', 10)
      const duration = Number.parseInt(mark[2] || '0', 10)
      if (
        !Number.isFinite(rawStart) ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return null
      }

      const start = usesAbsoluteTime
        ? Math.max(0, rawStart - lineStartTime)
        : rawStart

      const textStart = markIndex + mark[0].length
      const textEnd = nextMarkIndex === undefined ? raw.length : nextMarkIndex
      const text = raw.slice(textStart, textEnd)

      if (!text) {
        return null
      }

      return {
        start,
        duration,
        text,
      }
    })
    .filter((segment): segment is KaraokeSegment => Boolean(segment))
}

export function parseYrc(raw: string): KaraokeLine[] {
  if (!raw.trim()) {
    return []
  }

  const lines: KaraokeLine[] = []

  raw.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim()
    if (!line) {
      return
    }

    const lineMatch = line.match(YRC_LINE_PATTERN)
    if (!lineMatch) {
      return
    }

    const time = Number.parseInt(lineMatch[1] || '0', 10)
    const duration = Number.parseInt(lineMatch[2] || '0', 10)
    if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) {
      return
    }

    const content = line.slice(lineMatch[0].length)
    const segments = parseYrcLineSegments(content, time)
    if (!segments.length) {
      return
    }

    const text = segments
      .map(segment => segment.text)
      .join('')
      .trim()
    if (!text) {
      return
    }

    lines.push({
      time,
      duration,
      text,
      segments,
    })
  })

  return lines.sort((first, second) => first.time - second.time)
}

function findClosestByTime<T extends { time: number }>(
  lines: T[],
  time: number,
  thresholdMs = LYRIC_MERGE_THRESHOLD_MS
): T | undefined {
  if (!lines.length) {
    return undefined
  }

  let closest: T | undefined
  let minDistance = thresholdMs + 1

  lines.forEach(line => {
    const distance = Math.abs(line.time - time)
    if (distance <= thresholdMs && distance < minDistance) {
      closest = line
      minDistance = distance
    }
  })

  return closest
}

function findMatchingKaraokeLine(
  karaokeLines: KaraokeLine[],
  line: LyricLine,
  usedKaraokeTimes: Set<number>
) {
  const availableLines = karaokeLines.filter(
    karaokeLine => !usedKaraokeTimes.has(karaokeLine.time)
  )
  const nearestByTime = findClosestByTime(availableLines, line.time)
  if (nearestByTime) {
    return nearestByTime
  }

  const normalizedLineText = normalizeLyricMatchText(line.text)
  if (!normalizedLineText) {
    return undefined
  }

  const sameTextMatches = availableLines.filter(karaokeLine => {
    if (
      Math.abs(karaokeLine.time - line.time) > LYRIC_TEXT_MATCH_THRESHOLD_MS
    ) {
      return false
    }

    return normalizeLyricMatchText(karaokeLine.text) === normalizedLineText
  })

  return findClosestByTime(
    sameTextMatches,
    line.time,
    LYRIC_TEXT_MATCH_THRESHOLD_MS
  )
}

export function buildLyricLines({
  lrc,
  tlyric = '',
  yrc = '',
}: BuildLyricLinesInput): LyricLine[] {
  const originalLines = parseLrc(lrc)
  const translationLines = parseLrc(tlyric)
  const karaokeLines = parseYrc(yrc)

  const baseLines: LyricLine[] = originalLines.length
    ? originalLines.map(line => ({ time: line.time, text: line.text }))
    : karaokeLines.map(line => ({
        time: line.time,
        text: line.text,
        duration: line.duration,
        segments: line.segments,
      }))

  if (!baseLines.length) {
    return []
  }

  const usedKaraokeTimes = new Set<number>()

  const mergedLines = baseLines.map(line => {
    const translationLine = findClosestByTime(translationLines, line.time)
    const karaokeLine = findMatchingKaraokeLine(
      karaokeLines,
      line,
      usedKaraokeTimes
    )
    if (karaokeLine) {
      usedKaraokeTimes.add(karaokeLine.time)
    }

    const nextLine: LyricLine = {
      ...line,
      time: karaokeLine?.time ?? line.time,
      text: line.text || karaokeLine?.text || '',
    }
    const translation =
      translationLine && translationLine.text !== nextLine.text
        ? translationLine.text
        : undefined
    const duration = karaokeLine?.duration ?? line.duration
    const segments = karaokeLine?.segments ?? line.segments

    if (translation) {
      nextLine.translation = translation
    }
    if (duration !== undefined) {
      nextLine.duration = duration
    }
    if (segments?.length) {
      nextLine.segments = segments
    }

    return nextLine
  })

  // YRC can include lines absent from plain LRC; append them to keep karaoke complete.
  if (originalLines.length) {
    karaokeLines.forEach(karaokeLine => {
      if (usedKaraokeTimes.has(karaokeLine.time)) {
        return
      }

      const hasNearbyOriginal = Boolean(
        findClosestByTime(originalLines, karaokeLine.time)
      )
      const hasSameTextOriginal = originalLines.some(originalLine => {
        if (
          Math.abs(originalLine.time - karaokeLine.time) >
          LYRIC_TEXT_MATCH_THRESHOLD_MS
        ) {
          return false
        }

        return (
          normalizeLyricMatchText(originalLine.text) ===
          normalizeLyricMatchText(karaokeLine.text)
        )
      })
      if (hasNearbyOriginal || hasSameTextOriginal) {
        return
      }

      const translationLine = findClosestByTime(
        translationLines,
        karaokeLine.time
      )
      const nextLine: LyricLine = {
        time: karaokeLine.time,
        text: karaokeLine.text,
        duration: karaokeLine.duration,
        segments: karaokeLine.segments,
      }

      if (translationLine?.text) {
        nextLine.translation = translationLine.text
      }

      mergedLines.push(nextLine)
    })
  }

  return mergedLines
    .filter(line => Boolean(line.text))
    .sort((first, second) => first.time - second.time)
}

export function findActiveLyricIndex(lines: LyricLine[], progressMs: number) {
  if (!lines.length || progressMs < lines[0].time) {
    return -1
  }

  let start = 0
  let end = lines.length - 1
  let activeIndex = -1

  while (start <= end) {
    const middle = Math.floor((start + end) / 2)

    if (lines[middle].time <= progressMs) {
      activeIndex = middle
      start = middle + 1
    } else {
      end = middle - 1
    }
  }

  return activeIndex
}
