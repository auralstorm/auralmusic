import { Disc3, FolderOpen, LibraryBig, Music4, UsersRound } from 'lucide-react'
import type { LocalLibraryStats } from '../../../../shared/local-library.ts'
import LocalLibraryOverviewMetricCard from './LocalLibraryOverviewMetricCard'

interface LocalLibraryOverviewProps {
  stats: LocalLibraryStats
}

const LocalLibraryOverview = ({ stats }: LocalLibraryOverviewProps) => {
  const metricCards = [
    {
      label: '目录',
      value: stats.rootCount,
      unit: '个',
      icon: FolderOpen,
      accentClassName: 'w-4 bg-[#7b72ff]',
      iconClassName:
        'bg-[#efeaff] text-[#7b72ff] dark:bg-[#242042] dark:text-[#9b96ff]',
    },
    {
      label: '歌曲',
      value: stats.trackCount,
      unit: '首',
      icon: Music4,
      accentClassName: 'w-5 bg-[#3b9bff]',
      iconClassName:
        'bg-[#eaf4ff] text-[#3b9bff] dark:bg-[#10233a] dark:text-[#61b4ff]',
    },
    {
      label: '专辑',
      value: stats.albumCount,
      unit: '张',
      icon: Disc3,
      accentClassName: 'w-5 bg-[#ff7c1f]',
      iconClassName:
        'bg-[#fff1e4] text-[#ff7c1f] dark:bg-[#362012] dark:text-[#ff9b53]',
    },
    {
      label: '歌手',
      value: stats.artistCount,
      unit: '位',
      icon: UsersRound,
      accentClassName: 'w-5 bg-[#22a892]',
      iconClassName:
        'bg-[#eaf8f5] text-[#22a892] dark:bg-[#132c28] dark:text-[#58c7b4]',
    },
  ]

  return (
    <div className='relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,245,252,0.92)_0%,rgba(244,244,255,0.96)_46%,rgba(237,245,255,0.94)_100%)] p-7 shadow-[0_34px_90px_rgba(115,124,255,0.12)] sm:p-9 dark:border-white/8 dark:bg-[linear-gradient(135deg,rgba(23,22,33,0.98)_0%,rgba(21,23,38,0.98)_44%,rgba(19,26,44,0.98)_100%)] dark:shadow-[0_36px_90px_rgba(0,0,0,0.34)]'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -top-16 -left-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(244,163,216,0.24)_0%,rgba(244,163,216,0)_68%)] dark:bg-[radial-gradient(circle,rgba(153,104,255,0.22)_0%,rgba(153,104,255,0)_70%)]' />
        <div className='absolute -right-14 -bottom-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(118,140,255,0.2)_0%,rgba(118,140,255,0)_68%)] dark:bg-[radial-gradient(circle,rgba(64,132,255,0.18)_0%,rgba(64,132,255,0)_68%)]' />
        <div className='absolute top-5 right-6 hidden h-48 w-72 lg:block'>
          <div className='absolute inset-y-4 right-8 w-36 rounded-t-full border-[3px] border-b-0 border-[#a4a1ff]/80 opacity-85 dark:border-[#7570ff]/55' />
          <div className='absolute inset-y-10 right-16 w-28 rounded-t-full border-[2px] border-b-0 border-[#c4c2ff]/70 opacity-90 dark:border-[#9e99ff]/42' />
          <div className='absolute right-0 bottom-0 flex h-28 items-end gap-1 opacity-45 dark:opacity-70'>
            {Array.from({ length: 14 }).map((_, index) => (
              <span
                key={`overview-bar-${index}`}
                className='w-2 rounded-t-full bg-[linear-gradient(180deg,rgba(124,130,255,0.1),rgba(124,130,255,0.5))] dark:bg-[linear-gradient(180deg,rgba(118,129,255,0.08),rgba(118,129,255,0.42))]'
                style={{
                  height: `${42 + ((index % 5) + 1) * 14}px`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className='relative space-y-7'>
        <div className='flex items-start gap-4'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-white/82 text-[#776eff] shadow-[0_14px_30px_rgba(123,114,255,0.12)] dark:bg-white/8 dark:text-[#9d96ff] dark:shadow-[0_18px_36px_rgba(0,0,0,0.18)]'>
            <LibraryBig className='size-6 stroke-[1.8]' />
          </div>

          <div className='space-y-2'>
            <h1 className='text-foreground text-[2.15rem] leading-none font-semibold tracking-[-0.04em] dark:text-white'>
              本地乐库
            </h1>
            <p className='text-muted-foreground text-sm font-medium dark:text-white/58'>
              最近扫描：
              {stats.lastScannedAt
                ? new Date(stats.lastScannedAt).toLocaleString('zh-CN')
                : '尚未扫描'}
            </p>
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-4'>
          {metricCards.map(card => (
            <LocalLibraryOverviewMetricCard key={card.label} {...card} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default LocalLibraryOverview
