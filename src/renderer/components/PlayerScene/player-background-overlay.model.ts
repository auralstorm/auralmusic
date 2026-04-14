export type PlayerBackgroundOverlayState = {
  ambientOpacity: number
  lyricPanelOpacity: number
  vignetteOpacity: number
  glowOpacity: number
  bottomOpacity: number
}

type ResolvePlayerBackgroundOverlayStateInput = {
  enabled: boolean
  staticMode: boolean
  isDarkTheme: boolean
}

export function resolvePlayerBackgroundOverlayState({
  enabled,
  staticMode,
  isDarkTheme,
}: ResolvePlayerBackgroundOverlayStateInput): PlayerBackgroundOverlayState {
  if (!enabled) {
    return {
      ambientOpacity: 0,
      lyricPanelOpacity: 0,
      vignetteOpacity: 0,
      glowOpacity: 0,
      bottomOpacity: 0,
    }
  }

  if (isDarkTheme) {
    if (staticMode) {
      return {
        ambientOpacity: 0.22,
        lyricPanelOpacity: 0.3,
        vignetteOpacity: 0.5,
        glowOpacity: 0.06,
        bottomOpacity: 0.56,
      }
    }

    return {
      ambientOpacity: 0.18,
      lyricPanelOpacity: 0.22,
      vignetteOpacity: 0.42,
      glowOpacity: 0.08,
      bottomOpacity: 0.48,
    }
  }

  if (staticMode) {
    return {
      ambientOpacity: 0.24,
      lyricPanelOpacity: 0.42,
      vignetteOpacity: 0.24,
      glowOpacity: 0.14,
      bottomOpacity: 0.36,
    }
  }

  return {
    ambientOpacity: 0.16,
    lyricPanelOpacity: 0.3,
    vignetteOpacity: 0.18,
    glowOpacity: 0.18,
    bottomOpacity: 0.28,
  }
}
