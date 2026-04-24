import type {
  GlobalShortcutRegistrationStatuses,
  ShortcutActionId,
  ShortcutScope,
} from '../../../../shared/shortcut-keys'
import type { ImportedLxMusicSource } from '../../../../shared/lx-music-source'

export type SettingsTabValue =
  | 'basic'
  | 'play'
  | 'download'
  | 'localLibrary'
  | 'system'
  | 'shortcutKeys'
  | 'about'

export interface SettingsTabsNavProps {
  value: SettingsTabValue
}

export type ThemeValue = 'system' | 'light' | 'dark'
export type PlayerBackgroundMode = 'off' | 'static' | 'dynamic'

export interface ToggleSettingProps {
  enabled: boolean
  disabled?: boolean
  onToggle: () => void
}

export interface RecordingTarget {
  actionId: ShortcutActionId
  scope: ShortcutScope
}

export interface ShortcutRecorderProps {
  value: string
  recording: boolean
  disabled?: boolean
  hasRegistrationError?: boolean
  onStartRecording: () => void
  onCancelRecording: () => void
  onCommit: (value: string) => void
}

export type ShortcutRegistrationStatuses = GlobalShortcutRegistrationStatuses

export type MusicSourceTab = 'enhanced-unblock' | 'luoxue' | 'custom-api'

export interface MusicSourceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface SourceToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

export interface ScriptInfoCardProps {
  script: ImportedLxMusicSource
  active: boolean
  disabled: boolean
  onActivate: () => void
  onRemove: () => void
}

export interface EqualizerSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
