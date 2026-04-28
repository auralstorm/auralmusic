import { Music2 } from 'lucide-react'

import vinylImageUrl from '@/assets/vinyl.png'
import { cn } from '@/lib/utils'
import type { PlayerArtworkStyleComponentProps } from './types'

const VinylRecordArtwork = ({
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
          <div
            className={cn(
              'player-rotating-disc relative z-10 h-full w-full',
              shouldSpin && 'is-spinning'
            )}
          >
            <div className='absolute inset-[24%] overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_24px_rgba(255,255,255,0.18)]'>
              {coverUrl ? (
                <img
                  src={sizedCoverUrl}
                  alt={title}
                  className='h-full w-full object-cover'
                  draggable={false}
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-white/20 to-white/5 text-white/72'>
                  <Music2 className='size-14' />
                </div>
              )}
            </div>
            <img
              src={vinylImageUrl}
              alt=''
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_42px_90px_rgba(0,0,0,0.45)] select-none'
              draggable={false}
            />
          </div>
          <div
            aria-hidden='true'
            className='absolute inset-[16%] z-0 rounded-full bg-black/30 blur-3xl'
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

export default VinylRecordArtwork
