import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import { UpdateModal } from '@/components/UpdateModal'
import { useUpdateStore } from '@/stores/update-store'
import type { UpdateModalStatus } from '@/types/update'

const MODAL_STATUSES = new Set<UpdateModalStatus>([
  'checking',
  'update-available',
  'downloading',
  'update-downloaded',
  'up-to-date',
  'error',
])

const UpdateProvider = () => {
  const snapshot = useUpdateStore(state => state.snapshot)
  const isModalOpen = useUpdateStore(state => state.isModalOpen)
  const syncSnapshot = useUpdateStore(state => state.syncSnapshot)
  const openModal = useUpdateStore(state => state.openModal)
  const setModalOpen = useUpdateStore(state => state.setModalOpen)
  const previousStatusRef = useRef(snapshot.status)

  useEffect(() => {
    let active = true

    const hydrateSnapshot = async () => {
      try {
        const nextSnapshot = await window.electronUpdate.getSnapshot()
        if (!active) {
          return
        }

        syncSnapshot(nextSnapshot)
      } catch (error) {
        console.error('获取更新状态快照失败', error)
      }
    }

    void hydrateSnapshot()

    const unsubscribe = window.electronUpdate.onStateChange(nextSnapshot => {
      syncSnapshot(nextSnapshot)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [syncSnapshot])

  useEffect(() => {
    const previousStatus = previousStatusRef.current
    const nextStatus = snapshot.status

    if (
      previousStatus !== nextStatus &&
      (nextStatus === 'update-available' || nextStatus === 'update-downloaded')
    ) {
      openModal()
    }

    previousStatusRef.current = nextStatus
  }, [openModal, snapshot.status])

  const modalStatus = MODAL_STATUSES.has(snapshot.status as UpdateModalStatus)
    ? (snapshot.status as UpdateModalStatus)
    : 'checking'

  const modalInfo = useMemo(
    () => ({
      currentVersion: snapshot.currentVersion,
      latestVersion: snapshot.latestVersion ?? snapshot.currentVersion,
      releaseDate: snapshot.releaseDate,
      releaseNotes: snapshot.releaseNotes,
    }),
    [
      snapshot.currentVersion,
      snapshot.latestVersion,
      snapshot.releaseDate,
      snapshot.releaseNotes,
    ]
  )

  return (
    <UpdateModal
      open={isModalOpen}
      status={modalStatus}
      info={modalInfo}
      progress={snapshot.downloadProgress}
      onOpenChange={setModalOpen}
      onStartUpdate={async () => {
        try {
          await window.electronUpdate.startUpdate()
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '下载更新失败，请稍后重试'
          toast.error(message)
        }
      }}
      onRestart={async () => {
        await window.electronUpdate.restartAndInstall()
      }}
      onGoToDownload={
        snapshot.actionMode === 'external-link'
          ? async () => {
              try {
                await window.electronUpdate.openDownloadPage()
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : '打开下载页面失败，请稍后重试'
                toast.error(message)
              }
            }
          : undefined
      }
    />
  )
}

export default UpdateProvider
