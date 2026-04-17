import { EllipsisIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoriesPanel from './CategoriesPanel'
import CoverCard from '@/components/CoverCard'
import { geTopPlayList } from '@/api/list'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { AllPlayListSkeleton } from '../PlayListSkeletons'

const SHOW_CAT_COUNT = 8

interface PlayListItem {
  id: string
  name: string
  coverImgUrl?: string
  count?: number
}

interface PlaylistCategoryItem {
  name: string
  category?: number
  [key: string]: unknown
}

interface PlaylistCategories {
  sub: PlaylistCategoryItem[]
  categories?: Record<string, string>
  [key: string]: unknown
}

const AllPlaylist = ({
  categories = { sub: [] },
}: {
  categories?: PlaylistCategories
}) => {
  const navigate = useNavigate()
  const [isShow, setIsShow] = useState(false)
  const [cat, setCat] = useState<string | null>(null)

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
  } = useIntersectionLoadMore<PlayListItem>(fetchPlayListData, {
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

  const handlePlay = () => {
    console.log('play')
  }

  const handleOpen = (playlistId: number | string) => {
    navigate(`/playlist/${playlistId}`)
  }

  const onClickMore = () => {
    setIsShow(!isShow)
  }

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

      {loading ? (
        <AllPlayListSkeleton />
      ) : (
        <div className='3xl:grid-cols-6 4xl:grid-cols-7 grid grid-cols-4 gap-6 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5'>
          {playLists.map(item => (
            <CoverCard
              isResize={false}
              key={item.id}
              data={item}
              onOpen={handleOpen}
              onPlay={handlePlay}
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
