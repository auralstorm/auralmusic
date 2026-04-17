import { Play } from 'lucide-react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { formatMvDuration, type SimilarMvItem } from '../../mv-detail.model'

interface SimilarMvCardProps {
  item: SimilarMvItem
  onOpen: (id: number) => void
}

function formatPlayCount(playCount: number) {
  if (!playCount) return '暂无播放'
  return new Intl.NumberFormat('zh-CN').format(playCount)
}

const SimilarMvCard = ({ item, onOpen }: SimilarMvCardProps) => {
  return (
    <button
      type='button'
      onClick={() => onOpen(item.id)}
      className='group border-border/50 bg-card/80 block w-full overflow-hidden rounded-[24px] border p-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_42px_rgba(15,23,42,0.12)] focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:outline-none'
    >
      <div className='relative overflow-hidden rounded-[22px]'>
        <img
          src={resizeImageUrl(
            item.coverUrl,
            imageSizes.mvCard.width,
            imageSizes.mvCard.height
          )}
          alt={item.name}
          className='aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]'
          loading='lazy'
          decoding='async'
          draggable={false}
        />
        <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.34))]' />
        <div className='absolute top-3 left-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur'>
          {formatMvDuration(item.duration)}
        </div>
        <div className='absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur'>
          <Play className='size-3.5 fill-current' />
          {formatPlayCount(item.playCount)}
        </div>
      </div>

      <div className='space-y-2 px-1 pt-3'>
        <h3
          className='text-foreground text-[15px] leading-6 font-semibold'
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {item.name}
        </h3>
        <p className='text-muted-foreground text-sm'>{item.artistName}</p>
        {/* <p className='text-muted-foreground text-xs'>{formatMvPublishDate(item.publishTime)}</p> */}
      </div>
    </button>
  )
}

export default SimilarMvCard
