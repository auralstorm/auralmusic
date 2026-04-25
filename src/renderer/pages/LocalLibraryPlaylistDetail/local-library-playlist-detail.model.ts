import type {
  LocalLibraryPlaylistRecord,
  LocalLibraryTrackRecord,
} from '../../../shared/local-library.ts'
import type { LocalLibraryPagedState } from '../LocalLibrary/local-library.model'

export interface LocalLibraryPlaylistDetailState {
  playlist: LocalLibraryPlaylistRecord | null
  tracksState: LocalLibraryPagedState<LocalLibraryTrackRecord>
}

export function formatLocalLibraryPlaylistUpdatedAt(timestamp: number) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return '更新时间未知'
  }

  return `更新于 ${date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function buildLocalLibraryPlaylistMetaItems(
  playlist: Pick<LocalLibraryPlaylistRecord, 'trackCount' | 'updatedAt'>
) {
  return [
    `${playlist.trackCount} 首歌曲`,
    formatLocalLibraryPlaylistUpdatedAt(playlist.updatedAt),
  ]
}
