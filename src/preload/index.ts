import { exposeAuthApi } from './api/auth-api'
import { exposeCacheApi } from './api/cache-api'
import { exposeConfigApi } from './api/config-api'
import { exposeDownloadApi } from './api/download-api'
import { exposeLocalLibraryApi } from './api/local-library-api'
import { exposeMusicSourceApi } from './api/music-source-api'
import { exposeRuntimeApi } from './api/runtime-api'
import { exposeShortcutApi } from './api/shortcut-api'
import { exposeSystemFontsApi } from './api/system-fonts-api'
import { exposeTrayApi } from './api/tray-api'
import { exposeUpdateApi } from './api/update-api'
import { exposeWindowApi } from './api/window-api'

exposeAuthApi()
exposeCacheApi()
exposeConfigApi()
exposeDownloadApi()
exposeLocalLibraryApi()
exposeMusicSourceApi()
exposeRuntimeApi()
exposeShortcutApi()
exposeSystemFontsApi()
exposeTrayApi()
exposeUpdateApi()
exposeWindowApi()
