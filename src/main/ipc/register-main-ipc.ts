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
  registerMusicSourceIpc: () => void
  registerShortcutIpc: () => void
  registerSystemFontsIpc: () => void
  registerTrayIpc: (options: TrayIpcOptions) => void
  registerUpdateIpc: () => void
  registerWindowIpc: (options: WindowIpcOptions) => void
}

export function createRegisterMainIpc(
  dependencies: RegisterMainIpcDependencies
) {
  return function registerMainIpc(options: RegisterMainIpcOptions) {
    dependencies.registerConfigIpc({
      onShortcutConfigChange: options.onShortcutConfigChange,
      onAutoStartConfigChange: options.onAutoStartConfigChange,
    })
    dependencies.registerAuthIpc()
    dependencies.registerCacheIpc()
    dependencies.registerDownloadIpc()
    dependencies.registerLocalLibraryIpc?.()
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
