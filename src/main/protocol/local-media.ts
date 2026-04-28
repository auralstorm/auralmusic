import electron from 'electron'
import { createReadStream } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import {
  LOCAL_MEDIA_PROTOCOL,
  parseLocalMediaUrl,
} from '../../shared/local-media.ts'
import { createMainLogger } from '../logging/logger.ts'

let schemeRegistered = false
let handlerRegistered = false
const localMediaLogger = createMainLogger('local-media')

type LocalMediaRange = {
  start: number
  end: number
  contentLength: number
  contentRange: string
}

type ResolveLocalMediaHeadersOptions = {
  fileSize: number
  fileExtension: string
  fileHeader?: Uint8Array
  range?: LocalMediaRange
}

const LOCAL_MEDIA_MIME_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.avif': 'image/avif',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
}

/** 文件扩展名统一小写，避免 Windows 路径大小写影响 MIME 判断。 */
function normalizeLocalMediaExtension(fileExtension: string) {
  return fileExtension.trim().toLowerCase()
}

/** 检查文件头魔数，用于扩展名不可靠时推断音频类型。 */
function matchesBytes(bytes: Uint8Array, offset: number, signature: number[]) {
  return signature.every((value, index) => bytes[offset + index] === value)
}

/** 根据音频文件头推断 MIME，解决缓存文件扩展名为 .bin 时播放器无法识别的问题。 */
function inferLocalMediaContentTypeFromHeader(fileHeader?: Uint8Array) {
  if (!fileHeader?.length) {
    return null
  }

  if (matchesBytes(fileHeader, 0, [0x49, 0x44, 0x33])) {
    return 'audio/mpeg'
  }

  if (matchesBytes(fileHeader, 0, [0x66, 0x4c, 0x61, 0x43])) {
    return 'audio/flac'
  }

  if (matchesBytes(fileHeader, 0, [0x4f, 0x67, 0x67, 0x53])) {
    return 'audio/ogg'
  }

  if (
    matchesBytes(fileHeader, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matchesBytes(fileHeader, 8, [0x57, 0x41, 0x56, 0x45])
  ) {
    return 'audio/wav'
  }

  if (
    matchesBytes(fileHeader, 4, [0x66, 0x74, 0x79, 0x70]) ||
    matchesBytes(fileHeader, 0, [0x66, 0x74, 0x79, 0x70])
  ) {
    return 'audio/mp4'
  }

  if (fileHeader[0] === 0xff && (fileHeader[1] & 0xf6) === 0xf0) {
    return 'audio/aac'
  }

  if (fileHeader[0] === 0xff && (fileHeader[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg'
  }

  return null
}

/** 解析本地媒体 MIME，优先扩展名，失败时回退文件头魔数。 */
export function inferLocalMediaContentType(
  fileExtension: string,
  fileHeader?: Uint8Array
) {
  return (
    LOCAL_MEDIA_MIME_TYPES[normalizeLocalMediaExtension(fileExtension)] ||
    inferLocalMediaContentTypeFromHeader(fileHeader) ||
    'application/octet-stream'
  )
}

/** 只读取文件头少量字节，避免为 MIME 推断把大音频文件读入内存。 */
async function readLocalMediaHeader(targetPath: string, maxBytes = 32) {
  const handle = await open(targetPath, 'r')

  try {
    const buffer = Buffer.allocUnsafe(maxBytes)
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0)
    return new Uint8Array(buffer.subarray(0, bytesRead))
  } finally {
    await handle.close()
  }
}

/** Range 不满足时返回标准 416 响应头，让 audio 标签能正确降级/重试。 */
function createUnsatisfiedRangeHeaders(fileSize: number) {
  return {
    'accept-ranges': 'bytes',
    'content-range': `bytes */${Math.max(0, fileSize)}`,
  }
}

/**
 * 解析 HTTP Range 请求。
 *
 * audio 标签拖动进度时会频繁发 Range；这里严格校验边界，避免越界读取本地文件。
 */
export function resolveLocalMediaRangeRequest(
  rangeHeader: string | null | undefined,
  fileSize: number
): LocalMediaRange | null {
  if (
    !rangeHeader?.trim() ||
    !Number.isFinite(fileSize) ||
    Math.floor(fileSize) <= 0
  ) {
    return null
  }

  const normalizedSize = Math.floor(fileSize)
  const [unit, rawValue] = rangeHeader.trim().split('=')
  if (unit !== 'bytes' || !rawValue) {
    return null
  }

  const [startToken = '', endToken = ''] =
    rawValue.split(',')[0]?.split('-') ?? []

  let start: number
  let end = normalizedSize - 1

  if (!startToken && !endToken) {
    return null
  }

  if (!startToken) {
    const suffixLength = Number.parseInt(endToken, 10)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null
    }

    start = Math.max(0, normalizedSize - suffixLength)
  } else {
    start = Number.parseInt(startToken, 10)
    if (!Number.isFinite(start) || start < 0 || start >= normalizedSize) {
      return null
    }

    if (endToken) {
      end = Number.parseInt(endToken, 10)
      if (!Number.isFinite(end)) {
        return null
      }
    }
  }

  end = Math.min(end, normalizedSize - 1)
  if (end < start) {
    return null
  }

  return {
    start,
    end,
    contentLength: end - start + 1,
    contentRange: `bytes ${start}-${end}/${normalizedSize}`,
  }
}

/** 生成本地媒体响应头，包含 CORS 和 Range 能力，供 audio/img/fetch 统一使用。 */
export function resolveLocalMediaResponseHeaders(
  options: ResolveLocalMediaHeadersOptions
) {
  const headers: Record<string, string> = {
    'accept-ranges': 'bytes',
    'access-control-allow-headers': 'Range',
    'access-control-allow-methods': 'GET, HEAD',
    'access-control-allow-origin': '*',
    'content-length': String(
      options.range?.contentLength ?? Math.max(0, Math.floor(options.fileSize))
    ),
    'content-type': inferLocalMediaContentType(
      options.fileExtension,
      options.fileHeader
    ),
  }

  if (options.range) {
    headers['content-range'] = options.range.contentRange
  }

  return headers
}

/** 在 app ready 前注册自定义协议权限，确保协议可被 fetch/audio 安全使用。 */
export function registerLocalMediaScheme() {
  if (schemeRegistered) {
    return
  }

  electron.protocol.registerSchemesAsPrivileged([
    {
      scheme: LOCAL_MEDIA_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])

  schemeRegistered = true
}

/**
 * 注册 local-media:// 协议处理器。
 *
 * 协议 URL 只能解析到共享工具生成的本地路径；响应支持 HEAD、Range 和流式读取，
 * 避免 renderer 直接使用 file:// 暴露本机路径。
 */
export function registerLocalMediaProtocol() {
  if (handlerRegistered) {
    return
  }

  electron.protocol.handle(LOCAL_MEDIA_PROTOCOL, async request => {
    const targetPath = parseLocalMediaUrl(request.url)

    if (!targetPath) {
      return new Response('Invalid local media url.', { status: 400 })
    }

    try {
      const fileStats = await stat(targetPath)
      const fileSize = fileStats.size
      const fileHeader = await readLocalMediaHeader(targetPath)
      const rangeHeader = request.headers.get('range')
      const wantsByteRange = rangeHeader?.trim().startsWith('bytes=') ?? false
      const range = resolveLocalMediaRangeRequest(rangeHeader, fileSize)

      if (wantsByteRange && !range) {
        // 明确请求了 Range 但范围非法时返回 416，符合浏览器媒体加载预期。
        return new Response(null, {
          status: 416,
          headers: createUnsatisfiedRangeHeaders(fileSize),
        })
      }

      const headers = resolveLocalMediaResponseHeaders({
        fileSize,
        fileExtension: path.extname(targetPath),
        fileHeader,
        range: range ?? undefined,
      })

      if (request.method === 'HEAD') {
        // HEAD 只返回元信息，不打开文件流，供浏览器探测资源能力。
        return new Response(null, {
          status: range ? 206 : 200,
          headers,
        })
      }

      const stream = createReadStream(
        targetPath,
        range
          ? {
              start: range.start,
              end: range.end,
            }
          : undefined
      )
      const body = Readable.toWeb(stream) as ReadableStream

      return new Response(body, {
        status: range ? 206 : 200,
        headers,
      })
    } catch (error) {
      localMediaLogger.error('Failed to resolve local media request', {
        error,
        targetPath,
      })
      return new Response('Local media file not found.', { status: 404 })
    }
  })

  handlerRegistered = true
}
