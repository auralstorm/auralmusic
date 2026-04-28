import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSystemFont, SYSTEM_FONT_VALUE } from '@/hooks/useSystemFont'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import {
  mergeFontFamilies,
  querySystemFontFamilies,
  type SystemFontQueryStatus,
} from '../settings-fonts'
import type { ToggleSettingProps } from '../types'

const FONT_LABELS: Record<string, string> = {
  'Inter Variable': 'Inter',
  'Geist Variable': 'Geist',
  [SYSTEM_FONT_VALUE]: '系统默认',
}

const BYTES_IN_GB = 1024 * 1024 * 1024
const BYTES_IN_MB = 1024 * 1024
const MIN_CACHE_SIZE_GB = 0.5
const MAX_CACHE_SIZE_GB = 10
const CACHE_SIZE_STEP_GB = 0.5
const EMPTY_CACHE_STATUS = {
  usedBytes: 0,
  audioCount: 0,
  lyricsCount: 0,
}

function clampCacheSizeGb(value: number) {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.min(MAX_CACHE_SIZE_GB, Math.max(MIN_CACHE_SIZE_GB, value))
}

function bytesToGb(value: number) {
  const rawGb = value / BYTES_IN_GB
  const rounded = Math.round(rawGb / CACHE_SIZE_STEP_GB) * CACHE_SIZE_STEP_GB
  return clampCacheSizeGb(rounded)
}

function gbToBytes(value: number) {
  return Math.round(clampCacheSizeGb(value) * BYTES_IN_GB)
}

function formatStorageSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 MB'
  }

  if (value >= BYTES_IN_GB) {
    return `${(value / BYTES_IN_GB).toFixed(1)} GB`
  }

  return `${Math.round(value / BYTES_IN_MB)} MB`
}

function getCacheUsagePercent(usedBytes: number, maxBytes: number) {
  if (
    !Number.isFinite(usedBytes) ||
    !Number.isFinite(maxBytes) ||
    maxBytes <= 0
  ) {
    return 0
  }

  return Math.min((usedBytes / maxBytes) * 100, 100)
}

function formatCacheUsagePercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0%'
  }

  if (value >= 99.95) {
    return '100%'
  }

  return `${value.toFixed(1)}%`
}

function getFontLabel(fontFamily: string) {
  return FONT_LABELS[fontFamily] || fontFamily
}

function ToggleSetting({ enabled, onToggle }: ToggleSettingProps) {
  return (
    <button
      type='button'
      aria-pressed={enabled}
      onClick={onToggle}
      className={cn(
        'bg-muted/60 relative h-9 w-full rounded-full px-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        enabled
          ? 'text-primary-foreground bg-primary/90'
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

const SystemSettings = () => {
  const { currentFontFamily, isFontLoading, setFontFamily } = useSystemFont()
  const setConfig = useConfigStore(state => state.setConfig)
  const autoStartEnabled = useConfigStore(
    state => state.config.autoStartEnabled
  )
  const closeBehavior = useConfigStore(state => state.config.closeBehavior)
  const diskCacheEnabled = useConfigStore(
    state => state.config.diskCacheEnabled
  )
  const diskCacheDir = useConfigStore(state => state.config.diskCacheDir)
  const diskCacheMaxBytes = useConfigStore(
    state => state.config.diskCacheMaxBytes
  )
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [systemFontsLoading, setSystemFontsLoading] = useState(false)
  const [systemFontsLoaded, setSystemFontsLoaded] = useState(false)
  const [queryStatus, setQueryStatus] = useState<SystemFontQueryStatus | null>(
    null
  )
  const [queryMessage, setQueryMessage] = useState('')
  const [defaultCacheDir, setDefaultCacheDir] = useState('')
  const [selectingCacheDir, setSelectingCacheDir] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [refreshingCacheStatus, setRefreshingCacheStatus] = useState(false)
  const [cacheSizePreviewGb, setCacheSizePreviewGb] = useState(
    bytesToGb(diskCacheMaxBytes)
  )
  const [cacheStatus, setCacheStatus] = useState(EMPTY_CACHE_STATUS)
  const [openingLogDirectory, setOpeningLogDirectory] = useState(false)

  const fontFamilies = mergeFontFamilies(systemFonts, currentFontFamily)
  const resolvedCacheDir =
    diskCacheDir.trim() || defaultCacheDir || '未获取目录'
  const cacheUsagePercent = getCacheUsagePercent(
    cacheStatus.usedBytes,
    diskCacheMaxBytes
  )

  const loadCacheStatus = async (showSuccessToast = false) => {
    if (refreshingCacheStatus) {
      return
    }

    setRefreshingCacheStatus(true)
    try {
      const status = await window.electronCache.getStatus()
      setCacheStatus(status)
      if (showSuccessToast) {
        toast.success('缓存状态已刷新')
      }
    } catch (error) {
      if (showSuccessToast) {
        toast.error(
          error instanceof Error
            ? error.message
            : '刷新缓存状态失败，请稍后重试'
        )
      } else {
        console.error('Failed to load cache status:', error)
      }
    } finally {
      setRefreshingCacheStatus(false)
    }
  }

  useEffect(() => {
    setCacheSizePreviewGb(bytesToGb(diskCacheMaxBytes))
  }, [diskCacheMaxBytes])

  useEffect(() => {
    let cancelled = false

    const loadDefaultCacheDir = async () => {
      try {
        const dir = await window.electronCache.getDefaultDirectory()
        if (!cancelled) {
          setDefaultCacheDir(dir)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load default cache directory:', error)
        }
      }
    }

    void loadDefaultCacheDir()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const syncCacheStatus = async () => {
      setRefreshingCacheStatus(true)
      try {
        const status = await window.electronCache.getStatus()
        if (!cancelled) {
          setCacheStatus(status)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load cache status:', error)
        }
      } finally {
        if (!cancelled) {
          setRefreshingCacheStatus(false)
        }
      }
    }

    void syncCacheStatus()
    return () => {
      cancelled = true
    }
  }, [diskCacheDir])

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

  const handleToggleStartChange = () => {
    void setConfig('autoStartEnabled', !autoStartEnabled)
  }

  const handleCloseBehaviorChange = (value: string) => {
    void setConfig('closeBehavior', value as 'ask' | 'minimize' | 'quit')
    void setConfig('rememberCloseChoice', value !== 'ask')
  }

  const handleToggleDiskCache = () => {
    void setConfig('diskCacheEnabled', !diskCacheEnabled)
  }

  const handleSelectCacheDir = async () => {
    if (selectingCacheDir) {
      return
    }

    setSelectingCacheDir(true)
    try {
      const selectedDir = await window.electronCache.selectDirectory()
      if (selectedDir) {
        await setConfig('diskCacheDir', selectedDir)
        await loadCacheStatus()
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '选择缓存目录失败，请稍后重试'
      )
    } finally {
      setSelectingCacheDir(false)
    }
  }

  const handleResetCacheDir = async () => {
    await setConfig('diskCacheDir', '')
    await loadCacheStatus()
  }

  const handleCacheSizeCommit = (values: number[]) => {
    const value = values[0]
    if (typeof value !== 'number') {
      return
    }

    void setConfig('diskCacheMaxBytes', gbToBytes(value))
  }

  const handleClearCache = async () => {
    if (clearingCache) {
      return
    }

    setClearingCache(true)
    try {
      await window.electronCache.clear()
      await loadCacheStatus()
      toast.success('缓存已清理')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '清理缓存失败，请稍后重试'
      )
    } finally {
      setClearingCache(false)
    }
  }

  const handleOpenLogDirectory = async () => {
    if (openingLogDirectory) {
      return
    }

    setOpeningLogDirectory(true)
    try {
      const opened = await window.electronLogger.openLogDirectory()
      if (!opened) {
        toast.error('打开日志目录失败')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '打开日志目录失败，请稍后重试'
      )
    } finally {
      setOpeningLogDirectory(false)
    }
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
        <ToggleSetting
          enabled={autoStartEnabled}
          onToggle={handleToggleStartChange}
        />
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

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            听歌自动缓存
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后会缓存播放过的音乐、歌词与封面，提升二次播放速度。关闭后不再新增自动缓存，历史缓存可手动清理。
          </p>
          <p className='text-muted-foreground text-xs'>
            为保障均衡器和播放兼容性，播放过程中可能产生少量临时运行数据，退出后自动清理。
          </p>
        </div>
        <ToggleSetting
          enabled={diskCacheEnabled}
          onToggle={handleToggleDiskCache}
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            缓存目录
          </div>
          <p className='text-muted-foreground max-w-md truncate text-xs'>
            {resolvedCacheDir}
          </p>
        </div>
        <div className='flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={selectingCacheDir}
            onClick={handleSelectCacheDir}
          >
            选择目录
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => void handleResetCacheDir()}
          >
            默认目录
          </Button>
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            缓存上限
          </div>
          <p className='text-muted-foreground text-xs'>
            当前 {cacheSizePreviewGb.toFixed(1)} GB
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Slider
            min={MIN_CACHE_SIZE_GB}
            max={MAX_CACHE_SIZE_GB}
            step={CACHE_SIZE_STEP_GB}
            value={[cacheSizePreviewGb]}
            onValueChange={values => {
              const value = values[0]
              if (typeof value === 'number') {
                setCacheSizePreviewGb(clampCacheSizeGb(value))
              }
            }}
            onValueCommit={handleCacheSizeCommit}
          />
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            缓存状态
          </div>
          <p className='text-muted-foreground text-xs'>
            {!diskCacheEnabled ? '已关闭自动缓存，历史缓存仍可手动清理。' : ''}
            已用 {formatStorageSize(cacheStatus.usedBytes)} / 上限{' '}
            {formatStorageSize(diskCacheMaxBytes)}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <div className='bg-muted/70 h-2 min-w-0 flex-1 overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full rounded-full transition-[width] duration-300'
              style={{
                width: `${Math.max(
                  cacheUsagePercent,
                  cacheStatus.usedBytes > 0 ? 2 : 0
                )}%`,
              }}
            />
          </div>
          <span className='text-muted-foreground w-12 text-right text-xs tabular-nums'>
            {formatCacheUsagePercent(cacheUsagePercent)}
          </span>
          <span className='text-muted-foreground text-xs whitespace-nowrap'>
            音乐 {cacheStatus.audioCount} 首，歌词 {cacheStatus.lyricsCount} 首
          </span>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={refreshingCacheStatus}
            onClick={() => void loadCacheStatus(true)}
          >
            {refreshingCacheStatus ? '刷新中...' : '刷新'}
          </Button>
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            清理缓存
          </div>
          <p className='text-muted-foreground text-xs'>
            会清除所有播放过的音乐与歌词缓存
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          disabled={clearingCache}
          onClick={handleClearCache}
        >
          {clearingCache ? '清理中...' : '清理缓存'}
        </Button>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(180px,240px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            应用日志
          </div>
          <p className='text-muted-foreground text-xs'>
            打开本机日志目录，用于排查播放、下载和音源问题
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          disabled={openingLogDirectory}
          onClick={handleOpenLogDirectory}
        >
          {openingLogDirectory ? '打开中...' : '打开日志目录'}
        </Button>
      </div>
      <Separator />
    </div>
  )
}

export default SystemSettings
