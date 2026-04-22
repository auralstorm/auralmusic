import { memo } from 'react'

import DeferredCachedImage from '@/components/DeferredCachedImage'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { formatArtistPublishDate } from '@/pages/Artists/artist-detail.model'
import { buildArtistAlbumImageCacheKey } from '../artist-image-cache'
import type { ArtistAlbumCardProps } from '../types'

const ArtistAlbumCard = ({ album, onClick }: ArtistAlbumCardProps) => {
  return (
    <article
      className='border-border/50 bg-card/72 overflow-hidden rounded-[24px] border p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1'
      onClick={() => onClick(album.id)}
    >
      <div className='relative overflow-hidden rounded-[20px]'>
        <DeferredCachedImage
          cacheKey={buildArtistAlbumImageCacheKey(album.id)}
          src={resizeImageUrl(
            album.picUrl,
            imageSizes.cardCover.width,
            imageSizes.cardCover.height
          )}
          alt={album.name}
          className='aspect-square size-full object-cover'
          draggable={false}
        />
      </div>
      <div className='mt-4 space-y-1.5'>
        <h3 className='truncate text-lg font-bold'>{album.name}</h3>
        <p className='text-muted-foreground text-sm'>
          {formatArtistPublishDate(album.publishTime)}
        </p>
      </div>
    </article>
  )
}

export default memo(ArtistAlbumCard)
