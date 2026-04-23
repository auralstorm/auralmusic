import { startTransition, useCallback, useEffect, useState } from 'react'
import { getNewAlbums } from '@/api/album'
import { useScrollToTopOnActive } from '@/hooks/useScrollToTopOnActive'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import AlbumFilters from './components/AlbumFilters'
import { AlbumsGridSkeleton } from './components/AlbumsSkeletons'
import { ALBUM_AREA_OPTIONS } from './albums.model'
import type { AlbumArea, AlbumListItem, NewAlbumsResponse } from './types'
import { useNavigate } from 'react-router-dom'
import ArtistCover from '@/components/ArtistCover'
import { isDef } from '@/lib/utils'

const PAGE_SIZE = 30

const Albums = () => {
  useScrollToTopOnActive()

  const [area, setArea] = useState<AlbumArea>('ALL')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const navigate = useNavigate()

  const fetchAlbums = useCallback(
    async (offset: number, limit: number) => {
      try {
        const response = await getNewAlbums({
          area,
          offset,
          limit,
        })

        const payload = (response.data || {}) as NewAlbumsResponse
        const albums = (payload.albums || []) as AlbumListItem[]

        return {
          list: albums,
          hasMore: albums.length >= limit,
        }
      } finally {
        if (offset === 0) {
          setIsInitialLoading(false)
        }
      }
    },
    [area]
  )

  const {
    data: albums,
    loading,
    hasMore,
    sentinelRef,
    reset,
  } = useIntersectionLoadMore<AlbumListItem>(fetchAlbums, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    setIsInitialLoading(true)
    reset()
  }, [area, reset])

  const handleAreaChange = (nextArea: AlbumArea) => {
    startTransition(() => {
      setArea(nextArea)
    })
  }

  const navigateToAlbumDetail = (albumId: number) => {
    if (!isDef(albumId)) return
    navigate(`/albums/${albumId}`)
  }

  const navigateToArtistDetail = (artistId?: number) => {
    if (!artistId) {
      return
    }

    navigate(`/artists/${artistId}`)
  }

  const resolveAlbumArtistName = (item: AlbumListItem) => {
    if (item.artist?.name) {
      return item.artist.name
    }

    return item.artists?.map(artist => artist.name).join(' / ')
  }

  const resolvePrimaryAlbumArtistId = (item: AlbumListItem) => {
    if (item.artist?.id) {
      return item.artist.id
    }

    return item.artists?.[0]?.id
  }

  const isEmpty = !isInitialLoading && albums.length === 0

  return (
    <section className='w-full pb-8'>
      <div className='bg-background/88 overflow-hidden] relative border p-6 backdrop-blur-xl'>
        <AlbumFilters
          options={ALBUM_AREA_OPTIONS}
          value={area}
          onChange={handleAreaChange}
        />
      </div>

      <div className='mt-10'>
        {isInitialLoading ? (
          <AlbumsGridSkeleton />
        ) : isEmpty ? (
          <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
            当前分类下暂无新专辑数据
          </div>
        ) : (
          <div className='3xl:grid-cols-6 4xl:grid-cols-7 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5'>
            {albums.map(item => (
              <ArtistCover
                artistCoverUrl={item.picUrl}
                subTitle={resolveAlbumArtistName(item)}
                artistName={item.name}
                key={item.id}
                // onPlay={() => handlePlay(item)}
                onClickCover={() => navigateToAlbumDetail(item.id)}
                onClickSubTitle={() =>
                  navigateToArtistDetail(resolvePrimaryAlbumArtistId(item))
                }
              />
            ))}
          </div>
        )}
      </div>

      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-20 items-center justify-center text-sm'
      >
        {loading && !isInitialLoading ? '正在加载更多专辑...' : null}
        {!loading && !hasMore && albums.length > 0 ? '没有更多专辑了' : null}
      </div>
    </section>
  )
}

export default Albums
