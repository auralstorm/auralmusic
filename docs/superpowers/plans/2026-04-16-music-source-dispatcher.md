# Music Source Dispatcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-coded playback/download source order with a shared music-source policy layer so login state and source configuration control runtime resolution consistently.

**Architecture:** Add a shared `src/shared/music-source` policy module that converts config plus auth state into resolver order and builtin platform order. Keep playback and download as separate orchestrators that consume the same policy while wrapping existing official and LX integrations behind focused provider helpers.

**Tech Stack:** Electron, React, Zustand, TypeScript, Node `node:test`, existing renderer API modules, existing main-process download service, existing LX music-source runner.

---

## File Structure

**Create**

- `src/shared/music-source/types.ts`
  Shared resolver ids, builtin platform ids, context shape, and policy output.
- `src/shared/music-source/builtin-platforms.ts`
  Normalize `musicSourceProviders` into ordered builtin platform ids.
- `src/shared/music-source/policy.ts`
  Build resolver order from config, login state, and scene.
- `src/renderer/services/music-source/providers/official-playback-provider.ts`
  Official playback URL resolution.
- `src/renderer/services/music-source/providers/builtin-unblock-playback-provider.ts`
  Phase-1 builtin unblock playback wrapper.
- `src/renderer/services/music-source/providers/lx-playback-provider.ts`
  Adapter over the existing LX playback resolver.
- `src/renderer/services/music-source/providers/custom-api-playback-provider.ts`
  Phase-1 null-return playback provider.
- `src/renderer/services/music-source/playback-source-resolver.ts`
  Playback resolver orchestrator that uses shared policy.
- `src/renderer/services/download/providers/official-download-provider.ts`
  Official download URL resolution.
- `src/renderer/services/download/providers/builtin-unblock-download-provider.ts`
  Phase-1 builtin unblock download wrapper.
- `src/renderer/services/download/providers/lx-download-provider.ts`
  Adapter over the existing LX resolver for download use.
- `src/renderer/services/download/providers/custom-api-download-provider.ts`
  Phase-1 null-return download provider.
- `tests/music-source-policy.test.ts`
  Shared policy and builtin platform normalization tests.
- `tests/playback-source-resolver.test.ts`
  Playback source orchestration tests.
- `tests/main-download-source-resolver.test.ts`
  Main-process fallback policy tests.

**Modify**

- `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`
  Replace inline online resolution order with `resolvePlaybackSource()`.
- `src/renderer/services/download/download-source-resolver.ts`
  Replace hard-coded order with shared policy and provider helpers.
- `src/main/download/download-source-resolver.ts`
  Replace hard-coded official order with shared policy and provider-aware attempts.
- `src/main/download/download-service.ts`
  Expose additional source-policy config values to the main-process resolver.
- `src/main/ipc/download-ipc.ts`
  Pass music-source config fields into `DownloadService.readConfig()`.
- `src/main/download/download-types.ts`
  Expand source-provider identifiers to include `builtin-unblock` and `custom-api`.
- `tests/download-source-resolver.test.ts`
  Update renderer download resolution tests to assert policy-driven order.
- `tests/download-service.test.ts`
  Update expectations for main-process fallback ordering when unauthenticated.

**Check but do not modify unless needed**

- `src/main/config/types.ts`
  Reuse existing config keys; do not rename persisted fields in phase 1.
- `src/renderer/stores/config-store.ts`
  Reuse current config hydration; shared policy should filter mixed provider arrays safely.
- `src/renderer/stores/auth-store.ts`
  Reuse `loginStatus` and hydrated session shape to derive authentication state.
- `src/renderer/services/music-source/lx-playback-resolver.ts`
  Reuse current LX resolver behavior behind provider wrappers.

### Task 1: Add Shared Music-Source Policy Contracts

**Files:**

- Create: `src/shared/music-source/types.ts`
- Create: `src/shared/music-source/builtin-platforms.ts`
- Create: `src/shared/music-source/policy.ts`
- Test: `tests/music-source-policy.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeBuiltinPlatforms } from '../src/shared/music-source/builtin-platforms.ts'
import { buildResolverPolicy } from '../src/shared/music-source/policy.ts'
import type { ResolveContext } from '../src/shared/music-source/types.ts'

function createContext(
  overrides: Partial<ResolveContext> = {}
): ResolveContext {
  return {
    scene: 'playback',
    isAuthenticated: false,
    config: {
      musicSourceEnabled: true,
      musicSourceProviders: ['pyncmd', 'migu', 'lxMusic', 'pyncmd'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: true,
      customMusicApiUrl: 'https://api.example.com',
    },
    ...overrides,
  }
}

test('normalizeBuiltinPlatforms filters invalid values and preserves order', () => {
  assert.deepEqual(
    normalizeBuiltinPlatforms([
      'pyncmd',
      'invalid',
      'migu',
      'pyncmd',
      'lxMusic',
    ]),
    ['pyncmd', 'migu']
  )
})

test('buildResolverPolicy prefers third-party families before official when unauthenticated', () => {
  const policy = buildResolverPolicy(createContext())

  assert.deepEqual(policy.resolverOrder, [
    'builtinUnblock',
    'lxMusic',
    'customApi',
    'official',
  ])
  assert.deepEqual(policy.builtinPlatforms, ['pyncmd', 'migu'])
})

test('buildResolverPolicy keeps official first when authenticated', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: true,
      scene: 'download',
    })
  )

  assert.deepEqual(policy.resolverOrder, [
    'official',
    'builtinUnblock',
    'lxMusic',
    'customApi',
  ])
})

test('buildResolverPolicy falls back to official only when third-party resolution is disabled', () => {
  const policy = buildResolverPolicy(
    createContext({
      config: {
        musicSourceEnabled: false,
        musicSourceProviders: ['migu'],
        luoxueSourceEnabled: true,
        customMusicApiEnabled: true,
        customMusicApiUrl: 'https://api.example.com',
      },
    })
  )

  assert.deepEqual(policy.resolverOrder, ['official'])
  assert.deepEqual(policy.builtinPlatforms, ['migu'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/music-source-policy.test.ts`  
Expected: FAIL with module-not-found errors for the new shared policy files.

- [ ] **Step 3: Write the minimal implementation**

`src/shared/music-source/types.ts`

```ts
import type { AppConfig } from '../../main/config/types.ts'

export type ResolveScene = 'playback' | 'download'

export type MusicResolverId =
  | 'official'
  | 'builtinUnblock'
  | 'lxMusic'
  | 'customApi'

export type BuiltinPlatformId = 'migu' | 'kugou' | 'pyncmd' | 'bilibili'

export type ResolveContext = {
  scene: ResolveScene
  isAuthenticated: boolean
  config: Pick<
    AppConfig,
    | 'musicSourceEnabled'
    | 'musicSourceProviders'
    | 'luoxueSourceEnabled'
    | 'customMusicApiEnabled'
    | 'customMusicApiUrl'
  > & {
    quality?: AppConfig['quality']
  }
}

export type ResolverPolicy = {
  resolverOrder: MusicResolverId[]
  builtinPlatforms: BuiltinPlatformId[]
}
```

`src/shared/music-source/builtin-platforms.ts`

```ts
import type { BuiltinPlatformId } from './types.ts'

const BUILTIN_PLATFORM_SET = new Set<BuiltinPlatformId>([
  'migu',
  'kugou',
  'pyncmd',
  'bilibili',
])

export function normalizeBuiltinPlatforms(
  providers: readonly string[] | null | undefined
): BuiltinPlatformId[] {
  if (!providers?.length) {
    return []
  }

  const result: BuiltinPlatformId[] = []
  const seen = new Set<BuiltinPlatformId>()

  for (const provider of providers) {
    if (!BUILTIN_PLATFORM_SET.has(provider as BuiltinPlatformId)) {
      continue
    }

    const nextProvider = provider as BuiltinPlatformId
    if (seen.has(nextProvider)) {
      continue
    }

    seen.add(nextProvider)
    result.push(nextProvider)
  }

  return result
}
```

`src/shared/music-source/policy.ts`

```ts
import { normalizeBuiltinPlatforms } from './builtin-platforms.ts'
import type {
  MusicResolverId,
  ResolveContext,
  ResolverPolicy,
} from './types.ts'

function compactResolvers(
  values: Array<MusicResolverId | null>
): MusicResolverId[] {
  const result: MusicResolverId[] = []
  const seen = new Set<MusicResolverId>()

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue
    }

    seen.add(value)
    result.push(value)
  }

  return result
}

export function buildResolverPolicy(context: ResolveContext): ResolverPolicy {
  const builtinPlatforms = normalizeBuiltinPlatforms(
    context.config.musicSourceProviders
  )

  const builtinEnabled =
    context.config.musicSourceEnabled && builtinPlatforms.length > 0
  const lxEnabled =
    context.config.musicSourceEnabled && context.config.luoxueSourceEnabled
  const customApiEnabled =
    context.config.musicSourceEnabled &&
    context.config.customMusicApiEnabled &&
    Boolean(context.config.customMusicApiUrl.trim())

  const resolverOrder = context.isAuthenticated
    ? compactResolvers([
        'official',
        builtinEnabled ? 'builtinUnblock' : null,
        lxEnabled ? 'lxMusic' : null,
        customApiEnabled ? 'customApi' : null,
      ])
    : compactResolvers([
        builtinEnabled ? 'builtinUnblock' : null,
        lxEnabled ? 'lxMusic' : null,
        customApiEnabled ? 'customApi' : null,
        'official',
      ])

  return {
    resolverOrder,
    builtinPlatforms,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/music-source-policy.test.ts`  
Expected: PASS with 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add tests/music-source-policy.test.ts src/shared/music-source/types.ts src/shared/music-source/builtin-platforms.ts src/shared/music-source/policy.ts
git commit -m "refactor: add music source policy contracts"
```

### Task 2: Move Playback Resolution Behind a Policy-Driven Orchestrator

**Files:**

- Create: `src/renderer/services/music-source/providers/official-playback-provider.ts`
- Create: `src/renderer/services/music-source/providers/builtin-unblock-playback-provider.ts`
- Create: `src/renderer/services/music-source/providers/lx-playback-provider.ts`
- Create: `src/renderer/services/music-source/providers/custom-api-playback-provider.ts`
- Create: `src/renderer/services/music-source/playback-source-resolver.ts`
- Modify: `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`
- Test: `tests/playback-source-resolver.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { createPlaybackSourceResolver } from '../src/renderer/services/music-source/playback-source-resolver.ts'
import type { PlaybackTrack } from '../src/shared/playback.ts'

const track: PlaybackTrack = {
  id: 1,
  name: 'Song',
  artistNames: 'Artist',
  albumName: 'Album',
  coverUrl: '',
  duration: 180000,
}

test('createPlaybackSourceResolver tries builtin and LX before official when unauthenticated', async () => {
  const calls: string[] = []
  const resolvePlaybackSource = createPlaybackSourceResolver({
    getContext: () => ({
      scene: 'playback',
      isAuthenticated: false,
      config: {
        musicSourceEnabled: true,
        musicSourceProviders: ['migu'],
        luoxueSourceEnabled: true,
        customMusicApiEnabled: false,
        customMusicApiUrl: '',
      },
    }),
    officialProvider: async () => {
      calls.push('official')
      return {
        url: 'https://cdn.example.com/official.mp3',
        resolver: 'official',
      }
    },
    builtinUnblockProvider: async () => {
      calls.push('builtin')
      return null
    },
    lxProvider: async () => {
      calls.push('lx')
      return { url: 'https://cdn.example.com/lx.flac', resolver: 'lxMusic' }
    },
    customApiProvider: async () => {
      calls.push('custom')
      return null
    },
  })

  const result = await resolvePlaybackSource(track)

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/lx.flac',
    resolver: 'lxMusic',
  })
  assert.deepEqual(calls, ['builtin', 'lx'])
})

test('createPlaybackSourceResolver stops after official succeeds for authenticated users', async () => {
  const calls: string[] = []
  const resolvePlaybackSource = createPlaybackSourceResolver({
    getContext: () => ({
      scene: 'playback',
      isAuthenticated: true,
      config: {
        musicSourceEnabled: true,
        musicSourceProviders: ['migu'],
        luoxueSourceEnabled: true,
        customMusicApiEnabled: false,
        customMusicApiUrl: '',
      },
    }),
    officialProvider: async () => {
      calls.push('official')
      return {
        url: 'https://cdn.example.com/official.mp3',
        resolver: 'official',
      }
    },
    builtinUnblockProvider: async () => {
      calls.push('builtin')
      return null
    },
    lxProvider: async () => {
      calls.push('lx')
      return null
    },
    customApiProvider: async () => {
      calls.push('custom')
      return null
    },
  })

  const result = await resolvePlaybackSource(track)

  assert.deepEqual(result, {
    url: 'https://cdn.example.com/official.mp3',
    resolver: 'official',
  })
  assert.deepEqual(calls, ['official'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/playback-source-resolver.test.ts`  
Expected: FAIL with module-not-found or missing export errors for `createPlaybackSourceResolver`.

- [ ] **Step 3: Write the minimal implementation**

`src/renderer/services/music-source/playback-source-resolver.ts`

```ts
import { useAuthStore } from '@/stores/auth-store'
import { useConfigStore } from '@/stores/config-store'
import type { PlaybackTrack } from '../../../shared/playback.ts'
import { buildResolverPolicy } from '../../../shared/music-source/policy.ts'
import type {
  MusicResolverId,
  ResolveContext,
} from '../../../shared/music-source/types.ts'
import { resolveOfficialPlaybackSource } from './providers/official-playback-provider.ts'
import { resolveBuiltinUnblockPlaybackSource } from './providers/builtin-unblock-playback-provider.ts'
import { resolveLxPlaybackSource } from './providers/lx-playback-provider.ts'
import { resolveCustomApiPlaybackSource } from './providers/custom-api-playback-provider.ts'

type PlaybackSourceResult = {
  url: string
  resolver: MusicResolverId
}

type PlaybackProvider = (
  track: PlaybackTrack,
  context: ResolveContext
) => Promise<PlaybackSourceResult | null>

type PlaybackSourceResolverDeps = {
  getContext?: () => ResolveContext
  officialProvider?: PlaybackProvider
  builtinUnblockProvider?: PlaybackProvider
  lxProvider?: PlaybackProvider
  customApiProvider?: PlaybackProvider
}

function getDefaultContext(): ResolveContext {
  const authState = useAuthStore.getState()
  const config = useConfigStore.getState().config

  return {
    scene: 'playback',
    isAuthenticated: authState.loginStatus === 'authenticated',
    config,
  }
}

export function createPlaybackSourceResolver(
  deps: PlaybackSourceResolverDeps = {}
) {
  const providers: Record<MusicResolverId, PlaybackProvider> = {
    official: deps.officialProvider ?? resolveOfficialPlaybackSource,
    builtinUnblock:
      deps.builtinUnblockProvider ?? resolveBuiltinUnblockPlaybackSource,
    lxMusic: deps.lxProvider ?? resolveLxPlaybackSource,
    customApi: deps.customApiProvider ?? resolveCustomApiPlaybackSource,
  }

  return async function resolvePlaybackSource(
    track: PlaybackTrack
  ): Promise<PlaybackSourceResult | null> {
    const context = deps.getContext ? deps.getContext() : getDefaultContext()
    const policy = buildResolverPolicy(context)

    for (const resolverId of policy.resolverOrder) {
      const result = await providers[resolverId](track, context)
      if (result?.url) {
        return result
      }
    }

    return null
  }
}
```

`src/renderer/services/music-source/providers/official-playback-provider.ts`

```ts
import { getSongUrlV1 } from '@/api/list'
import type { PlaybackTrack } from '../../../../shared/playback.ts'
import { normalizeSongUrlV1Response } from '../../../../shared/playback.ts'
import type { ResolveContext } from '../../../../shared/music-source/types.ts'

export async function resolveOfficialPlaybackSource(
  track: PlaybackTrack,
  context: ResolveContext
) {
  const response = await getSongUrlV1({
    id: track.id,
    level: context.config.quality ?? 'higher',
    unblock: false,
  } as never)
  const result = normalizeSongUrlV1Response(response.data)

  return result?.url ? { url: result.url, resolver: 'official' as const } : null
}
```

`src/renderer/services/music-source/providers/builtin-unblock-playback-provider.ts`

```ts
import { getSongUrlV1 } from '@/api/list'
import type { PlaybackTrack } from '../../../../shared/playback.ts'
import { normalizeSongUrlV1Response } from '../../../../shared/playback.ts'
import { buildResolverPolicy } from '../../../../shared/music-source/policy.ts'
import type { ResolveContext } from '../../../../shared/music-source/types.ts'

export async function resolveBuiltinUnblockPlaybackSource(
  track: PlaybackTrack,
  context: ResolveContext
) {
  const policy = buildResolverPolicy(context)
  if (!policy.builtinPlatforms.length) {
    return null
  }

  const response = await getSongUrlV1({
    id: track.id,
    level: context.config.quality ?? 'higher',
    unblock: true,
  } as never)
  const result = normalizeSongUrlV1Response(response.data)

  return result?.url
    ? { url: result.url, resolver: 'builtinUnblock' as const }
    : null
}
```

`src/renderer/services/music-source/providers/lx-playback-provider.ts`

```ts
import { resolveTrackWithLxMusicSource } from '../lx-playback-resolver.ts'
import type { PlaybackTrack } from '../../../../shared/playback.ts'
import type { ResolveContext } from '../../../../shared/music-source/types.ts'

export async function resolveLxPlaybackSource(
  track: PlaybackTrack,
  context: ResolveContext
) {
  const result = await resolveTrackWithLxMusicSource({
    track,
    quality: context.config.quality ?? 'higher',
    config: context.config as never,
  })

  return result?.url ? { url: result.url, resolver: 'lxMusic' as const } : null
}
```

`src/renderer/services/music-source/providers/custom-api-playback-provider.ts`

```ts
import type { PlaybackTrack } from '../../../../shared/playback.ts'
import type { ResolveContext } from '../../../../shared/music-source/types.ts'

export async function resolveCustomApiPlaybackSource(
  _track: PlaybackTrack,
  _context: ResolveContext
) {
  return null
}
```

Update `PlaybackEngine.tsx` to replace the inline online-resolution block with:

```ts
import { createPlaybackSourceResolver } from '@/services/music-source/playback-source-resolver'

const resolvePlaybackSource = createPlaybackSourceResolver()

if (!result && !localSourceUrl) {
  const resolvedSource = await resolvePlaybackSource(currentTrack)
  if (resolvedSource?.url) {
    result = {
      id: currentTrack.id,
      url: resolvedSource.url,
      time: currentTrack.duration,
      br: 0,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/music-source-policy.test.ts tests/playback-source-resolver.test.ts`  
Expected: PASS with the new playback-source tests and no regressions in policy tests.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/PlaybackControl/PlaybackEngine.tsx src/renderer/services/music-source/providers/official-playback-provider.ts src/renderer/services/music-source/providers/builtin-unblock-playback-provider.ts src/renderer/services/music-source/providers/lx-playback-provider.ts src/renderer/services/music-source/providers/custom-api-playback-provider.ts src/renderer/services/music-source/playback-source-resolver.ts tests/playback-source-resolver.test.ts
git commit -m "refactor: route playback source resolution through dispatcher"
```

### Task 3: Refactor Renderer Download Resolution to Use Shared Policy

**Files:**

- Create: `src/renderer/services/download/providers/official-download-provider.ts`
- Create: `src/renderer/services/download/providers/builtin-unblock-download-provider.ts`
- Create: `src/renderer/services/download/providers/lx-download-provider.ts`
- Create: `src/renderer/services/download/providers/custom-api-download-provider.ts`
- Modify: `src/renderer/services/download/download-source-resolver.ts`
- Modify: `src/main/download/download-types.ts`
- Test: `tests/download-source-resolver.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these cases to `tests/download-source-resolver.test.ts`:

```ts
test('createDownloadSourceResolver prefers builtin unblock before official when unauthenticated', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: true,
      musicSourceProviders: ['migu'],
      luoxueSourceEnabled: false,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      activeLuoxueMusicSourceScriptId: null,
      luoxueMusicSourceScripts: [],
    }),
    getIsAuthenticated: () => false,
    getSongDownloadUrlV1: async () => {
      calls.push('official-download')
      return {
        data: { data: { url: 'https://cdn.example.com/official.flac' } },
      }
    },
    getSongUrlV1: async params => {
      calls.push(`song-url:${params.unblock}`)
      return {
        data: {
          data: [
            {
              id: 1,
              url: params.unblock ? 'https://cdn.example.com/unblock.mp3' : '',
            },
          ],
        },
      }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
  })

  const result = await resolveDownloadSource({
    track: {
      id: 1,
      name: 'Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'strict',
  })

  assert.equal(result?.provider, 'builtin-unblock')
  assert.deepEqual(calls, ['song-url:true'])
})

test('createDownloadSourceResolver falls through to official when third-party families fail', async () => {
  const calls: string[] = []

  const resolveDownloadSource = createDownloadSourceResolver({
    getConfig: () => ({
      quality: 'higher',
      musicSourceEnabled: true,
      musicSourceProviders: ['migu'],
      luoxueSourceEnabled: true,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      activeLuoxueMusicSourceScriptId: 'script-1',
      luoxueMusicSourceScripts: [{ id: 'script-1' }] as never,
    }),
    getIsAuthenticated: () => false,
    getSongDownloadUrlV1: async () => {
      calls.push('official-download')
      return {
        data: { data: { url: 'https://cdn.example.com/official.flac' } },
      }
    },
    getSongUrlV1: async () => {
      calls.push('song-url:true')
      return { data: { data: [{ id: 1, url: '' }] } }
    },
    resolveTrackWithLxMusicSource: async () => {
      calls.push('lx')
      return null
    },
  })

  const result = await resolveDownloadSource({
    track: {
      id: 1,
      name: 'Song',
      artistNames: 'Artist',
      albumName: 'Album',
      coverUrl: '',
      duration: 180000,
    },
    requestedQuality: 'higher',
    policy: 'strict',
  })

  assert.equal(result?.provider, 'official-download')
  assert.deepEqual(calls, ['song-url:true', 'lx', 'official-download'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/download-source-resolver.test.ts`  
Expected: FAIL because the current resolver still tries official download before policy-selected providers.

- [ ] **Step 3: Write the minimal implementation**

First extend `src/main/download/download-types.ts`:

```ts
export type DownloadSourceProvider =
  | 'official-download'
  | 'official-playback'
  | 'builtin-unblock'
  | 'lxMusic'
  | 'custom-api'
```

Then refactor `src/renderer/services/download/download-source-resolver.ts` around shared policy:

```ts
import { useAuthStore } from '@/stores/auth-store'
import { buildResolverPolicy } from '../../../shared/music-source/policy.ts'
import type {
  MusicResolverId,
  ResolveContext,
} from '../../../shared/music-source/types.ts'
import { resolveOfficialDownloadSource } from './providers/official-download-provider.ts'
import { resolveBuiltinUnblockDownloadSource } from './providers/builtin-unblock-download-provider.ts'
import { resolveLxDownloadSource } from './providers/lx-download-provider.ts'
import { resolveCustomApiDownloadSource } from './providers/custom-api-download-provider.ts'

export type DownloadSourceResolverDeps = {
  getSongUrlV1?: GetSongUrlV1
  getSongDownloadUrlV1?: GetSongDownloadUrlV1
  resolveTrackWithLxMusicSource?: typeof resolveTrackWithLxMusicSource
  getConfig?: () => AppConfig
  getIsAuthenticated?: () => boolean
  loadSongApiListModule?: () => Promise<DownloadSourceApiListModule>
}

function getDefaultIsAuthenticated() {
  return useAuthStore.getState().loginStatus === 'authenticated'
}

const providers: Record<
  MusicResolverId,
  (options: {
    track: ResolveDownloadSourceOptions['track']
    quality: AudioQualityLevel
    context: ResolveContext
    deps: DownloadSourceResolverDeps
  }) => Promise<ResolvedDownloadSource | null>
> = {
  official: resolveOfficialDownloadSource,
  builtinUnblock: resolveBuiltinUnblockDownloadSource,
  lxMusic: resolveLxDownloadSource,
  customApi: resolveCustomApiDownloadSource,
}

const getIsAuthenticated = deps.getIsAuthenticated ?? getDefaultIsAuthenticated

const context: ResolveContext = {
  scene: 'download',
  isAuthenticated: getIsAuthenticated(),
  config,
}
const resolverPolicy = buildResolverPolicy(context)

for (const level of levels) {
  for (const resolverId of resolverPolicy.resolverOrder) {
    const result = await providers[resolverId]({
      track: options.track,
      quality: level,
      context,
      deps,
    })

    if (result?.url) {
      return result
    }
  }
}
```

Provider snippets:

`src/renderer/services/download/providers/official-download-provider.ts`

```ts
export async function resolveOfficialDownloadSource({ track, quality, deps }) {
  const getSongDownloadUrl =
    deps.getSongDownloadUrlV1 ??
    (await getDefaultSongDownloadUrlV1(
      deps.loadSongApiListModule ?? loadDefaultSongApiListModule
    ))
  const response = await getSongDownloadUrl({ id: track.id, level: quality })
  const officialDownload = readOfficialDownloadUrl(response.data)

  return officialDownload
    ? {
        url: officialDownload.url,
        quality,
        provider: 'official-download',
        fileExtension: officialDownload.fileExtension,
      }
    : null
}
```

`src/renderer/services/download/providers/builtin-unblock-download-provider.ts`

```ts
export async function resolveBuiltinUnblockDownloadSource({
  track,
  quality,
  context,
  deps,
}) {
  const policy = buildResolverPolicy(context)
  if (!policy.builtinPlatforms.length) {
    return null
  }

  const getSongUrl =
    deps.getSongUrlV1 ??
    (await getDefaultSongUrlV1(
      deps.loadSongApiListModule ?? loadDefaultSongApiListModule
    ))
  const response = await getSongUrl({
    id: track.id,
    level: quality,
    unblock: true,
  })
  const playback = normalizeSongUrlV1Response(response.data)

  return playback?.url
    ? {
        url: playback.url,
        quality,
        provider: 'builtin-unblock',
        fileExtension: inferFileExtensionFromUrl(playback.url),
      }
    : null
}
```

`src/renderer/services/download/providers/lx-download-provider.ts`

```ts
export async function resolveLxDownloadSource({
  track,
  quality,
  context,
  deps,
}) {
  const resolver =
    deps.resolveTrackWithLxMusicSource ?? resolveTrackWithLxMusicSource
  const result = await resolver({
    track,
    quality,
    config: context.config as never,
  })

  return result?.url
    ? {
        url: result.url,
        quality,
        provider: 'lxMusic',
        fileExtension: inferFileExtensionFromUrl(result.url),
      }
    : null
}
```

`src/renderer/services/download/providers/custom-api-download-provider.ts`

```ts
export async function resolveCustomApiDownloadSource() {
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/music-source-policy.test.ts tests/download-source-resolver.test.ts`  
Expected: PASS with updated download provider expectations including `'builtin-unblock'`.

- [ ] **Step 5: Commit**

```bash
git add src/main/download/download-types.ts src/renderer/services/download/download-source-resolver.ts src/renderer/services/download/providers/official-download-provider.ts src/renderer/services/download/providers/builtin-unblock-download-provider.ts src/renderer/services/download/providers/lx-download-provider.ts src/renderer/services/download/providers/custom-api-download-provider.ts tests/download-source-resolver.test.ts
git commit -m "refactor: apply shared policy to renderer downloads"
```

### Task 4: Align Main-Process Download Fallback With Shared Policy

**Files:**

- Modify: `src/main/download/download-source-resolver.ts`
- Modify: `src/main/download/download-service.ts`
- Modify: `src/main/ipc/download-ipc.ts`
- Test: `tests/main-download-source-resolver.test.ts`
- Modify: `tests/download-service.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/main-download-source-resolver.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { createDownloadSourceResolver } from '../src/main/download/download-source-resolver.ts'

test('main download fallback tries builtin-unblock before official playback when unauthenticated', async () => {
  const attemptedUrls: string[] = []
  const resolveDownloadSource = createDownloadSourceResolver({
    readBaseUrl: () => 'https://music.example.com',
    getAuthSession: () => null,
    fetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedUrls.push(url)

      if (url.includes('/song/url/v1') && url.includes('unblock=true')) {
        return Response.json({
          data: [{ id: 1, url: 'https://cdn.example.com/unblock.mp3' }],
        })
      }

      if (url.includes('/song/download/url/v1')) {
        return Response.json({
          data: { url: 'https://cdn.example.com/official.flac' },
        })
      }

      return Response.json({ data: [{ id: 1, url: '' }] })
    },
  })

  const result = await resolveDownloadSource({
    payload: {
      songId: '1',
      songName: 'Song',
      artistName: 'Artist',
      requestedQuality: 'higher',
    },
    quality: 'higher',
    runtimeConfig: {
      musicSourceEnabled: true,
      musicSourceProviders: ['migu'],
      luoxueSourceEnabled: false,
      customMusicApiEnabled: false,
      customMusicApiUrl: '',
      downloadDir: '',
      downloadQuality: 'higher',
      downloadQualityPolicy: 'fallback',
      downloadSkipExisting: true,
      downloadConcurrency: 3,
      downloadFileNamePattern: 'song-artist',
      downloadEmbedCover: true,
      downloadEmbedLyrics: true,
      downloadEmbedTranslatedLyrics: false,
    },
  })

  assert.equal(result?.url, 'https://cdn.example.com/unblock.mp3')
  assert.deepEqual(attemptedUrls, [
    'https://music.example.com/song/url/v1?id=1&level=higher&unblock=true',
  ])
})
```

Update `tests/download-service.test.ts` expected unauthenticated request order:

```ts
assert.deepEqual(
  attemptedUrls.filter(
    url => url.includes('/song/download/url/v1') || url.includes('/song/url/v1')
  ),
  ['https://music.example.com/song/url/v1?id=1&level=higher&unblock=true']
)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/main-download-source-resolver.test.ts tests/download-service.test.ts`  
Expected: FAIL because the current main resolver still hits `/song/download/url/v1` before policy-selected builtin unblock.

- [ ] **Step 3: Write the minimal implementation**

Update `src/main/download/download-source-resolver.ts`:

```ts
import { buildResolverPolicy } from '../../shared/music-source/policy.ts'
import type { ResolveContext } from '../../shared/music-source/types.ts'

function buildContext(
  runtimeConfig: DownloadRuntimeConfig,
  authSession: AuthSession | null
): ResolveContext {
  return {
    scene: 'download',
    isAuthenticated: Boolean(authSession?.userId && authSession?.cookie),
    config: {
      musicSourceEnabled: runtimeConfig.musicSourceEnabled,
      musicSourceProviders: runtimeConfig.musicSourceProviders ?? [],
      luoxueSourceEnabled: runtimeConfig.luoxueSourceEnabled ?? false,
      customMusicApiEnabled: runtimeConfig.customMusicApiEnabled ?? false,
      customMusicApiUrl: runtimeConfig.customMusicApiUrl ?? '',
    } as never,
  }
}
```

Replace the current fixed request flow with policy-based attempts:

```ts
const context = buildContext(runtimeConfig, authSession)
const resolverPolicy = buildResolverPolicy(context)

for (const resolverId of resolverPolicy.resolverOrder) {
  if (resolverId === 'builtinUnblock') {
    const playbackUrl = new URL('/song/url/v1', `${baseURL}/`)
    playbackUrl.searchParams.set('id', String(payload.songId))
    playbackUrl.searchParams.set('level', quality)
    playbackUrl.searchParams.set('unblock', 'true')
    const playbackResponse = await fetcher(playbackUrl.toString(), {
      headers: createRequestHeaders(
        playbackUrl.toString(),
        authOrigin,
        authSession
      ),
    })

    if (playbackResponse.ok) {
      const playbackResult = normalizeSongUrlV1Response(
        await playbackResponse.json()
      )

      if (playbackResult?.url) {
        return {
          url: playbackResult.url,
          quality,
        }
      }
    }

    continue
  }

  if (resolverId === 'official') {
    const officialDownloadUrl = new URL('/song/download/url/v1', `${baseURL}/`)
    officialDownloadUrl.searchParams.set('id', String(payload.songId))
    officialDownloadUrl.searchParams.set('level', quality)
    const officialDownloadResponse = await fetcher(
      officialDownloadUrl.toString(),
      {
        headers: createRequestHeaders(
          officialDownloadUrl.toString(),
          authOrigin,
          authSession
        ),
      }
    )

    if (officialDownloadResponse.ok) {
      const officialDownloadResult = normalizeSongDownloadUrlResponse(
        await officialDownloadResponse.json()
      )

      if (officialDownloadResult?.url) {
        return {
          ...officialDownloadResult,
          quality,
        }
      }
    }

    const playbackUrl = new URL('/song/url/v1', `${baseURL}/`)
    playbackUrl.searchParams.set('id', String(payload.songId))
    playbackUrl.searchParams.set('level', quality)
    playbackUrl.searchParams.set('unblock', 'false')
    const playbackResponse = await fetcher(playbackUrl.toString(), {
      headers: createRequestHeaders(
        playbackUrl.toString(),
        authOrigin,
        authSession
      ),
    })

    if (playbackResponse.ok) {
      const playbackResult = normalizeSongUrlV1Response(
        await playbackResponse.json()
      )

      if (playbackResult?.url) {
        return {
          url: playbackResult.url,
          quality,
        }
      }
    }
  }
}
```

Also expand `DownloadRuntimeConfig` in `src/main/download/download-types.ts`:

```ts
export type DownloadRuntimeConfig = {
  musicSourceEnabled: boolean
  musicSourceProviders?: MusicSourceProvider[]
  luoxueSourceEnabled?: boolean
  customMusicApiEnabled?: boolean
  customMusicApiUrl?: string
  downloadDir: string
  downloadQuality: AudioQualityLevel
  downloadQualityPolicy: DownloadQualityPolicy
  downloadSkipExisting: boolean
  downloadConcurrency: number
  downloadFileNamePattern: DownloadFileNamePattern
  downloadEmbedCover: boolean
  downloadEmbedLyrics: boolean
  downloadEmbedTranslatedLyrics: boolean
}
```

Update `src/main/download/download-service.ts` so `getRuntimeConfig()` returns the new fields:

```ts
return {
  musicSourceEnabled: config.musicSourceEnabled ?? false,
  musicSourceProviders: config.musicSourceProviders ?? [],
  luoxueSourceEnabled: config.luoxueSourceEnabled ?? false,
  customMusicApiEnabled: config.customMusicApiEnabled ?? false,
  customMusicApiUrl: config.customMusicApiUrl ?? '',
  downloadDir: config.downloadDir || '',
  downloadQuality: config.downloadQuality || 'higher',
  downloadQualityPolicy: config.downloadQualityPolicy || 'fallback',
  downloadSkipExisting: config.downloadSkipExisting ?? true,
  downloadConcurrency: this.fixedConcurrency || config.downloadConcurrency || 3,
  downloadFileNamePattern: config.downloadFileNamePattern || 'song-artist',
  downloadEmbedCover: config.downloadEmbedCover ?? true,
  downloadEmbedLyrics: config.downloadEmbedLyrics ?? true,
  downloadEmbedTranslatedLyrics:
    config.downloadEmbedLyrics === false
      ? false
      : (config.downloadEmbedTranslatedLyrics ?? false),
}
```

Update `src/main/ipc/download-ipc.ts` so `readConfig()` passes the new config keys through:

```ts
readConfig: () => ({
  musicSourceEnabled: getConfig('musicSourceEnabled'),
  musicSourceProviders: getConfig('musicSourceProviders'),
  luoxueSourceEnabled: getConfig('luoxueSourceEnabled'),
  customMusicApiEnabled: getConfig('customMusicApiEnabled'),
  customMusicApiUrl: getConfig('customMusicApiUrl'),
  downloadDir: getConfig('downloadDir'),
  downloadQuality: getConfig('downloadQuality'),
  downloadQualityPolicy: getConfig('downloadQualityPolicy'),
  downloadSkipExisting: getConfig('downloadSkipExisting'),
  downloadConcurrency: getConfig('downloadConcurrency'),
  downloadFileNamePattern: getConfig('downloadFileNamePattern'),
  downloadEmbedCover: getConfig('downloadEmbedCover'),
  downloadEmbedLyrics: getConfig('downloadEmbedLyrics'),
  downloadEmbedTranslatedLyrics: getConfig('downloadEmbedTranslatedLyrics'),
}),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/main-download-source-resolver.test.ts tests/download-service.test.ts`  
Expected: PASS with main fallback now following shared unauthenticated policy.

- [ ] **Step 5: Commit**

```bash
git add src/main/download/download-source-resolver.ts src/main/download/download-service.ts src/main/ipc/download-ipc.ts src/main/download/download-types.ts tests/main-download-source-resolver.test.ts tests/download-service.test.ts
git commit -m "refactor: align main download fallback with source policy"
```

### Task 5: Run Full Regression Checks for Dispatcher Introduction

**Files:**

- Modify: none
- Test: `tests/music-source-policy.test.ts`
- Test: `tests/playback-source-resolver.test.ts`
- Test: `tests/download-source-resolver.test.ts`
- Test: `tests/main-download-source-resolver.test.ts`
- Test: `tests/download-service.test.ts`
- Test: `tests/playback-store.test.ts`

- [ ] **Step 1: Run focused source-resolution tests**

Run:

```bash
node --test tests/music-source-policy.test.ts tests/playback-source-resolver.test.ts tests/download-source-resolver.test.ts tests/main-download-source-resolver.test.ts
```

Expected: PASS across the new shared policy, playback orchestration, renderer download orchestration, and main-process fallback suites.

- [ ] **Step 2: Run existing playback and download regressions**

Run:

```bash
node --test tests/download-service.test.ts tests/playback-store.test.ts tests/download-playback.model.test.ts tests/local-media.test.ts
```

Expected: PASS, confirming dispatcher refactoring did not break download service behavior, local playback queue behavior, or local seek support.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS with only pre-existing repository warnings.

- [ ] **Step 4: Inspect diff for scope control**

Run:

```bash
git diff --stat
git diff -- src/shared/music-source src/renderer/services/music-source src/renderer/services/download src/main/download tests
```

Expected: only dispatcher-related files and test updates appear.

- [ ] **Step 5: Commit**

```bash
git add src/shared/music-source src/renderer/services/music-source src/renderer/services/download src/main/download tests
git commit -m "test: verify music source dispatcher rollout"
```
