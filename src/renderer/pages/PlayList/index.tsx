import {
  gePlayListCatList,
  geTopPlayList,
  getRecommendPlayList,
  getPlaylistTracks,
} from '@/api/list'
import { useScrollToTopOnActive } from '@/hooks/useScrollToTopOnActive'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { usePlaybackStore } from '@/stores/playback-store'
import { createPlaylistQueueSourceKey } from '../../../shared/playback.ts'
import { OnlinePlaylistFeatureCard } from './components/OnlinePlaylistFeatureCard'
import AllPlayList from './components/AllPlayList'
import {
  OnlinePlaylistFeatureSkeleton,
  AllPlayListSkeleton,
} from './components/PlayListSkeletons'
import {
  buildPlaylistPlaybackTracksRequest,
  normalizePlaylistPlaybackQueue,
} from './components/AllPlayList/playlist-playback.model'
import type { PlaylistPageData } from './types'

const PlayList = () => {
  useScrollToTopOnActive()

  const navigate = useNavigate()
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const [playlistData, setPlaylistData] = useState<PlaylistPageData>({
    recommend: { coverImgUrl: '', id: 0, name: '', picUrl: null },
    hot: { coverImgUrl: '', id: 0, name: '', picUrl: null },
    categories: { sub: [] },
  })
  const [isLoading, setLoading] = useState(false)
  const [playingFeaturePlaylistId, setPlayingFeaturePlaylistId] = useState<
    number | null
  >(null)

  useEffect(() => {
    const fetchHotPlayList = async () => {
      setLoading(true)
      try {
        const recommend = await getRecommendPlayList(1)
        const hot = await geTopPlayList({ limit: 1, order: 'hot' })
        const catList = await gePlayListCatList()
        setPlaylistData({
          recommend: {
            ...recommend.data?.result?.[0],
            coverImgUrl: recommend.data?.result?.[0]?.picUrl,
          },
          hot: hot.data.playlists?.[0],
          categories: catList.data,
        })
      } catch (error) {
        console.log('feachHotPlayList', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchHotPlayList()
  }, [])

  const handleOpenPlaylist = (playlistId: number) => {
    navigate(`/playlist/${playlistId}`)
  }

  const handlePlayFeaturePlaylist = async (playlistId: number) => {
    if (!playlistId || playingFeaturePlaylistId !== null) {
      return
    }

    setPlayingFeaturePlaylistId(playlistId)

    try {
      const response = await getPlaylistTracks(
        buildPlaylistPlaybackTracksRequest(playlistId)
      )
      const queue = normalizePlaylistPlaybackQueue(response.data)

      if (!queue.length) {
        toast.error('暂无可播放的歌单歌曲')
        return
      }

      playQueueFromIndex(queue, 0, createPlaylistQueueSourceKey(playlistId))
    } catch (error) {
      console.error('feature playlist play failed', error)
      toast.error('歌单播放失败，请稍后重试')
    } finally {
      setPlayingFeaturePlaylistId(null)
    }
  }

  return (
    <div className='w-full'>
      {isLoading ? (
        <>
          <OnlinePlaylistFeatureSkeleton />
          <div className='mt-10'>
            <AllPlayListSkeleton />
          </div>
        </>
      ) : (
        <>
          <div className='grid grid-cols-2 gap-5'>
            <OnlinePlaylistFeatureCard
              title='私人雷达'
              card={playlistData.recommend}
              onPlay={handlePlayFeaturePlaylist}
              onOpen={handleOpenPlaylist}
            />
            <OnlinePlaylistFeatureCard
              title='热门歌单'
              card={playlistData.hot}
              onPlay={handlePlayFeaturePlaylist}
              onOpen={handleOpenPlaylist}
            />
          </div>
          <div>
            <AllPlayList categories={playlistData.categories} />
          </div>
        </>
      )}
    </div>
  )
}

export default PlayList
