import assert from 'node:assert/strict'
import test from 'node:test'

import { createRendererLogger } from '../src/renderer/lib/logger.ts'

test('renderer logger forwards scoped logs through preload logger api', () => {
  const calls: Array<unknown[]> = []
  const logger = createRendererLogger('playback-source', {
    target: {
      appRuntime: {
        getPlatform: () => 'win32',
        getArch: () => 'x64',
        getAppVersion: () => '1.2.3',
        getMusicApiBaseUrl: () => undefined,
      },
      electronLogger: {
        debug: (...args: unknown[]) => calls.push(['debug', ...args]),
        info: (...args: unknown[]) => calls.push(['info', ...args]),
        warn: (...args: unknown[]) => calls.push(['warn', ...args]),
        error: (...args: unknown[]) => calls.push(['error', ...args]),
        getLogFilePath: async () => '',
        openLogDirectory: async () => false,
      },
    },
  })

  logger.error('load song url failed', { trackId: 101 })

  assert.deepEqual(calls, [
    [
      'error',
      'playback-source',
      'load song url failed',
      {
        trackId: 101,
        runtime: {
          appVersion: '1.2.3',
          arch: 'x64',
          platform: 'win32',
          process: 'renderer',
        },
      },
    ],
  ])
})

test('renderer logger falls back to console when preload logger is unavailable', () => {
  const calls: Array<unknown[]> = []
  const logger = createRendererLogger('search', {
    target: {},
    fallbackConsole: {
      debug: (...args: unknown[]) => calls.push(['debug', ...args]),
      info: (...args: unknown[]) => calls.push(['info', ...args]),
      warn: (...args: unknown[]) => calls.push(['warn', ...args]),
      error: (...args: unknown[]) => calls.push(['error', ...args]),
    },
  })

  logger.warn('search failed', { keyword: 'demo' })

  assert.equal(calls[0]?.[0], 'warn')
  assert.equal(calls[0]?.[1], '[search]')
  assert.equal(calls[0]?.[2], 'search failed')
  assert.deepEqual(calls[0]?.[3], { keyword: 'demo' })
})
