import { create } from 'zustand'

import type { MvDrawerStoreState } from '@/types/core'

export const useMvDrawerStore = create<MvDrawerStoreState>(set => ({
  open: false,
  mvId: null,
  setOpen: open =>
    set(state => ({
      open,
      mvId: open ? state.mvId : null,
    })),
  openDrawer: mvId =>
    set({
      open: true,
      mvId,
    }),
  closeDrawer: () =>
    set({
      open: false,
      mvId: null,
    }),
}))
