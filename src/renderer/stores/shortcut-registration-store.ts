import { create } from 'zustand'

import {
  DEFAULT_SHORTCUT_BINDINGS,
  resolveGlobalShortcutRegistrationStatuses,
  type GlobalShortcutRegistrationStatuses,
} from '../../shared/shortcut-keys'

type ShortcutRegistrationStoreState = {
  globalRegistrationStatuses: GlobalShortcutRegistrationStatuses
  syncGlobalRegistrationStatuses: (
    statuses: GlobalShortcutRegistrationStatuses
  ) => void
}

const defaultGlobalRegistrationStatuses =
  resolveGlobalShortcutRegistrationStatuses({
    enabled: false,
    bindings: DEFAULT_SHORTCUT_BINDINGS,
    isRegistered: () => false,
  })

export const useShortcutRegistrationStore =
  create<ShortcutRegistrationStoreState>(set => ({
    // 全局快捷键注册结果，设置页用它展示每个快捷键是否被系统成功占用。
    globalRegistrationStatuses: defaultGlobalRegistrationStatuses,
    // 同步主进程广播的注册状态快照。
    syncGlobalRegistrationStatuses: statuses => {
      set({ globalRegistrationStatuses: statuses })
    },
  }))
