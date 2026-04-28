import type {
  LxInitedData,
  LxHttpRequestOptions,
  LxMusicInfo,
  LxQuality,
  LxSourceId,
  LxSearchResultItem,
  LxSearchResult,
  LxScriptRequestPayload,
  LxScriptRequestResult,
} from '../../../shared/lx-music-source.ts'
import { parseLxScriptInfo } from '../../../shared/lx-music-source.ts'
import type {
  RunnerToWorkerMessage,
  WorkerHttpRequestMessage,
  WorkerToRunnerMessage,
} from '@/types/core'
import { createRendererLogger } from '../../lib/logger.ts'
import { readLogUrlHost } from '../../../shared/logging.ts'

const LX_QUALITY_FALLBACK_ORDER: LxQuality[] = [
  'flac24bit',
  'flac',
  '320k',
  '128k',
]
const lxRunnerLogger = createRendererLogger('lx-source-runner')

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function normalizeLxSearchResult(
  result: unknown,
  fallbackSource?: LxSourceId
): LxSearchResult {
  const emptyResult = {
    list: [],
    total: 0,
    limit: 0,
    page: 1,
    source: fallbackSource,
  }

  if (!isRecord(result)) {
    return emptyResult
  }

  if (Array.isArray(result.list)) {
    // 标准 LX 脚本直接返回 list；保持原始条目，避免破坏第三方脚本扩展字段。
    return {
      list: result.list,
      total:
        typeof result.total === 'number' ? result.total : result.list.length,
      limit:
        typeof result.limit === 'number' ? result.limit : result.list.length,
      page: typeof result.page === 'number' ? result.page : 1,
      source:
        typeof result.source === 'string' ? result.source : fallbackSource,
    }
  }

  const nestedData = isRecord(result.data) ? result.data : null
  const nestedSongs = Array.isArray(nestedData?.songs) ? nestedData.songs : null
  if (!nestedSongs) {
    return emptyResult
  }

  // 兼容部分平台脚本直接透传搜索接口响应，统一归一化成播放器可消费的 LX 列表结构。
  const list = nestedSongs.flatMap((song): LxSearchResultItem[] => {
    if (!isRecord(song)) {
      return []
    }

    const songmid =
      song.hash ?? song.songmid ?? song.contentId ?? song.copyrightId ?? song.id

    if (typeof songmid !== 'string' && typeof songmid !== 'number') {
      return []
    }

    return [
      {
        name:
          typeof song.title === 'string' && song.title.trim()
            ? song.title.trim()
            : typeof song.name === 'string' && song.name.trim()
              ? song.name.trim()
              : '未知歌曲',
        singer:
          typeof song.singer === 'string' && song.singer.trim()
            ? song.singer.trim()
            : typeof song.author === 'string' && song.author.trim()
              ? song.author.trim()
              : '未知歌手',
        album:
          typeof song.album === 'string' && song.album.trim()
            ? song.album.trim()
            : undefined,
        source: fallbackSource ?? 'wy',
        songmid,
        hash:
          typeof song.hash === 'string' || typeof song.hash === 'number'
            ? String(song.hash)
            : undefined,
        interval:
          typeof song.interval === 'string' || typeof song.interval === 'number'
            ? song.interval
            : typeof song.duration === 'string' ||
                typeof song.duration === 'number'
              ? song.duration
              : undefined,
        img:
          typeof song.pic === 'string' && song.pic.trim()
            ? song.pic.trim()
            : typeof song.cover === 'string' && song.cover.trim()
              ? song.cover.trim()
              : typeof song.img === 'string' && song.img.trim()
                ? song.img.trim()
                : undefined,
        albumId:
          typeof song.albumId === 'string' || typeof song.albumId === 'number'
            ? song.albumId
            : undefined,
      },
    ]
  })

  return {
    list,
    total:
      typeof nestedData?.total_count === 'number'
        ? nestedData.total_count
        : typeof nestedData?.display_count === 'number'
          ? nestedData.display_count
          : list.length,
    limit:
      typeof nestedData?.display_count === 'number'
        ? nestedData.display_count
        : list.length,
    page:
      typeof nestedData?.page === 'number'
        ? nestedData.page
        : typeof result.page === 'number'
          ? result.page
          : 1,
    source: fallbackSource,
  }
}

export function normalizeLxScriptRequestResultToUrl(result: unknown) {
  if (typeof result === 'string' && result.trim()) {
    return result
  }

  if (!isRecord(result)) {
    return null
  }

  if (typeof result.url === 'string' && result.url.trim()) {
    return result.url
  }

  if (typeof result.data === 'string' && result.data.trim()) {
    return result.data
  }

  if (isRecord(result.data) && typeof result.data.url === 'string') {
    return result.data.url.trim() || null
  }

  return null
}

export function normalizeLxScriptRequestResultToLyric(result: unknown) {
  if (typeof result === 'string' && result.trim()) {
    return result
  }

  if (!isRecord(result)) {
    return null
  }

  if (typeof result.lyric === 'string' && result.lyric.trim()) {
    return result.lyric
  }

  if (typeof result.data === 'string' && result.data.trim()) {
    return result.data
  }

  if (isRecord(result.data) && typeof result.data.lyric === 'string') {
    return result.data.lyric.trim() || null
  }

  return null
}

export function resolveLxMusicUrlResult(
  result: unknown,
  fallbackUrl?: string | null
) {
  return (
    normalizeLxScriptRequestResultToUrl(result) || fallbackUrl?.trim() || null
  )
}

export function readLxResponseBodyUrl(body: unknown) {
  return isRecord(body) && typeof body.url === 'string'
    ? body.url.trim() || null
    : null
}

export function createLxFetchRequestOptions(
  options: LxHttpRequestOptions = {},
  signal: AbortSignal
): RequestInit {
  return {
    method: options.method || 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...(isRecord(options.headers) ? options.headers : {}),
    },
    signal,
    mode: 'cors',
    credentials: 'omit',
    ...(options.body ? { body: options.body } : {}),
  }
}

async function requestLxHttpWithRendererFetch(
  url: string,
  options: LxHttpRequestOptions = {},
  timeoutMs = 30000
) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(
      url,
      createLxFetchRequestOptions(options, controller.signal)
    )
    const rawBody = await response.text()
    const raw = new TextEncoder().encode(rawBody)
    let body: unknown = rawBody

    try {
      body = JSON.parse(rawBody)
    } catch {
      // 非 JSON 响应保留原文，部分 LX 脚本会直接从文本里提取播放地址。
    }

    return {
      statusCode: response.status,
      statusMessage: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bytes: raw.byteLength,
      raw,
      body,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function selectSupportedLxQuality(
  supportedQualities: LxQuality[],
  requestedQuality?: LxQuality
) {
  if (!supportedQualities.length) {
    return null
  }

  if (requestedQuality && supportedQualities.includes(requestedQuality)) {
    return requestedQuality
  }

  for (const quality of LX_QUALITY_FALLBACK_ORDER) {
    if (supportedQualities.includes(quality)) {
      return quality
    }
  }

  return null
}

export class LxMusicSourceRunner {
  private readonly script: string
  private readonly scriptInfo: ReturnType<typeof parseLxScriptInfo>
  private worker: Worker | null = null
  private initialized = false
  private sources: LxInitedData['sources'] = {}
  private initPromise: Promise<LxInitedData> | null = null
  private initResolver: ((data: LxInitedData) => void) | null = null
  private initRejecter: ((error: Error) => void) | null = null
  private initTimeoutId: number | null = null
  private callCounter = 0
  private lastMusicUrl: string | null = null
  private pendingInvocations = new Map<
    string,
    {
      resolve: (result: LxScriptRequestResult) => void
      reject: (error: Error) => void
      timeoutId: number
    }
  >()

  constructor(script: string) {
    this.script = script
    this.scriptInfo = parseLxScriptInfo(script)
  }

  getScriptInfo() {
    return this.scriptInfo
  }

  matchesScript(script: string) {
    return this.script === script
  }

  isInitialized() {
    return this.initialized
  }

  getSources() {
    return this.sources
  }

  private ensureWorker() {
    if (this.worker) {
      return this.worker
    }

    const worker = new Worker(
      new URL('./workers/lxScriptSandbox.worker.ts', import.meta.url),
      { type: 'module' }
    )

    // 第三方 LX 脚本隔离在 worker 内执行，主线程只负责 HTTP 代理和结果归一化。
    worker.onmessage = (event: MessageEvent<WorkerToRunnerMessage>) => {
      void this.handleWorkerMessage(event.data)
    }
    worker.onerror = event => {
      const error = new Error(event.message || 'LX script worker error')
      this.rejectInitialization(error)
      this.rejectAllInvocations(error)
    }

    this.worker = worker
    return worker
  }

  private postToWorker(message: RunnerToWorkerMessage) {
    this.ensureWorker().postMessage(message)
  }

  private clearInitState() {
    this.initResolver = null
    this.initRejecter = null

    if (this.initTimeoutId) {
      window.clearTimeout(this.initTimeoutId)
      this.initTimeoutId = null
    }
  }

  private clearPendingInvocation(callId: string) {
    const pendingInvocation = this.pendingInvocations.get(callId)
    if (!pendingInvocation) {
      return null
    }

    window.clearTimeout(pendingInvocation.timeoutId)
    this.pendingInvocations.delete(callId)

    return pendingInvocation
  }

  private rejectAllInvocations(error: Error) {
    for (const [
      callId,
      pendingInvocation,
    ] of this.pendingInvocations.entries()) {
      window.clearTimeout(pendingInvocation.timeoutId)
      pendingInvocation.reject(error)
      this.pendingInvocations.delete(callId)
    }
  }

  private resolveInitialization(data: LxInitedData) {
    this.initialized = true
    this.sources = data.sources || {}
    this.initResolver?.({ ...data, sources: this.sources })
    this.clearInitState()
  }

  private rejectInitialization(error: Error) {
    this.initRejecter?.(error)
    this.clearInitState()
    this.initPromise = null
  }

  private async handleWorkerMessage(message: WorkerToRunnerMessage) {
    switch (message.type) {
      case 'initialized':
        this.resolveInitialization(message.data)
        break
      case 'script-error':
        this.rejectInitialization(new Error(message.message))
        this.rejectAllInvocations(new Error(message.message))
        break
      case 'http-request':
        await this.handleWorkerHttpRequest(message)
        break
      case 'invoke-result': {
        const pendingInvocation = this.clearPendingInvocation(message.callId)
        pendingInvocation?.resolve(message.result)
        break
      }
      case 'invoke-error': {
        const pendingInvocation = this.clearPendingInvocation(message.callId)
        pendingInvocation?.reject(new Error(message.message))
        break
      }
      case 'log':
        console[message.level]('[LxScript]', ...message.args)
        break
      default:
        break
    }
  }

  private async handleWorkerHttpRequest(message: WorkerHttpRequestMessage) {
    try {
      let response

      try {
        response = await window.electronMusicSource.lxHttpRequest(
          message.url,
          message.options
        )
      } catch (mainProcessError) {
        lxRunnerLogger.debug(
          'main process HTTP request failed, trying renderer fetch fallback',
          {
            error: mainProcessError,
            sourceHost: readLogUrlHost(message.url),
            sourceUrl: message.url,
          }
        )
        // 主进程代理失败时降级到 renderer fetch，兼容少量只允许浏览器 CORS 路径的源。
        response = await requestLxHttpWithRendererFetch(
          message.url,
          message.options
        )
      }

      const url = readLxResponseBodyUrl(response.body)
      if (url) {
        // 部分 LX 脚本只通过 httpRequest 回包携带真实地址，后续 musicUrl 结果需要兜底读取。
        this.lastMusicUrl = url
      }

      this.postToWorker({
        type: 'http-response',
        requestId: message.requestId,
        response,
        body: response.body,
      })
    } catch (error) {
      this.postToWorker({
        type: 'http-response',
        requestId: message.requestId,
        response: null,
        body: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async invokeRequest(
    payload: LxScriptRequestPayload,
    timeoutMs = 20000
  ): Promise<LxScriptRequestResult> {
    await this.initialize()

    const callId = `lx_call_${Date.now()}_${this.callCounter++}`

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingInvocations.delete(callId)
        reject(new Error('LX script request timed out'))
      }, timeoutMs)

      // 以 callId 关联 worker 异步响应，避免多个搜索/取链请求并发时串包。
      this.pendingInvocations.set(callId, { resolve, reject, timeoutId })
      this.postToWorker({
        type: 'invoke-request',
        callId,
        payload,
      })
    })
  }

  async initialize(): Promise<LxInitedData> {
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.initialized) {
      return { sources: this.sources }
    }

    this.initPromise = new Promise<LxInitedData>((resolve, reject) => {
      this.initResolver = resolve
      this.initRejecter = reject
      this.initTimeoutId = window.setTimeout(() => {
        this.rejectInitialization(
          new Error('LX script initialization timed out')
        )
      }, 10000)
    })

    this.postToWorker({
      type: 'initialize',
      script: this.script,
      scriptInfo: this.scriptInfo,
    })

    return this.initPromise
  }

  async getMusicUrl(
    source: LxSourceId,
    musicInfo: LxMusicInfo,
    quality: LxQuality
  ) {
    await this.initialize()

    const sourceConfig = this.sources[source]
    if (!sourceConfig) {
      throw new Error(`LX script does not support source: ${source}`)
    }

    if (!sourceConfig.actions.includes('musicUrl')) {
      throw new Error(`LX source ${source} does not support musicUrl`)
    }

    const targetQuality = selectSupportedLxQuality(
      sourceConfig.qualitys,
      quality
    )
    if (!targetQuality) {
      throw new Error(`LX source ${source} has no supported quality`)
    }

    const result = await this.invokeRequest({
      source,
      action: 'musicUrl',
      info: {
        type: targetQuality,
        musicInfo,
      },
    })

    const url = resolveLxMusicUrlResult(result, this.lastMusicUrl)
    this.lastMusicUrl = null
    if (!url) {
      throw new Error('LX script did not return a playable URL')
    }

    return url
  }

  async getLyric(source: LxSourceId, musicInfo: LxMusicInfo) {
    await this.initialize()

    const sourceConfig = this.sources[source]
    if (!sourceConfig) {
      throw new Error(`LX script does not support source: ${source}`)
    }

    if (!sourceConfig.actions.includes('lyric')) {
      throw new Error(`LX source ${source} does not support lyric`)
    }

    const result = await this.invokeRequest({
      source,
      action: 'lyric',
      info: {
        musicInfo,
      },
    })

    return normalizeLxScriptRequestResultToLyric(result) ?? result
  }

  async search(source: LxSourceId, keyword: string, page = 1, limit = 20) {
    await this.initialize()

    if (!this.sources[source]) {
      throw new Error(`LX script does not support source: ${source}`)
    }

    const result = await this.invokeRequest({
      source,
      action: 'search',
      info: {
        keyword,
        page,
        limit,
      },
    })

    return normalizeLxSearchResult(result, source)
  }

  dispose() {
    this.clearInitState()
    this.rejectAllInvocations(new Error('LX runner disposed'))
    this.worker?.terminate()
    this.worker = null
    this.initPromise = null
    this.initialized = false
    this.sources = {}
    this.callCounter = 0
    this.lastMusicUrl = null
  }
}

let activeLxMusicRunner: LxMusicSourceRunner | null = null

export function getLxMusicRunner() {
  return activeLxMusicRunner
}

export function setLxMusicRunner(runner: LxMusicSourceRunner | null) {
  activeLxMusicRunner?.dispose()
  activeLxMusicRunner = runner
}

export async function initLxMusicRunner(script: string) {
  setLxMusicRunner(null)
  const runner = new LxMusicSourceRunner(script)
  await runner.initialize()
  activeLxMusicRunner = runner
  return runner
}

export async function validateLxMusicSourceScript(script: string) {
  const runner = new LxMusicSourceRunner(script)

  try {
    return await runner.initialize()
  } finally {
    runner.dispose()
  }
}
