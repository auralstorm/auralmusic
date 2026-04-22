import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  deletePlaylist,
  getPlaylistDetail,
  getPlaylistTracks,
  togglePlaylistSubscription,
  updatePlaylist,
} from '@/api/list'
import TrackList from '@/components/TrackList'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import { useAuthStore } from '@/stores/auth-store'
import { usePlaybackStore } from '@/stores/playback-store'
import { useUserStore } from '@/stores/user'
import { toast } from 'sonner'
import { createPlaylistQueueSourceKey } from '../../../../shared/playback.ts'

import PlaylistDetailHero from './components/PlaylistDetailHero'
import PlaylistDetailMoreActions from './components/PlaylistDetailMoreActions'
import PlaylistDetailSkeleton from './components/PlaylistDetailSkeleton'
import { buildPlaylistDetailLoadRequest } from './playlist-detail-refresh.model'
import {
  EMPTY_PLAYLIST_DETAIL_STATE,
  normalizePlaylistDetailHero,
  normalizePlaylistTracks,
} from './playlist-detail.model'
import type { PlaylistDetailPageState } from './types'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const playbackQueueKey = createPlaylistQueueSourceKey(playlistId)

  const loadPlaylistDetail = useCallback(
    async (bustCache = false) => {
      if (!playlistId) {
        setLoading(false)
        setError('无效的歌单 ID')
        return
      }

      setLoading(true)
      setError('')
      setState(EMPTY_PLAYLIST_DETAIL_STATE)

      try {
        const request = buildPlaylistDetailLoadRequest(playlistId, bustCache)

        const [detailResponse, tracksResponse] = await Promise.all([
          getPlaylistDetail(request.detail.id, request.detail.timestamp),
          getPlaylistTracks(request.tracks),
        ])

        setState({
          hero: normalizePlaylistDetailHero(detailResponse.data),
          tracks: normalizePlaylistTracks(tracksResponse.data),
        })
      } catch (fetchError) {
        console.error('playlist detail fetch failed', fetchError)
        setError('歌单详情加载失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [playlistId]
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!playlistId) {
        setLoading(false)
        setError('无效的歌单 ID')
        return
      }

      setLoading(true)
      setError('')
      setState(EMPTY_PLAYLIST_DETAIL_STATE)

      try {
        const request = buildPlaylistDetailLoadRequest(playlistId, true)

        const [detailResponse, tracksResponse] = await Promise.all([
          getPlaylistDetail(request.detail.id, request.detail.timestamp),
          getPlaylistTracks(request.tracks),
        ])

        if (cancelled) {
          return
        }

        setState({
          hero: normalizePlaylistDetailHero(detailResponse.data),
          tracks: normalizePlaylistTracks(tracksResponse.data),
        })
      } catch (fetchError) {
        if (cancelled) {
          return
        }

        console.error('playlist detail fetch failed', fetchError)
        setError('歌单详情加载失败，请稍后重试')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [playlistId])

  if (loading && !state.hero) {
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
      <TrackList data={state.tracks} playbackQueueKey={playbackQueueKey} />
    </section>
  )
}

export default PlaylistDetail
