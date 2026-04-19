import type { CloseBehavior } from '../../../shared/config.ts'

export type CloseRequestAction = 'show-dialog' | 'hide-to-tray' | 'quit-app'

export function resolveCloseRequestAction(
  closeBehavior: CloseBehavior
): CloseRequestAction {
  if (closeBehavior === 'minimize') {
    return 'hide-to-tray'
  }

  if (closeBehavior === 'quit') {
    return 'quit-app'
  }

  return 'show-dialog'
}
