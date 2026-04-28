import { create } from 'zustand'

import { getSubscribedAlbums } from '@/api/album'
import { getSubscribedArtists } from '@/api/artist'
import { getLikeList } from '@/api/list'
import { userPlaylist } from '@/api/user'
import type { AlbumListItem } from '@/pages/Albums/types'
import type { ArtistListItem } from '@/pages/Artists/types'
import {
  normalizeLibraryAlbumPage,
  normalizeSubscribedArtistList,
  resolveLibraryLikedSongIds,
} from '@/pages/Library/model'
import {
  applySongLikePendingState,
  applySongLikeState,
} from '../../shared/song-like-state'
import type { UserStoreState } from '@/types/core'
import { useAuthStore } from './auth-store'

const LIKED_ARTISTS_LIMIT = 2000
const LIKED_ALBUMS_PAGE_SIZE = 100

const initialUserState = {
  // 用户创建/收藏的歌单列表，首页和资料库会复用。
  likedPlaylist: [],
  // 网易云“我喜欢的音乐”歌单 id，收藏歌曲同步依赖它。
  myLikedPlaylistId: null,
  // 已收藏歌手列表，用于资料库展示。
  likedArtists: [],
  // 已收藏专辑列表，用于资料库展示。
  likedAlbums: [],
  // 已收藏歌手 id 集合，供详情页快速判断关注态。
  likedArtistIds: new Set<number>(),
  // 已收藏专辑 id 集合，供详情页快速判断收藏态。
  likedAlbumIds: new Set<number>(),
  // 已喜欢歌曲 id 集合，供歌曲列表和播放栏快速判断喜欢态。
  likedSongIds: new Set<number>(),
  // 正在提交喜欢/取消喜欢的歌曲 id，避免重复点击造成状态抖动。
  likedSongPendingIds: new Set<number>(),
  // 歌手收藏是否已完成首次加载。
  likedArtistsLoaded: false,
  // 专辑收藏是否已完成首次加载。
  likedAlbumsLoaded: false,
  // 喜欢歌曲 id 是否已完成首次加载。
  likedSongsLoaded: false,
  // 歌手收藏请求锁，避免并发重复拉取。
  likedArtistsLoading: false,
  // 专辑收藏请求锁，避免分页请求并发叠加。
  likedAlbumsLoading: false,
  // 喜欢歌曲请求锁，避免同一登录态下重复拉取。
  likedSongsLoading: false,
}

function toLikedArtistIdSet(artists: ArtistListItem[]) {
  return new Set(artists.map(artist => artist.id).filter(Boolean))
}

function toLikedAlbumIdSet(albums: AlbumListItem[]) {
  return new Set(albums.map(album => album.id).filter(Boolean))
}

function toLikedSongIdSet(songIds: number[]) {
  return new Set(songIds.filter(Boolean))
}

const useUserStore = create<UserStoreState>((set, get) => ({
  ...initialUserState,

  // 拉取用户歌单并识别“我喜欢的音乐”歌单 id。
  fetchLikedPlaylist: async () => {
    try {
      const userId = useAuthStore.getState().user?.userId
      if (!userId) {
        return
      }

      const res = await userPlaylist({ uid: userId })
      const data = res.data.playlist

      set(state => ({
        ...state,
        myLikedPlaylistId: data[0]?.id ?? null,
        likedPlaylist: data || [],
      }))
    } catch (err) {
      console.log('fetchLikedPlaylist', err)
    }
  },

  // 拉取收藏歌手列表，并同步生成 id 集合供 O(1) 查询。
  fetchLikedArtists: async () => {
    if (get().likedArtistsLoading) {
      return
    }

    const userId = useAuthStore.getState().user?.userId
    if (!userId) {
      return
    }

    set(state => ({
      ...state,
      likedArtistsLoading: true,
    }))

    try {
      const response = await getSubscribedArtists({
        limit: LIKED_ARTISTS_LIMIT,
        offset: 0,
      })

      const likedArtists = normalizeSubscribedArtistList(response.data)
      set(state => ({
        ...state,
        likedArtists,
        likedArtistIds: toLikedArtistIdSet(likedArtists),
        likedArtistsLoaded: true,
      }))
    } catch (error) {
      console.error('fetchLikedArtists failed', error)
    } finally {
      set(state => ({
        ...state,
        likedArtistsLoading: false,
      }))
    }
  },

  // 分页拉取收藏专辑，接口没有足够大单页时需要循环合并。
  fetchLikedAlbums: async () => {
    if (get().likedAlbumsLoading) {
      return
    }

    const userId = useAuthStore.getState().user?.userId
    if (!userId) {
      return
    }

    set(state => ({
      ...state,
      likedAlbumsLoading: true,
    }))

    try {
      const likedAlbums: AlbumListItem[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await getSubscribedAlbums({
          limit: LIKED_ALBUMS_PAGE_SIZE,
          offset,
          timestamp: Date.now(),
        })

        const page = normalizeLibraryAlbumPage(response.data, {
          limit: LIKED_ALBUMS_PAGE_SIZE,
          offset,
        })

        likedAlbums.push(...page.list)

        if (!page.hasMore || page.list.length === 0) {
          hasMore = false
        } else {
          offset += LIKED_ALBUMS_PAGE_SIZE
        }
      }

      set(state => ({
        ...state,
        likedAlbums,
        likedAlbumIds: toLikedAlbumIdSet(likedAlbums),
        likedAlbumsLoaded: true,
      }))
    } catch (error) {
      console.error('fetchLikedAlbums failed', error)
    } finally {
      set(state => ({
        ...state,
        likedAlbumsLoading: false,
      }))
    }
  },

  // 拉取喜欢歌曲 id 列表，供全局歌曲喜欢态判断。
  fetchLikedSongs: async () => {
    if (get().likedSongsLoading) {
      return
    }

    const userId = useAuthStore.getState().user?.userId
    if (!userId) {
      return
    }

    set(state => ({
      ...state,
      likedSongsLoading: true,
    }))

    try {
      const response = await getLikeList({
        uid: userId,
        timestamp: Date.now(),
      })
      const likedSongIds = resolveLibraryLikedSongIds(response.data)

      set(state => ({
        ...state,
        likedSongIds: toLikedSongIdSet(likedSongIds),
        likedSongsLoaded: true,
      }))
    } catch (error) {
      console.error('fetchLikedSongs failed', error)
    } finally {
      set(state => ({
        ...state,
        likedSongsLoading: false,
      }))
    }
  },

  // 判断歌手是否已收藏。
  isArtistLiked: artistId => {
    if (!artistId) {
      return false
    }
    return get().likedArtistIds.has(artistId)
  },

  // 判断专辑是否已收藏。
  isAlbumLiked: albumId => {
    if (!albumId) {
      return false
    }
    return get().likedAlbumIds.has(albumId)
  },

  // 判断歌曲是否已喜欢。
  isSongLiked: songId => {
    if (!songId) {
      return false
    }
    return get().likedSongIds.has(songId)
  },

  // 本地同步歌手关注态，配合接口成功后的 UI 乐观更新。
  toggleFollowed: (artistId, nextFollowed, artist) => {
    set(state => {
      const likedArtistIds = new Set(state.likedArtistIds)
      let likedArtists = state.likedArtists

      if (nextFollowed) {
        likedArtistIds.add(artistId)

        if (artist && !state.likedArtists.some(item => item.id === artistId)) {
          likedArtists = [artist, ...state.likedArtists]
        }
      } else {
        likedArtistIds.delete(artistId)
        likedArtists = state.likedArtists.filter(item => item.id !== artistId)
      }

      return {
        likedArtistIds,
        likedArtists,
      }
    })
  },

  // 本地同步专辑收藏态，配合接口成功后的 UI 乐观更新。
  toggleLikedAlbum: (albumId, nextLiked, album) => {
    set(state => {
      const likedAlbumIds = new Set(state.likedAlbumIds)
      let likedAlbums = state.likedAlbums

      if (nextLiked) {
        likedAlbumIds.add(albumId)

        if (album && !state.likedAlbums.some(item => item.id === albumId)) {
          likedAlbums = [album, ...state.likedAlbums]
        }
      } else {
        likedAlbumIds.delete(albumId)
        likedAlbums = state.likedAlbums.filter(item => item.id !== albumId)
      }

      return {
        likedAlbumIds,
        likedAlbums,
      }
    })
  },

  // 本地同步歌曲喜欢态，不直接负责远端请求。
  toggleLikedSong: (songId, nextLiked) => {
    set(state => ({
      likedSongIds: applySongLikeState(state.likedSongIds, songId, nextLiked),
    }))
  },

  // 标记歌曲喜欢接口提交中，列表和播放栏共用这份 pending 态。
  setSongLikePending: (songId, pending) => {
    set(state => ({
      likedSongPendingIds: applySongLikePendingState(
        state.likedSongPendingIds,
        songId,
        pending
      ),
    }))
  },

  // 登录用户切换或退出时清空所有用户私有缓存。
  resetUserData: () => {
    set({
      ...initialUserState,
      likedArtistIds: new Set<number>(),
      likedAlbumIds: new Set<number>(),
      likedSongIds: new Set<number>(),
      likedSongPendingIds: new Set<number>(),
    })
  },
}))

export { useUserStore }
