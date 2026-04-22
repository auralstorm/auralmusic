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

export const SHORTCUT_ACTION_CHANNEL = 'shortcut:action'

export type ShortcutActionId = (typeof SHORTCUT_ACTIONS)[number]

export type ShortcutScope = 'local' | 'global'

export interface ShortcutBinding {
  local: string
  global: string
}

export type ShortcutBindings = Record<ShortcutActionId, ShortcutBinding>

export interface GlobalShortcutRegistration {
  actionId: ShortcutActionId
  accelerator: string
}

export interface GlobalShortcutRegistrationStatus {
  accelerator: string | null
  registered: boolean
}

export type GlobalShortcutRegistrationStatuses = Record<
  ShortcutActionId,
  GlobalShortcutRegistrationStatus
>

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

function isShortcutActionId(value: string): value is ShortcutActionId {
  return SHORTCUT_ACTIONS.includes(value as ShortcutActionId)
}

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

export function canEditShortcutBinding(
  scope: ShortcutScope,
  globalShortcutEnabled: boolean
) {
  return scope === 'local' || globalShortcutEnabled
}

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

export function formatShortcutAccelerator(value: string): string {
  return value
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)
    .join(' + ')
}

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
