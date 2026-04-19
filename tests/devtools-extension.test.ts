import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadDevelopmentDevToolsExtension,
  resolveChromeExtensionVersionPath,
} from '../src/main/app/devtools-extension.ts'

test('resolveChromeExtensionVersionPath picks the newest extension version folder', async () => {
  const resolvedPath = await resolveChromeExtensionVersionPath({
    extensionRootPath:
      'C:\\Users\\s1769\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\fmkadmapgofadopljbjfkapdkoienihi',
    readDirectoryNames: async () => ['6.9.0_0', '7.0.1_0', '5.1.2_0'],
  })

  assert.equal(
    resolvedPath,
    'C:\\Users\\s1769\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\fmkadmapgofadopljbjfkapdkoienihi\\7.0.1_0'
  )
})

test('loadDevelopmentDevToolsExtension skips packaged apps', async () => {
  const calls: string[] = []

  const loadedPath = await loadDevelopmentDevToolsExtension({
    appIsPackaged: true,
    extensionRootPath: 'C:\\extensions\\react-devtools',
    readDirectoryNames: async () => {
      calls.push('read-directory')
      return ['7.0.1_0']
    },
    loadExtension: async extensionPath => {
      calls.push(`load:${extensionPath}`)
    },
  })

  assert.equal(loadedPath, null)
  assert.deepEqual(calls, [])
})

test('loadDevelopmentDevToolsExtension loads the newest version directory with file access', async () => {
  const calls: string[] = []

  const loadedPath = await loadDevelopmentDevToolsExtension({
    appIsPackaged: false,
    extensionRootPath: 'C:\\extensions\\react-devtools',
    readDirectoryNames: async () => ['6.9.0_0', '7.0.1_0'],
    loadExtension: async (extensionPath, options) => {
      calls.push(`load:${extensionPath}`)
      assert.deepEqual(options, { allowFileAccess: true })
    },
  })

  assert.equal(loadedPath, 'C:\\extensions\\react-devtools\\7.0.1_0')
  assert.deepEqual(calls, ['load:C:\\extensions\\react-devtools\\7.0.1_0'])
})
