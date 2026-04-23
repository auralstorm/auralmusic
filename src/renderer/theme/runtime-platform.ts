import type { RuntimeApi } from '@preload/api/runtime-api'
import type { RuntimeEnvironmentRoot } from '@/types/core'

export const RUNTIME_PLATFORM_ROOT_ATTRIBUTE = 'data-runtime-platform'
export const RUNTIME_ARCH_ROOT_ATTRIBUTE = 'data-runtime-arch'
export const RUNTIME_BACKDROP_BLUR_ROOT_ATTRIBUTE = 'data-backdrop-blur'

export function shouldDisableBackdropBlurForRuntime(
  platform: string | undefined,
  arch: string | undefined
) {
  return platform === 'darwin' && arch === 'x64'
}

export function applyRuntimeEnvironmentToRoot(
  root: RuntimeEnvironmentRoot,
  runtime: Pick<RuntimeApi, 'getPlatform' | 'getArch'> | null | undefined
) {
  const platform = runtime?.getPlatform() ?? 'unknown'
  const arch = runtime?.getArch() ?? 'unknown'

  root.dataset.runtimePlatform = platform
  root.dataset.runtimeArch = arch
  root.dataset.backdropBlur = shouldDisableBackdropBlurForRuntime(
    platform,
    arch
  )
    ? 'disabled'
    : 'enabled'
}
