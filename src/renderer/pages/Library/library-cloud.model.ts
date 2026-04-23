import type { DailySongRowItem } from '../DailySongs/types'
import type {
  LibraryCloudPage,
  NormalizeLibraryCloudPageOptions,
  RawCloudArtist,
  RawCloudItem,
  RawLibraryCloudBody,
} from './types'

function unwrapLibraryCloudBody(
  response?: RawLibraryCloudBody | RawCloudItem[] | null
): RawLibraryCloudBody | RawCloudItem[] {
  if (!response) {
    return {}
  }

  if (Array.isArray(response)) {
    return response
  }

  if (
    Array.isArray(response.data) ||
    typeof response.more === 'boolean' ||
    typeof response.hasMore === 'boolean' ||
    typeof response.count === 'number'
  ) {
    return response
  }

  if (response.data && typeof response.data === 'object') {
    return unwrapLibraryCloudBody(response.data)
  }

  return response
}

function formatArtistNames(artists?: RawCloudArtist[]) {
  const normalizedArtists = (artists || [])
    .map(artist => {
      const name = artist.name?.trim() || ''
      if (!name) {
        return null
      }

      if (artist.id) {
        return {
          id: artist.id,
          name,
        }
      }

      return {
        name,
      }
    })
    .filter((artist): artist is { id?: number; name: string } =>
      Boolean(artist)
    )

  return {
    artists: normalizedArtists,
    artistNames: normalizedArtists.map(artist => artist.name).join(' / '),
  }
}

function resolveArtistNames(
  item: RawCloudItem,
  simpleSongArtists: {
    artists: Array<{ id?: number; name: string }>
    artistNames: string
  }
) {
  return (
    simpleSongArtists.artistNames ||
    item.artist?.trim() ||
    item.artistName?.trim() ||
    '未知歌手'
  )
}

function normalizeLibraryCloudList(items?: RawCloudItem[]): DailySongRowItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  return items.flatMap(item => {
    const id = item.songId ?? item.simpleSong?.id ?? item.id

    if (!id) {
      return []
    }

    const simpleSongArtistState = formatArtistNames(item.simpleSong?.ar)

    return [
      {
        id,
        name:
          item.simpleSong?.name ||
          item.songName ||
          item.name ||
          item.fileName ||
          '未知歌曲',
        artistNames: resolveArtistNames(item, simpleSongArtistState),
        artists: simpleSongArtistState.artists.length
          ? simpleSongArtistState.artists
          : undefined,
        albumName:
          item.simpleSong?.al?.name ||
          item.album?.trim() ||
          item.albumName?.trim() ||
          '未知专辑',
        coverUrl:
          item.simpleSong?.al?.picUrl ||
          item.simpleSong?.al?.coverUrl ||
          item.coverUrl ||
          item.cover ||
          '',
        duration: item.simpleSong?.dt || item.duration || item.dt || 0,
      },
    ]
  })
}

export function normalizeLibraryCloudPage(
  response?: RawLibraryCloudBody | null,
  { limit, offset }: NormalizeLibraryCloudPageOptions = { limit: 30, offset: 0 }
): LibraryCloudPage {
  const body = unwrapLibraryCloudBody(response)

  if (Array.isArray(body)) {
    return {
      list: normalizeLibraryCloudList(body),
      hasMore: body.length >= limit,
    }
  }

  const list = normalizeLibraryCloudList(
    Array.isArray(body.data) ? body.data : undefined
  )

  if (typeof body.more === 'boolean') {
    return {
      list,
      hasMore: body.more,
    }
  }

  if (typeof body.hasMore === 'boolean') {
    return {
      list,
      hasMore: body.hasMore,
    }
  }

  if (typeof body.count === 'number') {
    return {
      list,
      hasMore: offset + list.length < body.count,
    }
  }

  return {
    list,
    hasMore: list.length >= limit,
  }
}
