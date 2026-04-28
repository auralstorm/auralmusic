import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createLocalMediaUrl } from '../../shared/local-media.ts'
import type {
  CacheEntryRecord,
  CacheEntryType,
  CacheIndex,
  CacheStatus,
  ReadLyricsPayloadParams,
  ResolveAudioSourceParams,
  ResolveAudioSourceResult,
  ResolveImageSourceParams,
  ResolveImageSourceResult,
  WriteLyricsPayloadParams,
} from './cache-types'

const CACHE_INDEX_VERSION = 1 as const
const AUDIO_DIR_NAME = 'audio'
const IMAGE_DIR_NAME = 'images'
const LYRICS_DIR_NAME = 'lyrics'
const INDEX_FILE_NAME = 'index.json'

type CacheServiceOptions = {
  defaultRootDir: string
  fetcher?: typeof fetch
  now?: () => number
}

type CacheLayout = {
  rootDir: string
  audioDir: string
  imageDir: string
  lyricsDir: string
  indexFilePath: string
}

type CacheIndexState = {
  entries: Map<string, CacheEntryRecord>
}

/** 缓存索引中的关键字段必须是非空字符串。 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** 缓存类型白名单校验，避免旧索引或手改索引污染清理逻辑。 */
function isKnownEntryType(value: unknown): value is CacheEntryType {
  return value === 'audio' || value === 'lyrics' || value === 'image'
}

/** 相对路径只允许缓存目录内部路径，防止索引文件被篡改后删除目录外文件。 */
function normalizeRelativePath(value: unknown) {
  if (!isNonEmptyString(value)) {
    return null
  }

  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..')) {
    return null
  }

  return normalized
}

/** 读取并校验缓存索引，遇到未知版本或脏数据时安全降级为空索引。 */
function parseIndex(raw: unknown): CacheIndexState {
  if (
    !raw ||
    typeof raw !== 'object' ||
    (raw as CacheIndex).version !== CACHE_INDEX_VERSION ||
    !Array.isArray((raw as CacheIndex).entries)
  ) {
    return { entries: new Map() }
  }

  const entries = new Map<string, CacheEntryRecord>()
  for (const item of (raw as CacheIndex).entries) {
    if (!item || typeof item !== 'object') {
      continue
    }

    if (
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.key) ||
      !isKnownEntryType(item.type)
    ) {
      continue
    }

    const relativePath = normalizeRelativePath(item.relativePath)
    if (!relativePath) {
      continue
    }

    const size =
      typeof item.size === 'number' &&
      Number.isFinite(item.size) &&
      item.size >= 0
        ? Math.floor(item.size)
        : 0
    const createdAt =
      typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
        ? Math.floor(item.createdAt)
        : 0
    const lastAccessed =
      typeof item.lastAccessed === 'number' &&
      Number.isFinite(item.lastAccessed)
        ? Math.floor(item.lastAccessed)
        : 0

    entries.set(item.id, {
      id: item.id,
      key: item.key,
      type: item.type,
      relativePath,
      size,
      createdAt,
      lastAccessed,
    })
  }

  return { entries }
}

/** 将内存 Map 序列化为磁盘索引结构。 */
function serializeIndex(state: CacheIndexState): CacheIndex {
  return {
    version: CACHE_INDEX_VERSION,
    entries: [...state.entries.values()],
  }
}

/** 缓存 id 使用类型和业务 key 共同 hash，避免不同资源类型 key 相同导致冲突。 */
function buildCacheId(type: CacheEntryType, key: string) {
  return createHash('sha256').update(type).update(':').update(key).digest('hex')
}

/** 优先从 URL 路径推断扩展名，失败时落到 content-type 或 .bin。 */
function getUrlExtension(sourceUrl: string) {
  try {
    const extension = path.extname(new URL(sourceUrl).pathname)
    if (/^\.[a-zA-Z0-9]{1,8}$/.test(extension)) {
      return extension.toLowerCase()
    }
  } catch {
    // noop
  }

  return '.bin'
}

/** 根据音频 content-type 选择扩展名，确保 local-media 协议能返回正确 MIME。 */
function getContentTypeExtension(contentType: string | null) {
  if (!contentType) {
    return '.bin'
  }

  if (contentType.includes('audio/mpeg')) {
    return '.mp3'
  }
  if (contentType.includes('audio/flac')) {
    return '.flac'
  }
  if (contentType.includes('audio/aac')) {
    return '.aac'
  }
  if (contentType.includes('audio/mp4')) {
    return '.m4a'
  }
  if (contentType.includes('audio/ogg')) {
    return '.ogg'
  }
  if (
    contentType.includes('audio/wav') ||
    contentType.includes('audio/x-wav')
  ) {
    return '.wav'
  }

  return '.bin'
}

/** 根据图片 content-type 选择扩展名。 */
function getImageContentTypeExtension(contentType: string | null) {
  if (!contentType) {
    return '.bin'
  }

  if (contentType.includes('image/jpeg')) {
    return '.jpg'
  }
  if (contentType.includes('image/png')) {
    return '.png'
  }
  if (contentType.includes('image/webp')) {
    return '.webp'
  }
  if (contentType.includes('image/avif')) {
    return '.avif'
  }
  if (contentType.includes('image/gif')) {
    return '.gif'
  }

  return '.bin'
}

/** 判断缓存文件是否仍存在，索引清理和命中检查都会复用。 */
async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 磁盘缓存服务。
 *
 * 负责音频、封面和歌词缓存的目录布局、索引维护、容量淘汰和 local-media URL 生成。
 */
export class CacheService {
  private readonly defaultRootDir: string
  private readonly fetcher: typeof fetch
  private readonly inFlightImageWrites = new Map<string, Promise<void>>()
  private readonly now: () => number

  constructor(options: CacheServiceOptions) {
    this.defaultRootDir = options.defaultRootDir
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? Date.now
  }

  /** 返回默认缓存根目录，用于设置页展示。 */
  getDefaultCacheRoot() {
    return this.defaultRootDir
  }

  /** 配置目录为空时回退默认目录。 */
  resolveCacheRoot(configCacheDir: string) {
    return isNonEmptyString(configCacheDir)
      ? configCacheDir
      : this.defaultRootDir
  }

  async resolveAudioSource(
    params: ResolveAudioSourceParams
  ): Promise<ResolveAudioSourceResult> {
    if (!params.enabled) {
      // 用户关闭磁盘缓存时直接返回远程地址，不做任何目录初始化。
      return { url: params.sourceUrl, fromCache: false }
    }

    const layout = await this.ensureLayout(params.cacheDir)
    const state = await this.loadIndex(layout)
    const id = buildCacheId('audio', params.cacheKey)
    const cachedEntry = state.entries.get(id)

    if (cachedEntry) {
      const absolutePath = this.toAbsolutePath(
        layout.rootDir,
        cachedEntry.relativePath
      )
      if (await fileExists(absolutePath)) {
        // 命中后刷新访问时间，容量淘汰会优先保留最近使用的资源。
        cachedEntry.lastAccessed = this.now()
        await this.saveIndex(layout, state)

        return { url: createLocalMediaUrl(absolutePath), fromCache: true }
      }

      state.entries.delete(id)
      await this.saveIndex(layout, state)
    }

    try {
      const response = await this.fetcher(params.sourceUrl)
      if (!response.ok) {
        // 缓存失败不影响播放主流程，回退源地址。
        return { url: params.sourceUrl, fromCache: false }
      }

      const bytes = Buffer.from(await response.arrayBuffer())
      const urlExt = getUrlExtension(params.sourceUrl)
      const contentExt = getContentTypeExtension(
        response.headers.get('content-type')
      )
      const extension = urlExt !== '.bin' ? urlExt : contentExt
      const relativePath = `${AUDIO_DIR_NAME}/${id}${extension}`
      const absolutePath = this.toAbsolutePath(layout.rootDir, relativePath)

      await fs.mkdir(path.dirname(absolutePath), { recursive: true })
      await fs.writeFile(absolutePath, bytes)

      const timestamp = this.now()
      state.entries.set(id, {
        id,
        key: params.cacheKey,
        type: 'audio',
        relativePath,
        size: bytes.byteLength,
        createdAt: timestamp,
        lastAccessed: timestamp,
      })

      await this.evictIfNeeded(layout, state, params.maxBytes)
      await this.saveIndex(layout, state)

      return { url: createLocalMediaUrl(absolutePath), fromCache: true }
    } catch {
      // 网络或写盘异常都降级为远程地址，避免缓存层阻断播放器。
      return { url: params.sourceUrl, fromCache: false }
    }
  }

  /** 解析图片资源；未命中时后台写入缓存，避免封面列表首屏被磁盘写入阻塞。 */
  async resolveImageSource(
    params: ResolveImageSourceParams
  ): Promise<ResolveImageSourceResult> {
    if (!params.enabled) {
      return { url: params.sourceUrl, fromCache: false }
    }

    const layout = await this.ensureLayout(params.cacheDir)
    const state = await this.loadIndex(layout)
    const id = buildCacheId('image', params.cacheKey)
    const cachedEntry = state.entries.get(id)

    if (cachedEntry) {
      const absolutePath = this.toAbsolutePath(
        layout.rootDir,
        cachedEntry.relativePath
      )
      if (await fileExists(absolutePath)) {
        cachedEntry.lastAccessed = this.now()
        await this.saveIndex(layout, state)

        return { url: createLocalMediaUrl(absolutePath), fromCache: true }
      }

      state.entries.delete(id)
      await this.saveIndex(layout, state)
    }

    // 图片先返回远端 URL，后台落盘缓存，避免封面列表被磁盘写入阻塞首屏渲染。
    this.queueImagePersistence(layout, state, id, params)
    return { url: params.sourceUrl, fromCache: false }
  }

  async readLyricsPayload(
    params: ReadLyricsPayloadParams
  ): Promise<string | null> {
    if (!params.enabled) {
      return null
    }

    const layout = await this.ensureLayout(params.cacheDir)
    const state = await this.loadIndex(layout)
    const id = buildCacheId('lyrics', params.cacheKey)
    const entry = state.entries.get(id)
    if (!entry) {
      return null
    }

    const absolutePath = this.toAbsolutePath(layout.rootDir, entry.relativePath)
    if (!(await fileExists(absolutePath))) {
      // 索引存在但文件已被外部清理时，删除脏索引并返回未命中。
      state.entries.delete(id)
      await this.saveIndex(layout, state)
      return null
    }

    const payload = await fs.readFile(absolutePath, 'utf8')
    entry.lastAccessed = this.now()
    await this.saveIndex(layout, state)
    return payload
  }

  async writeLyricsPayload(params: WriteLyricsPayloadParams) {
    if (!params.enabled) {
      return
    }

    const layout = await this.ensureLayout(params.cacheDir)
    const state = await this.loadIndex(layout)
    const id = buildCacheId('lyrics', params.cacheKey)
    const relativePath = `${LYRICS_DIR_NAME}/${id}.json`
    const absolutePath = this.toAbsolutePath(layout.rootDir, relativePath)
    const payload = String(params.payload)

    // 歌词缓存落成 JSON 文本文件，便于排查和跨版本读取。
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, payload, 'utf8')

    const timestamp = this.now()
    state.entries.set(id, {
      id,
      key: params.cacheKey,
      type: 'lyrics',
      relativePath,
      size: Buffer.byteLength(payload, 'utf8'),
      createdAt: timestamp,
      lastAccessed: timestamp,
    })

    await this.evictIfNeeded(layout, state, params.maxBytes)
    await this.saveIndex(layout, state)
  }

  async clear(options: { cacheDir: string }) {
    // 清理只删除受控子目录和索引文件，不递归删除用户选择的缓存根目录本身。
    const layout = await this.ensureLayout(options.cacheDir)
    await Promise.all([
      fs.rm(layout.audioDir, { recursive: true, force: true }),
      fs.rm(layout.imageDir, { recursive: true, force: true }),
      fs.rm(layout.lyricsDir, { recursive: true, force: true }),
      fs.rm(layout.indexFilePath, { force: true }),
    ])
    await Promise.all([
      fs.mkdir(layout.audioDir, { recursive: true }),
      fs.mkdir(layout.imageDir, { recursive: true }),
      fs.mkdir(layout.lyricsDir, { recursive: true }),
    ])
  }

  async getStatus(options: { cacheDir: string }): Promise<CacheStatus> {
    const layout = await this.ensureLayout(options.cacheDir)
    const state = await this.loadIndex(layout)
    let hasChanges = false
    let usedBytes = 0
    let audioCount = 0
    let lyricsCount = 0

    for (const [id, entry] of state.entries) {
      const absolutePath = this.toAbsolutePath(
        layout.rootDir,
        entry.relativePath
      )
      if (!(await fileExists(absolutePath))) {
        // 状态统计顺便修复被外部删除文件造成的脏索引。
        state.entries.delete(id)
        hasChanges = true
        continue
      }

      usedBytes += entry.size
      if (entry.type === 'audio') {
        audioCount += 1
      } else if (entry.type === 'lyrics') {
        lyricsCount += 1
      }
    }

    if (hasChanges) {
      await this.saveIndex(layout, state)
    }

    return {
      usedBytes,
      audioCount,
      lyricsCount,
    }
  }

  private async ensureLayout(configCacheDir: string): Promise<CacheLayout> {
    const rootDir = this.resolveCacheRoot(configCacheDir)
    const audioDir = path.join(rootDir, AUDIO_DIR_NAME)
    const imageDir = path.join(rootDir, IMAGE_DIR_NAME)
    const lyricsDir = path.join(rootDir, LYRICS_DIR_NAME)
    const indexFilePath = path.join(rootDir, INDEX_FILE_NAME)

    await Promise.all([
      fs.mkdir(audioDir, { recursive: true }),
      fs.mkdir(imageDir, { recursive: true }),
      fs.mkdir(lyricsDir, { recursive: true }),
    ])

    return {
      rootDir,
      audioDir,
      imageDir,
      lyricsDir,
      indexFilePath,
    }
  }

  private queueImagePersistence(
    layout: CacheLayout,
    state: CacheIndexState,
    id: string,
    params: ResolveImageSourceParams
  ) {
    if (this.inFlightImageWrites.has(id)) {
      return
    }

    // 同一封面只允许一个后台写入任务，避免并发滚动时重复下载并互相覆盖索引。
    const writePromise = this.persistImageEntry(layout, state, id, params)
      .catch(() => undefined)
      .finally(() => {
        this.inFlightImageWrites.delete(id)
      })

    this.inFlightImageWrites.set(id, writePromise)
  }

  private toAbsolutePath(rootDir: string, relativePath: string) {
    // relativePath 已在 parseIndex 中去掉 ../，这里仅做平台路径拼接。
    const segments = relativePath.split('/').filter(Boolean)
    return path.join(rootDir, ...segments)
  }

  private async loadIndex(layout: CacheLayout): Promise<CacheIndexState> {
    try {
      const raw = await fs.readFile(layout.indexFilePath, 'utf8')
      return parseIndex(JSON.parse(raw))
    } catch {
      // 索引不存在或损坏时按空缓存处理，后续写入会重建 index.json。
      return { entries: new Map() }
    }
  }

  private async saveIndex(layout: CacheLayout, state: CacheIndexState) {
    await fs.writeFile(
      layout.indexFilePath,
      JSON.stringify(serializeIndex(state), null, 2),
      'utf8'
    )
  }

  private async persistImageEntry(
    layout: CacheLayout,
    state: CacheIndexState,
    id: string,
    params: ResolveImageSourceParams
  ) {
    const response = await this.fetcher(params.sourceUrl)
    if (!response.ok) {
      return
    }

    const bytes = Buffer.from(await response.arrayBuffer())
    const urlExt = getUrlExtension(params.sourceUrl)
    const contentExt = getImageContentTypeExtension(
      response.headers.get('content-type')
    )
    const extension = urlExt !== '.bin' ? urlExt : contentExt
    const relativePath = `${IMAGE_DIR_NAME}/${id}${extension}`
    const absolutePath = this.toAbsolutePath(layout.rootDir, relativePath)

    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, bytes)

    const timestamp = this.now()
    state.entries.set(id, {
      id,
      key: params.cacheKey,
      type: 'image',
      relativePath,
      size: bytes.byteLength,
      createdAt: timestamp,
      lastAccessed: timestamp,
    })

    await this.evictIfNeeded(layout, state, params.maxBytes)
    await this.saveIndex(layout, state)
  }

  private async evictIfNeeded(
    layout: CacheLayout,
    state: CacheIndexState,
    maxBytes: number
  ) {
    if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
      return
    }

    let totalBytes = [...state.entries.values()].reduce(
      (sum, entry) => sum + entry.size,
      0
    )
    if (totalBytes <= maxBytes) {
      return
    }

    const sortedEntries = [...state.entries.values()].sort((left, right) => {
      if (left.lastAccessed === right.lastAccessed) {
        return left.createdAt - right.createdAt
      }
      return left.lastAccessed - right.lastAccessed
    })

    // 按最近访问时间淘汰，优先保留当前常听音频与最近展示过的封面/歌词。
    for (const entry of sortedEntries) {
      if (totalBytes <= maxBytes) {
        break
      }

      totalBytes -= entry.size
      state.entries.delete(entry.id)
      const absolutePath = this.toAbsolutePath(
        layout.rootDir,
        entry.relativePath
      )
      await fs.rm(absolutePath, { force: true })
    }
  }
}
