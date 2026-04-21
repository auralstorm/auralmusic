import type { AppUpdateSnapshot, UpdateStatus } from '../../shared/update.ts'

export type UpdateModalStatus = Exclude<UpdateStatus, 'idle'>

export interface UpdateModalInfo {
  currentVersion: string
  latestVersion: string
  releaseDate: string | null
  releaseNotes: string
}

export interface UpdateModalProps {
  open: boolean
  status: UpdateModalStatus
  info: UpdateModalInfo
  progress?: number
  onOpenChange: (open: boolean) => void
  onStartUpdate: () => void | Promise<void>
  onRestart: () => void | Promise<void>
  onGoToDownload?: () => void | Promise<void>
}

export interface UpdateStoreState {
  snapshot: AppUpdateSnapshot
  isModalOpen: boolean
  syncSnapshot: (snapshot: AppUpdateSnapshot) => void
  openModal: () => void
  closeModal: () => void
  setModalOpen: (open: boolean) => void
}
