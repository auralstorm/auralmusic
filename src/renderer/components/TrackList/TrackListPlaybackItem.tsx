import { memo, useCallback } from 'react'

import { usePlaybackStore } from '@/stores/playback-store'
import type { PlaybackTrack } from '../../../shared/playback.ts'
import TrackListItem from './TrackListItem'
import type { TrackListItemData, TrackListVariant } from './types'

interface TrackListPlaybackItemProps {
  item: TrackListItemData
  index: number
  type?: TrackListVariant
  coverUrl?: string
  playbackQueue: PlaybackTrack[]
  playbackQueueKey?: string
  onLikeChangeSuccess?: (songId: number, nextLiked: boolean) => void
}

const TrackListPlaybackItem = ({
  item,
  index,
  type,
  coverUrl,
  playbackQueue,
  playbackQueueKey,
  onLikeChangeSuccess,
}: TrackListPlaybackItemProps) => {
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const appendToQueue = usePlaybackStore(state => state.appendToQueue)
  const isActive = usePlaybackStore(state => state.currentTrack?.id === item.id)
  const isPlaying = usePlaybackStore(
    state => state.currentTrack?.id === item.id && state.status === 'playing'
  )

  const handlePlay = useCallback(() => {
    playQueueFromIndex(playbackQueue, index, playbackQueueKey)
  }, [index, playQueueFromIndex, playbackQueue, playbackQueueKey])

  const handleAddToQueue = useCallback(() => {
    const targetTrack = playbackQueue[index]

    if (!targetTrack) {
      return
    }

    appendToQueue([targetTrack])
  }, [appendToQueue, index, playbackQueue])

  return (
    <TrackListItem
      item={item}
      type={type}
      coverUrl={coverUrl}
      isActive={isActive}
      isPlaying={isPlaying}
      onPlay={handlePlay}
      onAddToQueue={handleAddToQueue}
      onLikeChangeSuccess={onLikeChangeSuccess}
    />
  )
}

export default memo(TrackListPlaybackItem)
