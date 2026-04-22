import type { LibraryMvItem } from './types'
import type {
  LibraryMvPage,
  NormalizeLibraryMvPageOptions,
  RawMvCreator,
  RawLibraryMvItem,
  RawMvArtist,
  RawSubscribedMvsBody,
} from './types'

function unwrapSubscribedMvsBody(
  response?: RawSubscribedMvsBody | RawLibraryMvItem[] | null
): {
  mvs: RawLibraryMvItem[]
  more?: boolean
  hasMore?: boolean
  count?: number
} {
  if (!response) {
    return { mvs: [] }
  }

  if (Array.isArray(response)) {
    return { mvs: response }
  }

  const nested =
    response.data && typeof response.data === 'object'
      ? unwrapSubscribedMvsBody(response.data)
      : { mvs: [] as RawLibraryMvItem[] }

  return {
    mvs: Array.isArray(response.mvs) ? response.mvs : nested.mvs,
    more: typeof response.more === 'boolean' ? response.more : nested.more,
    hasMore:
      typeof response.hasMore === 'boolean' ? response.hasMore : nested.hasMore,
    count: typeof response.count === 'number' ? response.count : nested.count,
  }
}

function formatMVArtistNames(
  artistName?: string,
  artists?: RawMvArtist[],
  creators?: RawMvCreator[]
) {
  if (artistName?.trim()) {
    return artistName.trim()
  }

  const artistJoined =
    artists
      ?.map(artist => artist.name?.trim() || '')
      .filter(Boolean)
      .join(' / ') || ''

  if (artistJoined) {
    return artistJoined
  }

  const creatorJoined =
    creators
      ?.map(
        creator => creator.userName?.trim() || creator.nickname?.trim() || ''
      )
      .filter(Boolean)
      .join(' / ') || ''

  return creatorJoined || '未知歌手'
}

function normalizeMvList(mvs?: RawLibraryMvItem[]): LibraryMvItem[] {
  if (!Array.isArray(mvs)) {
    return []
  }

  return mvs.flatMap(mv => {
    const id =
      typeof mv?.id === 'number'
        ? mv.id
        : typeof mv?.vid === 'number'
          ? mv.vid
          : typeof mv?.vid === 'string' && mv.vid.trim()
            ? Number(mv.vid)
            : 0

    if (!id) {
      return []
    }

    return [
      {
        id,
        name: mv.name || mv.title || '未知 MV',
        coverUrl: mv.coverUrl || mv.cover || mv.imgurl16v9 || '',
        artistName: formatMVArtistNames(mv.artistName, mv.artists, mv.creator),
        playCount: mv.playCount || 0,
        publishTime: mv.publishTime,
      },
    ]
  })
}

export function normalizeLibraryMvPage(
  response?: RawSubscribedMvsBody | null,
  { limit, offset }: NormalizeLibraryMvPageOptions = { limit: 25, offset: 0 }
): LibraryMvPage {
  const body = unwrapSubscribedMvsBody(response)
  const list = normalizeMvList(body.mvs)

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
