import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'

export interface OnlinePlaylistFeatureCardData {
  coverImgUrl: string
  id: number
  name: string
  picUrl: string | null
  disabled?: boolean
}

interface OnlinePlaylistFeatureCardProps {
  title: string
  card: OnlinePlaylistFeatureCardData
  onOpen: (playlistId: number) => void
  onPlay: (playlistId: number) => void
}

export const OnlinePlaylistFeatureCard = ({
  title,
  card,
  onOpen,
  onPlay,
}: OnlinePlaylistFeatureCardProps) => (
  <div
    className='relative min-h-[240px] overflow-hidden rounded-[30px] bg-cover bg-center'
    style={{
      backgroundImage: `url("${resizeImageUrl(
        card?.coverImgUrl,
        imageSizes.backgroundCover.width,
        imageSizes.backgroundCover.height
      )}")`,
    }}
  >
    <div className='absolute inset-0 bg-[linear-gradient(135deg,rgba(7,10,18,0.12),rgba(7,10,18,0.28)_38%,rgba(7,10,18,0.76)_100%)]' />
    <div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_78%_18%,rgba(255,111,145,0.18),transparent_28%),radial-gradient(circle_at_62%_76%,rgba(107,114,255,0.2),transparent_34%)]' />

    <div className='relative z-10 flex h-full min-h-[240px] flex-col justify-between p-7 text-white'>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <h2 className='max-w-[15ch] text-[clamp(2rem,3vw,3rem)] leading-[0.95] font-black tracking-[-0.08em] text-white'>
            {title}
          </h2>
          <p className='max-w-[42ch] text-sm leading-6 text-white/72'>
            {card?.name}
          </p>
        </div>
      </div>

      <div className='flex items-center gap-3'>
        <Button
          type='button'
          size='icon'
          disabled={card?.disabled}
          className='size-12 rounded-full border border-white/18 bg-white/12 text-white backdrop-blur-md hover:bg-white/20 disabled:cursor-default disabled:opacity-45'
          onClick={() => onPlay(card.id)}
        >
          <Play className='ml-0.5 size-4 fill-current' />
        </Button>
        <Button
          type='button'
          disabled={card?.disabled}
          className='rounded-full border border-white/12 bg-white/12 px-5 text-[11px] font-semibold tracking-[0.2em] text-white uppercase backdrop-blur-md hover:bg-white/20 disabled:cursor-default disabled:opacity-45'
          onClick={() => onOpen(card.id)}
        >
          View Collection
        </Button>
      </div>
    </div>
  </div>
)
