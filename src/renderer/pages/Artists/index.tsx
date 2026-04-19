import { startTransition, useCallback, useEffect, useState } from 'react'
import { getArtistList } from '@/api/artist'
import { useScrollToTopOnActive } from '@/hooks/useScrollToTopOnActive'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import ArtistFilterGroup from './components/ArtistFilters'
import ArtistCard from './components/ArtistCard'
import { ArtistsGridSkeleton } from './components/ArtistsSkeletons'
import type {
  ArtistArea,
  ArtistInitial,
  ArtistListItem,
  ArtistListResponse,
  ArtistType,
} from './types'
import {
  ARTIST_AREA_OPTIONS,
  ARTIST_INITIAL_OPTIONS,
  ARTIST_TYPE_OPTIONS,
} from './artists.model'

const PAGE_SIZE = 30

const Artists = () => {
  useScrollToTopOnActive()

  const [area, setArea] = useState<ArtistArea>(-1)
  const [type, setType] = useState<ArtistType>(-1)
  const [initial, setInitial] = useState<ArtistInitial>(-1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const fetchArtistList = useCallback(
    async (offset: number, limit: number) => {
      try {
        const response = await getArtistList({
          area,
          type,
          initial,
          offset,
          limit,
        })

        const payload = (response.data || {}) as ArtistListResponse
        const artists = (payload.artists || []) as ArtistListItem[]

        return {
          list: artists,
          hasMore: payload.more ?? artists.length >= limit,
        }
      } finally {
        if (offset === 0) {
          setIsInitialLoading(false)
        }
      }
    },
    [area, initial, type]
  )

  const {
    data: artists,
    loading,
    hasMore,
    sentinelRef,
    reset,
  } = useIntersectionLoadMore<ArtistListItem>(fetchArtistList, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    setIsInitialLoading(true)
    reset()
  }, [area, initial, reset, type])

  const handleAreaChange = (nextArea: ArtistArea) => {
    startTransition(() => {
      setArea(nextArea)
    })
  }

  const handleTypeChange = (nextType: ArtistType) => {
    startTransition(() => {
      setType(nextType)
    })
  }

  const handleInitialChange = (nextInitial: ArtistInitial) => {
    startTransition(() => {
      setInitial(nextInitial)
    })
  }

  const isEmpty = !isInitialLoading && artists.length === 0

  return (
    <section className='w-full pb-8'>
      <div className='border-border/70 bg-background/88 relative overflow-hidden rounded-[34px] border p-6 shadow-[0_30px_90px_rgba(148,163,184,0.14)] backdrop-blur-xl duration-300'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.28),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(221,214,254,0.22),transparent_28%)]' />
        <div className='relative space-y-6'>
          <ArtistFilterGroup
            label='语种'
            options={ARTIST_AREA_OPTIONS}
            value={area}
            onChange={handleAreaChange}
          />
          <ArtistFilterGroup
            label='分类'
            options={ARTIST_TYPE_OPTIONS}
            value={type}
            onChange={handleTypeChange}
          />
          <ArtistFilterGroup
            label='筛选'
            options={ARTIST_INITIAL_OPTIONS}
            value={initial}
            onChange={handleInitialChange}
            compact
          />
        </div>
      </div>

      <div className='mt-10'>
        {isInitialLoading ? (
          <ArtistsGridSkeleton />
        ) : isEmpty ? (
          <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
            当前筛选条件下暂无歌手数据
          </div>
        ) : (
          <div className='grid grid-cols-4 gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6'>
            {artists.map(artist => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>

      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-20 items-center justify-center text-sm'
      >
        {loading && !isInitialLoading ? '正在加载更多歌手...' : null}
        {!loading && !hasMore && artists.length > 0 ? '没有更多歌手了' : null}
      </div>
    </section>
  )
}

export default Artists
