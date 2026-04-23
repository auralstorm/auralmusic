export type ThemeColorVariableName =
  | '--primary'
  | '--primary-foreground'
  | '--ring'
  | '--accent'
  | '--accent-foreground'
  | '--sidebar-primary'
  | '--sidebar-primary-foreground'
  | '--sidebar-accent'
  | '--sidebar-accent-foreground'

export type ThemeColorTokenMap = Record<ThemeColorVariableName, string>

export interface AnimationEffectRoot {
  dataset: {
    animationEffect?: string
  }
}

export interface RuntimeEnvironmentRoot {
  dataset: {
    runtimePlatform?: string
    runtimeArch?: string
    backdropBlur?: string
  }
}
