import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'
import { useConfigStore } from '@/stores/config-store'

type ThemeValue = 'system' | 'light' | 'dark'
type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'

const THEME_OPTIONS: Array<{ label: string; value: ThemeValue }> = [
  { label: '自动', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

const PLAYER_BACKGROUND_OPTIONS: Array<{
  label: string
  value: PlayerBackgroundMode
  description: string
}> = [
  { label: '关闭', value: 'off', description: '只显示播放器基础背景' },
  {
    label: '静态封面',
    value: 'static',
    description: '使用当前封面的静态模糊背景',
  },
  {
    label: '动态封面',
    value: 'dynamic',
    description: '使用当前封面的动态背景效果',
  },
]

const BasicSettings = () => {
  const {
    currentTheme,
    isThemeLoading,
    setDarkTheme,
    setLightTheme,
    setSystemTheme,
  } = useTheme()
  const playerBackgroundMode = useConfigStore(
    state => state.config.playerBackgroundMode
  )
  const setConfig = useConfigStore(state => state.setConfig)

  const handleThemeChange = (value: ThemeValue) => {
    if (value === 'system') {
      void setSystemTheme()
      return
    }

    if (value === 'light') {
      void setLightTheme()
      return
    }

    void setDarkTheme()
  }

  const handlePlayerBackgroundModeChange = (value: PlayerBackgroundMode) => {
    void setConfig('playerBackgroundMode', value)
  }

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>外观</div>
        <Select
          value={currentTheme}
          disabled={isThemeLoading}
          onValueChange={value => handleThemeChange(value as ThemeValue)}
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='自动' />
          </SelectTrigger>
          <SelectContent align='end'>
            {THEME_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            播放器背景
          </div>
          <p className='text-muted-foreground text-xs'>
            只控制播放器大界面的背景显示方式，不影响中间封面的动效开关。
          </p>
        </div>
        <Select
          value={playerBackgroundMode}
          onValueChange={value =>
            handlePlayerBackgroundModeChange(value as PlayerBackgroundMode)
          }
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择播放器背景' />
          </SelectTrigger>
          <SelectContent align='end'>
            {PLAYER_BACKGROUND_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className='flex flex-col items-start gap-0.5'>
                  <span>{option.label}</span>
                  <span className='text-muted-foreground text-[11px]'>
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />
    </div>
  )
}

export default BasicSettings
