import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { LOGIN_MODE_OPTIONS } from '../login-dialog.model'

const LoginModeSwitcher = () => {
  const currentMode = useAuthStore(state => state.loginMode)
  const setLoginMode = useAuthStore(state => state.setLoginMode)

  return (
    <div className='bg-primary/4 grid grid-cols-1 gap-5 rounded-[18px] p-1 dark:bg-white/6'>
      {LOGIN_MODE_OPTIONS.map(option => {
        const Icon = option.icon
        const active = currentMode === option.value

        return (
          <button
            key={option.value}
            type='button'
            className={cn(
              'flex items-center justify-center gap-2 rounded-[14px] px-3 py-3 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm dark:bg-white/12 dark:text-white'
                : 'text-muted-foreground hover:text-foreground dark:text-white/55 dark:hover:text-white'
            )}
            onClick={() => setLoginMode(option.value)}
          >
            <Icon className='size-4' />
          </button>
        )
      })}
    </div>
  )
}

export default LoginModeSwitcher
