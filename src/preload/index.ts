import { exposeAuthApi } from './api/auth-api'
import { exposeConfigApi } from './api/config-api'
import { exposeMusicSourceApi } from './api/music-source-api'
import { exposeRuntimeApi } from './api/runtime-api'
import { exposeShortcutApi } from './api/shortcut-api'
import { exposeWindowApi } from './api/window-api'

exposeAuthApi()
exposeConfigApi()
exposeMusicSourceApi()
exposeRuntimeApi()
exposeShortcutApi()
exposeWindowApi()
