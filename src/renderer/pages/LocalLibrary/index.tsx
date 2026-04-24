import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { usePlaybackStore } from '@/stores/playback-store'
import { useConfigStore } from '@/stores/config-store'
import { parseLocalMediaUrl } from '../../../shared/local-media.ts'
import { normalizeLocalLibraryRoots } from '../../../shared/config.ts'
import type {
  LocalLibraryAlbumRecord,
  LocalLibraryArtistRecord,
  LocalLibraryEntityType,
  LocalLibraryOverviewSnapshot,
  LocalLibraryTrackDeleteMode,
  LocalLibraryTrackRecord,
} from '../../../shared/local-library.ts'
import LocalLibraryAlbumCard from './components/LocalLibraryAlbumCard'
import LocalLibraryArtistCard from './components/LocalLibraryArtistCard'
import LocalLibraryEmptyState from './components/LocalLibraryEmptyState'
import LocalLibraryOverview from './components/LocalLibraryOverview'
import LocalLibraryTrackList from './components/LocalLibraryTrackList'
import LocalLibraryToolbar from './components/LocalLibraryToolbar'
import {
  buildLocalLibraryAlbumQueryInput,
  buildLocalLibraryArtistQueryInput,
  buildLocalLibraryTrackQueryInput,
  createEmptyLocalLibraryPagedState,
  DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT,
  DEFAULT_LOCAL_LIBRARY_TRACK_QUERY_LIMIT,
  EMPTY_LOCAL_LIBRARY_OVERVIEW,
  EMPTY_LOCAL_LIBRARY_SONG_SCOPE,
  getLocalLibraryEmptyState,
  type LocalLibraryPagedState,
  type LocalLibrarySongScope,
} from './local-library.model'
import {
  buildLocalLibraryPlaybackQueue,
  buildLocalLibraryPlaybackTrack,
  resolveLocalLibraryQueueSourceDescriptor,
} from './local-library-playback.model'

function getLocalLibraryApi() {
  return window.electronLocalLibrary ?? null
}

function mergeTrackItems(
  currentItems: LocalLibraryTrackRecord[],
  nextItems: LocalLibraryTrackRecord[]
) {
  const seenFilePaths = new Set(currentItems.map(track => track.filePath))
  const mergedItems = [...currentItems]

  for (const nextItem of nextItems) {
    if (seenFilePaths.has(nextItem.filePath)) {
      continue
    }

    seenFilePaths.add(nextItem.filePath)
    mergedItems.push(nextItem)
  }

  return mergedItems
}

async function queryAllTrackPages(
  keyword: string,
  scope: LocalLibrarySongScope,
  limit = 200
) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return []
  }

  const tracks: LocalLibraryTrackRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryTracks(
      buildLocalLibraryTrackQueryInput(keyword, scope, offset, limit)
    )

    tracks.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return tracks
}

async function queryAllAlbumPages(keyword: string, limit = 120) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryAlbumRecord[]
  }

  const albums: LocalLibraryAlbumRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryAlbums(
      buildLocalLibraryAlbumQueryInput(keyword, offset, limit)
    )

    albums.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return albums
}

async function queryAllArtistPages(keyword: string, limit = 120) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryArtistRecord[]
  }

  const artists: LocalLibraryArtistRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryArtists(
      buildLocalLibraryArtistQueryInput(keyword, offset, limit)
    )

    artists.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return artists
}

const LocalLibrary = () => {
  useScrollToTopOnRouteEnter()

  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const queueSourceKey = usePlaybackStore(state => state.queueSourceKey)
  const resetPlayback = usePlaybackStore(state => state.resetPlayback)
  const syncQueueFromSource = usePlaybackStore(
    state => state.syncQueueFromSource
  )
  const configuredRoots = useConfigStore(
    state => state.config.localLibraryRoots
  )
  const setConfig = useConfigStore(state => state.setConfig)

  const [overview, setOverview] = useState<LocalLibraryOverviewSnapshot>(
    EMPTY_LOCAL_LIBRARY_OVERVIEW
  )
  const [tracksState, setTracksState] = useState<
    LocalLibraryPagedState<LocalLibraryTrackRecord>
  >(() =>
    createEmptyLocalLibraryPagedState(DEFAULT_LOCAL_LIBRARY_TRACK_QUERY_LIMIT)
  )
  const [albumsState, setAlbumsState] = useState<
    LocalLibraryPagedState<LocalLibraryAlbumRecord>
  >(() =>
    createEmptyLocalLibraryPagedState(
      DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
    )
  )
  const [artistsState, setArtistsState] = useState<
    LocalLibraryPagedState<LocalLibraryArtistRecord>
  >(() =>
    createEmptyLocalLibraryPagedState(
      DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
    )
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [deletingTrackPath, setDeletingTrackPath] = useState<string | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<LocalLibraryEntityType>('songs')
  const [keyword, setKeyword] = useState('')
  // 扫描中持续展示已入库数量，避免首次导入时只有 loading 没有进度感知。
  const [importedTrackCount, setImportedTrackCount] = useState(0)
  const [songScope, setSongScope] = useState<LocalLibrarySongScope>(
    EMPTY_LOCAL_LIBRARY_SONG_SCOPE
  )

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoScanRootKeyRef = useRef<string | null>(null)
  const overviewRequestIdRef = useRef(0)
  const trackQueryRequestIdRef = useRef(0)
  const albumQueryRequestIdRef = useRef(0)
  const artistQueryRequestIdRef = useRef(0)
  const tracksStateRef = useRef(tracksState)

  useEffect(() => {
    tracksStateRef.current = tracksState
  }, [tracksState])

  const resetQueryStates = useCallback(() => {
    setTracksState(
      createEmptyLocalLibraryPagedState(DEFAULT_LOCAL_LIBRARY_TRACK_QUERY_LIMIT)
    )
    setAlbumsState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )
    )
    setArtistsState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )
    )
  }, [])

  const readOverview = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi) {
      return null
    }

    return localLibraryApi.getOverview()
  }, [])

  const loadOverview = useCallback(async () => {
    if (configuredRoots.length === 0) {
      setOverview(EMPTY_LOCAL_LIBRARY_OVERVIEW)
      resetQueryStates()
      setIsLoading(false)
      return EMPTY_LOCAL_LIBRARY_OVERVIEW
    }

    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi) {
      setOverview(EMPTY_LOCAL_LIBRARY_OVERVIEW)
      resetQueryStates()
      setIsLoading(false)
      return EMPTY_LOCAL_LIBRARY_OVERVIEW
    }

    const requestId = ++overviewRequestIdRef.current

    try {
      const nextOverview = await readOverview()
      if (!nextOverview || overviewRequestIdRef.current !== requestId) {
        return null
      }

      setOverview(nextOverview)
      return nextOverview
    } catch (error) {
      console.error('failed to load local library overview', error)
      toast.error('本地乐库加载失败，请稍后重试')
      return null
    } finally {
      if (overviewRequestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [configuredRoots.length, readOverview, resetQueryStates])

  const loadTracks = useCallback(
    async (append: boolean) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi) {
        setTracksState(
          createEmptyLocalLibraryPagedState(
            DEFAULT_LOCAL_LIBRARY_TRACK_QUERY_LIMIT
          )
        )
        return null
      }

      const currentTracksState = tracksStateRef.current
      const offset = append ? currentTracksState.items.length : 0
      if (
        append &&
        (currentTracksState.isLoading ||
          currentTracksState.items.length >= currentTracksState.total)
      ) {
        return null
      }

      const requestId = ++trackQueryRequestIdRef.current

      setTracksState(previousState => ({
        ...previousState,
        isLoading: true,
        ...(append
          ? {}
          : {
              items: [],
              total: 0,
              offset: 0,
              hasLoaded: previousState.hasLoaded,
            }),
      }))

      try {
        const result = await localLibraryApi.queryTracks(
          buildLocalLibraryTrackQueryInput(
            keyword,
            songScope,
            offset,
            currentTracksState.limit
          )
        )

        if (trackQueryRequestIdRef.current !== requestId) {
          return null
        }

        setTracksState(previousState => ({
          ...previousState,
          items: append
            ? mergeTrackItems(previousState.items, result.items)
            : result.items,
          total: result.total,
          offset: result.offset + result.items.length,
          limit: result.limit,
          isLoading: false,
          hasLoaded: true,
        }))

        return result
      } catch (error) {
        console.error('failed to query local library tracks', error)
        toast.error('本地歌曲加载失败，请稍后重试')

        if (trackQueryRequestIdRef.current === requestId) {
          setTracksState(previousState => ({
            ...previousState,
            isLoading: false,
            hasLoaded: true,
          }))
        }

        return null
      }
    },
    [keyword, songScope]
  )

  const loadAlbums = useCallback(async () => {
    const requestId = ++albumQueryRequestIdRef.current

    setAlbumsState(previousState => ({
      ...previousState,
      items: [],
      total: 0,
      offset: 0,
      isLoading: true,
    }))

    try {
      const items = await queryAllAlbumPages(
        keyword,
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )

      if (albumQueryRequestIdRef.current !== requestId) {
        return
      }

      setAlbumsState({
        items,
        total: items.length,
        offset: items.length,
        limit: DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT,
        isLoading: false,
        hasLoaded: true,
      })
    } catch (error) {
      console.error('failed to query local library albums', error)
      toast.error('本地专辑加载失败，请稍后重试')

      if (albumQueryRequestIdRef.current === requestId) {
        setAlbumsState(previousState => ({
          ...previousState,
          isLoading: false,
          hasLoaded: true,
        }))
      }
    }
  }, [keyword])

  const loadArtists = useCallback(async () => {
    const requestId = ++artistQueryRequestIdRef.current

    setArtistsState(previousState => ({
      ...previousState,
      items: [],
      total: 0,
      offset: 0,
      isLoading: true,
    }))

    try {
      const items = await queryAllArtistPages(
        keyword,
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )

      if (artistQueryRequestIdRef.current !== requestId) {
        return
      }

      setArtistsState({
        items,
        total: items.length,
        offset: items.length,
        limit: DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT,
        isLoading: false,
        hasLoaded: true,
      })
    } catch (error) {
      console.error('failed to query local library artists', error)
      toast.error('本地歌手加载失败，请稍后重试')

      if (artistQueryRequestIdRef.current === requestId) {
        setArtistsState(previousState => ({
          ...previousState,
          isLoading: false,
          hasLoaded: true,
        }))
      }
    }
  }, [keyword])

  const loadQueueTracksForSource = useCallback(async (sourceKey: string) => {
    const descriptor = resolveLocalLibraryQueueSourceDescriptor(sourceKey)
    if (!descriptor) {
      return []
    }

    if (descriptor.type === 'artist') {
      return queryAllTrackPages(
        '',
        {
          type: 'artist',
          key: null,
          value: descriptor.artistName,
          artistName: null,
        },
        200
      )
    }

    if (descriptor.type === 'album') {
      return queryAllTrackPages(
        '',
        {
          type: 'album',
          key: null,
          value: descriptor.albumName,
          artistName: descriptor.artistName,
        },
        200
      )
    }

    return queryAllTrackPages('', EMPTY_LOCAL_LIBRARY_SONG_SCOPE, 200)
  }, [])

  const refreshActiveQuery = useCallback(async () => {
    if (activeTab === 'albums') {
      await loadAlbums()
      return
    }

    if (activeTab === 'artists') {
      await loadArtists()
      return
    }

    await loadTracks(false)
  }, [activeTab, loadAlbums, loadArtists, loadTracks])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    const emptyState = getLocalLibraryEmptyState(
      overview,
      configuredRoots.length
    )
    if (emptyState) {
      return
    }

    if (activeTab === 'albums') {
      void loadAlbums()
      return
    }

    if (activeTab === 'artists') {
      void loadArtists()
      return
    }

    void loadTracks(false)
  }, [
    activeTab,
    configuredRoots.length,
    isLoading,
    keyword,
    loadAlbums,
    loadArtists,
    loadTracks,
    overview,
    songScope,
  ])

  const stopProgressPolling = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  const startProgressPolling = useCallback(() => {
    stopProgressPolling()

    progressTimerRef.current = setInterval(() => {
      void readOverview().then(nextOverview => {
        if (!nextOverview) {
          return
        }

        setImportedTrackCount(nextOverview.stats.trackCount)
      })
    }, 300)
  }, [readOverview, stopProgressPolling])

  const runScanFlow = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi || isScanning) {
      return null
    }

    setIsScanning(true)
    setImportedTrackCount(overview.stats.trackCount)
    startProgressPolling()

    try {
      const summary = await localLibraryApi.scan()
      setImportedTrackCount(summary.importedCount)
      await loadOverview()
      await refreshActiveQuery()
      return summary
    } catch (error) {
      console.error('failed to scan local library', error)
      toast.error('本地乐库扫描失败，请稍后重试')
      return null
    } finally {
      stopProgressPolling()
      setIsScanning(false)
    }
  }, [
    isScanning,
    loadOverview,
    overview.stats.trackCount,
    refreshActiveQuery,
    startProgressPolling,
    stopProgressPolling,
  ])

  const handleScan = useCallback(async () => {
    const summary = await runScanFlow()
    if (summary) {
      toast.success('本地乐库扫描完成')
    }
  }, [runScanFlow])

  const handleImportDirectories = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi) {
      toast.error('当前环境不支持本地乐库目录选择')
      return
    }

    if (isScanning) {
      return
    }

    try {
      const selectedDirectories = await localLibraryApi.selectDirectories()
      if (!selectedDirectories.length) {
        return
      }

      const nextRoots = normalizeLocalLibraryRoots([
        ...configuredRoots,
        ...selectedDirectories,
      ])

      // 空态直接导入时同步补齐目录配置，避免用户再绕到设置页重复操作。
      await setConfig('localLibraryRoots', nextRoots)
      await localLibraryApi.syncRoots(nextRoots)
      const summary = await runScanFlow()

      if (summary) {
        toast.success('目录已添加，并已自动导入本地歌曲')
      }
    } catch (error) {
      console.error('failed to import local library directories', error)
      toast.error('导入本地音乐目录失败，请稍后重试')
    }
  }, [configuredRoots, isScanning, runScanFlow, setConfig])

  const emptyState = getLocalLibraryEmptyState(overview, configuredRoots.length)
  const overviewStats = {
    ...overview.stats,
    rootCount: configuredRoots.length,
  }

  useEffect(() => {
    const autoScanRootKey = configuredRoots.join('|')
    if (
      emptyState !== 'not-scanned' ||
      !autoScanRootKey ||
      isLoading ||
      isScanning
    ) {
      return
    }

    if (autoScanRootKeyRef.current === autoScanRootKey) {
      return
    }

    // 同一组目录只自动触发一次首次扫描，避免首扫失败时进入重复拉起的循环。
    autoScanRootKeyRef.current = autoScanRootKey
    void runScanFlow()
  }, [configuredRoots, emptyState, isLoading, isScanning, runScanFlow])

  const handlePlayIndex = useCallback(
    async (
      _tracks: LocalLibraryTrackRecord[],
      startIndex: number,
      sourceKey: string
    ) => {
      const queueTracks = await queryAllTrackPages(keyword, songScope, 200)
      if (!queueTracks.length || startIndex >= queueTracks.length) {
        return
      }

      playQueueFromIndex(
        queueTracks.map(track => buildLocalLibraryPlaybackTrack(track)),
        startIndex,
        sourceKey
      )
    },
    [keyword, playQueueFromIndex, songScope]
  )

  const handleOpenAlbum = useCallback((album: LocalLibraryAlbumRecord) => {
    // 专辑卡片继续复用当前页筛选流，避免为了视觉升级分叉本地乐库交互语义。
    setSongScope({
      type: 'album',
      key: album.id,
      value: album.name,
      artistName: album.artistName,
    })
    setActiveTab('songs')
  }, [])

  const handleOpenArtist = useCallback((artist: LocalLibraryArtistRecord) => {
    // 歌手卡片沿用同一套筛选入口，保证专辑/歌手两个聚合视图的交互成本一致。
    setSongScope({
      type: 'artist',
      key: artist.id,
      value: artist.name,
      artistName: null,
    })
    setActiveTab('songs')
  }, [])

  const executeDeleteTrack = useCallback(
    async (
      track: LocalLibraryTrackRecord,
      mode: LocalLibraryTrackDeleteMode
    ) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi || deletingTrackPath) {
        return
      }

      const currentTrackPath = parseLocalMediaUrl(currentTrack?.sourceUrl ?? '')
      const isDeletingCurrentTrack = currentTrackPath === track.filePath

      setDeletingTrackPath(track.filePath)

      try {
        const result = await localLibraryApi.removeTrack({
          filePath: track.filePath,
          mode,
        })

        if (!result.removed) {
          toast.error('目标歌曲不存在或已被移除')
          return
        }

        await loadOverview()
        await refreshActiveQuery()

        // 本地乐库删除后同步刷新同源播放队列，避免列表和播放队列长期不一致。
        if (
          queueSourceKey &&
          resolveLocalLibraryQueueSourceDescriptor(queueSourceKey) &&
          !(mode === 'library-only' && isDeletingCurrentTrack)
        ) {
          const nextQueueTracks = await loadQueueTracksForSource(queueSourceKey)
          syncQueueFromSource(
            queueSourceKey,
            buildLocalLibraryPlaybackQueue(nextQueueTracks, queueSourceKey)
          )
        }

        // 本地删除要允许当前曲目继续播完，彻底删除才立即打断失效文件引用。
        if (mode === 'permanent' && isDeletingCurrentTrack) {
          resetPlayback()
        }

        toast.success(
          mode === 'permanent' ? '歌曲已彻底删除' : '歌曲已从本地乐库移除'
        )
      } catch (error) {
        console.error('failed to delete local library track', error)
        toast.error(
          mode === 'permanent'
            ? '彻底删除失败，请稍后重试'
            : '本地删除失败，请稍后重试'
        )
      } finally {
        setDeletingTrackPath(null)
      }
    },
    [
      currentTrack?.sourceUrl,
      deletingTrackPath,
      loadOverview,
      loadQueueTracksForSource,
      queueSourceKey,
      refreshActiveQuery,
      resetPlayback,
      syncQueueFromSource,
    ]
  )

  const handleDeleteTrack = useCallback(
    async (
      track: LocalLibraryTrackRecord,
      mode: LocalLibraryTrackDeleteMode
    ) => {
      await executeDeleteTrack(track, mode)
    },
    [executeDeleteTrack]
  )

  const handleRevealTrack = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi?.revealTrack) {
        toast.error('当前环境不支持定位本地歌曲')
        return
      }

      // 歌曲定位统一交给主进程，Windows 下可直接选中文件，其它平台再退化到打开父目录。
      const didReveal = await localLibraryApi.revealTrack(track.filePath)
      if (!didReveal) {
        toast.error('定位歌曲文件失败，请稍后重试')
      }
    },
    []
  )

  return (
    <section className='space-y-8 pb-12'>
      <LocalLibraryOverview stats={overviewStats} />

      {isLoading ? (
        <div className='text-muted-foreground py-12 text-center text-sm'>
          正在加载本地乐库...
        </div>
      ) : emptyState ? (
        <LocalLibraryEmptyState
          state={emptyState}
          isScanning={isScanning}
          importedTrackCount={importedTrackCount}
          onImport={() => void handleImportDirectories()}
          onScan={() => void handleScan()}
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as LocalLibraryEntityType)}
          className='w-full'
        >
          <LocalLibraryToolbar
            activeTab={activeTab}
            keyword={keyword}
            isScanning={isScanning}
            hasSongScopeFilter={songScope.type !== 'all'}
            onKeywordChange={setKeyword}
            onClearSongScope={() =>
              setSongScope(EMPTY_LOCAL_LIBRARY_SONG_SCOPE)
            }
            onScan={() => void handleScan()}
          />

          <TabsContent value='songs' className='pt-3'>
            <LocalLibraryTrackList
              tracks={tracksState.items}
              totalCount={tracksState.total}
              isLoadingMore={tracksState.isLoading && tracksState.hasLoaded}
              queueSourceScope={songScope}
              deletingTrackPath={deletingTrackPath}
              onPlayIndex={(tracks, startIndex, sourceKey) =>
                void handlePlayIndex(tracks, startIndex, sourceKey)
              }
              onRevealTrack={track => void handleRevealTrack(track)}
              onDeleteTrack={(track, mode) =>
                void handleDeleteTrack(track, mode)
              }
              onEndReached={() => void loadTracks(true)}
            />
          </TabsContent>

          <TabsContent value='albums' className='pt-3'>
            <div className='grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'>
              {albumsState.items.map(album => (
                <LocalLibraryAlbumCard
                  key={`${album.id}-${album.name}`}
                  album={album}
                  onOpen={handleOpenAlbum}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value='artists' className='pt-3'>
            <div className='grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'>
              {artistsState.items.map(artist => (
                <LocalLibraryArtistCard
                  key={`${artist.id}-${artist.name}`}
                  artist={artist}
                  onOpen={handleOpenArtist}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </section>
  )
}

export default LocalLibrary
