import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  deletePlaylist,
  getPlaylistDetail,
  getPlaylistTracks,
  togglePlaylistSubscription,
  updatePlaylist,
} from '@/api/list'
import TrackList from '@/components/TrackList'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { ensureQueueSourceHydration } from '@/model/playback-queue-hydration.model'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { useAuthStore } from '@/stores/auth-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useUserStore } from '@/stores/user'
import { toast } from 'sonner'
import { createPlaylistQueueSourceKey } from '../../../../shared/playback.ts'

import PlaylistDetailHero from './components/PlaylistDetailHero'
import PlaylistDetailMoreActions from './components/PlaylistDetailMoreActions'
import PlaylistDetailSkeleton from './components/PlaylistDetailSkeleton'
import {
  buildPlaylistDetailLoadRequest,
  buildPlaylistTrackPageRequest,
} from './playlist-detail-refresh.model'
import {
  EMPTY_PLAYLIST_DETAIL_STATE,
  normalizePlaylistDetailHero,
  normalizePlaylistTracks,
} from './playlist-detail.model'
import type { PlaylistDetailPageState } from './types'

const PAGE_SIZE = 30

const PlaylistDetail = () => {
  useScrollToTopOnRouteEnter()

  const navigate = useNavigate()
  const { id } = useParams()
  const playlistId = Number(id)
  const currentUserId = useAuthStore(state => state.user?.userId)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const fetchLikedPlaylist = useUserStore(state => state.fetchLikedPlaylist)
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)

  const [state, setState] = useState<PlaylistDetailPageState>(
    EMPTY_PLAYLIST_DETAIL_STATE
  )
  const [pageLoading, setPageLoading] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [trackError, setTrackError] = useState('')
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const playbackQueueKey = createPlaylistQueueSourceKey(playlistId)
  const requestTimestampRef = useRef<number | undefined>(undefined)

  const fetchTrackPage = useCallback(
    async (offset: number, limit: number) => {
      if (!playlistId) {
        if (offset === 0) {
          setError('无效的歌单 ID')
          setIsInitialLoading(false)
        }

        return { list: [], hasMore: false }
      }

      try {
        if (offset === 0) {
          setTrackError('')
        }

        const response = await getPlaylistTracks(
          buildPlaylistTrackPageRequest({
            playlistId,
            offset,
            limit,
            timestamp: offset === 0 ? requestTimestampRef.current : undefined,
          })
        )
        const tracks = normalizePlaylistTracks(response.data)

        return {
          list: tracks,
          hasMore: tracks.length >= limit,
        }
      } catch (fetchError) {
        console.error('playlist track page fetch failed', fetchError)

        if (offset === 0) {
          setTrackError('歌单详情加载失败，请稍后重试')
        }

        return {
          list: [],
          hasMore: false,
        }
      } finally {
        if (offset === 0) {
          setIsInitialLoading(false)
        }
      }
    },
    [playlistId]
  )

  const {
    data: tracks,
    loading,
    hasMore,
    loadMore,
    reset,
  } = useIntersectionLoadMore(fetchTrackPage, {
    limit: PAGE_SIZE,
  })

  const loadPlaylistDetail = useCallback(
    async (bustCache = false) => {
      if (!playlistId) {
        setPageLoading(false)
        setIsInitialLoading(false)
        setError('无效的歌单 ID')
        setState(EMPTY_PLAYLIST_DETAIL_STATE)
        return
      }

      const request = buildPlaylistDetailLoadRequest(playlistId, bustCache)

      requestTimestampRef.current = request.detail.timestamp
      setPageLoading(true)
      setIsInitialLoading(true)
      setError('')
      setTrackError('')
      setState(EMPTY_PLAYLIST_DETAIL_STATE)
      reset()

      try {
        const detailResponse = await getPlaylistDetail(
          request.detail.id,
          request.detail.timestamp
        )

        setState(previous => ({
          hero: normalizePlaylistDetailHero(detailResponse.data),
          tracks: previous.tracks,
        }))
      } catch (fetchError) {
        console.error('playlist detail fetch failed', fetchError)
        setError('歌单详情加载失败，请稍后重试')
      } finally {
        setPageLoading(false)
      }
    },
    [playlistId, reset]
  )

  useEffect(() => {
    void loadPlaylistDetail(true)
  }, [loadPlaylistDetail])

  useEffect(() => {
    setState(previous => {
      if (previous.tracks === tracks) {
        return previous
      }

      return {
        ...previous,
        tracks,
      }
    })
  }, [tracks])

  if (pageLoading && !state.hero) {
    return <PlaylistDetailSkeleton />
  }

  if (error && !state.hero) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          {error}
        </div>
      </section>
    )
  }

  if (!state.hero) {
    return (
      <section className='pb-8'>
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          暂无歌单详情数据
        </div>
      </section>
    )
  }

  const isOwnPlaylist =
    Boolean(currentUserId) && state.hero.creatorUserId === currentUserId

  const handlePlayPlaylist = () => {
    if (!state.tracks.length) {
      toast.error('暂无可播放的歌单歌曲')
      return
    }

    playQueueFromIndex(state.tracks, 0, playbackQueueKey)
    void ensureQueueSourceHydration({
      sourceKey: playbackQueueKey,
      seedQueue: state.tracks,
      startOffset: state.tracks.length,
    })
  }

  const handleTogglePlaylistFavorite = async () => {
    if (!hasHydrated || !currentUserId) {
      openLoginDialog()
      return
    }

    if (!state.hero || isOwnPlaylist || favoriteLoading) {
      return
    }

    const nextSubscribed = !state.hero.isSubscribed
    setFavoriteLoading(true)

    try {
      await togglePlaylistSubscription({
        id: state.hero.id,
        t: nextSubscribed ? 1 : 2,
      })

      setState(prevState => {
        if (!prevState.hero) {
          return prevState
        }

        return {
          ...prevState,
          hero: {
            ...prevState.hero,
            isSubscribed: nextSubscribed,
          },
        }
      })

      void fetchLikedPlaylist()
    } catch (favoriteError) {
      console.error('playlist subscription toggle failed', favoriteError)
      toast.error(
        nextSubscribed ? '收藏歌单失败，请稍后重试' : '取消收藏失败，请稍后重试'
      )
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleEditPlaylist = async (payload: {
    id: number
    name: string
    desc: string
  }) => {
    if (!hasHydrated || !currentUserId) {
      openLoginDialog()
      return
    }

    if (editSubmitting) {
      return
    }

    setEditSubmitting(true)

    try {
      await updatePlaylist({
        ...payload,
        timestamp: Date.now(),
      })

      toast.success('歌单已更新')
      await loadPlaylistDetail(true)
      void fetchLikedPlaylist()
    } catch (updateError) {
      console.error('playlist update failed', updateError)
      toast.error('歌单更新失败，请稍后重试')
      throw updateError
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeletePlaylist = async (targetPlaylistId: number) => {
    if (!hasHydrated || !currentUserId) {
      openLoginDialog()
      return
    }

    if (deleteSubmitting) {
      return
    }

    setDeleteSubmitting(true)

    try {
      await deletePlaylist({
        id: targetPlaylistId,
        timestamp: Date.now(),
      })

      toast.success('歌单已删除')
      void fetchLikedPlaylist()
      navigate('/library')
    } catch (deleteError) {
      console.error('playlist delete failed', deleteError)
      toast.error('歌单删除失败，请稍后重试')
      throw deleteError
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <section className='space-y-10 pb-8'>
      <PlaylistDetailHero
        hero={state.hero}
        showFavoriteButton={!isOwnPlaylist}
        favoriteLoading={favoriteLoading}
        onToggleFavorite={handleTogglePlaylistFavorite}
        onPlay={handlePlayPlaylist}
        moreActions={
          isOwnPlaylist ? (
            <PlaylistDetailMoreActions
              playlistId={state.hero.id}
              playlistName={state.hero.name}
              playlistDescription={state.hero.description}
              isOwnPlaylist={isOwnPlaylist}
              editSubmitting={editSubmitting}
              deleteSubmitting={deleteSubmitting}
              onEdit={handleEditPlaylist}
              onDelete={handleDeletePlaylist}
            />
          ) : null
        }
      />
      {trackError && state.tracks.length === 0 && !isInitialLoading ? (
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          {trackError}
        </div>
      ) : isInitialLoading && state.tracks.length === 0 ? (
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
          正在加载歌单歌曲...
        </div>
      ) : (
        <TrackList
          data={state.tracks}
          playbackQueueKey={playbackQueueKey}
          onEndReached={() => void loadMore()}
          hasMore={hasMore}
          loading={loading && !isInitialLoading}
          loadingText='正在加载更多歌曲...'
          endText='没有更多歌曲了'
        />
      )}
    </section>
  )
}

export default PlaylistDetail
