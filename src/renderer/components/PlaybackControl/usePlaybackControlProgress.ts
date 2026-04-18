import { useEffect, useState } from 'react'
import { getPlaybackProgressViewState } from './model'
import type { PlaybackControlProgressOptions } from './types'

export function usePlaybackControlProgress({
  duration,
  hasTrack,
  progress,
  seekTo,
}: PlaybackControlProgressOptions) {
  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const { currentProgress, maxProgress } = getPlaybackProgressViewState(
    duration,
    progress,
    dragProgress
  )

  useEffect(() => {
    if (hasTrack && duration > 0) {
      return
    }

    setDragProgress(null)
  }, [duration, hasTrack])

  const handleProgressChange = (value: number[]) => {
    setDragProgress(value[0] ?? 0)
  }

  const handleProgressCommit = (value: number[]) => {
    const nextProgress = value[0] ?? 0

    setDragProgress(null)
    seekTo(nextProgress)
  }

  return {
    currentProgress,
    maxProgress,
    handleProgressChange,
    handleProgressCommit,
  }
}
