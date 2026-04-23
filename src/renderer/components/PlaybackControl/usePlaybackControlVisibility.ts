import { useEffect, useRef, useState } from 'react'

export const PLAYBACK_CONTROL_VISUAL_EXIT_DURATION_MS = 180

export function usePlaybackControlVisibility(isPlayerSceneOpen: boolean) {
  const hideTimerRef = useRef<number | null>(null)
  const [shouldRenderLiveContent, setShouldRenderLiveContent] = useState(true)

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    if (!isPlayerSceneOpen) {
      setShouldRenderLiveContent(true)
      return
    }

    hideTimerRef.current = window.setTimeout(() => {
      setShouldRenderLiveContent(false)
      hideTimerRef.current = null
    }, PLAYBACK_CONTROL_VISUAL_EXIT_DURATION_MS)

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [isPlayerSceneOpen])

  return {
    isHidden: isPlayerSceneOpen,
    shouldRenderLiveContent,
  }
}
