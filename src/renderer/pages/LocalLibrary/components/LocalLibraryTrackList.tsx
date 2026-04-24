import { Virtuoso } from 'react-virtuoso'
import { Spinner } from '@/components/ui/spinner'

import AvatarCover from '@/components/AvatarCover'
import type {
  LocalLibraryTrackDeleteMode,
  LocalLibraryTrackRecord,
} from '../../../../shared/local-library.ts'
import {
  createLocalLibraryAlbumQueueSourceKey,
  createLocalLibraryArtistQueueSourceKey,
  createLocalLibraryQueueSourceKey,
} from '../local-library-playback.model'
import type { LocalLibrarySongScope } from '../local-library.model'
import LocalLibraryTrackRowActions from './LocalLibraryTrackRowActions'

interface LocalLibraryTrackListProps {
  tracks: LocalLibraryTrackRecord[]
  totalCount: number
  isLoadingMore?: boolean
  queueSourceScope: LocalLibrarySongScope
  deletingTrackPath?: string | null
  onPlayIndex: (
    tracks: LocalLibraryTrackRecord[],
    startIndex: number,
    sourceKey: string
  ) => void
  onRevealTrack: (track: LocalLibraryTrackRecord) => void
  onDeleteTrack: (
    track: LocalLibraryTrackRecord,
    mode: LocalLibraryTrackDeleteMode
  ) => void
  onEndReached: () => void
}

function resolveQueueSourceKey(
  scope: LocalLibraryTrackListProps['queueSourceScope']
) {
  if (scope.type === 'album' && scope.value && scope.artistName) {
    return createLocalLibraryAlbumQueueSourceKey(scope.value, scope.artistName)
  }

  if (scope.type === 'artist' && scope.value) {
    return createLocalLibraryArtistQueueSourceKey(scope.value)
  }

  return createLocalLibraryQueueSourceKey()
}

const LocalLibraryTrackList = ({
  tracks,
  totalCount,
  isLoadingMore = false,
  queueSourceScope,
  deletingTrackPath = null,
  onPlayIndex,
  onRevealTrack,
  onDeleteTrack,
  onEndReached,
}: LocalLibraryTrackListProps) => {
  const queueSourceKey = resolveQueueSourceKey(queueSourceScope)

  if (tracks.length === 0) {
    return (
      <div className='text-muted-foreground py-10 text-center text-sm'>
        当前条件下没有匹配的本地歌曲。
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-[28px] border border-[#f1effd] bg-white/82 shadow-[0_24px_60px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-white/8 dark:bg-white/4 dark:shadow-[0_24px_60px_rgba(0,0,0,0.24)]'>
      <div className='grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_88px_88px] items-center gap-4 border-b border-[#f0eef8] px-6 py-4 text-[0.82rem] font-semibold tracking-[0.12em] text-[#8a8fa4] uppercase dark:border-white/8 dark:text-white/42'>
        <div>歌曲</div>
        <div>专辑</div>
        <div>格式</div>
        <div>操作</div>
      </div>

      <div className='divide-y divide-[#f3f1f8] dark:divide-white/6'>
        <Virtuoso
          useWindowScroll
          data={tracks}
          increaseViewportBy={480}
          endReached={() => {
            if (tracks.length < totalCount) {
              onEndReached()
            }
          }}
          components={{
            Footer: () =>
              isLoadingMore ? (
                <div className='flex justify-center py-5'>
                  <Spinner className='text-primary size-5' />
                </div>
              ) : null,
          }}
          // 列表跟随整页滚动，避免本地乐库再嵌一层滚动容器影响播放器页手感。
          itemContent={(index, track) => (
            <div
              key={track.filePath}
              className='grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_88px_88px] items-center gap-4 border-b border-[#f3f1f8] px-6 py-4 transition-colors duration-300 last:border-b-0 hover:bg-[#fbfaff] dark:border-white/6 dark:hover:bg-white/4'
              onDoubleClick={() => onPlayIndex(tracks, index, queueSourceKey)}
            >
              <div className='flex min-w-0 items-center gap-4'>
                {track.coverUrl ? (
                  <AvatarCover
                    className='w-12.5 shrink-0'
                    url={track.coverUrl}
                  />
                ) : (
                  <div className='bg-muted flex h-12.5 w-12.5 shrink-0 items-center justify-center rounded-[14px] text-xs'>
                    本地
                  </div>
                )}
                <div className='min-w-0'>
                  <div className='truncate text-[15px] font-semibold text-[#151823] dark:text-white/92'>
                    {track.title}
                  </div>
                  <div className='truncate text-sm text-[#8a8fa4] dark:text-white/44'>
                    {track.artistName}
                  </div>
                </div>
              </div>

              <div className='truncate text-sm text-[#7e8398] dark:text-white/48'>
                {track.albumName}
              </div>

              <div className='text-sm font-medium text-[#6d7489] uppercase dark:text-white/54'>
                {track.audioFormat}
              </div>

              <LocalLibraryTrackRowActions
                track={track}
                disabled={deletingTrackPath === track.filePath}
                onPlay={() => onPlayIndex(tracks, index, queueSourceKey)}
                onRevealTrack={onRevealTrack}
                onDelete={onDeleteTrack}
              />
            </div>
          )}
        />
      </div>
    </div>
  )
}

export default LocalLibraryTrackList
