import { useMemo } from 'react'
import TrackListPlaybackItem from '@/components/TrackList/TrackListPlaybackItem'
import { createArtistTopSongPlaybackQueue } from '../model'
import type { ArtistTopSongsProps } from '../types'

const ArtistTopSongs = ({
  artistId,
  songs,
  onViewAll,
}: ArtistTopSongsProps) => {
  const playbackQueue = useMemo(
    () => createArtistTopSongPlaybackQueue(songs),
    [songs]
  )

  return (
    <section className='space-y-5'>
      <h2 className='text-foreground text-3xl font-bold tracking-tight'>
        热门歌曲
      </h2>
      <div className=''>
        {songs.length === 0 ? (
          <div className='text-muted-foreground px-6 py-10 text-sm'>
            暂无歌曲
          </div>
        ) : (
          <div>
            <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4'>
              {songs.map((song, index) => (
                <TrackListPlaybackItem
                  key={song.id}
                  item={song}
                  index={index}
                  type='hot'
                  playbackQueue={playbackQueue}
                />
              ))}
            </div>
            {artistId > 0 ? (
              <button
                type='button'
                className='text-foreground/88 mt-5 text-sm transition-opacity hover:opacity-80'
                onClick={onViewAll}
              >
                查看全部
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

export default ArtistTopSongs
