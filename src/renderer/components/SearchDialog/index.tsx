import { useCallback, useEffect, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { searchResources } from '@/api/search'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { useMvDrawerStore } from '@/stores/mv-drawer-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useSearchDialogStore } from '@/stores/search-dialog-store'

import SearchInputBar from './components/SearchInputBar'
import SearchResultList from './components/SearchResultList'
import {
  buildSearchResultTargetPath,
  normalizeSearchResults,
  type SearchResultRowItem,
  type SearchType,
} from './search-dialog.model'
import { Separator } from '../ui/separator'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350

const SearchDialog = () => {
  const navigate = useNavigate()
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const openMvDrawer = useMvDrawerStore(state => state.openDrawer)
  const open = useSearchDialogStore(state => state.open)
  const setOpen = useSearchDialogStore(state => state.setOpen)
  const toggleDialog = useSearchDialogStore(state => state.toggleDialog)
  const [keyword, setKeyword] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [type, setType] = useState<SearchType>('song')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveQuery(keyword.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [keyword])

  const fetchRows = useCallback(
    async (offset: number, limit: number) => {
      if (!activeQuery) {
        return { list: [], hasMore: false }
      }

      try {
        setError('')
        const response = await searchResources({
          keywords: activeQuery,
          type,
          offset,
          limit,
        })
        const list = normalizeSearchResults(response.data, type)

        return {
          list,
          hasMore: list.length >= limit,
        }
      } catch (fetchError) {
        console.error('search dialog fetch failed', fetchError)
        setError('搜索失败，请稍后重试')
        return {
          list: [],
          hasMore: false,
        }
      }
    },
    [activeQuery, type]
  )

  const { data, loading, hasMore, sentinelRef, reset } =
    useIntersectionLoadMore<SearchResultRowItem>(fetchRows, {
      limit: PAGE_SIZE,
    })

  useEffect(() => {
    setError('')
    reset()
  }, [activeQuery, type, reset])

  const handleTypeChange = (nextType: SearchType) => {
    setType(nextType)

    if (keyword.trim()) {
      setActiveQuery(keyword.trim())
    }
  }

  const handleSelect = (item: SearchResultRowItem) => {
    if (item.type === 'song' && item.playbackTrack) {
      playQueueFromIndex([item.playbackTrack], 0)
      setOpen(false)
      return
    }

    if (item.type === 'mv') {
      openMvDrawer(item.targetId)
      setOpen(false)
      return
    }

    const targetPath = buildSearchResultTargetPath(item.type, item.targetId)
    if (targetPath) {
      setOpen(false)
      navigate(targetPath)
    }
  }

  return (
    <>
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        className='window-no-drag mr-3 cursor-pointer rounded-full'
        aria-label='显示或隐藏搜索'
        onClick={toggleDialog}
      >
        <SearchIcon className='size-5' />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className='grid h-[60vh] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden rounded-[28px] p-5 xl:max-w-[35vw] 2xl:max-w-[30vw]'
          showCloseButton={false}
        >
          {/* <DialogTitle className='sr-only'>搜索</DialogTitle> */}
          <div className='w-full'>
            <SearchInputBar
              value={keyword}
              type={type}
              onValueChange={setKeyword}
              onTypeChange={handleTypeChange}
            />
            <Separator style={{ marginTop: '15px' }} />
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
            <SearchResultList
              query={activeQuery}
              type={type}
              items={data}
              loading={loading}
              hasMore={hasMore}
              error={error}
              sentinelRef={sentinelRef}
              onSelect={handleSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SearchDialog
