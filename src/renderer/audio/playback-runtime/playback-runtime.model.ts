import { LOCAL_MEDIA_PROTOCOL } from '../../../shared/local-media.ts'
import { DEFAULT_AUDIO_OUTPUT_DEVICE_ID } from '../../lib/audio-output.ts'
import type { PlaybackRuntimeFailureKind } from '@/types/audio'

export const DEFAULT_PLAYBACK_RUNTIME_ERROR = 'play_failed'

/**
 * 归一化音频输出设备 id
 * @param deviceId 用户配置或系统返回的设备 id
 * @returns 空值时回退到系统默认输出设备
 */
export function normalizePlaybackOutputDeviceId(deviceId: string) {
  return deviceId || DEFAULT_AUDIO_OUTPUT_DEVICE_ID
}

/**
 * 判断当前音源是否可以复用
 *
 * 相同 URL 重复 load 会打断当前缓冲和播放位置，因此切歌链路在真正换源前先做判断。
 */
export function shouldReuseLoadedSource(currentUrl: string, nextUrl: string) {
  return Boolean(currentUrl) && currentUrl === nextUrl
}

/**
 * 判断音源是否适合接入 WebAudio graph
 *
 * 远端 HTTP 音源如果没有正确 CORS 头，接入 MediaElementSource 后会污染 audio graph，
 * 导致均衡器/淡入淡出不可用甚至静音。这里仅允许本地协议、blob 和 data 这类可控源。
 */
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

/**
 * 将 runtime 失败场景映射为稳定错误码
 * @param _error 原始错误，当前只保留扩展位
 * @param scope 失败发生的功能域
 */
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
