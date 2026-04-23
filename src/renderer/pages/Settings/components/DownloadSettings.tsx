import { type KeyboardEvent, useEffect, useState } from 'react'
import { FolderOpen, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import type { DownloadApi } from '@preload/api/download-api'
import type {
  AudioQualityLevel,
  DownloadFileNamePattern,
  DownloadQualityPolicy,
} from '../../../../shared/config.ts'

const AUDIO_QUALITY_OPTIONS: Array<{
  label: string
  value: AudioQualityLevel
}> = [
  { label: '标准', value: 'standard' },
  { label: '较高', value: 'higher' },
  { label: '极高', value: 'exhigh' },
  { label: '无损', value: 'lossless' },
  { label: 'Hi-Res', value: 'hires' },
  { label: '高清环绕声', value: 'jyeffect' },
  { label: '沉浸环绕声', value: 'sky' },
  { label: '杜比全景声', value: 'dolby' },
  { label: '超清母带', value: 'jymaster' },
]

const FILE_NAME_PATTERN_OPTIONS: Array<{
  value: DownloadFileNamePattern
  label: string
  example: string
}> = [
  { value: 'song-artist', label: '歌曲名 - 艺术家', example: '晴天 - 周杰伦' },
  { value: 'artist-song', label: '艺术家 - 歌曲名', example: '周杰伦 - 晴天' },
]

const DOWNLOAD_CONCURRENCY_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const value = String(index + 1)
  return { label: value, value }
})

const DOWNLOAD_QUALITY_POLICY_OPTIONS: Array<{
  value: DownloadQualityPolicy
  label: string
  description: string
}> = [
  {
    value: 'fallback',
    label: '自动降级',
    description: '当前音质不可用时，继续尝试更低音质，提高下载成功率。',
  },
  {
    value: 'strict',
    label: '严格按所选音质',
    description: '只尝试当前选中的音质，找不到下载源时直接失败。',
  },
]

function getElectronDownloadApi() {
  return (window as Window & { electronDownload?: DownloadApi })
    .electronDownload
}

function ToggleSetting({
  enabled,
  disabled = false,
  onToggle,
}: {
  enabled: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type='button'
      disabled={disabled}
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

function SingleChoiceCard({
  checked,
  disabled,
  label,
  example,
  onSelect,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  example: string
  onSelect: () => void
}) {
  const handleSelect = () => {
    if (disabled) {
      return
    }

    onSelect()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role='radio'
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'border-border/70 bg-muted/20 hover:bg-muted/45 flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors',
        disabled && 'pointer-events-none opacity-50',
        checked &&
          'border-primary !border shadow-[0_0_0_1px_hsl(var(--primary)/0.14)]'
      )}
    >
      <Checkbox
        checked={checked}
        aria-hidden
        className='pointer-events-none mt-0.5'
      />
      <span className='space-y-1'>
        <span className='text-foreground block text-sm font-medium'>
          {label}
        </span>
        <span className='text-muted-foreground block text-xs'>{example}</span>
      </span>
    </div>
  )
}

function SettingCheckboxRow({
  checked,
  disabled,
  title,
  description,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  title: string
  description: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Label
      className={cn(
        'border-border/70! bg-muted/20 hover:bg-muted/35 flex cursor-pointer items-start gap-3 rounded-2xl border! px-3 py-2.5 transition-colors',
        disabled && 'cursor-not-allowed opacity-60',
        checked && 'border-primary!'
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onCheckedChange(value === true)}
      />
      <span className='space-y-1'>
        <span className='text-foreground block text-sm font-medium'>
          {title}
        </span>
        <span className='text-muted-foreground block text-xs'>
          {description}
        </span>
      </span>
    </Label>
  )
}

const DownloadSettings = () => {
  const downloadEnabled = useConfigStore(state => state.config.downloadEnabled)
  const downloadQuality = useConfigStore(state => state.config.downloadQuality)
  const downloadQualityPolicy = useConfigStore(
    state => state.config.downloadQualityPolicy
  )
  const downloadSkipExisting = useConfigStore(
    state => state.config.downloadSkipExisting
  )
  const downloadDir = useConfigStore(state => state.config.downloadDir)
  const downloadConcurrency = useConfigStore(
    state => state.config.downloadConcurrency
  )
  const downloadFileNamePattern = useConfigStore(
    state => state.config.downloadFileNamePattern
  )
  const downloadEmbedCover = useConfigStore(
    state => state.config.downloadEmbedCover
  )
  const downloadEmbedLyrics = useConfigStore(
    state => state.config.downloadEmbedLyrics
  )
  const downloadEmbedTranslatedLyrics = useConfigStore(
    state => state.config.downloadEmbedTranslatedLyrics
  )
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const setConfig = useConfigStore(state => state.setConfig)

  const [defaultDownloadDir, setDefaultDownloadDir] = useState('')
  const [loadingDefaultDir, setLoadingDefaultDir] = useState(false)
  const [selectingDownloadDir, setSelectingDownloadDir] = useState(false)
  const [openingDownloadDir, setOpeningDownloadDir] = useState(false)

  const resolvedDownloadDir = downloadDir.trim() || defaultDownloadDir.trim()
  const downloadDirDescription = resolvedDownloadDir
    ? resolvedDownloadDir
    : loadingDefaultDir
      ? '正在读取默认下载目录...'
      : '默认目录将由主进程自动初始化。'

  useEffect(() => {
    const electronDownload = getElectronDownloadApi()
    let cancelled = false

    if (!electronDownload) {
      return
    }

    const loadDefaultDirectory = async () => {
      setLoadingDefaultDir(true)

      try {
        const directory = await electronDownload.getDefaultDirectory()
        if (cancelled) {
          return
        }

        setDefaultDownloadDir(directory)
      } catch (error) {
        if (!cancelled) {
          console.error('failed to load default download directory', error)
        }
      } finally {
        if (!cancelled) {
          setLoadingDefaultDir(false)
        }
      }
    }

    void loadDefaultDirectory()

    return () => {
      cancelled = true
    }
  }, [])

  const handleOpenDownloadDirectory = async () => {
    const electronDownload = getElectronDownloadApi()

    if (!electronDownload || !resolvedDownloadDir || openingDownloadDir) {
      return
    }

    setOpeningDownloadDir(true)

    try {
      await electronDownload.openDirectory(resolvedDownloadDir)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '打开下载目录失败，请稍后重试'
      )
    } finally {
      setOpeningDownloadDir(false)
    }
  }

  const handleSelectDownloadDirectory = async () => {
    const electronDownload = getElectronDownloadApi()

    if (!electronDownload || selectingDownloadDir) {
      return
    }

    setSelectingDownloadDir(true)

    try {
      const selectedDirectory = await electronDownload.selectDirectory()
      if (selectedDirectory) {
        await setConfig('downloadDir', selectedDirectory)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '修改下载目录失败，请稍后重试'
      )
    } finally {
      setSelectingDownloadDir(false)
    }
  }

  const isDirectoryActionDisabled =
    isConfigLoading || loadingDefaultDir || !resolvedDownloadDir
  const isDownloadApiAvailable = Boolean(getElectronDownloadApi())

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            开启下载功能
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后歌曲右键菜单会显示“下载”，关闭后直接隐藏下载入口。
          </p>
        </div>
        <ToggleSetting
          enabled={downloadEnabled}
          disabled={isConfigLoading}
          onToggle={() => void setConfig('downloadEnabled', !downloadEnabled)}
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            音质不可用时
          </div>
          <p className='text-muted-foreground text-xs'>
            控制下载在当前音质不可用时，是自动降级继续尝试，还是直接失败。
          </p>
        </div>
        <Select
          value={downloadQualityPolicy}
          disabled={isConfigLoading}
          onValueChange={value =>
            void setConfig(
              'downloadQualityPolicy',
              value as DownloadQualityPolicy
            )
          }
        >
          <SelectTrigger className='bg-muted/60 h-10 w-full rounded-2xl border-none px-4 shadow-none'>
            <SelectValue placeholder='选择音质策略' />
          </SelectTrigger>
          <SelectContent align='end'>
            {DOWNLOAD_QUALITY_POLICY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] gap-6 pb-3'>
        <div />
        <p className='text-muted-foreground text-xs'>
          {DOWNLOAD_QUALITY_POLICY_OPTIONS.find(
            option => option.value === downloadQualityPolicy
          )?.description ?? ''}
        </p>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            下载音质
          </div>
          <p className='text-muted-foreground text-xs'>
            如果目标源不支持当前音质，会按预设链路自动向下兼容。
          </p>
        </div>
        <Select
          value={downloadQuality}
          disabled={isConfigLoading}
          onValueChange={value =>
            void setConfig('downloadQuality', value as AudioQualityLevel)
          }
        >
          <SelectTrigger className='bg-muted/60 h-10 w-full rounded-2xl border-none px-4 shadow-none'>
            <SelectValue placeholder='选择下载音质' />
          </SelectTrigger>
          <SelectContent align='end'>
            {AUDIO_QUALITY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            同名文件跳过
          </div>
          <p className='text-muted-foreground text-xs'>
            下载前检查目标文件，已存在则直接标记为已跳过。
          </p>
        </div>
        <div className='flex justify-end'>
          <SettingCheckboxRow
            checked={downloadSkipExisting}
            disabled={isConfigLoading}
            title='存在同名文件时跳过'
            description='下载前检查目标文件，已存在则不重复写入。'
            onCheckedChange={checked =>
              void setConfig('downloadSkipExisting', checked)
            }
          />
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            下载路径
          </div>
          <p className='text-muted-foreground text-xs break-all'>
            {downloadDirDescription}
          </p>
        </div>
        <div className='flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-xl'
            disabled={!isDownloadApiAvailable || isDirectoryActionDisabled}
            onClick={() => void handleOpenDownloadDirectory()}
          >
            <FolderOpen />
            打开下载目录
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-xl'
            disabled={
              !isDownloadApiAvailable || isConfigLoading || selectingDownloadDir
            }
            onClick={() => void handleSelectDownloadDirectory()}
          >
            <PencilLine />
            修改下载目录
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-xl'
            disabled={!downloadDir.trim() || isConfigLoading}
            onClick={() => void setConfig('downloadDir', '')}
          >
            恢复系统默认
          </Button>
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            同时下载任务数
          </div>
          <p className='text-muted-foreground text-xs'>
            控制同时处于下载中的任务数量，范围 1 到 10。
          </p>
        </div>
        <Select
          value={String(downloadConcurrency)}
          disabled={isConfigLoading}
          onValueChange={value =>
            void setConfig('downloadConcurrency', Number(value))
          }
        >
          <SelectTrigger className='bg-muted/60 h-10 w-full rounded-2xl border-none px-4 shadow-none'>
            <SelectValue placeholder='选择并发数' />
          </SelectTrigger>
          <SelectContent align='end'>
            {DOWNLOAD_CONCURRENCY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            文件命名方式
          </div>
        </div>
        <div role='radiogroup' className='space-y-3'>
          {FILE_NAME_PATTERN_OPTIONS.map(option => (
            <SingleChoiceCard
              key={option.value}
              checked={downloadFileNamePattern === option.value}
              disabled={isConfigLoading}
              label={option.label}
              example={option.example}
              onSelect={() =>
                void setConfig('downloadFileNamePattern', option.value)
              }
            />
          ))}
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(240px,280px)] gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            嵌入到音频文件中的内容
          </div>
          <p className='text-muted-foreground text-xs'>
            翻译歌词依赖歌词嵌入；若没有翻译歌词，则只写入可用内容。
          </p>
        </div>
        <div className='space-y-2'>
          <SettingCheckboxRow
            checked={downloadEmbedCover}
            disabled={isConfigLoading}
            title='嵌入封面'
            description='将歌曲封面写入音频文件标签。'
            onCheckedChange={checked =>
              void setConfig('downloadEmbedCover', checked)
            }
          />

          <SettingCheckboxRow
            checked={downloadEmbedLyrics}
            disabled={isConfigLoading}
            title='嵌入歌词'
            description='下载完成后写入原始歌词。'
            onCheckedChange={checked => {
              void (async () => {
                await setConfig('downloadEmbedLyrics', checked)
                if (!checked && downloadEmbedTranslatedLyrics) {
                  await setConfig('downloadEmbedTranslatedLyrics', false)
                }
              })()
            }}
          />

          <SettingCheckboxRow
            checked={downloadEmbedLyrics && downloadEmbedTranslatedLyrics}
            disabled={isConfigLoading || !downloadEmbedLyrics}
            title='同时嵌入翻译歌词'
            description='未开启歌词嵌入时自动禁用，并保持为关闭状态。'
            onCheckedChange={checked =>
              void setConfig(
                'downloadEmbedTranslatedLyrics',
                downloadEmbedLyrics && checked
              )
            }
          />
        </div>
      </div>
      <Separator />
    </div>
  )
}

export default DownloadSettings
