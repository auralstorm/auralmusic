import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfigStore } from '@/stores/config-store'
import {
  RETRO_COVER_PRESET_OPTIONS,
  type AudioQualityLevel,
  type RetroCoverPreset,
} from '../../../../shared/config.ts'
import {
  DEFAULT_AUDIO_OUTPUT_DEVICE_ID,
  mergeSelectedAudioOutputDevice,
  playAudioOutputTestTone,
  queryAudioOutputDevices,
  type AudioOutputDeviceOption,
  type AudioOutputDeviceQueryStatus,
} from '../settings-audio-output'
import type { ToggleSettingProps } from '../types'
import {
  formatPlaybackSpeedLabel,
  normalizePlaybackSpeedValue,
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  PLAYBACK_SPEED_STEP,
  resolvePlaybackSpeedCommitValue,
  resolvePlaybackSpeedSliderValue,
} from './playback-speed.model'
import { resolveEqualizerPresetLabel } from './equalizer-settings.model'
import EqualizerSettingsDialog from './EqualizerSettingsDialog'
import MusicSourceSettingsDialog from './MusicSourceSettingsDialog'

const AUDIO_OUTPUT_STATUS_LABEL: Partial<
  Record<AudioOutputDeviceQueryStatus, string>
> = {
  empty: '暂未读取到可用的音频输出设备。',
  unsupported: '当前运行环境不支持读取音频输出设备。',
  'permission-denied': '未获得音频设备权限，暂时只能使用系统默认输出设备。',
  error: '音频输出设备读取失败，请稍后重试。',
}

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

function ToggleSetting({
  enabled,
  disabled = false,
  onToggle,
}: ToggleSettingProps) {
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

const PlaySettings = () => {
  const audioOutputDeviceId =
    useConfigStore(state => state.config.audioOutputDeviceId) ||
    DEFAULT_AUDIO_OUTPUT_DEVICE_ID
  const audioQuality = useConfigStore(state => state.config.quality)
  const playbackSpeed = useConfigStore(state => state.config.playbackSpeed)
  const equalizer = useConfigStore(state => state.config.equalizer)
  const rememberPlaybackSession = useConfigStore(
    state => state.config.rememberPlaybackSession
  )
  const musicSourceEnabled = useConfigStore(
    state => state.config.musicSourceEnabled
  )
  const dynamicCoverEnabled = useConfigStore(
    state => state.config.dynamicCoverEnabled
  )
  const retroCoverPreset = useConfigStore(
    state => state.config.retroCoverPreset
  )
  const showLyricTranslation = useConfigStore(
    state => state.config.showLyricTranslation
  )
  const lyricsKaraokeEnabled = useConfigStore(
    state => state.config.lyricsKaraokeEnabled
  )
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const initConfig = useConfigStore(state => state.initConfig)
  const setConfig = useConfigStore(state => state.setConfig)

  const [devices, setDevices] = useState<AudioOutputDeviceOption[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [playbackSpeedDragValue, setPlaybackSpeedDragValue] = useState<
    number | null
  >(null)
  const [testing, setTesting] = useState(false)
  const [equalizerDialogOpen, setEqualizerDialogOpen] = useState(false)
  const [musicSourceDialogOpen, setMusicSourceDialogOpen] = useState(false)
  const [queryStatus, setQueryStatus] =
    useState<AudioOutputDeviceQueryStatus | null>(null)
  const [queryMessage, setQueryMessage] = useState('')

  const audioOutputDevices = mergeSelectedAudioOutputDevice(
    devices,
    audioOutputDeviceId
  )
  const playbackSpeedSliderValue = resolvePlaybackSpeedSliderValue(
    playbackSpeed,
    playbackSpeedDragValue
  )

  const loadAudioOutputDevices = async () => {
    if (devicesLoading) {
      return
    }

    setDevicesLoading(true)

    const result = await queryAudioOutputDevices()
    setDevices(result.devices)
    setQueryStatus(result.status)
    setQueryMessage(result.message || '')
    setDevicesLoading(false)
  }

  useEffect(() => {
    if (!isConfigLoading) {
      return
    }

    void initConfig()
  }, [initConfig, isConfigLoading])

  useEffect(() => {
    void loadAudioOutputDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTestAudioOutput = async () => {
    if (testing) {
      return
    }

    setTesting(true)

    try {
      await playAudioOutputTestTone(audioOutputDeviceId)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : '测试音频输出失败，请稍后重试。'
      )
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>
          音频输出设备
        </div>
        <div className='flex items-center gap-2'>
          <Select
            value={audioOutputDeviceId}
            disabled={isConfigLoading || devicesLoading}
            onOpenChange={open => {
              if (open) {
                void loadAudioOutputDevices()
              }
            }}
            onValueChange={deviceId => {
              void setConfig('audioOutputDeviceId', deviceId)
            }}
          >
            <SelectTrigger className='bg-muted/60 h-9 min-w-0 flex-1 border-none px-4 shadow-none'>
              <SelectValue placeholder='选择输出设备' />
            </SelectTrigger>
            <SelectContent align='end'>
              {audioOutputDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
              {devicesLoading ? (
                <SelectItem disabled value='__loading_audio_output_devices__'>
                  正在读取音频输出设备...
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={isConfigLoading || testing}
            aria-label='测试音频输出设备'
            className='bg-muted/60 size-9'
            onClick={handleTestAudioOutput}
          >
            <Volume2 className={testing ? 'animate-pulse' : undefined} />
          </Button>
        </div>
      </div>
      {queryStatus && queryStatus !== 'ok' ? (
        <p className='text-muted-foreground pb-3 text-xs'>
          {queryMessage || AUDIO_OUTPUT_STATUS_LABEL[queryStatus]}
        </p>
      ) : null}
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>
          播放音质
        </div>
        <Select
          value={audioQuality}
          disabled={isConfigLoading}
          onValueChange={value => {
            void setConfig('quality', value as AudioQualityLevel)
          }}
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择播放音质' />
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

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            均衡器
          </div>
          <p className='text-muted-foreground text-xs'>
            {equalizer.enabled
              ? `已启用，当前预设 ${resolveEqualizerPresetLabel(equalizer.presetId)}`
              : `已关闭，保留 ${resolveEqualizerPresetLabel(equalizer.presetId)} 配置`}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <ToggleSetting
            enabled={equalizer.enabled}
            disabled={isConfigLoading}
            onToggle={() =>
              void setConfig('equalizer', {
                ...equalizer,
                enabled: !equalizer.enabled,
              })
            }
          />
          <Button
            type='button'
            variant='outline'
            className='h-9 shrink-0'
            disabled={isConfigLoading}
            onClick={() => setEqualizerDialogOpen(true)}
          >
            调整
          </Button>
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            倍速播放
          </div>
          <p className='text-muted-foreground text-xs'>
            0.5x - 2.0x 播放速度调节
          </p>
        </div>
        <div className='space-y-2'>
          <div className='text-muted-foreground text-right text-xs tabular-nums'>
            {formatPlaybackSpeedLabel(playbackSpeedSliderValue)}
          </div>
          <Slider
            aria-label='倍速播放'
            min={PLAYBACK_SPEED_MIN}
            max={PLAYBACK_SPEED_MAX}
            step={PLAYBACK_SPEED_STEP}
            value={[playbackSpeedSliderValue]}
            disabled={isConfigLoading}
            onValueChange={nextValue => {
              setPlaybackSpeedDragValue(
                resolvePlaybackSpeedCommitValue(nextValue)
              )
            }}
            onValueCommit={nextValue => {
              const nextPlaybackSpeed =
                resolvePlaybackSpeedCommitValue(nextValue)
              setPlaybackSpeedDragValue(null)

              if (
                nextPlaybackSpeed === normalizePlaybackSpeedValue(playbackSpeed)
              ) {
                return
              }

              void setConfig('playbackSpeed', nextPlaybackSpeed)
            }}
          />
        </div>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            记忆上次播放
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后，下次启动会定位到上次播放的歌曲和进度，但不会自动开始播放。
          </p>
        </div>
        <ToggleSetting
          enabled={rememberPlaybackSession}
          disabled={isConfigLoading}
          onToggle={() =>
            void setConfig('rememberPlaybackSession', !rememberPlaybackSession)
          }
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            显示歌词翻译
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后，播放器歌词区域会显示翻译文本。
          </p>
        </div>
        <ToggleSetting
          enabled={showLyricTranslation}
          disabled={isConfigLoading}
          onToggle={() =>
            void setConfig('showLyricTranslation', !showLyricTranslation)
          }
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            卡拉 OK 模式
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后优先使用逐字歌词，没有逐字数据时回退到逐行高亮。
          </p>
        </div>
        <ToggleSetting
          enabled={lyricsKaraokeEnabled}
          disabled={isConfigLoading}
          onToggle={() =>
            void setConfig('lyricsKaraokeEnabled', !lyricsKaraokeEnabled)
          }
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            动态封面效果
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后播放器大界面使用动态封面，关闭后使用静态封面。
          </p>
        </div>
        <ToggleSetting
          enabled={dynamicCoverEnabled}
          disabled={isConfigLoading}
          onToggle={() =>
            void setConfig('dynamicCoverEnabled', !dynamicCoverEnabled)
          }
        />
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            复古封面质感
          </div>
          <p className='text-muted-foreground text-xs'>
            仅影响播放器大界面的中心封面，静态与动态封面共用同一套复古预设。
          </p>
        </div>
        <Select
          value={retroCoverPreset}
          disabled={isConfigLoading}
          onValueChange={value =>
            void setConfig('retroCoverPreset', value as RetroCoverPreset)
          }
        >
          <SelectTrigger className='bg-muted/60 h-9 w-full border-none px-4 shadow-none'>
            <SelectValue placeholder='选择复古封面质感' />
          </SelectTrigger>
          <SelectContent align='end'>
            {RETRO_COVER_PRESET_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            音源设置
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后将尝试解析无法播放的音乐。
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            disabled={isConfigLoading}
            aria-pressed={musicSourceEnabled}
            onClick={() =>
              void setConfig('musicSourceEnabled', !musicSourceEnabled)
            }
            className={cn(
              'bg-muted/60 relative h-9 min-w-28 flex-1 rounded-full px-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
              musicSourceEnabled
                ? 'bg-primary/90 text-primary-foreground'
                : 'text-muted-foreground'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'bg-background absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300',
                musicSourceEnabled ? 'translate-x-full' : 'translate-x-0'
              )}
            />
            <span className='relative z-10 grid h-full grid-cols-2 items-center'>
              <span
                className={cn(
                  'transition-colors',
                  !musicSourceEnabled && 'text-foreground'
                )}
              >
                关闭
              </span>
              <span
                className={cn(
                  'transition-colors',
                  musicSourceEnabled && 'text-foreground'
                )}
              >
                开启
              </span>
            </span>
          </button>
          {musicSourceEnabled ? (
            <Button
              type='button'
              variant='outline'
              className='h-9 shrink-0'
              onClick={() => setMusicSourceDialogOpen(true)}
            >
              选择音源
            </Button>
          ) : null}
        </div>
      </div>
      <Separator />

      <MusicSourceSettingsDialog
        open={musicSourceDialogOpen}
        onOpenChange={setMusicSourceDialogOpen}
      />
      <EqualizerSettingsDialog
        open={equalizerDialogOpen}
        onOpenChange={setEqualizerDialogOpen}
      />
    </div>
  )
}

export default PlaySettings
