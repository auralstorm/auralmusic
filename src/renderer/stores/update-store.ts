import { create } from 'zustand'

import type { AppUpdateSnapshot } from '../../shared/update.ts'
import type { UpdateStoreState } from '@/types/update'

const defaultSnapshot: AppUpdateSnapshot = {
  status: 'idle',
  currentVersion:
    typeof window === 'undefined' ? '1.0.0' : window.appRuntime.getAppVersion(),
  latestVersion: null,
  releaseNotes: '',
  releaseDate: null,
  releaseUrl: null,
  actionMode:
    typeof window !== 'undefined' && window.appRuntime.getPlatform() === 'linux'
      ? 'external-link'
      : 'install',
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  errorMessage: null,
  lastCheckedAt: null,
  lastTrigger: null,
}

export const useUpdateStore = create<UpdateStoreState>(set => ({
  snapshot: defaultSnapshot,
  isModalOpen: false,
  syncSnapshot: snapshot => {
    set({ snapshot })
  },
  openModal: () => {
    set({ isModalOpen: true })
  },
  closeModal: () => {
    set({ isModalOpen: false })
  },
  setModalOpen: open => {
    set({ isModalOpen: open })
  },
}))
