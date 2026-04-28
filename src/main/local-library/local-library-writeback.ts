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

/** 根据远程封面 MIME 选择本地缓存扩展名。 */
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

/** 清理歌词空行，写回文件前保持紧凑格式。 */
function collectNonEmptyLines(text: string) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

/** 提取一行 LRC 的时间戳 key，用于原文和翻译按时间对齐。 */
function readLrcTimestampKey(line: string) {
  const matchedTimestamp = line.match(/^(?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/)
  return matchedTimestamp?.[0] ?? ''
}

/** 合并原文和翻译歌词，翻译行插入对应原文时间戳后面。 */
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

/** 为非 mp3 文件写入同名 .lrc，避免强行改写不易安全嵌入标签的格式。 */
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

/** 下载远程封面并保留 MIME，后续既用于缓存扩展名也用于 ID3 图片标签。 */
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

/** 按音频路径 hash 缓存封面，避免同名歌曲在不同目录下互相覆盖。 */
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
    // 非 mp3 只写旁路歌词和封面缓存，避免不同容器格式标签写入兼容性风险。
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
    // 下载器和扫描器约定使用 TXXX:Translated Lyrics 保存翻译歌词。
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
