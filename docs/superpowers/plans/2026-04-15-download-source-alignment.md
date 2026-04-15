# Download Source Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make song downloads use the same source-resolution strategy as playback so downloaded files are more often complete and closer to the user-selected quality.

**Architecture:** Keep the existing main-process `DownloadService` queue, persistence, metadata embedding, and filesystem writes. Move source selection earlier: the renderer resolves a concrete download source with official endpoints first and LX music source fallback second, then passes the resolved URL and actual quality to the main process; the main process only falls back to its legacy resolver when no pre-resolved source is provided.

**Tech Stack:** Electron, React, Zustand, TypeScript, Node `node:test`, existing renderer API modules, existing LX music source runner.

---

## File Structure

**Create**

- `src/renderer/services/download/download-source-resolver.ts`
  Renderer-side download source resolver. Tries official download URL, official playback URL, then LX source fallback. Returns the resolved provider, URL, effective quality, and optional extension.
- `tests/download-source-resolver.test.ts`
  Unit tests for renderer-side source resolution with injected dependencies.
- `tests/track-list-download.model.test.ts`
  Unit tests for the track-list download entry flow when source resolution succeeds, falls back, or fails.
- `tests/config-download-quality-policy.test.ts`
  Unit tests for new config normalization around strict-vs-fallback download policy.

**Modify**

- `src/main/download/download-types.ts`
  Extend payload and task types to carry resolved source metadata and configurable download quality policy.
- `src/main/download/download-service.ts`
  Prefer pre-resolved `sourceUrl`/`resolvedQuality` from the renderer before running the legacy main-process resolver.
- `src/main/ipc/download-ipc.ts`
  Pass the new config value through `readConfig()`.
- `src/main/config/types.ts`
  Add `downloadQualityPolicy`, defaults, and normalization helpers.
- `src/main/config/store.ts`
  Persist and normalize `downloadQualityPolicy`.
- `src/renderer/stores/config-store.ts`
  Normalize and expose the new config key to the renderer.
- `src/renderer/components/TrackList/track-list-download.model.ts`
  Resolve the download source before enqueueing, then send the enriched payload to the preload bridge.
- `src/renderer/components/TrackList/TrackListItem.tsx`
  Surface better error messages and keep the action flow the same for the user.
- `src/renderer/pages/Settings/components/DownloadSettings.tsx`
  Add a UI control for strict-vs-fallback download quality behavior.
- `tests/download-service.test.ts`
  Extend existing tests to verify that renderer-provided source URLs bypass the legacy resolver and preserve resolved quality in task output.

**Check but do not modify unless needed**

- `src/renderer/api/list.ts`
  Reuse `getSongUrlV1()` instead of duplicating official playback URL requests.
- `src/renderer/services/music-source/lx-playback-resolver.ts`
  Reuse existing LX resolution behavior rather than reimplementing provider logic.
- `src/preload/api/download-api.ts`
  Verify the exposed bridge already forwards arbitrary payload fields without extra schema changes.

### Task 1: Add Renderer Download Source Resolution

**Files:**

- Create: `src/renderer/services/download/download-source-resolver.ts`
- Test: `tests/download-source-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDownloadSourceResolver,
  type DownloadSourceResolverDeps,
} from '../src/renderer/services/download/download-source-resolver.ts'

test('createDownloadSourceResolver falls back from official endpoints to LX and returns effective quality', async () => {
  const calls: string[] = []

  const deps: DownloadSourceResolverDeps = {
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.level}:${params.unblock}`)
      return { data: { data: [{ id: 1, url: '' }] } }
    },
    getSongDownloadUrlV1: async params => {
      calls.push(`song-download:${params.level}`)
      return { data: { data: { url: '' } } }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return {
        id: 1,
        url: 'https://cdn.example.com/full.flac',
        time: 200000,
        br: 0,
      }
    },
    getConfig: () => ({
      quality: 'lossless',
      musicSourceEnabled: true,
      luoxueSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      activeLuoxueMusicSourceScriptId: 'script-1',
      luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    }),
  }

  const resolveDownloadSource = createDownloadSourceResolver(deps)
  const result = await resolveDownloadSource({
    track: {
      id: 1,
      name: 'Test Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 200000,
    },
    requestedQuality: 'lossless',
    policy: 'fallback',
  })

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/full.flac',
    quality: 'lossless',
    provider: 'lxMusic',
    fileExtension: null,
  })
  assert.deepEqual(calls, [
    'song-download:lossless',
    'song-url:lossless:false',
    'song-url:lossless:true',
    'lx',
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/download-source-resolver.test.ts`  
Expected: FAIL with module-not-found or missing export errors for `createDownloadSourceResolver`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { getSongUrlV1 } from '@/api/list'
import { resolveTrackWithLxMusicSource } from '@/services/music-source/lx-playback-resolver'
import { useConfigStore } from '@/stores/config-store'
import { normalizeSongUrlV1Response } from '../../../shared/playback.ts'
import type { AudioQualityLevel } from '../../../main/config/types.ts'

export type DownloadResolutionPolicy = 'strict' | 'fallback'

export type ResolvedDownloadSource = {
  url: string
  quality: AudioQualityLevel
  provider: 'official-download' | 'official-playback' | 'lxMusic'
  fileExtension: string | null
}

export type DownloadSourceResolverDeps = {
  getSongDownloadUrlV1?: (params: {
    id: number | string
    level: AudioQualityLevel
  }) => Promise<{ data: unknown }>
  getSongUrlV1?: typeof getSongUrlV1
  resolveTrackWithLxMusicSource?: typeof resolveTrackWithLxMusicSource
  getConfig?: () => ReturnType<typeof useConfigStore.getState>['config']
}

export function createDownloadSourceResolver(
  deps: DownloadSourceResolverDeps = {}
) {
  const getConfig = deps.getConfig ?? (() => useConfigStore.getState().config)

  return async function resolveDownloadSource(options: {
    track: {
      id: number
      name: string
      artistNames: string
      albumName: string
      coverUrl: string
      duration: number
    }
    requestedQuality: AudioQualityLevel
    policy: DownloadResolutionPolicy
  }): Promise<ResolvedDownloadSource | null> {
    const config = getConfig()
    const levels =
      options.policy === 'strict'
        ? [options.requestedQuality]
        : [options.requestedQuality, 'higher', 'standard']

    for (const level of levels) {
      const downloadResponse = deps.getSongDownloadUrlV1
        ? await deps.getSongDownloadUrlV1({ id: options.track.id, level })
        : null

      const officialDownloadUrl =
        downloadResponse &&
        typeof downloadResponse.data === 'object' &&
        downloadResponse.data &&
        'data' in (downloadResponse.data as Record<string, unknown>)
          ? ((downloadResponse.data as { data?: { url?: string } }).data?.url ??
            '')
          : ''

      if (officialDownloadUrl) {
        return {
          url: officialDownloadUrl,
          quality: level,
          provider: 'official-download',
          fileExtension: null,
        }
      }

      for (const unblock of config.musicSourceEnabled
        ? [false, true]
        : [false]) {
        const playbackResponse = await (deps.getSongUrlV1 ?? getSongUrlV1)({
          id: options.track.id,
          level,
          unblock,
        })
        const playback = normalizeSongUrlV1Response(playbackResponse.data)
        if (playback?.url) {
          return {
            url: playback.url,
            quality: level,
            provider: 'official-playback',
            fileExtension: null,
          }
        }
      }

      const lxResult = await (
        deps.resolveTrackWithLxMusicSource ?? resolveTrackWithLxMusicSource
      )({
        track: options.track,
        quality: level,
        config,
      })

      if (lxResult?.url) {
        return {
          url: lxResult.url,
          quality: level,
          provider: 'lxMusic',
          fileExtension: null,
        }
      }
    }

    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/download-source-resolver.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/download-source-resolver.test.ts src/renderer/services/download/download-source-resolver.ts
git commit -m "feat: add renderer download source resolver"
```

### Task 2: Resolve Download Source Before Enqueueing

**Files:**

- Modify: `src/renderer/components/TrackList/track-list-download.model.ts`
- Modify: `src/renderer/components/TrackList/TrackListItem.tsx`
- Modify: `src/main/download/download-types.ts`
- Test: `tests/track-list-download.model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { handleTrackDownload } from '../src/renderer/components/TrackList/track-list-download.model.ts'

test('handleTrackDownload enqueues the resolved source instead of only the requested quality', async () => {
  let payload: Record<string, unknown> | null = null

  const didEnqueue = await handleTrackDownload({
    item: {
      id: 1,
      name: 'Test Song',
      duration: 1000,
      artistNames: 'Artist',
      albumName: 'Album',
    },
    downloadEnabled: true,
    requestedQuality: 'lossless',
    resolveDownloadSource: async () => ({
      url: 'https://cdn.example.com/real.flac',
      quality: 'lossless',
      provider: 'lxMusic',
      fileExtension: '.flac',
    }),
    enqueueSongDownload: async nextPayload => {
      payload = nextPayload as Record<string, unknown>
      return {}
    },
    toastError: () => undefined,
  })

  assert.equal(didEnqueue, true)
  assert.equal(payload?.sourceUrl, 'https://cdn.example.com/real.flac')
  assert.equal(payload?.resolvedQuality, 'lossless')
  assert.equal(payload?.sourceProvider, 'lxMusic')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/track-list-download.model.test.ts`  
Expected: FAIL because `handleTrackDownload` does not accept `resolveDownloadSource` and does not forward resolved fields.

- [ ] **Step 3: Write minimal implementation**

```ts
import type {
  SongDownloadPayload,
  AudioQualityLevel,
} from '../../../main/download/download-types.ts'
import {
  createDownloadSourceResolver,
  type ResolvedDownloadSource,
} from '@/services/download/download-source-resolver'

const resolveDownloadSource = createDownloadSourceResolver()

export async function handleTrackDownload(options: {
  item: TrackListDownloadSong
  coverUrl?: string
  requestedQuality?: AudioQualityLevel
  downloadEnabled: boolean
  resolveDownloadSource?: (input: {
    track: {
      id: number
      name: string
      artistNames: string
      albumName: string
      coverUrl: string
      duration: number
    }
    requestedQuality: AudioQualityLevel
    policy: 'strict' | 'fallback'
  }) => Promise<ResolvedDownloadSource | null>
  enqueueSongDownload: (payload: SongDownloadPayload) => Promise<unknown>
  toastError: (message: string) => void
}) {
  // build base payload first...
  const requestedQuality = options.requestedQuality || context.requestedQuality
  const resolved = await (
    options.resolveDownloadSource ?? resolveDownloadSource
  )({
    track: {
      id: context.songId as number,
      name: context.songName,
      artistNames: context.artistName,
      albumName: context.albumName || '',
      coverUrl: context.coverUrl || '',
      duration: options.item.duration,
    },
    requestedQuality,
    policy: 'fallback',
  })

  if (!resolved) {
    options.toastError('获取音乐下载地址失败，请稍后重试')
    return false
  }

  await options.enqueueSongDownload({
    ...context,
    requestedQuality,
    sourceUrl: resolved.url,
    resolvedQuality: resolved.quality,
    sourceProvider: resolved.provider,
    fileExtension: resolved.fileExtension,
  })
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/track-list-download.model.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/track-list-download.model.test.ts src/renderer/components/TrackList/track-list-download.model.ts src/renderer/components/TrackList/TrackListItem.tsx src/main/download/download-types.ts
git commit -m "feat: resolve download source before enqueueing"
```

### Task 3: Make Main-Process Downloads Prefer Pre-Resolved Sources

**Files:**

- Modify: `src/main/download/download-types.ts`
- Modify: `src/main/download/download-service.ts`
- Test: `tests/download-service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('DownloadService uses renderer-provided sourceUrl and resolvedQuality before legacy source resolution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  let resolverCalled = false

  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-pre-resolved-source',
    resolveSongUrl: async () => {
      resolverCalled = true
      return null
    },
    downloadFetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      assert.equal(url, 'https://cdn.example.com/direct.flac')
      return new Response(Buffer.from('audio-data'), {
        status: 200,
        headers: { 'content-type': 'audio/flac' },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '1',
    songName: 'Direct Song',
    artistName: 'Artist',
    requestedQuality: 'lossless',
    resolvedQuality: 'lossless',
    sourceProvider: 'lxMusic',
    sourceUrl: 'https://cdn.example.com/direct.flac',
    fileExtension: '.flac',
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')
  assert.equal(completed.resolvedQuality, 'lossless')
  assert.equal(resolverCalled, false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/download-service.test.ts`  
Expected: FAIL because `SongDownloadPayload` does not include `resolvedQuality` and the service still uses the legacy resolver path.

- [ ] **Step 3: Write minimal implementation**

```ts
export type SongDownloadPayload = {
  songId: number | string
  songName: string
  artistName: string
  coverUrl?: string
  albumName?: string
  directory?: string
  fileName?: string
  requestedQuality: AudioQualityLevel
  resolvedQuality?: AudioQualityLevel
  sourceProvider?: 'official-download' | 'official-playback' | 'lxMusic'
  sourceUrl?: string
  fileExtension?: string | null
  metadata?: DownloadTaskMetadata
}
```

```ts
const resolved = await this.resolveDownloadSource(taskId)
const resolvedQuality =
  payload.resolvedQuality || resolved.quality || task.requestedQuality
```

```ts
if (payload.sourceUrl) {
  return {
    url: payload.sourceUrl,
    quality: payload.resolvedQuality || quality,
    fileExtension: payload.fileExtension ?? null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/download-service.test.ts`  
Expected: PASS, including the new pre-resolved-source case and the existing fallback-chain cases.

- [ ] **Step 5: Commit**

```bash
git add tests/download-service.test.ts src/main/download/download-types.ts src/main/download/download-service.ts
git commit -m "feat: prefer pre-resolved download sources"
```

### Task 4: Add Strict vs Fallback Download Quality Policy

**Files:**

- Modify: `src/main/config/types.ts`
- Modify: `src/main/config/store.ts`
- Modify: `src/renderer/stores/config-store.ts`
- Modify: `src/main/ipc/download-ipc.ts`
- Modify: `src/renderer/pages/Settings/components/DownloadSettings.tsx`
- Test: `tests/config-download-quality-policy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultConfig,
  normalizeDownloadQualityPolicy,
} from '../src/main/config/types.ts'

test('normalizeDownloadQualityPolicy keeps supported values and falls back to the default', () => {
  assert.equal(defaultConfig.downloadQualityPolicy, 'fallback')
  assert.equal(normalizeDownloadQualityPolicy('strict'), 'strict')
  assert.equal(normalizeDownloadQualityPolicy('fallback'), 'fallback')
  assert.equal(normalizeDownloadQualityPolicy('unexpected'), 'fallback')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/config-download-quality-policy.test.ts`  
Expected: FAIL because the policy type and normalization function do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export const DOWNLOAD_QUALITY_POLICIES = ['strict', 'fallback'] as const
export type DownloadQualityPolicy = (typeof DOWNLOAD_QUALITY_POLICIES)[number]
```

```ts
export interface AppConfig {
  // ...
  downloadQualityPolicy: DownloadQualityPolicy
}

export const defaultConfig: AppConfig = {
  // ...
  downloadQualityPolicy: 'fallback',
}

export function normalizeDownloadQualityPolicy(value: unknown) {
  return typeof value === 'string' &&
    DOWNLOAD_QUALITY_POLICIES.includes(value as DownloadQualityPolicy)
    ? (value as DownloadQualityPolicy)
    : defaultConfig.downloadQualityPolicy
}
```

```ts
readConfig: () => ({
  // ...
  downloadQualityPolicy: getConfig('downloadQualityPolicy'),
})
```

```tsx
<Select
  value={downloadQualityPolicy}
  onValueChange={value =>
    void setConfig('downloadQualityPolicy', value as DownloadQualityPolicy)
  }
>
  <SelectItem value='fallback'>自动降级</SelectItem>
  <SelectItem value='strict'>严格按所选音质</SelectItem>
</Select>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/config-download-quality-policy.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/config-download-quality-policy.test.ts src/main/config/types.ts src/main/config/store.ts src/renderer/stores/config-store.ts src/main/ipc/download-ipc.ts src/renderer/pages/Settings/components/DownloadSettings.tsx
git commit -m "feat: add download quality policy"
```

### Task 5: Wire Policy Into Renderer Resolution and Verify End-to-End

**Files:**

- Modify: `src/renderer/services/download/download-source-resolver.ts`
- Modify: `src/renderer/components/TrackList/track-list-download.model.ts`
- Test: `tests/download-source-resolver.test.ts`
- Test: `tests/track-list-download.model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('createDownloadSourceResolver stops after the requested quality when policy is strict', async () => {
  const calls: string[] = []
  const resolveDownloadSource = createDownloadSourceResolver({
    getSongDownloadUrlV1: async params => {
      calls.push(`download:${params.level}`)
      return { data: { data: { url: '' } } }
    },
    getSongUrlV1: async params => {
      calls.push(`playback:${params.level}:${params.unblock}`)
      return { data: { data: [{ id: 1, url: '' }] } }
    },
    resolveTrackWithLxMusicSource: async () => null,
    getConfig: () => ({
      quality: 'lossless',
      musicSourceEnabled: true,
      luoxueSourceEnabled: true,
      musicSourceProviders: ['lxMusic'],
      activeLuoxueMusicSourceScriptId: 'script-1',
      luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    }),
  })

  const result = await resolveDownloadSource({
    track: {
      id: 1,
      name: 'Test Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 1000,
    },
    requestedQuality: 'lossless',
    policy: 'strict',
  })

  assert.equal(result, null)
  assert.deepEqual(calls, [
    'download:lossless',
    'playback:lossless:false',
    'playback:lossless:true',
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/download-source-resolver.test.ts tests/track-list-download.model.test.ts`  
Expected: FAIL because the entry flow does not read config policy and the resolver still behaves like fallback mode.

- [ ] **Step 3: Write minimal implementation**

```ts
const downloadQualityPolicy = useConfigStore(
  state => state.config.downloadQualityPolicy
)
```

```ts
const resolved = await resolveDownloadSource({
  track: nextTrack,
  requestedQuality,
  policy: options.policy ?? downloadQualityPolicy,
})
```

```ts
const levels =
  options.policy === 'strict'
    ? [options.requestedQuality]
    : createDownloadQualityFallbackChain(options.requestedQuality)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/download-source-resolver.test.ts tests/track-list-download.model.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/download-source-resolver.test.ts tests/track-list-download.model.test.ts src/renderer/services/download/download-source-resolver.ts src/renderer/components/TrackList/track-list-download.model.ts
git commit -m "feat: honor download quality policy during resolution"
```

### Task 6: Full Verification

**Files:**

- Test: `tests/download-source-resolver.test.ts`
- Test: `tests/track-list-download.model.test.ts`
- Test: `tests/config-download-quality-policy.test.ts`
- Test: `tests/download-service.test.ts`
- Verify: `src/renderer/pages/Settings/components/DownloadSettings.tsx`
- Verify: `src/renderer/components/TrackList/TrackListItem.tsx`

- [ ] **Step 1: Run targeted tests**

Run:

```bash
node --test tests/download-source-resolver.test.ts tests/track-list-download.model.test.ts tests/config-download-quality-policy.test.ts tests/download-service.test.ts
```

Expected: all tests PASS

- [ ] **Step 2: Run build verification**

Run:

```bash
pnpm run build
```

Expected: `tsc -b && electron-vite build` exits with code 0

- [ ] **Step 3: Run packaging verification**

Run:

```bash
pnpm run build:win
```

Expected: Windows package is produced under `dist/` with no TypeScript or icon failures

- [ ] **Step 4: Manual smoke check in Electron**

Run:

```bash
pnpm dev
```

Expected:

- Downloading a song with `downloadQualityPolicy = fallback` can fall back to a lower quality and still enqueue
- Downloading the same song with `downloadQualityPolicy = strict` fails fast when the selected quality is unavailable
- Successful downloads show the resolved quality in the download list

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify download source alignment"
```

## Self-Review

- Spec coverage:
  - Reuse playback-like source resolution for downloads: covered in Tasks 1, 2, 5.
  - Preserve main-process download queue architecture: covered in Task 3.
  - Make quality fallback user-configurable: covered in Task 4.
  - Verify end-to-end build and packaging: covered in Task 6.
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” markers remain.
  - Each task lists exact files, commands, and code snippets.
- Type consistency:
  - `downloadQualityPolicy` is used consistently as `'strict' | 'fallback'`.
  - `sourceProvider` is used consistently as `'official-download' | 'official-playback' | 'lxMusic'`.
  - `resolvedQuality` is carried from renderer resolution into main-process task state.
