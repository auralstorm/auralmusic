import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import type { AlbumListItem } from '@/pages/Albums/albums.model'

interface AlbumCardProps {
  album: AlbumListItem
  onToAlbumDetail: (id: number) => void
}

const AlbumCard = ({ album, onToAlbumDetail }: AlbumCardProps) => {
  const coverUrl = album.picUrl || album.blurPicUrl
  const artistName =
    album.artists
      ?.map(artist => artist.name)
      .filter(Boolean)
      .join(' / ') ||
    album.artist?.name ||
    '未知歌手'

  return (
    <article className='group'>
      <button
        type='button'
        className='block w-full cursor-default text-left'
        aria-label={album.name}
      >
        <div className='border-border/40 bg-card/78 relative aspect-square overflow-hidden rounded-[22px] border shadow-[0_22px_60px_rgba(15,23,42,0.08)] transition-transform duration-500 group-hover:-translate-y-1.5'>
          {coverUrl ? (
            <img
              src={resizeImageUrl(
                coverUrl,
                imageSizes.cardCover.width,
                imageSizes.cardCover.height
              )}
              alt={album.name}
              loading='lazy'
              decoding='async'
              draggable={false}
              className='size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]'
            />
          ) : (
            <div className='from-muted via-muted/80 to-muted/60 size-full bg-gradient-to-br' />
          )}
          <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(15,23,42,0.08))]' />
          <div
            className='absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100'
            onClick={() => onToAlbumDetail(album.id)}
          >
            <Button
              type='button'
              size='icon'
              className='size-14 rounded-full border border-white/16 bg-white/14 text-white backdrop-blur-md hover:bg-white/20'
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <Play className='ml-0.5 size-5 fill-current' />
            </Button>
          </div>
        </div>
        <div className='mt-4 space-y-1.5'>
          <h3 className='text-foreground truncate text-[1.05rem] font-bold tracking-tight'>
            {album.name}
          </h3>
          <p className='text-muted-foreground truncate text-sm'>{artistName}</p>
        </div>
      </button>
    </article>
  )
}

export default AlbumCard
