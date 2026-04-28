import { create } from 'zustand'

import type { MvDrawerStoreState } from '@/types/core'

export const useMvDrawerStore = create<MvDrawerStoreState>(set => ({
  // MV 抽屉开关。
  open: false,
  // 当前播放/查看的 MV id，抽屉关闭时清空。
  mvId: null,
  // 受控设置抽屉开关；关闭时同步释放 MV id。
  setOpen: open =>
    set(state => ({
      open,
      mvId: open ? state.mvId : null,
    })),
  // 打开 MV 抽屉并绑定目标 MV。
  openDrawer: mvId =>
    set({
      open: true,
      mvId,
    }),
  // 关闭 MV 抽屉并清理目标 MV。
  closeDrawer: () =>
    set({
      open: false,
      mvId: null,
    }),
}))
