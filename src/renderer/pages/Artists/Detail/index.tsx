import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  followArtist,
  getArtistAlbums,
  getArtistDesc,
  getArtistDetail,
  getArtistMvs,
  getArtistTopSongs,
  getSimilarArtists,
} from '@/api/artist'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { useAuthStore } from '@/stores/auth-store'
import { useUserStore } from '@/stores/user'
import ArtistDetailSkeleton from './components/ArtistDetailSkeleton'
import ArtistHero from './components/ArtistHero'
import ArtistLatestRelease from './components/ArtistLatestRelease'
import ArtistMediaTabs from './components/ArtistMediaTabs'
import ArtistTopSongs from './components/ArtistTopSongs'
import {
  resolveArtistAlbumImages,
  resolveArtistMvImages,
  resolveArtistProfileImage,
  resolveSimilarArtistImages,
} from './artist-image-cache'
import {
  EMPTY_ARTIST_DESCRIPTION,
  normalizeSimilarArtists,
  toArtistListItem,
  type ArtistAlbumItem,
  type ArtistDescPayload,
  type ArtistDetailPageState,
  type ArtistDetailProfile,
  type ArtistMvItem,
  type ArtistTopSongItem,
  type ArtistDetailResponse,
} from '../artist-detail.model'

const INITIAL_STATE: ArtistDetailPageState = {
  profile: null,
  topSongs: [],
  description: EMPTY_ARTIST_DESCRIPTION,
  similarArtists: [],
}

const PAGE_SIZE = 12

interface RawArtistProfile {
  id?: number
  name?: string
  cover?: string
  avatar?: string
  picUrl?: string
  img1v1Url?: string
  musicSize?: number
  albumSize?: number
  mvSize?: number
  identifyTag?: string[]
}

interface RawIdentify {
  imageDesc?: string
  identityName?: string
}

interface RawArtistDetailPayload {
  artist?: RawArtistProfile
  identify?: RawIdentify
}

interface RawSongArtist {
  id?: number
  name?: string
}

interface RawSongAlbum {
  name?: string
  picUrl?: string
}

interface RawTopSong {
  id: number
  name?: string
  alia?: string[]
  tns?: string[]
  dt?: number
  al?: RawSongAlbum
  album?: RawSongAlbum
  ar?: RawSongArtist[]
}

interface RawArtistAlbum {
  id: number
  name?: string
  picUrl?: string
  blurPicUrl?: string
  publishTime?: number
  size?: number
}

interface RawArtistMv {
  id?: number
  vid?: number
  name?: string
  imgurl16v9?: string
  cover?: string
  publishTime?: string
  playCount?: number
}

interface RawDescSection {
  ti?: string
  txt?: string
}

interface RawArtistDescResponse {
  briefDesc?: string
  introduction?: RawDescSection[]
}

function unwrapPayload<T>(
  response: ArtistDetailResponse<T> | null | undefined
): T | null {
  if (!response?.data) {
    return null
  }

  if (
    typeof response.data === 'object' &&
    response.data !== null &&
    'data' in response.data
  ) {
    return (response.data as { data?: T }).data ?? null
  }

  return response.data as T
}

function normalizeArtistProfile(
  response: ArtistDetailResponse<RawArtistDetailPayload>
): ArtistDetailProfile | null {
  const payload = unwrapPayload(response) || {}
  const artist = payload.artist || {}

  if (!artist.id) {
    return null
  }

  return {
    id: artist.id,
    name: artist.name || '未知歌手',
    coverUrl:
      artist.cover || artist.avatar || artist.picUrl || artist.img1v1Url || '',
    musicSize: artist.musicSize || 0,
    albumSize: artist.albumSize || 0,
    mvSize: artist.mvSize || 0,
    identity:
      payload.identify?.imageDesc ||
      payload.identify?.identityName ||
      artist.identifyTag?.[0] ||
      '艺人',
  }
}

function normalizeTopSongs(
  response: ArtistDetailResponse<{ songs?: RawTopSong[] }>
): ArtistTopSongItem[] {
  const payload = unwrapPayload(response)
  return (payload?.songs || []).map(song => ({
    id: song.id,
    name: song.name || '未知歌曲',
    subtitle: song.alia?.[0] || song.tns?.[0] || '',
    duration: song.dt || 0,
    albumName: song.al?.name || '',
    coverUrl: song.al?.picUrl || song.album?.picUrl || '',
    artists: (song.ar || []).map(artist => ({
      id: artist.id,
      name: artist.name || '未知歌手',
    })),
  }))
}

function normalizeAlbums(
  response: ArtistDetailResponse<{
    hotAlbums?: RawArtistAlbum[]
    albums?: RawArtistAlbum[]
  }>
): ArtistAlbumItem[] {
  const payload = unwrapPayload(response)
  return (payload?.hotAlbums || payload?.albums || []).map(album => ({
    id: album.id,
    name: album.name || '未知专辑',
    picUrl: album.picUrl || album.blurPicUrl || '',
    publishTime: album.publishTime,
    size: album.size,
  }))
}

function normalizeMvs(
  response: ArtistDetailResponse<{ mvs?: RawArtistMv[] }>
): ArtistMvItem[] {
  const payload = unwrapPayload(response)
  return (payload?.mvs || []).map(mv => ({
    id: mv.id || mv.vid || 0,
    name: mv.name || '未知 MV',
    coverUrl: mv.imgurl16v9 || mv.cover || '',
    publishTime: mv.publishTime,
    playCount: mv.playCount,
  }))
}

function normalizeDescription(
  response: ArtistDetailResponse<RawArtistDescResponse>
): ArtistDescPayload {
  const payload = unwrapPayload(response) || {}
  const briefDesc = (payload.briefDesc || '').trim()
  const sections = (payload.introduction || [])
    .map(item => ({
      title: item.ti || '',
      content: (item.txt || '').trim(),
    }))
    .filter(section => Boolean(section.content))

  const summary =
    briefDesc || sections.map(section => section.content).join('\n\n')

  return {
    summary,
    sections,
  }
}

function getHeroSummary(description: ArtistDescPayload) {
  const source = description.summary || description.sections[0]?.content || ''
  if (!source) {
    return ''
  }

  return source.length > 180 ? `${source.slice(0, 180)}...` : source
}

const ArtistDetail = () => {
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

  const navigateToAlbumDetail = (albumId: number) => {
    if (!albumId) return
    navigate(`/albums/${albumId}`)
  }

  const navigateToMvDetail = (mvId: number) => {
    if (!mvId) return
    navigate(`/mv/${mvId}`)
  }

  const navigateToArtistDetail = (nextArtistId: number) => {
    if (!nextArtistId) return
    navigate(`/artists/${nextArtistId}`)
  }

  const fetchAlbumsPage = useCallback(
    async (offset: number, limit: number) => {
      if (!artistId) {
        return { list: [], hasMore: false }
      }

      const response = await getArtistAlbums({ id: artistId, limit, offset })
      const albums = normalizeAlbums(response)
      const resolvedAlbums = await resolveArtistAlbumImages(
        window.electronCache,
        albums
      )

      return {
        list: resolvedAlbums,
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
      const mvs = normalizeMvs(response)
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
      setError('无效的歌手 ID')
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
            getArtistTopSongs({ id: artistId }),
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
          topSongs: normalizeTopSongs(topSongsResponse),
          description: normalizeDescription(descResponse),
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

  const handleToggleFollowedArtist = async () => {
    if (!hasHydrated || !userId) {
      openLoginDialog('email')
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
        nextFollowed ? '关注歌手失败，请稍后重试' : '取消关注失败，请稍后重试'
      )
    } finally {
      setFollowLoading(false)
    }
  }

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
          暂无歌手详情数据
        </div>
      </section>
    )
  }

  return (
    <section className='space-y-10 pb-8'>
      <ArtistHero
        profile={state.profile}
        summary={getHeroSummary(state.description)}
        isFollowed={isFollowed}
        followLoading={followLoading}
        onToggleFollowedArtist={handleToggleFollowedArtist}
      />
      <ArtistLatestRelease
        latestRelease={latestRelease}
        albumsLoading={albumsLoading}
        mvsLoading={mvsLoading}
        onToAlbumDetail={navigateToAlbumDetail}
        onToMvDetail={navigateToMvDetail}
      />
      <ArtistTopSongs songs={state.topSongs} />
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
