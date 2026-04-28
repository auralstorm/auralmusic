import type { BuiltinPlatformSource } from './platform-metadata.types.ts'

export type BuiltinMetadataKind = 'lyric' | 'cover'

/**
 * Phase 1 fallback policy:
 * - lyric: do not cross-fallback, return empty bundle
 * - cover: allow UI/default-cover fallback
 */
export function shouldFallbackBuiltinMetadata(
  kind: BuiltinMetadataKind,
  _source: BuiltinPlatformSource | null
) {
  return kind === 'cover'
}
