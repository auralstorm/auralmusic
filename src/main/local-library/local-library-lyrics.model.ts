import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { ILyricsTag } from 'music-metadata'

type LyricTextBundle = {
  lrc: string
  tlyric: string
}

const LRC_TIMESTAMP_PATTERN = /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g
const LRC_TIMESTAMP_DETECT_PATTERN = /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/
const EMPTY_LYRIC_TEXT_BUNDLE: LyricTextBundle = {
  lrc: '',
  tlyric: '',
}

/** 去掉 UTF-8 BOM 和首尾空白，兼容从不同歌词来源写入的文本。 */
function trimLyricText(text: string) {
  return text.replace(/^\uFEFF/, '').trim()
}

/** 判断歌词是否已经包含 LRC 时间戳。 */
function hasTimestampMarkup(text: string) {
  return LRC_TIMESTAMP_DETECT_PATTERN.test(text)
}

/** 将毫秒格式化为 LRC 时间戳。 */
function formatTimestamp(totalMs: number) {
  const minutes = Math.floor(totalMs / 60_000)
  const seconds = Math.floor((totalMs % 60_000) / 1000)
  const milliseconds = totalMs % 1000

  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}]`
}

/** 普通文本歌词转换成伪时间轴 LRC，保证播放器歌词组件能按统一格式消费。 */
function toPseudoTimedLrc(text: string) {
  const normalizedText = trimLyricText(text)
  if (!normalizedText) {
    return ''
  }

  if (hasTimestampMarkup(normalizedText)) {
    return normalizedText
  }

  return normalizedText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => formatTimestamp(index * 4000) + line)
    .join('\n')
}

/**
 * 拆分双语 LRC。
 *
 * 同一时间戳第一次出现视为原文，第二次出现视为翻译；超过两次时回到原文，避免异常歌词丢行。
 */
export function splitBilingualLrcText(rawText: string): LyricTextBundle {
  const normalizedText = trimLyricText(rawText)
  if (!normalizedText) {
    return EMPTY_LYRIC_TEXT_BUNDLE
  }

  const originalLines: string[] = []
  const translatedLines: string[] = []
  const seenTimestampKeys = new Map<string, number>()

  normalizedText.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim()
    if (!line) {
      return
    }

    const timestamps = line.match(LRC_TIMESTAMP_PATTERN)
    if (!timestamps?.length) {
      originalLines.push(line)
      return
    }

    const timestampKey = timestamps.join('')
    const seenCount = seenTimestampKeys.get(timestampKey) ?? 0
    seenTimestampKeys.set(timestampKey, seenCount + 1)

    if (seenCount === 0) {
      originalLines.push(line)
      return
    }

    if (seenCount === 1) {
      translatedLines.push(line)
      return
    }

    originalLines.push(line)
  })

  return {
    lrc: originalLines.join('\n'),
    tlyric: translatedLines.join('\n'),
  }
}

/** 将 music-metadata 的同步歌词标签转换成 LRC 文本。 */
function toTimedLyricsText(tag: Pick<ILyricsTag, 'text' | 'syncText'>) {
  if (tag.syncText?.length) {
    return tag.syncText
      .filter(line => typeof line.text === 'string' && line.text.trim())
      .map(line => {
        return `${formatTimestamp(Math.max(0, line.timestamp ?? 0))}${line.text.trim()}`
      })
      .join('\n')
  }

  return toPseudoTimedLrc(tag.text ?? '')
}

/**
 * 读取下载器写入的翻译歌词标签，避免本地扫描阶段丢掉 mp3 的 TXXX 翻译歌词。
 * @param nativeTags music-metadata 返回的原生标签集合
 * @returns 翻译歌词文本
 */
export function readEmbeddedTranslatedLyricText(
  nativeTags:
    | Record<
        string,
        Array<{
          id?: string
          value?: unknown
        }>
      >
    | undefined
) {
  if (!nativeTags) {
    return ''
  }

  for (const tagGroup of Object.values(nativeTags)) {
    for (const tag of tagGroup) {
      if (tag.id !== 'TXXX:Translated Lyrics') {
        continue
      }

      if (typeof tag.value === 'string') {
        return trimLyricText(tag.value)
      }

      if (
        tag.value &&
        typeof tag.value === 'object' &&
        'text' in tag.value &&
        typeof tag.value.text === 'string'
      ) {
        return trimLyricText(tag.value.text)
      }
    }
  }

  return ''
}

/** 从音频内嵌歌词标签中读取原文/翻译歌词包。 */
export function readEmbeddedLyricTextBundle(
  lyrics: Array<Pick<ILyricsTag, 'text' | 'syncText'>> | undefined
): LyricTextBundle {
  if (!lyrics?.length) {
    return EMPTY_LYRIC_TEXT_BUNDLE
  }

  const parsedLyrics = lyrics
    .map(tag => toTimedLyricsText(tag))
    .map(text => trimLyricText(text))
    .filter(Boolean)

  return {
    lrc: parsedLyrics[0] ?? '',
    tlyric: parsedLyrics[1] ?? '',
  }
}

/** 读取音频旁路同名 .lrc 文件，并按双语规则拆分。 */
export async function readSidecarLrcTextBundle(audioFilePath: string) {
  const lrcPath = path.join(
    path.dirname(audioFilePath),
    `${path.basename(audioFilePath, path.extname(audioFilePath))}.lrc`
  )

  try {
    await access(lrcPath)
  } catch {
    return EMPTY_LYRIC_TEXT_BUNDLE
  }

  const rawText = await readFile(lrcPath, 'utf8')
  return splitBilingualLrcText(rawText)
}
