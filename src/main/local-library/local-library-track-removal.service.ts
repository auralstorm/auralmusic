import path from 'node:path'
import { rm } from 'node:fs/promises'

import type {
  LocalLibraryTrackDeleteInput,
  LocalLibraryTrackDeleteResult,
  LocalLibraryTrackRecord,
} from '../../shared/local-library.ts'

type LocalLibraryTrackRemovalDependencies = {
  database: {
    getTrackByFilePath: (filePath: string) => LocalLibraryTrackRecord | null
    removeTrackByFilePath: (filePath: string) => boolean
  }
  removeFile?: (targetPath: string) => Promise<void>
}

async function removeFileIfExists(
  targetPath: string,
  removeFile: (targetPath: string) => Promise<void>
) {
  try {
    await removeFile(targetPath)
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: string }).code)
        : ''

    // 删除流程允许目标文件已不存在，避免库索引修正时被历史脏数据卡住。
    if (errorCode === 'ENOENT') {
      return
    }

    throw error
  }
}

/**
 * 删除本地乐库歌曲，按模式决定是否落盘删除音频和同名歌词。
 * @param input 删除模式和目标文件
 * @param dependencies 数据库和文件删除依赖
 * @returns 是否成功从本地乐库移除
 */
export async function removeLocalLibraryTrack(
  input: LocalLibraryTrackDeleteInput,
  dependencies: LocalLibraryTrackRemovalDependencies
): Promise<LocalLibraryTrackDeleteResult> {
  const track = dependencies.database.getTrackByFilePath(input.filePath)
  if (!track) {
    return { removed: false }
  }

  if (input.mode === 'permanent') {
    const removeFile = dependencies.removeFile ?? (targetPath => rm(targetPath))
    const fileInfo = path.parse(track.filePath)
    const lyricFilePath = path.join(fileInfo.dir, `${fileInfo.name}.lrc`)

    await removeFileIfExists(track.filePath, removeFile)
    await removeFileIfExists(lyricFilePath, removeFile)
  }

  return {
    removed: dependencies.database.removeTrackByFilePath(track.filePath),
  }
}
