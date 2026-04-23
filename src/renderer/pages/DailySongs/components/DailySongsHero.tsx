import type { DailySongsHeroProps } from '../types'

const DailySongsHero = ({ totalSongs }: DailySongsHeroProps) => {
  return (
    <section className='relative flex flex-col items-center justify-center px-6 pt-14 pb-10 text-center md:pt-20 md:pb-14'>
      <div className='max-w-4xl space-y-5'>
        <h1 className='text-[clamp(3rem,8vw,5.8rem)] leading-[0.95] font-black text-rose-500'>
          每日歌曲推荐
        </h1>
        <p className='text-foreground/50 text-sm md:text-[17px]'>
          根据你的音乐口味生成，每天 6:00 更新
        </p>
        <p className='text-foreground/40 text-xs tracking-[0.22em] uppercase'>
          Today&apos;s mix · {totalSongs} tracks
        </p>
      </div>
    </section>
  )
}

export default DailySongsHero
