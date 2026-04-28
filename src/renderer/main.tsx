import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@applemusic-like-lyrics/core/style.css'
import '@/styles/globals.css'
import '@/styles/index.css'
import { getAppRuntime } from '@/lib/electron-runtime'
import { createRendererLogger } from '@/lib/logger'
import router from '@/router'
import { applyRuntimeEnvironmentToRoot } from '@/theme/runtime-platform'

const rendererLogger = createRendererLogger('renderer')

window.addEventListener('error', event => {
  rendererLogger.error('unhandled renderer error', {
    error: event.error,
    message: event.message,
  })
})

window.addEventListener('unhandledrejection', event => {
  rendererLogger.error('unhandled renderer rejection', {
    error: event.reason,
  })
})

applyRuntimeEnvironmentToRoot(document.documentElement, getAppRuntime())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
