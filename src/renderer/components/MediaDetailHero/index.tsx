import { Heart, MoreHorizontal, Play } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type MediaDetailHeroType = 'playlist' | 'album'

interface MediaDetailHeroProps {
  type: MediaDetailHeroType
  title: string
  coverUrl: string
  subtitle: string
  metaItems: string[]
  description?: string
  playDisabled?: boolean
  favoriteVisible?: boolean
  favorited?: boolean
  favoriteLoading?: boolean
  onPlay?: () => void
  onToggleFavorite?: () => void
}

const FALLBACK_TEXT: Record<MediaDetailHeroType, string> = {
  playlist: 'PL',
  album: 'AL',
}

const EMPTY_DESCRIPTION: Record<MediaDetailHeroType, string> = {
  playlist: '暂无歌单简介',
  album: '暂无专辑简介',
}

const FAVORITE_TEXT: Record<MediaDetailHeroType, [string, string]> = {
  playlist: ['收藏', '已收藏'],
  album: ['收藏', '已收藏'],
}

const MediaDetailHero = ({
  type,
  title,
  coverUrl,
  subtitle,
  metaItems,
  description,
  playDisabled,
  favoriteVisible = true,
  favorited = false,
  favoriteLoading = false,
  onPlay,
  onToggleFavorite,
}: MediaDetailHeroProps) => {
  const [idleFavoriteText, activeFavoriteText] = FAVORITE_TEXT[type]

  return (
    <section className='grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start'>
      <div className='relative'>
        {coverUrl ? (
          <AvatarCover
            url={coverUrl}
            isAutoHovered
            wrapperClass='aspect-square w-full max-w-[320px]'
            shadowClassName='top-3 left-3 scale-95'
          />
        ) : (
          <div className='from-muted to-muted/70 text-muted-foreground flex aspect-square w-full max-w-[320px] items-center justify-center rounded-[15px] bg-gradient-to-br text-5xl font-black tracking-[-0.08em]'>
            {FALLBACK_TEXT[type]}
          </div>
        )}
      </div>

      <div className='flex h-full flex-col justify-between gap-6'>
        <div className='space-y-4'>
          <h1 className='text-foreground text-4xl leading-[1] font-black'>
            {title}
          </h1>
          <div className='text-muted-foreground space-y-1 text-lg'>
            <p>{subtitle}</p>
            {metaItems.length ? <p>{metaItems.join(' · ')}</p> : null}
          </div>
          <p className='text-muted-foreground line-clamp-3 text-[15px] leading-8'>
            {description || EMPTY_DESCRIPTION[type]}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-4'>
          <Button
            type='button'
            size='lg'
            disabled={playDisabled}
            onClick={onPlay}
            className='h-14 cursor-pointer rounded-full px-8 text-base font-semibold'
          >
            <Play className='size-4 fill-current' />
            播放
          </Button>

          {favoriteVisible ? (
            <Button
              type='button'
              size='lg'
              disabled={favoriteLoading}
              onClick={onToggleFavorite}
              variant='secondary'
              // variant={favorited ? 'outline' : 'secondary'}
              className={cn(
                'h-14 cursor-pointer rounded-full px-8 text-base font-semibold',
                favorited && 'text-red-500'
              )}
            >
              <Heart className={cn('size-4', favorited && 'fill-current')} />
              {favorited ? activeFavoriteText : idleFavoriteText}
            </Button>
          ) : null}

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

export default MediaDetailHero
