import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

export const MAIN_LOG_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const MAIN_LOG_ARCHIVE_LIMIT = 3
export const MAIN_LOG_RETENTION_DAYS = 14

type RotateLogFileDeps = {
  exists?: (targetPath: string) => boolean
  rename?: (from: string, to: string) => void
  remove?: (targetPath: string) => void
}

type CleanupLogDirectoryDeps = {
  now?: () => number
  readDir?: (targetDir: string) => string[]
  stat?: (targetPath: string) => { mtimeMs: number; isFile: () => boolean }
  remove?: (targetPath: string) => void
}

/** 生成第 N 个轮转日志文件路径，例如 main.log -> main.1.log。 */
function readRotatedLogPath(logFilePath: string, index: number) {
  const parsed = path.parse(logFilePath)
  return path.join(parsed.dir, `${parsed.name}.${index}${parsed.ext}`)
}

/**
 * 轮转当前日志文件。
 *
 * electron-log 触发 maxSize 后调用这里，项目只保留有限数量归档，避免日志无限增长。
 */
export function rotateLogFile(
  logFilePath: string,
  deps: RotateLogFileDeps = {}
) {
  const exists = deps.exists ?? existsSync
  const rename = deps.rename ?? renameSync
  const remove =
    deps.remove ?? (targetPath => rmSync(targetPath, { force: true }))

  const oldestArchivePath = readRotatedLogPath(
    logFilePath,
    MAIN_LOG_ARCHIVE_LIMIT
  )
  if (exists(oldestArchivePath)) {
    remove(oldestArchivePath)
  }

  for (let index = MAIN_LOG_ARCHIVE_LIMIT - 1; index >= 1; index -= 1) {
    const from = readRotatedLogPath(logFilePath, index)
    if (!exists(from)) {
      continue
    }

    rename(from, readRotatedLogPath(logFilePath, index + 1))
  }

  if (exists(logFilePath)) {
    rename(logFilePath, readRotatedLogPath(logFilePath, 1))
  }
}

/** 删除超过保留天数的日志文件，启动时执行一次即可控制长期磁盘占用。 */
export function cleanupOldLogFiles(
  logDirectory: string,
  deps: CleanupLogDirectoryDeps = {}
) {
  const now = deps.now ?? Date.now
  const readDir = deps.readDir ?? readdirSync
  const stat = deps.stat ?? statSync
  const remove =
    deps.remove ?? (targetPath => rmSync(targetPath, { force: true }))
  const cutoff = now() - MAIN_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000

  for (const fileName of readDir(logDirectory)) {
    if (!/\.log$/i.test(fileName)) {
      continue
    }

    const targetPath = path.join(logDirectory, fileName)
    const fileStat = stat(targetPath)
    if (!fileStat.isFile() || fileStat.mtimeMs >= cutoff) {
      continue
    }

    remove(targetPath)
  }
}
