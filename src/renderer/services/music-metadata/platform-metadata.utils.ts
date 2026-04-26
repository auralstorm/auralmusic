import type { PlatformMetadataRequest } from './platform-metadata.types.ts'
import {
  BUILTIN_PLATFORM_SOURCES,
  type BuiltinPlatformSource,
} from './platform-metadata.types.ts'

const BUILTIN_PLATFORM_SOURCE_SET = new Set<BuiltinPlatformSource>(
  BUILTIN_PLATFORM_SOURCES
)

/**
 * 归一化内置平台 source id，仅接受五平台固定来源。
 */
export function normalizeBuiltinPlatformSource(
  source: unknown
): BuiltinPlatformSource | null {
  if (typeof source !== 'string') {
    return null
  }

  const nextSource = source.trim() as BuiltinPlatformSource

  return BUILTIN_PLATFORM_SOURCE_SET.has(nextSource) ? nextSource : null
}

/**
 * 读取轨道的平台元数据来源，优先显式锁定的平台。
 */
export function readTrackPlatformSource(
  track: Pick<PlatformMetadataRequest, 'lockedPlatform' | 'lxInfo'>
): BuiltinPlatformSource | null {
  return (
    normalizeBuiltinPlatformSource(track.lockedPlatform) ??
    normalizeBuiltinPlatformSource(track.lxInfo?.source)
  )
}
