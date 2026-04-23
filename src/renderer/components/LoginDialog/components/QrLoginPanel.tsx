import { useCallback, useEffect, useRef, useState } from 'react'

import { RotateCcw } from 'lucide-react'

import { resetQrLoginState, useAuthStore } from '@/stores/auth-store'

import type { QrPanelStatus, QrViewState } from '../types'
import { QR_LOGIN_EXPIRE_SECONDS } from '../login-dialog.model'

const QrLoginPanel = () => {
  const isLoading = useAuthStore(state => state.isLoading)
  const refreshQrCode = useAuthStore(state => state.refreshQrCode)
  const pollQrLogin = useAuthStore(state => state.pollQrLogin)

  const [qrView, setQrView] = useState<QrViewState | null>(null)
  const [qrStatus, setQrStatus] = useState<QrPanelStatus>('loading')
  const expiryTimerRef = useRef<number | null>(null)

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== null) {
      window.clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = null
    }
  }, [])

  const resetLocalState = useCallback(() => {
    clearExpiryTimer()
    setQrView(null)
    setQrStatus('loading')
  }, [clearExpiryTimer])

  const markExpired = useCallback(() => {
    setQrStatus('expired')
    resetQrLoginState()
  }, [])

  const scheduleExpiry = useCallback(
    (nextExpiresAt: number) => {
      clearExpiryTimer()

      const delay = Math.max(nextExpiresAt - Date.now(), 0)
      expiryTimerRef.current = window.setTimeout(() => {
        expiryTimerRef.current = null
        markExpired()
      }, delay)
    },
    [clearExpiryTimer, markExpired]
  )

  const activateQrCode = useCallback(
    (nextQr: QrViewState) => {
      const nextExpiresAt = Date.now() + QR_LOGIN_EXPIRE_SECONDS * 1000
      setQrView(nextQr)
      setQrStatus('active')
      scheduleExpiry(nextExpiresAt)
    },
    [scheduleExpiry]
  )

  const fetchQrCode = useCallback(async (): Promise<QrViewState | null> => {
    resetQrLoginState()
    resetLocalState()

    const nextQr = await refreshQrCode()

    if (!nextQr.key) {
      return null
    }

    activateQrCode(nextQr)
    void pollQrLogin()
    return nextQr
  }, [activateQrCode, pollQrLogin, refreshQrCode, resetLocalState])

  const handleRefreshQrCode = useCallback(() => {
    void fetchQrCode().catch(() => {
      // store already surfaces the error message
    })
  }, [fetchQrCode])

  useEffect(() => {
    let active = true

    void fetchQrCode().catch(() => {
      if (active) {
        setQrStatus('loading')
      }
    })

    return () => {
      active = false
      clearExpiryTimer()
      resetQrLoginState()
    }
  }, [clearExpiryTimer, fetchQrCode])

  return (
    <div className='space-y-4 rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_18px_70px_rgba(15,23,42,0.05)]'>
      <div className='space-y-4'>
        <div className='mx-auto w-full max-w-[320px]'>
          <div className='from-background via-muted/40 to-background relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br'>
            <div className='bg-background relative overflow-hidden rounded-[24px] border shadow-lg'>
              {qrView?.qrImg ? (
                <img
                  alt='扫码登录二维码'
                  className='size-[200px] rounded-[18px] object-contain'
                  draggable={false}
                  src={qrView.qrImg}
                />
              ) : (
                <div className='text-muted-foreground flex size-[200px] items-center justify-center rounded-[18px] bg-neutral-100 text-sm'>
                  {isLoading || qrStatus === 'loading'
                    ? '正在生成二维码...'
                    : '二维码加载失败'}
                </div>
              )}

              {qrStatus === 'expired' ? (
                <button
                  aria-label='二维码失效，点击重新获取'
                  className='app-intel-dark-surface absolute inset-0 flex cursor-pointer items-center justify-center border-0 bg-black/35 px-6 text-center text-white backdrop-blur-sm'
                  type='button'
                  onClick={handleRefreshQrCode}
                >
                  <div className='flex flex-col items-center gap-3'>
                    <RotateCcw className='size-8 text-sky-400' />
                    <p className='text-base font-semibold'>
                      二维码失效，点击重新获取
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <p className='text-foreground/50 text-center text-xs leading-6'>
          请使用网易云音乐 App 扫码，二维码通常只会短暂有效。
        </p>
      </div>

      {/* {expiresAt ? (
        <div className='text-muted-foreground text-center text-xs'>
          当前二维码将在 {QR_LOGIN_EXPIRE_SECONDS} 秒后失效
        </div>
      ) : null} */}
    </div>
  )
}

export default QrLoginPanel
