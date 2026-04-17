import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SEARCH_TYPE_LABEL_MAP, type SearchType } from '../search-dialog.model'

interface SearchInputBarProps {
  value: string
  type: SearchType
  onValueChange: (value: string) => void
  onTypeChange: (value: SearchType) => void
}

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
  onValueChange,
  onTypeChange,
}: SearchInputBarProps) => {
  return (
    <div className='relative w-full'>
      {/* 输入框 */}
      <input
        autoFocus
        value={value}
        onChange={e => onValueChange(e.target.value)}
        placeholder='搜索你想听的内容'
        className='bg-background/90 ring-primary/50 focus:ring-primary h-11 w-full rounded-xl border px-4 pe-24 ring-1 focus:ring-1 focus:outline-none'
      />

      {/* 下拉选择 */}
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
  )
}

export default SearchInputBar
