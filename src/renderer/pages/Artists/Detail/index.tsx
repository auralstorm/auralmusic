import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  followArtist,
  getArtistAlbums,
  getArtistDesc,
  getArtistDetail,
  getArtistMvs,
  getArtistSongs,
  getSimilarArtists,
} from '@/api/artist'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { useAuthStore } from '@/stores/auth-store'
import { useMvDrawerStore } from '@/stores/mv-drawer-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useUserStore } from '@/stores/user'
import ArtistDetailSkeleton from './components/ArtistDetailSkeleton'
import ArtistHero from './components/ArtistHero'
import ArtistLatestRelease from './components/ArtistLatestRelease'
import ArtistMediaTabs from './components/ArtistMediaTabs'
import ArtistTopSongs from './components/ArtistTopSongs'
import {
  EMPTY_ARTIST_DESCRIPTION,
  createArtistTopSongPlaybackQueue,
  getArtistHeroSummary,
  normalizeArtistAlbums,
  normalizeArtistDescription,
  normalizeArtistMvs,
  normalizeArtistProfile,
  normalizeArtistSongs,
  normalizeSimilarArtists,
  resolveArtistMvImages,
  resolveArtistProfileImage,
  resolveSimilarArtistImages,
  toArtistListItem,
} from './model'
import {
  type ArtistAlbumItem,
  type ArtistDetailPageState,
  type ArtistMvItem,
} from './types'

const INITIAL_STATE: ArtistDetailPageState = {
  profile: null,
  topSongs: [],
  description: EMPTY_ARTIST_DESCRIPTION,
  similarArtists: [],
}

const PAGE_SIZE = 12

const ArtistDetail = () => {
  useScrollToTopOnRouteEnter()

  const { id } = useParams()
  const artistId = Number(id)
  const [state, setState] = useState<ArtistDetailPageState>(INITIAL_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [similarArtistsLoading, setSimilarArtistsLoading] = useState(true)
  const userId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const likedArtistsLoaded = useUserStore(state => state.likedArtistsLoaded)
  const fetchLikedArtists = useUserStore(state => state.fetchLikedArtists)
  const toggleFollowed = useUserStore(state => state.toggleFollowed)
  const isFollowed = useUserStore(state =>
    artistId ? state.likedArtistIds.has(artistId) : false
  )
  const [followLoading, setFollowLoading] = useState(false)
  const navigate = useNavigate()
  const openMvDrawer = useMvDrawerStore(state => state.openDrawer)
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)

  const navigateToAlbumDetail = useCallback(
    (albumId: number) => {
      if (!albumId) return
      navigate(`/albums/${albumId}`)
    },
    [navigate]
  )

  const navigateToMvDetail = useCallback(
    (mvId: number) => {
      if (!mvId) return
      openMvDrawer(mvId)
    },
    [openMvDrawer]
  )

  const navigateToArtistDetail = useCallback(
    (nextArtistId: number) => {
      if (!nextArtistId) return
      navigate(`/artists/${nextArtistId}`)
    },
    [navigate]
  )

  const navigateToArtistSongs = useCallback(() => {
    if (!artistId) return
    navigate(`/artists/${artistId}/songs`)
  }, [artistId, navigate])

  const fetchAlbumsPage = useCallback(
    async (offset: number, limit: number) => {
      if (!artistId) {
        return { list: [], hasMore: false }
      }

      const response = await getArtistAlbums({ id: artistId, limit, offset })
      const albums = normalizeArtistAlbums(response)

      return {
        list: albums,
        hasMore: albums.length >= limit,
      }
    },
    [artistId]
  )

  const fetchMvsPage = useCallback(
    async (offset: number, limit: number) => {
      if (!artistId) {
        return { list: [], hasMore: false }
      }

      const response = await getArtistMvs({ id: artistId, limit, offset })
      const mvs = normalizeArtistMvs(response)
      const resolvedMvs = await resolveArtistMvImages(window.electronCache, mvs)

      return {
        list: resolvedMvs,
        hasMore: mvs.length >= limit,
      }
    },
    [artistId]
  )

  const {
    data: albums,
    loading: albumsLoading,
    hasMore: albumHasMore,
    sentinelRef: albumSentinelRef,
    reset: resetAlbums,
  } = useIntersectionLoadMore<ArtistAlbumItem>(fetchAlbumsPage, {
    limit: PAGE_SIZE,
  })

  const {
    data: mvs,
    loading: mvsLoading,
    hasMore: mvHasMore,
    sentinelRef: mvSentinelRef,
    reset: resetMvs,
  } = useIntersectionLoadMore<ArtistMvItem>(fetchMvsPage, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    if (!artistId) {
      return
    }

    resetAlbums()
    resetMvs()
  }, [artistId, resetAlbums, resetMvs])

  useEffect(() => {
    if (!artistId) {
      setLoading(false)
      setSimilarArtistsLoading(false)
      setError('歌手 ID 无效')
      return
    }

    let isActive = true

    const fetchSimilarArtists = async () => {
      setSimilarArtistsLoading(true)

      try {
        const response = await getSimilarArtists({ id: artistId })

        if (!isActive) {
          return
        }

        const similarArtists = await resolveSimilarArtistImages(
          window.electronCache,
          artistId,
          normalizeSimilarArtists(response.data)
        )

        if (!isActive) {
          return
        }

        setState(previous => ({
          ...previous,
          similarArtists,
        }))
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('similar artists fetch failed', fetchError)
      } finally {
        if (isActive) {
          setSimilarArtistsLoading(false)
        }
      }
    }

    const fetchArtistData = async () => {
      setLoading(true)
      setError('')
      setState(INITIAL_STATE)

      try {
        const [detailResponse, topSongsResponse, descResponse] =
          await Promise.all([
            getArtistDetail({ id: artistId }),
            getArtistSongs({
              id: artistId,
              order: 'hot',
              limit: 12,
              offset: 0,
            }),
            getArtistDesc({ id: artistId }),
          ])

        if (!isActive) {
          return
        }

        const profile = await resolveArtistProfileImage(
          window.electronCache,
          normalizeArtistProfile(detailResponse)
        )

        if (!isActive) {
          return
        }

        setState(previous => ({
          ...previous,
          profile,
          topSongs: normalizeArtistSongs(topSongsResponse),
          description: normalizeArtistDescription(descResponse),
        }))
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        console.error('artist detail fetch failed', fetchError)
        setError('歌手详情加载失败，请稍后重试')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchSimilarArtists()
    void fetchArtistData()

    return () => {
      isActive = false
    }
  }, [artistId])

  useEffect(() => {
    if (!hasHydrated || !userId || likedArtistsLoaded) {
      return
    }

    void fetchLikedArtists()
  }, [fetchLikedArtists, hasHydrated, likedArtistsLoaded, userId])

  const latestRelease = useMemo(
    () => ({
      album: albums[0] || null,
      mv: mvs[0] || null,
    }),
    [albums, mvs]
  )

  const topSongPlaybackQueue = useMemo(
    () => createArtistTopSongPlaybackQueue(state.topSongs),
    [state.topSongs]
  )

  const handlePlayArtistTopSongs = useCallback(() => {
    if (topSongPlaybackQueue.length === 0) {
      toast.error('暂无可播放的歌手热门歌曲')
      return
    }

    playQueueFromIndex(topSongPlaybackQueue, 0)
  }, [playQueueFromIndex, topSongPlaybackQueue])

  const handleToggleFollowedArtist = useCallback(async () => {
    if (!hasHydrated || !userId) {
      openLoginDialog()
      return
    }

    if (!state.profile || followLoading) {
      return
    }

    const nextFollowed = !isFollowed

    try {
      setFollowLoading(true)
      await followArtist({ id: artistId, t: nextFollowed ? 1 : 0 })
      toggleFollowed(artistId, nextFollowed, toArtistListItem(state.profile))
      void fetchLikedArtists()
    } catch (fetchError) {
      console.error('artist subscription toggle failed', fetchError)
      toast.error(
        nextFollowed
          ? '关注歌手失败，请稍后重试'
          : '取消关注歌手失败，请稍后重试'
      )
    } finally {
      setFollowLoading(false)
    }
  }, [
    artistId,
    fetchLikedArtists,
    followLoading,
    hasHydrated,
    isFollowed,
    openLoginDialog,
    state.profile,
    toggleFollowed,
    userId,
  ])

  if (loading && !state.profile) {
    return <ArtistDetailSkeleton />
  }

  if (error && !state.profile) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          {error}
        </div>
      </section>
    )
  }

  if (!state.profile) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          暂未获取到歌手信息
        </div>
      </section>
    )
  }

  return (
    <section className='space-y-10 pb-8'>
      <ArtistHero
        profile={state.profile}
        summary={getArtistHeroSummary(state.description)}
        isFollowed={isFollowed}
        followLoading={followLoading}
        onPlay={handlePlayArtistTopSongs}
        onToggleFollowedArtist={handleToggleFollowedArtist}
      />
      <ArtistLatestRelease
        latestRelease={latestRelease}
        albumsLoading={albumsLoading}
        mvsLoading={mvsLoading}
        onToAlbumDetail={navigateToAlbumDetail}
        onToMvDetail={navigateToMvDetail}
      />
      <ArtistTopSongs
        artistId={artistId}
        songs={state.topSongs}
        onViewAll={navigateToArtistSongs}
      />
      <ArtistMediaTabs
        albums={albums}
        mvs={mvs}
        similarArtists={state.similarArtists}
        albumLoading={albumsLoading}
        mvLoading={mvsLoading}
        similarArtistsLoading={similarArtistsLoading}
        albumHasMore={albumHasMore}
        mvHasMore={mvHasMore}
        albumSentinelRef={albumSentinelRef}
        mvSentinelRef={mvSentinelRef}
        onToAlbumDetail={navigateToAlbumDetail}
        onToMvDetail={navigateToMvDetail}
        onToArtistDetail={navigateToArtistDetail}
      />
    </section>
  )
}

export default ArtistDetail
