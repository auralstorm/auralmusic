import type {
  LocalLibraryAlbumRecord,
  LocalLibraryArtistRecord,
  LocalLibraryPlaylistRecord,
  LocalLibraryTrackRecord,
} from '../../../shared/local-library.ts'
import {
  buildLocalLibraryAlbumQueryInput,
  buildLocalLibraryArtistQueryInput,
  buildLocalLibraryPlaylistDetailQueryInput,
  buildLocalLibraryPlaylistQueryInput,
  buildLocalLibraryTrackQueryInput,
  type LocalLibrarySongScope,
} from './local-library.model'

export function getLocalLibraryApi() {
  return window.electronLocalLibrary ?? null
}

export async function queryAllTrackPages(
  keyword: string,
  scope: LocalLibrarySongScope,
  limit = 200
) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryTrackRecord[]
  }

  const tracks: LocalLibraryTrackRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryTracks(
      buildLocalLibraryTrackQueryInput(keyword, scope, offset, limit)
    )

    tracks.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return tracks
}

export async function queryAllAlbumPages(keyword: string, limit = 120) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryAlbumRecord[]
  }

  const albums: LocalLibraryAlbumRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryAlbums(
      buildLocalLibraryAlbumQueryInput(keyword, offset, limit)
    )

    albums.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return albums
}

export async function queryAllArtistPages(keyword: string, limit = 120) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryArtistRecord[]
  }

  const artists: LocalLibraryArtistRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryArtists(
      buildLocalLibraryArtistQueryInput(keyword, offset, limit)
    )

    artists.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return artists
}

export async function queryAllPlaylistPages(
  keyword: string,
  trackFilePath: string | null,
  limit = 120
) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryPlaylistRecord[]
  }

  const playlists: LocalLibraryPlaylistRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.queryPlaylists(
      buildLocalLibraryPlaylistQueryInput(keyword, trackFilePath, offset, limit)
    )

    playlists.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return playlists
}

export async function queryAllPlaylistDetailPages(
  playlistId: number,
  keyword = '',
  limit = 200
) {
  const localLibraryApi = getLocalLibraryApi()
  if (!localLibraryApi) {
    return [] as LocalLibraryTrackRecord[]
  }

  const tracks: LocalLibraryTrackRecord[] = []
  let offset = 0

  while (true) {
    const result = await localLibraryApi.getPlaylistDetail(
      buildLocalLibraryPlaylistDetailQueryInput(
        playlistId,
        keyword,
        offset,
        limit
      )
    )

    tracks.push(...result.items)
    offset += result.items.length

    if (result.items.length === 0 || offset >= result.total) {
      break
    }
  }

  return tracks
}
