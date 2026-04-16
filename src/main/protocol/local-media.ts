import electron from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import {
  LOCAL_MEDIA_PROTOCOL,
  parseLocalMediaUrl,
} from '../../shared/local-media.ts'

let schemeRegistered = false
let handlerRegistered = false

type LocalMediaRange = {
  start: number
  end: number
  contentLength: number
  contentRange: string
}

type ResolveLocalMediaHeadersOptions = {
  fileSize: number
  fileExtension: string
  range?: LocalMediaRange
}

const LOCAL_MEDIA_MIME_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

function normalizeLocalMediaExtension(fileExtension: string) {
  return fileExtension.trim().toLowerCase()
}

function createUnsatisfiedRangeHeaders(fileSize: number) {
  return {
    'accept-ranges': 'bytes',
    'content-range': `bytes */${Math.max(0, fileSize)}`,
  }
}

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

export function resolveLocalMediaResponseHeaders(
  options: ResolveLocalMediaHeadersOptions
) {
  const headers: Record<string, string> = {
    'accept-ranges': 'bytes',
    'content-length': String(
      options.range?.contentLength ?? Math.max(0, Math.floor(options.fileSize))
    ),
    'content-type':
      LOCAL_MEDIA_MIME_TYPES[
        normalizeLocalMediaExtension(options.fileExtension)
      ] || 'application/octet-stream',
  }

  if (options.range) {
    headers['content-range'] = options.range.contentRange
  }

  return headers
}

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
      const rangeHeader = request.headers.get('range')
      const wantsByteRange = rangeHeader?.trim().startsWith('bytes=') ?? false
      const range = resolveLocalMediaRangeRequest(rangeHeader, fileSize)

      if (wantsByteRange && !range) {
        return new Response(null, {
          status: 416,
          headers: createUnsatisfiedRangeHeaders(fileSize),
        })
      }

      const headers = resolveLocalMediaResponseHeaders({
        fileSize,
        fileExtension: path.extname(targetPath),
        range: range ?? undefined,
      })

      if (request.method === 'HEAD') {
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

      return new Response(Readable.toWeb(stream) as BodyInit, {
        status: range ? 206 : 200,
        headers,
      })
    } catch (error) {
      console.error('Failed to resolve local media request:', error)
      return new Response('Local media file not found.', { status: 404 })
    }
  })

  handlerRegistered = true
}
