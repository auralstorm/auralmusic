import { useEffect, useState } from 'react'
import { Check, Download, FileCode2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import { validateLxMusicSourceScript } from '@/services/music-source/LxMusicSourceRunner'
import {
  createMusicSourceSettingsDraft,
  createMusicSourceSettingsSaveEntries,
} from './music-source-settings.model'
import type {
  ImportedLxMusicSource,
  LxMusicSourceScriptDraft,
} from '../../../../shared/lx-music-source'
import {
  ENHANCED_SOURCE_MODULES,
  type EnhancedSourceModule,
} from '../../../../shared/config.ts'
import type {
  MusicSourceSettingsDialogProps,
  MusicSourceTab,
  ScriptInfoCardProps,
  SourceToggleProps,
} from '../types'

const ENHANCED_SOURCE_MODULE_LABELS: Record<EnhancedSourceModule, string> = {
  unm: 'UNM',
  bikonoo: 'Bikonoo',
  gdmusic: 'GDMusic',
  msls: 'MSLS',
  qijieya: 'Qijieya',
  baka: 'Baka',
}

const SourceToggle = ({ checked, disabled, onChange }: SourceToggleProps) => {
  return (
    <button
      type='button'
      disabled={disabled}
      aria-pressed={checked}
      onClick={onChange}
      className={cn(
        'bg-muted/60 relative h-8 w-24 rounded-full px-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        checked
          ? 'bg-primary/90 text-primary-foreground'
          : 'text-muted-foreground'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'bg-background absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300',
          checked ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <span className='relative z-10 grid h-full grid-cols-2 items-center'>
        <span className={cn(!checked && 'text-foreground')}>关闭</span>
        <span className={cn(checked && 'text-foreground')}>开启</span>
      </span>
    </button>
  )
}

const ScriptInfoCard = ({
  script,
  active,
  disabled,
  onActivate,
  onRemove,
}: ScriptInfoCardProps) => {
  const meta = [
    script.version ? `版本 ${script.version}` : null,
    script.author ? `作者 ${script.author}` : null,
    script.sources?.length ? `支持 ${script.sources.join(', ')}` : null,
  ].filter(Boolean)

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 transition-colors',
        active
          ? 'border-primary/40 bg-primary/5'
          : 'border-border/70 bg-muted/30'
      )}
    >
      <button
        type='button'
        disabled={disabled}
        aria-label='设为当前落雪音源'
        onClick={onActivate}
        className={cn(
          'mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40'
        )}
      >
        {active ? <Check className='size-3.5' /> : null}
      </button>
      <div className='bg-background text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'>
        <FileCode2 className='size-5' />
      </div>
      <div className='min-w-0 flex-1 space-y-1'>
        <h4 className='truncate text-sm font-semibold'>{script.name}</h4>
        <p className='text-muted-foreground truncate text-xs'>
          {script.fileName}
        </p>
        {script.description ? (
          <p className='text-muted-foreground line-clamp-2 text-xs'>
            {script.description}
          </p>
        ) : null}
        {meta.length ? (
          <p className='text-muted-foreground text-xs'>{meta.join(' / ')}</p>
        ) : null}
      </div>
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        disabled={disabled}
        aria-label='删除落雪音源脚本'
        onClick={onRemove}
      >
        <Trash2 className='size-4' />
      </Button>
    </div>
  )
}

const MusicSourceSettingsDialog = ({
  open,
  onOpenChange,
}: MusicSourceSettingsDialogProps) => {
  const config = useConfigStore(state => state.config)
  const setConfig = useConfigStore(state => state.setConfig)
  const [activeTab, setActiveTab] = useState<MusicSourceTab>('enhanced-unblock')
  const [enhancedModules, setEnhancedModules] = useState<
    EnhancedSourceModule[]
  >([])
  const [lxScripts, setLxScripts] = useState<ImportedLxMusicSource[]>([])
  const [activeLxScriptId, setActiveLxScriptId] = useState<string | null>(null)
  const [hasLegacyProviders, setHasLegacyProviders] = useState(false)
  const [customApiEnabled, setCustomApiEnabled] = useState(false)
  const [customApiUrl, setCustomApiUrl] = useState('')
  const [onlineScriptUrl, setOnlineScriptUrl] = useState('')
  const [importingLocal, setImportingLocal] = useState(false)
  const [importingOnline, setImportingOnline] = useState(false)
  const [saving, setSaving] = useState(false)

  const importing = importingLocal || importingOnline

  useEffect(() => {
    if (!open) {
      return
    }

    const draft = createMusicSourceSettingsDraft(config)

    setActiveTab('enhanced-unblock')
    setEnhancedModules(draft.enhancedSourceModules)
    setLxScripts(config.luoxueMusicSourceScripts)
    setActiveLxScriptId(config.activeLuoxueMusicSourceScriptId)
    setHasLegacyProviders(draft.hasLegacyProviders)
    setCustomApiEnabled(draft.customMusicApiEnabled)
    setCustomApiUrl(draft.customMusicApiUrl)
    setOnlineScriptUrl('')
    // Only sync once when opening so script import does not reset the active tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleEnhancedModule = (
    module: EnhancedSourceModule,
    checked: boolean
  ) => {
    setEnhancedModules(current => {
      if (checked) {
        return current.includes(module) ? current : [...current, module]
      }

      return current.filter(item => item !== module)
    })
  }

  const persistLxScripts = async (
    scripts: ImportedLxMusicSource[],
    activeId: string | null
  ) => {
    const nextActiveId = scripts.some(script => script.id === activeId)
      ? activeId
      : scripts[0]?.id || null

    setLxScripts(scripts)
    setActiveLxScriptId(nextActiveId)

    await setConfig('luoxueMusicSourceScripts', scripts)
    await setConfig('activeLuoxueMusicSourceScriptId', nextActiveId)
  }

  const validateAndSaveLxScript = async (draft: LxMusicSourceScriptDraft) => {
    const initedData = await validateLxMusicSourceScript(draft.rawScript)
    const savedScript = await window.electronMusicSource.saveLxScript(
      {
        ...draft,
        sources: Object.keys(initedData.sources),
      },
      initedData
    )
    const nextScripts = [...lxScripts, savedScript]

    await persistLxScripts(nextScripts, savedScript.id)
    toast.success(`已导入落雪音源：${savedScript.name}`)
  }

  const handleImportLocalLxScript = async () => {
    if (importing) {
      return
    }

    setImportingLocal(true)

    try {
      const draft = await window.electronMusicSource.selectLxScript()
      if (!draft) {
        return
      }

      await validateAndSaveLxScript(draft)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '导入音源脚本失败，请重试。'
      )
    } finally {
      setImportingLocal(false)
    }
  }

  const handleImportOnlineLxScript = async () => {
    if (importing) {
      return
    }

    const url = onlineScriptUrl.trim()
    if (!url) {
      toast.warning('请输入在线音源脚本 URL')
      return
    }

    setImportingOnline(true)

    try {
      const draft =
        await window.electronMusicSource.downloadLxScriptFromUrl(url)
      await validateAndSaveLxScript(draft)
      setOnlineScriptUrl('')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : '在线导入音源脚本失败，请重试。'
      )
    } finally {
      setImportingOnline(false)
    }
  }

  const handleActivateLxScript = async (scriptId: string) => {
    if (saving || importing) {
      return
    }

    try {
      await persistLxScripts(lxScripts, scriptId)
      toast.success('已切换落雪音源')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '切换落雪音源失败，请重试。'
      )
    }
  }

  const handleRemoveLxScript = async (scriptId: string) => {
    if (saving || importing) {
      return
    }

    const nextScripts = lxScripts.filter(script => script.id !== scriptId)
    const nextActiveId =
      activeLxScriptId === scriptId
        ? nextScripts[0]?.id || null
        : activeLxScriptId

    try {
      await persistLxScripts(nextScripts, nextActiveId)
      await window.electronMusicSource.removeLxScript(scriptId)
      toast.success('已删除落雪音源脚本')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '删除落雪音源失败，请重试。'
      )
    }
  }

  const handleSave = async () => {
    if (saving) {
      return
    }

    setSaving(true)

    try {
      const saveEntries = createMusicSourceSettingsSaveEntries({
        enhancedSourceModules: enhancedModules,
        luoxueSourceEnabled: Boolean(activeLxScriptId),
        customMusicApiEnabled: customApiEnabled,
        customMusicApiUrl: customApiUrl,
      })

      for (const [key, value] of saveEntries) {
        await setConfig(key, value)
      }

      setHasLegacyProviders(false)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '保存音源设置失败，请重试。'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='grid h-[min(620px,calc(100vh-4rem))] w-[min(680px,calc(100vw-2rem))] max-w-none grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[28px] p-0 lg:max-w-170'>
        <div className='flex min-h-0 flex-col gap-5 px-7 pt-7 pb-4'>
          <DialogHeader className='shrink-0'>
            <DialogTitle className='text-xl font-semibold'>
              音源设置
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as MusicSourceTab)}
            className='min-h-0 flex-1 gap-4'
          >
            <TabsList className='bg-muted/60 grid h-10 w-full shrink-0 grid-cols-2 rounded-2xl p-1'>
              <TabsTrigger value='enhanced-unblock' className='rounded-xl'>
                默认源
              </TabsTrigger>
              <TabsTrigger value='luoxue' className='rounded-xl'>
                落雪音源
              </TabsTrigger>
              {/* <TabsTrigger value='custom-api' className='rounded-xl'>
                自定义 API
              </TabsTrigger> */}
            </TabsList>

            <TabsContent
              value='enhanced-unblock'
              className='min-h-0 space-y-4 overflow-y-auto pr-1'
            >
              <div>
                <h3 className='text-foreground text-sm font-semibold'>
                  默认源顺序
                </h3>
              </div>

              {hasLegacyProviders ? (
                <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100'>
                  检测到旧版“咪咕 / 酷狗 / pyncmd /
                  哔哩哔哩”配置。这些旧配置已失效，保存时会自动清理。
                </div>
              ) : null}

              <div className='grid grid-cols-2 gap-3'>
                {ENHANCED_SOURCE_MODULES.map(module => (
                  <label
                    key={module}
                    className='border-border/70 bg-muted/30 hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors'
                  >
                    <Checkbox
                      checked={enhancedModules.includes(module)}
                      onCheckedChange={checked =>
                        toggleEnhancedModule(module, checked === true)
                      }
                    />
                    <span className='min-w-0 flex-1 text-sm font-medium'>
                      {ENHANCED_SOURCE_MODULE_LABELS[module]}
                      <span className='text-muted-foreground block text-[11px] font-normal'>
                        {module}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className='border-border/70 bg-muted/20 text-muted-foreground rounded-2xl border px-4 py-3 text-xs leading-5'>
                `baka`
                当前默认不建议启用。如果它恢复可用，你可以手动勾上并调整到靠后顺序作为备用模块。
              </div>
            </TabsContent>

            <TabsContent
              value='luoxue'
              className='min-h-0 flex-col gap-3 data-[state=active]:flex data-[state=inactive]:hidden'
            >
              <div className='flex shrink-0 items-start justify-between gap-4'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold'>
                    落雪音源
                  </h3>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    支持本地导入和在线 URL 导入 LX Music
                    自定义源脚本。保存时会根据是否有可用脚本决定是否参与解析。
                  </p>
                </div>
              </div>

              {lxScripts.length ? (
                <div className='min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
                  {lxScripts.map(script => (
                    <ScriptInfoCard
                      key={script.id}
                      script={script}
                      active={script.id === activeLxScriptId}
                      disabled={saving || importing}
                      onActivate={() => void handleActivateLxScript(script.id)}
                      onRemove={() => void handleRemoveLxScript(script.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className='border-border/70 bg-muted/20 text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center text-sm'>
                  <FileCode2 className='size-6' />
                  <span>尚未导入落雪音源脚本</span>
                </div>
              )}

              <div className='border-border/60 shrink-0 border-t pt-3'>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={importing}
                    onClick={() => void handleImportLocalLxScript()}
                  >
                    <Upload
                      className={importingLocal ? 'animate-pulse' : undefined}
                    />
                    本地导入脚本
                  </Button>
                  <Input
                    value={onlineScriptUrl}
                    disabled={importing}
                    placeholder='输入在线落雪音源脚本 URL'
                    onChange={event => setOnlineScriptUrl(event.target.value)}
                    className='bg-muted/40 h-8 border-none px-4'
                  />
                  <Button
                    type='button'
                    disabled={!onlineScriptUrl.trim() || importing}
                    onClick={() => void handleImportOnlineLxScript()}
                  >
                    <Download
                      className={importingOnline ? 'animate-pulse' : undefined}
                    />
                    在线导入
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='custom-api' className='min-h-[320px] space-y-4'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h3 className='text-foreground text-sm font-semibold'>
                    自定义 API
                  </h3>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    填写自定义音乐解析 API 地址，关闭时不会参与解析。
                  </p>
                </div>
                <SourceToggle
                  checked={customApiEnabled}
                  onChange={() => setCustomApiEnabled(value => !value)}
                />
              </div>
              <Input
                value={customApiUrl}
                disabled={!customApiEnabled}
                placeholder='https://example.com/api'
                onChange={event => setCustomApiUrl(event.target.value)}
                className='bg-muted/40 h-10 border-none px-4'
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className='mx-0 mb-0 px-7 py-5'>
          <Button
            type='button'
            variant='ghost'
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type='button'
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MusicSourceSettingsDialog
