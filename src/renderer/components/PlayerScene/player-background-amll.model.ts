export type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'

export type AmllBackgroundState = {
  enabled: boolean
  staticMode: boolean
  playing: boolean
}

export function resolveAmllBackgroundState(
  mode: PlayerBackgroundMode,
  coverUrl: string
): AmllBackgroundState {
  if (!coverUrl) {
    return {
      enabled: false,
      staticMode: mode !== 'dynamic',
      playing: false,
    }
  }

  if (mode === 'off') {
    return {
      enabled: false,
      staticMode: true,
      playing: false,
    }
  }

  return {
    enabled: true,
    staticMode: mode === 'static',
    // Keep AMLL rendering active so the first frame is available
    // even before the track transitions into the "playing" state.
    playing: true,
  }
}
