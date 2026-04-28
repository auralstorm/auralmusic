import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeRendererLogPayload,
  writeRendererLogPayload,
} from '../src/main/logging/logging-ipc.model.ts'

test('normalizeRendererLogPayload rejects unsupported levels', () => {
  assert.equal(
    normalizeRendererLogPayload({
      level: 'trace',
      scope: 'renderer',
      message: 'bad level',
    }),
    null
  )
})

test('normalizeRendererLogPayload sanitizes renderer metadata', () => {
  const payload = normalizeRendererLogPayload({
    level: 'error',
    scope: 'playback',
    message: 'failed',
    meta: {
      token: 'secret',
      sourceUrl: 'https://cdn.example.com/song.mp3?token=secret',
    },
  })

  assert.deepEqual(payload, {
    level: 'error',
    scope: 'renderer:playback',
    message: 'failed',
    meta: {
      token: '[redacted]',
      sourceUrl: '[redacted-url]',
    },
  })
})

test('writeRendererLogPayload dispatches to the scoped level logger', () => {
  const calls: Array<unknown[]> = []
  const result = writeRendererLogPayload(
    {
      level: 'info',
      scope: 'download',
      message: 'queued',
      meta: { taskId: 'task-1' },
    },
    scope => ({
      debug: (...args: unknown[]) => calls.push([scope, 'debug', ...args]),
      info: (...args: unknown[]) => calls.push([scope, 'info', ...args]),
      warn: (...args: unknown[]) => calls.push([scope, 'warn', ...args]),
      error: (...args: unknown[]) => calls.push([scope, 'error', ...args]),
    })
  )

  assert.equal(result, true)
  assert.deepEqual(calls, [
    ['renderer:download', 'info', 'queued', { taskId: 'task-1' }],
  ])
})
