import { useCallback, useEffect, useRef, useState } from 'react'

import { getUserCloud } from '@/api/cloud'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import type { DailySongRowItem } from '@/pages/DailySongs/daily-songs.model'

import { normalizeLibraryCloudPage } from '../library-cloud.model'
import TrackList from '@/components/TrackList'

interface LibraryCloudPanelProps {
  active: boolean
}

const PAGE_SIZE = 30

const LibraryCloudPanel = ({ active }: LibraryCloudPanelProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const hasActivatedRef = useRef(false)

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
    sentinelRef,
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
        <TrackList data={songs} />
      </div>

      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-16 items-center justify-center text-sm'
      >
        {loading && !isInitialLoading ? '正在加载更多云盘歌曲...' : null}
        {!loading && !hasMore && songs.length > 0 ? '没有更多云盘歌曲了' : null}
      </div>
    </div>
  )
}

export default LibraryCloudPanel
