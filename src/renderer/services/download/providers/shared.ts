import {
  getSongDownloadUrlV1 as defaultGetSongDownloadUrlV1,
  getSongUrlMatch as defaultGetSongUrlMatch,
  getSongUrlV1 as defaultGetSongUrlV1,
} from '../../../api/list.ts'
import type { DownloadSourceApiListModule } from '@/types/core'

export async function loadDefaultSongApiListModule(): Promise<DownloadSourceApiListModule> {
  return {
    getSongUrlV1: defaultGetSongUrlV1,
    getSongDownloadUrlV1: defaultGetSongDownloadUrlV1,
    getSongUrlMatch: defaultGetSongUrlMatch,
  }
}

export async function getDefaultSongUrlV1(
  loadSongApiListModule: () => Promise<DownloadSourceApiListModule> = loadDefaultSongApiListModule
) {
  const module = await loadSongApiListModule()
  return module.getSongUrlV1
}

export async function getDefaultSongDownloadUrlV1(
  loadSongApiListModule: () => Promise<DownloadSourceApiListModule> = loadDefaultSongApiListModule
) {
  const module = await loadSongApiListModule()
  return module.getSongDownloadUrlV1
}

export async function getDefaultSongUrlMatch(
  loadSongApiListModule: () => Promise<DownloadSourceApiListModule> = loadDefaultSongApiListModule
) {
  const module = await loadSongApiListModule()
  return module.getSongUrlMatch
}

export function normalizeFileExtension(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase().replace(/^\./, '')
  if (!normalized) {
    return null
  }

  if (normalized.includes('flac')) {
    return '.flac'
  }

  if (normalized.includes('mp3')) {
    return '.mp3'
  }

  if (normalized.includes('aac')) {
    return '.aac'
  }

  if (normalized.includes('m4a')) {
    return '.m4a'
  }

  if (normalized.includes('ogg')) {
    return '.ogg'
  }

  if (normalized.includes('wav')) {
    return '.wav'
  }

  return `.${normalized}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function inferFileExtensionFromUrl(sourceUrl: string) {
  try {
    const pathname = new URL(sourceUrl).pathname
    const match = pathname.match(/\.([a-z0-9]+)$/i)
    return match ? `.${match[1].toLowerCase()}` : null
  } catch {
    const match = sourceUrl.match(/\.([a-z0-9]+)(?:$|[?#])/i)
    return match ? `.${match[1].toLowerCase()}` : null
  }
}

export function readOfficialDownloadUrl(payload: unknown) {
  if (!isRecord(payload)) {
    return null
  }

  const root = isRecord(payload.data) ? payload.data : payload
  const nested = isRecord(root.data) ? root.data : root
  const url = typeof nested.url === 'string' ? nested.url.trim() : ''

  if (!url) {
    return null
  }

  const extension =
    normalizeFileExtension(
      typeof nested.encodeType === 'string'
        ? nested.encodeType
        : typeof nested.type === 'string'
          ? nested.type
          : null
    ) || inferFileExtensionFromUrl(url)

  return {
    url,
    fileExtension: extension,
  }
}
