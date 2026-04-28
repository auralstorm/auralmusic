type ConfigIpcOptions = {
  onShortcutConfigChange?: () => void
  onAutoStartConfigChange?: (enabled: boolean) => void
}

type TrayIpcOptions = {
  trayController: unknown
}

type WindowIpcOptions = {
  onQuitRequested?: () => void
}

type RegisterMainIpcOptions = ConfigIpcOptions &
  TrayIpcOptions &
  WindowIpcOptions

type RegisterMainIpcDependencies = {
  registerAuthIpc: () => void
  registerCacheIpc: () => void
  registerConfigIpc: (options: ConfigIpcOptions) => void
  registerDownloadIpc: () => void
  registerLocalLibraryIpc?: () => void
  registerLoggingIpc: () => void
  registerMusicSourceIpc: () => void
  registerShortcutIpc: () => void
  registerSystemFontsIpc: () => void
  registerTrayIpc: (options: TrayIpcOptions) => void
  registerUpdateIpc: () => void
  registerWindowIpc: (options: WindowIpcOptions) => void
}

/**
 * 创建主进程 IPC 注册器。
 *
 * 通过依赖注入接收各模块 register 函数，bootstrap 只负责装配；新增 IPC 模块时在这里集中接入，
 * 可以避免 scattered registration 导致通道重复或遗漏。
 */
export function createRegisterMainIpc(
  dependencies: RegisterMainIpcDependencies
) {
  return function registerMainIpc(options: RegisterMainIpcOptions) {
    // 配置 IPC 最先注册，因为后续快捷键、自启和主题都可能由配置变更触发副作用。
    dependencies.registerConfigIpc({
      onShortcutConfigChange: options.onShortcutConfigChange,
      onAutoStartConfigChange: options.onAutoStartConfigChange,
    })
    dependencies.registerAuthIpc()
    dependencies.registerCacheIpc()
    dependencies.registerDownloadIpc()
    // 本地曲库模块在部分测试环境中可选，生产 bootstrap 会提供真实注册函数。
    dependencies.registerLocalLibraryIpc?.()
    dependencies.registerLoggingIpc()
    dependencies.registerMusicSourceIpc()
    dependencies.registerShortcutIpc()
    dependencies.registerSystemFontsIpc()
    dependencies.registerTrayIpc({
      trayController: options.trayController,
    })
    dependencies.registerUpdateIpc()
    dependencies.registerWindowIpc({
      onQuitRequested: options.onQuitRequested,
    })
  }
}
