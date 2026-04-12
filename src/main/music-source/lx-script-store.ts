import electron, { type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  isProbablyLxMusicSourceScript,
  type LxInitedData,
  normalizeImportedLxMusicSource,
  parseLxScriptInfo,
  type ImportedLxMusicSource,
  type LxMusicSourceScriptDraft,
} from '../../shared/lx-music-source'

const LX_SCRIPT_FILE_EXTENSION = '.js'
const LX_SCRIPT_ID_PATTERN = /^[0-9a-f-]{36}$/i
const { app, dialog } = electron

function getLxScriptDirectory() {
  return path.join(app.getPath('userData'), 'music-sources', 'lx')
}

function getLxScriptPath(id: string) {
  return path.join(getLxScriptDirectory(), `${id}${LX_SCRIPT_FILE_EXTENSION}`)
}

function isValidScriptId(id: string) {
  return LX_SCRIPT_ID_PATTERN.test(id)
}

function assertLxMusicSourceScript(rawScript: string) {
  if (!rawScript.trim()) {
    throw new Error('音源脚本内容为空')
  }

  if (!isProbablyLxMusicSourceScript(rawScript)) {
    throw new Error('音源脚本未检测到合法的 LX 脚本特征')
  }
}

export async function selectLxMusicSourceScript(
  ownerWindow?: BrowserWindow | null
): Promise<LxMusicSourceScriptDraft | null> {
  const result = await dialog.showOpenDialog(ownerWindow ?? undefined, {
    title: '导入落雪音源脚本',
    properties: ['openFile'],
    filters: [
      { name: 'JavaScript', extensions: ['js', 'mjs', 'cjs'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  const filePath = result.filePaths[0]
  const rawScript = await readFile(filePath, 'utf8')
  assertLxMusicSourceScript(rawScript)
  const info = parseLxScriptInfo(rawScript)

  return {
    ...info,
    fileName: path.basename(filePath),
    rawScript,
  }
}

export async function downloadLxMusicSourceScriptFromUrl(
  url: string
): Promise<LxMusicSourceScriptDraft> {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('音源脚本 URL 无效')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('仅支持 http 或 https 音源脚本地址')
  }

  const response = await fetch(parsedUrl)
  if (!response.ok) {
    throw new Error(`在线音源脚本下载失败：HTTP ${response.status}`)
  }

  const rawScript = await response.text()
  assertLxMusicSourceScript(rawScript)
  const info = parseLxScriptInfo(rawScript)
  const fileName =
    path.basename(parsedUrl.pathname) || `${info.name || 'lx-source'}.js`

  return {
    ...info,
    fileName,
    rawScript,
  }
}

export async function saveLxMusicSourceScript(
  draft: LxMusicSourceScriptDraft,
  initedData?: LxInitedData
): Promise<ImportedLxMusicSource> {
  const rawScript = typeof draft.rawScript === 'string' ? draft.rawScript : ''
  assertLxMusicSourceScript(rawScript)

  const scriptInfo = parseLxScriptInfo(rawScript)
  const id = randomUUID()
  const now = Date.now()
  const source = normalizeImportedLxMusicSource({
    ...scriptInfo,
    id,
    fileName: draft.fileName || `${scriptInfo.name}.js`,
    sources: initedData ? Object.keys(initedData.sources) : draft.sources,
    createdAt: now,
    updatedAt: now,
  })

  if (!source) {
    throw new Error('音源脚本信息无效')
  }

  await mkdir(getLxScriptDirectory(), { recursive: true })
  await writeFile(getLxScriptPath(id), rawScript, 'utf8')

  return source
}

export async function readLxMusicSourceScript(
  id: string
): Promise<string | null> {
  if (!isValidScriptId(id)) {
    return null
  }

  try {
    return await readFile(getLxScriptPath(id), 'utf8')
  } catch {
    return null
  }
}

export async function removeLxMusicSourceScript(id: string): Promise<void> {
  if (!isValidScriptId(id)) {
    return
  }

  await rm(getLxScriptPath(id), { force: true })
}
