import electron from 'electron'

const { app } = electron

export type UserDataPathGetter = (name: 'userData') => string

/**
 * 解析应用持久化存储目录。
 *
 * 所有 electron-store 实例统一落到 userData，防止不同模块各自选择 cwd 导致配置分散。
 */
export function resolveAppStoreDirectory(
  appGetPath: UserDataPathGetter = name => app.getPath(name)
) {
  const directory = appGetPath('userData')

  if (typeof directory !== 'string' || !directory.trim()) {
    throw new Error('Failed to resolve Electron userData directory')
  }

  return directory
}
