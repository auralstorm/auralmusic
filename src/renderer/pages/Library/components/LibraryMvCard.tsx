import { Play } from 'lucide-react'

import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import type { LibraryMvCardProps } from '../types'

const LibraryMvCard = ({ mv, onOpen }: LibraryMvCardProps) => {
  return (
    <article className='group cursor-pointer' onClick={() => onOpen(mv.id)}>
      <div className='relative overflow-hidden rounded-[22px] bg-neutral-100 shadow-[0_18px_44px_rgba(15,23,42,0.08)]'>
        {mv.coverUrl ? (
          <img
            src={resizeImageUrl(
              mv.coverUrl,
              imageSizes.mvCard.width,
              imageSizes.mvCard.height
            )}
            alt={mv.name}
            className='aspect-[16/9] size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]'
            loading='lazy'
            decoding='async'
            draggable={false}
          />
        ) : (
          <div className='aspect-[16/9] size-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-200' />
        )}

        <div className='absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/16' />
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='inline-flex size-12 items-center justify-center rounded-full border border-white/70 bg-white/18 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.04]'>
            <Play className='ml-0.5 size-4 fill-current' />
          </span>
        </div>
      </div>

      <div className='mt-3 space-y-1'>
        <h3 className='text-foreground-950 truncate text-[1.05rem] font-bold'>
          {mv.name}
        </h3>
        <p className='text-foreground/50 truncate text-sm'>{mv.artistName}</p>
      </div>
    </article>
  )
}

export default LibraryMvCard
