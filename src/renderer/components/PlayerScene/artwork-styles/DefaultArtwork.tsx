import { Music2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import PlayerScenePixiCover from '../WaterRippleCover'
import type { PlayerArtworkStyleComponentProps } from './types'

const DefaultArtwork = ({
  coverUrl,
  sizedCoverUrl,
  title,
  artistNames,
  isPlaying,
  shouldAnimateArtwork,
  retroCoverPreset,
  isSceneOpen,
}: PlayerArtworkStyleComponentProps) => {
  return (
    <section className='flex min-w-0 flex-col items-center gap-6 text-center 2xl:gap-15'>
      <div
        className={cn(
          'aspect-square max-w-[500px] min-w-[280px] rounded-[20px]',
          isPlaying && 'is-breathing'
        )}
        style={{
          width: 'clamp(280px, min(38vw, calc(100dvh - 420px)), 500px)',
        }}
      >
        <div className='relative h-full w-full overflow-hidden rounded-[20px] border border-white/18 bg-white/10 shadow-[0_42px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl'>
          {coverUrl ? (
            <PlayerScenePixiCover
              src={sizedCoverUrl}
              className='h-full w-full'
              shouldAnimate={shouldAnimateArtwork}
              isVisible={isSceneOpen}
              retroCoverPreset={retroCoverPreset}
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-white/18 to-white/6 text-white/70'>
              <Music2 className='size-20' />
            </div>
          )}
        </div>
      </div>

      <div className='max-w-105 space-y-2 2xl:max-w-125'>
        <h2 className='truncate text-3xl font-black tracking-tight text-(--player-foreground)'>
          {title}
        </h2>
        <p className='truncate text-base text-(--player-muted)'>
          {artistNames}
        </p>
      </div>
    </section>
  )
}

export default DefaultArtwork
