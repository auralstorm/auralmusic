import electron from 'electron'
import { AUTH_IPC_CHANNELS } from '../auth/types'
import { clearAuthSession, getAuthSession, setAuthSession } from '../auth/store'
import type { AuthSession } from '../../shared/auth'

const { ipcMain } = electron

export function registerAuthIpc() {
  ipcMain.handle(AUTH_IPC_CHANNELS.GET, () => {
    return getAuthSession()
  })

  ipcMain.handle(
    AUTH_IPC_CHANNELS.SET,
    async (_event, authSession: AuthSession) => {
      return setAuthSession(authSession)
    }
  )

  ipcMain.handle(AUTH_IPC_CHANNELS.CLEAR, async () => {
    await clearAuthSession()
  })
}
