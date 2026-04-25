import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { usePlaybackStore } from '@/stores/playback-store'
import { Spinner } from '@/components/ui/spinner'
import { parseLocalMediaUrl } from '../../../shared/local-media.ts'
import type {
  LocalLibraryAlbumRecord,
  LocalLibraryTrackDeleteMode,
  LocalLibraryTrackRecord,
} from '../../../shared/local-library.ts'
import LocalLibraryEntityDetailHero from '@/pages/LocalLibraryDetail/components/LocalLibraryEntityDetailHero'
import LocalLibraryEntityDetailLayout from '@/pages/LocalLibraryDetail/components/LocalLibraryEntityDetailLayout'
import LocalLibraryTrackList from '@/pages/LocalLibrary/components/LocalLibraryTrackList'
import {
  createEmptyLocalLibraryPagedState,
  DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT,
} from '@/pages/LocalLibrary/local-library.model'
import {
  getLocalLibraryApi,
  queryAllAlbumPages,
  queryAllTrackPages,
} from '@/pages/LocalLibrary/local-library-queries'
import {
  buildLocalLibraryPlaybackQueue,
  createLocalLibraryAlbumQueueSourceKey,
} from '@/pages/LocalLibrary/local-library-playback.model'
import { buildLocalLibraryAlbumMetaItems } from './local-library-album-detail.model'

const LocalLibraryAlbumDetail = () => {
  useScrollToTopOnRouteEnter()

  const { albumName, artistName } = useParams<{
    albumName: string
    artistName: string
  }>()

  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const queueSourceKey = usePlaybackStore(state => state.queueSourceKey)
  const resetPlayback = usePlaybackStore(state => state.resetPlayback)
  const syncQueueFromSource = usePlaybackStore(
    state => state.syncQueueFromSource
  )

  const decodedAlbumName = useMemo(
    () => decodeURIComponent(albumName ?? ''),
    [albumName]
  )
  const decodedArtistName = useMemo(
    () => decodeURIComponent(artistName ?? ''),
    [artistName]
  )
  const isValidAlbumDetail =
    decodedAlbumName.length > 0 && decodedArtistName.length > 0
  const albumQueueSourceKey = useMemo(
    () =>
      isValidAlbumDetail
        ? createLocalLibraryAlbumQueueSourceKey(
            decodedAlbumName,
            decodedArtistName
          )
        : null,
    [decodedAlbumName, decodedArtistName, isValidAlbumDetail]
  )

  const [album, setAlbum] = useState<LocalLibraryAlbumRecord | null>(null)
  const [tracksState, setTracksState] = useState(() =>
    createEmptyLocalLibraryPagedState<LocalLibraryTrackRecord>(
      DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
    )
  )
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword, 250)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [deletingTrackPath, setDeletingTrackPath] = useState<string | null>(
    null
  )
  const requestIdRef = useRef(0)
  const albumRef = useRef(album)
  const tracksStateRef = useRef(tracksState)

  useEffect(() => {
    albumRef.current = album
  }, [album])

  useEffect(() => {
    tracksStateRef.current = tracksState
  }, [tracksState])

  const loadAlbumDetail = useCallback(
    async (append = false) => {
      if (!isValidAlbumDetail) {
        setAlbum(null)
        setTracksState(
          createEmptyLocalLibraryPagedState(
            DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
          )
        )
        setIsInitialLoading(false)
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
        const [albumsResult, trackResult] = await Promise.all([
          append
            ? Promise.resolve<LocalLibraryAlbumRecord | null>(albumRef.current)
            : queryAllAlbumPages('', 120).then(items => {
                return (
                  items.find(
                    item =>
                      item.name === decodedAlbumName &&
                      item.artistName === decodedArtistName
                  ) ?? null
                )
              }),
          localLibraryApi.queryTracks({
            keyword: debouncedKeyword,
            scopeType: 'album',
            scopeValue: decodedAlbumName,
            scopeArtistName: decodedArtistName,
            offset: nextOffset,
            limit: currentTracksState.limit,
          }),
        ])

        if (requestId !== requestIdRef.current) {
          return
        }

        setAlbum(albumsResult)
        setTracksState(previous => ({
          items: append
            ? [...previous.items, ...trackResult.items]
            : trackResult.items,
          total: trackResult.total,
          offset: trackResult.offset,
          limit: trackResult.limit,
          isLoading: false,
          hasLoaded: true,
        }))
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return
        }

        console.error('failed to load local album detail', error)
        setTracksState(previous => ({
          ...previous,
          isLoading: false,
          hasLoaded: true,
        }))
        toast.error('加载本地专辑失败，请稍后重试')
      } finally {
        if (requestId === requestIdRef.current) {
          setIsInitialLoading(false)
        }
      }
    },
    [debouncedKeyword, decodedAlbumName, decodedArtistName, isValidAlbumDetail]
  )

  useEffect(() => {
    setTracksState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
      )
    )
    setIsInitialLoading(true)
    void loadAlbumDetail(false)
  }, [loadAlbumDetail])

  const refreshAlbumDetail = useCallback(async () => {
    setTracksState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
      )
    )
    await loadAlbumDetail(false)
  }, [loadAlbumDetail])

  const loadFullAlbumTracks = useCallback(async () => {
    if (!isValidAlbumDetail) {
      return []
    }

    return queryAllTrackPages(
      '',
      {
        type: 'album',
        key: null,
        value: decodedAlbumName,
        artistName: decodedArtistName,
      },
      200
    )
  }, [decodedAlbumName, decodedArtistName, isValidAlbumDetail])

  const handlePlayIndex = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      if (!albumQueueSourceKey) {
        return
      }

      const fullTracks = await loadFullAlbumTracks()
      const startIndex = fullTracks.findIndex(
        item => item.filePath === track.filePath
      )

      if (startIndex < 0) {
        toast.error('当前歌曲已不在本地专辑中')
        return
      }

      playQueueFromIndex(
        buildLocalLibraryPlaybackQueue(fullTracks, albumQueueSourceKey),
        startIndex,
        albumQueueSourceKey
      )
    },
    [albumQueueSourceKey, loadFullAlbumTracks, playQueueFromIndex]
  )

  const handlePlayAll = useCallback(async () => {
    if (!albumQueueSourceKey) {
      return
    }

    const fullTracks = await loadFullAlbumTracks()
    if (fullTracks.length === 0) {
      toast.error('本地专辑里还没有歌曲')
      return
    }

    playQueueFromIndex(
      buildLocalLibraryPlaybackQueue(fullTracks, albumQueueSourceKey),
      0,
      albumQueueSourceKey
    )
  }, [albumQueueSourceKey, loadFullAlbumTracks, playQueueFromIndex])

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

  const syncAlbumQueue = useCallback(async () => {
    if (!albumQueueSourceKey || queueSourceKey !== albumQueueSourceKey) {
      return
    }

    const nextTracks = await loadFullAlbumTracks()
    syncQueueFromSource(
      albumQueueSourceKey,
      buildLocalLibraryPlaybackQueue(nextTracks, albumQueueSourceKey)
    )
  }, [
    albumQueueSourceKey,
    loadFullAlbumTracks,
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

        await refreshAlbumDetail()
        await syncAlbumQueue()

        if (mode === 'permanent' && isDeletingCurrentTrack) {
          resetPlayback()
        }

        toast.success(
          mode === 'permanent' ? '歌曲已彻底删除' : '歌曲已从本地乐库移除'
        )
      } catch (error) {
        console.error('failed to delete local album track', error)
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
      refreshAlbumDetail,
      resetPlayback,
      syncAlbumQueue,
    ]
  )

  if (!isValidAlbumDetail) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地专辑'
            subtitle='无效的专辑参数'
            metaItems={[]}
            description='当前专辑详情地址无效，请返回本地乐库重新选择。'
          />
        }
      >
        <div className='text-muted-foreground py-10 text-center text-sm'>
          无效的本地专辑参数。
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  if (isInitialLoading && !album) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地专辑'
            subtitle='正在加载本地专辑详情'
            metaItems={[]}
            description='正在读取本地专辑歌曲与封面信息。'
          />
        }
      >
        <div className='flex justify-center py-12'>
          <Spinner className='text-primary size-6' />
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  if (!album) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地专辑'
            subtitle='未找到对应专辑'
            metaItems={[]}
            description='目标本地专辑可能已被删除，或当前筛选参数已经失效。'
          />
        }
      >
        <div className='text-muted-foreground py-10 text-center text-sm'>
          未找到对应的本地专辑。
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  return (
    <LocalLibraryEntityDetailLayout
      hero={
        <LocalLibraryEntityDetailHero
          coverUrl={album.coverUrl || null}
          title={album.name}
          subtitle={album.artistName}
          metaItems={buildLocalLibraryAlbumMetaItems(album)}
          description='仅收录本地乐库中的同专辑歌曲，支持独立播放与文件管理。'
          onPlay={() => void handlePlayAll()}
        />
      }
    >
      <div className='space-y-6'>
        <div className='flex justify-end'>
          <Input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder='搜索专辑内歌曲'
            className='h-11 max-w-sm rounded-full border-[#dfdbf6] bg-white/72 px-5 text-sm shadow-none dark:border-white/12 dark:bg-white/6'
          />
        </div>

        <LocalLibraryTrackList
          tracks={tracksState.items}
          totalCount={tracksState.total}
          isLoadingMore={tracksState.isLoading}
          queueSourceScope={{
            type: 'album',
            key: album.id,
            value: album.name,
            artistName: album.artistName,
          }}
          queueSourceKeyOverride={albumQueueSourceKey ?? undefined}
          deletingTrackPath={deletingTrackPath}
          onPlayIndex={(tracks, startIndex) => {
            const targetTrack = tracks[startIndex]
            if (targetTrack) {
              void handlePlayIndex(targetTrack)
            }
          }}
          onRevealTrack={track => void handleRevealTrack(track)}
          onDeleteTrack={(track, mode) => void executeDeleteTrack(track, mode)}
          onEndReached={() => void loadAlbumDetail(true)}
        />
      </div>
    </LocalLibraryEntityDetailLayout>
  )
}

export default LocalLibraryAlbumDetail
