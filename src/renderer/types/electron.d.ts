import type { ConfigApi } from '@preload/api/config-api'
import type { AuthApi } from '@preload/api/auth-api'
import type { RuntimeApi } from '@preload/api/runtime-api'
import type { WindowApi } from '@preload/api/window-api'
import type { MusicSourceApi } from '@preload/api/music-source-api'
import type { ShortcutApi } from '@preload/api/shortcut-api'
import type { CacheApi } from '@preload/api/cache-api'
import type { DownloadApi } from '@preload/api/download-api'
import type { LocalLibraryApi } from '@preload/api/local-library-api'
import type { LoggerApi } from '@preload/api/logger-api'
import type { SystemFontsApi } from '@preload/api/system-fonts-api'
import type { TrayApi } from '@preload/api/tray-api'
import type { UpdateApi } from '@preload/api/update-api'

declare global {
  interface Window {
    appRuntime: RuntimeApi
    electronAuth: AuthApi
    electronConfig: ConfigApi
    electronCache: CacheApi
    electronMusicSource: MusicSourceApi
    electronDownload: DownloadApi
    electronLocalLibrary: LocalLibraryApi
    electronLogger: LoggerApi
    electronShortcut: ShortcutApi
    electronSystemFonts: SystemFontsApi
    electronTray: TrayApi
    electronUpdate: UpdateApi
    electronWindow: WindowApi
  }
}

export {}
