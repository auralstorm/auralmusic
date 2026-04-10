interface LikedSongsHeroProps {
  totalSongs: number
}

const LikedSongsHero = ({ totalSongs }: LikedSongsHeroProps) => {
  return (
    <section className='relative flex flex-col items-center justify-center px-6 pt-14 pb-10 text-center md:pt-20 md:pb-14'>
      <div className='max-w-4xl space-y-5'>
        <h1 className='text-[clamp(3rem,8vw,5.8rem)] leading-[0.95] font-black text-rose-500'>
          我喜欢的音乐
        </h1>
        <p className='text-xs tracking-[0.22em] text-neutral-400 uppercase'>
          Liked Songs · {totalSongs} Tracks
        </p>
      </div>
    </section>
  )
}

export default LikedSongsHero
