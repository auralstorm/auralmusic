import { useEffect, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'

import { usePlaybackStore } from '@/stores/playback-store'
import type { TrackListProps } from './types'
import {
  getTrackListFooterText,
  shouldTriggerTrackListEndReached,
  toPlaybackTrack,
} from './model'
import TrackListPlaybackItem from './TrackListPlaybackItem'

const TrackList = ({
  data = [],
  coverUrl,
  emptyText = '暂无数据',
  endText = '没有更多了',
  hasMore = false,
  loading = false,
  loadingText = '正在加载更多...',
  playbackQueueKey,
  onLikeChangeSuccess,
  onEndReached,
}: TrackListProps) => {
  const syncQueueFromSource = usePlaybackStore(
    state => state.syncQueueFromSource
  )
  const playbackQueue = useMemo(
    () => data.map(item => toPlaybackTrack(item, coverUrl)),
    [coverUrl, data]
  )

  useEffect(() => {
    if (!playbackQueueKey || playbackQueue.length === 0) {
      return
    }

    syncQueueFromSource(playbackQueueKey, playbackQueue)
  }, [playbackQueue, playbackQueueKey, syncQueueFromSource])

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
        <TrackListPlaybackItem
          key={item.id}
          item={item}
          index={index}
          coverUrl={coverUrl}
          playbackQueue={playbackQueue}
          playbackQueueKey={playbackQueueKey}
          onLikeChangeSuccess={onLikeChangeSuccess}
        />
      )}
    />
  )
}

export default TrackList
