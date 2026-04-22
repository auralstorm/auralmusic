import { useCallback, useEffect, useRef, useState } from 'react'

type OverflowElement = Pick<
  HTMLElement,
  'clientHeight' | 'scrollHeight' | 'clientWidth' | 'scrollWidth'
>

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

export function useTextOverflow<T extends HTMLElement>(watchValue?: unknown) {
  const elementRef = useRef<T | null>(null)
  const [targetElement, setTargetElement] = useState<T | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [measureVersion, setMeasureVersion] = useState(0)

  const measureOverflow = useCallback(() => {
    setIsOverflowing(isElementOverflowing(elementRef.current))
  }, [])

  const targetRef = useCallback((node: T | null) => {
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
      measureOverflow()
    }

    window.addEventListener('resize', handleWindowResize)

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', handleWindowResize)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
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
