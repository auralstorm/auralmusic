# Header Search Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a header-triggered search dialog with debounced keyword search, type switching for songs/albums/playlists/MVs, infinite scroll results, and type-specific actions.

**Architecture:** Keep the feature local to the renderer header by introducing a reusable `SearchDialog` business component under `src/renderer/components`. Route all requests through a thin `src/renderer/api/search.ts` wrapper, normalize divergent `/cloudsearch` payloads in a dedicated model file, and let the dialog container compose the API, list state, navigation, and playback behavior.

**Tech Stack:** React 19, React Router 7, TypeScript, zustand playback store, axios request wrapper, node:test, ESLint

---

## File Map

- Create: `tests/header-search-dialog.model.test.ts`
  Regression coverage for search-type mapping and result normalization.
- Create: `src/renderer/components/SearchDialog/search-dialog.model.ts`
  Type metadata, API-type mapping, response normalization, and shared row helpers.
- Create: `src/renderer/components/SearchDialog/index.tsx`
  Search dialog container with keyword state, type state, debounce, load-more integration, playback/navigation dispatch, and idle/error handling.
- Create: `src/renderer/components/SearchDialog/components/SearchInputBar.tsx`
  Pure search bar presentation using `InputGroup` and `Select`.
- Create: `src/renderer/components/SearchDialog/components/SearchResultList.tsx`
  List shell for empty, loading, error, results, and bottom status text.
- Create: `src/renderer/components/SearchDialog/components/SearchResultRow.tsx`
  Single normalized row renderer with MV disabled treatment.
- Modify: `src/renderer/api/search.ts`
  Replace placeholder code with a typed `/cloudsearch` thin service.
- Modify: `src/renderer/components/Header/index.tsx`
  Replace the loose search icon with a real button and mount the new dialog.

### Task 1: Add the failing model test

**Files:**

- Create: `tests/header-search-dialog.model.test.ts`
- Test: `tests/header-search-dialog.model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SEARCH_TYPE_CODE_MAP,
  normalizeSearchResults,
} from '../src/renderer/components/SearchDialog/search-dialog.model.ts'

test('SEARCH_TYPE_CODE_MAP exposes the supported cloudsearch codes', () => {
  assert.deepEqual(SEARCH_TYPE_CODE_MAP, {
    song: 1,
    album: 10,
    playlist: 1000,
    mv: 1004,
  })
})

test('normalizeSearchResults maps song payloads into playable rows', () => {
  const rows = normalizeSearchResults(
    {
      result: {
        songs: [
          {
            id: 101,
            name: 'Northern Lights',
            dt: 245000,
            ar: [{ name: 'Aurora Echo' }],
            al: {
              name: 'Midnight Signals',
              picUrl: 'https://img.example.com/song.jpg',
            },
          },
        ],
      },
    },
    'song'
  )

  assert.deepEqual(rows, [
    {
      id: 101,
      type: 'song',
      name: 'Northern Lights',
      artistName: 'Aurora Echo',
      coverUrl: 'https://img.example.com/song.jpg',
      targetId: 101,
      disabled: false,
      playbackTrack: {
        id: 101,
        name: 'Northern Lights',
        artistNames: 'Aurora Echo',
        albumName: 'Midnight Signals',
        coverUrl: 'https://img.example.com/song.jpg',
        duration: 245000,
      },
    },
  ])
})

test('normalizeSearchResults maps albums, playlists, and mvs into the shared row shape', () => {
  const albumRows = normalizeSearchResults(
    {
      result: {
        albums: [
          {
            id: 202,
            name: 'Moonline',
            picUrl: 'https://img.example.com/album.jpg',
            artist: { name: 'Night Pulse' },
            artists: [{ name: 'Night Pulse' }],
          },
        ],
      },
    },
    'album'
  )

  const playlistRows = normalizeSearchResults(
    {
      result: {
        playlists: [
          {
            id: 303,
            name: 'City Drive',
            coverImgUrl: 'https://img.example.com/playlist.jpg',
            creator: { nickname: 'Synth User' },
          },
        ],
      },
    },
    'playlist'
  )

  const mvRows = normalizeSearchResults(
    {
      result: {
        mvs: [
          {
            id: 404,
            name: 'Skyline',
            cover: 'https://img.example.com/mv.jpg',
            artistName: 'Nova',
          },
        ],
      },
    },
    'mv'
  )

  assert.deepEqual(albumRows[0], {
    id: 202,
    type: 'album',
    name: 'Moonline',
    artistName: 'Night Pulse',
    coverUrl: 'https://img.example.com/album.jpg',
    targetId: 202,
    disabled: false,
    playbackTrack: null,
  })

  assert.deepEqual(playlistRows[0], {
    id: 303,
    type: 'playlist',
    name: 'City Drive',
    artistName: 'Synth User',
    coverUrl: 'https://img.example.com/playlist.jpg',
    targetId: 303,
    disabled: false,
    playbackTrack: null,
  })

  assert.deepEqual(mvRows[0], {
    id: 404,
    type: 'mv',
    name: 'Skyline',
    artistName: 'Nova',
    coverUrl: 'https://img.example.com/mv.jpg',
    targetId: 404,
    disabled: true,
    playbackTrack: null,
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/header-search-dialog.model.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/renderer/components/SearchDialog/search-dialog.model.ts`

- [ ] **Step 3: Commit**

```bash
git add tests/header-search-dialog.model.test.ts
git commit -m "test: add header search dialog model coverage"
```

### Task 2: Implement the search model and API wrapper

**Files:**

- Create: `src/renderer/components/SearchDialog/search-dialog.model.ts`
- Modify: `src/renderer/api/search.ts`
- Test: `tests/header-search-dialog.model.test.ts`

- [ ] **Step 1: Write the minimal model implementation**

```ts
import type { PlaybackTrack } from '../../../../shared/playback.ts'

export type SearchType = 'song' | 'album' | 'playlist' | 'mv'

export interface SearchResultRowItem {
  id: number
  type: SearchType
  name: string
  artistName: string
  coverUrl: string
  targetId: number
  disabled: boolean
  playbackTrack: PlaybackTrack | null
}

export const SEARCH_TYPE_CODE_MAP: Record<SearchType, number> = {
  song: 1,
  album: 10,
  playlist: 1000,
  mv: 1004,
}

function formatArtistNames(artists?: Array<{ name?: string }>) {
  return (
    artists
      ?.map(item => item.name?.trim() || '')
      .filter(Boolean)
      .join(' / ') || '未知歌手'
  )
}

export function normalizeSearchResults(
  response: unknown,
  type: SearchType
): SearchResultRowItem[] {
  const result =
    response && typeof response === 'object'
      ? ((response as { result?: Record<string, unknown> }).result ?? {})
      : {}

  if (type === 'song') {
    return (
      ((result as { songs?: Array<Record<string, unknown>> }).songs ??
        []) as Array<Record<string, unknown>>
    ).flatMap(song => {
      const id = Number(song.id)
      if (!Number.isFinite(id)) return []

      const album =
        (song.al as { name?: string; picUrl?: string } | undefined) || {}
      const artistNames = formatArtistNames(
        song.ar as Array<{ name?: string }> | undefined
      )

      return [
        {
          id,
          type,
          name: String(song.name || '未知歌曲'),
          artistName: artistNames,
          coverUrl: album.picUrl || '',
          targetId: id,
          disabled: false,
          playbackTrack: {
            id,
            name: String(song.name || '未知歌曲'),
            artistNames,
            albumName: album.name || '未知专辑',
            coverUrl: album.picUrl || '',
            duration: Number(song.dt) || 0,
          },
        },
      ]
    })
  }

  if (type === 'album') {
    return (
      ((result as { albums?: Array<Record<string, unknown>> }).albums ??
        []) as Array<Record<string, unknown>>
    ).flatMap(album => {
      const id = Number(album.id)
      if (!Number.isFinite(id)) return []

      const artists = album.artists as Array<{ name?: string }> | undefined
      const artist = album.artist as { name?: string } | undefined

      return [
        {
          id,
          type,
          name: String(album.name || '未知专辑'),
          artistName: artist?.name || formatArtistNames(artists),
          coverUrl: String(album.picUrl || ''),
          targetId: id,
          disabled: false,
          playbackTrack: null,
        },
      ]
    })
  }

  if (type === 'playlist') {
    return (
      ((result as { playlists?: Array<Record<string, unknown>> }).playlists ??
        []) as Array<Record<string, unknown>>
    ).flatMap(playlist => {
      const id = Number(playlist.id)
      if (!Number.isFinite(id)) return []

      const creator =
        (playlist.creator as { nickname?: string } | undefined)?.nickname || ''

      return [
        {
          id,
          type,
          name: String(playlist.name || '未知歌单'),
          artistName: creator || '网易云音乐',
          coverUrl: String(playlist.coverImgUrl || playlist.picUrl || ''),
          targetId: id,
          disabled: false,
          playbackTrack: null,
        },
      ]
    })
  }

  return (
    ((result as { mvs?: Array<Record<string, unknown>> }).mvs ?? []) as Array<
      Record<string, unknown>
    >
  ).flatMap(mv => {
    const id = Number(mv.id)
    if (!Number.isFinite(id)) return []

    return [
      {
        id,
        type: 'mv',
        name: String(mv.name || '未知 MV'),
        artistName: String(mv.artistName || '未知歌手'),
        coverUrl: String(mv.cover || mv.coverUrl || mv.imgurl16v9 || ''),
        targetId: id,
        disabled: true,
        playbackTrack: null,
      },
    ]
  })
}
```

- [ ] **Step 2: Replace the placeholder API implementation**

```ts
import request from '@/lib/request'

import {
  SEARCH_TYPE_CODE_MAP,
  type SearchType,
} from '@/components/SearchDialog/search-dialog.model'

interface SearchResourcesParams {
  keywords: string
  type: SearchType
  limit?: number
  offset?: number
}

export function searchResources({
  keywords,
  type,
  limit = 20,
  offset = 0,
}: SearchResourcesParams) {
  return request.get('/cloudsearch', {
    params: {
      keywords,
      type: SEARCH_TYPE_CODE_MAP[type],
      limit,
      offset,
    },
  })
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `node tests/header-search-dialog.model.test.ts`

Expected: PASS with 3 passing tests

- [ ] **Step 4: Commit**

```bash
git add tests/header-search-dialog.model.test.ts src/renderer/components/SearchDialog/search-dialog.model.ts src/renderer/api/search.ts
git commit -m "feat: add header search dialog model"
```

### Task 3: Add the dialog presentation components

**Files:**

- Create: `src/renderer/components/SearchDialog/components/SearchInputBar.tsx`
- Create: `src/renderer/components/SearchDialog/components/SearchResultRow.tsx`
- Create: `src/renderer/components/SearchDialog/components/SearchResultList.tsx`

- [ ] **Step 1: Add the type selector search bar**

```tsx
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { SearchType } from '../search-dialog.model'

interface SearchInputBarProps {
  value: string
  type: SearchType
  onValueChange: (value: string) => void
  onTypeChange: (value: SearchType) => void
}

const SEARCH_TYPE_OPTIONS: Array<{ value: SearchType; label: string }> = [
  { value: 'song', label: '单曲' },
  { value: 'album', label: '专辑' },
  { value: 'playlist', label: '歌单' },
  { value: 'mv', label: 'MV' },
]

const SearchInputBar = ({
  value,
  type,
  onValueChange,
  onTypeChange,
}: SearchInputBarProps) => {
  return (
    <InputGroup className='h-11 rounded-xl'>
      <InputGroupInput
        autoFocus
        value={value}
        placeholder='搜索你想听的内容'
        onChange={event => onValueChange(event.target.value)}
      />
      <InputGroupAddon align='inline-end'>
        <Select
          value={type}
          onValueChange={value => onTypeChange(value as SearchType)}
        >
          <SelectTrigger className='absolute end-0 border-0! bg-transparent! focus:ring-0!'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align='end'>
            {SEARCH_TYPE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InputGroupAddon>
    </InputGroup>
  )
}

export default SearchInputBar
```

- [ ] **Step 2: Add the single result row**

```tsx
import { cn } from '@/lib/utils'

import type { SearchResultRowItem } from '../search-dialog.model'

interface SearchResultRowProps {
  item: SearchResultRowItem
  onSelect: (item: SearchResultRowItem) => void
}

const SearchResultRow = ({ item, onSelect }: SearchResultRowProps) => {
  return (
    <button
      type='button'
      disabled={item.disabled}
      className={cn(
        'hover:bg-accent/70 grid w-full grid-cols-[52px_minmax(0,1fr)_160px] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
        item.disabled && 'cursor-not-allowed opacity-55'
      )}
      onClick={() => onSelect(item)}
    >
      <div className='bg-muted h-12 w-12 overflow-hidden rounded-lg'>
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.name}
            className='h-full w-full object-cover'
          />
        ) : null}
      </div>
      <div className='min-w-0'>
        <p className='truncate text-sm font-medium'>{item.name}</p>
      </div>
      <p className='text-muted-foreground truncate text-sm'>
        {item.artistName}
      </p>
    </button>
  )
}

export default SearchResultRow
```

- [ ] **Step 3: Add the list shell**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

import SearchResultRow from './SearchResultRow'
import type { SearchResultRowItem, SearchType } from '../search-dialog.model'

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
      <div className='text-muted-foreground py-10 text-center text-sm'>
        输入关键词开始搜索
      </div>
    )
  }

  if (loading && items.length === 0) {
    return (
      <div className='space-y-3 py-2'>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className='h-16 w-full rounded-xl' />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-destructive py-10 text-center text-sm'>{error}</div>
    )
  }

  if (items.length === 0) {
    return (
      <div className='text-muted-foreground py-10 text-center text-sm'>
        未找到“{query}”的
        {type === 'song'
          ? '单曲'
          : type === 'album'
            ? '专辑'
            : type === 'playlist'
              ? '歌单'
              : 'MV'}
        结果
      </div>
    )
  }

  return (
    <div className='space-y-1'>
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
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/SearchDialog/components/SearchInputBar.tsx src/renderer/components/SearchDialog/components/SearchResultRow.tsx src/renderer/components/SearchDialog/components/SearchResultList.tsx
git commit -m "feat: add header search dialog ui pieces"
```

### Task 4: Implement the dialog container and wire Header

**Files:**

- Create: `src/renderer/components/SearchDialog/index.tsx`
- Modify: `src/renderer/components/Header/index.tsx`
- Test: `tests/header-search-dialog.model.test.ts`

- [ ] **Step 1: Add the dialog container**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { searchResources } from '@/api/search'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'
import { usePlaybackStore } from '@/stores/playback-store'

import SearchInputBar from './components/SearchInputBar'
import SearchResultList from './components/SearchResultList'
import {
  normalizeSearchResults,
  type SearchResultRowItem,
  type SearchType,
} from './search-dialog.model'

const PAGE_SIZE = 20

const SearchDialog = () => {
  const navigate = useNavigate()
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)

  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [type, setType] = useState<SearchType>('song')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [keyword])

  const query = debouncedKeyword.trim()

  const fetchRows = async (offset: number, limit: number) => {
    if (!query) {
      return { list: [], hasMore: false }
    }

    try {
      setError('')
      const response = await searchResources({
        keywords: query,
        type,
        offset,
        limit,
      })

      const list = normalizeSearchResults(response.data, type)
      return {
        list,
        hasMore: list.length >= limit,
      }
    } catch (fetchError) {
      console.error('search dialog fetch failed', fetchError)
      setError('搜索失败，请稍后重试')
      return {
        list: [],
        hasMore: false,
      }
    }
  }

  const { data, loading, hasMore, reset, sentinelRef } =
    useIntersectionLoadMore<SearchResultRowItem>(fetchRows, {
      limit: PAGE_SIZE,
    })

  useEffect(() => {
    reset()
  }, [query, type, reset])

  const rows = useMemo(() => data, [data])

  const handleSelect = (item: SearchResultRowItem) => {
    if (item.type === 'song' && item.playbackTrack) {
      playQueueFromIndex([item.playbackTrack], 0)
      return
    }

    if (item.type === 'album') {
      setOpen(false)
      navigate(`/albums/${item.targetId}`)
      return
    }

    if (item.type === 'playlist') {
      setOpen(false)
      navigate(`/playlist/${item.targetId}`)
    }
  }

  return (
    <>
      <button
        type='button'
        className='hover:bg-primary/10 window-no-drag rounded-full p-2 transition-colors'
        aria-label='打开搜索'
        onClick={() => setOpen(true)}
      >
        <SearchIcon className='size-5' />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-3xl gap-3 p-5' showCloseButton={false}>
          <DialogTitle className='sr-only'>搜索</DialogTitle>
          <SearchInputBar
            value={keyword}
            type={type}
            onValueChange={setKeyword}
            onTypeChange={setType}
          />
          <SearchResultList
            query={keyword}
            type={type}
            items={rows}
            loading={loading}
            hasMore={hasMore}
            error={error}
            sentinelRef={sentinelRef}
            onSelect={handleSelect}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SearchDialog
```

- [ ] **Step 2: Replace the raw icon in Header**

```tsx
import SearchDialog from '../SearchDialog'

// inside the right-side actions
;<SearchDialog />
```

- [ ] **Step 3: Run targeted verification**

Run: `node tests/header-search-dialog.model.test.ts`

Expected: PASS with 3 passing tests

Run: `node_modules\\.bin\\eslint.cmd src/renderer/api/search.ts src/renderer/components/SearchDialog/index.tsx src/renderer/components/SearchDialog/search-dialog.model.ts src/renderer/components/SearchDialog/components/SearchInputBar.tsx src/renderer/components/SearchDialog/components/SearchResultList.tsx src/renderer/components/SearchDialog/components/SearchResultRow.tsx src/renderer/components/Header/index.tsx`

Expected: exit code 0

- [ ] **Step 4: Commit**

```bash
git add src/renderer/api/search.ts src/renderer/components/SearchDialog src/renderer/components/Header/index.tsx tests/header-search-dialog.model.test.ts
git commit -m "feat: add header search dialog"
```

## Self-Review

- Spec coverage check:
  - Header trigger and dialog: covered in Task 4
  - Type selector and supported four types: covered in Tasks 1-4
  - `/cloudsearch` API wrapper: covered in Task 2
  - Normalized shared row model: covered in Tasks 1-2
  - Infinite scroll: covered in Task 4
  - Song playback / album navigation / playlist navigation / MV disabled: covered in Tasks 1-4
  - Idle, empty, loading, and error states: covered in Tasks 3-4
- Placeholder scan:
  - No `TODO` / `TBD`
  - Commands, files, and code snippets are explicit
- Type consistency:
  - `SearchType`, `SearchResultRowItem`, `SEARCH_TYPE_CODE_MAP`, `searchResources`, and `normalizeSearchResults` names remain consistent across tasks
