import { useEffect, useMemo, useRef, useState } from 'react'
import { DownloadCloudIcon, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { createAccountMenuActions } from './account-menu.model'

const getAvatarFallback = (nickname: string | null) => {
  if (!nickname?.trim()) {
    return 'A'
  }

  return nickname.trim().slice(0, 1).toUpperCase()
}

interface AccountControlProps {
  currentTheme: string
  onToggleTheme: () => void
}

const AccountControl = ({
  currentTheme,
  onToggleTheme,
}: AccountControlProps) => {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoading = useAuthStore(state => state.isLoading)
  const openLoginDialog = useAuthStore(state => state.openLoginDialog)
  const logout = useAuthStore(state => state.logout)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

  const fallbackText = useMemo(
    () => getAvatarFallback(user?.nickname ?? null),
    [user?.nickname]
  )
  const isDark = useMemo(() => currentTheme === 'dark', [currentTheme])

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setMenuOpen(true)
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false)
      closeTimerRef.current = null
    }, 120)
  }

  const handleOpenLogin = () => {
    setMenuOpen(false)
    openLoginDialog('email')
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
  }

  const handleOpenDownloads = () => {
    setMenuOpen(false)
    navigate('/downloads')
  }

  const handleOpenSettings = () => {
    setMenuOpen(false)
    navigate('/settings')
  }

  const menuActions = createAccountMenuActions({
    isDark,
    isLoading,
    hasUser: Boolean(user?.userId),
    onToggleTheme,
    onOpenDownloads: handleOpenDownloads,
    onOpenSettings: handleOpenSettings,
    onLogout: handleLogout,
  })

  useEffect(() => () => clearCloseTimer(), [])

  return (
    <div className='window-no-drag'>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            aria-label={
              user?.nickname ? `当前账号：${user.nickname}` : '打开账号菜单'
            }
            className='border-border bg-background/70 hover:bg-accent/40 flex size-10 items-center justify-center rounded-full border transition-colors'
            onClick={() => setMenuOpen(current => !current)}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <Avatar className='size-9 border-none'>
              <AvatarImage
                alt={user?.nickname ?? '当前账号'}
                src={
                  user?.avatarUrl
                    ? resizeImageUrl(
                        user.avatarUrl,
                        imageSizes.avatar.width,
                        imageSizes.avatar.height
                      )
                    : undefined
                }
              />
              <AvatarFallback
                className={cn(
                  'text-[11px] font-bold',
                  !user &&
                    'bg-gradient-to-br from-sky-400/90 via-indigo-400/80 to-violet-400/90'
                )}
              >
                {!hasHydrated ? '' : fallbackText}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align='end'
          className='w-[280px] rounded-[24px] p-3'
          onCloseAutoFocus={event => event.preventDefault()}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className='border-border/70 bg-background/65 flex items-center gap-3 rounded-[18px] border p-3'>
            <Avatar className='border-border/60 size-12'>
              <AvatarImage
                alt={user?.nickname ?? '当前账号'}
                src={
                  user?.avatarUrl
                    ? resizeImageUrl(
                        user.avatarUrl,
                        imageSizes.avatar.width,
                        imageSizes.avatar.height
                      )
                    : undefined
                }
              />
              <AvatarFallback className='text-sm font-bold'>
                {!hasHydrated ? '' : fallbackText}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              {user ? (
                <p className='text-foreground truncate text-sm font-semibold'>
                  {user.nickname}
                </p>
              ) : (
                <button
                  type='button'
                  className='text-foreground truncate text-sm font-semibold'
                  onClick={handleOpenLogin}
                >
                  点击登录网易云账号
                </button>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          {menuActions.map(action => (
            <div key={action.key}>
              {action.requiresSeparatorBefore ? (
                <DropdownMenuSeparator />
              ) : null}
              <DropdownMenuItem
                className='rounded-[18px] px-3 py-3'
                disabled={action.disabled}
                onSelect={event => {
                  event.preventDefault()
                  void action.onSelect()
                }}
              >
                {action.key === 'theme' ? (
                  isDark ? (
                    <Sun className='size-4' />
                  ) : (
                    <Moon className='size-4' />
                  )
                ) : action.key === 'settings' ? (
                  <Settings className='size-4' />
                ) : action.key === 'logout' ? (
                  <LogOut className='size-4' />
                ) : (
                  <DownloadCloudIcon className='size-4' />
                )}
                <div className='flex flex-col'>
                  <span className='font-semibold'>{action.label}</span>
                </div>
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default AccountControl
