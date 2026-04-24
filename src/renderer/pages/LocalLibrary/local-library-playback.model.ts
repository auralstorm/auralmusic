import { createLocalMediaUrl } from '../../../shared/local-media.ts'
import type { PlaybackTrack } from '../../../shared/playback.ts'
import type { LocalLibraryTrackRecord } from '../../../shared/local-library.ts'

function hashLocalFilePath(filePath: string) {
  let hash = 0

  for (const character of filePath) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }

  return -Math.abs(hash || 1)
}

type LocalLibraryQueueSourceDescriptor =
  | { type: 'all' }
  | { type: 'album'; albumName: string; artistName: string }
  | { type: 'artist'; artistName: string }

function encodeLocalLibraryQueueSegment(value: string) {
  return encodeURIComponent(value)
}

function decodeLocalLibraryQueueSegment(value: string) {
  return decodeURIComponent(value)
}

/** 复用现有播放 store 的 number id 约束，避免为本地歌曲单独分叉播放链路 */
export function buildLocalLibraryPlaybackTrack(
  track: Pick<
    LocalLibraryTrackRecord,
    | 'title'
    | 'artistName'
    | 'albumName'
    | 'durationMs'
    | 'lyricText'
    | 'translatedLyricText'
    | 'coverUrl'
    | 'filePath'
  > & {
    id?: number
  }
): PlaybackTrack {
  return {
    id: hashLocalFilePath(track.filePath),
    name: track.title,
    artistNames: track.artistName,
    albumName: track.albumName,
    coverUrl: track.coverUrl,
    duration: track.durationMs,
    sourceUrl: createLocalMediaUrl(track.filePath),
    lyricText: track.lyricText,
    translatedLyricText: track.translatedLyricText,
  }
}

export function createLocalLibraryQueueSourceKey() {
  return 'local-library:all'
}

export function createLocalLibraryAlbumQueueSourceKey(
  albumName: string,
  artistName: string
) {
  return `local-library:album:${encodeLocalLibraryQueueSegment(albumName)}:${encodeLocalLibraryQueueSegment(artistName)}`
}

export function createLocalLibraryArtistQueueSourceKey(artistName: string) {
  return `local-library:artist:${encodeLocalLibraryQueueSegment(artistName)}`
}

export function resolveLocalLibraryQueueSourceDescriptor(
  sourceKey: string | null | undefined
): LocalLibraryQueueSourceDescriptor | null {
  if (!sourceKey?.startsWith('local-library:')) {
    return null
  }

  if (sourceKey === 'local-library:all') {
    return { type: 'all' }
  }

  const albumMatch = sourceKey.match(/^local-library:album:([^:]+):(.+)$/)
  if (albumMatch) {
    return {
      type: 'album',
      albumName: decodeLocalLibraryQueueSegment(albumMatch[1]),
      artistName: decodeLocalLibraryQueueSegment(albumMatch[2]),
    }
  }

  const artistMatch = sourceKey.match(/^local-library:artist:(.+)$/)
  if (artistMatch) {
    return {
      type: 'artist',
      artistName: decodeLocalLibraryQueueSegment(artistMatch[1]),
    }
  }

  return null
}

export function buildLocalLibraryPlaybackQueue(
  tracks: LocalLibraryTrackRecord[],
  sourceKey: string | null | undefined
) {
  const descriptor = resolveLocalLibraryQueueSourceDescriptor(sourceKey)
  if (!descriptor) {
    return []
  }

  const scopedTracks = tracks.filter(track => {
    if (descriptor.type === 'all') {
      return true
    }

    if (descriptor.type === 'artist') {
      return track.artistName === descriptor.artistName
    }

    return (
      track.albumName === descriptor.albumName &&
      track.artistName === descriptor.artistName
    )
  })

  return scopedTracks.map(track => buildLocalLibraryPlaybackTrack(track))
}
