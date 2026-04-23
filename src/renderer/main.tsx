import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@applemusic-like-lyrics/core/style.css'
import '@/styles/globals.css'
import '@/styles/index.css'
import { getAppRuntime } from '@/lib/electron-runtime'
import router from '@/router'
import { applyRuntimeEnvironmentToRoot } from '@/theme/runtime-platform'

applyRuntimeEnvironmentToRoot(document.documentElement, getAppRuntime())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
