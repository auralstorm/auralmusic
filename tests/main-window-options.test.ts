import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import {
  createMainWindowOptions,
  resolveMainWindowIconPath,
} from '../src/main/window/main-window.ts'

test('createMainWindowOptions preserves current Windows window options', () => {
  const mainDirname = path.join('F:', 'app', 'out', 'main')
  const options = createMainWindowOptions({
    platform: 'win32',
    preloadPath: 'F:\\app\\out\\preload\\index.cjs',
    mainDirname,
    appIsPackaged: false,
  })

  assert.equal(options.width, 1280)
  assert.equal(options.height, 760)
  assert.equal(options.minWidth, 1280)
  assert.equal(options.minHeight, 760)
  assert.equal(options.frame, false)
  assert.equal(options.maximizable, false)
  assert.equal(options.titleBarStyle, undefined)
  assert.equal(options.titleBarOverlay, false)
  assert.equal(options.autoHideMenuBar, true)
  assert.equal(
    options.icon,
    path.join('F:', 'app', 'build', 'icons', 'icon.ico')
  )
  assert.deepEqual(options.webPreferences, {
    preload: 'F:\\app\\out\\preload\\index.cjs',
    contextIsolation: true,
    nodeIntegration: false,
    devTools: true,
  })
})

test('createMainWindowOptions preserves current macOS titlebar behavior', () => {
  const options = createMainWindowOptions({
    platform: 'darwin',
    preloadPath: '/app/out/preload/index.cjs',
    mainDirname: '/app/out/main',
    appIsPackaged: false,
  })

  assert.equal(options.frame, true)
  assert.equal(options.titleBarStyle, 'hiddenInset')
  assert.equal(options.titleBarOverlay, false)
})

test('createMainWindowOptions preserves current Linux titlebar behavior', () => {
  const options = createMainWindowOptions({
    platform: 'linux',
    preloadPath: '/app/out/preload/index.cjs',
    mainDirname: '/app/out/main',
    appIsPackaged: false,
  })

  assert.equal(options.frame, true)
  assert.equal(options.titleBarStyle, 'hidden')
  assert.equal(options.titleBarOverlay, true)
})

test('resolveMainWindowIconPath uses build icons in development', () => {
  assert.equal(
    resolveMainWindowIconPath({
      appIsPackaged: false,
      mainDirname: path.join('F:', 'code-demo', 'auralmusic', 'out', 'main'),
    }),
    path.join('F:', 'code-demo', 'auralmusic', 'build', 'icons', 'icon.ico')
  )
})

test('resolveMainWindowIconPath uses resources path when packaged', () => {
  assert.equal(
    resolveMainWindowIconPath({
      appIsPackaged: true,
      mainDirname: 'ignored',
      resourcesPath: path.join('F:', 'AuralMusic', 'resources'),
    }),
    path.join('F:', 'AuralMusic', 'resources', 'build', 'icons', 'icon.ico')
  )
})
