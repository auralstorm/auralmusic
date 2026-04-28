import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createLocalMediaUrl } from '../../shared/local-media.ts'
import type { ResolveAudioSourceResult } from './cache-types'

const AUDIO_DIR_NAME = 'audio'

type PlaybackTempCacheServiceOptions = {
  defaultRootDir: string
  fetcher?: typeof fetch
}

type ResolvePlaybackTempAudioSourceParams = {
  cacheKey: string
  sourceUrl: string
}

/** 临时缓存 id 同时包含业务 key 和源地址，避免同一歌曲不同音质/地址互相覆盖。 */
function buildTempCacheId(cacheKey: string, sourceUrl: string) {
  return createHash('sha256')
    .update(cacheKey)
    .update(':')
    .update(sourceUrl)
    .digest('hex')
}

/** 优先从 URL 路径推断扩展名，失败时再依赖响应 content-type。 */
function getUrlExtension(sourceUrl: string) {
  try {
    const extension = path.extname(new URL(sourceUrl).pathname)
    if (/^\.[a-zA-Z0-9]{1,8}$/.test(extension)) {
      return extension.toLowerCase()
    }
  } catch {
    // ignore invalid source urls and fall back to content type
  }

  return '.bin'
}

/** 根据音频 content-type 选择文件扩展名，保证 local-media 协议能推断正确 MIME。 */
function getContentTypeExtension(contentType: string | null) {
  if (!contentType) {
    return '.bin'
  }

  if (contentType.includes('audio/mpeg')) {
    return '.mp3'
  }
  if (contentType.includes('audio/flac')) {
    return '.flac'
  }
  if (contentType.includes('audio/aac')) {
    return '.aac'
  }
  if (contentType.includes('audio/mp4')) {
    return '.m4a'
  }
  if (contentType.includes('audio/ogg')) {
    return '.ogg'
  }
  if (
    contentType.includes('audio/wav') ||
    contentType.includes('audio/x-wav')
  ) {
    return '.wav'
  }

  return '.bin'
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 播放会话级临时缓存服务。
 *
 * 当用户关闭磁盘缓存但播放器需要稳定的本地媒体 URL 时使用；缓存目录会在启动和退出时清理，
 * 不参与长期磁盘缓存容量管理。
 */
export class PlaybackTempCacheService {
  private readonly defaultRootDir: string
  private readonly fetcher: typeof fetch
  private clearInFlight: Promise<void> = Promise.resolve()

  constructor(options: PlaybackTempCacheServiceOptions) {
    this.defaultRootDir = options.defaultRootDir
    this.fetcher = options.fetcher ?? fetch
  }

  getDefaultTempRoot() {
    return this.defaultRootDir
  }

  async resolveAudioSource(
    params: ResolvePlaybackTempAudioSourceParams
  ): Promise<ResolveAudioSourceResult> {
    // 清理正在进行时等待完成，避免刚删除目录又写入旧文件造成竞态。
    await this.clearInFlight

    const audioDir = path.join(this.defaultRootDir, AUDIO_DIR_NAME)
    const id = buildTempCacheId(params.cacheKey, params.sourceUrl)
    const knownExtensions = [
      '.mp3',
      '.flac',
      '.aac',
      '.m4a',
      '.ogg',
      '.wav',
      '.bin',
    ]

    await fs.mkdir(audioDir, { recursive: true })

    for (const extension of knownExtensions) {
      const cachedPath = path.join(audioDir, `${id}${extension}`)
      if (await fileExists(cachedPath)) {
        // 已缓存文件直接返回 local-media URL，避免重复下载同一临时资源。
        return { url: createLocalMediaUrl(cachedPath), fromCache: true }
      }
    }

    try {
      const response = await this.fetcher(params.sourceUrl)
      if (!response.ok) {
        // 临时缓存失败不阻断播放，回退远程地址让播放器继续尝试。
        return { url: params.sourceUrl, fromCache: false }
      }

      const bytes = Buffer.from(await response.arrayBuffer())
      const urlExt = getUrlExtension(params.sourceUrl)
      const contentExt = getContentTypeExtension(
        response.headers.get('content-type')
      )
      const extension = urlExt !== '.bin' ? urlExt : contentExt
      const absolutePath = path.join(audioDir, `${id}${extension}`)

      await fs.writeFile(absolutePath, bytes)

      return { url: createLocalMediaUrl(absolutePath), fromCache: true }
    } catch {
      // 网络/写盘异常都降级为原始 URL，避免缓存层影响播放主链路。
      return { url: params.sourceUrl, fromCache: false }
    }
  }

  async clear() {
    // 保存清理 promise，让 resolveAudioSource 能等待目录状态稳定后再写入。
    this.clearInFlight = this.clearAudioDir()
    await this.clearInFlight
  }

  private async clearAudioDir() {
    const audioDir = path.join(this.defaultRootDir, AUDIO_DIR_NAME)
    await fs.rm(audioDir, { recursive: true, force: true })
    await fs.mkdir(audioDir, { recursive: true })
  }
}
