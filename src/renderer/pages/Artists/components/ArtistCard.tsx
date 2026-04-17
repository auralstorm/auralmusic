import { Link } from 'react-router-dom'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import type { ArtistListItem } from '@/pages/Artists/artists.model'

interface ArtistCardProps {
  artist: ArtistListItem
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  return (
    <article className='group'>
      <Link
        to={`/artists/${artist.id}`}
        className='block w-full text-left'
        aria-label={artist.name}
      >
        <div className='border-border/50 bg-card/70 relative aspect-square overflow-hidden rounded-[15px] border shadow-[0_20px_48px_rgba(15,23,42,0.08)] transition-transform duration-500 group-hover:-translate-y-1'>
          <img
            src={resizeImageUrl(
              artist.picUrl,
              imageSizes.cardCover.width,
              imageSizes.cardCover.height
            )}
            alt={artist.name}
            loading='lazy'
            decoding='async'
            draggable={false}
            className='size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]'
          />
          <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(17,24,39,0.04))]' />
        </div>
        <div className='mt-4'>
          <h3 className='text-foreground truncate font-bold tracking-tight'>
            {artist.name}
          </h3>
        </div>
      </Link>
    </article>
  )
}

export default ArtistCard
