import { readdir } from 'node:fs/promises'
import path from 'node:path'

export const DEFAULT_DEVTOOLS_EXTENSION_ROOT_PATH =
  process.env.AURALMUSIC_DEVTOOLS_EXTENSION_DIR ||
  'C:\\Users\\s1769\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\fmkadmapgofadopljbjfkapdkoienihi'

type LoadExtensionOptions = {
  allowFileAccess?: boolean
}

type ReadDirectoryNames = (directoryPath: string) => Promise<string[]>
type LoadExtension = (
  extensionPath: string,
  options: LoadExtensionOptions
) => Promise<unknown>

/**
 * 读取 Chrome 扩展目录下的版本目录，并按版本号倒序排列。
 *
 * Chrome 扩展每次升级都会生成一个版本子目录，Electron 需要加载具体版本目录而不是根目录。
 */
export async function readChromeExtensionVersionDirectories(
  extensionRootPath: string
) {
  const entries = await readdir(extensionRootPath, {
    withFileTypes: true,
  })

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((left, right) => {
      return right.localeCompare(left, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    })
}

/**
 * 解析可加载的最新扩展版本目录。
 *
 * 允许注入 readDirectoryNames，便于测试不存在真实 Chrome 扩展目录时也能验证排序逻辑。
 */
export async function resolveChromeExtensionVersionPath({
  extensionRootPath,
  readDirectoryNames = readChromeExtensionVersionDirectories,
}: {
  extensionRootPath: string
  readDirectoryNames?: ReadDirectoryNames
}) {
  const directoryNames = (await readDirectoryNames(extensionRootPath)).sort(
    (left, right) => {
      return right.localeCompare(left, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    }
  )
  const latestVersionDirectory = directoryNames[0]

  if (!latestVersionDirectory) {
    return null
  }

  return path.join(extensionRootPath, latestVersionDirectory)
}

/**
 * 在开发环境加载 React DevTools 扩展。
 *
 * 生产包直接返回 null，避免把开发机路径、扩展权限和加载失败暴露到用户环境。
 */
export async function loadDevelopmentDevToolsExtension({
  appIsPackaged,
  extensionRootPath = DEFAULT_DEVTOOLS_EXTENSION_ROOT_PATH,
  readDirectoryNames = readChromeExtensionVersionDirectories,
  loadExtension,
}: {
  appIsPackaged: boolean
  extensionRootPath?: string
  readDirectoryNames?: ReadDirectoryNames
  loadExtension: LoadExtension
}) {
  if (appIsPackaged) {
    return null
  }

  const extensionPath = await resolveChromeExtensionVersionPath({
    extensionRootPath,
    readDirectoryNames,
  })

  if (!extensionPath) {
    return null
  }

  await loadExtension(extensionPath, {
    allowFileAccess: true,
  })

  return extensionPath
}
