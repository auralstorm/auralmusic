import type {
  LxInitedData,
  LxMusicInfo,
  LxQuality,
  LxScriptInfo,
  LxScriptRequestPayload,
  LxScriptRequestResult,
  LxSourceKey,
} from '../../../shared/lx-music-source.ts'
import { parseLxScriptInfo } from '../../../shared/lx-music-source.ts'

type WorkerInitializeMessage = {
  type: 'initialize'
  script: string
  scriptInfo: LxScriptInfo
}

type WorkerHttpResponseMessage = {
  type: 'http-response'
  requestId: string
  response: unknown
  body: unknown
  error?: string
}

type WorkerInvokeRequestMessage = {
  type: 'invoke-request'
  callId: string
  payload: LxScriptRequestPayload
}

type RunnerToWorkerMessage =
  | WorkerInitializeMessage
  | WorkerHttpResponseMessage
  | WorkerInvokeRequestMessage

type WorkerInitializedMessage = {
  type: 'initialized'
  data: LxInitedData
}

type WorkerScriptErrorMessage = {
  type: 'script-error'
  message: string
}

type WorkerHttpRequestMessage = {
  type: 'http-request'
  requestId: string
  url: string
  options: RequestInit
}

type WorkerLogMessage = {
  type: 'log'
  level: 'log' | 'warn' | 'error' | 'info'
  args: unknown[]
}

type WorkerInvokeResultMessage = {
  type: 'invoke-result'
  callId: string
  result: LxScriptRequestResult
}

type WorkerInvokeErrorMessage = {
  type: 'invoke-error'
  callId: string
  message: string
}

type WorkerToRunnerMessage =
  | WorkerInitializedMessage
  | WorkerScriptErrorMessage
  | WorkerHttpRequestMessage
  | WorkerLogMessage
  | WorkerInvokeResultMessage
  | WorkerInvokeErrorMessage

const LX_QUALITY_FALLBACK_ORDER: LxQuality[] = [
  'flac24bit',
  'flac',
  '320k',
  '128k',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
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
  private readonly scriptInfo: LxScriptInfo
  private worker: Worker | null = null
  private initialized = false
  private sources: LxInitedData['sources'] = {}
  private initPromise: Promise<LxInitedData> | null = null
  private initResolver: ((data: LxInitedData) => void) | null = null
  private initRejecter: ((error: Error) => void) | null = null
  private initTimeoutId: number | null = null
  private callCounter = 0
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
      const response = await window.electronMusicSource.lxHttpRequest(
        message.url,
        message.options
      )

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
    source: LxSourceKey,
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

    const url = normalizeLxScriptRequestResultToUrl(result)
    if (!url) {
      throw new Error('LX script did not return a playable URL')
    }

    return url
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
