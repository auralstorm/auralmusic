import { memo, useCallback } from 'react'

import { usePlaybackStore } from '@/stores/playback-store'
import type { PlaybackTrack } from '../../../../shared/playback.ts'
import FmFeatureCard from './FmFeatureCard'

interface HomeFmFeatureCardProps {
  track: PlaybackTrack | null
  isLoading?: boolean
  actionLoading?: boolean
  onMoveToNext?: (autoPlay: boolean) => Promise<void> | void
  onTrashCurrent?: (trackId: number, autoPlay: boolean) => Promise<void> | void
}

const HomeFmFeatureCard = ({
  track,
  isLoading = false,
  actionLoading = false,
  onMoveToNext,
  onTrashCurrent,
}: HomeFmFeatureCardProps) => {
  const currentTrackId = usePlaybackStore(
    state => state.currentTrack?.id ?? null
  )
  const isPlaying = usePlaybackStore(
    state => state.status === 'playing' || state.status === 'loading'
  )
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const togglePlay = usePlaybackStore(state => state.togglePlay)

  const isActiveFm = Boolean(track && currentTrackId === track.id)
  const isPlayingFm = isActiveFm && isPlaying

  const handleTogglePlay = useCallback(() => {
    if (!track) {
      return
    }

    if (isActiveFm) {
      togglePlay()
      return
    }

    playQueueFromIndex([track], 0)
  }, [isActiveFm, playQueueFromIndex, togglePlay, track])

  const handleMoveToNext = useCallback(() => {
    if (!track || !onMoveToNext) {
      return
    }

    void onMoveToNext(isPlayingFm)
  }, [isPlayingFm, onMoveToNext, track])

  const handleTrashCurrent = useCallback(() => {
    if (!track || !onTrashCurrent) {
      return
    }

    void onTrashCurrent(track.id, isPlayingFm)
  }, [isPlayingFm, onTrashCurrent, track])

  return (
    <FmFeatureCard
      isLoading={isLoading}
      coverUrl={track?.coverUrl}
      title={track?.name}
      artist={track?.artistNames}
      isActiveFm={isActiveFm}
      isPlayingFm={isPlayingFm}
      actionLoading={actionLoading}
      disabled={!track}
      onTogglePlay={handleTogglePlay}
      moveToNext={handleMoveToNext}
      trashCurrent={handleTrashCurrent}
    />
  )
}

export default memo(HomeFmFeatureCard)
