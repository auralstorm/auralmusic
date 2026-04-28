import { create } from 'zustand'

import type { AppUpdateSnapshot } from '../../shared/update.ts'
import type { UpdateStoreState } from '@/types/update'

const defaultSnapshot: AppUpdateSnapshot = {
  // 当前更新状态，idle 表示未触发检查。
  status: 'idle',
  // 当前应用版本，SSR/测试环境没有 window 时使用兜底版本。
  currentVersion:
    typeof window === 'undefined' ? '1.0.0' : window.appRuntime.getAppVersion(),
  // 远端最新版本，未检查或无更新时为空。
  latestVersion: null,
  // 更新日志，展示在更新弹窗。
  releaseNotes: '',
  // 远端发布日期。
  releaseDate: null,
  // 外部下载页地址，Linux 等平台可能使用浏览器下载。
  releaseUrl: null,
  // 更新动作模式：内置下载安装或跳转外部链接。
  actionMode:
    typeof window !== 'undefined' && window.appRuntime.getPlatform() === 'linux'
      ? 'external-link'
      : 'install',
  // 下载进度百分比。
  downloadProgress: 0,
  // 已下载字节数。
  downloadedBytes: 0,
  // 总字节数，未知时为 0。
  totalBytes: 0,
  // 更新流程错误文案。
  errorMessage: null,
  // 最近一次检查更新时间戳。
  lastCheckedAt: null,
  // 最近一次触发来源，用于区分自动检查和手动检查。
  lastTrigger: null,
}

export const useUpdateStore = create<UpdateStoreState>(set => ({
  // 主进程更新服务同步过来的完整快照。
  snapshot: defaultSnapshot,
  // 更新弹窗开关，独立于更新状态本身。
  isModalOpen: false,
  // 用主进程最新快照覆盖 renderer 状态。
  syncSnapshot: snapshot => {
    set({ snapshot })
  },
  // 打开更新弹窗。
  openModal: () => {
    set({ isModalOpen: true })
  },
  // 关闭更新弹窗。
  closeModal: () => {
    set({ isModalOpen: false })
  },
  // 受控设置更新弹窗状态。
  setModalOpen: open => {
    set({ isModalOpen: open })
  },
}))
