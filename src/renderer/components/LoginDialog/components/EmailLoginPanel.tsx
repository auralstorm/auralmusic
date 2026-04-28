import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import type { CredentialLoginPanelProps } from '../types'

const EmailLoginPanel = ({
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
          邮箱
        </FieldLabel>
        <Input
          autoComplete='email'
          aria-invalid={!!errors.email}
          className='h-10 bg-neutral-50 px-4 text-[15px] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/35'
          placeholder='m@example.com'
          {...register('email')}
        />
        <FieldError errors={[errors.email]} />
      </Field>

      <Field className='gap-2'>
        <FieldLabel className='text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase dark:text-white/55'>
          密码
        </FieldLabel>
        <Input
          autoComplete='current-password'
          aria-invalid={!!errors.password}
          className='h-10 bg-neutral-50 px-4 text-[15px] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/35'
          placeholder='请输入密码'
          type='password'
          {...register('password')}
        />
        <FieldError errors={[errors.password]} />
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

export default EmailLoginPanel
