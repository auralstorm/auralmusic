import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_PLAYBACK_RUNTIME_ERROR,
  classifyPlaybackRuntimeError,
  isEqualizerGraphCompatibleSourceUrl,
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

test('isEqualizerGraphCompatibleSourceUrl only allows app-controlled audio sources', () => {
  assert.equal(
    isEqualizerGraphCompatibleSourceUrl(
      'auralmusic-media://local-file?path=F%3A%5CMusic%5Ca.mp3'
    ),
    true
  )
  assert.equal(
    isEqualizerGraphCompatibleSourceUrl('blob:http://localhost/audio-id'),
    true
  )
  assert.equal(
    isEqualizerGraphCompatibleSourceUrl('data:audio/mpeg;base64,AAAA'),
    true
  )
  assert.equal(
    isEqualizerGraphCompatibleSourceUrl('https://cdn.example.com/a.mp3'),
    false
  )
  assert.equal(
    isEqualizerGraphCompatibleSourceUrl('file:///F:/Music/a.mp3'),
    false
  )
  assert.equal(isEqualizerGraphCompatibleSourceUrl(''), false)
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
