/** LX 脚本头部声明出的基础元信息。 */
export type LxScriptInfo = {
  name: string
  description?: string
  version?: string
  author?: string
  homepage?: string
  rawScript?: string
}

/** LX 脚本支持的音质枚举。 */
export type LxQuality = '128k' | '320k' | 'flac' | 'flac24bit'

/** LX 平台 key，wy 表示网易，其它 key 表示外部平台。 */
export const LX_SOURCE_KEYS = ['kw', 'kg', 'tx', 'wy', 'mg'] as const

export type LxSourceKey = (typeof LX_SOURCE_KEYS)[number]
export type LxSourceId = string
export type LxSourceAction =
  | 'musicUrl'
  | 'lyric'
  | 'pic'
  | 'search'
  | 'musicSearch'

/** LX 脚本初始化后暴露的单个平台配置。 */
export type LxSourceConfig = {
  name: string
  type: 'music'
  actions: LxSourceAction[]
  qualitys: LxQuality[]
}

/** 传给 LX 脚本的歌曲信息，字段兼容多个平台命名。 */
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

/** LX 搜索请求参数。 */
export type LxSearchInfo = {
  keyword: string
  page?: number
  limit?: number
}

/** LX 搜索结果单项，后续会转换成应用播放曲目。 */
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

/** LX 搜索返回结构。 */
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

/** LX 脚本 action 的返回值兼容字符串和对象两种形式。 */
export type LxScriptRequestResult =
  | string
  | {
      url?: string
      data?: string | { url?: string }
      lyric?: string
      pic?: string
    }

/** LX 脚本初始化完成后返回的数据。 */
export type LxInitedData = {
  openDevTools?: boolean
  sources: Record<string, LxSourceConfig>
}

/** 待导入的 LX 脚本草稿，包含原始脚本文本。 */
export type LxMusicSourceScriptDraft = LxScriptInfo & {
  fileName: string
  rawScript: string
  sources?: string[]
}

/** 已保存并登记到配置中的 LX 音源脚本。 */
export type ImportedLxMusicSource = LxScriptInfo & {
  id: string
  fileName: string
  sources?: string[]
  createdAt: number
  updatedAt: number
}

/** LX HTTP 代理请求参数，form 会在主进程编码为 urlencoded body。 */
export type LxHttpRequestOptions = RequestInit & {
  timeout?: number
  form?: Record<string, string | number | boolean | null | undefined>
  formData?: Record<string, string | Blob>
}

/** LX HTTP 代理统一响应结构。 */
export type LxHttpRequestResponse = {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  bytes: number
  raw: Uint8Array
  body: unknown
}

/** 酷我歌词解码 payload。 */
export type KwLyricDecodePayload = {
  lrcBase64: string
  isGetLyricx?: boolean
}

const UNKNOWN_SOURCE_NAME = '未知音源'

/** 从 LX 脚本头部注释中读取 @tag 值。 */
function readTag(header: string, tag: string) {
  const match = header.match(new RegExp(`@${tag}\\s+(.+?)(?:\\r?\\n|\\*\\/)`))
  const value = match?.[1]?.trim().replace(/^\*\s*/, '')

  return value || undefined
}

/** 解析 LX 脚本头部元信息，缺失 @name 时使用兜底名称。 */
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

/** 粗略判断文本是否像 LX 音源脚本，用于导入前的轻量校验。 */
export function isProbablyLxMusicSourceScript(script: string) {
  const source = typeof script === 'string' ? script : ''
  const hasHeaderComment = /^\/\*+[\s\S]*?@name[\s\S]*?\*\//.test(source)
  const hasLxApi = source.includes('lx.on(') || source.includes('lx.send(')

  return hasHeaderComment || hasLxApi
}

/** 读取可选字符串字段，空字符串视为缺失。 */
function readOptionalString(
  value: Record<string, unknown>,
  key: keyof LxScriptInfo
) {
  const rawValue = value[key]

  return typeof rawValue === 'string' && rawValue.trim()
    ? rawValue.trim()
    : undefined
}

/** 归一化 LX 脚本支持的平台 key 列表。 */
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

/** 归一化单个已导入 LX 音源脚本记录，非法记录返回 null。 */
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

/** 归一化 LX 音源脚本列表，并兼容旧版本单脚本字段。 */
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

/** 解析当前激活脚本 id；配置值失效时回退到列表第一项。 */
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
