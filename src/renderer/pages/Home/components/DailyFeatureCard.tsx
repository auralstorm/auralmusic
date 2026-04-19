import { Button } from '@/components/ui/button'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { Play } from 'lucide-react'
import { HomeFeatureCardSkeleton } from './HomeSkeletons'
import type { DailyFeatureCardProps } from '../types'
import { memo } from 'react'

const DailyFeatureCard = ({
  id,
  isLoading,
  onPlay,
  coverUrl,
  onOpenDailySongs,
}: DailyFeatureCardProps) => {
  if (isLoading) {
    return <HomeFeatureCardSkeleton />
  }

  return (
    <section
      className='group border-border/70 bg-animate relative h-[200px] overflow-hidden rounded-[26px] border p-6 shadow-2xl'
      style={
        coverUrl
          ? {
              backgroundImage: `url("${resizeImageUrl(
                coverUrl,
                imageSizes.backgroundCover.width,
                imageSizes.backgroundCover.height
              )}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      onClick={() => onOpenDailySongs?.(id)}
    >
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(8,8,10,0.6)_0%,rgba(8,8,10,0.4)_38%,rgba(8,8,10,0.36)_72%,rgba(8,8,10,0.56)_100%)]' />
      <div className='pointer-events-none absolute' />

      <div className='relative z-10 flex h-full items-center justify-between'>
        <div className='max-w-full space-y-4'>
          <h2 className='flex flex-col gap-2 text-6xl font-black text-white'>
            <span>每日</span>
            <span>推荐</span>
          </h2>
        </div>
        <Button
          type='button'
          size='icon'
          className='size-12 cursor-pointer rounded-full border border-white/10 bg-white/12 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-[1.04] hover:bg-white/18 disabled:cursor-default disabled:opacity-45'
          onClick={event => {
            event.stopPropagation()
            onPlay?.()
          }}
        >
          <Play className='ml-0.5 size-4 fill-current' />
        </Button>
      </div>
    </section>
  )
}

export default memo(DailyFeatureCard)
