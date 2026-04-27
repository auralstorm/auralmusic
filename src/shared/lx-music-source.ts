export type LxScriptInfo = {
  name: string
  description?: string
  version?: string
  author?: string
  homepage?: string
  rawScript?: string
}

export type LxQuality = '128k' | '320k' | 'flac' | 'flac24bit'

export const LX_SOURCE_KEYS = ['kw', 'kg', 'tx', 'wy', 'mg'] as const

export type LxSourceKey = (typeof LX_SOURCE_KEYS)[number]
export type LxSourceId = string
export type LxSourceAction =
  | 'musicUrl'
  | 'lyric'
  | 'pic'
  | 'search'
  | 'musicSearch'

export type LxSourceConfig = {
  name: string
  type: 'music'
  actions: LxSourceAction[]
  qualitys: LxQuality[]
}

export type LxMusicInfo = {
  songmid: string | number
  songId?: string | number
  audioId?: string
  hash?: string
  strMediaMid?: string
  copyrightId?: string
  name: string
  singer: string
  album: string
  albumId?: string | number
  source: LxSourceId
  interval: string
  img?: string
}

export type LxSearchInfo = {
  keyword: string
  page?: number
  limit?: number
}

export type LxSearchResultItem = {
  name: string
  singer: string
  album?: string
  source: LxSourceId
  songmid: string | number
  hash?: string
  interval?: string | number
  img?: string
  albumId?: string | number
}

export type LxSearchResult = {
  list: LxSearchResultItem[]
  total?: number
  limit?: number
  page?: number
  source?: LxSourceId
}

export type LxScriptRequestAction = 'musicUrl' | 'lyric' | 'pic' | 'search'

export type LxScriptRequestPayload =
  | {
      source: LxSourceId
      action: 'musicUrl' | 'lyric' | 'pic'
      info: {
        type?: LxQuality
        musicInfo: LxMusicInfo
      }
    }
  | {
      source: LxSourceId
      action: 'search'
      info: LxSearchInfo
    }

export type LxScriptRequestResult =
  | string
  | {
      url?: string
      data?: string | { url?: string }
      lyric?: string
      pic?: string
    }

export type LxInitedData = {
  openDevTools?: boolean
  sources: Record<string, LxSourceConfig>
}

export type LxMusicSourceScriptDraft = LxScriptInfo & {
  fileName: string
  rawScript: string
  sources?: string[]
}

export type ImportedLxMusicSource = LxScriptInfo & {
  id: string
  fileName: string
  sources?: string[]
  createdAt: number
  updatedAt: number
}

export type LxHttpRequestOptions = RequestInit & {
  timeout?: number
  form?: Record<string, string | number | boolean | null | undefined>
  formData?: Record<string, string | Blob>
}

export type LxHttpRequestResponse = {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  bytes: number
  raw: Uint8Array
  body: unknown
}

export type KwLyricDecodePayload = {
  lrcBase64: string
  isGetLyricx?: boolean
}

const UNKNOWN_SOURCE_NAME = '未知音源'

function readTag(header: string, tag: string) {
  const match = header.match(new RegExp(`@${tag}\\s+(.+?)(?:\\r?\\n|\\*\\/)`))
  const value = match?.[1]?.trim().replace(/^\*\s*/, '')

  return value || undefined
}

export function parseLxScriptInfo(script: string): LxScriptInfo {
  const headerMatch = script.match(/^\s*\/\*+[\s\S]*?\*\//)
  if (!headerMatch) {
    return { name: UNKNOWN_SOURCE_NAME }
  }

  const header = headerMatch[0]

  const info: LxScriptInfo = {
    name: readTag(header, 'name') || UNKNOWN_SOURCE_NAME,
  }

  const description = readTag(header, 'description')
  const version = readTag(header, 'version')
  const author = readTag(header, 'author')
  const homepage = readTag(header, 'homepage')

  if (description) info.description = description
  if (version) info.version = version
  if (author) info.author = author
  if (homepage) info.homepage = homepage

  return info
}

export function isProbablyLxMusicSourceScript(script: string) {
  const source = typeof script === 'string' ? script : ''
  const hasHeaderComment = /^\/\*+[\s\S]*?@name[\s\S]*?\*\//.test(source)
  const hasLxApi = source.includes('lx.on(') || source.includes('lx.send(')

  return hasHeaderComment || hasLxApi
}

function readOptionalString(
  value: Record<string, unknown>,
  key: keyof LxScriptInfo
) {
  const rawValue = value[key]

  return typeof rawValue === 'string' && rawValue.trim()
    ? rawValue.trim()
    : undefined
}

function normalizeSourceKeys(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const sources = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)

  return sources.length ? [...new Set(sources)] : undefined
}

export function normalizeImportedLxMusicSource(
  value: unknown
): ImportedLxMusicSource | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const fileName =
    typeof record.fileName === 'string' ? record.fileName.trim() : ''

  if (!id || !name || !fileName) {
    return null
  }

  const source: ImportedLxMusicSource = {
    id,
    name,
    fileName,
    createdAt:
      typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
    updatedAt:
      typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
  }

  const description = readOptionalString(record, 'description')
  const version = readOptionalString(record, 'version')
  const author = readOptionalString(record, 'author')
  const homepage = readOptionalString(record, 'homepage')
  const sources = normalizeSourceKeys(record.sources)

  if (description) source.description = description
  if (version) source.version = version
  if (author) source.author = author
  if (homepage) source.homepage = homepage
  if (sources) source.sources = sources

  return source
}

export function normalizeImportedLxMusicSources(
  value: unknown,
  legacyScript?: unknown
): ImportedLxMusicSource[] {
  const sources = Array.isArray(value)
    ? value
        .map(item => normalizeImportedLxMusicSource(item))
        .filter((item): item is ImportedLxMusicSource => Boolean(item))
    : []

  if (sources.length) {
    return sources
  }

  const normalizedLegacyScript = normalizeImportedLxMusicSource(legacyScript)

  return normalizedLegacyScript ? [normalizedLegacyScript] : []
}

export function resolveActiveLxMusicSourceScriptId(
  activeId: unknown,
  scripts: ImportedLxMusicSource[]
): string | null {
  if (!scripts.length) {
    return null
  }

  if (
    typeof activeId === 'string' &&
    scripts.some(script => script.id === activeId)
  ) {
    return activeId
  }

  return scripts[0].id
}
