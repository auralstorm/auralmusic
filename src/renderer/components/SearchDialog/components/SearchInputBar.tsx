import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SEARCH_TYPE_LABEL_MAP } from '../search-dialog.model'
import type { SearchInputBarProps, SearchType } from '../types'

const SEARCH_TYPE_OPTIONS: SearchType[] = [
  'song',
  'album',
  'artist',
  'playlist',
  'mv',
]

const SearchInputBar = ({
  value,
  type,
  enhanced = false,
  activeSourceId = 'wy',
  searchSourceTabs = [],
  onValueChange,
  onTypeChange,
  onSourceChange,
}: SearchInputBarProps) => {
  return (
    <div className='space-y-3'>
      <div className='relative w-full'>
        <input
          autoFocus
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder='搜索你想听的内容'
          className='bg-background/90 ring-primary/50 focus:ring-primary h-11 w-full rounded-xl border px-4 pe-24 ring-1 focus:ring-1 focus:outline-none'
        />

        <Select
          value={type}
          onValueChange={val => onTypeChange(val as SearchType)}
        >
          <SelectTrigger className='absolute end-1 top-1/2 h-9 w-20 -translate-y-1/2 border-0 bg-transparent'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align='end'>
            {SEARCH_TYPE_OPTIONS.map(option => (
              <SelectItem key={option} value={option}>
                {SEARCH_TYPE_LABEL_MAP[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {enhanced ? (
        <div className='bg-muted/50 flex grid h-10 w-full grid-cols-5 items-center gap-1 rounded-2xl p-1'>
          {searchSourceTabs.map(source => (
            <Button
              key={source.id}
              type='button'
              variant={source.id === activeSourceId ? 'default' : 'ghost'}
              size='sm'
              className='rounded-xl px-3'
              onClick={() => onSourceChange?.(source.id)}
            >
              {source.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default SearchInputBar
