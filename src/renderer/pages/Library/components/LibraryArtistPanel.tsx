import { useCallback, useEffect, useRef } from 'react'

import ArtistCover from '@/components/ArtistCover'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import type { ArtistListItem } from '@/pages/Artists/types'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'
import { useNavigate } from 'react-router-dom'
import type { LibraryArtistPanelProps } from '../types'

const PAGE_SIZE = 25

const LibraryArtistPanel = ({ active }: LibraryArtistPanelProps) => {
  const navigate = useNavigate()
  const hasActivatedRef = useRef(false)
  const userId = useAuthStore(state => state.user?.userId)
  const likedArtists = useUserStore(state => state.likedArtists)
  const likedArtistsLoaded = useUserStore(state => state.likedArtistsLoaded)
  const likedArtistsLoading = useUserStore(state => state.likedArtistsLoading)
  const fetchLikedArtists = useUserStore(state => state.fetchLikedArtists)

  const fetchArtistPage = useCallback(
    async (offset: number, limit: number) => {
      const list = likedArtists.slice(offset, offset + limit)

      return {
        list,
        hasMore: offset + list.length < likedArtists.length,
      }
    },
    [likedArtists]
  )

  const {
    data: artists,
    loading,
    hasMore,
    sentinelRef,
    reset,
  } = useIntersectionLoadMore<ArtistListItem>(fetchArtistPage, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    if (!active) {
      return
    }

    if (!hasActivatedRef.current) {
      hasActivatedRef.current = true
    }

    if (userId && !likedArtistsLoaded && !likedArtistsLoading) {
      void fetchLikedArtists()
    }

    reset()
  }, [
    active,
    fetchLikedArtists,
    likedArtists,
    likedArtistsLoaded,
    likedArtistsLoading,
    reset,
    userId,
  ])

  if (!active && artists.length === 0) {
    return null
  }

  if (
    (likedArtistsLoading || (!likedArtistsLoaded && !!userId)) &&
    artists.length === 0
  ) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        正在加载已收藏艺人...
      </div>
    )
  }

  if (!likedArtistsLoading && likedArtistsLoaded && artists.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        暂无艺人内容
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='3xl:grid-cols-7 grid grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6'>
        {artists.map(artist => (
          <ArtistCover
            key={artist.id}
            artistCoverUrl={artist.picUrl}
            artistName={artist.name}
            rounded='full'
            onClickCover={() => navigate(`/artists/${artist.id}`)}
          />
        ))}
      </div>

      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-16 items-center justify-center text-sm'
      >
        {loading ? '正在加载更多艺人...' : null}
        {!loading && !hasMore && artists.length > 0 ? '没有更多艺人了' : null}
      </div>
    </div>
  )
}

export default LibraryArtistPanel
