import { memo, useMemo } from 'react'

import TrackListPlaybackItem from '@/components/TrackList/TrackListPlaybackItem'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { buildLibraryQuickSongPlaybackQueue } from './library-quick-song-list.model'
import type { LibraryQuickSongListProps } from '../types'

const LibraryQuickSongList = ({
  songs,
  refreshing = false,
  onSongLikeChangeSuccess,
}: LibraryQuickSongListProps) => {
  const visibleSongs = useMemo(() => songs.slice(0, 9), [songs])
  const playbackQueue = useMemo(
    () => buildLibraryQuickSongPlaybackQueue(visibleSongs),
    [visibleSongs]
  )

  return (
    <div className='relative'>
      <div
        className={cn(
          'grid grid-cols-1 gap-3 transition-opacity md:grid-cols-3',
          refreshing ? 'pointer-events-none opacity-50' : ''
        )}
      >
        {visibleSongs.map((song, index) => (
          <TrackListPlaybackItem
            key={song.id}
            item={song}
            index={index}
            type='quick'
            coverUrl={song.coverUrl}
            playbackQueue={playbackQueue}
            onLikeChangeSuccess={onSongLikeChangeSuccess}
          />
        ))}
      </div>

      {refreshing ? (
        <div className='bg-background/72 absolute inset-0 z-10 flex items-center justify-center rounded-[24px] backdrop-blur-[2px]'>
          <Spinner className='text-primary size-7' />
        </div>
      ) : null}
    </div>
  )
}

export default memo(LibraryQuickSongList)
