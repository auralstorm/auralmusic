import type {
  GlobalShortcutRegistrationStatuses,
  ShortcutBindings,
} from '../../../shared/shortcut-keys.ts'
import { SHORTCUT_ACTIONS } from '../../../shared/shortcut-keys.ts'

export type ShortcutStatusFetchState = {
  latestRequestSeq: number
  appliedBindingsCacheKey: string
}

export type ShortcutStatusFetchRequest = {
  requestSeq: number
  bindingsCacheKey: string
  previousBindingsCacheKey: string
}

/** 生成快捷键配置指纹，用于跳过重复 IPC 拉取。 */
export function createStatusBindingsCacheKey(
  enabled: boolean,
  bindings: ShortcutBindings
) {
  return [
    enabled ? 'enabled' : 'disabled',
    ...SHORTCUT_ACTIONS.map(
      actionId => `${actionId}:${bindings[actionId].global}`
    ),
  ].join('|')
}

/** 生成注册结果指纹，避免 Electron 重复广播导致 renderer 无意义刷新。 */
export function createStatusesCacheKey(
  statuses: GlobalShortcutRegistrationStatuses
) {
  return SHORTCUT_ACTIONS.map(actionId => {
    const status = statuses[actionId]
    const accelerator = status?.accelerator ?? 'null'
    const registeredFlag = status?.registered ? '1' : '0'
    return `${actionId}:${accelerator}:${registeredFlag}`
  }).join('|')
}

/** 乐观标记当前配置已开始同步，失败时再回滚以允许后续重试。 */
export function beginShortcutStatusFetch(
  state: ShortcutStatusFetchState,
  bindingsCacheKey: string
) {
  const requestSeq = state.latestRequestSeq + 1
  const request: ShortcutStatusFetchRequest = {
    requestSeq,
    bindingsCacheKey,
    previousBindingsCacheKey: state.appliedBindingsCacheKey,
  }

  return {
    request,
    state: {
      latestRequestSeq: requestSeq,
      appliedBindingsCacheKey: bindingsCacheKey,
    } satisfies ShortcutStatusFetchState,
  }
}

export function isShortcutStatusFetchRequestCurrent(
  state: ShortcutStatusFetchState,
  request: Pick<ShortcutStatusFetchRequest, 'requestSeq'>
) {
  return state.latestRequestSeq === request.requestSeq
}

export function rollbackShortcutStatusFetchOnFailure(
  state: ShortcutStatusFetchState,
  request: ShortcutStatusFetchRequest
): ShortcutStatusFetchState {
  if (!isShortcutStatusFetchRequestCurrent(state, request)) {
    return state
  }

  return {
    ...state,
    appliedBindingsCacheKey: request.previousBindingsCacheKey,
  }
}
