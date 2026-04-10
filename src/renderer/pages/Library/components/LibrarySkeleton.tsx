import { Skeleton } from '@/components/ui/skeleton'

const LibrarySkeleton = () => {
  return (
    <section className='w-full space-y-10 pb-8'>
      <section className='space-y-6'>
        <div className='grid grid-cols-[1fr_2fr] gap-5'>
          <div className='relative min-h-[240px] overflow-hidden rounded-[32px] border border-[#d8e4ff] p-6'>
            <div className='absolute inset-0 bg-[linear-gradient(135deg,#e8f0ff_0%,#d6e2ff_55%,#c0d2ff_100%)]' />
            <div className='absolute inset-0 bg-white/60 backdrop-blur-[4px]' />

            <div className='relative z-10 flex h-full flex-col justify-between'>
              <div className='space-y-3'>
                <Skeleton className='h-4 w-32 bg-white/70' />
              </div>

              <div className='flex items-end justify-between gap-4'>
                <div className='space-y-3'>
                  <Skeleton className='h-10 w-56 bg-white/75' />
                  <Skeleton className='h-4 w-20 bg-white/70' />
                </div>
                <Skeleton className='size-12 rounded-full bg-white/80' />
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className='border-border/30 bg-background/70 flex items-center gap-3 rounded-[18px] border px-3 py-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]'
              >
                <Skeleton className='size-12 rounded-[12px]' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <Skeleton className='h-4 w-4/5 rounded-full' />
                  <Skeleton className='h-3 w-2/5 rounded-full' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='w-full space-y-6'>
        <div className='flex w-full items-center justify-between gap-4'>
          <div className='flex flex-wrap items-center gap-3'>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className='h-11 w-20 rounded-[14px]' />
            ))}
          </div>

          <Skeleton className='h-12 w-32 rounded-[16px]' />
        </div>

        <div className='grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5'>
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className='space-y-3'>
              <Skeleton className='aspect-square rounded-[22px]' />
              <Skeleton className='h-5 w-4/5 rounded-full' />
              <Skeleton className='h-4 w-2/5 rounded-full' />
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

export default LibrarySkeleton
