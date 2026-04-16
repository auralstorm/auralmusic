import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isAuthenticatedForMusicResolution,
  type MusicSourceAuthSnapshot,
} from '../src/shared/music-source/auth-state.ts'

function createSnapshot(
  overrides: Partial<MusicSourceAuthSnapshot> = {}
): MusicSourceAuthSnapshot {
  return {
    loginStatus: 'anonymous',
    userId: null,
    cookie: '',
    ...overrides,
  }
}

test('isAuthenticatedForMusicResolution returns true for authenticated login status', () => {
  assert.equal(
    isAuthenticatedForMusicResolution(
      createSnapshot({ loginStatus: 'authenticated' })
    ),
    true
  )
})

test('isAuthenticatedForMusicResolution returns true for persisted cookie', () => {
  assert.equal(
    isAuthenticatedForMusicResolution(
      createSnapshot({ cookie: 'MUSIC_U=token' })
    ),
    true
  )
})

test('isAuthenticatedForMusicResolution returns true for persisted user id', () => {
  assert.equal(
    isAuthenticatedForMusicResolution(createSnapshot({ userId: 42 })),
    true
  )
})

test('isAuthenticatedForMusicResolution returns false when all auth signals are missing', () => {
  assert.equal(isAuthenticatedForMusicResolution(createSnapshot()), false)
})

test('isAuthenticatedForMusicResolution ignores blank cookies and zero user ids', () => {
  assert.equal(
    isAuthenticatedForMusicResolution(
      createSnapshot({ cookie: '   ', userId: 0 })
    ),
    false
  )
})
