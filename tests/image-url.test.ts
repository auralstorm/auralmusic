import test from 'node:test'
import assert from 'node:assert/strict'

import { resizeImageUrl } from '../src/renderer/lib/image-url.ts'

test('resizeImageUrl appends netease image param with width and height', () => {
  assert.equal(
    resizeImageUrl(
      'http://p4.music.126.net/JzNK4a5PjjPIXAgVlqEc5Q==/109951164154280311.jpg',
      200,
      120
    ),
    'http://p4.music.126.net/JzNK4a5PjjPIXAgVlqEc5Q==/109951164154280311.jpg?param=200y120'
  )
})

test('resizeImageUrl uses width as height when height is omitted', () => {
  assert.equal(
    resizeImageUrl(
      'http://p4.music.126.net/JzNK4a5PjjPIXAgVlqEc5Q==/109951164154280311.jpg',
      50
    ),
    'http://p4.music.126.net/JzNK4a5PjjPIXAgVlqEc5Q==/109951164154280311.jpg?param=50y50'
  )
})

test('resizeImageUrl replaces existing image param and keeps other query params', () => {
  assert.equal(
    resizeImageUrl(
      'https://p4.music.126.net/a.jpg?foo=bar&param=999y999',
      240,
      240
    ),
    'https://p4.music.126.net/a.jpg?foo=bar&param=240y240'
  )
})

test('resizeImageUrl leaves empty and local image urls unchanged', () => {
  assert.equal(resizeImageUrl('', 200, 200), '')
  assert.equal(
    resizeImageUrl('file:///cache/cover.webp', 200, 200),
    'file:///cache/cover.webp'
  )
  assert.equal(
    resizeImageUrl('data:image/png;base64,abc', 200, 200),
    'data:image/png;base64,abc'
  )
  assert.equal(
    resizeImageUrl('blob:http://localhost/cover', 200, 200),
    'blob:http://localhost/cover'
  )
})

test('resizeImageUrl leaves non-netease http image urls unchanged', () => {
  assert.equal(
    resizeImageUrl('https://img.example.com/a.jpg?token=abc', 200, 200),
    'https://img.example.com/a.jpg?token=abc'
  )
})

test('resizeImageUrl leaves unsupported dimensions unchanged', () => {
  assert.equal(
    resizeImageUrl('https://p4.music.126.net/a.jpg', 0, 200),
    'https://p4.music.126.net/a.jpg'
  )
  assert.equal(
    resizeImageUrl('https://p4.music.126.net/a.jpg', 200, Number.NaN),
    'https://p4.music.126.net/a.jpg'
  )
})
