import { useEffect, useState } from 'react'

/**
 * 延迟提交高频输入值，避免搜索每次按键都触发列表查询。
 * @param value 原始输入值
 * @param delay 延迟时间(默认250ms)
 * @returns 防抖后的值
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [delay, value])

  return debouncedValue
}
