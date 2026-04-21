import assert from 'node:assert/strict'
import test from 'node:test'

import { createRegisterMainIpc } from '../src/main/ipc/register-main-ipc.ts'

test('createRegisterMainIpc registers every main ipc module with supplied options', () => {
  const calls: string[] = []
  const trayController = { initialize: () => undefined }
  const onShortcutConfigChange = () => undefined
  const onAutoStartConfigChange = () => undefined
  const onQuitRequested = () => undefined

  const registerMainIpc = createRegisterMainIpc({
    registerAuthIpc: () => calls.push('auth'),
    registerCacheIpc: () => calls.push('cache'),
    registerConfigIpc: options => {
      calls.push('config')
      assert.equal(options.onShortcutConfigChange, onShortcutConfigChange)
      assert.equal(options.onAutoStartConfigChange, onAutoStartConfigChange)
    },
    registerDownloadIpc: () => calls.push('download'),
    registerMusicSourceIpc: () => calls.push('music-source'),
    registerShortcutIpc: () => calls.push('shortcut'),
    registerSystemFontsIpc: () => calls.push('system-fonts'),
    registerTrayIpc: options => {
      calls.push('tray')
      assert.equal(options.trayController, trayController)
    },
    registerUpdateIpc: () => calls.push('update'),
    registerWindowIpc: options => {
      calls.push('window')
      assert.equal(options.onQuitRequested, onQuitRequested)
    },
  })

  registerMainIpc({
    onShortcutConfigChange,
    onAutoStartConfigChange,
    trayController,
    onQuitRequested,
  })

  assert.deepEqual(calls, [
    'config',
    'auth',
    'cache',
    'download',
    'music-source',
    'shortcut',
    'system-fonts',
    'tray',
    'update',
    'window',
  ])
})
