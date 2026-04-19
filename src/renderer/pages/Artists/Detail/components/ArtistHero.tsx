import { MoreHorizontal, Play, UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import AvatarCover from '@/components/AvatarCover'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
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
  return (
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
          <p className='text-muted-foreground mt-5 text-lg'>
            {profile.identity}
            {profile.musicSize}首歌 · {profile.albumSize}
            张专辑 · {profile.mvSize}个MV
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <p className='text-muted-foreground line-clamp-3 text-lg leading-9'>
                {summary}
              </p>
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              <p className='overflow-y-auto text-[16px]'>{summary}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
  )
}

export default ArtistHero
