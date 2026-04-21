import { useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'

import { usePlaybackStore } from '@/stores/playback-store'
import type { TrackListProps } from './types'
import {
  getTrackListFooterText,
  shouldTriggerTrackListEndReached,
  toPlaybackTrack,
} from './model'
import TrackListItem from './TrackListItem'

const TrackList = ({
  data = [],
  coverUrl,
  emptyText = '暂无数据',
  endText = '没有更多了',
  hasMore = false,
  loading = false,
  loadingText = '正在加载更多...',
  onLikeChangeSuccess,
  onEndReached,
}: TrackListProps) => {
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const appendToQueue = usePlaybackStore(state => state.appendToQueue)
  const currentTrackId = usePlaybackStore(state => state.currentTrack?.id)
  const playbackStatus = usePlaybackStore(state => state.status)
  const playbackQueue = useMemo(
    () => data.map(item => toPlaybackTrack(item, coverUrl)),
    [coverUrl, data]
  )
  const footerText = getTrackListFooterText({
    itemCount: data.length,
    loading,
    hasMore,
    loadingText,
    endText,
  })

  if (data.length === 0) {
    return (
      <div className='text-muted-foreground px-6 py-10 text-center text-sm'>
        {emptyText}
      </div>
    )
  }

  return (
    <Virtuoso
      useWindowScroll
      data={data}
      endReached={() => {
        if (
          !onEndReached ||
          !shouldTriggerTrackListEndReached({
            itemCount: data.length,
            loading,
            hasMore,
          })
        ) {
          return
        }

        onEndReached()
      }}
      components={{
        Footer: () =>
          footerText ? (
            <div className='text-muted-foreground flex h-16 items-center justify-center text-sm'>
              {footerText}
            </div>
          ) : null,
      }}
      itemContent={(index, item) => (
        <TrackListItem
          key={item.id}
          item={item}
          coverUrl={coverUrl}
          isActive={item.id === currentTrackId}
          isPlaying={item.id === currentTrackId && playbackStatus === 'playing'}
          onPlay={() => playQueueFromIndex(playbackQueue, index)}
          onAddToQueue={() => appendToQueue([playbackQueue[index]])}
          onLikeChangeSuccess={onLikeChangeSuccess}
        />
      )}
    />
  )
}

export default TrackList
