import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeBuiltinPlatforms } from '../src/shared/music-source/builtin-platforms.ts'
import { buildResolverPolicy } from '../src/shared/music-source/policy.ts'
import type { ResolveContext } from '../src/shared/music-source/types.ts'

function createContext(
  overrides: Partial<ResolveContext> = {}
): ResolveContext {
  const baseConfig: ResolveContext['config'] = {
    musicSourceEnabled: true,
    musicSourceProviders: ['migu', 'lxMusic', 'pyncmd', 'migu', 'unknown'],
    luoxueSourceEnabled: true,
    customMusicApiEnabled: true,
    customMusicApiUrl: 'https://api.example.com',
    quality: 'higher',
  }

  return {
    scene: 'playback',
    isAuthenticated: false,
    isVip: false,
    trackFee: 0,
    ...overrides,
    config: {
      ...baseConfig,
      ...overrides.config,
    },
  }
}

test('normalizeBuiltinPlatforms filters unsupported values and removes duplicates', () => {
  assert.deepEqual(
    normalizeBuiltinPlatforms([
      'bilibili',
      'lxMusic',
      'migu',
      'bilibili',
      'invalid',
      'pyncmd',
      1,
      'kugou',
    ]),
    ['bilibili', 'migu', 'pyncmd', 'kugou']
  )
})

test('buildResolverPolicy uses authenticated resolver order and keeps builtin platforms normalized', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: true,
      isVip: true,
      config: {
        musicSourceProviders: ['kugou', 'lxMusic', 'migu', 'kugou', 'noop'],
      },
    })
  )

  assert.deepEqual(policy.builtinPlatforms, ['kugou', 'migu'])
  assert.deepEqual(policy.resolverOrder, [
    'official',
    'builtinUnblock',
    'lxMusic',
    'customApi',
  ])
})

test('buildResolverPolicy excludes lxMusic when luoxue source is disabled', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: true,
      isVip: true,
      config: {
        luoxueSourceEnabled: false,
        musicSourceProviders: ['kugou', 'migu', 'kugou'],
        customMusicApiEnabled: true,
        customMusicApiUrl: 'https://api.example.com',
      },
    })
  )

  assert.deepEqual(policy.builtinPlatforms, ['kugou', 'migu'])
  assert.deepEqual(policy.resolverOrder, [
    'official',
    'builtinUnblock',
    'customApi',
  ])
})

test('buildResolverPolicy uses unauthenticated resolver order and trims custom api url', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: false,
      config: {
        customMusicApiEnabled: true,
        customMusicApiUrl: '   ',
        luoxueSourceEnabled: true,
      },
    })
  )

  assert.deepEqual(policy.resolverOrder, ['builtinUnblock', 'lxMusic'])
})

test('buildResolverPolicy bypasses official for authenticated non-vip tracks with non-zero fee', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: true,
      isVip: false,
      trackFee: 1,
    })
  )

  assert.deepEqual(policy.resolverOrder, [
    'builtinUnblock',
    'lxMusic',
    'customApi',
  ])
})

test('buildResolverPolicy bypasses official for non-wy locked search results even when authenticated', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: true,
      isVip: true,
      lockedPlatform: 'tx',
      trackFee: 0,
    })
  )

  assert.deepEqual(policy.resolverOrder, ['lxMusic', 'customApi'])
})

test('buildResolverPolicy keeps official first for authenticated non-vip free tracks', () => {
  const policy = buildResolverPolicy(
    createContext({
      isAuthenticated: true,
      isVip: false,
      trackFee: 0,
    })
  )

  assert.deepEqual(policy.resolverOrder, [
    'official',
    'builtinUnblock',
    'lxMusic',
    'customApi',
  ])
})

test('buildResolverPolicy keeps only official when music source is disabled', () => {
  const policy = buildResolverPolicy(
    createContext({
      config: {
        musicSourceEnabled: false,
        musicSourceProviders: ['bilibili', 'migu', 'lxMusic', 'migu'],
      },
    })
  )

  assert.deepEqual(policy.builtinPlatforms, ['bilibili', 'migu'])
  assert.deepEqual(policy.resolverOrder, ['official'])
})
