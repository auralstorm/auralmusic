import {
  formatTrackDuration,
  type PlaylistTrackItem,
} from '../playlist-detail.model'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'

interface PlaylistTrackTableProps {
  tracks: PlaylistTrackItem[]
}

const PlaylistTrackTable = ({ tracks }: PlaylistTrackTableProps) => {
  if (tracks.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        暂无歌曲数据
      </div>
    )
  }

  return (
    <section className='space-y-5'>
      {/* <div className='grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_88px] gap-4 px-4 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase'>
        <span>Track</span>
        <span>Album</span>
        <span className='text-right'>Time</span>
      </div> */}

      <div className='border-border/60 bg-card/62 overflow-hidden'>
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className='hover:bg-primary/4 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_88px] items-center gap-4 rounded-[15px] px-4 py-4 transition-colors odd:bg-white/[0.02]'
          >
            <div className='flex min-w-0 items-center gap-4'>
              <span className='text-muted-foreground w-6 flex-none text-sm font-semibold'>
                {index + 1}
              </span>
              <div className='border-border/50 bg-card relative size-12 overflow-hidden rounded-[14px] border'>
                {track.coverUrl ? (
                  <img
                    src={resizeImageUrl(
                      track.coverUrl,
                      imageSizes.listCover.width,
                      imageSizes.listCover.height
                    )}
                    alt={track.name}
                    className='size-full object-cover'
                    loading='lazy'
                    decoding='async'
                    draggable={false}
                  />
                ) : (
                  <div className='from-muted to-muted/80 text-muted-foreground flex size-full items-center justify-center bg-gradient-to-br text-[10px] font-bold'>
                    NO
                  </div>
                )}
              </div>
              <div className='min-w-0'>
                <p className='text-foreground truncate text-base font-semibold'>
                  {track.name}
                </p>
                <p className='text-muted-foreground truncate text-sm'>
                  {track.artistNames}
                </p>
              </div>
            </div>

            <p className='text-foreground/82 truncate text-sm'>
              {track.albumName}
            </p>
            <p className='text-muted-foreground text-right text-sm'>
              {formatTrackDuration(track.duration)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PlaylistTrackTable
