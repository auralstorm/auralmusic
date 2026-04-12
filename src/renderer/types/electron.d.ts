import type { ConfigApi } from '@preload/api/config-api'
import type { AuthApi } from '@preload/api/auth-api'
import type { RuntimeApi } from '@preload/api/runtime-api'
import type { WindowApi } from '@preload/api/window-api'
import type { MusicSourceApi } from '@preload/api/music-source-api'
import type { ShortcutApi } from '@preload/api/shortcut-api'

declare global {
  interface Window {
    appRuntime: RuntimeApi
    electronAuth: AuthApi
    electronConfig: ConfigApi
    electronMusicSource: MusicSourceApi
    electronShortcut: ShortcutApi
    electronWindow: WindowApi
  }
}

export {}
