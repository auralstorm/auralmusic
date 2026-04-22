import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useConfigStore } from '@/stores/config-store'
import {
  DEFAULT_EQUALIZER_CONFIG,
  EQ_BANDS,
  applyEqualizerPreset,
  updateEqualizerBandGain,
  updateEqualizerPreamp,
  type EqualizerBandFrequency,
  type EqualizerConfig,
} from '../../../../shared/equalizer.ts'
import {
  createEqualizerPresetOptions,
  createEqualizerSettingsDraft,
  EQUALIZER_SLIDER_MAX,
  EQUALIZER_SLIDER_MIN,
  EQUALIZER_SLIDER_STEP,
  formatEqualizerGainLabel,
  hasEqualizerBandGainChanged,
  hasEqualizerPreampChanged,
  resolveEqualizerSliderCommitValue,
} from './equalizer-settings.model'
import type { EqualizerSettingsDialogProps } from '../types'

function syncPersistedEqualizerConfig(nextConfig: EqualizerConfig) {
  useConfigStore.setState(state => ({
    config: {
      ...state.config,
      equalizer: nextConfig,
    },
  }))
}

const EqualizerSettingsDialog = ({
  open,
  onOpenChange,
}: EqualizerSettingsDialogProps) => {
  const savedEqualizerConfig = useConfigStore(state => state.config.equalizer)
  const isConfigLoading = useConfigStore(state => state.isLoading)
  const [draft, setDraft] = useState(() =>
    createEqualizerSettingsDraft(savedEqualizerConfig)
  )
  const [saving, setSaving] = useState(false)
  const committedConfigRef = useRef(
    createEqualizerSettingsDraft(savedEqualizerConfig)
  )
  const draftRef = useRef(draft)

  const applyEqualizerPreview = (nextConfig: EqualizerConfig) => {
    playbackRuntime.applyEqualizer(nextConfig)
  }

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (open) {
      return
    }

    const nextDraft = createEqualizerSettingsDraft(savedEqualizerConfig)
    committedConfigRef.current = nextDraft
    draftRef.current = nextDraft
    setDraft(nextDraft)
  }, [open, savedEqualizerConfig])

  useEffect(() => {
    if (!open) {
      return
    }

    const nextDraft = createEqualizerSettingsDraft(savedEqualizerConfig)
    committedConfigRef.current = nextDraft
    draftRef.current = nextDraft
    setDraft(nextDraft)
    // Opening should snapshot the persisted config once, not every preview update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const updateDraftPreview = (nextConfig: EqualizerConfig) => {
    draftRef.current = nextConfig
    setDraft(nextConfig)
    applyEqualizerPreview(nextConfig)
  }

  const persistDraft = async (nextConfig: EqualizerConfig) => {
    setSaving(true)

    try {
      await window.electronConfig.setConfig('equalizer', nextConfig)
      const persistedConfig = createEqualizerSettingsDraft(nextConfig)
      committedConfigRef.current = persistedConfig
      syncPersistedEqualizerConfig(persistedConfig)
    } catch (error) {
      const rollbackConfig = committedConfigRef.current

      draftRef.current = rollbackConfig
      setDraft(rollbackConfig)
      applyEqualizerPreview(rollbackConfig)
      toast.error(
        error instanceof Error
          ? error.message
          : '均衡器设置保存失败，请稍后重试。'
      )
    } finally {
      setSaving(false)
    }
  }

  const updateBandDraft = (frequency: EqualizerBandFrequency, gain: number) => {
    const nextConfig = updateEqualizerBandGain(
      draftRef.current,
      frequency,
      gain
    )
    updateDraftPreview(nextConfig)
    return nextConfig
  }

  const updatePreampDraft = (gain: number) => {
    const nextConfig = updateEqualizerPreamp(draftRef.current, gain)
    updateDraftPreview(nextConfig)
    return nextConfig
  }

  const closeDialog = () => {
    if (saving) {
      return
    }

    const committedConfig = committedConfigRef.current
    draftRef.current = committedConfig
    setDraft(committedConfig)
    applyEqualizerPreview(committedConfig)
    onOpenChange(false)
  }

  const disabled = isConfigLoading || saving
  const presetOptions = createEqualizerPresetOptions(draft.presetId)

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (saving) {
          return
        }

        if (!nextOpen) {
          closeDialog()
          return
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className='sm:max-w-4xl' showCloseButton={!saving}>
        <DialogHeader className='pr-8'>
          <DialogTitle>均衡器</DialogTitle>
          <DialogDescription>
            调整会实时作用到当前播放。关闭均衡器时，会保留当前预设和增益参数。
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          <div className='border-border/70 bg-muted/20 space-y-4 rounded-lg border p-4'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]'>
              <div className='flex items-center gap-3 space-y-2'>
                <div className='mb-0 font-medium'>预设</div>
                <Select
                  value={draft.presetId}
                  disabled={disabled}
                  onValueChange={presetId => {
                    if (presetId === 'custom') {
                      return
                    }

                    const nextConfig = createEqualizerSettingsDraft(
                      applyEqualizerPreset(draftRef.current, presetId)
                    )
                    updateDraftPreview(nextConfig)
                    void persistDraft(nextConfig)
                  }}
                >
                  <SelectTrigger className='bg-background border-border/70 h-9 px-4 shadow-none'>
                    <SelectValue placeholder='选择预设' />
                  </SelectTrigger>
                  <SelectContent>
                    {presetOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  className='h-9'
                  disabled={disabled}
                  onClick={() => {
                    const nextConfig = createEqualizerSettingsDraft({
                      ...DEFAULT_EQUALIZER_CONFIG,
                      enabled: draftRef.current.enabled,
                    })
                    updateDraftPreview(nextConfig)
                    void persistDraft(nextConfig)
                  }}
                >
                  <RotateCcw className='size-4' />
                  重置
                </Button>
              </div>
            </div>
          </div>

          <div className='space-y-3'>
            <div className='space-y-1'>
              <div className='text-sm font-medium'>频段调节</div>
              <p className='text-muted-foreground text-xs'>
                建议先从前级增益开始微调，再按频段补偿低频、中频和高频。
              </p>
            </div>

            <div className='border-border/70 bg-background rounded-lg border p-4'>
              <div className='overflow-x-auto pb-2'>
                <div className='grid min-w-[720px] grid-cols-11 gap-4'>
                  <div className='flex min-h-[320px] flex-col items-center gap-3'>
                    <div className='text-foreground text-xs font-medium tabular-nums'>
                      {formatEqualizerGainLabel(draft.preamp)}
                    </div>
                    <Slider
                      aria-label='前级增益'
                      orientation='vertical'
                      className='h-56'
                      min={EQUALIZER_SLIDER_MIN}
                      max={EQUALIZER_SLIDER_MAX}
                      step={EQUALIZER_SLIDER_STEP}
                      value={[draft.preamp]}
                      disabled={disabled}
                      onValueChange={value => {
                        updatePreampDraft(
                          resolveEqualizerSliderCommitValue(value)
                        )
                      }}
                      onValueCommit={value => {
                        const nextGain =
                          resolveEqualizerSliderCommitValue(value)

                        if (
                          hasEqualizerPreampChanged(draftRef.current, nextGain)
                        ) {
                          const nextConfig = updatePreampDraft(nextGain)
                          void persistDraft(nextConfig)
                          return
                        }

                        void persistDraft(draftRef.current)
                      }}
                    />
                    <div className='space-y-1 text-center'>
                      <div className='text-sm font-medium'>前级</div>
                      <div className='text-muted-foreground text-xs'>
                        Preamp
                      </div>
                    </div>
                  </div>

                  {EQ_BANDS.map(band => {
                    const draftBand = draft.bands.find(
                      item => item.frequency === band.frequency
                    )

                    return (
                      <div
                        key={band.frequency}
                        className='flex min-h-[320px] flex-col items-center gap-3'
                      >
                        <div className='text-foreground text-xs font-medium tabular-nums'>
                          {formatEqualizerGainLabel(draftBand?.gain ?? 0)}
                        </div>
                        <Slider
                          aria-label={`${band.label} 增益`}
                          orientation='vertical'
                          className='h-56'
                          min={EQUALIZER_SLIDER_MIN}
                          max={EQUALIZER_SLIDER_MAX}
                          step={EQUALIZER_SLIDER_STEP}
                          value={[draftBand?.gain ?? 0]}
                          disabled={disabled}
                          onValueChange={value => {
                            updateBandDraft(
                              band.frequency,
                              resolveEqualizerSliderCommitValue(value)
                            )
                          }}
                          onValueCommit={value => {
                            const nextGain =
                              resolveEqualizerSliderCommitValue(value)

                            if (
                              hasEqualizerBandGainChanged(
                                draftRef.current,
                                band.frequency,
                                nextGain
                              )
                            ) {
                              const nextConfig = updateBandDraft(
                                band.frequency,
                                nextGain
                              )
                              void persistDraft(nextConfig)
                              return
                            }

                            void persistDraft(draftRef.current)
                          }}
                        />
                        <div className='text-sm font-medium'>{band.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className='text-muted-foreground mr-auto text-xs'>
            增益提升越大，越容易出现爆音。建议优先下调前级增益，再逐步补偿频段。
          </div>
          <Button
            type='button'
            variant='outline'
            disabled={saving}
            onClick={closeDialog}
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EqualizerSettingsDialog
