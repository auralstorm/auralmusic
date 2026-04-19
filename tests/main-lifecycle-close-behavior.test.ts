import assert from 'node:assert/strict'
import test from 'node:test'

import { registerMainAppLifecycle } from '../src/main/app/lifecycle.ts'

test('registerMainAppLifecycle quits on macOS when configured to quit on last window close', () => {
  const handlers = new Map<string, () => void>()
  const calls: string[] = []

  registerMainAppLifecycle({
    app: {
      on: (event, handler) => {
        handlers.set(event, handler)
      },
      quit: () => calls.push('quit'),
    },
    platform: 'darwin',
    getMainWindow: () => null,
    getWindowCount: () => 0,
    showMainWindow: () => calls.push('show'),
    createWindow: () => calls.push('create'),
    shouldQuitOnWindowAllClosed: () => true,
    setIsQuitting: value => calls.push(`set-quitting:${value}`),
    disposeMusicApiRuntime: () => calls.push('dispose-runtime'),
    destroyTray: () => calls.push('destroy-tray'),
    clearConfiguredGlobalShortcuts: () => calls.push('clear-shortcuts'),
  })

  handlers.get('window-all-closed')?.()

  assert.deepEqual(calls, ['quit'])
})
