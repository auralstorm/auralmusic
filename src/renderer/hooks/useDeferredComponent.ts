import { useEffect, useState, type ComponentType } from 'react'

/**
 * 按需加载组件并缓存结果
 * @param enabled 是否允许触发加载
 * @param loadComponent 动态导入函数，需返回组件本身
 * @param initialComponent 已有组件缓存，可用于服务端/首屏兜底
 * @returns 已加载组件；尚未加载时返回 null 或 initialComponent
 */
export const useDeferredComponent = <TComponent extends ComponentType>(
  enabled: boolean,
  loadComponent: () => Promise<TComponent>,
  initialComponent: TComponent | null
) => {
  const [Component, setComponent] = useState<TComponent | null>(
    () => initialComponent
  )

  useEffect(() => {
    if (!enabled || Component) {
      return
    }

    let active = true

    void loadComponent().then(nextComponent => {
      // 组件卸载或开关关闭后不再写 state，避免动态导入晚到产生内存泄漏警告。
      if (active) {
        setComponent(() => nextComponent)
      }
    })

    return () => {
      active = false
    }
  }, [Component, enabled, loadComponent])

  return Component
}
