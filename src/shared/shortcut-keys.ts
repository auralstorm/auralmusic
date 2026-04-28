/** 应用支持的快捷键动作 id，配置、注册和事件分发都以它为白名单。 */
export const SHORTCUT_ACTIONS = [
  'playPause',
  'nextTrack',
  'previousTrack',
  'volumeUp',
  'volumeDown',
  'likeSong',
  'togglePlayer',
  'toggleFullscreen',
  'toggleSearch',
  'navigateBack',
  'navigateForward',
  'togglePlaylist',
] as const

/** 主进程向 renderer 广播快捷键动作的通道。 */
export const SHORTCUT_ACTION_CHANNEL = 'shortcut:action'

export type ShortcutActionId = (typeof SHORTCUT_ACTIONS)[number]

export type ShortcutScope = 'local' | 'global'

/** 单个动作的本地快捷键和全局快捷键绑定。 */
export interface ShortcutBinding {
  local: string
  global: string
}

export type ShortcutBindings = Record<ShortcutActionId, ShortcutBinding>

export interface GlobalShortcutRegistration {
  actionId: ShortcutActionId
  accelerator: string
}

/** 全局快捷键注册结果，accelerator 为 null 表示配置为空或非法。 */
export interface GlobalShortcutRegistrationStatus {
  accelerator: string | null
  registered: boolean
}

export type GlobalShortcutRegistrationStatuses = Record<
  ShortcutActionId,
  GlobalShortcutRegistrationStatus
>

/** 默认快捷键绑定，用户配置会在此基础上归一化。 */
export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  playPause: {
    local: 'Ctrl+P',
    global: 'Alt+Ctrl+P',
  },
  nextTrack: {
    local: 'Ctrl+ArrowRight',
    global: 'Alt+Ctrl+ArrowRight',
  },
  previousTrack: {
    local: 'Ctrl+ArrowLeft',
    global: 'Alt+Ctrl+ArrowLeft',
  },
  volumeUp: {
    local: 'Ctrl+ArrowUp',
    global: 'Alt+Ctrl+ArrowUp',
  },
  volumeDown: {
    local: 'Ctrl+ArrowDown',
    global: 'Alt+Ctrl+ArrowDown',
  },
  likeSong: {
    local: 'Ctrl+L',
    global: 'Alt+Ctrl+L',
  },
  togglePlayer: {
    local: 'Ctrl+M',
    global: 'Alt+Ctrl+M',
  },
  toggleFullscreen: {
    local: 'Ctrl+Shift+F',
    global: 'Alt+Ctrl+Shift+F',
  },
  toggleSearch: {
    local: 'Ctrl+K',
    global: 'Alt+Ctrl+K',
  },
  navigateBack: {
    local: 'Alt+ArrowLeft',
    global: 'Alt+Ctrl+Shift+ArrowLeft',
  },
  navigateForward: {
    local: 'Alt+ArrowRight',
    global: 'Alt+Ctrl+Shift+ArrowRight',
  },
  togglePlaylist: {
    local: 'Ctrl+Shift+L',
    global: 'Alt+Ctrl+Shift+L',
  },
}

/** 只依赖键盘事件必要字段，便于 DOM 事件和测试对象共用。 */
export interface ShortcutKeyboardEventLike {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Ctrl', 'Meta', 'Shift'])

const ELECTRON_ACCELERATOR_KEY_MAP: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
}

/** 校验动作 id 是否在白名单内。 */
function isShortcutActionId(value: string): value is ShortcutActionId {
  return SHORTCUT_ACTIONS.includes(value as ShortcutActionId)
}

/** 将 KeyboardEvent.key 归一化成快捷键主键，纯修饰键返回 null。 */
function normalizeMainKey(key: string): string | null {
  if (key === ' ') {
    return 'Space'
  }

  const trimmedKey = key.trim()

  if (!trimmedKey || MODIFIER_KEYS.has(trimmedKey)) {
    return null
  }

  if (trimmedKey === '+') {
    return 'Plus'
  }

  if (trimmedKey.length === 1) {
    return trimmedKey.toUpperCase()
  }

  return trimmedKey
}

/** 归一化快捷键字符串，去掉多余空白和空片段。 */
function normalizeAccelerator(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const accelerator = value
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)
    .join('+')

  return accelerator || null
}

/** 全局快捷键只有在开关开启时允许编辑，本地快捷键始终可编辑。 */
export function canEditShortcutBinding(
  scope: ShortcutScope,
  globalShortcutEnabled: boolean
) {
  return scope === 'local' || globalShortcutEnabled
}

/** 归一化快捷键配置，缺失/非法项回退默认绑定。 */
export function normalizeShortcutBindings(value: unknown): ShortcutBindings {
  const persisted =
    value && typeof value === 'object'
      ? (value as Partial<Record<string, Partial<ShortcutBinding>>>)
      : {}

  return SHORTCUT_ACTIONS.reduce((bindings, actionId) => {
    const defaultBinding = DEFAULT_SHORTCUT_BINDINGS[actionId]
    const persistedBinding = isShortcutActionId(actionId)
      ? persisted[actionId]
      : undefined

    bindings[actionId] = {
      local:
        normalizeAccelerator(persistedBinding?.local) || defaultBinding.local,
      global:
        normalizeAccelerator(persistedBinding?.global) || defaultBinding.global,
    }

    return bindings
  }, {} as ShortcutBindings)
}

/** UI 展示用格式，把 Ctrl+K 转成 Ctrl + K。 */
export function formatShortcutAccelerator(value: string): string {
  return value
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)
    .join(' + ')
}

/** 转成 Electron globalShortcut 可识别的 accelerator，例如 ArrowRight -> Right。 */
export function normalizeShortcutForElectronAccelerator(value: string) {
  const accelerator = normalizeAccelerator(value)

  if (!accelerator) {
    return null
  }

  return accelerator
    .split('+')
    .map(part => ELECTRON_ACCELERATOR_KEY_MAP[part] || part)
    .join('+')
}

/** 解析当前启用的全局快捷键注册列表，并跳过重复 accelerator。 */
export function resolveEnabledGlobalShortcutRegistrations({
  enabled,
  bindings,
}: {
  enabled: boolean
  bindings: ShortcutBindings
}): GlobalShortcutRegistration[] {
  if (!enabled) {
    return []
  }

  const normalizedBindings = normalizeShortcutBindings(bindings)
  const usedAccelerators = new Set<string>()
  const registrations: GlobalShortcutRegistration[] = []

  for (const actionId of SHORTCUT_ACTIONS) {
    const accelerator = normalizeShortcutForElectronAccelerator(
      normalizedBindings[actionId].global
    )

    if (!accelerator || usedAccelerators.has(accelerator)) {
      continue
    }

    usedAccelerators.add(accelerator)
    registrations.push({ actionId, accelerator })
  }

  return registrations
}

/** 注册全局快捷键并生成每个动作的注册状态。 */
export function resolveGlobalShortcutRegistrationStatuses({
  enabled,
  bindings,
  isRegistered,
}: {
  enabled: boolean
  bindings: ShortcutBindings
  isRegistered: (accelerator: string, actionId: ShortcutActionId) => boolean
}): GlobalShortcutRegistrationStatuses {
  const normalizedBindings = normalizeShortcutBindings(bindings)
  const usedAccelerators = new Set<string>()

  return SHORTCUT_ACTIONS.reduce((statuses, actionId) => {
    const accelerator = normalizeShortcutForElectronAccelerator(
      normalizedBindings[actionId].global
    )

    if (!enabled || !accelerator || usedAccelerators.has(accelerator)) {
      // 禁用、非法或重复的全局快捷键都标记为未注册，便于设置页给出明确状态。
      statuses[actionId] = {
        accelerator,
        registered: false,
      }
      return statuses
    }

    usedAccelerators.add(accelerator)
    statuses[actionId] = {
      accelerator,
      registered: isRegistered(accelerator, actionId),
    }

    return statuses
  }, {} as GlobalShortcutRegistrationStatuses)
}

/** 根据快捷键字符串反查动作 id，用于本地键盘事件分发。 */
export function findShortcutActionByAccelerator(
  bindings: ShortcutBindings,
  scope: ShortcutScope,
  accelerator: string
): ShortcutActionId | null {
  const normalizedBindings = normalizeShortcutBindings(bindings)
  const normalizedAccelerator = normalizeAccelerator(accelerator)

  if (!normalizedAccelerator) {
    return null
  }

  return (
    SHORTCUT_ACTIONS.find(actionId => {
      return (
        normalizeAccelerator(normalizedBindings[actionId][scope]) ===
        normalizedAccelerator
      )
    }) ?? null
  )
}

/** 根据音量快捷键动作计算下一音量，非音量动作返回 null。 */
export function resolveShortcutVolume(
  actionId: ShortcutActionId,
  currentVolume: number,
  step = 5
) {
  if (actionId !== 'volumeUp' && actionId !== 'volumeDown') {
    return null
  }

  const delta = actionId === 'volumeUp' ? step : -step
  const nextVolume = Math.round(currentVolume + delta)

  return Math.min(100, Math.max(0, nextVolume))
}

/** 将键盘事件转成配置同款快捷键字符串，未按修饰键时不视为快捷键。 */
export function keyboardEventToShortcut(
  event: ShortcutKeyboardEventLike
): string | null {
  const mainKey = normalizeMainKey(event.key)

  if (!mainKey) {
    return null
  }

  const modifiers = [
    event.altKey ? 'Alt' : null,
    event.ctrlKey ? 'Ctrl' : null,
    event.metaKey ? 'Meta' : null,
    event.shiftKey ? 'Shift' : null,
  ].filter(Boolean)

  if (!modifiers.length) {
    return null
  }

  return [...modifiers, mainKey].join('+')
}

/** 检查同一作用域内是否存在快捷键冲突。 */
export function hasShortcutConflict(
  bindings: ShortcutBindings,
  scope: ShortcutScope,
  nextValue: string,
  actionId: ShortcutActionId
): boolean {
  const normalizedNextValue = normalizeAccelerator(nextValue)

  if (!normalizedNextValue) {
    return false
  }

  return SHORTCUT_ACTIONS.some(currentActionId => {
    if (currentActionId === actionId) {
      return false
    }

    return (
      normalizeAccelerator(bindings[currentActionId][scope]) ===
      normalizedNextValue
    )
  })
}
