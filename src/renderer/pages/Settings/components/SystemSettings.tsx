import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSystemFont, SYSTEM_FONT_VALUE } from '@/hooks/useSystemFont'
import { useConfigStore } from '@/stores/config-store'
import {
  mergeFontFamilies,
  querySystemFontFamilies,
  type SystemFontQueryStatus,
} from '../settings-fonts'
import { cn } from '@/lib/utils'

const FONT_LABELS: Record<string, string> = {
  'Inter Variable': 'Inter',
  'Geist Variable': 'Geist',
  [SYSTEM_FONT_VALUE]: '系统默认',
}

function getFontLabel(fontFamily: string) {
  return FONT_LABELS[fontFamily] || fontFamily
}

const SystemSettings = () => {
  const { currentFontFamily, isFontLoading, setFontFamily } = useSystemFont()
  const setConfig = useConfigStore(state => state.setConfig)
  const autoStartEnabled = useConfigStore(
    state => state.config.autoStartEnabled
  )
  const closeBehavior = useConfigStore(state => state.config.closeBehavior)
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [systemFontsLoading, setSystemFontsLoading] = useState(false)
  const [systemFontsLoaded, setSystemFontsLoaded] = useState(false)
  const [queryStatus, setQueryStatus] = useState<SystemFontQueryStatus | null>(
    null
  )
  const [queryMessage, setQueryMessage] = useState('')

  const handleToggleStartChange = () => {
    setConfig('autoStartEnabled', !autoStartEnabled)
  }

  const handleCloseBehaviorChange = (value: string) => {
    setConfig('closeBehavior', value as 'ask' | 'minimize' | 'quit')
    setConfig('rememberCloseChoice', value !== 'ask')
  }

  const fontFamilies = mergeFontFamilies(systemFonts, currentFontFamily)

  const loadSystemFonts = async () => {
    if (systemFontsLoaded || systemFontsLoading) {
      return
    }

    setSystemFontsLoading(true)

    const result = await querySystemFontFamilies()
    setSystemFonts(result.fonts)
    setQueryStatus(result.status)
    setQueryMessage(result.message || '')
    setSystemFontsLoaded(true)
    setSystemFontsLoading(false)
  }

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>
          系统字体
        </div>
        <Select
          value={currentFontFamily}
          disabled={isFontLoading}
          onOpenChange={open => {
            if (open) {
              void loadSystemFonts()
            }
          }}
          onValueChange={value => void setFontFamily(value)}
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择字体' />
          </SelectTrigger>
          <SelectContent align='end'>
            {fontFamilies.map(fontFamily => (
              <SelectItem key={fontFamily} value={fontFamily}>
                <span style={{ fontFamily }}>{getFontLabel(fontFamily)}</span>
              </SelectItem>
            ))}
            {systemFontsLoading ? (
              <SelectItem disabled value='__loading_system_fonts__'>
                正在读取系统字体...
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </div>
      {queryStatus && queryStatus !== 'ok' ? (
        <p className='text-muted-foreground pb-3 text-xs'>
          {queryMessage || '暂未读取到系统字体。'}
        </p>
      ) : null}
      <Separator />
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>
          开机自启
        </div>
        <div className='flex items-center space-x-2'>
          <button
            type='button'
            aria-pressed={autoStartEnabled}
            onClick={handleToggleStartChange}
            className={cn(
              'bg-muted/60 relative h-9 w-full rounded-full px-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
              autoStartEnabled
                ? 'text-primary-foreground bg-primary/90'
                : 'text-muted-foreground'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'bg-background absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300',
                autoStartEnabled ? 'translate-x-full' : 'translate-x-0'
              )}
            />
            <span className='relative z-10 grid h-full grid-cols-2 items-center'>
              <span
                className={cn(
                  'transition-colors',
                  !autoStartEnabled && 'text-foreground'
                )}
              >
                关闭
              </span>
              <span
                className={cn(
                  'transition-colors',
                  autoStartEnabled && 'text-foreground'
                )}
              >
                开启
              </span>
            </span>
          </button>
        </div>
      </div>
      <Separator />
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>
          关闭行为
        </div>
        <Select value={closeBehavior} onValueChange={handleCloseBehaviorChange}>
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择关闭行为' />
          </SelectTrigger>
          <SelectContent align='end'>
            <SelectItem value='ask'>每次询问</SelectItem>
            <SelectItem value='minimize'>最小化到托盘</SelectItem>
            <SelectItem value='quit'>直接退出</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
    </div>
  )
}

export default SystemSettings
