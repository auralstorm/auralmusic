# UserData Store Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move auth, config, and download persistence from repository-root JSON files to the Electron `userData` directory without changing their runtime APIs.

**Architecture:** Add one shared main-process helper that resolves the `electron-store` directory from `app.getPath('userData')`, then refactor the three store modules to consume that helper through testable store-option builders. Remove module-import side effects by making store singletons lazy, so tests can import the builders without booting real `electron-store` instances during module evaluation.

**Tech Stack:** Electron main process, `electron-store`, TypeScript, `node:test`, `pnpm lint`

---

## File Structure

- Create: `src/main/storage/store-path.ts`
  Responsibility: resolve the shared `userData`-based store directory and fail loudly if Electron cannot provide it.
- Modify: `src/main/auth/store.ts`
  Responsibility: replace `cwd: process.cwd()` with the shared helper, expose a testable auth-store options builder, and make auth-store access lazy.
- Modify: `src/main/config/store.ts`
  Responsibility: replace `cwd: process.cwd()` with the shared helper, expose a testable config-store options builder, and make config-store access lazy.
- Modify: `src/main/download/store.ts`
  Responsibility: replace `cwd: process.cwd()` with the shared helper, expose a testable download-store options builder, and make download-store access lazy.
- Create: `tests/store-path.test.ts`
  Responsibility: verify the shared helper uses `userData` and rejects blank/invalid values.
- Create: `tests/store-location.test.ts`
  Responsibility: verify auth/config/download store options all resolve to the same `userData` directory and preserve their names/defaults/schema.

### Task 1: Add The Shared userData Store Path Helper

**Files:**

- Create: `src/main/storage/store-path.ts`
- Test: `tests/store-path.test.ts`

- [ ] **Step 1: Write the failing tests for `userData` path resolution**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAppStoreDirectory } from '../src/main/storage/store-path.ts'

test('resolveAppStoreDirectory returns the Electron userData directory', () => {
  const directory = resolveAppStoreDirectory(name => {
    assert.equal(name, 'userData')
    return 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic'
  })

  assert.equal(directory, 'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic')
})

test('resolveAppStoreDirectory throws when Electron userData is blank', () => {
  assert.throws(
    () => resolveAppStoreDirectory(() => '   '),
    /userData directory/i
  )
})
```

- [ ] **Step 2: Run the new helper test to verify it fails first**

Run: `node --test tests/store-path.test.ts`
Expected: FAIL with `Cannot find module '../src/main/storage/store-path.ts'`.

- [ ] **Step 3: Implement the shared `userData` path helper**

```ts
// src/main/storage/store-path.ts
import electron from 'electron'

const { app } = electron

export type UserDataPathGetter = (name: 'userData') => string

export function resolveAppStoreDirectory(
  appGetPath: UserDataPathGetter = name => app.getPath(name)
) {
  const directory = appGetPath('userData')

  if (typeof directory !== 'string' || !directory.trim()) {
    throw new Error('Failed to resolve Electron userData directory')
  }

  return directory
}
```

- [ ] **Step 4: Re-run the helper test until it passes**

Run: `node --test tests/store-path.test.ts`
Expected: PASS for both the happy-path and blank-path tests.

- [ ] **Step 5: Commit the shared path helper**

```bash
git add tests/store-path.test.ts src/main/storage/store-path.ts
git commit -m "refactor: add shared userdata store path helper"
```

### Task 2: Refactor Auth, Config, And Download Stores To Use The Shared Helper

**Files:**

- Modify: `src/main/auth/store.ts`
- Modify: `src/main/config/store.ts`
- Modify: `src/main/download/store.ts`
- Test: `tests/store-location.test.ts`

- [ ] **Step 1: Write the failing tests for the three store option builders**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { AUTH_STORE_NAME } from '../src/main/auth/types.ts'
import { buildAuthStoreOptions } from '../src/main/auth/store.ts'
import { buildConfigStoreOptions } from '../src/main/config/store.ts'
import { buildDownloadStoreOptions } from '../src/main/download/store.ts'

const resolveStoreDirectory = () =>
  'C:\\Users\\tester\\AppData\\Roaming\\AuralMusic'

test('all persistent stores use the shared userData directory', () => {
  const authOptions = buildAuthStoreOptions(resolveStoreDirectory)
  const configOptions = buildConfigStoreOptions(resolveStoreDirectory)
  const downloadOptions = buildDownloadStoreOptions(resolveStoreDirectory)

  assert.equal(authOptions.cwd, resolveStoreDirectory())
  assert.equal(configOptions.cwd, resolveStoreDirectory())
  assert.equal(downloadOptions.cwd, resolveStoreDirectory())
})

test('store option builders preserve their existing identity and defaults', () => {
  const authOptions = buildAuthStoreOptions(resolveStoreDirectory)
  const configOptions = buildConfigStoreOptions(resolveStoreDirectory)
  const downloadOptions = buildDownloadStoreOptions(resolveStoreDirectory)

  assert.equal(authOptions.name, AUTH_STORE_NAME)
  assert.equal(configOptions.name, 'aural-music-config')
  assert.equal(downloadOptions.name, 'aural-music-downloads')
  assert.deepEqual(downloadOptions.defaults, { tasks: [] })
  assert.equal(configOptions.schema?.playbackVolume?.type, 'number')
})
```

- [ ] **Step 2: Run the store-location test to verify it fails before the refactor**

Run: `node --test tests/store-location.test.ts`
Expected: FAIL because the `build*StoreOptions` exports do not exist yet, or because importing the modules still triggers eager singleton initialization.

- [ ] **Step 3: Refactor the three store modules to use testable option builders and lazy singletons**

```ts
// src/main/auth/store.ts
import { resolveAppStoreDirectory } from '../storage/store-path'

export function buildAuthStoreOptions(
  resolveStoreDirectory = resolveAppStoreDirectory
) {
  return {
    cwd: resolveStoreDirectory(),
    name: AUTH_STORE_NAME,
    defaults: DEFAULT_AUTH_STATE,
  }
}

function createAuthStore() {
  return new Store<AuthStoreSchema>(buildAuthStoreOptions())
}

function getAuthStore() {
  return AuthStore.getInstance()
}

export function getAuthSession() {
  return getAuthStore().get('session')
}

export async function setAuthSession(authSession: AuthSession) {
  getAuthStore().set('session', authSession)
  await applyAuthCookies(authSession)
  return authSession
}

export async function clearAuthSession() {
  const currentSession = getAuthStore().get('session')
  await clearAuthCookies(currentSession)
  getAuthStore().set('session', null)
}
```

```ts
// src/main/config/store.ts
import { resolveAppStoreDirectory } from '../storage/store-path.ts'

const CONFIG_STORE_SCHEMA = {
  theme: { type: 'string', enum: ['light', 'dark', 'system'] },
  themeColor: {
    anyOf: [{ type: 'string' }, { type: 'null' }],
  },
  playbackVolume: { type: 'number', minimum: 0, maximum: 100 },
}

export function buildConfigStoreOptions(
  resolveStoreDirectory = resolveAppStoreDirectory
) {
  return {
    cwd: resolveStoreDirectory(),
    name: 'aural-music-config',
    defaults: defaultConfig,
    schema: CONFIG_STORE_SCHEMA,
  }
}

function createConfigStore() {
  return new Store<AppConfig>(buildConfigStoreOptions())
}

function getConfigStore() {
  return ConfigStore.getInstance()
}

export const getConfig = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
  return getConfigStore().get(key)
}

export const setConfig = <K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void => {
  getConfigStore().set(key, value)
}

export const resetConfig = (): void => {
  getConfigStore().reset()
}
```

```ts
// src/main/download/store.ts
import { resolveAppStoreDirectory } from '../storage/store-path.ts'

export function buildDownloadStoreOptions(
  resolveStoreDirectory = resolveAppStoreDirectory
) {
  return {
    cwd: resolveStoreDirectory(),
    name: 'aural-music-downloads',
    defaults: {
      tasks: [],
    },
  }
}

function createDownloadStore() {
  return new Store<DownloadStoreSchema>(buildDownloadStoreOptions())
}

function getDownloadStore() {
  return DownloadStore.getInstance()
}

export function getPersistedDownloadTasks() {
  return getDownloadStore().get('tasks') || []
}

export function setPersistedDownloadTasks(tasks: DownloadTask[]) {
  getDownloadStore().set('tasks', tasks)
}
```

- [ ] **Step 4: Re-run the store-location test after the refactor**

Run: `node --test tests/store-location.test.ts`
Expected: PASS, proving all three stores now resolve through the same `userData` directory and preserve their existing names/defaults/schema.

- [ ] **Step 5: Commit the store refactor**

```bash
git add tests/store-location.test.ts src/main/auth/store.ts src/main/config/store.ts src/main/download/store.ts
git commit -m "refactor: move app stores to userdata"
```

### Task 3: Run Final Verification And Manual Checks

**Files:**

- Modify: `src/main/storage/store-path.ts`
- Modify: `src/main/auth/store.ts`
- Modify: `src/main/config/store.ts`
- Modify: `src/main/download/store.ts`
- Modify: `tests/store-path.test.ts`
- Modify: `tests/store-location.test.ts`

- [ ] **Step 1: Run the targeted automated verification suite**

Run: `node --test tests/store-path.test.ts tests/store-location.test.ts tests/config-types.test.ts`
Expected: PASS, with the new helper/store-location tests green and existing config defaults still unchanged.

- [ ] **Step 2: Run lint against the repository**

Run: `pnpm lint`
Expected: PASS, with no new lint errors introduced by the store-location cleanup.

- [ ] **Step 3: Run a manual persistence smoke test**

Manual steps:

1. Start the app.
2. Log in once so auth state is written.
3. Change one visible setting so config state is written.
4. Change the download task list so download persistence is written.
5. Verify the updated JSON files are created under Electron `userData`.

- [ ] **Step 4: Verify the repository root no longer receives store writes**

Manual steps:

1. Keep the app running after the previous step.
2. Watch the repository root for `aural-music-auth.json`, `aural-music-config.json`, and `aural-music-downloads.json`.
3. Trigger another auth/config/download write.
4. Confirm the repository-root files are not created or updated by the app anymore.

- [ ] **Step 5: Commit the verified change set**

```bash
git add tests/store-path.test.ts tests/store-location.test.ts src/main/storage/store-path.ts src/main/auth/store.ts src/main/config/store.ts src/main/download/store.ts
git commit -m "refactor: store app data under userdata"
```
