import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { toast } from 'sonner'

import { createPlaylist, getPlaylistTrackAll } from '@/api/list'
import { userPlaylist } from '@/api/user'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { useAuthStore } from '@/stores/auth-store'
import { useMvDrawerStore } from '@/stores/mv-drawer-store'

import CreatePlaylistDialog from './components/CreatePlaylistDialog'
import LibraryHero from './components/LibraryHero'
import LibraryLockedState from './components/LibraryLockedState'
import LibrarySkeleton from './components/LibrarySkeleton'
import LibraryTabsSection from './components/LibraryTabsSection'
import {
  EMPTY_LIBRARY_PAGE_DATA,
  normalizeLibrarySongs,
  normalizeLibraryUserPlaylists,
  resolveLibraryLikedPlaylist,
} from './library.model'
import { isDef } from '@/lib/utils'
import type {
  CreatePlaylistPayload,
  LibraryPageData,
  PlaylistSourceValue,
} from './types'

const Library = () => {
  useScrollToTopOnRouteEnter()

  const navigate = useNavigate()
  const openMvDrawer = useMvDrawerStore(state => state.openDrawer)
  const user = useAuthStore(state => state.user)
  const loginStatus = useAuthStore(state => state.loginStatus)
  const hasHydrated = useAuthStore(state => state.hasHydrated)

  const [data, setData] = useState<LibraryPageData>(EMPTY_LIBRARY_PAGE_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [likedSongsPreviewRefreshing, setLikedSongsPreviewRefreshing] =
    useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [playlistSource, setPlaylistSource] =
    useState<PlaylistSourceValue>('my')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createPlaylistSubmitting, setCreatePlaylistSubmitting] =
    useState(false)

  const hasLoadedBaseDataRef = useRef(false)
  const previousPlaylistSourceRef = useRef<PlaylistSourceValue>('my')

  const isAuthenticated =
    hasHydrated && loginStatus === 'authenticated' && Boolean(user?.userId)

  const fetchPlaylistCollection = useCallback(
    async (uid: number, bustCache = false) => {
      return userPlaylist({
        uid,
        timestamp: bustCache ? Date.now() : undefined,
      })
    },
    []
  )

  const refreshPlaylists = useCallback(
    async (uid: number, source: PlaylistSourceValue, bustCache = false) => {
      if (!uid) {
        return
      }

      setPlaylistLoading(true)

      try {
        const response = await fetchPlaylistCollection(uid, bustCache)
        const playlists = normalizeLibraryUserPlaylists(response.data, source)

        setData(current => ({
          ...current,
          playlists,
        }))
      } catch (fetchError) {
        console.error('library playlists fetch failed', fetchError)
        toast.error('歌单列表加载失败，请稍后重试')
      } finally {
        setPlaylistLoading(false)
      }
    },
    [fetchPlaylistCollection]
  )

  const resolveLikedSongsPreview = useCallback(
    async (playlistResponseData: unknown, bustCache = false) => {
      const likedPlaylist = resolveLibraryLikedPlaylist(playlistResponseData)

      let likedSongs = EMPTY_LIBRARY_PAGE_DATA.likedSongs
      let likedSongCount = 0
      let likedPlaylistCoverUrl = ''

      if (likedPlaylist?.id) {
        likedSongCount = likedPlaylist.trackCount
        likedPlaylistCoverUrl = likedPlaylist.coverImgUrl

        try {
          const detailResponse = await getPlaylistTrackAll(
            likedPlaylist.id,
            9,
            0,
            bustCache ? Date.now() : undefined
          )
          likedSongs = normalizeLibrarySongs(detailResponse.data).slice(0, 9)
        } catch (fetchError) {
          console.error('library liked songs fetch failed', fetchError)
        }
      }

      return {
        likedSongs,
        likedSongCount,
        likedPlaylistCoverUrl,
      }
    },
    []
  )

  const refreshLikedSongsPreview = useCallback(
    async (uid: number, bustCache = false) => {
      if (!uid) {
        return
      }

      try {
        const playlistResponse = await fetchPlaylistCollection(uid, bustCache)
        const previewData = await resolveLikedSongsPreview(
          playlistResponse.data,
          bustCache
        )

        setData(current => ({
          ...current,
          ...previewData,
        }))
      } catch (fetchError) {
        console.error('library liked songs preview refresh failed', fetchError)
      }
    },
    [fetchPlaylistCollection, resolveLikedSongsPreview]
  )

  const loadBaseData = useCallback(
    async (uid: number, source: PlaylistSourceValue) => {
      setIsLoading(true)
      setErrorMessage('')
      setPlaylistLoading(true)

      try {
        const playlistResponse = await fetchPlaylistCollection(uid, true)

        const playlists = normalizeLibraryUserPlaylists(
          playlistResponse.data,
          source
        )
        const previewData = await resolveLikedSongsPreview(
          playlistResponse.data,
          true
        )

        setData({
          ...previewData,
          playlists,
        })

        previousPlaylistSourceRef.current = source
        hasLoadedBaseDataRef.current = true
      } catch (fetchError) {
        console.error('library base data fetch failed', fetchError)
        setErrorMessage('乐库内容加载失败，请稍后重试')
      } finally {
        setIsLoading(false)
        setPlaylistLoading(false)
      }
    },
    [fetchPlaylistCollection, resolveLikedSongsPreview]
  )

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      setData(EMPTY_LIBRARY_PAGE_DATA)
      setIsLoading(false)
      setPlaylistLoading(false)
      setLikedSongsPreviewRefreshing(false)
      setErrorMessage('')
      setCreateDialogOpen(false)
      setCreatePlaylistSubmitting(false)
      setPlaylistSource('my')
      hasLoadedBaseDataRef.current = false
      previousPlaylistSourceRef.current = 'my'
      return
    }

    void loadBaseData(user.userId, previousPlaylistSourceRef.current)
  }, [isAuthenticated, loadBaseData, user?.userId])

  useEffect(() => {
    if (!isAuthenticated || !user?.userId || !hasLoadedBaseDataRef.current) {
      return
    }

    if (previousPlaylistSourceRef.current === playlistSource) {
      return
    }

    previousPlaylistSourceRef.current = playlistSource
    void refreshPlaylists(user.userId, playlistSource)
  }, [isAuthenticated, playlistSource, refreshPlaylists, user?.userId])

  const handlePlaylistSourceChange = useCallback(
    (value: PlaylistSourceValue) => {
      startTransition(() => {
        setPlaylistSource(value)
      })
    },
    []
  )

  const handleOpenLikedSongs = useCallback(() => {
    navigate('/library/liked-songs')
  }, [navigate])

  const handleOpenPlaylist = useCallback(
    (playlistId: number) => {
      if (!isDef(playlistId)) return
      navigate(`/playlist/${playlistId}`)
    },
    [navigate]
  )

  const handleOpenMv = useCallback(
    (mvId: number) => {
      if (!isDef(mvId)) return
      openMvDrawer(mvId)
    },
    [openMvDrawer]
  )

  const handleOpenCreatePlaylist = useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  const handleRefreshLikedSongsPreview = useCallback(
    (songId: number, _nextLiked: boolean) => {
      if (!songId || !user?.userId) {
        return
      }

      void (async () => {
        setLikedSongsPreviewRefreshing(true)

        try {
          await refreshLikedSongsPreview(user.userId, true)
        } finally {
          setLikedSongsPreviewRefreshing(false)
        }
      })()
    },
    [refreshLikedSongsPreview, user?.userId]
  )

  const handleCreatePlaylist = useCallback(
    async (payload: CreatePlaylistPayload) => {
      if (!user?.userId || createPlaylistSubmitting) {
        return
      }

      setCreatePlaylistSubmitting(true)

      try {
        await createPlaylist(payload)

        previousPlaylistSourceRef.current = 'my'
        setPlaylistSource('my')
        setCreateDialogOpen(false)
        toast.success('歌单创建成功')

        await refreshPlaylists(user.userId, 'my', true)
      } catch (createError) {
        console.error('playlist create failed', createError)
        toast.error('歌单创建失败，请稍后重试')
        throw createError
      } finally {
        setCreatePlaylistSubmitting(false)
      }
    },
    [createPlaylistSubmitting, refreshPlaylists, user?.userId]
  )

  if (!hasHydrated) {
    return <LibrarySkeleton />
  }

  if (!isAuthenticated) {
    return <LibraryLockedState />
  }

  return (
    <section className='relative isolate w-full'>
      {errorMessage ? (
        <div className='border-destructive/20 bg-destructive/5 text-destructive mb-6 rounded-[18px] border px-4 py-3 text-sm'>
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? <LibrarySkeleton /> : null}

      {!isLoading ? (
        <div className='space-y-10'>
          <LibraryHero
            songs={data.likedSongs}
            songCount={data.likedSongCount}
            coverImgUrl={data.likedPlaylistCoverUrl}
            likedSongsPreviewRefreshing={likedSongsPreviewRefreshing}
            onOpenLikedSongs={handleOpenLikedSongs}
            onSongLikeChangeSuccess={handleRefreshLikedSongsPreview}
          />

          <LibraryTabsSection
            data={data}
            playlistLoading={playlistLoading}
            onOpenPlaylist={handleOpenPlaylist}
            onOpenMv={handleOpenMv}
            playlistSource={playlistSource}
            onPlaylistSourceChange={handlePlaylistSourceChange}
            onOpenCreatePlaylist={handleOpenCreatePlaylist}
          />
        </div>
      ) : null}

      <CreatePlaylistDialog
        open={createDialogOpen}
        submitting={createPlaylistSubmitting}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreatePlaylist}
      />
    </section>
  )
}

export default Library
