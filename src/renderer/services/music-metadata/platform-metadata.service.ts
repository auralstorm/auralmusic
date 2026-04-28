import type {
  BuiltinCoverResult,
  BuiltinLyricResult,
  BuiltinPlatformSource,
  PlatformMetadataRequest,
} from './platform-metadata.types.ts'
import {
  builtinCoverProviders,
  readBuiltinCoverProvider,
} from './providers/cover/index.ts'
import {
  builtinLyricProviders,
  readBuiltinLyricProvider,
} from './providers/lyric/index.ts'
import {
  normalizeBuiltinPlatformSource,
  readTrackPlatformSource,
} from './platform-metadata.utils.ts'

/**
 * 解析当前轨道的平台元数据来源，供歌词/封面内置 provider 统一分发。
 */
export function resolveTrackPlatformMetadataSource(
  track:
    | Pick<PlatformMetadataRequest, 'lockedPlatform' | 'lxInfo'>
    | null
    | undefined
): BuiltinPlatformSource | null {
  if (!track) {
    return null
  }

  return readTrackPlatformSource(track)
}

/**
 * 判断当前来源是否应走内置平台元数据能力层。
 */
export function shouldUseBuiltinPlatformMetadata(source: unknown): boolean {
  return normalizeBuiltinPlatformSource(source) !== null
}

/**
 * 按轨道来源分发到对应的平台内置歌词 provider。
 */
export async function getBuiltinTrackLyric(
  track: PlatformMetadataRequest | null | undefined
): Promise<BuiltinLyricResult | null> {
  if (!track) {
    return null
  }
  const source = resolveTrackPlatformMetadataSource(track) ?? 'wy'
  const provider = readBuiltinLyricProvider(builtinLyricProviders, source)
  if (!provider) {
    return null
  }

  return provider.getLyric(track)
}

/**
 * 按轨道来源分发到对应的平台内置封面 provider。
 */
export async function getBuiltinTrackCover(
  track: PlatformMetadataRequest | null | undefined
): Promise<BuiltinCoverResult | null> {
  if (!track) {
    return null
  }

  const source = resolveTrackPlatformMetadataSource(track) ?? 'wy'
  const provider = readBuiltinCoverProvider(builtinCoverProviders, source)
  if (!provider) {
    return null
  }

  return provider.getCover(track)
}
