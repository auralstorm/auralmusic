import { Heart, MoreHorizontal, Play } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'

import {
  formatAlbumPublishDate,
  type AlbumDetailHeroData,
} from '../album-detail.model'

interface AlbumDetailHeroProps {
  hero: AlbumDetailHeroData
  isLiked: boolean
  likeLoading: boolean
  onToggleLiked: () => void
}

const AlbumDetailHero = ({
  hero,
  isLiked,
  likeLoading,
  onToggleLiked,
}: AlbumDetailHeroProps) => {
  return (
    <section className='grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start'>
      <div className='relative'>
        {hero.coverUrl ? (
          <AvatarCover
            url={hero.coverUrl}
            isAutoHovered
            shadowClassName='top-5 left-5 scale[1]'
          />
        ) : (
          <div className='from-muted to-muted/70 text-muted-foreground flex size-full items-center justify-center bg-gradient-to-br text-5xl font-black tracking-[-0.08em]'>
            AL
          </div>
        )}
      </div>

      <div className='flex h-full flex-col justify-between gap-6'>
        <div className='space-y-4'>
          <h1 className='text-foreground text text-4xl leading-[1] font-black'>
            {hero.name}
          </h1>
          <div className='text-muted-foreground space-y-1 text-lg'>
            <p>{hero.artistNames}</p>
            <p>
              发行于 {formatAlbumPublishDate(hero.publishTime)} 路{' '}
              {hero.trackCount}
              首歌
            </p>
          </div>

          <p className='text-muted-foreground line-clamp-3 max-w-[70ch] text-[15px] leading-8'>
            {hero.description || '暂无专辑简介'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-4'>
          <Button
            type='button'
            size='lg'
            className='h-14 cursor-pointer rounded-full px-8 text-base font-semibold'
          >
            <Play className='size-4 fill-current' />
            播放
          </Button>

          <Button
            type='button'
            size='lg'
            disabled={likeLoading}
            onClick={onToggleLiked}
            variant={isLiked ? 'outline' : 'secondary'}
            className='h-14 cursor-pointer rounded-full px-8 text-base font-semibold'
          >
            <Heart className={`size-4 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked ? '已收藏' : '收藏'}
          </Button>

          <Button
            type='button'
            size='icon-lg'
            variant='secondary'
            className='w-[100px] rounded-full py-7'
          >
            <MoreHorizontal className='size-5' />
          </Button>
        </div>
      </div>
    </section>
  )
}

export default AlbumDetailHero
