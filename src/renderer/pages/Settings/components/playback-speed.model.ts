export const PLAYBACK_SPEED_MIN = 0.5
export const PLAYBACK_SPEED_MAX = 2
export const PLAYBACK_SPEED_DEFAULT = 1
export const PLAYBACK_SPEED_STEP = 0.1

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizePlaybackSpeedValue(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return PLAYBACK_SPEED_DEFAULT
  }

  return clamp(value, PLAYBACK_SPEED_MIN, PLAYBACK_SPEED_MAX)
}

export function formatPlaybackSpeedLabel(value: unknown) {
  return `${normalizePlaybackSpeedValue(value).toFixed(1)}x`
}

export function resolvePlaybackSpeedSliderValue(
  configValue: unknown,
  dragValue: number | null
) {
  if (typeof dragValue === 'number' && Number.isFinite(dragValue)) {
    return normalizePlaybackSpeedValue(dragValue)
  }

  return normalizePlaybackSpeedValue(configValue)
}

export function resolvePlaybackSpeedCommitValue(value: number[]) {
  return normalizePlaybackSpeedValue(value[0])
}

type PlaybackRateAudioLike = {
  playbackRate: number
}

export function applyPlaybackSpeedToAudio(
  audio: PlaybackRateAudioLike,
  speed: unknown
) {
  const normalizedSpeed = normalizePlaybackSpeedValue(speed)
  audio.playbackRate = normalizedSpeed

  return normalizedSpeed
}
