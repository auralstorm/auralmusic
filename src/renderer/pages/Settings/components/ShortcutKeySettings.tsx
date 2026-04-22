import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import {
  DEFAULT_SHORTCUT_BINDINGS,
  resolveGlobalShortcutRegistrationStatuses,
  SHORTCUT_ACTIONS,
  canEditShortcutBinding,
  formatShortcutAccelerator,
  hasShortcutConflict,
  keyboardEventToShortcut,
  normalizeShortcutBindings,
  type ShortcutActionId,
  type ShortcutBindings,
  type ShortcutScope,
} from '../../../../shared/shortcut-keys'
import type {
  RecordingTarget,
  ShortcutRecorderProps,
  ShortcutRegistrationStatuses,
} from '../types'

const SHORTCUT_ACTION_LABELS = {
  playPause: '播放/暂停',
  nextTrack: '下一首',
  previousTrack: '上一首',
  volumeUp: '增加音量',
  volumeDown: '减少音量',
  likeSong: '喜欢歌曲',
  togglePlayer: '隐藏/显示播放器',
  toggleFullscreen: '全屏/非全屏',
  toggleSearch: '显示/隐藏搜索',
  navigateBack: '后退',
  navigateForward: '前进',
  togglePlaylist: '显示/隐藏播放列表',
} as Record<ShortcutActionId, string>

const MODIFIER_KEY_NAMES = new Set(['Alt', 'Control', 'Meta', 'Shift'])

const ShortcutRecorder = ({
  value,
  recording,
  disabled = false,
  hasRegistrationError = false,
  onStartRecording,
  onCancelRecording,
  onCommit,
}: ShortcutRecorderProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recording || disabled) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      onCancelRecording()
      return
    }

    if (MODIFIER_KEY_NAMES.has(event.key)) {
      return
    }

    const nextShortcut = keyboardEventToShortcut({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    })

    if (!nextShortcut) {
      toast.error('快捷键需要至少包含一个修饰键')
      return
    }

    onCommit(nextShortcut)
  }

  return (
    <button
      type='button'
      disabled={disabled}
      className={cn(
        'bg-muted/60 text-foreground h-9 w-full rounded-lg px-3 text-center text-sm transition-colors outline-none',
        'hover:bg-muted focus-visible:ring-ring/50 focus-visible:ring-3',
        hasRegistrationError &&
          'bg-red-50 text-red-700 hover:bg-red-50 focus-visible:ring-red-200',
        recording && 'bg-primary/10 text-primary ring-primary/30 ring-1',
        disabled && 'hover:bg-muted/60 cursor-not-allowed opacity-45'
      )}
      onClick={onStartRecording}
      onKeyDown={handleKeyDown}
    >
      {recording ? '请按快捷键' : formatShortcutAccelerator(value)}
    </button>
  )
}

function updateShortcutBinding(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
  scope: ShortcutScope,
  value: string
): ShortcutBindings {
  return {
    ...bindings,
    [actionId]: {
      ...bindings[actionId],
      [scope]: value,
    },
  }
}

function createInitialGlobalRegistrationStatuses(
  bindings: ShortcutBindings
): ShortcutRegistrationStatuses {
  return resolveGlobalShortcutRegistrationStatuses({
    enabled: false,
    bindings,
    isRegistered: () => false,
  })
}

const ShortcutKeySettings = () => {
  const globalShortcutEnabled = useConfigStore(
    state => state.config.globalShortcutEnabled
  )
  const rawShortcutBindings = useConfigStore(
    state => state.config.shortcutBindings
  )
  const shortcutBindings = useMemo(
    () => normalizeShortcutBindings(rawShortcutBindings),
    [rawShortcutBindings]
  )
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const initConfig = useConfigStore(state => state.initConfig)
  const setConfig = useConfigStore(state => state.setConfig)
  const [globalRegistrationStatuses, setGlobalRegistrationStatuses] =
    useState<ShortcutRegistrationStatuses>(() =>
      createInitialGlobalRegistrationStatuses(shortcutBindings)
    )
  const [recordingTarget, setRecordingTarget] =
    useState<RecordingTarget | null>(null)

  useEffect(() => {
    if (!isConfigLoading) {
      return
    }

    void initConfig()
  }, [initConfig, isConfigLoading])

  useEffect(() => {
    if (globalShortcutEnabled || recordingTarget?.scope !== 'global') {
      return
    }

    setRecordingTarget(null)
  }, [globalShortcutEnabled, recordingTarget])

  useEffect(() => {
    let cancelled = false

    void window.electronShortcut
      .getGlobalRegistrationStatuses()
      .then(statuses => {
        if (!cancelled) {
          setGlobalRegistrationStatuses(statuses)
        }
      })
      .catch(error => {
        console.error('读取全局快捷键注册状态失败', error)
      })

    const unsubscribe =
      window.electronShortcut.onGlobalRegistrationStatusesChanged(statuses => {
        setGlobalRegistrationStatuses(statuses)
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const isRecording = (actionId: ShortcutActionId, scope: ShortcutScope) => {
    return (
      recordingTarget?.actionId === actionId && recordingTarget.scope === scope
    )
  }

  const handleToggleGlobalShortcut = () => {
    void setConfig('globalShortcutEnabled', !globalShortcutEnabled)
  }

  const handleStartRecording = (
    actionId: ShortcutActionId,
    scope: ShortcutScope
  ) => {
    if (!canEditShortcutBinding(scope, globalShortcutEnabled)) {
      return
    }

    setRecordingTarget({ actionId, scope })
  }

  const handleCommitShortcut = (
    actionId: ShortcutActionId,
    scope: ShortcutScope,
    nextValue: string
  ) => {
    if (!canEditShortcutBinding(scope, globalShortcutEnabled)) {
      return
    }

    if (hasShortcutConflict(shortcutBindings, scope, nextValue, actionId)) {
      toast.error('该快捷键已被同一列的其它功能占用')
      return
    }

    setRecordingTarget(null)

    if (shortcutBindings[actionId][scope] === nextValue) {
      return
    }

    void setConfig(
      'shortcutBindings',
      updateShortcutBinding(shortcutBindings, actionId, scope, nextValue)
    )
  }

  const handleResetShortcuts = () => {
    setRecordingTarget(null)
    void setConfig('globalShortcutEnabled', false)
    void setConfig('shortcutBindings', DEFAULT_SHORTCUT_BINDINGS)
  }

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            启用全局快捷键
          </div>
          <p className='text-muted-foreground text-xs'>
            开启后可编辑并使用全局快捷键，关闭时全局快捷键配置禁止更改。
          </p>
        </div>
        <button
          type='button'
          disabled={isConfigLoading}
          aria-pressed={globalShortcutEnabled}
          onClick={handleToggleGlobalShortcut}
          className={cn(
            'bg-muted/60 relative h-9 w-full rounded-full px-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
            globalShortcutEnabled
              ? 'text-primary-foreground bg-primary/90'
              : 'text-muted-foreground'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'bg-background absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300',
              globalShortcutEnabled ? 'translate-x-full' : 'translate-x-0'
            )}
          />
          <span className='relative z-10 grid h-full grid-cols-2 items-center'>
            <span
              className={cn(
                'transition-colors',
                !globalShortcutEnabled && 'text-foreground'
              )}
            >
              关闭
            </span>
            <span
              className={cn(
                'transition-colors',
                globalShortcutEnabled && 'text-foreground'
              )}
            >
              开启
            </span>
          </span>
        </button>
      </div>
      <Separator />

      <div className='space-y-3 py-3'>
        <div className='text-muted-foreground grid grid-cols-[minmax(120px,1fr)_minmax(160px,220px)_minmax(160px,220px)] items-center gap-4 px-1 text-xs font-medium'>
          <span>功能</span>
          <span className='text-center'>窗口内快捷键</span>
          <span className='text-center'>全局快捷键</span>
        </div>

        <div className='space-y-2'>
          {SHORTCUT_ACTIONS.map(actionId => (
            <div
              key={actionId}
              className='grid grid-cols-[minmax(120px,1fr)_minmax(160px,220px)_minmax(160px,220px)] items-center gap-4 rounded-xl px-1 py-1.5'
            >
              <div className='text-sm font-medium'>
                {SHORTCUT_ACTION_LABELS[actionId]}
              </div>
              <ShortcutRecorder
                value={shortcutBindings[actionId].local}
                recording={isRecording(actionId, 'local')}
                onStartRecording={() => handleStartRecording(actionId, 'local')}
                onCancelRecording={() => setRecordingTarget(null)}
                onCommit={value =>
                  handleCommitShortcut(actionId, 'local', value)
                }
              />
              <ShortcutRecorder
                value={shortcutBindings[actionId].global}
                recording={isRecording(actionId, 'global')}
                hasRegistrationError={
                  globalShortcutEnabled &&
                  globalRegistrationStatuses[actionId]?.registered === false
                }
                disabled={
                  !canEditShortcutBinding('global', globalShortcutEnabled)
                }
                onStartRecording={() =>
                  handleStartRecording(actionId, 'global')
                }
                onCancelRecording={() => setRecordingTarget(null)}
                onCommit={value =>
                  handleCommitShortcut(actionId, 'global', value)
                }
              />
            </div>
          ))}
        </div>
      </div>
      <Separator />

      <div className='flex justify-end py-3'>
        <Button
          type='button'
          variant='outline'
          disabled={isConfigLoading}
          onClick={handleResetShortcuts}
        >
          <RotateCcw className='size-4' />
          恢复默认快捷键
        </Button>
      </div>
      <Separator />
    </div>
  )
}

export default ShortcutKeySettings
