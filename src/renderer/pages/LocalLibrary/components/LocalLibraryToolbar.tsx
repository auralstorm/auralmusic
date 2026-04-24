import { RefreshCw, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LocalLibraryEntityType } from '../../../../shared/local-library.ts'
import { getLocalLibrarySearchPlaceholder } from '../local-library.model'

interface LocalLibraryToolbarProps {
  activeTab: LocalLibraryEntityType
  keyword: string
  isScanning: boolean
  hasSongScopeFilter: boolean
  onKeywordChange: (value: string) => void
  onClearSongScope: () => void
  onScan: () => void
}

const LocalLibraryToolbar = ({
  activeTab,
  keyword,
  isScanning,
  hasSongScopeFilter,
  onKeywordChange,
  onClearSongScope,
  onScan,
}: LocalLibraryToolbarProps) => {
  return (
    <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex flex-wrap items-center gap-3'>
        <TabsList className='h-12 rounded-full bg-[#f3f1ff] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'>
          <TabsTrigger
            value='songs'
            className='h-6 min-w-16 rounded-full px-4 text-[0.95rem] font-semibold data-active:bg-white data-active:text-[#5d62ff] data-active:shadow-[0_12px_28px_rgba(93,98,255,0.14)] dark:text-white/46 dark:data-active:bg-white/10 dark:data-active:text-white dark:data-active:shadow-[0_12px_28px_rgba(0,0,0,0.22)]'
          >
            歌曲
          </TabsTrigger>
          <TabsTrigger
            value='albums'
            className='h-6 min-w-16 rounded-full px-4 text-[0.95rem] font-semibold data-active:bg-white data-active:text-[#5d62ff] data-active:shadow-[0_12px_28px_rgba(93,98,255,0.14)] dark:text-white/46 dark:data-active:bg-white/10 dark:data-active:text-white dark:data-active:shadow-[0_12px_28px_rgba(0,0,0,0.22)]'
          >
            专辑
          </TabsTrigger>
          <TabsTrigger
            value='artists'
            className='h-6 min-w-16 rounded-full px-4 text-[0.95rem] font-semibold data-active:bg-white data-active:text-[#5d62ff] data-active:shadow-[0_12px_28px_rgba(93,98,255,0.14)] dark:text-white/46 dark:data-active:bg-white/10 dark:data-active:text-white dark:data-active:shadow-[0_12px_28px_rgba(0,0,0,0.22)]'
          >
            歌手
          </TabsTrigger>
        </TabsList>

        {hasSongScopeFilter ? (
          <Button
            type='button'
            variant='ghost'
            className='h-10 rounded-full px-4 text-sm text-[#63687a] hover:bg-[#efedff] hover:text-[#31344a] dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white'
            onClick={onClearSongScope}
          >
            <X className='size-4' />
            清除分类过滤
          </Button>
        ) : null}
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='relative w-full sm:w-[320px] lg:w-[340px]'>
          <Search className='text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 dark:text-white/44' />
          <Input
            value={keyword}
            onChange={event => onKeywordChange(event.target.value)}
            className='h-8 rounded-full border-white/80 bg-white/80 pr-11 pl-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/14 dark:bg-white/4 dark:text-white dark:shadow-[0_14px_30px_rgba(0,0,0,0.18)] dark:placeholder:text-white/34'
            placeholder={getLocalLibrarySearchPlaceholder(activeTab)}
          />
        </div>

        <Button
          type='button'
          variant='secondary'
          className='h-8 w-30 rounded-full bg-[#1f2128] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(31,33,40,0.18)] hover:bg-[#15171d] dark:border dark:border-white/8 dark:bg-white/10 dark:text-white dark:hover:bg-white/14'
          disabled={isScanning}
          aria-label={isScanning ? '扫描中' : '刷新本地乐库'}
          onClick={onScan}
        >
          {isScanning ? (
            <Spinner className='size-4 text-white' />
          ) : (
            <RefreshCw className='size-4' />
          )}
          {isScanning ? '扫描中' : '扫描音乐'}
        </Button>
      </div>
    </div>
  )
}

export default LocalLibraryToolbar
