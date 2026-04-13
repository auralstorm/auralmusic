import { Skeleton } from '@/components/ui/skeleton'
import {
  SEARCH_TYPE_LABEL_MAP,
  type SearchResultRowItem,
  type SearchType,
} from '../search-dialog.model'
import SearchResultRow from './SearchResultRow'

interface SearchResultListProps {
  query: string
  type: SearchType
  items: SearchResultRowItem[]
  loading: boolean
  hasMore: boolean
  error: string
  sentinelRef: (node: HTMLDivElement | null) => void
  onSelect: (item: SearchResultRowItem) => void
}

const SearchResultList = ({
  query,
  type,
  items,
  loading,
  hasMore,
  error,
  sentinelRef,
  onSelect,
}: SearchResultListProps) => {
  if (!query.trim()) {
    return (
      <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
        输入关键词开始搜索
      </div>
    )
  }

  if (loading && items.length === 0) {
    return (
      <div className='w-full space-y-3 py-2'>
        <div className='text-muted-foreground grid grid-cols-[64px_minmax(0,1fr)_80px] gap-3 px-3 text-xs tracking-[0.18em] uppercase 2xl:grid-cols-[84px_minmax(0,1fr)_200px]'>
          <span>封面</span>
          <span>名称</span>
          <span>艺术家</span>
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className='h-20 w-full rounded-2xl' />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-destructive flex h-52 items-center justify-center text-sm'>
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className='text-muted-foreground flex h-52 items-center justify-center text-sm'>
        未找到“{query}”的{SEARCH_TYPE_LABEL_MAP[type]}结果
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      {/* <div className='text-muted-foreground grid grid-cols-[64px_minmax(0,1fr)_80px] gap-3 px-3 text-xs tracking-[0.18em] uppercase 2xl:grid-cols-[84px_minmax(0,1fr)_200px]'>
        <span>封面</span>
        <span>名称</span>
        <span>艺术家</span>
      </div> */}
      {items.map(item => (
        <SearchResultRow
          key={`${item.type}-${item.id}`}
          item={item}
          onSelect={onSelect}
        />
      ))}
      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-12 items-center justify-center text-sm'
      >
        {loading ? '正在加载更多...' : !hasMore ? '没有更多内容' : null}
      </div>
    </div>
  )
}

export default SearchResultList
