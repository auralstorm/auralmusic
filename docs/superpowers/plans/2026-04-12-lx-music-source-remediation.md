# LX Music Source Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make imported LX music source scripts usable for real playback URL resolving, while keeping app search on the existing search APIs.

**Architecture:** Treat LX scripts as a playback resolver, not as a global search provider. Keep the import/settings layer responsible for validation and persistence, the runner/worker layer responsible for script execution, and the playback layer responsible for choosing the fallback resolver when `/song/url/v1` cannot provide a playable URL.

**Tech Stack:** Electron, React, TypeScript, Web Worker sandbox, preload/main IPC, Node model tests, existing `getSongUrlV1` playback flow.

---

## Current Root Cause

The current project has only the import-time validation half of LX support:

- `src/renderer/services/music-source/LxMusicSourceRunner.ts` initializes a temporary worker in `validateLxMusicSourceScript()`, then immediately disposes it.
- `src/renderer/services/music-source/workers/lxScriptSandbox.worker.ts` exposes `lx.on` as a no-op, so imported scripts cannot register the `request` handler needed by playback URL resolving.
- `src/renderer/components/PlaybackControl/PlaybackEngine.tsx` only calls `/song/url/v1` through `getSongUrlV1()` and never asks the LX runner for a URL.
- Search should remain unchanged for this remediation. The reference Alger project uses LX for playback resolving from already-known song metadata; its search API still goes through `/cloudsearch` and suggestions.

## File Structure

- Modify: `src/shared/lx-music-source.ts`
  - Owns LX data contracts, source key types, request payload/result types, script metadata parsing, and persistence normalization.
- Modify: `src/main/music-source/lx-script-store.ts`
  - Owns file/import/download validation before saving scripts to disk.
- Modify: `src/renderer/services/music-source/workers/lxScriptSandbox.worker.ts`
  - Owns sandboxed script execution, `lx.on('request')`, `lx.request`, host HTTP forwarding, and invoke result forwarding.
- Modify: `src/renderer/services/music-source/LxMusicSourceRunner.ts`
  - Owns runner lifecycle, singleton active runner, source cache, request invocation, and high-level `getMusicUrl`.
- Create: `src/renderer/services/music-source/lx-playback-resolver.ts`
  - Owns selecting the active imported script, converting app tracks to `LxMusicInfo`, choosing source/quality, and returning a normalized playable URL.
- Modify: `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`
  - Owns playback URL attempt order and should call the LX resolver only after primary `/song/url/v1` attempts fail.
- Modify: `src/renderer/pages/Settings/components/MusicSourceSettingsDialog.tsx`
  - Keeps import/save behavior, but reuses the persistent runner API when switching the active script if needed.
- Tests:
  - Modify: `lx-music-source.test.ts`
  - Create: `lx-music-runner.model.test.ts`
  - Create: `lx-playback-resolver.model.test.ts`
  - Modify or extend: `playback.model.test.ts` only if URL fallback normalization changes.

---

### Task 1: Normalize LX Types and Import Validation

**Files:**

- Modify: `src/shared/lx-music-source.ts`
- Modify: `src/main/music-source/lx-script-store.ts`
- Modify: `lx-music-source.test.ts`

- [ ] **Step 1: Add shared LX runtime types**

In `src/shared/lx-music-source.ts`, add these contracts near the existing `LxQuality` and `LxSourceConfig` definitions:

```ts
export const LX_SOURCE_KEYS = ['kw', 'kg', 'tx', 'wy', 'mg'] as const

export type LxSourceKey = (typeof LX_SOURCE_KEYS)[number]

export type LxMusicInfo = {
  songmid: string | number
  name: string
  singer: string
  album: string
  albumId?: string | number
  source: LxSourceKey | 'wy'
  interval: string
  img?: string
}

export type LxScriptRequestAction = 'musicUrl' | 'lyric' | 'pic'

export type LxScriptRequestPayload = {
  source: LxSourceKey
  action: LxScriptRequestAction
  info: {
    type?: LxQuality
    musicInfo: LxMusicInfo
  }
}

export type LxScriptRequestResult =
  | string
  | {
      url?: string
      data?: string | { url?: string }
      lyric?: string
      pic?: string
    }
```

- [ ] **Step 2: Add a permissive import predicate**

Add an exported helper:

```ts
export function isProbablyLxMusicSourceScript(script: string) {
  const source = typeof script === 'string' ? script : ''
  const hasHeaderComment = /^\/\*+[\s\S]*?@name[\s\S]*?\*\//.test(source)
  const hasLxApi = source.includes('lx.on(') || source.includes('lx.send(')

  return hasHeaderComment || hasLxApi
}
```

- [ ] **Step 3: Write validation tests**

Extend `lx-music-source.test.ts` with:

```ts
import { isProbablyLxMusicSourceScript } from './src/shared/lx-music-source.ts'

test('isProbablyLxMusicSourceScript accepts header-only and lx api scripts', () => {
  assert.equal(
    isProbablyLxMusicSourceScript('/**\\n * @name A\\n */\\nconsole.log(1)'),
    true
  )
  assert.equal(
    isProbablyLxMusicSourceScript('lx.on(lx.EVENT_NAMES.request, () => {})'),
    true
  )
  assert.equal(isProbablyLxMusicSourceScript('console.log("plain")'), false)
})
```

- [ ] **Step 4: Run the focused test**

Run: `node lx-music-source.test.ts`

Expected: it fails before the helper exists, then passes after implementation.

- [ ] **Step 5: Loosen main-process validation**

In `src/main/music-source/lx-script-store.ts`, change `assertLxMusicSourceScript()` so it rejects only when `isProbablyLxMusicSourceScript(rawScript)` is false. Keep file non-empty validation and existing parse/save behavior.

- [ ] **Step 6: Run the focused test again**

Run: `node lx-music-source.test.ts`

Expected: all LX source model tests pass.

---

### Task 2: Implement Worker Request Invocation

**Files:**

- Modify: `src/renderer/services/music-source/workers/lxScriptSandbox.worker.ts`
- Modify: `src/shared/lx-music-source.ts` if additional invoke message types need to be shared.

- [ ] **Step 1: Add request handler state**

In the worker, add a module-level handler:

```ts
let requestHandler:
  | ((
      payload: LxScriptRequestPayload
    ) => Promise<LxScriptRequestResult> | LxScriptRequestResult)
  | null = null
```

- [ ] **Step 2: Wire `lx.on`**

Replace the current no-op `on` implementation with:

```ts
on: (eventName: string, handler: unknown) => {
  if (eventName !== 'request') {
    return
  }

  if (typeof handler !== 'function') {
    throw new Error('lx.on(request) requires a function handler')
  }

  requestHandler = handler as (
    payload: LxScriptRequestPayload
  ) => Promise<LxScriptRequestResult> | LxScriptRequestResult
},
```

- [ ] **Step 3: Add invoke request/result messages**

Extend worker host message types with:

```ts
type WorkerInvokeRequestMessage = {
  type: 'invoke-request'
  callId: string
  payload: LxScriptRequestPayload
}
```

Extend worker-to-host messages with:

```ts
| { type: 'invoke-result'; callId: string; result: LxScriptRequestResult }
| { type: 'invoke-error'; callId: string; message: string }
```

- [ ] **Step 4: Implement invoke handling**

Add:

```ts
async function resolveInvocation(
  callId: string,
  payload: LxScriptRequestPayload
) {
  if (!requestHandler) {
    postToHost({
      type: 'invoke-error',
      callId,
      message: 'LX script did not register lx.on(request)',
    })
    return
  }

  try {
    const result = await requestHandler(payload)
    postToHost({ type: 'invoke-result', callId, result })
  } catch (error) {
    postToHost({
      type: 'invoke-error',
      callId,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
```

Handle `invoke-request` inside `globalThis.onmessage`.

- [ ] **Step 5: Reset state on initialization**

At the beginning of `initializeScript()`, set:

```ts
requestHandler = null
pendingHttpCallbacks.clear()
requestCounter = 0
```

- [ ] **Step 6: Manual smoke fixture**

Use this script as the smoke fixture in the app import flow after the runner API is ready:

```js
/**
 * @name Smoke LX Source
 */
lx.on(lx.EVENT_NAMES.request, ({ action }) => {
  if (action === 'musicUrl') return 'https://example.com/test.mp3'
  return null
})
lx.send(lx.EVENT_NAMES.inited, {
  sources: {
    wy: {
      name: 'WY',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '320k'],
    },
  },
})
```

Expected after later tasks: importing succeeds and playback fallback can resolve `https://example.com/test.mp3`.

---

### Task 3: Expand the Renderer LX Runner

**Files:**

- Modify: `src/renderer/services/music-source/LxMusicSourceRunner.ts`
- Create: `lx-music-runner.model.test.ts`

- [ ] **Step 1: Store initialized sources**

Add a private `sources` field:

```ts
private sources: LxInitedData['sources'] = {}
```

Update `resolveInitialization(data)` to store:

```ts
this.sources = data.sources || {}
```

Update `initialize()` so an already initialized runner returns `{ sources: this.sources }`, not `{ sources: {} }`.

- [ ] **Step 2: Add runner public getters**

Add:

```ts
isInitialized() {
  return this.initialized
}

getSources() {
  return this.sources
}
```

- [ ] **Step 3: Add pending invocation tracking**

Add:

```ts
private callCounter = 0
private pendingInvocations = new Map<
  string,
  {
    resolve: (result: LxScriptRequestResult) => void
    reject: (error: Error) => void
    timeoutId: number
  }
>()
```

- [ ] **Step 4: Handle worker invoke results**

Extend `WorkerToRunnerMessage` with `invoke-result` and `invoke-error` variants and handle them in `handleWorkerMessage()` by resolving/rejecting `pendingInvocations`.

- [ ] **Step 5: Add `invokeRequest()`**

Add:

```ts
private async invokeRequest(
  payload: LxScriptRequestPayload,
  timeoutMs = 20000
): Promise<LxScriptRequestResult> {
  await this.initialize()
  const callId = `lx_call_${Date.now()}_${this.callCounter++}`

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      this.pendingInvocations.delete(callId)
      reject(new Error('LX script request timed out'))
    }, timeoutMs)

    this.pendingInvocations.set(callId, { resolve, reject, timeoutId })
    this.postToWorker({ type: 'invoke-request', callId, payload })
  })
}
```

- [ ] **Step 6: Add `getMusicUrl()`**

Add a public method that:

- verifies `sourceConfig` exists
- verifies `sourceConfig.actions.includes('musicUrl')`
- falls back quality in this order: requested quality, `flac24bit`, `flac`, `320k`, `128k`
- calls `invokeRequest({ source, action: 'musicUrl', info: { type: targetQuality, musicInfo } })`
- normalizes result from string, `{ url }`, `{ data: string }`, or `{ data: { url } }`
- throws a clear error if no URL is returned

- [ ] **Step 7: Add singleton helpers**

Add:

```ts
let activeLxMusicRunner: LxMusicSourceRunner | null = null

export function getLxMusicRunner() {
  return activeLxMusicRunner
}

export function setLxMusicRunner(runner: LxMusicSourceRunner | null) {
  activeLxMusicRunner?.dispose()
  activeLxMusicRunner = runner
}

export async function initLxMusicRunner(script: string) {
  setLxMusicRunner(null)
  const runner = new LxMusicSourceRunner(script)
  await runner.initialize()
  activeLxMusicRunner = runner
  return runner
}
```

Keep `validateLxMusicSourceScript()` as a temporary runner that always disposes.

- [ ] **Step 8: Add focused model tests for pure helpers**

If `normalizeLxScriptRequestResultToUrl()` and `selectLxQuality()` are extracted as pure helpers, cover them in `lx-music-runner.model.test.ts`:

```ts
test('normalizeLxScriptRequestResultToUrl reads common result shapes', () => {
  assert.equal(
    normalizeLxScriptRequestResultToUrl('https://a.test/a.mp3'),
    'https://a.test/a.mp3'
  )
  assert.equal(
    normalizeLxScriptRequestResultToUrl({ url: 'https://a.test/b.mp3' }),
    'https://a.test/b.mp3'
  )
  assert.equal(
    normalizeLxScriptRequestResultToUrl({ data: 'https://a.test/c.mp3' }),
    'https://a.test/c.mp3'
  )
  assert.equal(
    normalizeLxScriptRequestResultToUrl({
      data: { url: 'https://a.test/d.mp3' },
    }),
    'https://a.test/d.mp3'
  )
  assert.equal(normalizeLxScriptRequestResultToUrl({}), null)
})
```

- [ ] **Step 9: Run focused tests**

Run: `node lx-music-runner.model.test.ts`

Expected: URL normalization and quality fallback tests pass.

---

### Task 4: Add Playback Resolver Service

**Files:**

- Create: `src/renderer/services/music-source/lx-playback-resolver.ts`
- Create: `lx-playback-resolver.model.test.ts`

- [ ] **Step 1: Add pure conversion helpers**

Create helpers:

```ts
export function formatLxInterval(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
```

Add a track conversion helper that maps `PlaybackTrack` to `LxMusicInfo`:

```ts
export function toLxMusicInfo(track: PlaybackTrack): LxMusicInfo {
  return {
    songmid: track.id,
    name: track.name,
    singer: track.artistNames,
    album: track.albumName,
    source: 'wy',
    interval: formatLxInterval(track.duration),
    img: track.coverUrl,
  }
}
```

- [ ] **Step 2: Add source selection helper**

Add:

```ts
export function selectBestLxSource(
  sources: LxInitedData['sources'],
  preferred: LxSourceKey[] = ['wy', 'kw', 'mg', 'kg', 'tx']
): LxSourceKey | null {
  const available = new Set(Object.keys(sources))
  return preferred.find(source => available.has(source)) || null
}
```

- [ ] **Step 3: Write pure helper tests**

In `lx-playback-resolver.model.test.ts`, cover:

- `formatLxInterval(0) === '00:00'`
- `formatLxInterval(61000) === '01:01'`
- `toLxMusicInfo()` maps the current playback track fields
- `selectBestLxSource()` prefers `wy`, then falls back by configured order

- [ ] **Step 4: Add resolver function**

Add:

```ts
export async function resolveTrackWithLxMusicSource(options: {
  track: PlaybackTrack
  quality: AudioQualityLevel
  config: AppConfig
}): Promise<SongUrlV1Result | null> {
  // Return null when global source resolving is disabled,
  // lxMusic is not selected, no active script exists, or no script record is found.
  // Otherwise read script content through window.electronMusicSource.readLxScript(id),
  // initialize/reuse the runner, select the best source, and call runner.getMusicUrl().
}
```

Rules:

- Return `null`, do not toast, when LX is not configured or cannot handle the track.
- Log warnings for script errors, but let `PlaybackEngine` own user-facing playback failure toasts.
- Only read/init the active script if the current singleton runner is missing or uninitialized.
- Return a `SongUrlV1Result` shape so `PlaybackEngine` can keep a single downstream path:

```ts
{
  id: track.id,
  url,
  time: track.duration,
  br: 0,
}
```

- [ ] **Step 5: Run focused tests**

Run: `node lx-playback-resolver.model.test.ts`

Expected: pure conversion/source-selection tests pass.

---

### Task 5: Wire PlaybackEngine Fallback

**Files:**

- Modify: `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`

- [ ] **Step 1: Import the resolver**

Add:

```ts
import { resolveTrackWithLxMusicSource } from '@/services/music-source/lx-playback-resolver'
```

- [ ] **Step 2: Add config refs if needed**

Use the existing config store/ref pattern in `PlaybackEngine` so the async `loadAndPlay()` closure can read the latest full `config`, not only `musicSourceEnabled` and `quality`.

- [ ] **Step 3: Add LX fallback after primary attempts**

After the `createSongUrlRequestAttempts()` loop, before the `if (!result?.url)` error branch, add:

```ts
if (!result?.url && currentTrack) {
  result = await resolveTrackWithLxMusicSource({
    track: currentTrack,
    quality: qualityRef.current,
    config: configRef.current,
  })
}
```

- [ ] **Step 4: Preserve cancellation guards**

Keep the existing `cancelled`, `requestId`, and `currentTrack.id` checks after the fallback call. Do not set `audio.src` from a stale request.

- [ ] **Step 5: Run playback regression tests**

Run:

```powershell
node playback.model.test.ts
node playback-store.test.ts
```

Expected: existing playback mode and URL normalization tests still pass.

---

### Task 6: Keep Search Unchanged and Document the Boundary

**Files:**

- Optional modify: `src/renderer/services/music-source/lx-playback-resolver.ts`
- Optional create or update: `docs/music-source-lx.md`

- [ ] **Step 1: Add a short resolver comment**

At the top of `lx-playback-resolver.ts`, add:

```ts
// LX custom sources resolve playable resources for an existing track.
// They are intentionally not part of global search; search stays on the app's existing APIs.
```

- [ ] **Step 2: Do not add search action support in this remediation**

Do not modify search pages or search APIs. The current LX source action model only needs `musicUrl`, with `lyric` and `pic` left for later extension.

---

### Task 7: Optional Compatibility Follow-up for Crypto and Zlib

**Files:**

- Modify: `src/renderer/services/music-source/workers/lxScriptSandbox.worker.ts`
- Optional create: `src/renderer/services/music-source/lx-worker-utils.ts`

- [ ] **Step 1: Defer this until after `musicUrl` invoke works**

Do not block the first playable fallback on full crypto/zlib compatibility unless the target real-world script throws specifically because `lx.utils.crypto.*` or `lx.utils.zlib.*` is missing.

- [ ] **Step 2: If needed, port Alger-compatible helpers**

Implement only the helpers required by the failing imported source, starting with `md5`, `sha1`, `sha256`, and base64 helpers. Keep AES/RSA/zlib as separate focused increments because they add dependency and browser API risk.

- [ ] **Step 3: Verify with the user's actual failing script**

Import the same LX source that works in Alger and verify whether it now initializes and resolves a URL. If it fails, capture the exact missing helper/error before adding more compatibility surface.

---

### Task 8: Verification

**Files:**

- Verify only

- [ ] **Step 1: Run model tests**

Run:

```powershell
node lx-music-source.test.ts
node lx-music-runner.model.test.ts
node lx-playback-resolver.model.test.ts
node playback.model.test.ts
node playback-store.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run lint**

Run:

```powershell
pnpm lint
```

Expected: lint completes. If repository-wide warnings remain, report them as existing warnings unless this work adds new ones.

- [ ] **Step 3: Run targeted type check if feasible**

Run:

```powershell
pnpm exec tsc -p tsconfig.node.json --noEmit --pretty false
```

Expected: node-side type check passes.

Run app type check only as a diagnostic because the repo currently has existing renderer type blockers:

```powershell
pnpm exec tsc -p tsconfig.app.json --noEmit --pretty false
```

Expected: if it fails, report whether failures are pre-existing or introduced by LX changes.

- [ ] **Step 4: Manual Electron verification**

Run:

```powershell
pnpm dev
```

Verify:

- Import the same LX source that succeeds in Alger.
- Confirm it appears in the LX source list and becomes the active script.
- Play a song that fails normal `/song/url/v1` or use devtools to simulate no primary URL.
- Confirm playback falls back to LX and sets `audio.src` from the script result.
- Confirm the visible search UI and search result behavior are unchanged.

---

## Implementation Notes

- Do not change the queue order, playback mode logic, dynamic cover setting, or global shortcut work while implementing this plan.
- Do not make LX search part of this remediation. That is a separate feature because LX scripts in the current model expose resource actions, not a stable global search contract.
- Prefer null-return fallback boundaries in resolver code. `PlaybackEngine` should remain the only place showing the final “unable to play” toast for this path.
- Keep imported script validation permissive enough to match Alger: header comment or LX API usage is enough to attempt initialization; runtime initialization still validates whether the script actually calls `lx.send('inited', data)`.
