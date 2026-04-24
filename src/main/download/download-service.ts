import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import NodeID3 from 'node-id3'

import type { AudioQualityLevel } from '../config/types.ts'
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

function createDefaultTaskId() {
  return `download-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cloneTask(task: DownloadTask): DownloadTask {
  return { ...task }
}

function cloneTasks(tasks: DownloadTask[]) {
  return tasks.map(cloneTask)
}

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

function normalizeDirectory(value: string | undefined, fallback: string) {
  if (!value?.trim()) {
    return fallback
  }

  return value
}

function hasMetadata(metadata?: DownloadTaskMetadata) {
  return Boolean(
    metadata?.albumName ||
    metadata?.coverUrl ||
    metadata?.lyric ||
    metadata?.translatedLyric
  )
}

function normalizeExtension(extension: string | null | undefined) {
  if (!extension) {
    return ''
  }

  return extension.startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`
}

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

function inferExtensionFromUrl(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl)
    return normalizeExtension(path.extname(parsedUrl.pathname))
  } catch {
    return normalizeExtension(path.extname(sourceUrl))
  }
}

function inferExtensionFromContentType(contentType: string | null) {
  const normalizedType = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
  return CONTENT_TYPE_EXTENSION_MAP[normalizedType] || ''
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

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

function readSongDetailMetadata(payload: unknown): DownloadTaskMetadata {
  const root = payload as
    | {
        songs?: Array<{
          al?: { name?: string; picUrl?: string }
          album?: { name?: string; picUrl?: string }
        }>
        data?: {
          songs?: Array<{
            al?: { name?: string; picUrl?: string }
            album?: { name?: string; picUrl?: string }
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
  }
}

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
    this.downloadFetcher = options.downloadFetcher ?? fetch
    this.embedMetadata = options.embedMetadata
    this.openPath = options.openPath
    this.showItemInFolder = options.showItemInFolder
    this.restorePersistedTasks()
  }

  getDefaultDirectory(configuredDir = '') {
    return normalizeDirectory(configuredDir, this.defaultRootDir)
  }

  async openDirectory(configuredDir = '') {
    if (!this.openPath) {
      return false
    }

    const targetDir = this.getDefaultDirectory(configuredDir)
    await mkdir(targetDir, { recursive: true })
    return (await this.openPath(targetDir)) === ''
  }

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

  getTasks() {
    return Array.from(this.tasks.values())
      .sort((left, right) => right.createdAt - left.createdAt)
      .map(cloneTask)
  }

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

  async openDownloadedFileFolder(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task?.targetPath || !this.showItemInFolder) {
      return false
    }

    this.showItemInFolder(task.targetPath)
    return true
  }

  subscribe(listener: (tasks: DownloadTask[]) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

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

  private emitTasksChanged() {
    const tasks = this.getTasks()
    this.writePersistedTasks?.(cloneTasks(tasks))
    for (const listener of this.listeners) {
      listener(tasks)
    }
  }

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
  }

  private updateTask(taskId: string, updater: (task: DownloadTask) => void) {
    const task = this.tasks.get(taskId)
    if (!task) {
      return
    }

    updater(task)
    task.updatedAt = this.now()
    this.emitTasksChanged()
  }

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
        this.finishTask(taskId, currentTask => {
          currentTask.status = 'skipped'
          currentTask.progress = 100
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
          this.finishTask(taskId, currentTask => {
            currentTask.targetPath = targetPath
            currentTask.status = 'skipped'
            currentTask.progress = 100
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

      this.finishTask(taskId, currentTask => {
        currentTask.status = 'completed'
        currentTask.progress = 100
        currentTask.targetPath = targetPath
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

  private finishTask(taskId: string, updater: (task: DownloadTask) => void) {
    this.updateTask(taskId, task => {
      updater(task)
      task.completedAt = this.now()
    })
  }

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
        console.warn('[DownloadService] fetch cover failed', error)
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
        console.warn('[DownloadService] fetch metadata failed', error)
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
      console.warn('[DownloadService] resolve metadata failed', error)
      return mergedMetadata
    }
  }

  private async pathExists(targetPath: string) {
    try {
      await access(targetPath)
      return true
    } catch {
      return false
    }
  }

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
