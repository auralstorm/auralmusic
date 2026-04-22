import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getArtistSongs } from '@/api/artist'
import TrackList from '@/components/TrackList'
import { Skeleton } from '@/components/ui/skeleton'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { normalizeArtistSongs } from '@/pages/Artists/Detail/model'

const PAGE_SIZE = 30

const ArtistSongsSkeleton = () => {
  return (
    <section className='space-y-6 pb-8'>
      <Skeleton className='h-10 w-40 rounded-full' />
      <div className='border-border/60 bg-card/70 overflow-hidden rounded-[28px] border'>
        {Array.from({ length: 8 }).map((_, index) => (
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
    </section>
  )
}

const ArtistSongs = () => {
  useScrollToTopOnRouteEnter()

  const { id } = useParams()
  const artistId = Number(id)
  const playbackQueueKey = artistId ? `artist-songs:${artistId}:hot` : ''
  const [error, setError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const fetchArtistSongsPage = useCallback(
    async (offset: number, limit: number) => {
      if (!artistId) {
        if (offset === 0) {
          setError('歌手 ID 无效')
          setIsInitialLoading(false)
        }

        return { list: [], hasMore: false }
      }

      try {
        setError('')

        const response = await getArtistSongs({
          id: artistId,
          order: 'hot',
          limit,
          offset,
        })
        const songs = normalizeArtistSongs(response)

        return {
          list: songs,
          hasMore: songs.length >= limit,
        }
      } catch (fetchError) {
        console.error('artist songs page fetch failed', fetchError)

        if (offset === 0) {
          setError('歌手歌曲加载失败，请稍后重试')
        }

        return { list: [], hasMore: false }
      } finally {
        if (offset === 0) {
          setIsInitialLoading(false)
        }
      }
    },
    [artistId]
  )

  const {
    data: songs,
    loading,
    hasMore,
    loadMore,
    reset,
  } = useIntersectionLoadMore(fetchArtistSongsPage, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    setError('')
    setIsInitialLoading(true)
    reset()
  }, [artistId, reset])

  if (!artistId) {
    return (
      <section className='pb-8'>
        <div className='border-destructive/20 bg-destructive/5 text-destructive rounded-[28px] border px-6 py-12 text-center text-sm'>
          歌手 ID 无效
        </div>
      </section>
    )
  }

  if (error && songs.length === 0) {
    return (
      <section className='pb-8'>
        <div className='border-destructive/20 bg-destructive/5 text-destructive rounded-[28px] border px-6 py-12 text-center text-sm'>
          {error}
        </div>
      </section>
    )
  }

  if (isInitialLoading && songs.length === 0) {
    return <ArtistSongsSkeleton />
  }

  if (!isInitialLoading && songs.length === 0 && !loading && !hasMore) {
    return (
      <section className='space-y-6 pb-8'>
        <h1 className='text-foreground text-3xl font-bold tracking-tight'>
          全部歌曲
        </h1>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-12 text-center text-sm'>
          暂无歌曲
        </div>
      </section>
    )
  }

  return (
    <section className='space-y-6 pb-8'>
      <h1 className='text-foreground text-3xl font-bold tracking-tight'>
        全部歌曲
      </h1>

      <TrackList
        data={songs}
        playbackQueueKey={playbackQueueKey}
        onEndReached={() => void loadMore()}
        hasMore={hasMore}
        loading={loading && !isInitialLoading}
        loadingText='正在加载更多歌曲...'
        endText='没有更多歌曲了'
      />
    </section>
  )
}

export default ArtistSongs
