import { LOCAL_MEDIA_PROTOCOL } from '../../../shared/local-media.ts'
import { DEFAULT_AUDIO_OUTPUT_DEVICE_ID } from '../../lib/audio-output.ts'

export const DEFAULT_PLAYBACK_RUNTIME_ERROR = 'play_failed'

export type PlaybackRuntimeFailureKind =
  | 'output_device_failed'
  | 'source_load_failed'
  | 'audio_context_failed'
  | 'graph_failed'
  | 'play_failed'

export function normalizePlaybackOutputDeviceId(deviceId: string) {
  return deviceId || DEFAULT_AUDIO_OUTPUT_DEVICE_ID
}

export function shouldReuseLoadedSource(currentUrl: string, nextUrl: string) {
  return Boolean(currentUrl) && currentUrl === nextUrl
}

export function isEqualizerGraphCompatibleSourceUrl(sourceUrl: string) {
  if (!sourceUrl.trim()) {
    return false
  }

  try {
    const url = new URL(sourceUrl)
    return (
      url.protocol === `${LOCAL_MEDIA_PROTOCOL}:` ||
      url.protocol === 'blob:' ||
      url.protocol === 'data:'
    )
  } catch {
    return false
  }
}

export function classifyPlaybackRuntimeError(
  _error: unknown,
  scope: 'output-device' | 'source-load' | 'audio-context' | 'graph' | 'unknown'
): PlaybackRuntimeFailureKind {
  if (scope === 'output-device') {
    return 'output_device_failed'
  }

  if (scope === 'source-load') {
    return 'source_load_failed'
  }

  if (scope === 'audio-context') {
    return 'audio_context_failed'
  }

  if (scope === 'graph') {
    return 'graph_failed'
  }

  return DEFAULT_PLAYBACK_RUNTIME_ERROR
}
