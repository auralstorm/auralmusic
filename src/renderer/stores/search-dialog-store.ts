import { create } from 'zustand'
import type { SearchDialogStoreState } from '@/types/core'

export const useSearchDialogStore = create<SearchDialogStoreState>(set => ({
  // 全局搜索弹窗开关。
  open: false,
  // 受控设置搜索弹窗开关。
  setOpen: open => set({ open }),
  // 打开全局搜索弹窗。
  openDialog: () => set({ open: true }),
  // 关闭全局搜索弹窗。
  closeDialog: () => set({ open: false }),
  // 切换全局搜索弹窗开关，供快捷键入口复用。
  toggleDialog: () => set(state => ({ open: !state.open })),
}))
