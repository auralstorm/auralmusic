import { useMemo } from 'react'
import { Play } from 'lucide-react'
import { Plyr, type PlyrSource } from 'plyr-react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import 'plyr-react/plyr.css'
import {
  type MvDetailHeroData,
  type MvPlaybackData,
} from '../../mv-detail.model'

interface MvDetailPlayerProps {
  hero: MvDetailHeroData
  playback: MvPlaybackData | null
  loading?: boolean
}

const PLAYER_OPTIONS = {
  controls: [
    'play-large',
    'play',
    'progress',
    'current-time',
    'mute',
    'volume',
    'settings',
    'fullscreen',
  ],
  settings: ['captions', 'quality', 'speed', 'loop'],
  invertTime: false,
  hideControls: false,
  seekTime: 10,
  keyboard: {
    focused: true,
    global: true,
  },
  posterEnabled: true,
  clickToPlay: true,
}

const MvDetailPlayer = ({
  hero,
  playback,
  loading = false,
}: MvDetailPlayerProps) => {
  const source = useMemo<PlyrSource | null>(() => {
    if (!playback?.url) {
      return null
    }

    return {
      type: 'video',
      poster: resizeImageUrl(
        hero.coverUrl,
        imageSizes.mvCard.width,
        imageSizes.mvCard.height
      ),
      sources: [
        {
          src: playback.url,
          type: 'video/mp4',
        },
      ],
    }
  }, [playback, hero])

  if (!source) {
    return (
      <div className='border-border/60 bg-card/90 overflow-hidden rounded-[30px] border shadow-[0_28px_80px_rgba(15,23,42,0.12)]'>
        <div className='relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950'>
          {hero.coverUrl ? (
            <img
              src={resizeImageUrl(
                hero.coverUrl,
                imageSizes.mvCard.width,
                imageSizes.mvCard.height
              )}
              alt={hero.name}
              className='absolute inset-0 size-full object-cover opacity-32'
              loading='eager'
              decoding='async'
              draggable={false}
            />
          ) : null}
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.22),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.72))]' />
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 text-white'>
            <div className='bg-primary/90 flex size-16 items-center justify-center rounded-full shadow-[0_20px_40px_rgba(59,130,246,0.22)]'>
              <Play className='ml-1 size-7 fill-current' />
            </div>
            <div className='space-y-1 text-center'>
              <p className='text-sm tracking-[0.2em] text-white/70 uppercase'>
                MV 鎾斁鍖?
              </p>
              <p className='text-lg font-semibold'>
                {loading ? '姝ｅ湪鍔犺浇瑙嗛...' : '鏆傛棤鍙挱鏀惧湴鍧€'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='border-border/60 bg-card/90 overflow-hidden rounded-[30px] border shadow-[0_28px_80px_rgba(15,23,42,0.12)]'>
      <div className='relative aspect-video overflow-hidden bg-slate-950'>
        <Plyr
          source={source}
          options={PLAYER_OPTIONS}
          playsInline
          preload='metadata'
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
}

export default MvDetailPlayer
