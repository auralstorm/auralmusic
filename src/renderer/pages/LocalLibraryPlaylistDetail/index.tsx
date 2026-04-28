import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { usePlaybackStore } from '@/stores/playback-store'
import { Spinner } from '@/components/ui/spinner'
import { parseLocalMediaUrl } from '../../../shared/local-media.ts'
import type {
  LocalLibraryPlaylistRecord,
  LocalLibraryTrackDeleteMode,
  LocalLibraryTrackRecord,
} from '../../../shared/local-library.ts'
import LocalLibraryEntityDetailHero from '@/pages/LocalLibraryDetail/components/LocalLibraryEntityDetailHero'
import LocalLibraryEntityDetailLayout from '@/pages/LocalLibraryDetail/components/LocalLibraryEntityDetailLayout'
import LocalLibraryTrackList from '@/pages/LocalLibrary/components/LocalLibraryTrackList'
import LocalLibraryPlaylistDialog from '@/pages/LocalLibrary/components/LocalLibraryPlaylistDialog'
import {
  buildLocalLibraryPlaybackQueue,
  createLocalLibraryPlaylistQueueSourceKey,
} from '@/pages/LocalLibrary/local-library-playback.model'
import {
  createEmptyLocalLibraryPagedState,
  DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT,
  EMPTY_LOCAL_LIBRARY_SONG_SCOPE,
} from '@/pages/LocalLibrary/local-library.model'
import {
  getLocalLibraryApi,
  queryAllPlaylistDetailPages,
} from '@/pages/LocalLibrary/local-library-queries'
import { buildLocalLibraryPlaylistMetaItems } from './local-library-playlist-detail.model'

const LocalLibraryPlaylistDetail = () => {
  useScrollToTopOnRouteEnter()

  const navigate = useNavigate()
  const { playlistId } = useParams<{ playlistId: string }>()

  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const queueSourceKey = usePlaybackStore(state => state.queueSourceKey)
  const resetPlayback = usePlaybackStore(state => state.resetPlayback)
  const syncQueueFromSource = usePlaybackStore(
    state => state.syncQueueFromSource
  )

  const numericPlaylistId = Number(playlistId)
  const isValidPlaylistId =
    Number.isInteger(numericPlaylistId) && numericPlaylistId > 0
  const playlistQueueSourceKey = useMemo(
    () =>
      isValidPlaylistId
        ? createLocalLibraryPlaylistQueueSourceKey(numericPlaylistId)
        : null,
    [isValidPlaylistId, numericPlaylistId]
  )

  const [playlist, setPlaylist] = useState<LocalLibraryPlaylistRecord | null>(
    null
  )
  const [tracksState, setTracksState] = useState(() =>
    createEmptyLocalLibraryPagedState<LocalLibraryTrackRecord>(
      DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
    )
  )
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword, 500)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [deletingTrackPath, setDeletingTrackPath] = useState<string | null>(
    null
  )
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false)
  const [playlistDialogName, setPlaylistDialogName] = useState('')
  const [playlistDialogError, setPlaylistDialogError] = useState('')
  const [playlistDialogPending, setPlaylistDialogPending] = useState(false)
  const requestIdRef = useRef(0)
  const tracksStateRef = useRef(tracksState)
  const loadedPlaylistKeyRef = useRef<string | null>(null)

  useEffect(() => {
    tracksStateRef.current = tracksState
  }, [tracksState])

  const loadPlaylistDetail = useCallback(
    async (append = false) => {
      if (!isValidPlaylistId) {
        setIsInitialLoading(false)
        setPlaylist(null)
        setTracksState(
          createEmptyLocalLibraryPagedState(
            DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
          )
        )
        return
      }

      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi) {
        setIsInitialLoading(false)
        return
      }

      const currentTracksState = tracksStateRef.current
      const nextOffset = append ? currentTracksState.items.length : 0

      if (
        currentTracksState.isLoading ||
        (append && currentTracksState.items.length >= currentTracksState.total)
      ) {
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      setTracksState(previous => ({
        ...previous,
        isLoading: true,
      }))

      try {
        const result = await localLibraryApi.getPlaylistDetail({
          playlistId: numericPlaylistId,
          keyword: debouncedKeyword,
          offset: nextOffset,
          limit: currentTracksState.limit,
        })

        if (requestId !== requestIdRef.current) {
          return
        }

        setPlaylist(result.playlist)
        setTracksState(previous => ({
          items: append ? [...previous.items, ...result.items] : result.items,
          total: result.total,
          offset: result.offset,
          limit: result.limit,
          isLoading: false,
          hasLoaded: true,
        }))
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return
        }

        console.error('failed to load local playlist detail', error)
        setTracksState(previous => ({
          ...previous,
          isLoading: false,
          hasLoaded: true,
        }))
        toast.error('加载本地歌单失败，请稍后重试')
      } finally {
        if (requestId === requestIdRef.current) {
          loadedPlaylistKeyRef.current = String(numericPlaylistId)
          setIsInitialLoading(false)
        }
      }
    },
    [debouncedKeyword, isValidPlaylistId, numericPlaylistId]
  )

  useEffect(() => {
    const playlistKey = String(numericPlaylistId)
    const isSwitchingPlaylist = loadedPlaylistKeyRef.current !== playlistKey

    setTracksState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
      )
    )
    if (isSwitchingPlaylist) {
      setIsInitialLoading(true)
    }
    void loadPlaylistDetail(false)
  }, [loadPlaylistDetail, numericPlaylistId])

  const refreshPlaylistDetail = useCallback(async () => {
    setTracksState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
      )
    )
    await loadPlaylistDetail(false)
  }, [loadPlaylistDetail])

  const loadFullPlaylistTracks = useCallback(async () => {
    if (!isValidPlaylistId) {
      return []
    }

    return queryAllPlaylistDetailPages(numericPlaylistId, '', 200)
  }, [isValidPlaylistId, numericPlaylistId])

  const handlePlayIndex = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      if (!playlistQueueSourceKey) {
        return
      }

      const fullTracks = await loadFullPlaylistTracks()
      const startIndex = fullTracks.findIndex(
        item => item.filePath === track.filePath
      )

      if (startIndex < 0) {
        toast.error('当前歌曲已不在歌单中')
        return
      }

      playQueueFromIndex(
        buildLocalLibraryPlaybackQueue(fullTracks, playlistQueueSourceKey),
        startIndex,
        playlistQueueSourceKey
      )
    },
    [loadFullPlaylistTracks, playQueueFromIndex, playlistQueueSourceKey]
  )

  const handlePlayAll = useCallback(async () => {
    if (!playlistQueueSourceKey) {
      return
    }

    const fullTracks = await loadFullPlaylistTracks()
    if (fullTracks.length === 0) {
      toast.error('歌单里还没有歌曲')
      return
    }

    playQueueFromIndex(
      buildLocalLibraryPlaybackQueue(fullTracks, playlistQueueSourceKey),
      0,
      playlistQueueSourceKey
    )
  }, [loadFullPlaylistTracks, playQueueFromIndex, playlistQueueSourceKey])

  const handleRevealTrack = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi?.revealTrack) {
        toast.error('当前环境不支持定位本地歌曲')
        return
      }

      const didReveal = await localLibraryApi.revealTrack(track.filePath)
      if (!didReveal) {
        toast.error('定位歌曲文件失败，请稍后重试')
      }
    },
    []
  )

  const syncPlaylistQueue = useCallback(async () => {
    if (!playlistQueueSourceKey || queueSourceKey !== playlistQueueSourceKey) {
      return
    }

    const nextTracks = await loadFullPlaylistTracks()
    syncQueueFromSource(
      playlistQueueSourceKey,
      buildLocalLibraryPlaybackQueue(nextTracks, playlistQueueSourceKey)
    )
  }, [
    loadFullPlaylistTracks,
    playlistQueueSourceKey,
    queueSourceKey,
    syncQueueFromSource,
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

        await refreshPlaylistDetail()
        await syncPlaylistQueue()

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
      refreshPlaylistDetail,
      resetPlayback,
      syncPlaylistQueue,
    ]
  )

  const handleRemoveFromPlaylist = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      const localLibraryApi = getLocalLibraryApi()
      if (!localLibraryApi || !playlist) {
        return
      }

      try {
        const result = await localLibraryApi.removeTrackFromPlaylist({
          playlistId: playlist.id,
          filePath: track.filePath,
        })

        if (result.status !== 'ok') {
          toast.error('歌曲已不在歌单中')
          return
        }

        await refreshPlaylistDetail()
        await syncPlaylistQueue()
        toast.success('歌曲已移出歌单')
      } catch (error) {
        console.error('failed to remove track from local playlist', error)
        toast.error('移出歌单失败，请稍后重试')
      }
    },
    [playlist, refreshPlaylistDetail, syncPlaylistQueue]
  )

  const handleDeletePlaylist = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi || !playlist) {
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

      toast.success('歌单已删除')
      navigate('/local-library')
    } catch (error) {
      console.error('failed to delete local playlist', error)
      toast.error('删除歌单失败，请稍后重试')
    }
  }, [navigate, playlist])

  const handleRenamePlaylist = useCallback(async () => {
    const localLibraryApi = getLocalLibraryApi()
    if (!localLibraryApi || !playlist || playlistDialogPending) {
      return
    }

    setPlaylistDialogPending(true)
    setPlaylistDialogError('')

    try {
      const result = await localLibraryApi.updatePlaylist({
        playlistId: playlist.id,
        name: playlistDialogName,
      })

      if (result.status === 'duplicate') {
        setPlaylistDialogError('已存在同名本地歌单')
        return
      }

      if (result.status === 'not-found' || !result.playlist) {
        toast.error('歌单不存在或已被删除')
        setPlaylistDialogOpen(false)
        navigate('/local-library')
        return
      }

      setPlaylist(result.playlist)
      setPlaylistDialogOpen(false)
      toast.success('歌单名称已更新')
    } catch (error) {
      console.error('failed to rename local playlist', error)
      toast.error('重命名歌单失败，请稍后重试')
    } finally {
      setPlaylistDialogPending(false)
    }
  }, [navigate, playlist, playlistDialogName, playlistDialogPending])

  const openRenameDialog = useCallback(() => {
    if (!playlist) {
      return
    }

    setPlaylistDialogName(playlist.name)
    setPlaylistDialogError('')
    setPlaylistDialogOpen(true)
  }, [playlist])

  const closeRenameDialog = useCallback((nextOpen: boolean) => {
    setPlaylistDialogOpen(nextOpen)
    if (!nextOpen) {
      setPlaylistDialogError('')
      setPlaylistDialogPending(false)
    }
  }, [])

  if (!isValidPlaylistId) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地歌单不存在'
            subtitle='歌单 ID 无效'
            metaItems={[]}
          />
        }
      >
        <div className='text-muted-foreground rounded-[28px] border border-dashed border-[#e6e1ff] bg-white/60 px-6 py-14 text-center text-sm dark:border-white/10 dark:bg-white/3'>
          当前歌单链接无效，请返回本地乐库重新选择。
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  if (isInitialLoading) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地歌单'
            subtitle='正在加载歌单详情'
            metaItems={[]}
          />
        }
      >
        <div className='flex items-center justify-center py-18'>
          <Spinner className='text-primary size-6' />
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  if (!playlist) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地歌单不存在'
            subtitle='歌单已删除或无法访问'
            metaItems={[]}
          />
        }
      >
        <div className='text-muted-foreground rounded-[28px] border border-dashed border-[#e6e1ff] bg-white/60 px-6 py-14 text-center text-sm dark:border-white/10 dark:bg-white/3'>
          当前歌单不存在，请返回本地乐库重新选择。
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  return (
    <LocalLibraryEntityDetailLayout
      hero={
        <LocalLibraryEntityDetailHero
          coverUrl={playlist.coverUrl || null}
          title={playlist.name}
          subtitle='本地歌单'
          metaItems={buildLocalLibraryPlaylistMetaItems(playlist)}
          description='仅收录本地乐库歌曲，支持独立管理和播放。'
          onPlay={() => void handlePlayAll()}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-13 w-25 rounded-full'
                  aria-label='更多歌单操作'
                >
                  <MoreHorizontal className='size-5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='rounded-2xl border-white/80 bg-white/95 p-1.5 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/8 dark:bg-[#161822]/96 dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)]'
              >
                <DropdownMenuItem
                  className='rounded-xl'
                  onClick={openRenameDialog}
                >
                  <Pencil className='size-4' />
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant='destructive'
                  className='rounded-xl'
                  onClick={() => void handleDeletePlaylist()}
                >
                  <Trash2 className='size-4' />
                  删除歌单
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      }
    >
      <div className='space-y-5'>
        <div className='flex items-center justify-end'>
          <div className='w-full max-w-sm'>
            <Input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder='搜索歌单内歌曲'
              className='h-8 rounded-full border-[#e7e2fb] bg-white/88 px-5 shadow-none dark:border-white/8 dark:bg-white/6'
            />
          </div>
        </div>

        <LocalLibraryTrackList
          tracks={tracksState.items}
          totalCount={tracksState.total}
          isLoadingMore={tracksState.isLoading && tracksState.hasLoaded}
          queueSourceScope={EMPTY_LOCAL_LIBRARY_SONG_SCOPE}
          queueSourceKeyOverride={playlistQueueSourceKey ?? undefined}
          deletingTrackPath={deletingTrackPath}
          onPlayIndex={(tracks, startIndex) => {
            const targetTrack = tracks[startIndex]
            if (!targetTrack) {
              return
            }

            void handlePlayIndex(targetTrack)
          }}
          onRevealTrack={track => void handleRevealTrack(track)}
          onRemoveFromPlaylist={track => void handleRemoveFromPlaylist(track)}
          onDeleteTrack={(track, mode) => void executeDeleteTrack(track, mode)}
          onEndReached={() => void loadPlaylistDetail(true)}
        />
      </div>

      <LocalLibraryPlaylistDialog
        open={playlistDialogOpen}
        title='重命名歌单'
        description='只修改歌单名称，歌单内歌曲不会受影响。'
        value={playlistDialogName}
        submitLabel='保存名称'
        pending={playlistDialogPending}
        duplicateError={playlistDialogError}
        onValueChange={setPlaylistDialogName}
        onOpenChange={closeRenameDialog}
        onSubmit={() => void handleRenamePlaylist()}
      />
    </LocalLibraryEntityDetailLayout>
  )
}

export default LocalLibraryPlaylistDetail
