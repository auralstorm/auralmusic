import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
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
  LocalLibraryPlaylistRecord,
  LocalLibraryTrackDeleteMode,
  LocalLibraryTrackRecord,
} from '../../../shared/local-library.ts'
import LocalLibraryAlbumCard from './components/LocalLibraryAlbumCard'
import LocalLibraryAddToPlaylistDrawer from './components/LocalLibraryAddToPlaylistDrawer'
import LocalLibraryArtistCard from './components/LocalLibraryArtistCard'
import LocalLibraryEmptyState from './components/LocalLibraryEmptyState'
import LocalLibraryOverview from './components/LocalLibraryOverview'
import LocalLibraryPlaylistCard from './components/LocalLibraryPlaylistCard'
import LocalLibraryPlaylistDialog from './components/LocalLibraryPlaylistDialog'
import LocalLibraryTrackList from './components/LocalLibraryTrackList'
import LocalLibraryToolbar from './components/LocalLibraryToolbar'
import {
  getLocalLibraryApi,
  queryAllAlbumPages,
  queryAllArtistPages,
  queryAllPlaylistDetailPages,
  queryAllPlaylistPages,
  queryAllTrackPages,
} from './local-library-queries'
import {
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
  resolveLocalLibraryQueueSourceDescriptor,
} from './local-library-playback.model'

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

const LocalLibrary = () => {
  useScrollToTopOnRouteEnter()
  const navigate = useNavigate()

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
  const showLocalLibraryMenu = useConfigStore(
    state => state.config.showLocalLibraryMenu
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
  const [playlistsState, setPlaylistsState] = useState<
    LocalLibraryPagedState<LocalLibraryPlaylistRecord>
  >(() =>
    createEmptyLocalLibraryPagedState(
      DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
    )
  )
  const [playlistPickerState, setPlaylistPickerState] = useState<
    LocalLibraryPagedState<LocalLibraryPlaylistRecord>
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
  const debouncedKeyword = useDebouncedValue(keyword, 250)
  // 扫描中持续展示已入库数量，避免首次导入时只有 loading 没有进度感知。
  const [importedTrackCount, setImportedTrackCount] = useState(0)
  const [songScope, setSongScope] = useState<LocalLibrarySongScope>(
    EMPTY_LOCAL_LIBRARY_SONG_SCOPE
  )
  const [playlistDialogMode, setPlaylistDialogMode] = useState<
    'create' | 'rename' | null
  >(null)
  const [playlistDialogName, setPlaylistDialogName] = useState('')
  const [playlistDialogError, setPlaylistDialogError] = useState('')
  const [playlistDialogPending, setPlaylistDialogPending] = useState(false)
  const [editingPlaylist, setEditingPlaylist] =
    useState<LocalLibraryPlaylistRecord | null>(null)
  const [playlistDrawerTrack, setPlaylistDrawerTrack] =
    useState<LocalLibraryTrackRecord | null>(null)
  const [playlistDrawerCreateTitle, setPlaylistDrawerCreateTitle] = useState('')
  const [playlistDrawerPendingId, setPlaylistDrawerPendingId] = useState<
    number | null
  >(null)
  const [playlistDrawerCreateSubmitting, setPlaylistDrawerCreateSubmitting] =
    useState(false)

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoScanRootKeyRef = useRef<string | null>(null)
  // 各分区独立请求序号，避免搜索词/标签切换时旧响应覆盖当前列表。
  const overviewRequestIdRef = useRef(0)
  const trackQueryRequestIdRef = useRef(0)
  const albumQueryRequestIdRef = useRef(0)
  const artistQueryRequestIdRef = useRef(0)
  const playlistQueryRequestIdRef = useRef(0)
  const playlistPickerQueryRequestIdRef = useRef(0)
  const tracksStateRef = useRef(tracksState)
  const tabContentMinHeightClass = 'min-h-[520px] md:min-h-[560px]'

  useEffect(() => {
    tracksStateRef.current = tracksState
  }, [tracksState])

  useEffect(() => {
    // 入口隐藏只影响导航可见性，不该打断本地播放；当前页则回到安全路由避免形成孤页。
    if (!showLocalLibraryMenu) {
      navigate('/', { replace: true })
    }
  }, [navigate, showLocalLibraryMenu])

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
    setPlaylistsState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )
    )
    setPlaylistPickerState(
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

      // append 只锁歌曲列表自身，其他分区仍可并行刷新，避免整页加载态互相牵连。
      setTracksState(previousState => ({
        ...previousState,
        isLoading: true,
      }))

      try {
        const result = await localLibraryApi.queryTracks(
          buildLocalLibraryTrackQueryInput(
            debouncedKeyword,
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
    [debouncedKeyword, songScope]
  )

  const loadAlbums = useCallback(async () => {
    const requestId = ++albumQueryRequestIdRef.current

    setAlbumsState(previousState => ({
      ...previousState,
      isLoading: true,
    }))

    try {
      const items = await queryAllAlbumPages(
        debouncedKeyword,
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
  }, [debouncedKeyword])

  const loadArtists = useCallback(async () => {
    const requestId = ++artistQueryRequestIdRef.current

    setArtistsState(previousState => ({
      ...previousState,
      isLoading: true,
    }))

    try {
      const items = await queryAllArtistPages(
        debouncedKeyword,
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
  }, [debouncedKeyword])

  const loadPlaylists = useCallback(async () => {
    const requestId = ++playlistQueryRequestIdRef.current

    setPlaylistsState(previousState => ({
      ...previousState,
      isLoading: true,
    }))

    try {
      const items = await queryAllPlaylistPages(
        debouncedKeyword,
        null,
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )

      if (playlistQueryRequestIdRef.current !== requestId) {
        return
      }

      setPlaylistsState({
        items,
        total: items.length,
        offset: items.length,
        limit: DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT,
        isLoading: false,
        hasLoaded: true,
      })
    } catch (error) {
      console.error('failed to query local library playlists', error)
      toast.error('本地歌单加载失败，请稍后重试')

      if (playlistQueryRequestIdRef.current === requestId) {
        setPlaylistsState(previousState => ({
          ...previousState,
          isLoading: false,
          hasLoaded: true,
        }))
      }
    }
  }, [debouncedKeyword])

  const loadPlaylistPickerPlaylists = useCallback(
    async (trackFilePath: string) => {
      const requestId = ++playlistPickerQueryRequestIdRef.current

      setPlaylistPickerState(previousState => ({
        ...previousState,
        items: [],
        total: 0,
        offset: 0,
        isLoading: true,
      }))

      try {
        const items = await queryAllPlaylistPages(
          debouncedKeyword,
          trackFilePath,
          DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
        )

        if (playlistPickerQueryRequestIdRef.current !== requestId) {
          return
        }

        setPlaylistPickerState({
          items,
          total: items.length,
          offset: items.length,
          limit: DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT,
          isLoading: false,
          hasLoaded: true,
        })
      } catch (error) {
        console.error('failed to query local playlist picker options', error)
        toast.error('歌单选项加载失败，请稍后重试')

        if (playlistPickerQueryRequestIdRef.current === requestId) {
          setPlaylistPickerState(previousState => ({
            ...previousState,
            isLoading: false,
            hasLoaded: true,
          }))
        }
      }
    },
    [debouncedKeyword]
  )

  const loadQueueTracksForSource = useCallback(async (sourceKey: string) => {
    const descriptor = resolveLocalLibraryQueueSourceDescriptor(sourceKey)
    const localLibraryApi = getLocalLibraryApi()
    if (!descriptor) {
      return []
    }

    if (!localLibraryApi) {
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

    if (descriptor.type === 'playlist') {
      return queryAllPlaylistDetailPages(descriptor.playlistId, '', 200)
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

    if (activeTab === 'playlists') {
      await loadPlaylists()
      return
    }

    await loadTracks(false)
  }, [activeTab, loadAlbums, loadArtists, loadPlaylists, loadTracks])

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

    if (activeTab === 'playlists') {
      void loadPlaylists()
      return
    }

    void loadTracks(false)
  }, [
    activeTab,
    configuredRoots.length,
    isLoading,
    debouncedKeyword,
    loadAlbums,
    loadArtists,
    loadPlaylists,
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
  const playlistDuplicateIds = new Set(
    playlistPickerState.items
      .filter(playlist => playlist.containsTrack)
      .map(playlist => playlist.id)
  )

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
      tracks: LocalLibraryTrackRecord[],
      startIndex: number,
      sourceKey: string
    ) => {
      const selectedTrack = tracks[startIndex]
      if (!selectedTrack) {
        return
      }

      const queryTracks = await queryAllTrackPages(
        debouncedKeyword,
        songScope,
        200
      )
      const queueTracks = queryTracks.length ? queryTracks : tracks
      const queueStartIndex = queueTracks.findIndex(
        track => track.filePath === selectedTrack.filePath
      )

      if (queueStartIndex < 0) {
        toast.error('当前歌曲已不在本地歌曲列表中')
        return
      }

      playQueueFromIndex(
        buildLocalLibraryPlaybackQueue(queueTracks, sourceKey),
        queueStartIndex,
        sourceKey
      )
    },
    [debouncedKeyword, playQueueFromIndex, songScope]
  )

  const handleOpenAlbum = useCallback(
    (album: LocalLibraryAlbumRecord) => {
      navigate(
        `/local-library/albums/${encodeURIComponent(album.name)}/${encodeURIComponent(album.artistName)}`
      )
    },
    [navigate]
  )

  const handleOpenArtist = useCallback(
    (artist: LocalLibraryArtistRecord) => {
      navigate(`/local-library/artists/${encodeURIComponent(artist.name)}`)
    },
    [navigate]
  )

  const handleOpenPlaylist = useCallback(
    async (playlist: LocalLibraryPlaylistRecord) => {
      navigate(`/local-library/playlists/${playlist.id}`)
    },
    [navigate]
  )

  const openCreatePlaylistDialog = useCallback(() => {
    setEditingPlaylist(null)
    setPlaylistDialogError('')
    setPlaylistDialogName('')
    setPlaylistDialogMode('create')
  }, [])

  const openRenamePlaylistDialog = useCallback(
    (playlist: LocalLibraryPlaylistRecord) => {
      setEditingPlaylist(playlist)
      setPlaylistDialogError('')
      setPlaylistDialogName(playlist.name)
      setPlaylistDialogMode('rename')
    },
    []
  )

  const closePlaylistDialog = useCallback((open: boolean) => {
    if (open) {
      return
    }

    setPlaylistDialogMode(null)
    setEditingPlaylist(null)
    setPlaylistDialogName('')
    setPlaylistDialogError('')
    setPlaylistDialogPending(false)
  }, [])

  const handleCreateOrRenamePlaylist = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi || !playlistDialogMode || playlistDialogPending) {
      return
    }

    setPlaylistDialogPending(true)
    setPlaylistDialogError('')

    try {
      if (playlistDialogMode === 'create') {
        const result = await localLibraryApi.createPlaylist({
          name: playlistDialogName,
        })

        if (result.status === 'duplicate') {
          setPlaylistDialogError('已存在同名本地歌单')
          return
        }

        toast.success('本地歌单已创建')
      } else if (editingPlaylist) {
        const result = await localLibraryApi.updatePlaylist({
          playlistId: editingPlaylist.id,
          name: playlistDialogName,
        })

        if (result.status === 'duplicate') {
          setPlaylistDialogError('已存在同名本地歌单')
          return
        }

        if (result.status === 'updated') {
          toast.success('歌单名称已更新')
        }
      }

      closePlaylistDialog(false)
      await refreshActiveQuery()
    } catch (error) {
      console.error('failed to mutate local playlist', error)
      toast.error('歌单操作失败，请稍后重试')
    } finally {
      setPlaylistDialogPending(false)
    }
  }, [
    closePlaylistDialog,
    editingPlaylist,
    playlistDialogMode,
    playlistDialogName,
    playlistDialogPending,
    refreshActiveQuery,
  ])

  const handleDeletePlaylist = useCallback(
    async (playlist: LocalLibraryPlaylistRecord) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi) {
        return
      }

      try {
        const result = await localLibraryApi.deletePlaylist({
          playlistId: playlist.id,
        })

        if (!result.deleted) {
          toast.error('歌单不存在或已被删除')
          return
        }

        if (queueSourceKey === `local-library:playlist:${playlist.id}`) {
          syncQueueFromSource(queueSourceKey, [])
        }

        await loadPlaylists()
        toast.success('本地歌单已删除')
      } catch (error) {
        console.error('failed to delete local playlist', error)
        toast.error('删除歌单失败，请稍后重试')
      }
    },
    [loadPlaylists, queueSourceKey, syncQueueFromSource]
  )

  const closePlaylistDrawer = useCallback((open: boolean) => {
    if (open) {
      return
    }

    setPlaylistDrawerTrack(null)
    setPlaylistDrawerCreateTitle('')
    setPlaylistDrawerPendingId(null)
    setPlaylistPickerState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_COLLECTION_QUERY_LIMIT
      )
    )
  }, [])

  const handleOpenAddToPlaylistDrawer = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      setPlaylistDrawerTrack(track)
      setPlaylistDrawerCreateTitle('')
      setPlaylistDrawerPendingId(null)
      await loadPlaylistPickerPlaylists(track.filePath)
    },
    [loadPlaylistPickerPlaylists]
  )

  const handleAddTrackToPlaylist = useCallback(
    async (playlist: LocalLibraryPlaylistRecord) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi || !playlistDrawerTrack) {
        return
      }

      setPlaylistDrawerPendingId(playlist.id)

      try {
        const result = await localLibraryApi.addTrackToPlaylist({
          playlistId: playlist.id,
          filePath: playlistDrawerTrack.filePath,
        })

        if (result.status === 'duplicate') {
          toast.error('歌曲已在歌单中')
          return
        }

        if (result.status !== 'ok') {
          toast.error('添加到歌单失败，请稍后重试')
          return
        }

        if (queueSourceKey === `local-library:playlist:${playlist.id}`) {
          const nextQueueTracks = await loadQueueTracksForSource(queueSourceKey)
          syncQueueFromSource(
            queueSourceKey,
            buildLocalLibraryPlaybackQueue(nextQueueTracks, queueSourceKey)
          )
        }

        toast.success(`已添加到 ${playlist.name}`)
        closePlaylistDrawer(false)
        if (activeTab === 'playlists') {
          await loadPlaylists()
        }
      } catch (error) {
        console.error('failed to add track to playlist', error)
        toast.error('添加到歌单失败，请稍后重试')
      } finally {
        setPlaylistDrawerPendingId(null)
      }
    },
    [
      activeTab,
      closePlaylistDrawer,
      loadPlaylists,
      loadQueueTracksForSource,
      playlistDrawerTrack,
      queueSourceKey,
      syncQueueFromSource,
    ]
  )

  const handleCreatePlaylistAndAdd = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (
      !localLibraryApi ||
      !playlistDrawerTrack ||
      !playlistDrawerCreateTitle.trim() ||
      playlistDrawerCreateSubmitting
    ) {
      return
    }

    setPlaylistDrawerCreateSubmitting(true)

    try {
      const createResult = await localLibraryApi.createPlaylist({
        name: playlistDrawerCreateTitle,
      })

      if (createResult.status === 'duplicate' || !createResult.playlist) {
        toast.error('已存在同名本地歌单')
        return
      }

      await handleAddTrackToPlaylist(createResult.playlist)
      setPlaylistDrawerCreateTitle('')
      await loadPlaylistPickerPlaylists(playlistDrawerTrack.filePath)
    } catch (error) {
      console.error('failed to create local playlist and add track', error)
      toast.error('创建歌单失败，请稍后重试')
    } finally {
      setPlaylistDrawerCreateSubmitting(false)
    }
  }, [
    handleAddTrackToPlaylist,
    loadPlaylistPickerPlaylists,
    playlistDrawerCreateSubmitting,
    playlistDrawerCreateTitle,
    playlistDrawerTrack,
  ])

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
        await loadPlaylists()

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
      loadPlaylists,
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
            onCreatePlaylist={openCreatePlaylistDialog}
          />

          <TabsContent
            value='songs'
            className={`pt-3 ${tabContentMinHeightClass}`}
          >
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
              onAddToPlaylist={track =>
                void handleOpenAddToPlaylistDrawer(track)
              }
              onDeleteTrack={(track, mode) =>
                void handleDeleteTrack(track, mode)
              }
              onEndReached={() => void loadTracks(true)}
            />
          </TabsContent>

          <TabsContent
            value='albums'
            className={`pt-3 ${tabContentMinHeightClass}`}
          >
            <div className='grid gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6'>
              {albumsState.items.map(album => (
                <LocalLibraryAlbumCard
                  key={`${album.id}-${album.name}`}
                  album={album}
                  onOpen={handleOpenAlbum}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent
            value='artists'
            className={`pt-3 ${tabContentMinHeightClass}`}
          >
            <div className='grid gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6'>
              {artistsState.items.map(artist => (
                <LocalLibraryArtistCard
                  key={`${artist.id}-${artist.name}`}
                  artist={artist}
                  onOpen={handleOpenArtist}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent
            value='playlists'
            className={`space-y-5 pt-3 ${tabContentMinHeightClass}`}
          >
            {playlistsState.items.length === 0 ? (
              <div className='text-muted-foreground rounded-[28px] border border-dashed border-[#e6e1ff] bg-white/60 px-6 py-14 text-center text-sm dark:border-white/10 dark:bg-white/3'>
                还没有本地歌单，先创建一个歌单再把本地歌曲加进去。
              </div>
            ) : (
              <div className='grid gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6'>
                {playlistsState.items.map(playlist => (
                  <LocalLibraryPlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onOpen={playlist => void handleOpenPlaylist(playlist)}
                    onRename={openRenamePlaylistDialog}
                    onDelete={playlist => void handleDeletePlaylist(playlist)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <LocalLibraryPlaylistDialog
        open={playlistDialogMode !== null}
        title={playlistDialogMode === 'rename' ? '重命名歌单' : '创建歌单'}
        description={
          playlistDialogMode === 'rename'
            ? '只修改歌单名称，歌单内歌曲不会受影响。'
            : '创建本地歌单后，可在歌曲行的更多菜单里继续添加本地歌曲。'
        }
        value={playlistDialogName}
        submitLabel={playlistDialogMode === 'rename' ? '保存名称' : '创建歌单'}
        pending={playlistDialogPending}
        duplicateError={playlistDialogError}
        onValueChange={setPlaylistDialogName}
        onOpenChange={closePlaylistDialog}
        onSubmit={() => void handleCreateOrRenamePlaylist()}
      />

      <LocalLibraryAddToPlaylistDrawer
        open={Boolean(playlistDrawerTrack)}
        track={playlistDrawerTrack}
        playlists={playlistPickerState.items}
        pendingPlaylistId={playlistDrawerPendingId}
        createTitle={playlistDrawerCreateTitle}
        createSubmitting={playlistDrawerCreateSubmitting}
        duplicatePlaylistIds={playlistDuplicateIds}
        onOpenChange={closePlaylistDrawer}
        onCreateTitleChange={setPlaylistDrawerCreateTitle}
        onCreateAndAdd={() => void handleCreatePlaylistAndAdd()}
        onAdd={playlist => void handleAddTrackToPlaylist(playlist)}
      />
    </section>
  )
}

export default LocalLibrary
