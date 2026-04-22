import { useCallback, useEffect, useRef, useState } from 'react'

import { getUserCloud } from '@/api/cloud'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import type { DailySongRowItem } from '@/pages/DailySongs/types'
import { useAuthStore } from '@/stores/auth-store'
import { createCloudQueueSourceKey } from '../../../../shared/playback'

import { normalizeLibraryCloudPage } from '../library-cloud.model'
import TrackList from '@/components/TrackList'
import type { LibraryCloudPanelProps } from '../types'

const PAGE_SIZE = 30

const LibraryCloudPanel = ({ active }: LibraryCloudPanelProps) => {
  const userId = useAuthStore(state => state.user?.userId)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const hasActivatedRef = useRef(false)
  const playbackQueueKey = userId
    ? createCloudQueueSourceKey(userId)
    : undefined

  const fetchCloudSongs = useCallback(async (offset: number, limit: number) => {
    try {
      const response = await getUserCloud({
        limit,
        offset,
      })

      return normalizeLibraryCloudPage(response.data, {
        limit,
        offset,
      })
    } finally {
      if (offset === 0) {
        setIsInitialLoading(false)
      }
    }
  }, [])

  const {
    data: songs,
    loading,
    hasMore,
    loadMore,
    reset,
  } = useIntersectionLoadMore<DailySongRowItem>(fetchCloudSongs, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    if (!active || hasActivatedRef.current) {
      return
    }

    hasActivatedRef.current = true
    setIsInitialLoading(true)
    reset()
  }, [active, reset])

  if (!active && songs.length === 0) {
    return null
  }

  if (isInitialLoading && songs.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        正在加载云盘歌曲...
      </div>
    )
  }

  if (!isInitialLoading && songs.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        暂无云盘内容
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='border-border/40 bg-background/70 overflow-hidden rounded-[24px] border'>
        <TrackList
          data={songs}
          playbackQueueKey={playbackQueueKey}
          onEndReached={() => void loadMore()}
          hasMore={hasMore}
          loading={loading && !isInitialLoading}
          loadingText='正在加载更多云盘歌曲...'
          endText='没有更多云盘歌曲了'
        />
      </div>
    </div>
  )
}

export default LibraryCloudPanel
