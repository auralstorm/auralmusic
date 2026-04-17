import { MoreHorizontal, Play, UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ArtistDetailProfile } from '@/pages/Artists/artist-detail.model'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import AvatarCover from '@/components/AvatarCover'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'

interface ArtistHeroProps {
  profile: ArtistDetailProfile
  summary: string
  isFollowed: boolean
  followLoading: boolean
  onToggleFollowedArtist: () => void
}

const ArtistHero = ({
  profile,
  summary,
  isFollowed,
  followLoading,
  onToggleFollowedArtist,
}: ArtistHeroProps) => {
  console.log(profile)

  return (
    <section className='grid items-center gap-8 lg:grid-cols-[320px_minmax(0,1fr)]'>
      <AvatarCover
        className='w-62.5'
        shadowClassName='w-62.5'
        rounded='full'
        isAutoHovered
        url={resizeImageUrl(
          profile.coverUrl,
          imageSizes.detailCover.width,
          imageSizes.detailCover.height
        )}
      />

      <div className='mt-2 flex min-w-0 flex-col justify-center gap-5 py-4'>
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
            className='w-[100px] rounded-full py-7'
          >
            <MoreHorizontal className='size-5' />
          </Button>
        </div>
      </div>
    </section>
  )
}

export default ArtistHero
