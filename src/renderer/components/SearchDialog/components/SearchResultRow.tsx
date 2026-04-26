import { cn } from '@/lib/utils'

import type { SearchResultRowProps } from '../types'

const SearchResultRow = ({ item, onSelect }: SearchResultRowProps) => {
  return (
    <button
      type='button'
      disabled={item.disabled}
      title={item.name}
      className={cn(
        'hover:bg-accent/60 grid w-full grid-cols-[minmax(0,1fr)_120px_64px] items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors 2xl:grid-cols-[minmax(0,1fr)_180px_72px]',
        item.disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={() => onSelect(item)}
    >
      <p className='truncate text-sm font-medium'>
        {item.name}
        {item.qualityLabel ? (
          <span className='ml-1 align-middle text-[10px] font-semibold tracking-[-0.02em] text-emerald-500'>
            {item.qualityLabel}
          </span>
        ) : null}
      </p>
      <p className='text-muted-foreground truncate text-sm'>
        {item.artistName}
      </p>
      <p className='text-muted-foreground text-right text-xs tabular-nums'>
        {item.durationLabel}
      </p>
    </button>
  )
}

export default SearchResultRow
