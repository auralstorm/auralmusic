import { useEffect, useState } from 'react'

/**
 * 延迟提交高频输入值，避免搜索每次按键都触发列表查询。
 * @param value 原始输入值
 * @param delay 延迟时间(默认250ms)
 * @returns 防抖后的值
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  // 初始值直接使用原始值，避免首帧出现空值或旧值。
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // 每次 value/delay 变化都会重置计时，只提交最后一次稳定输入。
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [delay, value])

  return debouncedValue
}
