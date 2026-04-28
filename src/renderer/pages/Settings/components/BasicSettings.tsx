import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import {
  PLAYER_ARTWORK_STYLE_OPTIONS,
  type AnimationEffectLevel,
  type PlayerArtworkStyle,
} from '../../../../shared/config.ts'
import type {
  PlayerBackgroundMode,
  ThemeValue,
  ToggleSettingProps,
} from '../types'

import ThemeColorField from './ThemeColorField'

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

const ANIMATION_EFFECT_OPTIONS: Array<{
  label: string
  value: AnimationEffectLevel
  description: string
}> = [
  {
    label: '标准',
    value: 'standard',
    description: '保留界面过渡、背景和封面动效',
  },
  {
    label: '减弱',
    value: 'reduced',
    description: '减少装饰动画，保留必要加载反馈',
  },
  {
    label: '关闭',
    value: 'off',
    description: '关闭非必要动效和大部分过渡',
  },
]

function ToggleSetting({ enabled, onToggle }: ToggleSettingProps) {
  return (
    <button
      type='button'
      aria-pressed={enabled}
      onClick={onToggle}
      className={cn(
        'bg-muted/60 relative h-9 w-full rounded-full px-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        enabled
          ? 'bg-primary/90 text-primary-foreground'
          : 'text-muted-foreground'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'bg-background absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300',
          enabled ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <span className='relative z-10 grid h-full grid-cols-2 items-center'>
        <span
          className={cn('transition-colors', !enabled && 'text-foreground')}
        >
          关闭
        </span>
        <span className={cn('transition-colors', enabled && 'text-foreground')}>
          开启
        </span>
      </span>
    </button>
  )
}

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
  const playerArtworkStyle = useConfigStore(
    state => state.config.playerArtworkStyle
  )
  const animationEffect = useConfigStore(state => state.config.animationEffect)
  const immersivePlayerControls = useConfigStore(
    state => state.config.immersivePlayerControls
  )
  const playbackFadeEnabled = useConfigStore(
    state => state.config.playbackFadeEnabled
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

  const handlePlayerArtworkStyleChange = (value: PlayerArtworkStyle) => {
    void setConfig('playerArtworkStyle', value)
  }

  const handleAnimationEffectChange = (value: AnimationEffectLevel) => {
    void setConfig('animationEffect', value)
  }

  const handleToggleImmersivePlayerControls = () => {
    void setConfig('immersivePlayerControls', !immersivePlayerControls)
  }

  const handleTogglePlaybackFade = () => {
    void setConfig('playbackFadeEnabled', !playbackFadeEnabled)
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
            播放器样式
          </div>
          <p className='text-muted-foreground text-xs'>
            控制播放器大界面的中心封面样式，后续新增样式会统一在这里切换。
          </p>
        </div>
        <Select
          value={playerArtworkStyle}
          onValueChange={value =>
            handlePlayerArtworkStyleChange(value as PlayerArtworkStyle)
          }
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择播放器样式' />
          </SelectTrigger>
          <SelectContent align='end'>
            {PLAYER_ARTWORK_STYLE_OPTIONS.map(option => (
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
            沉浸式播放器
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后，播放器主界面的全屏和关闭按钮会在静置 2 秒后淡出。
          </p>
        </div>
        <ToggleSetting
          enabled={immersivePlayerControls}
          onToggle={handleToggleImmersivePlayerControls}
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            播放淡入淡出效果
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后，播放、暂停和切歌会使用短时音量渐变；设备或浏览器不支持时自动回退。
          </p>
        </div>
        <ToggleSetting
          enabled={playbackFadeEnabled}
          onToggle={handleTogglePlaybackFade}
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            动画效果
          </div>
          <p className='text-muted-foreground text-xs'>
            控制界面过渡、背景滚动和封面装饰动效的强度。
          </p>
        </div>
        <Select
          value={animationEffect}
          onValueChange={value =>
            handleAnimationEffectChange(value as AnimationEffectLevel)
          }
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择动画效果' />
          </SelectTrigger>
          <SelectContent align='end'>
            {ANIMATION_EFFECT_OPTIONS.map(option => (
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

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            主题色
          </div>
          <p className='text-muted-foreground text-xs'>
            自定义应用的主色、强调色和侧边栏高亮颜色。
          </p>
        </div>
        <ThemeColorField />
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
