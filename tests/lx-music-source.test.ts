import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isProbablyLxMusicSourceScript,
  normalizeImportedLxMusicSource,
  normalizeImportedLxMusicSources,
  parseLxScriptInfo,
  resolveActiveLxMusicSourceScriptId,
} from '../src/shared/lx-music-source.ts'

test('parseLxScriptInfo reads lx script metadata from userscript header', () => {
  const info = parseLxScriptInfo(`
/**
 * @name My LX Source
 * @description Resolve music urls
 * @version 1.2.3
 * @author Alice
 * @homepage https://example.com
 */
globalThis.lx.send(globalThis.lx.EVENT_NAMES.inited, { sources: {} })
`)

  assert.deepEqual(info, {
    name: 'My LX Source',
    description: 'Resolve music urls',
    version: '1.2.3',
    author: 'Alice',
    homepage: 'https://example.com',
  })
})

test('parseLxScriptInfo falls back to unknown name when header is missing', () => {
  assert.deepEqual(parseLxScriptInfo('console.log("hello")'), {
    name: '未知音源',
  })
})

test('normalizeImportedLxMusicSource rejects invalid persisted values', () => {
  assert.equal(normalizeImportedLxMusicSource(null), null)
  assert.equal(normalizeImportedLxMusicSource({ id: '', name: 'A' }), null)

  assert.deepEqual(
    normalizeImportedLxMusicSource({
      id: 'source-1',
      name: 'A',
      fileName: 'a.js',
      createdAt: 1,
      updatedAt: 2,
      version: 3,
      extra: 'ignored',
    }),
    {
      id: 'source-1',
      name: 'A',
      fileName: 'a.js',
      createdAt: 1,
      updatedAt: 2,
    }
  )
})

test('normalizeImportedLxMusicSources filters invalid items and migrates legacy script', () => {
  const legacyScript = {
    id: 'legacy',
    name: 'Legacy Source',
    fileName: 'legacy.js',
    createdAt: 1,
    updatedAt: 2,
  }

  assert.deepEqual(
    normalizeImportedLxMusicSources(
      [
        null,
        { id: '', name: 'Invalid' },
        {
          id: 'source-1',
          name: 'Source 1',
          fileName: 'source-1.js',
          createdAt: 3,
          updatedAt: 4,
          sources: ['kw', 'mg', 1],
        },
      ],
      legacyScript
    ),
    [
      {
        id: 'source-1',
        name: 'Source 1',
        fileName: 'source-1.js',
        sources: ['kw', 'mg'],
        createdAt: 3,
        updatedAt: 4,
      },
    ]
  )

  assert.deepEqual(normalizeImportedLxMusicSources(undefined, legacyScript), [
    legacyScript,
  ])
})

test('resolveActiveLxMusicSourceScriptId falls back to the first available script', () => {
  const scripts = [
    {
      id: 'source-1',
      name: 'Source 1',
      fileName: 'source-1.js',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'source-2',
      name: 'Source 2',
      fileName: 'source-2.js',
      createdAt: 2,
      updatedAt: 2,
    },
  ]

  assert.equal(
    resolveActiveLxMusicSourceScriptId('source-2', scripts),
    'source-2'
  )
  assert.equal(
    resolveActiveLxMusicSourceScriptId('missing', scripts),
    'source-1'
  )
  assert.equal(resolveActiveLxMusicSourceScriptId(null, []), null)
})

test('isProbablyLxMusicSourceScript accepts header-only and lx api scripts', () => {
  assert.equal(
    isProbablyLxMusicSourceScript('/**\n * @name A\n */\nconsole.log(1)'),
    true
  )
  assert.equal(
    isProbablyLxMusicSourceScript('lx.on(lx.EVENT_NAMES.request, () => {})'),
    true
  )
  assert.equal(isProbablyLxMusicSourceScript('console.log("plain")'), false)
})
