import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import { PHONE_PASSWORD_LOGIN_FIELD_NAMES } from '../login-form.schema'
import type { CredentialLoginPanelProps } from '../types'

const [phoneField, passwordField] = PHONE_PASSWORD_LOGIN_FIELD_NAMES

const PhonePasswordLoginPanel = ({
  errors,
  isLoading,
  register,
  onSubmit,
}: CredentialLoginPanelProps) => {
  return (
    <form
      className='space-y-4 rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_18px_70px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/7 dark:shadow-[0_18px_70px_rgba(0,0,0,0.28)]'
      onSubmit={onSubmit}
    >
      <Field className='gap-2'>
        <FieldLabel className='text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase dark:text-white/55'>
          手机号
        </FieldLabel>
        <Input
          autoComplete='tel'
          className='h-10 bg-neutral-50 px-4 text-[15px] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/35'
          placeholder='请输入手机号'
          aria-invalid={!!errors[phoneField]}
          {...register(phoneField)}
        />
        <FieldError errors={[errors[phoneField]]} />
      </Field>

      <Field className='gap-2'>
        <FieldLabel className='text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase dark:text-white/55'>
          密码
        </FieldLabel>
        <Input
          autoComplete='current-password'
          className='h-10 bg-neutral-50 px-4 text-[15px] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/35'
          placeholder='请输入密码'
          type='password'
          aria-invalid={!!errors[passwordField]}
          {...register(passwordField)}
        />
        <FieldError errors={[errors[passwordField]]} />
      </Field>

      <Button
        className='h-10 w-full bg-neutral-950 text-base font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-white/90'
        disabled={isLoading}
        type='submit'
      >
        {isLoading ? <Loader2 className='size-4 animate-spin' /> : null}
        登录
      </Button>
    </form>
  )
}

export default PhonePasswordLoginPanel
