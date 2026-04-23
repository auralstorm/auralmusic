import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyRuntimeEnvironmentToRoot,
  RUNTIME_ARCH_ROOT_ATTRIBUTE,
  RUNTIME_BACKDROP_BLUR_ROOT_ATTRIBUTE,
  RUNTIME_PLATFORM_ROOT_ATTRIBUTE,
} from '../src/renderer/theme/runtime-platform.ts'

test('applyRuntimeEnvironmentToRoot marks intel mac roots to disable backdrop blur', () => {
  const root = {
    dataset: {} as DOMStringMap,
  }

  applyRuntimeEnvironmentToRoot(root, {
    getPlatform: () => 'darwin',
    getArch: () => 'x64',
  })

  assert.equal(root.dataset.runtimePlatform, 'darwin')
  assert.equal(root.dataset.runtimeArch, 'x64')
  assert.equal(root.dataset.backdropBlur, 'disabled')
})

test('applyRuntimeEnvironmentToRoot keeps backdrop blur enabled for non-intel runtimes', () => {
  const root = {
    dataset: {} as DOMStringMap,
  }

  applyRuntimeEnvironmentToRoot(root, {
    getPlatform: () => 'darwin',
    getArch: () => 'arm64',
  })

  assert.equal(root.dataset.runtimePlatform, 'darwin')
  assert.equal(root.dataset.runtimeArch, 'arm64')
  assert.equal(root.dataset.backdropBlur, 'enabled')
})

test('runtime root attribute names match the css selector contract', () => {
  assert.equal(RUNTIME_PLATFORM_ROOT_ATTRIBUTE, 'data-runtime-platform')
  assert.equal(RUNTIME_ARCH_ROOT_ATTRIBUTE, 'data-runtime-arch')
  assert.equal(RUNTIME_BACKDROP_BLUR_ROOT_ATTRIBUTE, 'data-backdrop-blur')
})
