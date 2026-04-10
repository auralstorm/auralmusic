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
import { useAuthStore } from '@/stores/auth-store'

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
  type LibraryPageData,
  type PlaylistSourceValue,
} from './library.model'

const Library = () => {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const loginStatus = useAuthStore(state => state.loginStatus)
  const hasHydrated = useAuthStore(state => state.hasHydrated)

  const [data, setData] = useState<LibraryPageData>(EMPTY_LIBRARY_PAGE_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [playlistLoading, setPlaylistLoading] = useState(false)
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

  const loadBaseData = useCallback(
    async (uid: number, source: PlaylistSourceValue) => {
      setIsLoading(true)
      setErrorMessage('')
      setPlaylistLoading(true)

      try {
        const playlistResponse = await fetchPlaylistCollection(uid, true)

        const likedPlaylist = resolveLibraryLikedPlaylist(playlistResponse.data)
        const playlists = normalizeLibraryUserPlaylists(
          playlistResponse.data,
          source
        )

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
              0
            )
            likedSongs = normalizeLibrarySongs(detailResponse.data)
          } catch (fetchError) {
            console.error('library liked songs fetch failed', fetchError)
          }
        }

        setData({
          likedSongs,
          likedSongCount,
          likedPlaylistCoverUrl,
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
    [fetchPlaylistCollection]
  )

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      setData(EMPTY_LIBRARY_PAGE_DATA)
      setIsLoading(false)
      setPlaylistLoading(false)
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

  const handlePlaylistSourceChange = (value: PlaylistSourceValue) => {
    startTransition(() => {
      setPlaylistSource(value)
    })
  }

  const handleOpenLikedSongs = () => {
    navigate('/library/liked-songs')
  }

  const handleOpenPlaylist = (playlistId: number) => {
    if (!playlistId) return
    navigate(`/playlist/${playlistId}`)
  }

  const handleOpenMv = (mvId: number) => {
    if (!mvId) return
    navigate(`/mv/${mvId}`)
  }

  const handleCreatePlaylist = async (payload: {
    name: string
    privacy?: '10'
  }) => {
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
  }

  if (!hasHydrated) {
    return <LibrarySkeleton />
  }

  if (!isAuthenticated) {
    return <LibraryLockedState />
  }

  return (
    <section className='relative isolate w-full pb-8'>
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
            onOpenLikedSongs={handleOpenLikedSongs}
          />

          <LibraryTabsSection
            data={data}
            playlistLoading={playlistLoading}
            onOpenPlaylist={handleOpenPlaylist}
            onOpenMv={handleOpenMv}
            playlistSource={playlistSource}
            onPlaylistSourceChange={handlePlaylistSourceChange}
            onOpenCreatePlaylist={() => setCreateDialogOpen(true)}
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
