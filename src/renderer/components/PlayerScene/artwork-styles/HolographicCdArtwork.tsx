import { Music2 } from 'lucide-react'

import holographicImageUrl from '@/assets/holographic.png'
import { cn } from '@/lib/utils'
import type { PlayerArtworkStyleComponentProps } from './types'

const HolographicCdArtwork = ({
  coverUrl,
  sizedCoverUrl,
  title,
  artistNames,
  isPlaying,
  isSceneOpen,
}: PlayerArtworkStyleComponentProps) => {
  const shouldSpin = isSceneOpen && isPlaying

  return (
    <section className='flex min-w-0 flex-col items-center gap-6 text-center 2xl:gap-15'>
      <div
        className='aspect-square max-w-[520px] min-w-[280px]'
        style={{
          width: 'clamp(280px, min(40vw, calc(100dvh - 400px)), 520px)',
        }}
      >
        <div className='relative isolate h-full w-full'>
          <div className='relative z-10 h-full w-full'>
            <div className='absolute inset-[17.5%] z-0 overflow-hidden rounded-full bg-white/8 shadow-[inset_0_0_32px_rgba(255,255,255,0.24)]'>
              {coverUrl ? (
                <img
                  src={sizedCoverUrl}
                  alt={title}
                  className={cn(
                    'player-rotating-disc h-full w-full object-cover',
                    shouldSpin && 'is-spinning'
                  )}
                  draggable={false}
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-200/25 via-fuchsia-200/18 to-white/8 text-white/78'>
                  <Music2 className='size-14' />
                </div>
              )}
            </div>
            <img
              src={holographicImageUrl}
              alt=''
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 z-20 h-full w-full object-contain drop-shadow-[0_42px_90px_rgba(0,0,0,0.48)] select-none'
              draggable={false}
            />
          </div>
          <div
            aria-hidden='true'
            className='absolute inset-[13%] z-0 rounded-full bg-cyan-300/20 blur-3xl'
          />
          <div
            aria-hidden='true'
            className='absolute inset-[18%] z-0 rounded-full bg-fuchsia-300/18 blur-2xl'
          />
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

export default HolographicCdArtwork
