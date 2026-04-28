import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { useAuthStore } from '@/stores/auth-store'

import {
  LOGIN_FORM_DEFAULT_VALUES,
  buildLoginPayload,
  getCaptchaRequestPayload,
  getLoginFormSchema,
  type LoginFormValues,
} from '../login-form.schema'
import EmailLoginPanel from './EmailLoginPanel'
import PhoneCaptchaLoginPanel from './PhoneCaptchaLoginPanel'
import PhonePasswordLoginPanel from './PhonePasswordLoginPanel'
import QrLoginPanel from './QrLoginPanel'

const LoginForm = () => {
  const loginMode = useAuthStore(state => state.loginMode)
  const isLoading = useAuthStore(state => state.isLoading)
  const errorMessage = useAuthStore(state => state.errorMessage)
  const loginWithCurrentMode = useAuthStore(state => state.loginWithCurrentMode)
  const sendCaptchaCode = useAuthStore(state => state.sendCaptchaCode)
  const clearError = useAuthStore(state => state.clearError)

  const schema = useMemo(() => getLoginFormSchema(loginMode), [loginMode])
  const {
    clearErrors,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: LOGIN_FORM_DEFAULT_VALUES,
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    clearErrors()
    clearError()
  }, [clearError, clearErrors, loginMode])

  const onSubmit = handleSubmit(async values => {
    if (loginMode === 'qr') {
      return
    }

    clearError()
    await loginWithCurrentMode(buildLoginPayload(loginMode, values))
  })

  const handleSendCaptcha = async () => {
    clearError()
    try {
      const payload = getCaptchaRequestPayload(getValues())
      await sendCaptchaCode(payload.phone, payload.countrycode)
    } catch (error) {
      setError('phone', {
        message: error instanceof Error ? error.message : '请先输入手机号',
      })
    }
  }

  const renderPanel = () => {
    switch (loginMode) {
      case 'email':
        return (
          <EmailLoginPanel
            errors={errors}
            isLoading={isLoading}
            register={register}
            onSubmit={onSubmit}
          />
        )
      case 'phone-password':
        return (
          <PhonePasswordLoginPanel
            errors={errors}
            isLoading={isLoading}
            register={register}
            onSubmit={onSubmit}
          />
        )
      case 'phone-captcha':
        return (
          <PhoneCaptchaLoginPanel
            errors={errors}
            isLoading={isLoading}
            register={register}
            onSendCaptcha={handleSendCaptcha}
            onSubmit={onSubmit}
          />
        )
      case 'qr':
        return <QrLoginPanel />
      default:
        return null
    }
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {errorMessage ? (
        <div className='border-destructive/20 bg-destructive/5 text-destructive rounded-[18px] border px-4 py-3 text-sm dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200'>
          {errorMessage}
        </div>
      ) : null}

      {renderPanel()}
    </div>
  )
}

export default LoginForm
