import { useCallback, useEffect, useState } from 'react'

import TrackList from '@/components/TrackList'
import { Skeleton } from '@/components/ui/skeleton'
import { getPlaylistTrackAll } from '@/api/list'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { useUserStore } from '@/stores/user'
import { createLikedSongsQueueSourceKey } from '../../../../shared/playback'
import { filterLikedSongsListItems } from '../../../../shared/liked-song-visibility'

import { normalizeLikedSongsTrackPage } from '../liked-songs.model'
import type { LikedSongsTrackPanelProps } from '../types'

const PAGE_SIZE = 50

const LikedSongsTrackSkeleton = () => {
  return (
    <div className='mx-auto px-4 pb-10 md:px-6'>
      <div className='border-border/60 bg-card/75 overflow-hidden rounded-[28px] border shadow-[0_18px_50px_rgba(15,23,42,0.04)]'>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className='grid grid-cols-[minmax(0,1fr)_72px] items-center gap-4 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_72px] md:px-6'
          >
            <div className='flex min-w-0 items-center gap-4'>
              <Skeleton className='size-12 rounded-[14px]' />
              <div className='min-w-0 flex-1 space-y-2'>
                <Skeleton className='h-4 w-40 rounded-full' />
                <Skeleton className='h-3 w-28 rounded-full' />
                <Skeleton className='h-3 w-24 rounded-full md:hidden' />
              </div>
            </div>
            <Skeleton className='hidden h-4 w-32 rounded-full md:block' />
            <Skeleton className='ml-auto h-4 w-12 rounded-full' />
          </div>
        ))}
      </div>
    </div>
  )
}

const LikedSongsTrackPanel = ({
  playlist,
  refreshKey,
}: LikedSongsTrackPanelProps) => {
  const [error, setError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [hiddenSongIds, setHiddenSongIds] = useState<Set<number>>(new Set())
  const likedSongIds = useUserStore(state => state.likedSongIds)
  const likedSongsLoaded = useUserStore(state => state.likedSongsLoaded)
  const playbackQueueKey = createLikedSongsQueueSourceKey(playlist.id)

  const fetchTrackPage = useCallback(
    async (offset: number, limit: number) => {
      try {
        setError('')

        const response = await getPlaylistTrackAll(
          playlist.id,
          limit,
          offset,
          Date.now()
        )

        return normalizeLikedSongsTrackPage(response.data, {
          offset,
          totalSongs: playlist.totalSongs,
        })
      } catch (fetchError) {
        console.error('liked songs track page fetch failed', fetchError)

        if (offset === 0) {
          setError('我喜欢的音乐加载失败，请稍后重试')
        }

        return {
          list: [],
          hasMore: false,
        }
      } finally {
        if (offset === 0) {
          setIsInitialLoading(false)
        }
      }
    },
    [playlist.id, playlist.totalSongs]
  )

  const {
    data: songs,
    loading,
    hasMore,
    loadMore,
    reset,
  } = useIntersectionLoadMore(fetchTrackPage, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    setError('')
    setIsInitialLoading(true)
    setHiddenSongIds(new Set())
    reset()
  }, [playlist.id, refreshKey, reset])

  const visibleSongs = filterLikedSongsListItems(
    songs,
    likedSongIds,
    likedSongsLoaded,
    hiddenSongIds
  )

  useEffect(() => {
    if (
      isInitialLoading ||
      loading ||
      !hasMore ||
      visibleSongs.length > 0 ||
      songs.length === 0
    ) {
      return
    }

    void loadMore()
  }, [
    hasMore,
    isInitialLoading,
    loadMore,
    loading,
    songs.length,
    visibleSongs.length,
  ])

  const handleLikeChangeSuccess = (songId: number, nextLiked: boolean) => {
    if (nextLiked) {
      return
    }

    setHiddenSongIds(previous => {
      const nextIds = new Set(previous)
      nextIds.add(songId)
      return nextIds
    })
  }

  if (playlist.totalSongs === 0) {
    return (
      <div className='mx-auto px-4 pb-10 md:px-6'>
        <div className='border-border/60 bg-card/75 text-muted-foreground rounded-[28px] border px-6 py-12 text-center text-sm shadow-[0_18px_50px_rgba(15,23,42,0.04)]'>
          暂无喜欢的音乐
        </div>
      </div>
    )
  }

  if (error && songs.length === 0) {
    return (
      <div className='mx-auto px-4 pb-10 md:px-6'>
        <div className='border-destructive/20 bg-destructive/5 text-destructive rounded-[28px] border px-6 py-12 text-center text-sm'>
          {error}
        </div>
      </div>
    )
  }

  if (isInitialLoading && songs.length === 0) {
    return <LikedSongsTrackSkeleton />
  }

  if (!isInitialLoading && visibleSongs.length === 0 && !loading && !hasMore) {
    return (
      <div className='mx-auto px-4 pb-10 md:px-6'>
        <div className='border-border/60 bg-card/75 text-muted-foreground rounded-[28px] border px-6 py-12 text-center text-sm shadow-[0_18px_50px_rgba(15,23,42,0.04)]'>
          暂无喜欢的音乐
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <TrackList
        data={visibleSongs}
        playbackQueueKey={playbackQueueKey}
        onLikeChangeSuccess={handleLikeChangeSuccess}
        onEndReached={() => void loadMore()}
        hasMore={hasMore}
        loading={loading && !isInitialLoading}
        loadingText='正在加载更多喜欢的音乐...'
        endText='没有更多歌曲了'
      />
    </div>
  )
}

export default LikedSongsTrackPanel
