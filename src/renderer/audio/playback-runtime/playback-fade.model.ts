export const DEFAULT_PLAYBACK_FADE_DURATION_MS = 500

/**
 * 判断播放启动是否需要淡入
 *
 * 只有音频 graph 可用且已有有效音源时才淡入；无音源时直接播放会由 HTMLAudioElement 报错。
 */
export function shouldFadePlaybackStart(input: {
  enabled: boolean
  hasSource: boolean
}) {
  return input.enabled && input.hasSource
}

/**
 * 判断暂停是否需要淡出
 *
 * 暂停淡出依赖 masterGain，未接入 graph 或无音源时应直接暂停，避免等待无意义的 500ms。
 */
export function shouldFadePlaybackPause(input: {
  enabled: boolean
  hasSource: boolean
}) {
  return input.enabled && input.hasSource
}

/**
 * 判断切换音源是否需要淡出旧歌
 *
 * 只有当前存在活跃音源时才需要淡出，否则直接 load 新源即可。
 */
export function shouldFadeTrackTransition(input: {
  enabled: boolean
  hasActiveSource: boolean
}) {
  return input.enabled && input.hasActiveSource
}
