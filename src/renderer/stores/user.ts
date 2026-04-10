import { create } from 'zustand'

import { getSubscribedAlbums } from '@/api/album'
import { getSubscribedArtists } from '@/api/artist'
import { getLikeList } from '@/api/list'
import { userPlaylist } from '@/api/user'
import type { AlbumListItem } from '@/pages/Albums/albums.model'
import type { ArtistListItem } from '@/pages/Artists/artists.model'
import { normalizeLibraryAlbumPage } from '@/pages/Library/library-albums.model'
import { normalizeSubscribedArtistList } from '@/pages/Library/library-artists.model'
import { resolveLibraryLikedSongIds } from '@/pages/Library/library.model'
import {
  applySongLikePendingState,
  applySongLikeState,
} from '../../shared/song-like-state'
import { useAuthStore } from './auth-store'

const LIKED_ARTISTS_LIMIT = 2000
const LIKED_ALBUMS_PAGE_SIZE = 100

interface UserStoreState {
  likedPlaylist: unknown[]
  myLikedPlaylistId: number | null
  likedArtists: ArtistListItem[]
  likedAlbums: AlbumListItem[]
  likedArtistIds: Set<number>
  likedAlbumIds: Set<number>
  likedSongIds: Set<number>
  likedSongPendingIds: Set<number>
  likedArtistsLoaded: boolean
  likedAlbumsLoaded: boolean
  likedSongsLoaded: boolean
  likedArtistsLoading: boolean
  likedAlbumsLoading: boolean
  likedSongsLoading: boolean
  fetchLikedPlaylist: () => Promise<void>
  fetchLikedArtists: () => Promise<void>
  fetchLikedAlbums: () => Promise<void>
  fetchLikedSongs: () => Promise<void>
  isArtistLiked: (artistId: number) => boolean
  isAlbumLiked: (albumId: number) => boolean
  isSongLiked: (songId: number) => boolean
  resetUserData: () => void
  toggleFollowed: (
    artistId: number,
    nextFollowed: boolean,
    artist?: ArtistListItem
  ) => void
  toggleLikedAlbum: (
    albumId: number,
    nextLiked: boolean,
    album?: AlbumListItem
  ) => void
  toggleLikedSong: (songId: number, nextLiked: boolean) => void
  setSongLikePending: (songId: number, pending: boolean) => void
}

const initialUserState = {
  likedPlaylist: [],
  myLikedPlaylistId: null,
  likedArtists: [],
  likedAlbums: [],
  likedArtistIds: new Set<number>(),
  likedAlbumIds: new Set<number>(),
  likedSongIds: new Set<number>(),
  likedSongPendingIds: new Set<number>(),
  likedArtistsLoaded: false,
  likedAlbumsLoaded: false,
  likedSongsLoaded: false,
  likedArtistsLoading: false,
  likedAlbumsLoading: false,
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

  isArtistLiked: artistId => {
    if (!artistId) {
      return false
    }
    return get().likedArtistIds.has(artistId)
  },

  isAlbumLiked: albumId => {
    if (!albumId) {
      return false
    }
    return get().likedAlbumIds.has(albumId)
  },

  isSongLiked: songId => {
    if (!songId) {
      return false
    }
    return get().likedSongIds.has(songId)
  },

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

  toggleLikedSong: (songId, nextLiked) => {
    set(state => ({
      likedSongIds: applySongLikeState(state.likedSongIds, songId, nextLiked),
    }))
  },

  setSongLikePending: (songId, pending) => {
    set(state => ({
      likedSongPendingIds: applySongLikePendingState(
        state.likedSongPendingIds,
        songId,
        pending
      ),
    }))
  },

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
