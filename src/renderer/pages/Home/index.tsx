import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import DailyFeatureCard from './components/DailyFeatureCard'
import FmFeatureCard from './components/FmFeatureCard'
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
import type {
  AlbumSummary,
  ArtistSummary,
  HomeFmData,
  NewSong,
} from './home.type'
import { useNavigate } from 'react-router-dom'
import {
  normalizeHomeDailyTracks,
  normalizeHomeFmTrack,
  normalizeHomeNewSongTracks,
} from './home.model'
import type { PlaybackTrack } from '../../../shared/playback.ts'
import { normalizeAlbumTracks } from '../Albums/Detail/album-detail.model'

const Home = () => {
  const [featureLoading, setFeatureLoading] = useState(true)
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [albumsLoading, setAlbumsLoading] = useState(true)
  const [newSongsLoading, setNewSongsLoading] = useState(true)
  const [fmActionLoading, setFmActionLoading] = useState(false)
  const [fmData, setFmData] = useState<HomeFmData>({})
  const setDailyList = useDailySongs(state => state.setList)
  const dailyList = useDailySongs(state => state.list)
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const playbackStatus = usePlaybackStore(state => state.status)
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const togglePlay = usePlaybackStore(state => state.togglePlay)
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

  const topOneSong = dailyList[0] || {}
  const fmTrack = useMemo(() => normalizeHomeFmTrack(fmData), [fmData])
  const dailyPlaybackQueue = useMemo(
    () => normalizeHomeDailyTracks(dailyList),
    [dailyList]
  )
  const newSongPlaybackQueue = useMemo(
    () => normalizeHomeNewSongTracks(newSongs),
    [newSongs]
  )
  const isActiveFm = Boolean(fmTrack && currentTrack?.id === fmTrack.id)
  const isPlayingFm =
    isActiveFm && (playbackStatus === 'playing' || playbackStatus === 'loading')

  const handleOpenDailySongs = () => {
    navigate('/daily-songs')
  }

  const playFmTrack = (track: PlaybackTrack) => {
    playQueueFromIndex([track], 0)
  }

  const handlePlayDailySongs = () => {
    if (!dailyPlaybackQueue.length) {
      toast.error('暂无可播放的每日推荐')
      return
    }

    playQueueFromIndex(dailyPlaybackQueue, 0)
  }

  const handlePlayNewSong = (song: NewSong) => {
    const startIndex = newSongPlaybackQueue.findIndex(
      track => track.id === song.id
    )

    if (startIndex < 0) {
      toast.error('暂无可播放的新歌')
      return
    }

    playQueueFromIndex(newSongPlaybackQueue, startIndex)
  }

  const handlePlayAlbum = async (album: AlbumSummary) => {
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
  }

  const fetchNextFmTrack = async (autoPlay: boolean) => {
    const response = await getPersonalFm({ timestamp: Date.now() })
    const nextFmData = response.data?.data?.[0] || {}
    const nextFmTrack = normalizeHomeFmTrack(nextFmData)

    setFmData(nextFmData)

    if (autoPlay && nextFmTrack) {
      playFmTrack(nextFmTrack)
    }
  }

  const handleToggleFmPlay = () => {
    if (!fmTrack) {
      return
    }

    if (isActiveFm) {
      togglePlay()
      return
    }

    playFmTrack(fmTrack)
  }

  const handleMoveToNextFm = async () => {
    if (!fmTrack || fmActionLoading) {
      return
    }

    setFmActionLoading(true)

    try {
      await fetchNextFmTrack(isPlayingFm)
    } catch (error) {
      console.error('fetch next personal fm failed', error)
      toast.error('私人 FM 加载失败')
    } finally {
      setFmActionLoading(false)
    }
  }

  const handleTrashCurrentFm = async () => {
    if (!fmTrack || fmActionLoading) {
      return
    }

    setFmActionLoading(true)

    try {
      await fmTrash({ id: fmTrack.id })
      await fetchNextFmTrack(isPlayingFm)
    } catch (error) {
      console.error('trash personal fm failed', error)
      toast.error('移除私人 FM 失败')
    } finally {
      setFmActionLoading(false)
    }
  }

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
          <FmFeatureCard
            isLoading={featureLoading}
            coverUrl={fmTrack?.coverUrl}
            title={fmTrack?.name}
            artist={fmTrack?.artistNames}
            isActiveFm={isActiveFm}
            isPlayingFm={isPlayingFm}
            actionLoading={fmActionLoading}
            disabled={!fmTrack}
            onTogglePlay={handleToggleFmPlay}
            moveToNext={handleMoveToNextFm}
            trashCurrent={handleTrashCurrentFm}
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
