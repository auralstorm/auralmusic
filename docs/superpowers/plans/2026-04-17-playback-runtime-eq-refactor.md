# Playback Runtime EQ Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把播放运行时�?`PlaybackEngine.tsx` 中抽离到单例 `playback-runtime`，在不改变现�?EQ 弹框结构的前提下，为 EQ 和输出设备切换提供稳定的接入边界�?
**Architecture:** 维持现有 `playback-store` 和配置存储不变，新建 renderer �?`playback-runtime` 作为唯一音频 owner。`PlaybackEngine` 退化为桥接层，只订�?store 并调�?runtime；EQ graph 继续存在，但只作�?runtime 内部基础设施，切换通过 bypass 和参数更新完成，不重�?`HTMLAudioElement`�?
**Tech Stack:** React 19, Zustand, TypeScript, Electron, Web Audio API, Node test runner

---

## File Map

- Create: `src/renderer/audio/playback-runtime/playback-runtime.model.ts`
  - 纯模型函数，负责设备 ID 规范化、错误域、运行时状态归�?- Create: `src/renderer/audio/playback-runtime/playback-runtime.ts`
  - 单例播放运行时，唯一持有 `HTMLAudioElement` 和可�?EQ graph
- Create: `tests/playback-runtime.model.test.ts`
  - 模型层测�?- Create: `tests/playback-runtime.test.ts`
  - runtime 生命周期、事件同步、设备回退测试
- Modify: `src/renderer/audio/equalizer/equalizer-graph.ts`
  - 允许 runtime 以更稳定的方式接�?graph，明确错误回退
- Modify: `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`
  - 从直接操�?`Audio` 改为桥接 `playback-runtime`
- Modify: `src/renderer/components/PlaybackControl/playback-engine.model.ts`
  - 删除或缩减只服务旧组件内 audio 生命周期的逻辑
- Modify: `tests/equalizer-graph.test.ts`
  - 调整�?runtime 预期�?graph 契约

## Task 1: 搭好 Playback Runtime 的模型边�?

**Files:**

- Create: `src/renderer/audio/playback-runtime/playback-runtime.model.ts`
- Test: `tests/playback-runtime.model.test.ts`

- [ ] **Step 1: 写模型层失败测试**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_PLAYBACK_RUNTIME_ERROR,
  classifyPlaybackRuntimeError,
  normalizePlaybackOutputDeviceId,
  shouldReuseLoadedSource,
} from '../src/renderer/audio/playback-runtime/playback-runtime.model.ts'

test('normalizePlaybackOutputDeviceId keeps the default device id', () => {
  assert.equal(normalizePlaybackOutputDeviceId('default'), 'default')
  assert.equal(normalizePlaybackOutputDeviceId(''), 'default')
  assert.equal(normalizePlaybackOutputDeviceId('speaker-2'), 'speaker-2')
})

test('shouldReuseLoadedSource only reuses identical non-empty urls', () => {
  assert.equal(shouldReuseLoadedSource('', ''), false)
  assert.equal(shouldReuseLoadedSource('a', ''), false)
  assert.equal(shouldReuseLoadedSource('a', 'a'), true)
  assert.equal(shouldReuseLoadedSource('a', 'b'), false)
})

test('classifyPlaybackRuntimeError separates output-device failures', () => {
  const outputError = new Error('setSinkId failed')
  assert.equal(
    classifyPlaybackRuntimeError(outputError, 'output-device'),
    'output_device_failed'
  )

  const sourceError = new Error('source load failed')
  assert.equal(
    classifyPlaybackRuntimeError(sourceError, 'source-load'),
    'source_load_failed'
  )

  assert.equal(
    classifyPlaybackRuntimeError(undefined, 'unknown'),
    DEFAULT_PLAYBACK_RUNTIME_ERROR
  )
})
```

- [ ] \*_Step 2: 运行测试，确认当前失�?_

Run: `node --test tests/playback-runtime.model.test.ts`
Expected: FAIL with `Cannot find module` for `playback-runtime.model.ts`

- [ ] \*_Step 3: 写最小模型实�?_

```ts
export const DEFAULT_PLAYBACK_RUNTIME_ERROR = 'play_failed'

export type PlaybackRuntimeFailureKind =
  | 'output_device_failed'
  | 'source_load_failed'
  | 'audio_context_failed'
  | 'graph_failed'
  | 'play_failed'

export function normalizePlaybackOutputDeviceId(deviceId: string) {
  return deviceId || 'default'
}

export function shouldReuseLoadedSource(currentUrl: string, nextUrl: string) {
  return Boolean(currentUrl) && currentUrl === nextUrl
}

export function classifyPlaybackRuntimeError(
  _error: unknown,
  scope: 'output-device' | 'source-load' | 'audio-context' | 'graph' | 'unknown'
): PlaybackRuntimeFailureKind {
  if (scope === 'output-device') {
    return 'output_device_failed'
  }

  if (scope === 'source-load') {
    return 'source_load_failed'
  }

  if (scope === 'audio-context') {
    return 'audio_context_failed'
  }

  if (scope === 'graph') {
    return 'graph_failed'
  }

  return DEFAULT_PLAYBACK_RUNTIME_ERROR
}
```

- [ ] **Step 4: 运行模型测试，确认通过**

Run: `node --test tests/playback-runtime.model.test.ts`
Expected: PASS with 3 passing tests

- [ ] \*_Step 5: 提交模型层骨�?_

```bash
git add tests/playback-runtime.model.test.ts src/renderer/audio/playback-runtime/playback-runtime.model.ts
git commit -m "test: add playback runtime model contract"
```

## Task 2: 落地单例 Playback Runtime

**Files:**

- Create: `src/renderer/audio/playback-runtime/playback-runtime.ts`
- Modify: `src/renderer/audio/equalizer/equalizer-graph.ts`
- Test: `tests/playback-runtime.test.ts`

- [ ] **Step 1: �?runtime 失败测试**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { createPlaybackRuntime } from '../src/renderer/audio/playback-runtime/playback-runtime.ts'

class FakeAudio extends EventTarget {
  src = ''
  paused = true
  volume = 1
  currentTime = 0
  playbackRate = 1
  loadCount = 0
  playCount = 0
  pauseCount = 0

  load() {
    this.loadCount += 1
  }

  async play() {
    this.playCount += 1
    this.paused = false
  }

  pause() {
    this.pauseCount += 1
    this.paused = true
  }

  removeAttribute(name: string) {
    if (name === 'src') {
      this.src = ''
    }
  }
}

test('playback runtime reuses a single audio element and swaps only src', async () => {
  const audio = new FakeAudio()
  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
  })

  await runtime.loadSource('https://a.test/one.mp3')
  await runtime.loadSource('https://a.test/two.mp3')

  assert.equal(runtime.getAudioElement(), audio)
  assert.equal(audio.src, 'https://a.test/two.mp3')
  assert.equal(audio.pauseCount >= 1, true)
})

test('output device failure does not clear the active source', async () => {
  const audio = new FakeAudio() as HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>
  }
  audio.setSinkId = async () => {
    throw new Error('sink failed')
  }

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio,
  })

  await runtime.loadSource('https://a.test/one.mp3')
  const success = await runtime.setOutputDevice('speaker-2')

  assert.equal(success, false)
  assert.equal(audio.src, 'https://a.test/one.mp3')
})
```

- [ ] \*_Step 2: 运行 runtime 测试，确认当前失�?_

Run: `node --test tests/playback-runtime.test.ts`
Expected: FAIL with `Cannot find module` for `playback-runtime.ts`

- [ ] **Step 3: 实现最�?runtime**

```ts
import { applyAudioOutputDevice } from '../../lib/audio-output.ts'
import {
  classifyPlaybackRuntimeError,
  normalizePlaybackOutputDeviceId,
  shouldReuseLoadedSource,
} from './playback-runtime.model.ts'

export interface PlaybackRuntime {
  getAudioElement: () => HTMLAudioElement
  loadSource: (url: string) => Promise<void>
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  seek: (timeSeconds: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  setOutputDevice: (deviceId: string) => Promise<boolean>
}

export function createPlaybackRuntime(options?: {
  createAudioElement?: () => HTMLAudioElement
}): PlaybackRuntime {
  const audio = options?.createAudioElement?.() ?? new Audio()
  let loadedSource = ''

  return {
    getAudioElement: () => audio,
    async loadSource(url) {
      if (!url || !url.trim()) {
        throw new Error(classifyPlaybackRuntimeError(undefined, 'source-load'))
      }

      if (shouldReuseLoadedSource(loadedSource, url)) {
        return
      }

      audio.pause()
      audio.removeAttribute('src')
      audio.currentTime = 0
      audio.load()
      audio.src = url
      loadedSource = url
    },
    async play() {
      await audio.play()
    },
    pause() {
      audio.pause()
    },
    stop() {
      audio.pause()
      audio.removeAttribute('src')
      audio.currentTime = 0
      audio.load()
      loadedSource = ''
    },
    seek(timeSeconds) {
      audio.currentTime = Math.max(0, timeSeconds)
    },
    setVolume(volume) {
      audio.volume = volume
    },
    setPlaybackRate(rate) {
      audio.playbackRate = rate
    },
    async setOutputDevice(deviceId) {
      try {
        await applyAudioOutputDevice(
          audio,
          normalizePlaybackOutputDeviceId(deviceId)
        )
        return true
      } catch {
        return false
      }
    },
  }
}

export const playbackRuntime = createPlaybackRuntime()
```

- [ ] **Step 4: 调整 `equalizer-graph.ts` �?runtime 契约**

```ts
export interface EqualizerGraph {
  update: (config: EqualizerConfig) => void
  resume: () => Promise<void>
  setOutputDevice: (deviceId: string) => Promise<boolean>
  dispose: () => void
}

// 暂不在这里做 toast 或播放错误升级，只把失败留给 runtime 处理�?async setOutputDevice(deviceId) {
  if (!audioContext.setSinkId) {
    return false
  }

  await audioContext.setSinkId(normalizeAudioContextSinkId(deviceId))
  return true
}
```

- [ ] **Step 5: 运行 runtime 测试，确认通过**

Run: `node --test tests/playback-runtime.test.ts`
Expected: PASS with 2 passing tests

- [ ] **Step 6: 提交 runtime 骨架**

```bash
git add tests/playback-runtime.test.ts src/renderer/audio/playback-runtime/playback-runtime.ts src/renderer/audio/equalizer/equalizer-graph.ts
git commit -m "feat: add playback runtime skeleton"
```

## Task 3: �?PlaybackEngine 改成桥接�?

**Files:**

- Modify: `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`
- Modify: `src/renderer/components/PlaybackControl/playback-engine.model.ts`
- Test: `tests/playback-store.test.ts`
- Test: `tests/playback-runtime.test.ts`

- [ ] **Step 1: 先补桥接行为测试**

```ts
test('playback runtime stops old audio before switching tracks', async () => {
  const audio = new FakeAudio()
  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
  })

  await runtime.loadSource('https://a.test/one.mp3')
  await runtime.play()
  await runtime.loadSource('https://a.test/two.mp3')

  assert.equal(audio.pauseCount >= 2, true)
  assert.equal(audio.src, 'https://a.test/two.mp3')
})
```

- [ ] \*_Step 2: 运行相关测试，确认新断言先失�?_

Run: `node --test tests/playback-runtime.test.ts tests/playback-store.test.ts`
Expected: 至少一条新断言失败

- [ ] **Step 3: �?`PlaybackEngine.tsx` 退化为 runtime 桥接**

```ts
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'

useImperativeHandle(
  ref,
  () => ({
    getAudioElement: () => playbackRuntime.getAudioElement(),
  }),
  []
)

useEffect(() => {
  const audio = playbackRuntime.getAudioElement()
  playbackRuntime.setVolume(volumeRef.current / 100)
  playbackRuntime.setPlaybackRate(playbackSpeedRef.current)

  const handleTimeUpdate = () => {
    usePlaybackStore.getState().setProgress(audio.currentTime * 1000)
  }

  const handleDurationChange = () => {
    if (Number.isFinite(audio.duration)) {
      usePlaybackStore.getState().setDuration(audio.duration * 1000)
    }
  }

  audio.addEventListener('timeupdate', handleTimeUpdate)
  audio.addEventListener('durationchange', handleDurationChange)

  return () => {
    audio.removeEventListener('timeupdate', handleTimeUpdate)
    audio.removeEventListener('durationchange', handleDurationChange)
  }
}, [])
```

- [ ] **Step 4: 把加载逻辑改为通过 runtime 调用**

```ts
await playbackRuntime.loadSource(resolvedAudioUrl)
playbackRuntime.setVolume(volumeRef.current / 100)
playbackRuntime.setPlaybackRate(playbackSpeedRef.current)

const outputApplied = await playbackRuntime.setOutputDevice(
  audioOutputDeviceIdRef.current
)

if (!outputApplied) {
  toast.error('音频输出设备切换失败，将使用默认输出设备播放')
}

if (!currentPlaybackState.shouldAutoPlayOnLoad) {
  currentPlaybackState.markPlaybackPaused()
  playbackRuntime.pause()
  return
}

await playbackRuntime.play()
usePlaybackStore.getState().markPlaybackPlaying()
```

- [ ] **Step 5: 缩减旧的 `prepareAudioForPendingTrack` 模型职责**

```ts
export function resetRuntimeSource(runtime: { stop: () => void }) {
  runtime.stop()
}
```

如果该模型文件不再有保留价值，删除它并把调用内联到 runtime�?

- [ ] **Step 6: 运行桥接相关测试**

Run: `node --test tests/playback-runtime.test.ts tests/playback-store.test.ts`
Expected: PASS

- [ ] **Step 7: 提交桥接重构**

```bash
git add src/renderer/components/PlaybackControl/PlaybackEngine.tsx src/renderer/components/PlaybackControl/playback-engine.model.ts tests/playback-runtime.test.ts tests/playback-store.test.ts
git commit -m "refactor: bridge playback engine through runtime"
```

## Task 4: �?Runtime 内恢�?EQ 接入

**Files:**

- Modify: `src/renderer/audio/playback-runtime/playback-runtime.ts`
- Modify: `src/renderer/audio/equalizer/equalizer-graph.ts`
- Modify: `tests/equalizer-graph.test.ts`
- Test: `tests/equalizer-graph.test.ts`

- [ ] **Step 1: 先写 EQ runtime 契约测试**

```ts
test('playback runtime creates equalizer graph once and reuses it', async () => {
  const audio = new FakeAudio()
  let createCount = 0

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio as unknown as HTMLAudioElement,
    createEqualizerGraph: () => {
      createCount += 1
      return {
        update() {},
        async resume() {},
        async setOutputDevice() {
          return true
        },
        dispose() {},
      }
    },
  })

  runtime.applyEqualizer({
    enabled: true,
    presetId: 'flat',
    preamp: 0,
    bands: [] as never[],
  })
  runtime.applyEqualizer({
    enabled: true,
    presetId: 'flat',
    preamp: 0,
    bands: [] as never[],
  })

  assert.equal(createCount, 1)
})
```

- [ ] \*_Step 2: 运行 EQ 相关测试，确认当前失�?_

Run: `node --test tests/equalizer-graph.test.ts tests/playback-runtime.test.ts`
Expected: FAIL because `playbackRuntime.applyEqualizer` does not exist

- [ ] **Step 3: �?runtime 中懒初始�?EQ graph**

```ts
import {
  createEqualizerGraph,
  type EqualizerGraph,
} from '../equalizer/equalizer-graph.ts'
import { DEFAULT_EQUALIZER_CONFIG, type EqualizerConfig } from '../../../shared/equalizer.ts'

let equalizerGraph: EqualizerGraph | null = null
let equalizerConfig: EqualizerConfig = DEFAULT_EQUALIZER_CONFIG

function ensureEqualizerGraph() {
  if (!equalizerGraph) {
    equalizerGraph = createEqualizerGraph({ audioElement: audio })
  }

  return equalizerGraph
}

applyEqualizer(config) {
  equalizerConfig = config
  const graph = ensureEqualizerGraph()
  graph.update(config)
}
```

- [ ] **Step 4: �?`setOutputDevice` 先走 EQ graph，再回退�?audio 元素**

```ts
async setOutputDevice(deviceId) {
  const normalizedDeviceId = normalizePlaybackOutputDeviceId(deviceId)

  if (equalizerConfig.enabled) {
    const graph = ensureEqualizerGraph()
    const applied = await graph.setOutputDevice(normalizedDeviceId)
    if (applied) {
      return true
    }
  }

  try {
    await applyAudioOutputDevice(audio, normalizedDeviceId)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 5: 运行 EQ �?runtime 测试**

Run: `node --test tests/equalizer-graph.test.ts tests/playback-runtime.test.ts`
Expected: PASS

- [ ] **Step 6: 提交 EQ runtime 接入**

```bash
git add src/renderer/audio/playback-runtime/playback-runtime.ts src/renderer/audio/equalizer/equalizer-graph.ts tests/equalizer-graph.test.ts tests/playback-runtime.test.ts
git commit -m "feat: restore equalizer through playback runtime"
```

## Task 5: 验证输出设备回退和最终回�?

**Files:**

- Modify: `tests/playback-runtime.test.ts`
- Modify: `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`
- Test: `tests/playback-runtime.test.ts`
- Test: `tests/equalizer-graph.test.ts`
- Test: `tests/playback-store.test.ts`

- [ ] **Step 1: 补默认设备与失败回退测试**

```ts
test('default device id stays stable during runtime output switching', async () => {
  const audio = new FakeAudio() as HTMLAudioElement & {
    setSinkId?: (deviceId: string) => Promise<void>
  }
  const sinkIds: string[] = []
  audio.setSinkId = async deviceId => {
    sinkIds.push(deviceId)
  }

  const runtime = createPlaybackRuntime({
    createAudioElement: () => audio,
  })

  await runtime.setOutputDevice('default')

  assert.deepEqual(sinkIds, ['default'])
})
```

- [ ] \*_Step 2: 运行测试，确认当前行为符合预�?_

Run: `node --test tests/playback-runtime.test.ts`
Expected: PASS

- [ ] \*_Step 3: 统一 `PlaybackEngine` 中的错误提示�?_

```ts
const outputApplied = await playbackRuntime.setOutputDevice(
  audioOutputDeviceIdRef.current
)

if (!outputApplied) {
  toast.error('音频输出设备切换失败')
}

try {
  await playbackRuntime.play()
} catch (error) {
  console.error('resume playback failed', error)
  usePlaybackStore.getState().markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
  toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
}
```

- [ ] \*_Step 4: 跑最终回归命�?_

Run: `node --test tests/playback-runtime.model.test.ts tests/playback-runtime.test.ts tests/equalizer-graph.test.ts tests/playback-store.test.ts`
Expected: PASS

Run: `pnpm exec tsc -p tsconfig.node.json --noEmit`
Expected: PASS

Run: `pnpm lint`
Expected: PASS with only existing warnings

Run: `pnpm exec electron-vite build`
Expected: PASS

- [ ] \*_Step 5: 提交最终重�?_

```bash
git add src/renderer/audio/playback-runtime src/renderer/audio/equalizer/equalizer-graph.ts src/renderer/components/PlaybackControl/PlaybackEngine.tsx src/renderer/components/PlaybackControl/playback-engine.model.ts tests/playback-runtime.model.test.ts tests/playback-runtime.test.ts tests/equalizer-graph.test.ts tests/playback-store.test.ts
git commit -m "refactor: isolate playback runtime for equalizer"
```

## Self-Review

- Spec coverage:
  - 单例 runtime：Task 2
  - `PlaybackEngine` 退化成桥接层：Task 3
  - EQ runtime 接入：Task 4
  - 输出设备失败与播放失败拆域：Task 1、Task 5
  - 不改 EQ 弹框结构：本计划未触�?`EqualizerSettingsDialog.tsx`
- Placeholder scan:
  - 没有 `TODO`、`TBD`、`later`
  - 每个测试和代码步骤都给了具体命令或代码骨�?- Type consistency:
  - 统一使用 `playbackRuntime`
  - 统一使用 `normalizePlaybackOutputDeviceId`
  - 统一使用 `applyEqualizer(config)` 作为 runtime �?EQ 的入�?
