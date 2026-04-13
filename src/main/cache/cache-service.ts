import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  CacheEntryRecord,
  CacheEntryType,
  CacheIndex,
  CacheStatus,
  ReadLyricsPayloadParams,
  ResolveAudioSourceParams,
  ResolveAudioSourceResult,
  WriteLyricsPayloadParams,
} from './cache-types'

const CACHE_INDEX_VERSION = 1 as const
const AUDIO_DIR_NAME = 'audio'
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
  lyricsDir: string
  indexFilePath: string
}

type CacheIndexState = {
  entries: Map<string, CacheEntryRecord>
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isKnownEntryType(value: unknown): value is CacheEntryType {
  return value === 'audio' || value === 'lyrics'
}

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

function serializeIndex(state: CacheIndexState): CacheIndex {
  return {
    version: CACHE_INDEX_VERSION,
    entries: [...state.entries.values()],
  }
}

function buildCacheId(type: CacheEntryType, key: string) {
  return createHash('sha256').update(type).update(':').update(key).digest('hex')
}

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

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export class CacheService {
  private readonly defaultRootDir: string
  private readonly fetcher: typeof fetch
  private readonly now: () => number

  constructor(options: CacheServiceOptions) {
    this.defaultRootDir = options.defaultRootDir
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? Date.now
  }

  getDefaultCacheRoot() {
    return this.defaultRootDir
  }

  resolveCacheRoot(configCacheDir: string) {
    return isNonEmptyString(configCacheDir)
      ? configCacheDir
      : this.defaultRootDir
  }

  async resolveAudioSource(
    params: ResolveAudioSourceParams
  ): Promise<ResolveAudioSourceResult> {
    if (!params.enabled) {
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
        cachedEntry.lastAccessed = this.now()
        await this.saveIndex(layout, state)

        return { url: pathToFileURL(absolutePath).href, fromCache: true }
      }

      state.entries.delete(id)
      await this.saveIndex(layout, state)
    }

    try {
      const response = await this.fetcher(params.sourceUrl)
      if (!response.ok) {
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

      return { url: params.sourceUrl, fromCache: false }
    } catch {
      return { url: params.sourceUrl, fromCache: false }
    }
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
    const layout = await this.ensureLayout(options.cacheDir)
    await Promise.all([
      fs.rm(layout.audioDir, { recursive: true, force: true }),
      fs.rm(layout.lyricsDir, { recursive: true, force: true }),
      fs.rm(layout.indexFilePath, { force: true }),
    ])
    await Promise.all([
      fs.mkdir(layout.audioDir, { recursive: true }),
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
    const lyricsDir = path.join(rootDir, LYRICS_DIR_NAME)
    const indexFilePath = path.join(rootDir, INDEX_FILE_NAME)

    await Promise.all([
      fs.mkdir(audioDir, { recursive: true }),
      fs.mkdir(lyricsDir, { recursive: true }),
    ])

    return {
      rootDir,
      audioDir,
      lyricsDir,
      indexFilePath,
    }
  }

  private toAbsolutePath(rootDir: string, relativePath: string) {
    const segments = relativePath.split('/').filter(Boolean)
    return path.join(rootDir, ...segments)
  }

  private async loadIndex(layout: CacheLayout): Promise<CacheIndexState> {
    try {
      const raw = await fs.readFile(layout.indexFilePath, 'utf8')
      return parseIndex(JSON.parse(raw))
    } catch {
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
