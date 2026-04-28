import type { CloseBehavior } from '../config/types'

export type WindowCloseBehaviorResult =
  | 'allow-close'
  | 'hide-to-tray'
  | 'request-confirmation'

/**
 * 根据退出状态和用户配置计算窗口关闭动作。
 *
 * 这里不直接操作窗口，只返回决策结果，便于窗口事件和单元测试复用同一套关闭规则。
 */
export function resolveWindowCloseBehavior({
  isQuitting,
  closeBehavior,
}: {
  isQuitting: boolean
  closeBehavior: CloseBehavior
}): WindowCloseBehaviorResult {
  if (isQuitting || closeBehavior === 'quit') {
    return 'allow-close'
  }

  if (closeBehavior === 'minimize') {
    return 'hide-to-tray'
  }

  return 'request-confirmation'
}
