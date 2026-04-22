import { useState, type KeyboardEventHandler } from 'react'
import { Heart, Play } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import OverflowContentDialog from '@/components/OverflowContentDialog'
import { Button } from '@/components/ui/button'
import { useTextOverflow } from '@/hooks/useTextOverflow'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import type { MediaDetailHeroProps, MediaDetailHeroType } from './types'

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
  moreActions,
  isResize = true,
}: MediaDetailHeroProps) => {
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false)
  const [idleFavoriteText, activeFavoriteText] = FAVORITE_TEXT[type]
  const resolvedDescription = description || EMPTY_DESCRIPTION[type]
  const { targetRef, isOverflowing } = useTextOverflow(resolvedDescription)
  const canExpandDescription =
    Boolean(resolvedDescription.trim()) && isOverflowing

  const url = isResize
    ? resizeImageUrl(
        coverUrl,
        imageSizes.detailCover.width,
        imageSizes.detailCover.height
      )
    : coverUrl

  const handleDescriptionClick = () => {
    if (!canExpandDescription) {
      return
    }

    setDescriptionDialogOpen(true)
  }

  const handleDescriptionKeyDown: KeyboardEventHandler<
    HTMLParagraphElement
  > = event => {
    if (!canExpandDescription) {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    setDescriptionDialogOpen(true)
  }

  return (
    <>
      <section className='grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start'>
        <div className='relative'>
          {coverUrl ? (
            <AvatarCover
              url={url}
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
            <p
              ref={targetRef}
              className={cn(
                'text-muted-foreground line-clamp-3 text-[15px] leading-8',
                canExpandDescription &&
                  'hover:text-foreground focus-visible:text-foreground cursor-pointer transition-colors'
              )}
              onClick={handleDescriptionClick}
              onKeyDown={handleDescriptionKeyDown}
              role={canExpandDescription ? 'button' : undefined}
              tabIndex={canExpandDescription ? 0 : undefined}
              aria-label={canExpandDescription ? '查看完整简介' : undefined}
            >
              {resolvedDescription}
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
                className={cn(
                  'h-14 cursor-pointer rounded-full px-8 text-base font-semibold',
                  favorited && 'text-red-500'
                )}
              >
                <Heart className={cn('size-4', favorited && 'fill-current')} />
                {favorited ? activeFavoriteText : idleFavoriteText}
              </Button>
            ) : null}

            {moreActions}
          </div>
        </div>
      </section>

      <OverflowContentDialog
        open={descriptionDialogOpen}
        onOpenChange={setDescriptionDialogOpen}
        title='完整简介'
        content={resolvedDescription}
      />
    </>
  )
}

export default MediaDetailHero
