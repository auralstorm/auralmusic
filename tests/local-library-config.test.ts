import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultConfig,
  normalizeLocalLibraryOnlineLyricMatchEnabled,
  normalizeLocalLibraryRoots,
  normalizeLocalLibraryScanFormats,
  normalizeShowLocalLibraryMenu,
} from '../src/shared/config.ts'

test('default local library config keeps menu visible and roots empty', () => {
  assert.equal(defaultConfig.showLocalLibraryMenu, true)
  assert.deepEqual(defaultConfig.localLibraryRoots, [])
  assert.deepEqual(defaultConfig.localLibraryScanFormats, [
    'mp3',
    'flac',
    'm4a',
    'aac',
    'ogg',
    'wav',
  ])
  assert.equal(defaultConfig.localLibraryOnlineLyricMatchEnabled, false)
})

test('normalizeShowLocalLibraryMenu falls back to default for invalid values', () => {
  assert.equal(normalizeShowLocalLibraryMenu(false), false)
  assert.equal(
    normalizeShowLocalLibraryMenu('hidden'),
    defaultConfig.showLocalLibraryMenu
  )
})

test('normalizeLocalLibraryRoots trims, deduplicates, and drops invalid values', () => {
  assert.deepEqual(
    normalizeLocalLibraryRoots([
      '  D:\\Music  ',
      'D:\\Music',
      '',
      null,
      'E:\\Podcasts',
    ]),
    ['D:\\Music', 'E:\\Podcasts']
  )
})

test('normalizeLocalLibraryScanFormats keeps valid selections and falls back to all formats when empty', () => {
  assert.deepEqual(normalizeLocalLibraryScanFormats(['flac', 'mp3', 'flac']), [
    'flac',
    'mp3',
  ])
  assert.deepEqual(normalizeLocalLibraryScanFormats([]), [
    'mp3',
    'flac',
    'm4a',
    'aac',
    'ogg',
    'wav',
  ])
})

test('normalizeLocalLibraryOnlineLyricMatchEnabled falls back to disabled', () => {
  assert.equal(normalizeLocalLibraryOnlineLyricMatchEnabled(true), true)
  assert.equal(
    normalizeLocalLibraryOnlineLyricMatchEnabled('enabled'),
    defaultConfig.localLibraryOnlineLyricMatchEnabled
  )
})
