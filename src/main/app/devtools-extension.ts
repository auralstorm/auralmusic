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
