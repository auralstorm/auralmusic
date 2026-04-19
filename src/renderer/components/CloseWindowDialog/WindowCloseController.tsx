import { useEffect, useState } from 'react'

import { getElectronWindowApi } from '@/lib/electron-runtime'
import { useConfigStore } from '@/stores/config-store'

import CloseWindowDialog from './index'
import { resolveCloseRequestAction } from './window-close-controller.model'

const WindowCloseController = () => {
  const electronWindow = getElectronWindowApi()
  const closeBehavior = useConfigStore(state => state.config.closeBehavior)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!electronWindow) {
      return
    }

    const unsubscribe = electronWindow.onCloseRequested(() => {
      const action = resolveCloseRequestAction(closeBehavior)

      if (action === 'hide-to-tray') {
        void electronWindow.hideToTray()
        return
      }

      if (action === 'quit-app') {
        void electronWindow.quitApp()
        return
      }

      setIsOpen(true)
    })

    return unsubscribe
  }, [closeBehavior, electronWindow])

  if (!electronWindow) {
    return null
  }

  return (
    <CloseWindowDialog
      open={isOpen}
      setOpen={setIsOpen}
      handleCloseWindow={() => {
        void electronWindow.quitApp()
      }}
      handleMiniWindow={() => {
        void electronWindow.hideToTray()
      }}
    />
  )
}

export default WindowCloseController
