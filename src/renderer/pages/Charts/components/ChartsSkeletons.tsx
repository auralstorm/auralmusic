const GRID_CARDS = Array.from({ length: 4 })
const GRID_ITEMS = Array.from({ length: 8 })

export const CoreRankingsSkeleton = () => {
  return (
    <div className='w-full'>
      <div className='text-2xl font-bold mb-4 text-foreground/70'>官方榜单</div>
      <div className='grid gap-5 grid-cols-4'>
        {GRID_CARDS.map((_, index) => (
          <div
            key={index}
            className='relative flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[30px] border border-border/70 bg-slate-700/20 shadow-[0_28px_70px_rgba(15,23,42,0.18)] animate-pulse'
          >
            <div className='absolute inset-0 bg-slate-700/40' />
            <div className='relative flex h-full min-h-[310px] flex-col justify-between p-6'>
              <div className='space-y-4'>
                <div className='h-4 w-24 rounded-full bg-slate-500/50' />
                <div className='h-10 w-2/3 rounded-full bg-slate-500/50' />
                <div className='space-y-3'>
                  <div className='h-4 rounded-full bg-slate-500/50' />
                  <div className='h-4 w-5/6 rounded-full bg-slate-500/50' />
                  <div className='h-4 w-3/4 rounded-full bg-slate-500/50' />
                </div>
              </div>
              <div className='space-y-3'>
                <div className='h-4 w-12 rounded-full bg-slate-500/50' />
                <div className='h-10 w-10 rounded-full bg-slate-500/50' />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const GenreChartsSkeleton = () => {
  return (
    <div className='w-full'>
      <div className='text-2xl font-bold mt-10 mb-4 text-foreground/70'>全球排行榜</div>
      <div className='w-full grid gap-5 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8'>
        {GRID_ITEMS.map((_, index) => (
          <div key={index} className='group flex flex-col gap-3 text-left animate-pulse'>
            <div className='relative aspect-square overflow-hidden rounded-[14px] border border-border/60 bg-slate-700/20 shadow-[0_18px_44px_rgba(15,23,42,0.14)]'>
              <div className='absolute inset-0 bg-slate-700/40' />
              <div className='absolute left-4 top-4 h-10 w-10 rounded-full bg-slate-500/50' />
              <div className='absolute bottom-4 left-4 right-4 h-4 rounded-full bg-slate-500/50' />
            </div>
            <div className='space-y-2 px-0.5'>
              <div className='h-4 w-4/5 rounded-full bg-slate-500/50' />
              <div className='h-3 w-3/5 rounded-full bg-slate-500/50' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
