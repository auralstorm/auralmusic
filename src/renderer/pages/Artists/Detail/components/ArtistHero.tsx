import { useState, type KeyboardEventHandler } from 'react'
import { MoreHorizontal, Play, UserCheck, UserPlus } from 'lucide-react'
import OverflowContentDialog from '@/components/OverflowContentDialog'
import { Button } from '@/components/ui/button'
import AvatarCover from '@/components/AvatarCover'
import { useTextOverflow } from '@/hooks/useTextOverflow'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { ARTIST_DETAIL_HERO_LAYOUT } from '../artist-detail-layout.model'
import type { ArtistHeroProps } from '../types'

const ArtistHero = ({
  profile,
  summary,
  isFollowed,
  followLoading,
  onPlay,
  onToggleFollowedArtist,
}: ArtistHeroProps) => {
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const { targetRef, isOverflowing } = useTextOverflow(summary)
  const canExpandSummary = Boolean(summary.trim()) && isOverflowing

  const handleSummaryClick = () => {
    if (!canExpandSummary) {
      return
    }

    setSummaryDialogOpen(true)
  }

  const handleSummaryKeyDown: KeyboardEventHandler<
    HTMLParagraphElement
  > = event => {
    if (!canExpandSummary) {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    setSummaryDialogOpen(true)
  }

  return (
    <>
      <section className={ARTIST_DETAIL_HERO_LAYOUT.grid}>
        <AvatarCover
          className={ARTIST_DETAIL_HERO_LAYOUT.avatar}
          shadowClassName={ARTIST_DETAIL_HERO_LAYOUT.avatar}
          rounded='full'
          isAutoHovered
          url={resizeImageUrl(
            profile.coverUrl,
            imageSizes.detailCover.width,
            imageSizes.detailCover.height
          )}
        />

        <div className={ARTIST_DETAIL_HERO_LAYOUT.content}>
          <div className='space-y-2'>
            <h1 className='text-foreground text-5xl font-black tracking-tight'>
              {profile.name}
            </h1>
            <h2 className='text-muted-foreground mt-5 text-lg'>
              {profile.identity}
            </h2>
            <p className='text-muted-foreground mt-5 text-lg'>
              {profile.musicSize}首歌 · {profile.albumSize}
              张专辑 · {profile.mvSize}个MV
            </p>
          </div>

          <p
            ref={targetRef}
            className={cn(
              'text-muted-foreground line-clamp-3 text-lg leading-9',
              canExpandSummary &&
                'hover:text-foreground focus-visible:text-foreground cursor-pointer transition-colors'
            )}
            onClick={handleSummaryClick}
            onKeyDown={handleSummaryKeyDown}
            role={canExpandSummary ? 'button' : undefined}
            tabIndex={canExpandSummary ? 0 : undefined}
            aria-label={canExpandSummary ? '查看完整歌手简介' : undefined}
          >
            {summary}
          </p>

          <div className='flex flex-wrap gap-4 pt-2'>
            <Button
              type='button'
              size='lg'
              onClick={onPlay}
              className='h-14 cursor-pointer rounded-full px-8 text-base font-semibold'
            >
              <Play className='size-4 fill-current' />
              播放
            </Button>
            <Button
              type='button'
              size='lg'
              disabled={followLoading}
              onClick={onToggleFollowedArtist}
              variant='secondary'
              className='h-14 cursor-pointer rounded-full px-8 text-base font-semibold'
            >
              {isFollowed ? (
                <UserCheck className='size-4' />
              ) : (
                <UserPlus className='size-4' />
              )}
              {isFollowed ? '已关注' : '关注'}
            </Button>
            <Button
              type='button'
              size='icon-lg'
              variant='secondary'
              className={ARTIST_DETAIL_HERO_LAYOUT.moreButton}
            >
              <MoreHorizontal className='size-5' />
            </Button>
          </div>
        </div>
      </section>

      <OverflowContentDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        title='歌手简介'
        content={summary}
      />
    </>
  )
}

export default ArtistHero
