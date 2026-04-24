import type { LucideIcon } from 'lucide-react'

interface LocalLibraryOverviewMetricCardProps {
  icon: LucideIcon
  label: string
  value: number
  unit: string
  accentClassName: string
  iconClassName: string
}

const LocalLibraryOverviewMetricCard = ({
  icon: Icon,
  label,
  value,
  unit,
  accentClassName,
  iconClassName,
}: LocalLibraryOverviewMetricCardProps) => {
  return (
    <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_50px_rgba(129,140,248,0.09)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 dark:border-white/8 dark:bg-white/6 dark:shadow-[0_24px_50px_rgba(0,0,0,0.26)]'>
      <div className='flex items-start justify-between gap-4'>
        <div
          className={`flex h-13 w-13 items-center justify-center rounded-[18px] ${iconClassName}`}
        >
          <Icon className='size-6 stroke-[1.7]' />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='text-muted-foreground text-sm font-medium tracking-[0.08em] dark:text-white/52'>
            {label}
          </div>
          <div className='mt-2 flex items-end gap-2'>
            <span className='text-foreground text-[2.2rem] leading-none font-semibold dark:text-white'>
              {value}
            </span>
            <span className='text-muted-foreground pb-1 text-sm font-medium dark:text-white/50'>
              {unit}
            </span>
          </div>
        </div>
      </div>

      <div className='mt-5 h-1.5 w-8 rounded-full bg-black/6 dark:bg-white/10'>
        <div className={`h-full rounded-full ${accentClassName}`} />
      </div>
    </div>
  )
}

export default LocalLibraryOverviewMetricCard
