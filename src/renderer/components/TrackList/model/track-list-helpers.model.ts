import type { PlaybackTrack } from '../../../../shared/playback.ts'

import type { TrackListArtist, TrackListItemData } from '../types'

export function formatTrackListArtistNames(artists?: TrackListArtist[] | null) {
  if (!artists?.length) {
    return ''
  }

  return artists.map(artist => artist.name).join(' / ')
}

function resolveArtistDetailRouteArtistId(pathname: string): number | null {
  const match = pathname.match(/^\/artists\/(\d+)(?:\/songs)?\/?$/)
  if (!match) {
    return null
  }

  const artistId = Number(match[1])
  return Number.isFinite(artistId) ? artistId : null
}

export function shouldNavigateToArtistDetail(
  pathname: string,
  artistId?: number
) {
  if (!artistId) {
    return false
  }

  const currentArtistId = resolveArtistDetailRouteArtistId(pathname.trim())
  if (currentArtistId === null) {
    return true
  }

  return currentArtistId !== artistId
}

export function toPlaybackTrack(
  item: TrackListItemData,
  fallbackCoverUrl = ''
): PlaybackTrack {
  return {
    id: item.id,
    name: item.name,
    artistNames: item.artistNames || formatTrackListArtistNames(item.artists),
    albumName: item.albumName || '',
    coverUrl: item.coverUrl || fallbackCoverUrl,
    duration: item.duration,
    fee: typeof item.fee === 'number' ? item.fee : 0,
  }
}
