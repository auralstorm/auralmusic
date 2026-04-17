import { Play } from 'lucide-react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { GenreChartsCardProps } from './GenreChartsCard.type'

const GenreChartsCardItem = ({ chart, onOpen }: GenreChartsCardProps) => {
  const statLabel =
    chart.trackCount > 0
      ? `${chart.trackCount}首`
      : (chart.updateFrequency ?? '榜单')

  return (
    <div
      className='group flex flex-col gap-3 text-left'
      onClick={() => onOpen(chart.id)}
    >
      <div className='border-border/60 bg-muted relative aspect-square overflow-hidden rounded-[14px] border shadow-[0_18px_44px_rgba(15,23,42,0.14)] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.2)]'>
        {chart.coverImgUrl ? (
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={{
              backgroundImage: `url("${resizeImageUrl(
                chart.coverImgUrl,
                imageSizes.cardCover.width,
                imageSizes.cardCover.height
              )}")`,
            }}
          />
        ) : null}
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02)_48%,rgba(0,0,0,0.12))]' />

        <div className='relative z-10 flex h-full flex-col justify-between p-4'>
          <div className='flex items-start justify-between gap-3'>
            <span className='inline-flex size-9 items-center justify-center rounded-full bg-white/22 text-white shadow-[0_8px_20px_rgba(255,255,255,0.16)] backdrop-blur-sm'>
              <Play className='ml-0.5 size-4 fill-current' />
            </span>
            <span className='text-xs font-semibold text-white/88'>
              {statLabel}
            </span>
          </div>

          <div className='text-xs text-white/60 transition-colors duration-300 group-hover:text-white/100'>
            {chart.updateFrequency}
          </div>
        </div>
      </div>

      <div className='space-y-1 px-0.5'>
        <p className='text-foreground line-clamp-1 text-[1.02rem] leading-tight font-semibold tracking-[-0.03em]'>
          {chart.name}
        </p>
        <p className='text-muted-foreground line-clamp-1 text-sm'>
          {chart.description}
        </p>
      </div>
    </div>
  )
}

export default GenreChartsCardItem
