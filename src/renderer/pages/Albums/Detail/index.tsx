import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { toast } from 'sonner'

import { getAlbumDetail, toggleAlbumSubscription } from '@/api/album'
import TrackList from '@/components/TrackList'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'

import AlbumDetailHero from './components/AlbumDetailHero'
import AlbumDetailSkeleton from './components/AlbumDetailSkeleton'
import {
  EMPTY_ALBUM_DETAIL_STATE,
  normalizeAlbumDetailHero,
  normalizeAlbumTracks,
  toAlbumListItem,
  type AlbumDetailPageState,
} from './album-detail.model'

const AlbumDetail = () => {
  const { id } = useParams()
  const albumId = Number(id)
  const [state, setState] = useState<AlbumDetailPageState>(
    EMPTY_ALBUM_DETAIL_STATE
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [likeLoading, setLikeLoading] = useState(false)
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const likedAlbumsLoaded = useUserStore(state => state.likedAlbumsLoaded)
  const fetchLikedAlbums = useUserStore(state => state.fetchLikedAlbums)
  const toggleLikedAlbum = useUserStore(state => state.toggleLikedAlbum)
  const isLiked = useUserStore(state =>
    albumId ? state.likedAlbumIds.has(albumId) : false
  )

  useEffect(() => {
    if (!hasHydrated || !userId || likedAlbumsLoaded) {
      return
    }

    void fetchLikedAlbums()
  }, [fetchLikedAlbums, hasHydrated, likedAlbumsLoaded, userId])

  useEffect(() => {
    if (!albumId) {
      setLoading(false)
      setError('无效的专辑 ID')
      return
    }

    let isActive = true

    const fetchAlbumDetail = async () => {
      setLoading(true)
      setError('')
      setState(EMPTY_ALBUM_DETAIL_STATE)

      try {
        const response = await getAlbumDetail(albumId)

        if (!isActive) {
          return
        }

        setState({
          hero: normalizeAlbumDetailHero(response.data),
          tracks: normalizeAlbumTracks(response.data),
        })
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('album detail fetch failed', fetchError)
        setError('专辑详情加载失败，请稍后重试')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchAlbumDetail()

    return () => {
      isActive = false
    }
  }, [albumId])

  const handleToggleLikedAlbum = async () => {
    if (!hasHydrated || !userId) {
      openLoginDialog('email')
      return
    }

    if (!state.hero || likeLoading) {
      return
    }

    const nextLiked = !isLiked

    setLikeLoading(true)

    try {
      await toggleAlbumSubscription({
        id: albumId,
        t: nextLiked ? 1 : 0,
      })

      toggleLikedAlbum(albumId, nextLiked, toAlbumListItem(state.hero))
      void fetchLikedAlbums()
    } catch (fetchError) {
      console.error('album subscription toggle failed', fetchError)
      toast.error(
        nextLiked ? '收藏专辑失败，请稍后重试' : '取消收藏失败，请稍后重试'
      )
    } finally {
      setLikeLoading(false)
    }
  }

  if (loading && !state.hero) {
    return <AlbumDetailSkeleton />
  }

  if (error && !state.hero) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          {error}
        </div>
      </section>
    )
  }

  if (!state.hero) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          暂无专辑详情数据
        </div>
      </section>
    )
  }

  return (
    <section className='space-y-10 pb-8'>
      <AlbumDetailHero
        hero={state.hero}
        isLiked={isLiked}
        likeLoading={likeLoading}
        onToggleLiked={handleToggleLikedAlbum}
      />
      <TrackList data={state.tracks} coverUrl={state.hero.coverUrl} />
    </section>
  )
}

export default AlbumDetail
