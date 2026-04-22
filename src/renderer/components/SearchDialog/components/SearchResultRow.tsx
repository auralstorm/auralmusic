import { cn } from '@/lib/utils'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'

import type { SearchResultRowProps } from '../types'

const SearchResultRow = ({ item, onSelect }: SearchResultRowProps) => {
  return (
    <button
      type='button'
      disabled={item.disabled}
      title={item.name}
      className={cn(
        'hover:bg-accent/60 grid w-full grid-cols-[64px_minmax(0,1fr)_80px] items-center gap-3 rounded-2xl px-3 py-1 text-left transition-colors 2xl:grid-cols-[84px_minmax(0,1fr)_200px]',
        item.disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={() => onSelect(item)}
    >
      <div className='bg-muted flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl'>
        {item.coverUrl ? (
          <img
            src={resizeImageUrl(
              item.coverUrl,
              imageSizes.listCover.width,
              imageSizes.listCover.height
            )}
            alt={item.name}
            className='h-full w-full object-cover'
          />
        ) : (
          <span className='text-muted-foreground text-xs'>No Cover</span>
        )}
      </div>
      <p className='truncate text-sm font-medium'>{item.name}</p>
      <p className='text-muted-foreground truncate text-sm'>
        {item.artistName}
      </p>
    </button>
  )
}

export default SearchResultRow
