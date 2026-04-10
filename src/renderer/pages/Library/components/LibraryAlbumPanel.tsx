import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import AlbumCard from '@/pages/Albums/components/AlbumCard'
import type { AlbumListItem } from '@/pages/Albums/albums.model'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'

interface LibraryAlbumPanelProps {
  active: boolean
}

const PAGE_SIZE = 25

const LibraryAlbumPanel = ({ active }: LibraryAlbumPanelProps) => {
  const navigate = useNavigate()
  const hasActivatedRef = useRef(false)
  const userId = useAuthStore(state => state.user?.userId)
  const likedAlbums = useUserStore(state => state.likedAlbums)
  const likedAlbumsLoaded = useUserStore(state => state.likedAlbumsLoaded)
  const likedAlbumsLoading = useUserStore(state => state.likedAlbumsLoading)
  const fetchLikedAlbums = useUserStore(state => state.fetchLikedAlbums)

  const fetchSubscribedAlbums = useCallback(
    async (offset: number, limit: number) => {
      const list = likedAlbums.slice(offset, offset + limit)

      return {
        list,
        hasMore: offset + list.length < likedAlbums.length,
      }
    },
    [likedAlbums]
  )

  const {
    data: albums,
    loading,
    hasMore,
    sentinelRef,
    reset,
  } = useIntersectionLoadMore<AlbumListItem>(fetchSubscribedAlbums, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    if (!active) {
      return
    }

    if (!hasActivatedRef.current) {
      hasActivatedRef.current = true
    }

    if (userId && !likedAlbumsLoaded && !likedAlbumsLoading) {
      void fetchLikedAlbums()
    }

    reset()
  }, [
    active,
    fetchLikedAlbums,
    likedAlbums,
    likedAlbumsLoaded,
    likedAlbumsLoading,
    reset,
    userId,
  ])

  if (!active && albums.length === 0) {
    return null
  }

  if (
    (likedAlbumsLoading || (!likedAlbumsLoaded && !!userId)) &&
    albums.length === 0
  ) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        正在加载已收藏专辑...
      </div>
    )
  }

  if (!likedAlbumsLoading && likedAlbumsLoaded && albums.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        暂无专辑内容
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6'>
        {albums.map(album => (
          <AlbumCard
            key={album.id}
            album={album}
            onToAlbumDetail={albumId => navigate(`/albums/${albumId}`)}
          />
        ))}
      </div>

      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-16 items-center justify-center text-sm'
      >
        {loading ? '正在加载更多专辑...' : null}
        {!loading && !hasMore && albums.length > 0 ? '没有更多专辑了' : null}
      </div>
    </div>
  )
}

export default LibraryAlbumPanel
