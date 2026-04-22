import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react'
import DailyFeatureCard from './components/DailyFeatureCard'
import HomeFmFeatureCard from './components/HomeFmFeatureCard'
import {
  fmTrash,
  getPersonalFm,
  getPersonalizedNewSong,
  getRecommendSongs,
  getTopArtists,
} from '@/api/list'
import { toast } from 'sonner'
import { usePlaybackStore } from '@/stores/playback-store'
import { useDailySongs } from '@/stores/useDailySongs'
import TopArtists from './components/TopArtists'
import NewAlbumList from './components/NewAlbumList'
import { getAlbumDetail, getAlbumNewSet } from '@/api/album'
import NewSongsList from './components/NewSongsList'
import { HomeFeatureSkeleton } from './components/HomeSkeletons'
import type { AlbumSummary, ArtistSummary, HomeFmData, NewSong } from './types'
import { useNavigate } from 'react-router-dom'
import {
  normalizeHomeDailyTracks,
  normalizeHomeFmTrack,
  normalizeHomeNewSongTracks,
} from './model'
import { useScrollToTopOnActive } from '@/hooks/useScrollToTopOnActive'
import { normalizeAlbumTracks } from '../Albums/Detail/album-detail.model'

const Home = () => {
  useScrollToTopOnActive()

  const [featureLoading, setFeatureLoading] = useState(true)
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [albumsLoading, setAlbumsLoading] = useState(true)
  const [newSongsLoading, setNewSongsLoading] = useState(true)
  const [fmActionLoading, setFmActionLoading] = useState(false)
  const [fmData, setFmData] = useState<HomeFmData>({})
  const setDailyList = useDailySongs(state => state.setList)
  const dailyList = useDailySongs(state => state.list)
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const [topArtists, setTopArtists] = useState<ArtistSummary[]>([])
  const [albumNewSet, setAlbumNewSet] = useState<AlbumSummary[]>([])
  const [newSongs, setNewSongs] = useState<NewSong[]>([])
  const navigate = useNavigate()
  const fecthTopArtists = useEffectEvent(async () => {
    try {
      setArtistsLoading(true)
      const data = await getTopArtists({ offset: 1 })
      setTopArtists(data.data?.artists || [])
    } catch (error) {
      console.log(error)
    } finally {
      setArtistsLoading(false)
    }
  })

  const fetchTopData = useEffectEvent(async () => {
    try {
      setFeatureLoading(true)
      const [fmResponse, dailyResponse] = await Promise.all([
        getPersonalFm({ timestamp: Date.now() }),
        getRecommendSongs(),
      ])
      setDailyList(dailyResponse.data.data?.dailySongs || [])
      setFmData(fmResponse.data?.data?.[0] || {})
    } catch (error) {
      console.log('fetchPersonalFm:', error)
      toast.error('私人 FM 加载失败')
    } finally {
      setFeatureLoading(false)
    }
  })

  const fetchAlbumData = useEffectEvent(async () => {
    try {
      setAlbumsLoading(true)
      const data = await getAlbumNewSet()
      setAlbumNewSet(data.data?.albums || [])
    } catch (error) {
      console.log('fetchAlbumData:', error)
    } finally {
      setAlbumsLoading(false)
    }
  })

  const fetchNewSongsData = useEffectEvent(async () => {
    try {
      setNewSongsLoading(true)
      const data = await getPersonalizedNewSong(20)
      setNewSongs(data.data?.result || [])
    } catch (error) {
      console.log('fetchNewSongsData:', error)
    } finally {
      setNewSongsLoading(false)
    }
  })

  const topOneSong = useMemo(() => {
    return dailyList[0] || {}
  }, [dailyList])
  const fmTrack = useMemo(() => normalizeHomeFmTrack(fmData), [fmData])
  const dailyPlaybackQueue = useMemo(
    () => normalizeHomeDailyTracks(dailyList),
    [dailyList]
  )
  const newSongPlaybackQueue = useMemo(
    () => normalizeHomeNewSongTracks(newSongs),
    [newSongs]
  )

  const handleOpenDailySongs = useCallback(() => {
    navigate('/daily-songs')
  }, [navigate])

  const handlePlayDailySongs = useCallback(() => {
    if (!dailyPlaybackQueue.length) {
      toast.error('暂无可播放的每日推荐')
      return
    }

    playQueueFromIndex(dailyPlaybackQueue, 0)
  }, [dailyPlaybackQueue, playQueueFromIndex])

  const handlePlayNewSong = useCallback(
    (song: NewSong) => {
      const startIndex = newSongPlaybackQueue.findIndex(
        track => track.id === song.id
      )

      if (startIndex < 0) {
        toast.error('暂无可播放的新歌')
        return
      }

      playQueueFromIndex(newSongPlaybackQueue, startIndex)
    },
    [newSongPlaybackQueue, playQueueFromIndex]
  )

  const handlePlayAlbum = useCallback(
    async (album: AlbumSummary) => {
      if (!album.id) {
        return
      }

      try {
        const response = await getAlbumDetail(album.id)
        const tracks = normalizeAlbumTracks(response.data, {
          fallbackCoverUrl: album.picUrl,
        })

        if (!tracks.length) {
          toast.error('暂无可播放的专辑歌曲')
          return
        }

        playQueueFromIndex(tracks, 0)
      } catch (error) {
        console.error('play album failed', error)
        toast.error('专辑歌曲加载失败')
      }
    },
    [playQueueFromIndex]
  )

  const fetchNextFmTrack = useCallback(
    async (autoPlay: boolean) => {
      const response = await getPersonalFm({ timestamp: Date.now() })
      const nextFmData = response.data?.data?.[0] || {}
      const nextFmTrack = normalizeHomeFmTrack(nextFmData)

      setFmData(nextFmData)

      if (autoPlay && nextFmTrack) {
        playQueueFromIndex([nextFmTrack], 0)
      }
    },
    [playQueueFromIndex]
  )

  const handleMoveToNextFm = useCallback(
    async (autoPlay: boolean) => {
      if (fmActionLoading) {
        return
      }

      setFmActionLoading(true)

      try {
        await fetchNextFmTrack(autoPlay)
      } catch (error) {
        console.error('fetch next personal fm failed', error)
        toast.error('私人 FM 加载失败')
      } finally {
        setFmActionLoading(false)
      }
    },
    [fetchNextFmTrack, fmActionLoading]
  )

  const handleTrashCurrentFm = useCallback(
    async (trackId: number, autoPlay: boolean) => {
      if (fmActionLoading) {
        return
      }

      setFmActionLoading(true)

      try {
        await fmTrash({ id: trackId })
        await fetchNextFmTrack(autoPlay)
      } catch (error) {
        console.error('trash personal fm failed', error)
        toast.error('移除私人 FM 失败')
      } finally {
        setFmActionLoading(false)
      }
    },
    [fetchNextFmTrack, fmActionLoading]
  )

  useEffect(() => {
    void fetchTopData()
    void fecthTopArtists()
    void fetchAlbumData()
    void fetchNewSongsData()
  }, [])
  return (
    <div>
      {featureLoading ? (
        <HomeFeatureSkeleton />
      ) : (
        <div className='grid w-full grid-cols-2 gap-10'>
          <DailyFeatureCard
            isLoading={featureLoading}
            coverUrl={topOneSong?.al?.picUrl}
            id={topOneSong?.id || 0}
            onPlay={handlePlayDailySongs}
            onOpenDailySongs={handleOpenDailySongs}
          />
          <HomeFmFeatureCard
            track={fmTrack}
            isLoading={featureLoading}
            actionLoading={fmActionLoading}
            onMoveToNext={handleMoveToNextFm}
            onTrashCurrent={handleTrashCurrentFm}
          />
        </div>
      )}
      <TopArtists isLoading={artistsLoading} list={topArtists} />
      <NewSongsList
        isLoading={newSongsLoading}
        list={newSongs}
        onPlaySong={handlePlayNewSong}
      />
      <NewAlbumList
        isLoading={albumsLoading}
        list={albumNewSet}
        onPlayAlbum={handlePlayAlbum}
      />
    </div>
  )
}

export default Home
