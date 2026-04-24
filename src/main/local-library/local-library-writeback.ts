import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import NodeID3 from 'node-id3'

type CoverAsset = {
  buffer: Buffer
  mime: string
  extension: string | null
}

type LocalTrackWritebackInput = {
  filePath: string
  title: string
  artistName: string
  albumName: string
  coverUrl: string
  lyricText: string
  translatedLyricText: string
  coverCacheDir: string
  fetcher?: typeof fetch
}

function normalizeCoverExtension(format?: string | null) {
  const normalizedFormat = format?.trim().toLowerCase()
  if (!normalizedFormat) {
    return null
  }

  if (normalizedFormat.includes('jpeg') || normalizedFormat.includes('jpg')) {
    return '.jpg'
  }

  if (normalizedFormat.includes('png')) {
    return '.png'
  }

  if (normalizedFormat.includes('webp')) {
    return '.webp'
  }

  return null
}

function collectNonEmptyLines(text: string) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function readLrcTimestampKey(line: string) {
  const matchedTimestamp = line.match(/^(?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/)
  return matchedTimestamp?.[0] ?? ''
}

function buildSidecarLrcText(lyricText: string, translatedLyricText: string) {
  const originalLines = collectNonEmptyLines(lyricText)
  const translatedLines = collectNonEmptyLines(translatedLyricText)

  if (originalLines.length === 0 && translatedLines.length === 0) {
    return ''
  }

  if (translatedLines.length === 0) {
    return originalLines.join('\n')
  }

  const translatedLineMap = new Map<string, string[]>()
  for (const line of translatedLines) {
    const timestampKey = readLrcTimestampKey(line)
    const bucket = translatedLineMap.get(timestampKey) ?? []
    bucket.push(line)
    translatedLineMap.set(timestampKey, bucket)
  }

  const mergedLines: string[] = []
  for (const originalLine of originalLines) {
    mergedLines.push(originalLine)
    const translationBucket = translatedLineMap.get(
      readLrcTimestampKey(originalLine)
    )
    const translatedLine = translationBucket?.shift()
    if (translatedLine) {
      mergedLines.push(translatedLine)
    }
  }

  for (const remainingTranslatedLines of translatedLineMap.values()) {
    mergedLines.push(...remainingTranslatedLines)
  }

  return mergedLines.join('\n')
}

async function writeSidecarLrcFile(
  targetPath: string,
  lyricText: string,
  translatedLyricText: string
) {
  const lrcText = buildSidecarLrcText(lyricText, translatedLyricText)
  if (!lrcText) {
    return false
  }

  const lrcPath = path.join(
    path.dirname(targetPath),
    `${path.basename(targetPath, path.extname(targetPath))}.lrc`
  )
  await writeFile(lrcPath, lrcText, 'utf8')
  return true
}

async function fetchCoverAsset(
  coverUrl: string,
  fetcher: typeof fetch
): Promise<CoverAsset | null> {
  if (!coverUrl.trim()) {
    return null
  }

  const response = await fetcher(coverUrl)
  if (!response.ok) {
    return null
  }

  const mime = response.headers.get('content-type') || 'image/jpeg'
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mime,
    extension: normalizeCoverExtension(mime),
  }
}

async function persistCoverAsset(
  coverCacheDir: string,
  filePath: string,
  coverAsset: CoverAsset | null
) {
  if (!coverAsset?.buffer.length || !coverAsset.extension) {
    return null
  }

  await mkdir(coverCacheDir, { recursive: true })

  const hash = createHash('sha1').update(filePath).digest('hex')
  const targetPath = path.join(coverCacheDir, `${hash}${coverAsset.extension}`)
  await writeFile(targetPath, coverAsset.buffer)
  return targetPath
}

/**
 * 统一本地补词写回策略，避免播放补词和下载写标签长期维护两套规则。
 * @param input 本地音频与补充元数据
 * @returns 本地封面缓存路径
 */
export async function writeLocalTrackSupplementalMetadata(
  input: LocalTrackWritebackInput
) {
  const fetcher = input.fetcher ?? fetch
  const coverAsset = await fetchCoverAsset(input.coverUrl, fetcher)
  const coverPath = await persistCoverAsset(
    input.coverCacheDir,
    input.filePath,
    coverAsset
  )

  if (path.extname(input.filePath).toLowerCase() !== '.mp3') {
    await writeSidecarLrcFile(
      input.filePath,
      input.lyricText,
      input.translatedLyricText
    )
    return {
      coverPath,
    }
  }

  const tags: NodeID3.Tags = {
    title: input.title,
    artist: input.artistName,
    album: input.albumName || undefined,
  }

  if (input.lyricText) {
    tags.unsynchronisedLyrics = {
      language: 'chi',
      text: input.lyricText,
    }
  }

  if (input.translatedLyricText) {
    tags.userDefinedText = [
      {
        description: 'Translated Lyrics',
        value: input.translatedLyricText,
      },
    ]
  }

  if (coverAsset) {
    tags.image = {
      mime: coverAsset.mime,
      type: { id: 3 },
      description: 'Cover',
      imageBuffer: coverAsset.buffer,
    }
  }

  const updateResult = NodeID3.update(tags, input.filePath)
  if (updateResult instanceof Error) {
    throw updateResult
  }

  return {
    coverPath,
  }
}
