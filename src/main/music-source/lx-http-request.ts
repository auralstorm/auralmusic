import { Buffer } from 'node:buffer'
import http from 'node:http'
import https from 'node:https'
import type * as Electron from 'electron'
import type {
  LxHttpRequestOptions,
  LxHttpRequestResponse,
} from '../../shared/lx-music-source'

type ElectronNet = typeof Electron.net

/** LX 脚本期望 body 尽量是 JSON；解析失败时回退文本，保留兼容性。 */
function parseLxHttpBody(rawBody: Buffer) {
  try {
    return JSON.parse(rawBody.toString('utf8')) as unknown
  } catch {
    return rawBody.toString('utf8')
  }
}

/** 兼容 Headers、元组数组和普通对象三种 header 传入形态。 */
function normalizeOutgoingHeaders(headers: LxHttpRequestOptions['headers']) {
  const result: Record<string, string | string[]> = {}

  if (!headers) {
    return result
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[key] = value
    }
    return result
  }

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string' || Array.isArray(value)) {
      result[key] = value
    }
  }

  return result
}

function hasHeader(headers: Record<string, string | string[]>, target: string) {
  return Object.keys(headers).some(key => key.toLowerCase() === target)
}

/** form 请求自动补 content-type，调用方显式传入时不覆盖。 */
function normalizeRequestHeaders(options: LxHttpRequestOptions) {
  const headers = normalizeOutgoingHeaders(options.headers)

  if (options.form && !hasHeader(headers, 'content-type')) {
    headers['content-type'] = 'application/x-www-form-urlencoded'
  }

  return headers
}

/** 将 Node/Electron 返回的多值响应头规整成 renderer 易消费的字符串字典。 */
function normalizeIncomingHeaders(
  headers: Record<string, string | string[] | undefined>
) {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue
    }

    result[key] = Array.isArray(value) ? value.join(', ') : value
  }

  return result
}

/** 将 form 对象编码成 application/x-www-form-urlencoded 请求体。 */
function encodeFormBody(form: LxHttpRequestOptions['form']) {
  if (!form) {
    return null
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(form)) {
    if (value == null) {
      continue
    }

    params.append(key, String(value))
  }

  return params.toString()
}

/** 将 LX 请求体转换成 Electron net/Node http 可写入的类型。 */
function toWritableRequestBody(options: LxHttpRequestOptions) {
  const formBody = encodeFormBody(options.form)
  if (formBody) {
    return formBody
  }

  const body = options.body
  if (body == null) {
    return null
  }

  if (typeof body === 'string') {
    return body
  }

  if (body instanceof URLSearchParams) {
    return body.toString()
  }

  if (body instanceof ArrayBuffer) {
    return Buffer.from(body)
  }

  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
  }

  throw new Error('Unsupported LX HTTP request body type')
}

/** Node http.request 接收 string|string[] header，这里保留已归一化结果的结构。 */
function normalizeNodeHeaders(headers: Record<string, string | string[]>) {
  const normalized = headers
  const result: Record<string, string | string[]> = {}

  for (const [key, value] of Object.entries(normalized)) {
    result[key] = value
  }

  return result
}

/** 处理相对重定向地址，和浏览器 URL 解析规则保持一致。 */
function resolveRedirectUrl(location: string, baseUrl: string) {
  return new URL(location, baseUrl).toString()
}

/** 构造统一的 LX HTTP 响应对象，供 Electron net 和 Node fallback 共用。 */
export function createLxHttpRequestResponse(
  statusCode: number,
  statusMessage: string,
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer | string
): LxHttpRequestResponse {
  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody)

  return {
    statusCode,
    statusMessage,
    headers: normalizeIncomingHeaders(headers),
    bytes: raw.byteLength,
    raw,
    body: parseLxHttpBody(raw),
  }
}

/**
 * 使用 Electron net 发送 LX 请求。
 *
 * 优先走 Chromium 网络栈，可继承 Electron 的代理、证书和网络环境；超时被限制在 60 秒内，
 * 防止音源脚本传入过大的 timeout 挂住主进程请求。
 */
export async function requestLxHttpWithElectronNet(
  net: ElectronNet,
  url: string,
  options: LxHttpRequestOptions = {}
): Promise<LxHttpRequestResponse> {
  return new Promise((resolve, reject) => {
    let settled = false
    let timeoutId: NodeJS.Timeout | null = null
    const request = net.request({
      url,
      method: options.method || 'GET',
      headers: normalizeRequestHeaders(options),
      redirect: 'follow',
    })

    const settleReject = (error: Error) => {
      if (settled) {
        return
      }

      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      reject(error)
    }

    const settleResolve = (response: LxHttpRequestResponse) => {
      if (settled) {
        return
      }

      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      resolve(response)
    }

    if (typeof options.timeout === 'number' && options.timeout > 0) {
      timeoutId = setTimeout(
        () => {
          request.abort()
          settleReject(new Error('LX HTTP request timed out'))
        },
        Math.min(options.timeout, 60_000)
      )
    }

    request.on('response', response => {
      const chunks: Buffer[] = []

      response.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      response.on('end', () => {
        settleResolve(
          createLxHttpRequestResponse(
            response.statusCode,
            response.statusMessage || '',
            response.headers,
            Buffer.concat(chunks)
          )
        )
      })
      response.on('error', settleReject)
      response.on('aborted', () => {
        settleReject(new Error('LX HTTP response aborted'))
      })
    })
    request.on('error', settleReject)
    request.on('abort', () => {
      settleReject(new Error('LX HTTP request aborted'))
    })

    try {
      request.end(toWritableRequestBody(options) ?? undefined)
    } catch (error) {
      settleReject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

/**
 * 使用 Node http/https 发送 LX 请求。
 *
 * 作为 electron.net 失败后的兼容兜底，并手动处理最多 5 次重定向。
 */
export async function requestLxHttpWithNode(
  url: string,
  options: LxHttpRequestOptions = {},
  redirectCount = 0
): Promise<LxHttpRequestResponse> {
  return new Promise((resolve, reject) => {
    let settled = false
    let timeoutId: NodeJS.Timeout | null = null
    const requestUrl = new URL(url)
    const transport = requestUrl.protocol === 'https:' ? https : http
    const body = toWritableRequestBody(options)
    const request = transport.request(
      requestUrl,
      {
        method: options.method || 'GET',
        headers: normalizeNodeHeaders(normalizeRequestHeaders(options)),
      },
      response => {
        const chunks: Buffer[] = []

        response.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        response.on('end', () => {
          const redirectLocation = response.headers.location
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            redirectLocation &&
            redirectCount < 5
          ) {
            settled = true
            if (timeoutId) {
              clearTimeout(timeoutId)
            }
            resolve(
              requestLxHttpWithNode(
                resolveRedirectUrl(redirectLocation, url),
                options,
                redirectCount + 1
              )
            )
            return
          }

          settleResolve(
            createLxHttpRequestResponse(
              response.statusCode || 0,
              response.statusMessage || '',
              response.headers,
              Buffer.concat(chunks)
            )
          )
        })
        response.on('error', settleReject)
        response.on('aborted', () => {
          settleReject(new Error('LX HTTP response aborted'))
        })
      }
    )

    const settleReject = (error: Error) => {
      if (settled) {
        return
      }

      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      reject(error)
    }

    const settleResolve = (response: LxHttpRequestResponse) => {
      if (settled) {
        return
      }

      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      resolve(response)
    }

    if (typeof options.timeout === 'number' && options.timeout > 0) {
      timeoutId = setTimeout(
        () => {
          request.destroy(new Error('LX HTTP request timed out'))
        },
        Math.min(options.timeout, 60_000)
      )
    }

    request.on('error', settleReject)

    try {
      request.end(body ?? undefined)
    } catch (error) {
      settleReject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}
