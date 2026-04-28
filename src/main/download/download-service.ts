import { access, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import NodeID3 from 'node-id3'

import type { AudioQualityLevel } from '../config/types.ts'
import { createMainLogger } from '../logging/logger.ts'
import { readMusicApiBaseUrlFromEnv } from '../music-api-runtime.ts'
import type { AuthSession } from '../../shared/auth.ts'
import {
  normalizeRequestHeadersForFetch,
  resolveAuthRequestHeaders,
} from '../auth/request-header.ts'
import {
  DOWNLOAD_QUALITY_FALLBACK_CHAIN,
  createDownloadQualityFallbackChain,
  type DownloadRuntimeConfig,
  type DownloadTask,
  type DownloadTaskMetadata,
  type ResolveSongUrlInput,
  type ResolvedSongDownload,
  type SongDownloadPayload,
} from './download-types.ts'
import { createDownloadSourceResolver } from './download-source-resolver.ts'
import {
  readDownloadFilePlaybackMetadata,
  type DownloadFilePlaybackMetadata,
} from './download-file-metadata.ts'

type DownloadServiceOptions = {
  defaultRootDir: string
  concurrency?: number
  now?: () => number
  createTaskId?: () => string
  readPersistedTasks?: () => DownloadTask[]
  writePersistedTasks?: (tasks: DownloadTask[]) => void
  readConfig?: () => Partial<DownloadRuntimeConfig>
  getAuthSession?: () => AuthSession | null
  resolveSongUrl?: (
    input: ResolveSongUrlInput
  ) => Promise<ResolvedSongDownload | null>
  fetchMetadata?: (songId: number | string) => Promise<DownloadTaskMetadata>
  readPlaybackMetadata?: (
    targetPath: string
  ) => Promise<DownloadFilePlaybackMetadata>
  downloadFetcher?: typeof fetch
  embedMetadata?: (input: {
    filePath: string
    payload: SongDownloadPayload
    metadata: DownloadTaskMetadata
  }) => Promise<{
    applied: boolean
    note?: string | null
    warningMessage?: string | null
  }>
  openPath?: (targetPath: string) => Promise<string>
  showItemInFolder?: (targetPath: string) => void
}

const downloadLogger = createMainLogger('download')

const CONTENT_TYPE_EXTENSION_MAP: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
}

/** 创建默认任务 id，避免持久化任务在重启后和新任务冲突。 */
function createDefaultTaskId() {
  return `download-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** 对外返回任务副本，避免调用方直接修改内部 Map 中的任务对象。 */
function cloneTask(task: DownloadTask): DownloadTask {
  return { ...task }
}

function cloneTasks(tasks: DownloadTask[]) {
  return tasks.map(cloneTask)
}

/** 清理文件名中的系统非法字符，避免下载写盘失败。 */
function sanitizeFileName(value: string) {
  const filtered = Array.from(value, character => {
    const codePoint = character.charCodeAt(0)
    if (codePoint <= 31 || '<>:"/\\|?*'.includes(character)) {
      return ' '
    }

    return character
  }).join('')

  const normalized = filtered.replace(/\s+/g, ' ').trim()
  return normalized || 'download'
}

/** 配置目录为空时回退系统默认下载目录。 */
function normalizeDirectory(value: string | undefined, fallback: string) {
  if (!value?.trim()) {
    return fallback
  }

  return value
}

/** 判断是否有可写入文件标签或旁路歌词的补充元数据。 */
function hasMetadata(metadata?: DownloadTaskMetadata) {
  return Boolean(
    metadata?.albumName ||
    metadata?.coverUrl ||
    metadata?.lyric ||
    metadata?.translatedLyric
  )
}

/** 统一扩展名格式，后续拼接文件名时都带点且小写。 */
function normalizeExtension(extension: string | null | undefined) {
  if (!extension) {
    return ''
  }

  return extension.startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`
}

/** 用户文件名模板已经带扩展名时不再追加推断扩展名。 */
function hasExplicitFileExtension(fileName: string) {
  return /^\.[a-z0-9]{1,8}$/i.test(path.extname(fileName))
}

function sanitizeEmbeddedLyricText(value: string) {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => {
      if (!line) {
        return false
      }

      // 网易歌词接口会把作词/作曲等 JSON 头混进 lrc 文本，直接写入本地会让播放器误判为无效歌词。
      if (line.startsWith('{') && line.endsWith('}')) {
        return false
      }

      return true
    })
    .join('\n')
}

/** 判断候选音质是否低于用户请求音质，用于降级策略标记。 */
function isLowerQuality(
  candidate: AudioQualityLevel,
  requested: AudioQualityLevel
) {
  const requestedIndex = DOWNLOAD_QUALITY_FALLBACK_CHAIN.indexOf(requested)
  const candidateIndex = DOWNLOAD_QUALITY_FALLBACK_CHAIN.indexOf(candidate)

  return (
    requestedIndex >= 0 &&
    candidateIndex >= 0 &&
    candidateIndex > requestedIndex
  )
}

/** 从下载 URL 推断扩展名，URL 无法解析时回退普通路径解析。 */
function inferExtensionFromUrl(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl)
    return normalizeExtension(path.extname(parsedUrl.pathname))
  } catch {
    return normalizeExtension(path.extname(sourceUrl))
  }
}

/** 从响应 content-type 推断音频扩展名。 */
function inferExtensionFromContentType(contentType: string | null) {
  const normalizedType = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  return CONTENT_TYPE_EXTENSION_MAP[normalizedType] || ''
}

/** 清理歌词空行。 */
function collectNonEmptyLines(text: string) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

/** 提取 LRC 时间戳 key，用于原文/翻译歌词对齐。 */
function readLrcTimestampKey(line: string) {
  const matchedTimestamp = line.match(/^(?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/)
  return matchedTimestamp?.[0] ?? ''
}

/** 构造旁路 .lrc 文本，翻译歌词按相同时间戳插入原文后。 */
function buildSidecarLrcText(metadata: DownloadTaskMetadata) {
  const originalLines = collectNonEmptyLines(
    sanitizeEmbeddedLyricText(metadata.lyric ?? '')
  )
  const translatedLines = collectNonEmptyLines(
    sanitizeEmbeddedLyricText(metadata.translatedLyric ?? '')
  )

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
    const timestampKey = readLrcTimestampKey(originalLine)
    const translationBucket = translatedLineMap.get(timestampKey)
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

/** 写入同名 .lrc 文件，非 mp3 或嵌入失败时作为可靠兜底。 */
async function writeSidecarLrcFile(
  targetPath: string,
  metadata: DownloadTaskMetadata
) {
  const lrcText = buildSidecarLrcText(metadata)
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

/** 根据文件名模板生成最终下载文件名。 */
function buildFileName(
  payload: SongDownloadPayload,
  pattern: DownloadRuntimeConfig['downloadFileNamePattern'],
  extension: string
) {
  const baseName =
    payload.fileName?.trim() ||
    (pattern === 'artist-song'
      ? `${payload.artistName} - ${payload.songName}`
      : `${payload.songName} - ${payload.artistName}`)

  const sanitized = sanitizeFileName(baseName)
  if (hasExplicitFileExtension(sanitized)) {
    return sanitized
  }

  return `${sanitized}${extension}`
}

/** 将未知异常转换为可展示的任务错误信息。 */
function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

/** 归一化持久化任务，丢弃缺少必要字段或状态非法的历史数据。 */
function normalizePersistedTask(task: unknown): DownloadTask | null {
  const value = task as Partial<DownloadTask> | null | undefined

  if (!value || typeof value !== 'object') {
    return null
  }

  if (!value.id || !value.songName || !value.artistName) {
    return null
  }

  const status = value.status
  const safeStatus =
    status === 'queued' ||
    status === 'downloading' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'skipped'
      ? status
      : 'failed'

  return {
    id: String(value.id),
    songId: value.songId ?? '',
    songName: String(value.songName),
    artistName: String(value.artistName),
    coverUrl: typeof value.coverUrl === 'string' ? value.coverUrl : '',
    albumName:
      value.albumName === null || typeof value.albumName === 'string'
        ? value.albumName
        : null,
    requestedQuality:
      typeof value.requestedQuality === 'string'
        ? value.requestedQuality
        : 'higher',
    resolvedQuality:
      value.resolvedQuality === null ||
      typeof value.resolvedQuality === 'string'
        ? value.resolvedQuality
        : null,
    status: safeStatus,
    progress:
      typeof value.progress === 'number' && Number.isFinite(value.progress)
        ? Math.min(100, Math.max(0, value.progress))
        : 0,
    errorMessage:
      value.errorMessage === null || typeof value.errorMessage === 'string'
        ? value.errorMessage
        : null,
    targetPath: typeof value.targetPath === 'string' ? value.targetPath : '',
    fileSizeBytes:
      typeof value.fileSizeBytes === 'number' &&
      Number.isFinite(value.fileSizeBytes) &&
      value.fileSizeBytes >= 0
        ? Math.floor(value.fileSizeBytes)
        : null,
    durationMs:
      typeof value.durationMs === 'number' &&
      Number.isFinite(value.durationMs) &&
      value.durationMs >= 0
        ? Math.floor(value.durationMs)
        : 0,
    lyricText: typeof value.lyricText === 'string' ? value.lyricText : '',
    translatedLyricText:
      typeof value.translatedLyricText === 'string'
        ? value.translatedLyricText
        : '',
    note:
      value.note === null || typeof value.note === 'string' ? value.note : null,
    warningMessage:
      value.warningMessage === null || typeof value.warningMessage === 'string'
        ? value.warningMessage
        : null,
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : 0,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : 0,
    completedAt:
      value.completedAt === null ||
      (typeof value.completedAt === 'number' &&
        Number.isFinite(value.completedAt))
        ? value.completedAt
        : null,
  }
}

/** 应用重启后，未完成任务标记为失败，避免恢复为“下载中”但没有真实网络任务。 */
function restorePersistedTask(
  task: DownloadTask,
  now: () => number
): DownloadTask {
  if (task.status !== 'queued' && task.status !== 'downloading') {
    return task
  }

  const recoveredAt = now()

  return {
    ...task,
    status: 'failed',
    errorMessage:
      task.errorMessage ||
      'Download was interrupted because the application restarted before completion.',
    completedAt: recoveredAt,
    updatedAt: recoveredAt,
  }
}

/** 从歌曲详情响应中提取专辑、封面和时长。 */
function readSongDetailMetadata(payload: unknown): DownloadTaskMetadata {
  const root = payload as
    | {
        songs?: Array<{
          al?: { name?: string; picUrl?: string }
          album?: { name?: string; picUrl?: string }
          dt?: number
          duration?: number
        }>
        data?: {
          songs?: Array<{
            al?: { name?: string; picUrl?: string }
            album?: { name?: string; picUrl?: string }
            dt?: number
            duration?: number
          }>
        }
      }
    | undefined

  const songs = root?.songs || root?.data?.songs || []
  const firstSong = songs[0]
  const album = firstSong?.al || firstSong?.album

  return {
    albumName: album?.name || '',
    coverUrl: album?.picUrl || '',
    durationMs:
      typeof firstSong?.dt === 'number' && Number.isFinite(firstSong.dt)
        ? Math.max(0, Math.floor(firstSong.dt))
        : typeof firstSong?.duration === 'number' &&
            Number.isFinite(firstSong.duration)
          ? Math.max(0, Math.floor(firstSong.duration))
          : undefined,
  }
}

/** 从歌词响应中提取原文/翻译歌词。 */
function readLyricMetadata(payload: unknown): DownloadTaskMetadata {
  const root = payload as
    | {
        lrc?: { lyric?: string }
        tlyric?: { lyric?: string }
        data?: {
          lrc?: { lyric?: string }
          tlyric?: { lyric?: string }
        }
      }
    | undefined

  const data = root?.data || root

  return {
    lyric: sanitizeEmbeddedLyricText(data?.lrc?.lyric || ''),
    translatedLyric: sanitizeEmbeddedLyricText(data?.tlyric?.lyric || ''),
  }
}

/** 读取下载响应体并持续回报进度；没有 stream reader 时回退一次性读取。 */
async function responseToBuffer(
  response: Response,
  onProgress: (progress: number) => void
) {
  const totalBytes = Number(response.headers.get('content-length') || 0)
  const reader = response.body?.getReader()

  if (!reader) {
    const arrayBuffer = await response.arrayBuffer()
    onProgress(100)
    return Buffer.from(arrayBuffer)
  }

  const chunks: Buffer[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    if (!value) {
      continue
    }

    const chunk = Buffer.from(value)
    chunks.push(chunk)
    receivedBytes += chunk.byteLength

    if (totalBytes > 0) {
      onProgress((receivedBytes / totalBytes) * 100)
    }
  }

  onProgress(100)
  return Buffer.concat(chunks)
}

/**
 * 下载服务。
 *
 * 负责下载任务队列、并发控制、音源解析、文件写入、元数据写入、任务持久化和状态广播。
 */
export class DownloadService {
  private readonly defaultRootDir: string
  private readonly fixedConcurrency: number | undefined
  private readonly now: () => number
  private readonly createTaskId: () => string
  private readonly readPersistedTasks?: () => DownloadTask[]
  private readonly writePersistedTasks?: (tasks: DownloadTask[]) => void
  private readonly readConfig?: () => Partial<DownloadRuntimeConfig>
  private readonly getAuthSession?: () => AuthSession | null
  private readonly resolveSongUrl?: DownloadServiceOptions['resolveSongUrl']
  private readonly fetchMetadata?: DownloadServiceOptions['fetchMetadata']
  private readonly readPlaybackMetadata: (
    targetPath: string
  ) => Promise<DownloadFilePlaybackMetadata>
  private readonly downloadFetcher: typeof fetch
  private readonly embedMetadata?: DownloadServiceOptions['embedMetadata']
  private readonly openPath?: DownloadServiceOptions['openPath']
  private readonly showItemInFolder?: DownloadServiceOptions['showItemInFolder']
  private readonly tasks = new Map<string, DownloadTask>()
  private readonly taskPayloads = new Map<string, SongDownloadPayload>()
  private readonly queue: string[] = []
  private readonly listeners = new Set<(tasks: DownloadTask[]) => void>()
  private activeCount = 0

  constructor(options: DownloadServiceOptions) {
    this.defaultRootDir = options.defaultRootDir
    this.fixedConcurrency = options.concurrency
    this.now = options.now ?? Date.now
    this.createTaskId = options.createTaskId ?? createDefaultTaskId
    this.readPersistedTasks = options.readPersistedTasks
    this.writePersistedTasks = options.writePersistedTasks
    this.readConfig = options.readConfig
    this.getAuthSession = options.getAuthSession
    this.resolveSongUrl = options.resolveSongUrl
    this.fetchMetadata = options.fetchMetadata
    this.readPlaybackMetadata =
      options.readPlaybackMetadata ?? readDownloadFilePlaybackMetadata
    this.downloadFetcher = options.downloadFetcher ?? fetch
    this.embedMetadata = options.embedMetadata
    this.openPath = options.openPath
    this.showItemInFolder = options.showItemInFolder
    this.restorePersistedTasks()
  }

  /** 获取当前下载目录，配置为空时回退系统默认下载目录。 */
  getDefaultDirectory(configuredDir = '') {
    return normalizeDirectory(configuredDir, this.defaultRootDir)
  }

  /** 打开下载目录，不存在时先创建。 */
  async openDirectory(configuredDir = '') {
    if (!this.openPath) {
      return false
    }

    const targetDir = this.getDefaultDirectory(configuredDir)
    await mkdir(targetDir, { recursive: true })
    return (await this.openPath(targetDir)) === ''
  }

  /** 创建下载任务并放入队列，随后异步触发队列泵。 */
  async enqueueSongDownload(payload: SongDownloadPayload) {
    const runtimeConfig = this.getRuntimeConfig()
    const createdAt = this.now()
    const task: DownloadTask = {
      id: this.createTaskId(),
      songId: payload.songId,
      songName: payload.songName,
      artistName: payload.artistName,
      coverUrl: payload.coverUrl || payload.metadata?.coverUrl || '',
      albumName: payload.albumName ?? payload.metadata?.albumName ?? null,
      requestedQuality:
        payload.requestedQuality || runtimeConfig.downloadQuality,
      resolvedQuality: null,
      status: 'queued',
      progress: 0,
      errorMessage: null,
      targetPath: '',
      fileSizeBytes: null,
      durationMs:
        typeof payload.durationMs === 'number' &&
        Number.isFinite(payload.durationMs) &&
        payload.durationMs >= 0
          ? Math.floor(payload.durationMs)
          : 0,
      lyricText: payload.metadata?.lyric || '',
      translatedLyricText: payload.metadata?.translatedLyric || '',
      note: null,
      warningMessage: null,
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    }

    this.tasks.set(task.id, task)
    this.taskPayloads.set(task.id, {
      ...payload,
      requestedQuality: task.requestedQuality,
    })
    this.queue.push(task.id)
    this.emitTasksChanged()
    void this.pumpQueue()
    return cloneTask(task)
  }

  /** 返回按创建时间倒序排列的任务快照。 */
  getTasks() {
    return Array.from(this.tasks.values())
      .sort((left, right) => right.createdAt - left.createdAt)
      .map(cloneTask)
  }

  /** 移除非下载中的任务，下载中任务不允许删除以避免写盘状态不一致。 */
  removeTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task || task.status === 'downloading') {
      return false
    }

    const queueIndex = this.queue.indexOf(taskId)
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1)
    }

    this.tasks.delete(taskId)
    this.taskPayloads.delete(taskId)
    this.emitTasksChanged()
    return true
  }

  /** 使用系统默认应用打开已完成的下载文件。 */
  async openDownloadedFile(taskId: string) {
    if (!this.openPath) {
      return false
    }

    const task = this.tasks.get(taskId)
    if (!task?.targetPath || task.status !== 'completed') {
      return false
    }

    return (await this.openPath(task.targetPath)) === ''
  }

  /** 在文件管理器中定位下载文件。 */
  async openDownloadedFileFolder(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task?.targetPath || !this.showItemInFolder) {
      return false
    }

    this.showItemInFolder(task.targetPath)
    return true
  }

  /** 订阅任务列表快照变化，返回取消订阅函数。 */
  subscribe(listener: (tasks: DownloadTask[]) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** 每次任务执行时读取最新配置，让并发数、目录和嵌入策略实时生效。 */
  private getRuntimeConfig(): DownloadRuntimeConfig {
    const config = this.readConfig?.() || {}

    return {
      musicSourceEnabled: config.musicSourceEnabled ?? false,
      musicSourceProviders: config.musicSourceProviders ?? [],
      luoxueSourceEnabled: config.luoxueSourceEnabled ?? false,
      customMusicApiEnabled: config.customMusicApiEnabled ?? false,
      customMusicApiUrl: config.customMusicApiUrl ?? '',
      downloadDir: config.downloadDir || '',
      downloadQuality: config.downloadQuality || 'higher',
      downloadQualityPolicy: config.downloadQualityPolicy || 'fallback',
      downloadSkipExisting: config.downloadSkipExisting ?? true,
      downloadConcurrency:
        this.fixedConcurrency || config.downloadConcurrency || 3,
      downloadFileNamePattern: config.downloadFileNamePattern || 'song-artist',
      downloadEmbedCover: config.downloadEmbedCover ?? true,
      downloadEmbedLyrics: config.downloadEmbedLyrics ?? true,
      downloadEmbedTranslatedLyrics:
        config.downloadEmbedLyrics === false
          ? false
          : (config.downloadEmbedTranslatedLyrics ?? false),
    }
  }

  /** 广播并持久化任务快照。 */
  private emitTasksChanged() {
    const tasks = this.getTasks()
    this.writePersistedTasks?.(cloneTasks(tasks))
    for (const listener of this.listeners) {
      listener(tasks)
    }
  }

  /** 启动时恢复历史任务，并补齐已完成任务的播放元数据。 */
  private restorePersistedTasks() {
    const persistedTasks = this.readPersistedTasks?.() ?? []
    if (!persistedTasks.length) {
      return
    }

    for (const candidate of persistedTasks) {
      const normalizedTask = normalizePersistedTask(candidate)
      if (!normalizedTask) {
        continue
      }

      const restoredTask = restorePersistedTask(normalizedTask, this.now)
      this.tasks.set(restoredTask.id, restoredTask)
    }

    this.writePersistedTasks?.(cloneTasks(this.getTasks()))
    void this.hydratePersistedTaskPlaybackMetadata()
  }

  /** 判断任务是否需要重新读取文件大小、时长或歌词。 */
  private needsPlaybackMetadataHydration(task: DownloadTask) {
    return !task.targetPath ||
      (task.status !== 'completed' && task.status !== 'skipped')
      ? false
      : task.fileSizeBytes === null ||
          task.durationMs <= 0 ||
          (!task.lyricText && !task.translatedLyricText)
  }

  /** 将文件读取到的播放元数据合并进任务，已有值优先保留。 */
  private applyPlaybackMetadata(
    task: DownloadTask,
    metadata: Partial<DownloadFilePlaybackMetadata> & {
      fileSizeBytes?: number | null
    }
  ) {
    let didUpdate = false

    if (task.fileSizeBytes === null && metadata.fileSizeBytes != null) {
      task.fileSizeBytes = metadata.fileSizeBytes
      didUpdate = true
    }

    if (
      task.durationMs <= 0 &&
      typeof metadata.durationMs === 'number' &&
      metadata.durationMs > 0
    ) {
      task.durationMs = metadata.durationMs
      didUpdate = true
    }

    if (!task.lyricText && metadata.lyricText) {
      task.lyricText = metadata.lyricText
      didUpdate = true
    }

    if (!task.translatedLyricText && metadata.translatedLyricText) {
      task.translatedLyricText = metadata.translatedLyricText
      didUpdate = true
    }

    if (didUpdate) {
      task.updatedAt = this.now()
    }

    return didUpdate
  }

  /** 并行读取文件大小和播放器元数据。 */
  private async readTaskPlaybackMetadata(targetPath: string) {
    const [fileSizeBytes, playbackMetadata] = await Promise.all([
      this.readFileSizeBytes(targetPath),
      this.readPlaybackMetadata(targetPath).catch(() => ({
        durationMs: 0,
        lyricText: '',
        translatedLyricText: '',
      })),
    ])

    return {
      ...playbackMetadata,
      fileSizeBytes,
    }
  }

  /** 后台修复历史任务缺失的播放元数据。 */
  private async hydratePersistedTaskPlaybackMetadata() {
    let didUpdate = false

    for (const task of this.tasks.values()) {
      if (!this.needsPlaybackMetadataHydration(task)) {
        continue
      }

      const metadata = await this.readTaskPlaybackMetadata(task.targetPath)
      didUpdate = this.applyPlaybackMetadata(task, metadata) || didUpdate
    }

    if (didUpdate) {
      this.emitTasksChanged()
    }
  }

  /** 手动补齐单个任务的播放元数据，供 UI 在需要播放下载文件时调用。 */
  async hydrateTaskPlaybackMetadata(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task || !this.needsPlaybackMetadataHydration(task)) {
      return task ? cloneTask(task) : null
    }

    const metadata = await this.readTaskPlaybackMetadata(task.targetPath)
    if (this.applyPlaybackMetadata(task, metadata)) {
      this.emitTasksChanged()
    }

    return cloneTask(task)
  }

  /** 统一更新任务并触发持久化/广播。 */
  private updateTask(taskId: string, updater: (task: DownloadTask) => void) {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    updater(task)
    task.updatedAt = this.now()
    this.emitTasksChanged()
  }

  /** 按当前并发配置推进下载队列。 */
  private async pumpQueue() {
    const concurrency = Math.max(
      1,
      Math.min(10, this.getRuntimeConfig().downloadConcurrency)
    )

    while (this.activeCount < concurrency && this.queue.length > 0) {
      const nextTaskId = this.queue.shift()
      if (!nextTaskId || !this.tasks.has(nextTaskId)) {
        continue
      }

      this.activeCount += 1
      void this.processTask(nextTaskId).finally(() => {
        this.activeCount = Math.max(0, this.activeCount - 1)
        void this.pumpQueue()
      })
    }
  }

  /** 执行单个下载任务的完整流程。 */
  private async processTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    const runtimeConfig = this.getRuntimeConfig()
    this.updateTask(taskId, currentTask => {
      currentTask.status = 'downloading'
      currentTask.progress = 1
      currentTask.errorMessage = null
    })

    try {
      const resolved = await this.resolveDownloadSource(taskId)
      const resolvedQuality =
        resolved.payload.resolvedQuality ??
        resolved.quality ??
        task.requestedQuality
      const targetDirectory = this.getDefaultDirectory(
        resolved.payload.directory || runtimeConfig.downloadDir
      )
      const initialExtension =
        normalizeExtension(resolved.fileExtension) ||
        normalizeExtension(resolved.payload.fileExtension) ||
        inferExtensionFromUrl(resolved.url)
      let targetPath = path.join(
        targetDirectory,
        buildFileName(
          resolved.payload,
          runtimeConfig.downloadFileNamePattern,
          initialExtension
        )
      )

      this.updateTask(taskId, currentTask => {
        currentTask.resolvedQuality = resolvedQuality
        currentTask.targetPath = targetPath
        if (
          resolvedQuality !== currentTask.requestedQuality &&
          isLowerQuality(resolvedQuality, currentTask.requestedQuality)
        ) {
          currentTask.note = `Download downgraded from ${currentTask.requestedQuality} to ${resolvedQuality}.`
        }
      })

      await mkdir(targetDirectory, { recursive: true })
      if (
        runtimeConfig.downloadSkipExisting &&
        (await this.pathExists(targetPath))
      ) {
        // 跳过已有文件时也读取播放元数据，让下载列表仍能直接播放本地文件。
        const existingMetadata = await this.readTaskPlaybackMetadata(targetPath)
        this.finishTask(taskId, currentTask => {
          currentTask.status = 'skipped'
          currentTask.progress = 100
          this.applyPlaybackMetadata(currentTask, existingMetadata)
          currentTask.warningMessage =
            'Skipped download because the target file already exists.'
        })
        return
      }

      const response = await this.downloadFetcher(resolved.url)
      if (!response.ok) {
        throw new Error(
          `Download request failed with status ${response.status}`
        )
      }

      const responseExtension =
        initialExtension ||
        inferExtensionFromContentType(response.headers.get('content-type'))
      if (responseExtension && !hasExplicitFileExtension(targetPath)) {
        // 部分接口只有响应头能确认格式，收到响应后再修正最终文件名。
        targetPath = path.join(
          targetDirectory,
          buildFileName(
            resolved.payload,
            runtimeConfig.downloadFileNamePattern,
            responseExtension
          )
        )

        if (
          runtimeConfig.downloadSkipExisting &&
          (await this.pathExists(targetPath))
        ) {
          const existingMetadata =
            await this.readTaskPlaybackMetadata(targetPath)
          this.finishTask(taskId, currentTask => {
            currentTask.targetPath = targetPath
            currentTask.status = 'skipped'
            currentTask.progress = 100
            this.applyPlaybackMetadata(currentTask, existingMetadata)
            currentTask.warningMessage =
              'Skipped download because the target file already exists.'
          })
          return
        }

        this.updateTask(taskId, currentTask => {
          currentTask.targetPath = targetPath
        })
      }

      const audioBuffer = await responseToBuffer(response, progress => {
        this.updateTask(taskId, currentTask => {
          currentTask.progress = Math.min(99, Math.max(1, Math.round(progress)))
        })
      })

      await writeFile(targetPath, audioBuffer)
      const metadataResult = await this.applyMetadata(
        targetPath,
        resolved.payload,
        runtimeConfig
      )
      const fileSizeBytes =
        (await this.readFileSizeBytes(targetPath)) ?? audioBuffer.byteLength
      const playbackMetadata = await this.readPlaybackMetadata(targetPath)
        .then(metadata => ({
          ...metadata,
          fileSizeBytes,
        }))
        .catch(() => ({ fileSizeBytes }))

      this.finishTask(taskId, currentTask => {
        currentTask.status = 'completed'
        currentTask.progress = 100
        currentTask.targetPath = targetPath
        this.applyPlaybackMetadata(currentTask, playbackMetadata)
        if (metadataResult.note) {
          currentTask.note = currentTask.note
            ? `${currentTask.note} ${metadataResult.note}`.trim()
            : metadataResult.note
        }
        if (metadataResult.warningMessage) {
          currentTask.warningMessage = metadataResult.warningMessage
        }
      })
    } catch (error) {
      this.finishTask(taskId, currentTask => {
        currentTask.status = 'failed'
        currentTask.errorMessage = toErrorMessage(error)
        currentTask.progress = 0
      })
    }
  }

  /** 完成类状态统一写 completedAt。 */
  private finishTask(taskId: string, updater: (task: DownloadTask) => void) {
    this.updateTask(taskId, task => {
      updater(task)
      task.completedAt = this.now()
    })
  }

  /** 读取文件大小，失败返回 null 让任务仍能完成。 */
  private async readFileSizeBytes(targetPath: string) {
    try {
      const fileStat = await stat(targetPath)
      return fileStat.size
    } catch {
      return null
    }
  }

  /** 按质量策略解析下载直链，fallback 模式会逐级尝试低音质。 */
  private async resolveDownloadSource(taskId: string) {
    const payload = this.taskPayloads.get(taskId)
    if (!payload) {
      throw new Error(`Download task ${taskId} was not found.`)
    }

    const runtimeConfig = this.getRuntimeConfig()
    const downloadQualityPolicy =
      payload.downloadQualityPolicy ?? runtimeConfig.downloadQualityPolicy
    const qualityChain =
      downloadQualityPolicy === 'strict'
        ? [payload.requestedQuality]
        : createDownloadQualityFallbackChain(payload.requestedQuality)

    for (const quality of qualityChain) {
      const resolved = await this.resolveSongUrlForQuality(
        taskId,
        payload,
        quality
      )
      if (!resolved?.url) {
        continue
      }

      return {
        ...resolved,
        quality: resolved.quality ?? quality,
        payload,
      }
    }

    throw new Error('无可用音质')
  }

  /** 解析指定音质的下载源，优先使用 payload 直链，再走注入解析器或默认解析器。 */
  private async resolveSongUrlForQuality(
    taskId: string,
    payload: SongDownloadPayload,
    quality: AudioQualityLevel
  ) {
    if (payload.sourceUrl) {
      return {
        url: payload.sourceUrl,
        quality: payload.resolvedQuality ?? quality,
        fileExtension: payload.fileExtension ?? null,
      } satisfies ResolvedSongDownload
    }

    if (this.resolveSongUrl) {
      return this.resolveSongUrl({
        taskId,
        payload,
        quality,
        songId: payload.songId,
      })
    }

    const resolver = createDownloadSourceResolver({
      fetcher: this.downloadFetcher,
      getAuthSession: this.getAuthSession,
    })

    return resolver({
      payload,
      quality,
      runtimeConfig: this.getRuntimeConfig(),
    })
  }

  /** 下载完成后按配置写入封面/歌词/专辑等元数据。 */
  private async applyMetadata(
    targetPath: string,
    payload: SongDownloadPayload,
    runtimeConfig: DownloadRuntimeConfig
  ): Promise<{
    note: string | null
    warningMessage: string | null
  }> {
    const metadata = await this.resolveMetadata(payload)
    const nextMetadata: DownloadTaskMetadata = {
      albumName: metadata.albumName || payload.albumName || '',
      coverUrl: runtimeConfig.downloadEmbedCover
        ? metadata.coverUrl || payload.coverUrl || ''
        : '',
      lyric: runtimeConfig.downloadEmbedLyrics ? metadata.lyric || '' : '',
      translatedLyric:
        runtimeConfig.downloadEmbedLyrics &&
        runtimeConfig.downloadEmbedTranslatedLyrics
          ? metadata.translatedLyric || ''
          : '',
    }

    if (!hasMetadata(nextMetadata)) {
      return {
        note: null,
        warningMessage: null,
      }
    }

    if (path.extname(targetPath).toLowerCase() !== '.mp3') {
      // 无损格式不走 ID3 写入链时，落同名 .lrc 才能让本地乐库后续扫描到歌词。
      await writeSidecarLrcFile(targetPath, nextMetadata)
      return {
        note: null,
        warningMessage:
          'Metadata embedding skipped because this file format is not supported.',
      }
    }

    if (this.embedMetadata) {
      try {
        const result = await this.embedMetadata({
          filePath: targetPath,
          payload,
          metadata: nextMetadata,
        })

        return {
          note: result.note ?? null,
          warningMessage: result.warningMessage ?? null,
        }
      } catch (error) {
        return {
          note: null,
          warningMessage: `Metadata embedding skipped: ${toErrorMessage(error)}`,
        }
      }
    }

    const tags: NodeID3.Tags = {
      title: payload.songName,
      artist: payload.artistName,
      album: nextMetadata.albumName || undefined,
    }

    if (nextMetadata.lyric) {
      tags.unsynchronisedLyrics = {
        language: 'chi',
        text: nextMetadata.lyric,
      }
    }

    if (nextMetadata.translatedLyric) {
      tags.userDefinedText = [
        {
          description: 'Translated Lyrics',
          value: nextMetadata.translatedLyric,
        },
      ]
    }

    if (nextMetadata.coverUrl) {
      try {
        const coverResponse = await this.downloadFetcher(nextMetadata.coverUrl)
        if (coverResponse.ok) {
          tags.image = {
            mime: coverResponse.headers.get('content-type') || 'image/jpeg',
            type: { id: 3 },
            description: 'Cover',
            imageBuffer: Buffer.from(await coverResponse.arrayBuffer()),
          }
        }
      } catch (error) {
        downloadLogger.warn('fetch cover failed', { error })
      }
    }

    const updateResult = NodeID3.update(tags, targetPath)
    if (updateResult instanceof Error) {
      return {
        note: null,
        warningMessage: updateResult.message,
      }
    }

    return {
      note: 'Embedded MP3 metadata.',
      warningMessage: null,
    }
  }

  /** 合并 payload 自带元数据和 Music API 拉取的详情/歌词。 */
  private async resolveMetadata(payload: SongDownloadPayload) {
    const mergedMetadata: DownloadTaskMetadata = {
      ...(payload.metadata || {}),
    }

    if (this.fetchMetadata) {
      try {
        return {
          ...mergedMetadata,
          ...(await this.fetchMetadata(payload.songId)),
        }
      } catch (error) {
        downloadLogger.warn('fetch metadata failed', { error })
        return mergedMetadata
      }
    }

    const baseURL = readMusicApiBaseUrlFromEnv()
    if (!baseURL) {
      return mergedMetadata
    }

    try {
      const detailUrl = new URL('/song/detail', `${baseURL}/`)
      detailUrl.searchParams.set('ids', String(payload.songId))
      const lyricUrl = new URL('/lyric/new', `${baseURL}/`)
      lyricUrl.searchParams.set('id', String(payload.songId))

      const [detailResult, lyricResult] = await Promise.allSettled([
        this.downloadFetcher(detailUrl.toString(), {
          headers: this.createMusicApiRequestHeaders(detailUrl.toString()),
        }).then(async response => {
          if (!response.ok) {
            throw new Error(`song detail failed: ${response.status}`)
          }
          return response.json()
        }),
        this.downloadFetcher(lyricUrl.toString(), {
          headers: this.createMusicApiRequestHeaders(lyricUrl.toString()),
        }).then(async response => {
          if (!response.ok) {
            throw new Error(`lyric failed: ${response.status}`)
          }
          return response.json()
        }),
      ])

      return {
        ...mergedMetadata,
        ...(detailResult.status === 'fulfilled'
          ? readSongDetailMetadata(detailResult.value)
          : {}),
        ...(lyricResult.status === 'fulfilled'
          ? readLyricMetadata(lyricResult.value)
          : {}),
      }
    } catch (error) {
      downloadLogger.warn('resolve metadata failed', { error })
      return mergedMetadata
    }
  }

  /** 判断目标文件是否存在。 */
  private async pathExists(targetPath: string) {
    try {
      await access(targetPath)
      return true
    } catch {
      return false
    }
  }

  /** 为元数据请求补充登录 Cookie，支持会员歌曲详情和歌词。 */
  private createMusicApiRequestHeaders(requestUrl: string) {
    const baseURL = readMusicApiBaseUrlFromEnv()
    if (!baseURL) {
      return {}
    }

    let authOrigin: string | undefined
    try {
      authOrigin = new URL(baseURL).origin
    } catch {
      authOrigin = undefined
    }

    return normalizeRequestHeadersForFetch(
      resolveAuthRequestHeaders({
        authOrigin,
        authSession: this.getAuthSession?.() ?? null,
        requestHeaders: {},
        requestUrl,
      })
    )
  }
}
