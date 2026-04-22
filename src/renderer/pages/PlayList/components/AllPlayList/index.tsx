import { EllipsisIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoriesPanel from './CategoriesPanel'
import { geTopPlayList, getPlaylistTracks } from '@/api/list'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { AllPlayListSkeleton } from '../PlayListSkeletons'
import { shouldShowInitialPlaylistSkeleton } from './playlist-loading.model'
import ArtistCover from '@/components/ArtistCover'
import { usePlaybackStore } from '@/stores/playback-store'
import { toast } from 'sonner'
import { createPlaylistQueueSourceKey } from '../../../../../shared/playback.ts'
import {
  buildPlaylistPlaybackTracksRequest,
  normalizePlaylistPlaybackQueue,
} from './playlist-playback.model'
import type { AllPlaylistProps, PlaylistItem } from '../../types'

const SHOW_CAT_COUNT = 8

const AllPlaylist = ({ categories = { sub: [] } }: AllPlaylistProps) => {
  const navigate = useNavigate()
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const [isShow, setIsShow] = useState(false)
  const [cat, setCat] = useState<string | null>(null)
  const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(
    null
  )

  const topCategories = useMemo(() => {
    const data = categories?.sub?.slice(0, SHOW_CAT_COUNT) || []
    return [{ name: '全部' }, ...data]
  }, [categories.sub])

  const fetchPlayListData = useCallback(
    async (offset: number, limit: number) => {
      const response = await geTopPlayList({
        cat: cat || '全部',
        limit,
        offset,
      })
      return {
        list: response.data?.playlists || [],
        hasMore: response.data?.more ?? false,
      }
    },
    [cat]
  )

  const {
    data: playLists,
    loading,
    sentinelRef,
    reset,
  } = useIntersectionLoadMore<PlaylistItem>(fetchPlayListData, {
    limit: 50,
  })

  useEffect(() => {
    reset()
  }, [cat, reset])

  const handleCategoryChange = (categoryName: string) => {
    const nextCategory = categoryName === '全部' ? null : categoryName
    setCat(nextCategory)
    setIsShow(false)
  }

  const handlePlay = async (playListId: number) => {
    if (playingPlaylistId !== null) {
      return
    }

    setPlayingPlaylistId(playListId)

    try {
      const response = await getPlaylistTracks(
        buildPlaylistPlaybackTracksRequest(playListId)
      )
      const queue = normalizePlaylistPlaybackQueue(response.data)

      if (!queue.length) {
        toast.error('暂无可播放的歌单歌曲')
        return
      }

      playQueueFromIndex(queue, 0, createPlaylistQueueSourceKey(playListId))
    } catch (error) {
      console.error('playlist play failed', error)
      toast.error('歌单播放失败，请稍后重试')
    } finally {
      setPlayingPlaylistId(null)
    }
  }

  const handleOpen = (playlistId: number | string) => {
    navigate(`/playlist/${playlistId}`)
  }

  const onClickMore = () => {
    setIsShow(!isShow)
  }
  const showInitialSkeleton = shouldShowInitialPlaylistSkeleton(
    loading,
    playLists.length
  )

  return (
    <div className='relative'>
      <div className='mt-5 mb-5 flex items-center'>
        {topCategories.map((topCat, index) => (
          <span
            className={`hover:bg-primary/20 cursor-pointer rounded px-3 py-2 text-center text-[16px] transition-colors ${
              (topCat.name === '全部' && cat === null) || topCat.name === cat
                ? 'bg-primary/20 font-semibold'
                : ''
            }`}
            key={index}
            onClick={() => handleCategoryChange(topCat.name)}
          >
            {topCat?.name || '未知分类'}
          </span>
        ))}
        <span
          className='hover:bg-primary/20 cursor-pointer rounded px-3 py-2 text-center transition-colors'
          onClick={onClickMore}
        >
          <EllipsisIcon />
        </span>
      </div>
      {isShow && (
        <CategoriesPanel
          className='tp-0 l-0 r-0 absolute z-20'
          categoryData={categories}
          currentCat={cat}
          onSelect={handleCategoryChange}
        />
      )}

      {showInitialSkeleton ? (
        <AllPlayListSkeleton />
      ) : (
        <div className='3xl:grid-cols-6 4xl:grid-cols-7 grid grid-cols-4 gap-6 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5'>
          {playLists.map(item => (
            <ArtistCover
              key={item.id}
              onClickCover={() => handleOpen(item.id)}
              onPlay={() => void handlePlay(item.id)}
              artistName={item.name}
              artistCoverUrl={item.coverImgUrl}
            />
          ))}
        </div>
      )}

      <div
        ref={sentinelRef}
        className='flex h-20 items-center justify-center'
      />
    </div>
  )
}

export default AllPlaylist
