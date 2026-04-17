# All Playlist Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为歌单列表页的播放按钮接入整张歌单入队并从第一首开始播放的能力。

**Architecture:** 在 `AllPlayList` 旁边增加一个轻量 model，专门负责歌单播放请求参数与播放队列转换。页面容器只处理点击、请求、toast 和 `usePlaybackStore` 调用，不把转换逻辑塞进 JSX 组件。

**Tech Stack:** React 19, TypeScript, Zustand, node:test, Sonner

---

### Task 1: Add playlist playback model coverage

**Files:**

- Create: `tests/all-playlist-playback.model.test.ts`
- Create: `src/renderer/pages/PlayList/components/AllPlayList/playlist-playback.model.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPlaylistPlaybackTracksRequest,
  normalizePlaylistPlaybackQueue,
} from '../src/renderer/pages/PlayList/components/AllPlayList/playlist-playback.model.ts'

test('buildPlaylistPlaybackTracksRequest requests the first 1000 playlist tracks with a cache bust timestamp', () => {
  const request = buildPlaylistPlaybackTracksRequest(9527, 123456)

  assert.deepEqual(request, {
    id: 9527,
    limit: 1000,
    offset: 0,
    timestamp: 123456,
  })
})

test('normalizePlaylistPlaybackQueue maps playlist track payload to playback queue items', () => {
  assert.deepEqual(
    normalizePlaylistPlaybackQueue({
      songs: [
        {
          id: 1,
          name: 'Track A',
          dt: 180000,
          al: { name: 'Album A', picUrl: 'cover-a' },
          ar: [{ name: 'Artist A' }, { name: 'Artist B' }],
        },
      ],
    }),
    [
      {
        id: 1,
        name: 'Track A',
        artistNames: 'Artist A / Artist B',
        albumName: 'Album A',
        coverUrl: 'cover-a',
        duration: 180000,
      },
    ]
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/all-playlist-playback.model.test.ts`
Expected: FAIL with module-not-found or missing export errors because the model file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PlaybackTrack } from '../../../../../shared/playback.ts'

export interface PlaylistPlaybackTracksRequest {
  id: number
  limit: number
  offset: number
  timestamp: number
}

interface RawPlaylistPlaybackArtist {
  name?: string
}

interface RawPlaylistPlaybackAlbum {
  name?: string
  picUrl?: string
}

interface RawPlaylistPlaybackSong {
  id?: number
  name?: string
  dt?: number
  al?: RawPlaylistPlaybackAlbum
  ar?: RawPlaylistPlaybackArtist[]
}

interface RawPlaylistPlaybackTracksResponse {
  songs?: RawPlaylistPlaybackSong[]
}

export function buildPlaylistPlaybackTracksRequest(
  playlistId: number,
  timestamp = Date.now()
): PlaylistPlaybackTracksRequest {
  return {
    id: playlistId,
    limit: 1000,
    offset: 0,
    timestamp,
  }
}

export function normalizePlaylistPlaybackQueue(
  payload: RawPlaylistPlaybackTracksResponse | null | undefined
): PlaybackTrack[] {
  return (payload?.songs || [])
    .filter((song): song is RawPlaylistPlaybackSong & { id: number } =>
      Number.isFinite(song.id)
    )
    .map(song => ({
      id: song.id,
      name: song.name || '未知歌曲',
      artistNames:
        (song.ar || [])
          .map(artist => artist.name || '未知歌手')
          .filter(Boolean)
          .join(' / ') || '未知歌手',
      albumName: song.al?.name || '未知专辑',
      coverUrl: song.al?.picUrl || '',
      duration: song.dt || 0,
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/all-playlist-playback.model.test.ts`
Expected: PASS with both tests green.

### Task 2: Wire AllPlayList handlePlay to playback

**Files:**

- Modify: `src/renderer/pages/PlayList/components/AllPlayList/index.tsx`
- Modify: `tests/all-playlist-playback.model.test.ts`

- [ ] **Step 1: Extend the failing test for fallback behavior**

```ts
test('normalizePlaylistPlaybackQueue falls back for missing playlist track fields and returns empty queue for empty payload', () => {
  assert.deepEqual(
    normalizePlaylistPlaybackQueue({
      songs: [{ id: 2 }],
    }),
    [
      {
        id: 2,
        name: '未知歌曲',
        artistNames: '未知歌手',
        albumName: '未知专辑',
        coverUrl: '',
        duration: 0,
      },
    ]
  )

  assert.deepEqual(normalizePlaylistPlaybackQueue({ songs: [] }), [])
  assert.deepEqual(normalizePlaylistPlaybackQueue(null), [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/all-playlist-playback.model.test.ts`
Expected: FAIL if the fallback branch is not yet covered by the implementation.

- [ ] **Step 3: Write the page integration**

```ts
const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)
const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(null)

const handlePlay = async (playlistId: number) => {
  if (playingPlaylistId === playlistId) {
    return
  }

  setPlayingPlaylistId(playlistId)

  try {
    const response = await getPlaylistTracks(
      buildPlaylistPlaybackTracksRequest(playlistId)
    )
    const queue = normalizePlaylistPlaybackQueue(response.data)

    if (!queue.length) {
      toast.error('暂无可播放的歌单歌曲')
      return
    }

    playQueueFromIndex(queue, 0)
  } catch (error) {
    console.error('playlist play failed', error)
    toast.error('歌单播放失败，请稍后重试')
  } finally {
    setPlayingPlaylistId(null)
  }
}
```

- [ ] **Step 4: Run the focused test command**

Run: `node --test tests/all-playlist-playback.model.test.ts`
Expected: PASS with all added model tests green.

- [ ] **Step 5: Run a targeted lint check for touched files**

Run: `pnpm lint src/renderer/pages/PlayList/components/AllPlayList/index.tsx tests/all-playlist-playback.model.test.ts src/renderer/pages/PlayList/components/AllPlayList/playlist-playback.model.ts`
Expected: Existing repo warnings may remain elsewhere, but touched files should not introduce new lint errors.
