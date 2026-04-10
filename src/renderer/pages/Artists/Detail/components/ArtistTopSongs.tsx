import { Heart } from 'lucide-react'
import { type ArtistTopSongItem } from '@/pages/Artists/artist-detail.model'
import { useMemo, useState } from 'react'
import TrackListItem from '@/components/TrackList/TrackListItem'

interface ArtistTopSongsProps {
  songs: ArtistTopSongItem[]
}

const ArtistTopSongs = ({ songs }: ArtistTopSongsProps) => {
  const [isMore, setIsMore] = useState(false)
  const onToggleMore = () => {
    setIsMore(!isMore)
  }
  const list = useMemo(() => {
    if (isMore) {
      return songs
    }
    return songs.slice(0, 12)
  }, [songs, isMore])
  return (
    <section className='space-y-5'>
      <h2 className='text-foreground text-3xl font-bold tracking-tight'>
        热门歌曲
      </h2>
      <div className=''>
        {list.length === 0 ? (
          <div className='text-muted-foreground px-6 py-10 text-sm'>
            暂无歌曲
          </div>
        ) : (
          <div>
            <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4'>
              {list.map(song => (
                // <div
                //   key={song.id}
                //   className='hover:bg-primary/5 flex items-center justify-between gap-4 rounded-[15px] px-5 py-4 transition-colors odd:bg-white/[0.02]'
                // >
                //   <div className='flex min-w-0 flex-1 items-center'>
                //     <img
                //       src={song.coverUrl}
                //       alt={song.name}
                //       className='size-14 shrink-0 rounded-2xl object-cover'
                //       loading='lazy'
                //       decoding='async'
                //       draggable={false}
                //     />
                //     <div className='ml-4 flex min-w-0 flex-col justify-center'>
                //       <div className='truncate text-lg font-semibold'>
                //         {song.name}
                //       </div>
                //       <div className='text-muted-foreground truncate text-sm'>
                //         {(song.artists || [])
                //           .map(artist => artist.name)
                //           .join(' / ') || ''}
                //       </div>
                //     </div>
                //   </div>
                //   <div className='flex shrink-0 items-center justify-end gap-3 text-sm'>
                //     <Heart className='text-foreground/70 size-5' />
                //   </div>
                // </div>
                <TrackListItem item={song} type='hot' />
              ))}
            </div>
            {songs.length > 12 && (
              <div
                className='mt-5 cursor-pointer text-sm'
                onClick={onToggleMore}
              >
                {isMore ? '收起' : '显示更多'}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default ArtistTopSongs
