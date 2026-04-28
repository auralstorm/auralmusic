import { useCallback, useEffect, useRef, useState } from 'react'

type OverflowElement = Pick<
  HTMLElement,
  'clientHeight' | 'scrollHeight' | 'clientWidth' | 'scrollWidth'
>

/**
 * 判断元素内容是否在横向或纵向发生溢出
 * @param element 待测量元素，允许为空以便 hook 初始化阶段安全调用
 */
export function isElementOverflowing(
  element: OverflowElement | null | undefined
) {
  if (!element) {
    return false
  }

  return (
    element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth
  )
}

/**
 * 监听文本/容器尺寸变化并判断是否溢出
 * @param watchValue 外部内容变化标记，例如标题文本、折叠状态或字体配置
 * @returns targetRef 绑定目标元素，isOverflowing 表示是否溢出，remeasure 可手动触发重测
 */
export function useTextOverflow<T extends HTMLElement>(watchValue?: unknown) {
  const elementRef = useRef<T | null>(null)
  // 单独保存 targetElement 是为了让 ref 变化触发 effect 重建 ResizeObserver。
  const [targetElement, setTargetElement] = useState<T | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  // 手动重测版本号，解决字体加载/动画结束这类 ResizeObserver 不一定及时触发的场景。
  const [measureVersion, setMeasureVersion] = useState(0)

  const measureOverflow = useCallback(() => {
    setIsOverflowing(isElementOverflowing(elementRef.current))
  }, [])

  const targetRef = useCallback((node: T | null) => {
    // 同时写 ref 和 state：ref 用于读取最新节点，state 用于驱动监听生命周期。
    elementRef.current = node
    setTargetElement(node)
  }, [])

  const remeasure = useCallback(() => {
    setMeasureVersion(current => current + 1)
  }, [])

  useEffect(() => {
    if (!targetElement) {
      setIsOverflowing(false)
      return
    }

    measureOverflow()

    if (typeof window === 'undefined') {
      return
    }

    const handleWindowResize = () => {
      // 窗口尺寸变化会改变多行文本换行结果，需要重新判断 tooltip 是否必要。
      measureOverflow()
    }

    window.addEventListener('resize', handleWindowResize)

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', handleWindowResize)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      // 目标元素自身尺寸变化比 window resize 更细，覆盖侧栏展开/容器布局变化。
      measureOverflow()
    })

    resizeObserver.observe(targetElement)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [measureOverflow, measureVersion, targetElement, watchValue])

  return {
    targetRef,
    isOverflowing,
    remeasure,
  }
}
