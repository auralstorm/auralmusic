import { createHash } from 'node:crypto'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parseFile } from 'music-metadata'
import {
  LOCAL_LIBRARY_SCAN_FORMATS,
  type LocalLibraryScanFormat,
} from '../../shared/config.ts'

import {
  readEmbeddedLyricTextBundle,
  readEmbeddedTranslatedLyricText,
  readSidecarLrcTextBundle,
} from './local-library-lyrics.model.ts'
import type { LocalLibraryScanSummary } from '../../shared/local-library.ts'
import type { LocalLibraryDatabase } from './db.ts'

const SUPPORTED_AUDIO_EXTENSIONS = new Map<LocalLibraryScanFormat, string>([
  ['mp3', '.mp3'],
  ['flac', '.flac'],
  ['m4a', '.m4a'],
  ['aac', '.aac'],
  ['ogg', '.ogg'],
  ['wav', '.wav'],
])

const FALLBACK_ARTIST_NAME = '未知歌手'
const FALLBACK_ALBUM_NAME = '未知专辑'

/** 扫描阶段解析出的音频元数据，字段全部转成曲库数据库可直接消费的形态。 */
export interface ParsedAudioMetadata {
  title: string | null
  artistName: string | null
  albumName: string | null
  durationMs: number
  lyricText: string
  translatedLyricText: string
  trackNo: number | null
  discNo: number | null
  coverBytes: Uint8Array | null
  coverExtension: string | null
}

/** 扫描上下文允许注入解析器，便于测试和后续替换 music-metadata 实现。 */
export interface LocalLibraryScanContext {
  coverCacheDir: string
  parseAudioMetadata: (filePath: string) => Promise<ParsedAudioMetadata>
}

/** 归一化封面图片扩展名，未知格式不写入缓存。 */
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

/** 使用 music-metadata 解析音频标签，并转换成曲库统一元数据。 */
async function parseAudioMetadataWithMusicMetadata(
  filePath: string
): Promise<ParsedAudioMetadata> {
  const metadata = await parseFile(filePath, {
    skipPostHeaders: true,
  })

  const picture = metadata.common.picture?.[0]
  const trackNo =
    typeof metadata.common.track.no === 'number' &&
    Number.isFinite(metadata.common.track.no)
      ? metadata.common.track.no
      : null
  const discNo =
    typeof metadata.common.disk.no === 'number' &&
    Number.isFinite(metadata.common.disk.no)
      ? metadata.common.disk.no
      : null
  const embeddedLyricBundle = readEmbeddedLyricTextBundle(
    metadata.common.lyrics
  )
  const embeddedTranslatedLyricText = readEmbeddedTranslatedLyricText(
    metadata.native as Record<
      string,
      Array<{
        id?: string
        value?: unknown
      }>
    >
  )

  return {
    title: metadata.common.title?.trim() || null,
    artistName: metadata.common.artist?.trim() || null,
    albumName: metadata.common.album?.trim() || null,
    durationMs: Number.isFinite(metadata.format.duration)
      ? Math.round((metadata.format.duration ?? 0) * 1000)
      : 0,
    lyricText: embeddedLyricBundle.lrc,
    translatedLyricText:
      embeddedLyricBundle.tlyric || embeddedTranslatedLyricText,
    trackNo,
    discNo,
    coverBytes: picture?.data ?? null,
    coverExtension: normalizeCoverExtension(picture?.format),
  }
}

/** 创建扫描上下文，默认使用 music-metadata 解析器。 */
export function createLocalLibraryScanContext(
  options: Partial<LocalLibraryScanContext> &
    Pick<LocalLibraryScanContext, 'coverCacheDir'>
): LocalLibraryScanContext {
  return {
    coverCacheDir: options.coverCacheDir,
    parseAudioMetadata:
      options.parseAudioMetadata ?? parseAudioMetadataWithMusicMetadata,
  }
}

/** 根据用户配置的格式生成支持的扩展名集合。 */
function createSupportedAudioExtensionSet(
  formats: readonly LocalLibraryScanFormat[]
) {
  return new Set(
    formats
      .map(format => SUPPORTED_AUDIO_EXTENSIONS.get(format))
      .filter((extension): extension is string => Boolean(extension))
  )
}

/** 判断文件是否属于当前扫描格式集合。 */
function isSupportedAudioFile(
  filePath: string,
  supportedExtensions: Set<string>
) {
  return supportedExtensions.has(path.extname(filePath).toLowerCase())
}

/** 同名歌词是辅助资源，不作为无效音频计入跳过数量。 */
function isLocalLyricSidecar(filePath: string) {
  return path.extname(filePath).toLowerCase() === '.lrc'
}

/** 递归收集目录下所有文件，后续统一按扩展名过滤。 */
async function collectFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true })
  const collectedFiles: string[] = []

  for (const entry of entries) {
    const resolvedPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) {
      collectedFiles.push(...(await collectFiles(resolvedPath)))
      continue
    }

    collectedFiles.push(resolvedPath)
  }

  return collectedFiles
}

/** 将内嵌封面写入曲库封面缓存目录，并返回本地路径。 */
async function persistCoverAsset(
  coverCacheDir: string,
  filePath: string,
  coverBytes: Uint8Array | null,
  coverExtension: string | null
) {
  if (!coverBytes?.length || !coverExtension) {
    return null
  }

  await mkdir(coverCacheDir, { recursive: true })

  const hash = createHash('sha1').update(filePath).digest('hex')
  const targetPath = path.join(coverCacheDir, `${hash}${coverExtension}`)
  await writeFile(targetPath, coverBytes)
  return targetPath
}

/** 没有标题标签时使用文件名作为歌曲名兜底。 */
function resolveFallbackTitle(filePath: string) {
  return path.basename(filePath, path.extname(filePath)).trim() || '未知歌曲'
}

/** 文件大小和 mtime 未变化时认为索引可复用，避免重复解析标签。 */
function isTrackFileUnchanged(options: {
  existingTrack: {
    fileSize: number
    mtimeMs: number
  } | null
  fileSize: number
  mtimeMs: number
}) {
  return (
    options.existingTrack?.fileSize === options.fileSize &&
    options.existingTrack?.mtimeMs === options.mtimeMs
  )
}

/**
 * 扫描本地曲库根目录。
 *
 * 扫描会同步根目录、递归读取音频文件、写入/更新曲库索引，并删除已从目录消失的旧记录。
 */
export async function scanLocalLibraryRoots(options: {
  database: LocalLibraryDatabase
  scanContext: LocalLibraryScanContext
  roots: string[]
  formats?: readonly LocalLibraryScanFormat[]
}): Promise<LocalLibraryScanSummary> {
  const normalizedRoots = [
    ...new Set(
      options.roots
        .map(rootPath => rootPath.trim())
        .filter(Boolean)
        .map(rootPath => path.resolve(rootPath))
    ),
  ]

  const rootRecords = options.database.replaceRoots(normalizedRoots)
  const rootRecordMap = new Map(rootRecords.map(root => [root.path, root]))
  const supportedExtensions = createSupportedAudioExtensionSet(
    options.formats?.length ? options.formats : LOCAL_LIBRARY_SCAN_FORMATS
  )

  let importedCount = 0
  let skippedCount = 0

  for (const rootPath of normalizedRoots) {
    const rootRecord = rootRecordMap.get(rootPath)
    if (!rootRecord) {
      continue
    }

    const collectedFiles = await collectFiles(rootPath)
    const indexedFilePaths: string[] = []

    for (const filePath of collectedFiles) {
      if (!isSupportedAudioFile(filePath, supportedExtensions)) {
        // 同名歌词文件属于扫描辅助资源，不计入“跳过的无效音频”，避免统计结果误导用户。
        if (!isLocalLyricSidecar(filePath)) {
          skippedCount += 1
        }
        continue
      }

      const fileStats = await stat(filePath)
      const existingTrack = options.database.getTrackByFilePath(filePath)
      // 未变化文件直接复用现有索引，避免每次手动扫描都重复读标签和写封面缓存。
      if (
        isTrackFileUnchanged({
          existingTrack,
          fileSize: fileStats.size,
          mtimeMs: fileStats.mtimeMs,
        })
      ) {
        indexedFilePaths.push(filePath)
        continue
      }

      const metadata = await options.scanContext
        .parseAudioMetadata(filePath)
        .catch(() => null)
      const sidecarLyricBundle = await readSidecarLrcTextBundle(filePath)
      // 同名 .lrc 往往比内嵌歌词更完整，优先落库可以避免播放时两套歌词来源互相打架。
      const lyricText = sidecarLyricBundle.lrc || metadata?.lyricText || ''
      const translatedLyricText =
        sidecarLyricBundle.tlyric || metadata?.translatedLyricText || ''

      const coverPath = await persistCoverAsset(
        options.scanContext.coverCacheDir,
        filePath,
        metadata?.coverBytes ?? null,
        metadata?.coverExtension ?? null
      )

      options.database.upsertTrack({
        rootId: rootRecord.id,
        filePath,
        fileName: path.basename(filePath),
        title: metadata?.title || resolveFallbackTitle(filePath),
        artistName: metadata?.artistName || FALLBACK_ARTIST_NAME,
        albumName: metadata?.albumName || FALLBACK_ALBUM_NAME,
        durationMs: metadata?.durationMs ?? 0,
        lyricText,
        translatedLyricText,
        coverPath,
        fileSize: fileStats.size,
        mtimeMs: fileStats.mtimeMs,
        audioFormat: path.extname(filePath).slice(1).toLowerCase(),
        trackNo: metadata?.trackNo ?? null,
        discNo: metadata?.discNo ?? null,
      })

      indexedFilePaths.push(filePath)
      importedCount += 1
    }

    options.database.removeTracksMissingFromRoot(
      rootRecord.id,
      indexedFilePaths
    )
  }

  const lastScannedAt = Date.now()
  options.database.setLastScannedAt(lastScannedAt)

  return {
    rootCount: normalizedRoots.length,
    importedCount,
    skippedCount,
    lastScannedAt,
  }
}
