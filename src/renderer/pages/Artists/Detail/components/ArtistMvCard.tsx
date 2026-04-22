import { memo } from 'react'

import { Play } from 'lucide-react'

import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { formatPlayCount } from '@/lib/utils'
import { formatArtistPublishDate } from '@/pages/Artists/artist-detail.model'
import type { ArtistMvCardProps } from '../types'

const ArtistMvCard = ({ mv, onClick }: ArtistMvCardProps) => {
  return (
    <article
      className='group border-border/50 bg-card/72 flex cursor-pointer gap-4 rounded-[24px] border p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1'
      onClick={() => onClick(mv.id)}
    >
      <div className='relative min-w-0 flex-1 overflow-hidden rounded-[20px]'>
        <img
          src={resizeImageUrl(
            mv.coverUrl,
            imageSizes.mvCard.width,
            imageSizes.mvCard.height
          )}
          alt={mv.name}
          className='aspect-[16/9] size-full object-cover'
          loading='lazy'
          decoding='async'
          draggable={false}
        />
        <div className='absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-300 group-hover:bg-black/16'>
          <span className='inline-flex size-12 items-center justify-center rounded-full border border-white/75 bg-white/18 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.04]'>
            <Play className='ml-0.5 size-4 fill-current' />
          </span>
        </div>
      </div>
      <div className='flex min-w-0 basis-[38%] flex-col justify-center gap-2'>
        <h3 className='truncate text-xl font-bold'>{mv.name}</h3>
        <p className='text-muted-foreground text-sm'>
          {formatArtistPublishDate(mv.publishTime)}
        </p>
        <p className='text-muted-foreground text-sm'>
          播放次数 {formatPlayCount(mv.playCount) || '暂无播放'}
        </p>
      </div>
    </article>
  )
}

export default memo(ArtistMvCard)
