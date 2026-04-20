import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeAuthSession, parseCookiePairs } from '../src/shared/auth.ts'

test('normalizeAuthSession maps login payload into persisted auth state', () => {
  const session = normalizeAuthSession(
    {
      data: {
        code: 200,
        cookie: 'MUSIC_U=abc123; __remember_me=true; Path=/',
        account: {
          id: 9988,
        },
        profile: {
          nickname: 'VibeMusic',
          avatarUrl: 'https://img.example.com/avatar.jpg',
        },
      },
    },
    'email',
    1741392000000
  )

  assert.deepEqual(session, {
    cookie: 'MUSIC_U=abc123; __remember_me=true; Path=/',
    loginMethod: 'email',
    updatedAt: 1741392000000,
    userId: 9988,
    nickname: 'VibeMusic',
    avatarUrl: 'https://img.example.com/avatar.jpg',
  })
})

test('parseCookiePairs ignores cookie attributes and keeps cookie entries', () => {
  assert.deepEqual(
    parseCookiePairs('MUSIC_U=abc123; __remember_me=true; Path=/; HttpOnly'),
    [
      { name: 'MUSIC_U', value: 'abc123' },
      { name: '__remember_me', value: 'true' },
    ]
  )
})
