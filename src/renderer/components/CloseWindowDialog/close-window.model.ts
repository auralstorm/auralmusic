import type { CloseBehavior } from '../../../main/config/types.ts'

export type CloseWindowAction = Exclude<CloseBehavior, 'ask'>

export function shouldShowCloseWindowDialog(closeBehavior: CloseBehavior) {
  return closeBehavior === 'ask'
}

export function resolveCloseWindowDialogConfig(
  action: CloseWindowAction,
  rememberCloseChoice: boolean
) {
  if (!rememberCloseChoice) {
    return {
      closeBehavior: 'ask' as const,
      rememberCloseChoice: false,
    }
  }

  return {
    closeBehavior: action,
    rememberCloseChoice: true,
  }
}
