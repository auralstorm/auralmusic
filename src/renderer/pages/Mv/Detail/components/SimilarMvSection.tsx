import { Skeleton } from '@/components/ui/skeleton'
import { type SimilarMvItem } from '../../mv-detail.model'
import SimilarMvCard from './SimilarMvCard'

interface SimilarMvSectionProps {
  items: SimilarMvItem[]
  loading?: boolean
  error?: string
  onOpen: (id: number) => void
}

const SimilarMvSection = ({
  items,
  loading = false,
  error = '',
  onOpen,
}: SimilarMvSectionProps) => {
  console.log('SimilarMvSection', items)

  return (
    <section className='space-y-4'>
      <div className='flex items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h2 className='text-foreground text-2xl font-bold tracking-[-0.04em]'>
            相似 MV
          </h2>
        </div>
      </div>

      {error ? (
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-sm'>
          {error}
        </div>
      ) : items.length === 0 && loading ? (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className='border-border/50 bg-card/70 overflow-hidden rounded-[24px] border p-3'
            >
              <Skeleton className='aspect-[16/9] rounded-[18px]' />
              <div className='space-y-3 px-1 pt-3'>
                <Skeleton className='h-5 w-5/6 rounded-full' />
                <Skeleton className='h-4 w-2/5 rounded-full' />
                <Skeleton className='h-4 w-1/3 rounded-full' />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-sm'>
          暂无相似 MV
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'>
          {items.map(item => (
            <SimilarMvCard key={item.id} item={item} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  )
}

export default SimilarMvSection
