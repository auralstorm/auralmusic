import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useConfigStore } from '@/stores/config-store'
import { useShortcutRegistrationStore } from '@/stores/shortcut-registration-store'
import {
  normalizeShortcutBindings,
  type GlobalShortcutRegistrationStatuses,
} from '../../../shared/shortcut-keys'
import {
  beginShortcutStatusFetch,
  createStatusBindingsCacheKey,
  createStatusesCacheKey,
  isShortcutStatusFetchRequestCurrent,
  rollbackShortcutStatusFetchOnFailure,
  type ShortcutStatusFetchState,
} from './shortcut-registration-bridge.model'

const STATUS_SYNC_DEBOUNCE_MS = 120
const STATUS_FETCH_RETRY_MIN_DELAY_MS = 250
const STATUS_FETCH_RETRY_MAX_DELAY_MS = 2000

const ShortcutRegistrationBridge = () => {
  const globalShortcutEnabled = useConfigStore(
    state => state.config.globalShortcutEnabled
  )
  const rawShortcutBindings = useConfigStore(
    state => state.config.shortcutBindings
  )
  const shortcutBindings = useMemo(
    () => normalizeShortcutBindings(rawShortcutBindings),
    [rawShortcutBindings]
  )
  const syncGlobalRegistrationStatuses = useShortcutRegistrationStore(
    state => state.syncGlobalRegistrationStatuses
  )
  const [retryToken, setRetryToken] = useState(0)
  const lastStatusesCacheKeyRef = useRef<string>('')
  const fetchStateRef = useRef<ShortcutStatusFetchState>({
    latestRequestSeq: 0,
    appliedBindingsCacheKey: '',
  })
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(STATUS_FETCH_RETRY_MIN_DELAY_MS)

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    clearRetryTimer()

    const delay = retryDelayRef.current
    // 快捷键注册状态依赖主进程，指数退避避免窗口启动期反复打 IPC。
    retryTimerRef.current = setTimeout(() => {
      setRetryToken(current => current + 1)
    }, delay)
    retryDelayRef.current = Math.min(delay * 2, STATUS_FETCH_RETRY_MAX_DELAY_MS)
  }, [clearRetryTimer])

  const applyStatusesDebounced = useCallback(
    (statuses: GlobalShortcutRegistrationStatuses) => {
      if (applyTimerRef.current) {
        clearTimeout(applyTimerRef.current)
      }

      applyTimerRef.current = setTimeout(() => {
        const nextStatusesCacheKey = createStatusesCacheKey(statuses)
        if (nextStatusesCacheKey === lastStatusesCacheKeyRef.current) {
          return
        }

        lastStatusesCacheKeyRef.current = nextStatusesCacheKey
        syncGlobalRegistrationStatuses(statuses)
      }, STATUS_SYNC_DEBOUNCE_MS)
    },
    [syncGlobalRegistrationStatuses]
  )

  const statusBindingsCacheKey = useMemo(() => {
    return createStatusBindingsCacheKey(globalShortcutEnabled, shortcutBindings)
  }, [globalShortcutEnabled, shortcutBindings])

  useEffect(() => {
    const unsubscribe =
      window.electronShortcut.onGlobalRegistrationStatusesChanged(statuses => {
        applyStatusesDebounced(statuses)
      })

    return () => {
      unsubscribe()

      if (applyTimerRef.current) {
        clearTimeout(applyTimerRef.current)
      }

      clearRetryTimer()
    }
  }, [applyStatusesDebounced, clearRetryTimer])

  useEffect(() => {
    clearRetryTimer()

    if (
      statusBindingsCacheKey === fetchStateRef.current.appliedBindingsCacheKey
    ) {
      return
    }

    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current)
    }

    fetchTimerRef.current = setTimeout(() => {
      // 请求开始时先标记“本配置正在同步”，失败后会回滚，避免永久锁死同 key 拉取。
      const { request, state } = beginShortcutStatusFetch(
        fetchStateRef.current,
        statusBindingsCacheKey
      )
      fetchStateRef.current = state

      void window.electronShortcut
        .getGlobalRegistrationStatuses()
        .then(statuses => {
          // 只接收最新一次请求结果，防止旧请求晚到覆盖新状态。
          if (
            !isShortcutStatusFetchRequestCurrent(fetchStateRef.current, request)
          ) {
            return
          }

          clearRetryTimer()
          retryDelayRef.current = STATUS_FETCH_RETRY_MIN_DELAY_MS
          applyStatusesDebounced(statuses)
        })
        .catch(error => {
          if (
            !isShortcutStatusFetchRequestCurrent(fetchStateRef.current, request)
          ) {
            return
          }

          fetchStateRef.current = rollbackShortcutStatusFetchOnFailure(
            fetchStateRef.current,
            request
          )
          scheduleRetry()
          console.error('读取全局快捷键注册状态失败', error)
        })
    }, STATUS_SYNC_DEBOUNCE_MS)

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current)
      }
    }
  }, [
    applyStatusesDebounced,
    clearRetryTimer,
    scheduleRetry,
    statusBindingsCacheKey,
    retryToken,
  ])

  return null
}

export default ShortcutRegistrationBridge
