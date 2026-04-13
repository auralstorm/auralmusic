import { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import Account from '../Account'
import LoginDialog from '../LoginDialog'
import NavBar from '../NavBar'
import SearchDialog from '../SearchDialog'
import Back from './Back'
import WindowControls from './WindowControls'
import { useAuthStore } from '@/stores/auth-store'

interface HeaderProps {
  className?: string
}

const Header = ({ className = '' }: HeaderProps) => {
  const { currentTheme, setDarkTheme, setLightTheme } = useTheme()
  const hydrateAuth = useAuthStore(state => state.hydrateAuth)
  const isWindows = window.appRuntime.getPlatform() === 'win32'

  useEffect(() => {
    void hydrateAuth()
  }, [hydrateAuth])

  const onToggleTheme = () => {
    if (currentTheme === 'dark') {
      setLightTheme()
    } else {
      setDarkTheme()
    }
  }
  return (
    <header
      className={`bg-background/70 supports-backdrop-filter:bg-background/70 transition-colors duration-300 supports-backdrop-filter:backdrop-blur-md ${className}`}
      onDoubleClick={event => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest('.window-no-drag')
        ) {
          return
        }

        if (isWindows) {
          void window.electronWindow.toggleMaximize()
        }
      }}
    >
      <div
        className={`${
          isWindows
            ? 'window-drag grid h-[52px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center px-2'
            : 'window-drag window-safe-top-sm flex w-full items-center justify-between px-4 pb-4'
        }`}
      >
        <Back />
        <NavBar />
        <div className='window-no-drag flex items-center gap-2'>
          <SearchDialog />
          <Account onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
          {isWindows ? <WindowControls /> : null}
        </div>
      </div>
      <LoginDialog />
    </header>
  )
}

export default Header
