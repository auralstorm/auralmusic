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
  LocalLibraryArtistRecord,
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
  queryAllArtistPages,
  queryAllTrackPages,
} from '@/pages/LocalLibrary/local-library-queries'
import {
  buildLocalLibraryPlaybackQueue,
  createLocalLibraryArtistQueueSourceKey,
} from '@/pages/LocalLibrary/local-library-playback.model'
import { buildLocalLibraryArtistMetaItems } from './local-library-artist-detail.model'

const LocalLibraryArtistDetail = () => {
  useScrollToTopOnRouteEnter()

  const { artistName } = useParams<{ artistName: string }>()

  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const queueSourceKey = usePlaybackStore(state => state.queueSourceKey)
  const resetPlayback = usePlaybackStore(state => state.resetPlayback)
  const syncQueueFromSource = usePlaybackStore(
    state => state.syncQueueFromSource
  )

  const decodedArtistName = useMemo(
    () => decodeURIComponent(artistName ?? ''),
    [artistName]
  )
  const isValidArtistDetail = decodedArtistName.length > 0
  const artistQueueSourceKey = useMemo(
    () =>
      isValidArtistDetail
        ? createLocalLibraryArtistQueueSourceKey(decodedArtistName)
        : null,
    [decodedArtistName, isValidArtistDetail]
  )

  const [artist, setArtist] = useState<LocalLibraryArtistRecord | null>(null)
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
  const artistRef = useRef(artist)
  const tracksStateRef = useRef(tracksState)

  useEffect(() => {
    artistRef.current = artist
  }, [artist])

  useEffect(() => {
    tracksStateRef.current = tracksState
  }, [tracksState])

  const loadArtistDetail = useCallback(
    async (append = false) => {
      if (!isValidArtistDetail) {
        setArtist(null)
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
        const [artistsResult, trackResult] = await Promise.all([
          append
            ? Promise.resolve<LocalLibraryArtistRecord | null>(
                artistRef.current
              )
            : queryAllArtistPages('', 120).then(items => {
                return (
                  items.find(item => item.name === decodedArtistName) ?? null
                )
              }),
          localLibraryApi.queryTracks({
            keyword: debouncedKeyword,
            scopeType: 'artist',
            scopeValue: decodedArtistName,
            scopeArtistName: null,
            offset: nextOffset,
            limit: currentTracksState.limit,
          }),
        ])

        if (requestId !== requestIdRef.current) {
          return
        }

        setArtist(artistsResult)
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

        console.error('failed to load local artist detail', error)
        setTracksState(previous => ({
          ...previous,
          isLoading: false,
          hasLoaded: true,
        }))
        toast.error('加载本地歌手失败，请稍后重试')
      } finally {
        if (requestId === requestIdRef.current) {
          setIsInitialLoading(false)
        }
      }
    },
    [debouncedKeyword, decodedArtistName, isValidArtistDetail]
  )

  useEffect(() => {
    setTracksState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
      )
    )
    setIsInitialLoading(true)
    void loadArtistDetail(false)
  }, [loadArtistDetail])

  const refreshArtistDetail = useCallback(async () => {
    setTracksState(
      createEmptyLocalLibraryPagedState(
        DEFAULT_LOCAL_LIBRARY_PLAYLIST_TRACK_QUERY_LIMIT
      )
    )
    await loadArtistDetail(false)
  }, [loadArtistDetail])

  const loadFullArtistTracks = useCallback(async () => {
    if (!isValidArtistDetail) {
      return []
    }

    return queryAllTrackPages(
      '',
      {
        type: 'artist',
        key: null,
        value: decodedArtistName,
        artistName: null,
      },
      200
    )
  }, [decodedArtistName, isValidArtistDetail])

  const handlePlayIndex = useCallback(
    async (track: LocalLibraryTrackRecord) => {
      if (!artistQueueSourceKey) {
        return
      }

      const fullTracks = await loadFullArtistTracks()
      const startIndex = fullTracks.findIndex(
        item => item.filePath === track.filePath
      )

      if (startIndex < 0) {
        toast.error('当前歌曲已不在本地歌手列表中')
        return
      }

      playQueueFromIndex(
        buildLocalLibraryPlaybackQueue(fullTracks, artistQueueSourceKey),
        startIndex,
        artistQueueSourceKey
      )
    },
    [artistQueueSourceKey, loadFullArtistTracks, playQueueFromIndex]
  )

  const handlePlayAll = useCallback(async () => {
    if (!artistQueueSourceKey) {
      return
    }

    const fullTracks = await loadFullArtistTracks()
    if (fullTracks.length === 0) {
      toast.error('本地歌手里还没有歌曲')
      return
    }

    playQueueFromIndex(
      buildLocalLibraryPlaybackQueue(fullTracks, artistQueueSourceKey),
      0,
      artistQueueSourceKey
    )
  }, [artistQueueSourceKey, loadFullArtistTracks, playQueueFromIndex])

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

  const syncArtistQueue = useCallback(async () => {
    if (!artistQueueSourceKey || queueSourceKey !== artistQueueSourceKey) {
      return
    }

    const nextTracks = await loadFullArtistTracks()
    syncQueueFromSource(
      artistQueueSourceKey,
      buildLocalLibraryPlaybackQueue(nextTracks, artistQueueSourceKey)
    )
  }, [
    artistQueueSourceKey,
    loadFullArtistTracks,
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

        await refreshArtistDetail()
        await syncArtistQueue()

        if (mode === 'permanent' && isDeletingCurrentTrack) {
          resetPlayback()
        }

        toast.success(
          mode === 'permanent' ? '歌曲已彻底删除' : '歌曲已从本地乐库移除'
        )
      } catch (error) {
        console.error('failed to delete local artist track', error)
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
      refreshArtistDetail,
      resetPlayback,
      syncArtistQueue,
    ]
  )

  if (!isValidArtistDetail) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地歌手'
            subtitle='无效的歌手参数'
            metaItems={[]}
            description='当前歌手详情地址无效，请返回本地乐库重新选择。'
          />
        }
      >
        <div className='text-muted-foreground py-10 text-center text-sm'>
          无效的本地歌手参数。
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  if (isInitialLoading && !artist) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地歌手'
            subtitle='正在加载本地歌手详情'
            metaItems={[]}
            description='正在读取本地歌手歌曲与封面信息。'
          />
        }
      >
        <div className='flex justify-center py-12'>
          <Spinner className='text-primary size-6' />
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  if (!artist) {
    return (
      <LocalLibraryEntityDetailLayout
        hero={
          <LocalLibraryEntityDetailHero
            coverUrl={null}
            title='本地歌手'
            subtitle='未找到对应歌手'
            metaItems={[]}
            description='目标本地歌手可能已被删除，或当前筛选参数已经失效。'
          />
        }
      >
        <div className='text-muted-foreground py-10 text-center text-sm'>
          未找到对应的本地歌手。
        </div>
      </LocalLibraryEntityDetailLayout>
    )
  }

  return (
    <LocalLibraryEntityDetailLayout
      hero={
        <LocalLibraryEntityDetailHero
          coverUrl={artist.coverUrl || null}
          title={artist.name}
          subtitle='本地歌手'
          metaItems={buildLocalLibraryArtistMetaItems(artist)}
          description='仅收录本地乐库中的同歌手歌曲，支持独立播放与文件管理。'
          onPlay={() => void handlePlayAll()}
        />
      }
    >
      <div className='space-y-6'>
        <div className='flex justify-end'>
          <Input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder='搜索歌手内歌曲'
            className='h-11 max-w-sm rounded-full border-[#dfdbf6] bg-white/72 px-5 text-sm shadow-none dark:border-white/12 dark:bg-white/6'
          />
        </div>

        <LocalLibraryTrackList
          tracks={tracksState.items}
          totalCount={tracksState.total}
          isLoadingMore={tracksState.isLoading}
          queueSourceScope={{
            type: 'artist',
            key: artist.id,
            value: artist.name,
            artistName: null,
          }}
          queueSourceKeyOverride={artistQueueSourceKey ?? undefined}
          deletingTrackPath={deletingTrackPath}
          onPlayIndex={(tracks, startIndex) => {
            const targetTrack = tracks[startIndex]
            if (targetTrack) {
              void handlePlayIndex(targetTrack)
            }
          }}
          onRevealTrack={track => void handleRevealTrack(track)}
          onDeleteTrack={(track, mode) => void executeDeleteTrack(track, mode)}
          onEndReached={() => void loadArtistDetail(true)}
        />
      </div>
    </LocalLibraryEntityDetailLayout>
  )
}

export default LocalLibraryArtistDetail
