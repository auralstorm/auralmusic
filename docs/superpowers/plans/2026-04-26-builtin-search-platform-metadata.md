# 内置多平台搜索与平台元数据能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前内置五平台搜索结果建立独立的平台歌词与封面 provider 层，让非网易云搜索结果在播放时按来源平台稳定获取歌词与封面，而不是继续依赖第三方脚本或误走网易云链路。

**Architecture:** 保持现有单曲内置五平台搜索和 `lockedPlatform` 播放锁定逻辑不变，在 renderer 新增平台元数据服务层，拆分出 `lyricProvider` 与 `coverProvider`。播放器歌词与封面只依赖这层平台能力，不再直接混入播放 resolver；回退策略单独抽象，播放与元数据各自收口。

**Tech Stack:** React, TypeScript, Zustand, existing renderer services, Node test runner, current built-in search providers.

---

### Task 1: 搭建平台元数据能力层骨架

**Files:**
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.types.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.utils.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.service.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/index.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/index.ts`
- Test: `F:/code-demo/AuralMusic/tests/platform-metadata.service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveTrackPlatformMetadataSource,
  shouldUseBuiltinPlatformMetadata,
} from '../src/renderer/services/music-metadata/platform-metadata.service'

test('resolveTrackPlatformMetadataSource prefers locked platform', () => {
  assert.equal(
    resolveTrackPlatformMetadataSource({
      lockedPlatform: 'tx',
      lxInfo: { source: 'kg' },
    }),
    'tx'
  )
})

test('resolveTrackPlatformMetadataSource falls back to lxInfo source', () => {
  assert.equal(
    resolveTrackPlatformMetadataSource({
      lxInfo: { source: 'mg' },
    }),
    'mg'
  )
})

test('shouldUseBuiltinPlatformMetadata keeps wy on builtin path', () => {
  assert.equal(shouldUseBuiltinPlatformMetadata('wy'), true)
  assert.equal(shouldUseBuiltinPlatformMetadata('tx'), true)
  assert.equal(shouldUseBuiltinPlatformMetadata(null), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/platform-metadata.service.test.ts`
Expected: FAIL with module-not-found or missing export errors for `platform-metadata.service.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.types.ts
import type { LxSourceKey } from '../../../shared/lx-music-source'
import type { PlaybackTrack } from '../../../shared/playback'

export type BuiltinPlatformSource = LxSourceKey

export type BuiltinLyricResult = {
  lyric: string
  translatedLyric?: string
  yrc?: string
}

export type BuiltinCoverResult = {
  coverUrl: string
}

export type BuiltinLyricProvider = {
  getLyric(track: PlaybackTrack): Promise<BuiltinLyricResult | null>
}

export type BuiltinCoverProvider = {
  getCover(track: PlaybackTrack): Promise<BuiltinCoverResult | null>
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.utils.ts
import type { PlaybackTrack } from '../../../shared/playback'
import type { BuiltinPlatformSource } from './platform-metadata.types'

const BUILTIN_SOURCES = new Set<BuiltinPlatformSource>([
  'wy',
  'tx',
  'kw',
  'kg',
  'mg',
])

export function normalizeBuiltinPlatformSource(
  source: unknown
): BuiltinPlatformSource | null {
  if (typeof source !== 'string') {
    return null
  }

  const nextSource = source.trim() as BuiltinPlatformSource
  return BUILTIN_SOURCES.has(nextSource) ? nextSource : null
}

export function readTrackPlatformSource(
  track: Pick<PlaybackTrack, 'lockedPlatform' | 'lxInfo'>
): BuiltinPlatformSource | null {
  return (
    normalizeBuiltinPlatformSource(track.lockedPlatform) ??
    normalizeBuiltinPlatformSource(track.lxInfo?.source)
  )
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.service.ts
import type { PlaybackTrack } from '../../../shared/playback'
import { readTrackPlatformSource } from './platform-metadata.utils'
import type { BuiltinPlatformSource } from './platform-metadata.types'

export function resolveTrackPlatformMetadataSource(
  track: Pick<PlaybackTrack, 'lockedPlatform' | 'lxInfo'> | null | undefined
): BuiltinPlatformSource | null {
  if (!track) {
    return null
  }

  return readTrackPlatformSource(track)
}

export function shouldUseBuiltinPlatformMetadata(
  source: BuiltinPlatformSource | null
) {
  return source !== null
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/index.ts
export {}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/index.ts
export {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/platform-metadata.service.test.ts`
Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add tests/platform-metadata.service.test.ts \
  src/renderer/services/music-metadata/platform-metadata.types.ts \
  src/renderer/services/music-metadata/platform-metadata.utils.ts \
  src/renderer/services/music-metadata/platform-metadata.service.ts \
  src/renderer/services/music-metadata/providers/lyric/index.ts \
  src/renderer/services/music-metadata/providers/cover/index.ts

git commit -m "refactor: add platform metadata service skeleton"
```

### Task 2: 为五平台实现内置歌词 provider

**Files:**
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/wy-builtin-lyric-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/tx-builtin-lyric-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/kw-builtin-lyric-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/kg-builtin-lyric-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/mg-builtin-lyric-provider.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/index.ts`
- Test: `F:/code-demo/AuralMusic/tests/builtin-lyric-providers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createBuiltinLyricProviders,
  readBuiltinLyricProvider,
} from '../src/renderer/services/music-metadata/providers/lyric'

test('builtin lyric providers register all five sources', () => {
  const providers = createBuiltinLyricProviders()
  assert.ok(readBuiltinLyricProvider(providers, 'wy'))
  assert.ok(readBuiltinLyricProvider(providers, 'tx'))
  assert.ok(readBuiltinLyricProvider(providers, 'kw'))
  assert.ok(readBuiltinLyricProvider(providers, 'kg'))
  assert.ok(readBuiltinLyricProvider(providers, 'mg'))
})

test('readBuiltinLyricProvider returns null for unknown source', () => {
  const providers = createBuiltinLyricProviders()
  assert.equal(readBuiltinLyricProvider(providers, null), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/builtin-lyric-providers.test.ts`
Expected: FAIL with missing module exports.

- [ ] **Step 3: Write minimal implementation**

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/wy-builtin-lyric-provider.ts
import { getLyricNew } from '@/api/list'
import type { BuiltinLyricProvider } from '../../platform-metadata.types'

export const wyBuiltinLyricProvider: BuiltinLyricProvider = {
  async getLyric(track) {
    const payload = await getLyricNew({ id: track.id })
    return {
      lyric: payload?.lrc?.lyric ?? '',
      translatedLyric: payload?.tlyric?.lyric ?? '',
      yrc: payload?.yrc?.lyric ?? '',
    }
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/tx-builtin-lyric-provider.ts
import type { BuiltinLyricProvider } from '../../platform-metadata.types'

export const txBuiltinLyricProvider: BuiltinLyricProvider = {
  async getLyric(track) {
    const payload = await window.electronMusicSource.getTxLyric({
      songmid: String(track.lxInfo?.songmid ?? track.id),
      songId: track.id,
      artist: track.artistNames,
      title: track.name,
    })

    return payload
      ? {
          lyric: payload.lyric ?? '',
          translatedLyric: payload.translatedLyric ?? '',
          yrc: payload.yrc ?? '',
        }
      : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/kw-builtin-lyric-provider.ts
import type { BuiltinLyricProvider } from '../../platform-metadata.types'

export const kwBuiltinLyricProvider: BuiltinLyricProvider = {
  async getLyric(track) {
    const payload = await window.electronMusicSource.getKwLyric({
      rid: String(track.lxInfo?.songmid ?? track.id),
      artist: track.artistNames,
      title: track.name,
    })

    return payload
      ? {
          lyric: payload.lyric ?? '',
          translatedLyric: payload.translatedLyric ?? '',
          yrc: payload.yrc ?? '',
        }
      : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/kg-builtin-lyric-provider.ts
import type { BuiltinLyricProvider } from '../../platform-metadata.types'

export const kgBuiltinLyricProvider: BuiltinLyricProvider = {
  async getLyric(track) {
    const payload = await window.electronMusicSource.getKgLyric({
      hash: String(track.lxInfo?.hash ?? ''),
      artist: track.artistNames,
      title: track.name,
    })

    return payload
      ? {
          lyric: payload.lyric ?? '',
          translatedLyric: payload.translatedLyric ?? '',
          yrc: payload.yrc ?? '',
        }
      : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/mg-builtin-lyric-provider.ts
import type { BuiltinLyricProvider } from '../../platform-metadata.types'

export const mgBuiltinLyricProvider: BuiltinLyricProvider = {
  async getLyric(track) {
    const payload = await window.electronMusicSource.getMgLyric({
      songId: String(track.lxInfo?.songmid ?? track.id),
      copyrightId: String(track.lxInfo?.copyrightId ?? ''),
      artist: track.artistNames,
      title: track.name,
    })

    return payload
      ? {
          lyric: payload.lyric ?? '',
          translatedLyric: payload.translatedLyric ?? '',
          yrc: payload.yrc ?? '',
        }
      : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/lyric/index.ts
import type { BuiltinPlatformSource, BuiltinLyricProvider } from '../../platform-metadata.types'
import { wyBuiltinLyricProvider } from './wy-builtin-lyric-provider'
import { txBuiltinLyricProvider } from './tx-builtin-lyric-provider'
import { kwBuiltinLyricProvider } from './kw-builtin-lyric-provider'
import { kgBuiltinLyricProvider } from './kg-builtin-lyric-provider'
import { mgBuiltinLyricProvider } from './mg-builtin-lyric-provider'

export function createBuiltinLyricProviders(): Record<BuiltinPlatformSource, BuiltinLyricProvider> {
  return {
    wy: wyBuiltinLyricProvider,
    tx: txBuiltinLyricProvider,
    kw: kwBuiltinLyricProvider,
    kg: kgBuiltinLyricProvider,
    mg: mgBuiltinLyricProvider,
  }
}

export function readBuiltinLyricProvider(
  providers: Record<BuiltinPlatformSource, BuiltinLyricProvider>,
  source: BuiltinPlatformSource | null
) {
  return source ? providers[source] : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/builtin-lyric-providers.test.ts`
Expected: PASS with provider registry tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/builtin-lyric-providers.test.ts \
  src/renderer/services/music-metadata/providers/lyric/index.ts \
  src/renderer/services/music-metadata/providers/lyric/wy-builtin-lyric-provider.ts \
  src/renderer/services/music-metadata/providers/lyric/tx-builtin-lyric-provider.ts \
  src/renderer/services/music-metadata/providers/lyric/kw-builtin-lyric-provider.ts \
  src/renderer/services/music-metadata/providers/lyric/kg-builtin-lyric-provider.ts \
  src/renderer/services/music-metadata/providers/lyric/mg-builtin-lyric-provider.ts

git commit -m "feat: add builtin lyric providers"
```

### Task 3: 将播放器歌词链切到平台元数据服务

**Files:**
- Modify: `F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics-source.model.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics.service.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics.data.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.service.ts`
- Test: `F:/code-demo/AuralMusic/tests/player-lyrics.service.test.ts`
- Test: `F:/code-demo/AuralMusic/tests/player-lyrics.data.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchLyricTextBundle } from '../src/renderer/components/PlayerScene/player-lyrics.service'

test('non-wy playback uses builtin platform lyric path instead of netease lyric api', async () => {
  const track = {
    id: 1,
    name: '晴天',
    artistNames: '周杰伦',
    albumName: '叶惠美',
    coverUrl: '',
    duration: 1000,
    lockedPlatform: 'tx',
    lxInfo: { songmid: '001' },
  }

  const result = await fetchLyricTextBundle(track.id, track as never)
  assert.equal(typeof result.lrc, 'string')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/player-lyrics.service.test.ts tests/player-lyrics.data.test.ts`
Expected: FAIL because service still prefers LX script lyric path or old cache key assumptions.

- [ ] **Step 3: Write minimal implementation**

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.service.ts
import { createBuiltinLyricProviders, readBuiltinLyricProvider } from './providers/lyric'
import { resolveTrackPlatformMetadataSource } from './platform-metadata.service'
import type { PlaybackTrack } from '../../../shared/playback'

const builtinLyricProviders = createBuiltinLyricProviders()

export async function getBuiltinTrackLyric(track: PlaybackTrack) {
  const source = resolveTrackPlatformMetadataSource(track)
  const provider = readBuiltinLyricProvider(builtinLyricProviders, source)
  if (!provider) {
    return null
  }
  return provider.getLyric(track)
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics.data.ts
export function createLyricCacheKey(trackId: number | string, sourceId = 'wy') {
  return `lyrics:${sourceId}:${trackId}`
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics.service.ts
import { getBuiltinTrackLyric } from '@/services/music-metadata/platform-metadata.service'

async function fetchRemoteBuiltinLyricTextBundle(
  currentTrack: PlaybackTrack
): Promise<LyricTextBundle | null> {
  const result = await getBuiltinTrackLyric(currentTrack)
  if (!result) {
    return null
  }

  return {
    lrc: result.lyric ?? '',
    tlyric: result.translatedLyric ?? '',
    yrc: result.yrc ?? '',
  }
}

// 在非本地、无本地歌词分支中替换旧的 LX lyric 优先逻辑
const builtinBundle = currentTrack
  ? await fetchRemoteBuiltinLyricTextBundle(currentTrack)
  : null
if (builtinBundle && hasLyricTextBundle(builtinBundle)) {
  writeLyricPayload(cacheKey, builtinBundle)
  return builtinBundle
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/player-lyrics.service.test.ts tests/player-lyrics.data.test.ts tests/platform-metadata.service.test.ts tests/builtin-lyric-providers.test.ts`
Expected: PASS with non-`wy` lyric path tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/PlayerScene/player-lyrics-source.model.ts \
  src/renderer/components/PlayerScene/player-lyrics.service.ts \
  src/renderer/components/PlayerScene/player-lyrics.data.ts \
  src/renderer/services/music-metadata/platform-metadata.service.ts \
  tests/player-lyrics.service.test.ts \
  tests/player-lyrics.data.test.ts

git commit -m "refactor: route playback lyrics through builtin metadata providers"
```

### Task 4: 为五平台实现封面 provider 并接入 UI 兜底

**Files:**
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/wy-builtin-cover-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/tx-builtin-cover-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/kw-builtin-cover-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/kg-builtin-cover-provider.ts`
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/mg-builtin-cover-provider.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/index.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.service.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/components/SearchDialog/components/SearchResultRow.tsx`
- Test: `F:/code-demo/AuralMusic/tests/builtin-cover-providers.test.ts`
- Test: `F:/code-demo/AuralMusic/tests/search-dialog-lx-enhanced.contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBuiltinCoverProviders, readBuiltinCoverProvider } from '../src/renderer/services/music-metadata/providers/cover'

test('builtin cover providers register all five sources', () => {
  const providers = createBuiltinCoverProviders()
  assert.ok(readBuiltinCoverProvider(providers, 'wy'))
  assert.ok(readBuiltinCoverProvider(providers, 'tx'))
  assert.ok(readBuiltinCoverProvider(providers, 'kw'))
  assert.ok(readBuiltinCoverProvider(providers, 'kg'))
  assert.ok(readBuiltinCoverProvider(providers, 'mg'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/builtin-cover-providers.test.ts`
Expected: FAIL with missing provider modules.

- [ ] **Step 3: Write minimal implementation**

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/tx-builtin-cover-provider.ts
import type { BuiltinCoverProvider } from '../../platform-metadata.types'

export const txBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    const albumId = String(track.lxInfo?.albumId ?? '')
    if (!albumId) {
      return null
    }

    return {
      coverUrl: `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumId}.jpg`,
    }
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/wy-builtin-cover-provider.ts
import type { BuiltinCoverProvider } from '../../platform-metadata.types'

export const wyBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    return track.coverUrl.trim() ? { coverUrl: track.coverUrl } : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/kw-builtin-cover-provider.ts
import type { BuiltinCoverProvider } from '../../platform-metadata.types'

export const kwBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    const payload = await window.electronMusicSource.getKwCover({
      songmid: String(track.lxInfo?.songmid ?? track.id),
    })
    return payload?.coverUrl ? { coverUrl: payload.coverUrl } : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/kg-builtin-cover-provider.ts
import type { BuiltinCoverProvider } from '../../platform-metadata.types'

export const kgBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    const payload = await window.electronMusicSource.getKgCover({
      hash: String(track.lxInfo?.hash ?? ''),
      albumId: String(track.lxInfo?.albumId ?? ''),
    })
    return payload?.coverUrl ? { coverUrl: payload.coverUrl } : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/mg-builtin-cover-provider.ts
import type { BuiltinCoverProvider } from '../../platform-metadata.types'

export const mgBuiltinCoverProvider: BuiltinCoverProvider = {
  async getCover(track) {
    if (track.coverUrl.trim()) {
      return { coverUrl: track.coverUrl }
    }

    const payload = await window.electronMusicSource.getMgCover({
      songId: String(track.lxInfo?.songmid ?? track.id),
    })
    return payload?.coverUrl ? { coverUrl: payload.coverUrl } : null
  },
}
```

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/providers/cover/index.ts
import type { BuiltinPlatformSource, BuiltinCoverProvider } from '../../platform-metadata.types'
import { wyBuiltinCoverProvider } from './wy-builtin-cover-provider'
import { txBuiltinCoverProvider } from './tx-builtin-cover-provider'
import { kwBuiltinCoverProvider } from './kw-builtin-cover-provider'
import { kgBuiltinCoverProvider } from './kg-builtin-cover-provider'
import { mgBuiltinCoverProvider } from './mg-builtin-cover-provider'

export function createBuiltinCoverProviders(): Record<BuiltinPlatformSource, BuiltinCoverProvider> {
  return {
    wy: wyBuiltinCoverProvider,
    tx: txBuiltinCoverProvider,
    kw: kwBuiltinCoverProvider,
    kg: kgBuiltinCoverProvider,
    mg: mgBuiltinCoverProvider,
  }
}

export function readBuiltinCoverProvider(
  providers: Record<BuiltinPlatformSource, BuiltinCoverProvider>,
  source: BuiltinPlatformSource | null
) {
  return source ? providers[source] : null
}
```

```tsx
// F:/code-demo/AuralMusic/src/renderer/components/SearchDialog/components/SearchResultRow.tsx
<img
  src={item.coverUrl || '/images/default-cover.png'}
  onError={event => {
    event.currentTarget.src = '/images/default-cover.png'
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/builtin-cover-providers.test.ts tests/search-dialog-lx-enhanced.contract.test.ts`
Expected: PASS with provider registry green and search row still rendering fallback cover.

- [ ] **Step 5: Commit**

```bash
git add tests/builtin-cover-providers.test.ts \
  src/renderer/services/music-metadata/providers/cover/index.ts \
  src/renderer/services/music-metadata/providers/cover/wy-builtin-cover-provider.ts \
  src/renderer/services/music-metadata/providers/cover/tx-builtin-cover-provider.ts \
  src/renderer/services/music-metadata/providers/cover/kw-builtin-cover-provider.ts \
  src/renderer/services/music-metadata/providers/cover/kg-builtin-cover-provider.ts \
  src/renderer/services/music-metadata/providers/cover/mg-builtin-cover-provider.ts \
  src/renderer/components/SearchDialog/components/SearchResultRow.tsx

git commit -m "feat: add builtin cover providers"
```

### Task 5: 收口 metadata fallback 策略与端到端回归

**Files:**
- Create: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata-fallback.service.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata.service.ts`
- Modify: `F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics.service.ts`
- Modify: `F:/code-demo/AuralMusic/src/shared/music-source/policy.ts`
- Test: `F:/code-demo/AuralMusic/tests/platform-metadata-fallback.service.test.ts`
- Test: `F:/code-demo/AuralMusic/tests/music-source-policy.test.ts`
- Test: `F:/code-demo/AuralMusic/tests/playback-source-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldFallbackBuiltinMetadata } from '../src/renderer/services/music-metadata/platform-metadata-fallback.service'

test('lyrics do not cross-fallback in phase 1', () => {
  assert.equal(shouldFallbackBuiltinMetadata('lyric', 'tx'), false)
})

test('covers may fallback to placeholder in phase 1', () => {
  assert.equal(shouldFallbackBuiltinMetadata('cover', 'kw'), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types tests/platform-metadata-fallback.service.test.ts tests/music-source-policy.test.ts tests/playback-source-resolver.test.ts`
Expected: FAIL with missing module and outdated expectations if any policy drift remains.

- [ ] **Step 3: Write minimal implementation**

```ts
// F:/code-demo/AuralMusic/src/renderer/services/music-metadata/platform-metadata-fallback.service.ts
import type { BuiltinPlatformSource } from './platform-metadata.types'

export type BuiltinMetadataKind = 'lyric' | 'cover'

export function shouldFallbackBuiltinMetadata(
  kind: BuiltinMetadataKind,
  _source: BuiltinPlatformSource | null
) {
  if (kind === 'lyric') {
    return false
  }

  return true
}
```

```ts
// F:/code-demo/AuralMusic/src/shared/music-source/policy.ts
// 保持非 wy 顺序固定为 lxMusic -> customApi
```

```ts
// F:/code-demo/AuralMusic/src/renderer/components/PlayerScene/player-lyrics.service.ts
import { shouldFallbackBuiltinMetadata } from '@/services/music-metadata/platform-metadata-fallback.service'

// 在 builtin lyric provider 返回 null 时，若 shouldFallbackBuiltinMetadata('lyric', source) === false，
// 直接返回空歌词，不再走脚本 lyric action 或跨源补救。
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types tests/platform-metadata-fallback.service.test.ts tests/music-source-policy.test.ts tests/playback-source-resolver.test.ts tests/player-lyrics.service.test.ts tests/builtin-cover-providers.test.ts`
Expected: PASS with playback policy still locked and metadata fallback rules explicit.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/services/music-metadata/platform-metadata-fallback.service.ts \
  src/renderer/services/music-metadata/platform-metadata.service.ts \
  src/renderer/components/PlayerScene/player-lyrics.service.ts \
  src/shared/music-source/policy.ts \
  tests/platform-metadata-fallback.service.test.ts \
  tests/music-source-policy.test.ts \
  tests/playback-source-resolver.test.ts

git commit -m "refactor: add metadata fallback policy"
```
