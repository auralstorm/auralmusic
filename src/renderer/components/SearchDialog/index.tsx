import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { searchResources } from '@/api/search'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { createRendererLogger } from '@/lib/logger'
import { searchSongsWithBuiltinProvider } from '@/services/music-source/builtin-search'
import { useMvDrawerStore } from '@/stores/mv-drawer-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useSearchDialogStore } from '@/stores/search-dialog-store'

import SearchInputBar from './components/SearchInputBar'
import SearchResultList from './components/SearchResultList'
import {
  buildSearchResultTargetPath,
  BUILTIN_SEARCH_SOURCE_IDS,
  createSearchPlatformRequestKey,
  createBuiltinSearchSourceTabs,
  createSystemSearchSourceTab,
  createEmptySearchPlatformStates,
  createSearchResultRowIdentity,
  mergeSearchPlatformPage,
  normalizeBuiltinSearchResults,
  normalizeSearchResults,
  shouldRequestSearchPlatform,
  shouldRequestSearchPlatformNextPage,
  updateSearchPlatformState,
  type SearchResultRowItem,
  type SearchType,
} from './model'
import type { SearchSourceId, SearchSourceTab } from './types'
import { Separator } from '../ui/separator'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350
const searchLogger = createRendererLogger('search')

const SearchDialog = () => {
  const navigate = useNavigate()
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const openMvDrawer = useMvDrawerStore(state => state.openDrawer)
  const open = useSearchDialogStore(state => state.open)
  const setOpen = useSearchDialogStore(state => state.setOpen)
  const toggleDialog = useSearchDialogStore(state => state.toggleDialog)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<SearchType>('song')
  const [error, setError] = useState('')
  const searchSourceTabs = useMemo<SearchSourceTab[]>(() => {
    return type === 'song'
      ? createBuiltinSearchSourceTabs()
      : [createSystemSearchSourceTab()]
  }, [type])
  const [activeSourceId, setActiveSourceId] = useState<SearchSourceId>('wy')
  const [platformStates, setPlatformStates] = useState(
    (): ReturnType<
      typeof createEmptySearchPlatformStates<SearchResultRowItem>
    > =>
      createEmptySearchPlatformStates<SearchResultRowItem>(
        BUILTIN_SEARCH_SOURCE_IDS
      )
  )
  const platformStatesRef = useRef(platformStates)
  const [songSearchSentinelElement, setSongSearchSentinelElement] =
    useState<HTMLDivElement | null>(null)

  const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS)
  const activeQuery = debouncedKeyword.trim()
  const currentSearchSourceTab = useMemo(() => {
    return (
      searchSourceTabs.find(source => source.id === activeSourceId) ??
      searchSourceTabs[0] ??
      createSystemSearchSourceTab()
    )
  }, [activeSourceId, searchSourceTabs])
  const isBuiltinSongSearch = type === 'song'
  const currentPlatformState =
    platformStates[currentSearchSourceTab.id] ??
    createEmptySearchPlatformStates<SearchResultRowItem>([
      currentSearchSourceTab.id,
    ])[currentSearchSourceTab.id]

  useEffect(() => {
    platformStatesRef.current = platformStates
  }, [platformStates])

  useEffect(() => {
    if (!open) {
      return
    }

    setActiveSourceId('wy')
    setPlatformStates(
      createEmptySearchPlatformStates(BUILTIN_SEARCH_SOURCE_IDS)
    )
  }, [open])

  useEffect(() => {
    if (type !== 'song' && activeSourceId !== 'wy') {
      setActiveSourceId('wy')
    }
  }, [activeSourceId, type])

  const fetchRows = useCallback(
    async (offset: number, limit: number) => {
      if (!activeQuery || type === 'song') {
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
        searchLogger.warn('search dialog fetch failed', {
          error: fetchError,
          keyword: activeQuery,
          type,
        })
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
  }, [activeQuery, reset, type])

  const requestBuiltinSongPage = useCallback(
    (sourceTab: SearchSourceTab, page: number) => {
      if (!activeQuery) {
        return
      }

      const requestKey = createSearchPlatformRequestKey(
        sourceTab.id,
        activeQuery,
        page
      )
      const fallbackState =
        createEmptySearchPlatformStates<SearchResultRowItem>([sourceTab.id])[
          sourceTab.id
        ]

      setPlatformStates(current => {
        const previous = current[sourceTab.id] ?? fallbackState
        const isFreshKeyword =
          page <= 1 && previous.keywordSnapshot !== activeQuery

        const nextStates = updateSearchPlatformState(current, sourceTab.id, {
          ...previous,
          keywordSnapshot: page <= 1 ? activeQuery : previous.keywordSnapshot,
          items: isFreshKeyword ? [] : previous.items,
          page: isFreshKeyword ? 0 : previous.page,
          total: isFreshKeyword ? 0 : previous.total,
          hasMore: isFreshKeyword ? false : previous.hasMore,
          requestKey,
          loading: true,
          error: null,
        })
        platformStatesRef.current = nextStates
        return nextStates
      })

      void searchSongsWithBuiltinProvider(sourceTab.id, {
        keyword: activeQuery,
        limit: PAGE_SIZE,
        page,
      })
        .then(response => {
          const nextItems = normalizeBuiltinSearchResults(response, sourceTab)

          setPlatformStates(current => {
            const previous = current[sourceTab.id] ?? fallbackState
            if (previous.requestKey !== requestKey) {
              return current
            }

            const nextStates = updateSearchPlatformState(
              current,
              sourceTab.id,
              mergeSearchPlatformPage(
                previous,
                {
                  keyword: activeQuery,
                  page: response.page,
                  limit: response.limit,
                  total: response.total,
                  items: nextItems,
                  requestKey,
                },
                createSearchResultRowIdentity
              )
            )
            platformStatesRef.current = nextStates
            return nextStates
          })
        })
        .catch(fetchError => {
          searchLogger.warn('builtin search dialog fetch failed', {
            error: fetchError,
            keyword: activeQuery,
            page,
            source: sourceTab.id,
          })

          setPlatformStates(current => {
            const previous = current[sourceTab.id] ?? fallbackState
            if (previous.requestKey !== requestKey) {
              return current
            }

            const nextStates = updateSearchPlatformState(
              current,
              sourceTab.id,
              {
                ...previous,
                keywordSnapshot: activeQuery,
                items: page <= 1 ? [] : previous.items,
                page: page <= 1 ? 0 : previous.page,
                total: page <= 1 ? 0 : previous.total,
                hasMore: false,
                requestKey: null,
                loading: false,
                error: page <= 1 ? '搜索失败，请稍后重试' : null,
                hasSearched: true,
              }
            )
            platformStatesRef.current = nextStates
            return nextStates
          })
        })
    },
    [activeQuery]
  )

  useEffect(() => {
    if (!isBuiltinSongSearch || !activeQuery) {
      return
    }

    const state =
      platformStatesRef.current[currentSearchSourceTab.id] ??
      createEmptySearchPlatformStates<SearchResultRowItem>([
        currentSearchSourceTab.id,
      ])[currentSearchSourceTab.id]
    if (!shouldRequestSearchPlatform(state, activeQuery)) {
      return
    }

    requestBuiltinSongPage(currentSearchSourceTab, 1)
  }, [
    activeQuery,
    currentSearchSourceTab,
    isBuiltinSongSearch,
    requestBuiltinSongPage,
  ])

  const requestNextBuiltinSongPage = useCallback(() => {
    if (!isBuiltinSongSearch || !activeQuery) {
      return
    }

    const state =
      platformStatesRef.current[currentSearchSourceTab.id] ??
      createEmptySearchPlatformStates<SearchResultRowItem>([
        currentSearchSourceTab.id,
      ])[currentSearchSourceTab.id]

    if (!shouldRequestSearchPlatformNextPage(state, activeQuery)) {
      return
    }

    requestBuiltinSongPage(currentSearchSourceTab, state.page + 1)
  }, [
    activeQuery,
    currentSearchSourceTab,
    isBuiltinSongSearch,
    requestBuiltinSongPage,
  ])

  const songSearchSentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSongSearchSentinelElement(node)
  }, [])

  useEffect(() => {
    if (!isBuiltinSongSearch || !songSearchSentinelElement) {
      return
    }

    // 仅内置平台歌曲搜索启用无限滚动，其他类型分页由远端接口/结果面板自行控制。
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          requestNextBuiltinSongPage()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(songSearchSentinelElement)

    return () => {
      observer.unobserve(songSearchSentinelElement)
    }
  }, [
    isBuiltinSongSearch,
    requestNextBuiltinSongPage,
    songSearchSentinelElement,
  ])

  const handleTypeChange = (nextType: SearchType) => {
    setType(nextType)
  }

  const handleSelect = (item: SearchResultRowItem) => {
    if (item.type === 'song' && item.playbackTrack) {
      const queue = currentPlatformState.items.flatMap(row =>
        row.playbackTrack ? [row.playbackTrack] : []
      )
      const selectedIndex = queue.findIndex(track => track.id === item.id)
      playQueueFromIndex(
        queue.length ? queue : [item.playbackTrack],
        Math.max(selectedIndex, 0)
      )
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

  const visibleItems = isBuiltinSongSearch ? currentPlatformState.items : data
  const visibleLoading = isBuiltinSongSearch
    ? currentPlatformState.loading
    : loading
  const visibleHasMore = isBuiltinSongSearch
    ? currentPlatformState.hasMore
    : hasMore
  const visibleError = isBuiltinSongSearch
    ? (currentPlatformState.error ?? '')
    : error

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
          className='sm:max-w-[60vw]: grid h-[60vh] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden rounded-[28px] p-5 md:max-w-[50vw] xl:max-w-[50vw] 2xl:max-w-[50vw]'
          showCloseButton={false}
        >
          <div className='w-full'>
            <SearchInputBar
              value={keyword}
              type={type}
              enhanced={isBuiltinSongSearch}
              activeSourceId={activeSourceId}
              searchSourceTabs={searchSourceTabs}
              onValueChange={setKeyword}
              onTypeChange={handleTypeChange}
              onSourceChange={setActiveSourceId}
            />
            <Separator style={{ marginTop: '15px' }} />
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
            <SearchResultList
              query={activeQuery}
              type={type}
              items={visibleItems}
              loading={visibleLoading}
              hasMore={visibleHasMore}
              error={visibleError}
              sentinelRef={
                isBuiltinSongSearch ? songSearchSentinelRef : sentinelRef
              }
              onSelect={handleSelect}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SearchDialog
