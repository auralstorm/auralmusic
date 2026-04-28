import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeAuthSession,
  normalizeVipState,
  parseCookiePairs,
} from '../src/shared/auth.ts'

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
    isVip: false,
    loginMethod: 'email',
    updatedAt: 1741392000000,
    userId: 9988,
    nickname: 'VibeMusic',
    avatarUrl: 'https://img.example.com/avatar.jpg',
    vipUpdatedAt: 1741392000000,
  })
})

test('normalizeVipState detects vip membership from vip info payload', () => {
  const vipState = normalizeVipState(
    {
      data: {
        data: {
          redVipLevel: 7,
          musicPackage: {
            vipLevel: 7,
          },
        },
      },
    },
    1741392000000
  )

  assert.deepEqual(vipState, {
    isVip: true,
    vipUpdatedAt: 1741392000000,
  })
})

test('normalizeVipState falls back to non-vip when payload is empty', () => {
  const vipState = normalizeVipState(null, 1741392000000)

  assert.deepEqual(vipState, {
    isVip: false,
    vipUpdatedAt: 1741392000000,
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
