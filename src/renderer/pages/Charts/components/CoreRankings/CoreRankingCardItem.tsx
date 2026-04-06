import { ArrowUpRight, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnlineChartHeroCardProps } from './CoreRankingCardItem.type'

const HERO_CARD_STYLES = [
  {
    shell: 'from-[#6f4aa6] via-[#5d428f] to-[#0f1222]',
    tint: 'bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.15),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.54))]',
    accent: 'text-[#d7c7ff]',
  },
  {
    shell: 'from-[#177a9a] via-[#135a84] to-[#08131e]',
    tint: 'bg-[radial-gradient(circle_at_22%_24%,rgba(255,255,255,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.56))]',
    accent: 'text-[#62e8ff]',
  },
  {
    shell: 'from-[#b64e1f] via-[#7c250f] to-[#150b0b]',
    tint: 'bg-[radial-gradient(circle_at_76%_14%,rgba(255,177,106,0.18),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.56))]',
    accent: 'text-[#ff9b44]',
  },
  {
    shell: 'from-[#5a4a9f] via-[#303b7c] to-[#09111f]',
    tint: 'bg-[radial-gradient(circle_at_74%_18%,rgba(255,255,255,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.56))]',
    accent: 'text-[#cdd0ff]',
  },
] as const

export const CoreRankingCard = ({ chart, index, onOpen }: OnlineChartHeroCardProps) => {
  const style = HERO_CARD_STYLES[index % HERO_CARD_STYLES.length]

  return (
    <div
      className='group relative flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[30px] border border-border/70 bg-card text-left shadow-[0_28px_70px_rgba(15,23,42,0.18)] transition-transform duration-300 hover:-translate-y-1'
      onClick={() => onOpen(chart.id)}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br', style.shell)} />
      {chart.coverImgUrl ? (
        <div
          className='absolute inset-0 bg-cover bg-center opacity-28 mix-blend-screen transition-transform duration-500 group-hover:scale-105'
          style={{ backgroundImage: `url("${chart.coverImgUrl}")` }}
        />
      ) : null}
      <div className={cn('absolute inset-0', style.tint)} />
      <div className='absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/95 via-black/55 to-transparent' />

      <div className='relative flex h-full min-h-[310px] flex-col justify-between p-6 text-white'>
        <div className='space-y-5'>
          <div className='flex items-start justify-between gap-4'>
            <div className='space-y-3'>
              <p className='text-[10px] font-semibold uppercase tracking-[0.34em] text-white/58'>
                {chart.badge}
              </p>
              <h3 className='text-[2.15rem] font-black leading-[0.92] tracking-[-0.06em] text-white'>
                {chart.name}
              </h3>
            </div>
            <ArrowUpRight className='mt-1 size-4 text-white/38 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
          </div>
        </div>

        <div className='space-y-4 pt-6'>
          <div className='space-y-3'>
            {chart?.preview?.map((track, trackIndex) => (
              <div key={track.id} className='grid grid-cols-[30px_1fr] items-start gap-3'>
                <span
                  className={cn(
                    'pt-0.5 text-[1.55rem] font-black italic leading-none tracking-[-0.08em]',
                    style.accent
                  )}
                >
                  {trackIndex + 1}
                </span>
                <div className='min-w-0'>
                  <p className='truncate text-[1.02rem] font-semibold leading-tight text-white'>
                    {track.name}
                  </p>
                  <p className='truncate pt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/56'>
                    {/* {track.artist} */}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className='flex items-center justify-between'>
            <div className='inline-flex size-12 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white backdrop-blur-md'>
              <Play className='ml-0.5 size-4 fill-current' />
            </div>
            <span className='text-sm text-white/60 group-hover:text-white/100 transition-colors duration-300'>
              {chart.updateFrequency}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoreRankingCard
