# Image Cache Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing disk cache pipeline with image caching and trial it only on the artist detail page so repeated visits can reuse local image files.

**Architecture:** Reuse the main-process `CacheService` and add a non-blocking `resolveImageSource` path that returns the original URL on cache miss while persisting the image in the background. Expose the new capability over the existing cache IPC bridge, then keep the renderer integration page-local by adding a focused artist-detail image cache helper instead of introducing a global image abstraction.

**Tech Stack:** Electron main/preload IPC, React renderer, TypeScript, Zustand config bridge, `node:test`, `pnpm lint`

---

## File Structure

- Modify: `src/main/cache/cache-types.ts`
  Responsibility: add image cache entry types and image resolve request/response contracts without changing the existing audio/lyrics API shape.
- Modify: `src/main/cache/cache-service.ts`
  Responsibility: create the `images/` cache directory, add image cache lookup and background persistence, and keep eviction/index handling centralized in the existing service.
- Modify: `src/shared/ipc/cache.ts`
  Responsibility: define the new image cache IPC channel constant.
- Modify: `src/main/ipc/cache-ipc.ts`
  Responsibility: register the image cache resolve handler and wire config values into the service call.
- Modify: `src/preload/api/cache-api.ts`
  Responsibility: expose `resolveImageSource(cacheKey, sourceUrl)` to the renderer.
- Create: `src/renderer/pages/Artists/Detail/artist-image-cache.ts`
  Responsibility: own semantic cache-key generation and artist-detail-only image URL resolution helpers.
- Modify: `src/renderer/pages/Artists/Detail/index.tsx`
  Responsibility: resolve hero, similar artist, album, and MV image URLs through the new cache API while keeping the page component as the orchestration layer.
- Modify: `tests/cache-service.test.ts`
  Responsibility: pin image cache hit/miss, background write, stale-entry cleanup, and shared-eviction behavior.
- Modify: `tests/cache-ipc.test.ts`
  Responsibility: pin the new main-process image IPC handler contract.
- Modify: `tests/shared-ipc-channels.test.ts`
  Responsibility: pin the new shared wire contract string.
- Create: `tests/artist-detail-image-cache.test.ts`
  Responsibility: pin semantic artist cache keys and page-local image resolution behavior at the renderer boundary.

### Task 1: Add Image Support To CacheService

**Files:**

- Modify: `src/main/cache/cache-types.ts`
- Modify: `src/main/cache/cache-service.ts`
- Test: `tests/cache-service.test.ts`

- [ ] **Step 1: Write the failing cache-service tests for image miss, image hit, and stale-entry cleanup**

```ts
test('CacheService returns the remote image url immediately and reuses a local file after background persistence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  let fetchCount = 0
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
    fetcher: async () => {
      fetchCount += 1
      return new Response(Buffer.from('image-binary'), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })
    },
  })

  const first = await service.resolveImageSource({
    cacheKey: 'artist:detail:hero:12',
    sourceUrl: 'https://img.example.com/artist-12.jpg',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  assert.equal(first.fromCache, false)
  assert.equal(first.url, 'https://img.example.com/artist-12.jpg')
  assert.equal(fetchCount, 1)

  await new Promise(resolve => setTimeout(resolve, 0))

  const second = await service.resolveImageSource({
    cacheKey: 'artist:detail:hero:12',
    sourceUrl: 'https://img.example.com/artist-12.jpg',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  assert.equal(second.fromCache, true)
  assert.ok(second.url.startsWith('file:///'))
  assert.equal(fetchCount, 1)

  await rm(root, { recursive: true, force: true })
})

test('CacheService removes stale image entries and falls back to the remote image url', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-cache-test-'))
  const service = new CacheService({
    defaultRootDir: root,
    now: createNowSequence(),
    fetcher: async () =>
      new Response(Buffer.from('fresh-image'), {
        status: 200,
        headers: { 'content-type': 'image/webp' },
      }),
  })

  await service.resolveImageSource({
    cacheKey: 'artist:detail:album:88',
    sourceUrl: 'https://img.example.com/albums/88',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  await new Promise(resolve => setTimeout(resolve, 0))
  await rm(path.join(root, 'images'), { recursive: true, force: true })

  const resolved = await service.resolveImageSource({
    cacheKey: 'artist:detail:album:88',
    sourceUrl: 'https://img.example.com/albums/88',
    enabled: true,
    cacheDir: '',
    maxBytes: MB,
  })

  assert.equal(resolved.fromCache, false)
  assert.equal(resolved.url, 'https://img.example.com/albums/88')

  await rm(root, { recursive: true, force: true })
})
```

- [ ] **Step 2: Run the cache-service test file to verify the new image tests fail first**

Run: `node --test tests/cache-service.test.ts`
Expected: FAIL with a message similar to `service.resolveImageSource is not a function` or a TypeScript import/type failure because image cache contracts do not exist yet.

- [ ] **Step 3: Implement the image cache contracts and non-blocking image persistence**

```ts
// src/main/cache/cache-types.ts
export type CacheEntryType = 'audio' | 'lyrics' | 'image'

export type ResolveImageSourceParams = CacheRuntimeConfig & {
  cacheKey: string
  sourceUrl: string
}

export type ResolveImageSourceResult = {
  url: string
  fromCache: boolean
}
```

```ts
// src/main/cache/cache-service.ts
const IMAGE_DIR_NAME = 'images'

type CacheLayout = {
  rootDir: string
  audioDir: string
  lyricsDir: string
  imageDir: string
  indexFilePath: string
}

function isKnownEntryType(value: unknown): value is CacheEntryType {
  return value === 'audio' || value === 'lyrics' || value === 'image'
}

function getImageContentTypeExtension(contentType: string | null) {
  if (!contentType) {
    return '.bin'
  }

  if (contentType.includes('image/jpeg')) {
    return '.jpg'
  }
  if (contentType.includes('image/png')) {
    return '.png'
  }
  if (contentType.includes('image/webp')) {
    return '.webp'
  }
  if (contentType.includes('image/avif')) {
    return '.avif'
  }
  if (contentType.includes('image/gif')) {
    return '.gif'
  }

  return '.bin'
}

export class CacheService {
  private readonly inFlightImageWrites = new Map<string, Promise<void>>()

  async resolveImageSource(
    params: ResolveImageSourceParams
  ): Promise<ResolveImageSourceResult> {
    if (!params.enabled) {
      return { url: params.sourceUrl, fromCache: false }
    }

    const layout = await this.ensureLayout(params.cacheDir)
    const state = await this.loadIndex(layout)
    const id = buildCacheId('image', params.cacheKey)
    const cachedEntry = state.entries.get(id)

    if (cachedEntry) {
      const absolutePath = this.toAbsolutePath(
        layout.rootDir,
        cachedEntry.relativePath
      )
      if (await fileExists(absolutePath)) {
        cachedEntry.lastAccessed = this.now()
        await this.saveIndex(layout, state)
        return { url: pathToFileURL(absolutePath).href, fromCache: true }
      }

      state.entries.delete(id)
      await this.saveIndex(layout, state)
    }

    this.queueImagePersistence(layout, state, id, params)
    return { url: params.sourceUrl, fromCache: false }
  }

  private queueImagePersistence(
    layout: CacheLayout,
    state: CacheIndexState,
    id: string,
    params: ResolveImageSourceParams
  ) {
    if (this.inFlightImageWrites.has(id)) {
      return
    }

    const writePromise = this.persistImageEntry(layout, state, id, params)
      .catch(() => undefined)
      .finally(() => {
        this.inFlightImageWrites.delete(id)
      })

    this.inFlightImageWrites.set(id, writePromise)
  }

  private async persistImageEntry(
    layout: CacheLayout,
    state: CacheIndexState,
    id: string,
    params: ResolveImageSourceParams
  ) {
    const response = await this.fetcher(params.sourceUrl)
    if (!response.ok) {
      return
    }

    const bytes = Buffer.from(await response.arrayBuffer())
    const urlExt = getUrlExtension(params.sourceUrl)
    const contentExt = getImageContentTypeExtension(
      response.headers.get('content-type')
    )
    const extension = urlExt !== '.bin' ? urlExt : contentExt
    const relativePath = `${IMAGE_DIR_NAME}/${id}${extension}`
    const absolutePath = this.toAbsolutePath(layout.rootDir, relativePath)

    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, bytes)

    const timestamp = this.now()
    state.entries.set(id, {
      id,
      key: params.cacheKey,
      type: 'image',
      relativePath,
      size: bytes.byteLength,
      createdAt: timestamp,
      lastAccessed: timestamp,
    })

    await this.evictIfNeeded(layout, state, params.maxBytes)
    await this.saveIndex(layout, state)
  }
}
```

```ts
// src/main/cache/cache-service.ts ensureLayout + clear changes
const imageDir = path.join(rootDir, IMAGE_DIR_NAME)

await Promise.all([
  fs.mkdir(audioDir, { recursive: true }),
  fs.mkdir(lyricsDir, { recursive: true }),
  fs.mkdir(imageDir, { recursive: true }),
])

await Promise.all([
  fs.rm(layout.audioDir, { recursive: true, force: true }),
  fs.rm(layout.lyricsDir, { recursive: true, force: true }),
  fs.rm(layout.imageDir, { recursive: true, force: true }),
  fs.rm(layout.indexFilePath, { force: true }),
])
```

- [ ] **Step 4: Re-run the cache-service tests until the image cache contract passes**

Run: `node --test tests/cache-service.test.ts`
Expected: PASS for the new image cache tests and the pre-existing audio/lyrics cache tests in the same file.

- [ ] **Step 5: Commit the cache-service image support**

```bash
git add tests/cache-service.test.ts src/main/cache/cache-types.ts src/main/cache/cache-service.ts
git commit -m "feat: add image support to cache service"
```

### Task 2: Wire Image Cache Through Shared IPC And Preload

**Files:**

- Modify: `src/shared/ipc/cache.ts`
- Modify: `src/main/ipc/cache-ipc.ts`
- Modify: `src/preload/api/cache-api.ts`
- Modify: `tests/cache-ipc.test.ts`
- Modify: `tests/shared-ipc-channels.test.ts`

- [ ] **Step 1: Write the failing IPC contract tests for the new image resolve channel**

```ts
// tests/shared-ipc-channels.test.ts
assert.deepEqual(CACHE_IPC_CHANNELS, {
  GET_DEFAULT_DIRECTORY: 'cache:get-default-directory',
  SELECT_DIRECTORY: 'cache:select-directory',
  GET_STATUS: 'cache:get-status',
  CLEAR: 'cache:clear',
  RESOLVE_AUDIO_SOURCE: 'cache:resolve-audio-source',
  RESOLVE_IMAGE_SOURCE: 'cache:resolve-image-source',
  READ_LYRICS_PAYLOAD: 'cache:read-lyrics-payload',
  WRITE_LYRICS_PAYLOAD: 'cache:write-lyrics-payload',
})
```

```ts
// tests/cache-ipc.test.ts
const cacheService = {
  getDefaultCacheRoot: () => 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
  resolveCacheRoot: (cacheDir?: string) =>
    cacheDir || 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic',
  getStatus: async () => ({
    usedBytes: 0,
    audioCount: 0,
    lyricsCount: 0,
  }),
  clear: async () => undefined,
  resolveAudioSource: async () => ({
    url: 'https://cdn.example.com/song.mp3',
    fromCache: false,
  }),
  resolveImageSource: async () => ({
    url: 'file:///C:/cache/image.webp',
    fromCache: true,
  }),
  readLyricsPayload: async () => null,
  writeLyricsPayload: async () => undefined,
}

assert.deepEqual(
  await handlers.get(CACHE_IPC_CHANNELS.RESOLVE_IMAGE_SOURCE)?.(
    {},
    'artist:detail:hero:7',
    'https://img.example.com/7.jpg'
  ),
  {
    url: 'file:///C:/cache/image.webp',
    fromCache: true,
  }
)
```

- [ ] **Step 2: Run the IPC-focused tests to verify they fail before wiring the new channel**

Run: `node --test tests/shared-ipc-channels.test.ts tests/cache-ipc.test.ts`
Expected: FAIL because `RESOLVE_IMAGE_SOURCE` is missing from the shared channel constants or `createCacheIpc` does not register a matching handler yet.

- [ ] **Step 3: Add the shared channel, main-process handler, and preload API**

```ts
// src/shared/ipc/cache.ts
export const CACHE_IPC_CHANNELS = {
  GET_DEFAULT_DIRECTORY: 'cache:get-default-directory',
  SELECT_DIRECTORY: 'cache:select-directory',
  GET_STATUS: 'cache:get-status',
  CLEAR: 'cache:clear',
  RESOLVE_AUDIO_SOURCE: 'cache:resolve-audio-source',
  RESOLVE_IMAGE_SOURCE: 'cache:resolve-image-source',
  READ_LYRICS_PAYLOAD: 'cache:read-lyrics-payload',
  WRITE_LYRICS_PAYLOAD: 'cache:write-lyrics-payload',
} as const
```

```ts
// src/main/ipc/cache-ipc.ts
type CacheIpcRegistrationOptions = {
  cacheService?: Pick<
    CacheService,
    | 'getDefaultCacheRoot'
    | 'resolveCacheRoot'
    | 'getStatus'
    | 'clear'
    | 'resolveAudioSource'
    | 'resolveImageSource'
    | 'readLyricsPayload'
    | 'writeLyricsPayload'
  >
}

ipcMain.handle(
  CACHE_IPC_CHANNELS.RESOLVE_IMAGE_SOURCE,
  async (_event, cacheKey: string, sourceUrl: string) => {
    return cacheService.resolveImageSource({
      cacheKey,
      sourceUrl,
      enabled: getConfigValue('diskCacheEnabled'),
      cacheDir: getConfigValue('diskCacheDir'),
      maxBytes: getConfigValue('diskCacheMaxBytes'),
    })
  }
)
```

```ts
// src/preload/api/cache-api.ts
import type {
  CacheStatus,
  ResolveAudioSourceResult,
  ResolveImageSourceResult,
} from '../../main/cache/cache-types'

export type CacheApi = {
  resolveAudioSource: (
    cacheKey: string,
    sourceUrl: string
  ) => Promise<ResolveAudioSourceResult>
  resolveImageSource: (
    cacheKey: string,
    sourceUrl: string
  ) => Promise<ResolveImageSourceResult>
}

resolveImageSource: async (cacheKey, sourceUrl) => {
  return ipcRenderer.invoke(
    CACHE_IPC_CHANNELS.RESOLVE_IMAGE_SOURCE,
    cacheKey,
    sourceUrl
  )
},
```

- [ ] **Step 4: Re-run the IPC tests after wiring the new image cache bridge**

Run: `node --test tests/shared-ipc-channels.test.ts tests/cache-ipc.test.ts`
Expected: PASS, with the new channel string snapshot and the image handler returning the mocked result.

- [ ] **Step 5: Commit the IPC and preload bridge changes**

```bash
git add tests/shared-ipc-channels.test.ts tests/cache-ipc.test.ts src/shared/ipc/cache.ts src/main/ipc/cache-ipc.ts src/preload/api/cache-api.ts
git commit -m "feat: expose image cache over ipc"
```

### Task 3: Add The Artist Detail Image Cache Trial

**Files:**

- Create: `src/renderer/pages/Artists/Detail/artist-image-cache.ts`
- Modify: `src/renderer/pages/Artists/Detail/index.tsx`
- Test: `tests/artist-detail-image-cache.test.ts`

- [ ] **Step 1: Write the failing renderer-boundary tests for semantic artist image cache keys and URL replacement**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildArtistHeroImageCacheKey,
  buildArtistSimilarImageCacheKey,
  resolveArtistAlbumImages,
  resolveArtistMvImages,
  resolveArtistProfileImage,
  resolveSimilarArtistImages,
} from '../src/renderer/pages/Artists/Detail/artist-image-cache.ts'

test('artist detail image cache helpers use semantic keys and preserve empty urls', async () => {
  const calls: Array<[string, string]> = []
  const cacheApi = {
    resolveImageSource: async (cacheKey: string, sourceUrl: string) => {
      calls.push([cacheKey, sourceUrl])
      return {
        url: `file:///cache/${calls.length}.webp`,
        fromCache: true,
      }
    },
  }

  assert.equal(buildArtistHeroImageCacheKey(7), 'artist:detail:hero:7')
  assert.equal(
    buildArtistSimilarImageCacheKey(7, 21),
    'artist:detail:similar:7:21'
  )

  const profile = await resolveArtistProfileImage(cacheApi, {
    id: 7,
    name: 'Artist 7',
    coverUrl: 'https://img.example.com/7.jpg',
    musicSize: 10,
    albumSize: 2,
    mvSize: 1,
    identity: 'Singer',
  })

  const similarArtists = await resolveSimilarArtistImages(cacheApi, 7, [
    { id: 21, name: 'Similar 21', picUrl: 'https://img.example.com/21.jpg' },
    { id: 22, name: 'Similar 22', picUrl: '' },
  ])

  const albums = await resolveArtistAlbumImages(cacheApi, [
    { id: 301, name: 'Album 301', picUrl: 'https://img.example.com/301.jpg' },
  ])

  const mvs = await resolveArtistMvImages(cacheApi, [
    { id: 401, name: 'MV 401', coverUrl: 'https://img.example.com/401.jpg' },
  ])

  assert.equal(profile?.coverUrl, 'file:///cache/1.webp')
  assert.equal(similarArtists[0]?.picUrl, 'file:///cache/2.webp')
  assert.equal(similarArtists[1]?.picUrl, '')
  assert.equal(albums[0]?.picUrl, 'file:///cache/3.webp')
  assert.equal(mvs[0]?.coverUrl, 'file:///cache/4.webp')
  assert.deepEqual(calls, [
    ['artist:detail:hero:7', 'https://img.example.com/7.jpg'],
    ['artist:detail:similar:7:21', 'https://img.example.com/21.jpg'],
    ['artist:detail:album:301', 'https://img.example.com/301.jpg'],
    ['artist:detail:mv:401', 'https://img.example.com/401.jpg'],
  ])
})
```

- [ ] **Step 2: Run the artist-detail image helper test to verify it fails before creating the helper module**

Run: `node --test tests/artist-detail-image-cache.test.ts`
Expected: FAIL with `Cannot find module '../src/renderer/pages/Artists/Detail/artist-image-cache.ts'`.

- [ ] **Step 3: Implement the page-local artist image cache helper and integrate it into the artist detail page**

```ts
// src/renderer/pages/Artists/Detail/artist-image-cache.ts
import type { CacheApi } from '@preload/api/cache-api'
import type {
  ArtistAlbumItem,
  ArtistDetailProfile,
  ArtistMvItem,
  ArtistSimilarItem,
} from '../artist-detail.model'

type ImageResolver = Pick<CacheApi, 'resolveImageSource'>

function hasImageUrl(url: string) {
  return typeof url === 'string' && url.trim().length > 0
}

export function buildArtistHeroImageCacheKey(artistId: number) {
  return `artist:detail:hero:${artistId}`
}

export function buildArtistSimilarImageCacheKey(
  artistId: number,
  relatedArtistId: number
) {
  return `artist:detail:similar:${artistId}:${relatedArtistId}`
}

export function buildArtistAlbumImageCacheKey(albumId: number) {
  return `artist:detail:album:${albumId}`
}

export function buildArtistMvImageCacheKey(mvId: number) {
  return `artist:detail:mv:${mvId}`
}

async function resolveImageUrl(
  cacheApi: ImageResolver,
  cacheKey: string,
  sourceUrl: string
) {
  if (!hasImageUrl(sourceUrl)) {
    return sourceUrl
  }

  const result = await cacheApi.resolveImageSource(cacheKey, sourceUrl)
  return result.url
}

export async function resolveArtistProfileImage(
  cacheApi: ImageResolver,
  profile: ArtistDetailProfile | null
) {
  if (!profile) {
    return null
  }

  return {
    ...profile,
    coverUrl: await resolveImageUrl(
      cacheApi,
      buildArtistHeroImageCacheKey(profile.id),
      profile.coverUrl
    ),
  }
}

export async function resolveSimilarArtistImages(
  cacheApi: ImageResolver,
  artistId: number,
  artists: ArtistSimilarItem[]
) {
  return Promise.all(
    artists.map(async artist => ({
      ...artist,
      picUrl: await resolveImageUrl(
        cacheApi,
        buildArtistSimilarImageCacheKey(artistId, artist.id),
        artist.picUrl
      ),
    }))
  )
}

export async function resolveArtistAlbumImages(
  cacheApi: ImageResolver,
  albums: ArtistAlbumItem[]
) {
  return Promise.all(
    albums.map(async album => ({
      ...album,
      picUrl: await resolveImageUrl(
        cacheApi,
        buildArtistAlbumImageCacheKey(album.id),
        album.picUrl
      ),
    }))
  )
}

export async function resolveArtistMvImages(
  cacheApi: ImageResolver,
  mvs: ArtistMvItem[]
) {
  return Promise.all(
    mvs.map(async mv => ({
      ...mv,
      coverUrl: await resolveImageUrl(
        cacheApi,
        buildArtistMvImageCacheKey(mv.id),
        mv.coverUrl
      ),
    }))
  )
}
```

```ts
// src/renderer/pages/Artists/Detail/index.tsx
import {
  resolveArtistAlbumImages,
  resolveArtistMvImages,
  resolveArtistProfileImage,
  resolveSimilarArtistImages,
} from './artist-image-cache'

const fetchAlbumsPage = useCallback(
  async (offset: number, limit: number) => {
    if (!artistId) {
      return { list: [], hasMore: false }
    }

    const response = await getArtistAlbums({ id: artistId, limit, offset })
    const albums = normalizeAlbums(response)
    const resolvedAlbums = await resolveArtistAlbumImages(
      window.electronCache,
      albums
    )

    return {
      list: resolvedAlbums,
      hasMore: albums.length >= limit,
    }
  },
  [artistId]
)

const fetchMvsPage = useCallback(
  async (offset: number, limit: number) => {
    if (!artistId) {
      return { list: [], hasMore: false }
    }

    const response = await getArtistMvs({ id: artistId, limit, offset })
    const mvs = normalizeMvs(response)
    const resolvedMvs = await resolveArtistMvImages(window.electronCache, mvs)

    return {
      list: resolvedMvs,
      hasMore: mvs.length >= limit,
    }
  },
  [artistId]
)

const similarArtists = await resolveSimilarArtistImages(
  window.electronCache,
  artistId,
  normalizeSimilarArtists(response.data)
)

const profile = await resolveArtistProfileImage(
  window.electronCache,
  normalizeArtistProfile(detailResponse)
)
```

- [ ] **Step 4: Run the artist-detail helper test and the existing artist detail model test**

Run: `node --test tests/artist-detail-image-cache.test.ts tests/artist-detail.model.test.ts`
Expected: PASS, proving semantic cache keys and resolved image URL mapping for the artist detail trial.

- [ ] **Step 5: Commit the artist detail trial integration**

```bash
git add tests/artist-detail-image-cache.test.ts src/renderer/pages/Artists/Detail/artist-image-cache.ts src/renderer/pages/Artists/Detail/index.tsx
git commit -m "feat: cache artist detail images"
```

### Task 4: Run Final Verification And Manual Validation

**Files:**

- Modify: `tests/cache-service.test.ts`
- Modify: `tests/cache-ipc.test.ts`
- Modify: `tests/shared-ipc-channels.test.ts`
- Modify: `tests/artist-detail-image-cache.test.ts`
- Modify: `src/main/cache/cache-types.ts`
- Modify: `src/main/cache/cache-service.ts`
- Modify: `src/shared/ipc/cache.ts`
- Modify: `src/main/ipc/cache-ipc.ts`
- Modify: `src/preload/api/cache-api.ts`
- Modify: `src/renderer/pages/Artists/Detail/artist-image-cache.ts`
- Modify: `src/renderer/pages/Artists/Detail/index.tsx`

- [ ] **Step 1: Run the targeted automated verification suite**

Run: `node --test tests/cache-service.test.ts tests/cache-ipc.test.ts tests/shared-ipc-channels.test.ts tests/artist-detail-image-cache.test.ts tests/artist-detail.model.test.ts`
Expected: PASS for all targeted cache, IPC, and artist-detail image tests.

- [ ] **Step 2: Run lint against the full repository**

Run: `pnpm lint`
Expected: PASS, with no new errors introduced by the image cache trial. Existing repository warnings are acceptable only if they are unchanged.

- [ ] **Step 3: Run a manual repeat-visit check on the artist detail page**

Manual steps:

1. Enable disk cache in Settings.
2. Open `/artists/<id>` for an artist that has hero, album, MV, and similar artist images.
3. Let the page settle, then navigate away.
4. Open the same artist page again.
5. Confirm the second visit shows reduced repeated image requests and that cached image URLs appear as local `file:///` paths in DevTools network or component props.

- [ ] **Step 4: Run a failure-path manual check**

Manual steps:

1. Leave disk cache enabled.
2. Use DevTools or a temporary mocked fetch failure to make one of the artist images fail during cache persistence.
3. Re-open the artist detail page.
4. Confirm the page still renders with remote image URLs instead of crashing or showing a broken empty state solely because cache persistence failed.

- [ ] **Step 5: Commit the verified phase-1 feature**

```bash
git add tests/cache-service.test.ts tests/cache-ipc.test.ts tests/shared-ipc-channels.test.ts tests/artist-detail-image-cache.test.ts src/main/cache/cache-types.ts src/main/cache/cache-service.ts src/shared/ipc/cache.ts src/main/ipc/cache-ipc.ts src/preload/api/cache-api.ts src/renderer/pages/Artists/Detail/artist-image-cache.ts src/renderer/pages/Artists/Detail/index.tsx
git commit -m "feat: add artist detail image cache phase 1"
```
