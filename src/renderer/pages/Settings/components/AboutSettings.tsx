import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useUpdateStore } from '@/stores/update-store'

import {
  ABOUT_UP_TO_DATE_MESSAGE,
  ABOUT_USAGE_NOTICE_LINES,
  resolveCheckUpdateButtonLabel,
  resolveUpdateFailureMessage,
  resolveAboutVersionLabel,
} from './about-settings.model'

const AboutSettings = () => {
  const appVersion = window.appRuntime.getAppVersion()
  const updateSnapshot = useUpdateStore(state => state.snapshot)
  const openUpdateModal = useUpdateStore(state => state.openModal)
  const buttonLabel = resolveCheckUpdateButtonLabel(updateSnapshot)

  return (
    <div className='space-y-1'>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 py-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-sm font-medium'>
            当前版本
          </div>
          <p className='text-foreground text-sm font-semibold tabular-nums'>
            {resolveAboutVersionLabel(appVersion)}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          className='h-9 justify-self-end'
          disabled={updateSnapshot.status === 'checking'}
          onClick={async () => {
            if (
              updateSnapshot.status === 'update-available' ||
              updateSnapshot.status === 'downloading' ||
              updateSnapshot.status === 'update-downloaded'
            ) {
              openUpdateModal()
              return
            }

            const nextSnapshot = await window.electronUpdate.checkForUpdates()

            if (nextSnapshot.status === 'up-to-date') {
              toast.success(ABOUT_UP_TO_DATE_MESSAGE)
              return
            }

            if (nextSnapshot.status === 'error') {
              toast.error(resolveUpdateFailureMessage(nextSnapshot))
            }
          }}
        >
          {buttonLabel}
        </Button>
      </div>
      <Separator />
      <div className='space-y-3 py-3'>
        <div className='text-muted-foreground text-sm font-medium'>
          使用声明
        </div>
        <div className='text-muted-foreground space-y-1 text-sm leading-6'>
          {ABOUT_USAGE_NOTICE_LINES.map(line => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      <Separator />
    </div>
  )
}

export default AboutSettings
