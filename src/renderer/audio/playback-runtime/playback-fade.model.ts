export const DEFAULT_PLAYBACK_FADE_DURATION_MS = 380

export function shouldFadePlaybackStart(input: {
  enabled: boolean
  hasSource: boolean
}) {
  return input.enabled && input.hasSource
}

export function shouldFadePlaybackPause(input: {
  enabled: boolean
  hasSource: boolean
}) {
  return input.enabled && input.hasSource
}

export function shouldFadeTrackTransition(input: {
  enabled: boolean
  hasActiveSource: boolean
}) {
  return input.enabled && input.hasActiveSource
}
