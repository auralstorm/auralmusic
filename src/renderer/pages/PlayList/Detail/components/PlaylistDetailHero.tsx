import { Heart, MoreHorizontal, Play } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'

import {
  formatPlaylistUpdateDate,
  type PlaylistDetailHeroData,
} from '../playlist-detail.model'

interface PlaylistDetailHeroProps {
  hero: PlaylistDetailHeroData
  showFavoriteButton: boolean
}

const PlaylistDetailHero = ({
  hero,
  showFavoriteButton,
}: PlaylistDetailHeroProps) => {
  return (
    <section className='grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start'>
      <div className='relative'>
        {hero.coverUrl ? (
          <AvatarCover
            shadowClassName='top-4 left-3'
            isAutoHovered
            url={hero.coverUrl}
          />
        ) : (
          <div className='from-muted to-muted/70 text-muted-foreground flex size-full items-center justify-center bg-gradient-to-br text-5xl font-black tracking-[-0.08em]'>
            PL
          </div>
        )}
      </div>

      <div className='flex h-full flex-col justify-between gap-6'>
        <div className='space-y-4'>
          <h1 className='text-foreground text text-4xl leading-[1] font-black'>
            {hero.name}
          </h1>
          <div className='text-muted-foreground space-y-1 text-lg'>
            <p>Playlist by {hero.creatorName}</p>
            <p>
              最近更新于 {formatPlaylistUpdateDate(hero.updateTime)} ·{' '}
              {hero.trackCount} 首歌
            </p>
          </div>
          <p className='text-muted-foreground line-clamp-3 max-w-[70ch] text-[15px] leading-8'>
            {hero.description || '暂无歌单简介'}
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

          {showFavoriteButton ? (
            <Heart className='size-7 cursor-pointer' />
          ) : null}

          <MoreHorizontal className='size-7 cursor-pointer' />
        </div>
      </div>
    </section>
  )
}

export default PlaylistDetailHero
