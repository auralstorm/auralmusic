import path from 'node:path'

type RendererLoadTarget =
  | {
      type: 'file'
      value: string
    }
  | {
      type: 'url'
      value: string
    }

type RendererLoadTargetOptions = {
  appIsPackaged: boolean
  mainDirname: string
  rendererUrl?: string
}

/**
 * 解析主窗口应该加载的 renderer 入口。
 *
 * 开发环境加载 Vite dev server，生产环境加载打包后的 index.html；这里把分支集中起来，
 * 避免窗口创建逻辑同时关心路径和运行模式。
 */
export function resolveRendererLoadTarget({
  appIsPackaged,
  mainDirname,
  rendererUrl,
}: RendererLoadTargetOptions): RendererLoadTarget {
  if (appIsPackaged) {
    return {
      type: 'file',
      value: path.join(mainDirname, '../renderer/index.html'),
    }
  }

  if (!rendererUrl) {
    // 开发模式没有 renderer URL 时窗口无法启动，直接抛错能更早暴露环境配置问题。
    throw new Error('ELECTRON_RENDERER_URL is required in development')
  }

  return {
    type: 'url',
    value: rendererUrl,
  }
}

/** 解析 preload 打包产物路径，主窗口只通过这个受控桥接访问 Electron 能力。 */
export function resolvePreloadPath(mainDirname: string) {
  return path.join(mainDirname, '../preload/index.cjs')
}
