type AudioPermissionDetails = {
  mediaType?: string
  mediaTypes?: string[]
}

type PermissionSession = {
  defaultSession: {
    setPermissionCheckHandler: (
      handler: (
        webContents: unknown,
        permission: unknown,
        requestingOrigin: string,
        details: unknown
      ) => boolean
    ) => void
    setPermissionRequestHandler: (
      handler: (
        webContents: unknown,
        permission: unknown,
        callback: (allowed: boolean) => void,
        details: unknown
      ) => void
    ) => void
  }
}

type RegisterWindowPermissionHandlersOptions = {
  session: PermissionSession
  isAllowedWebContents: (webContents: unknown) => boolean
}

/**
 * 判断是否允许音频相关权限。
 *
 * 应用只需要音频输出/选择能力，明确拒绝视频等更高风险权限，减少 renderer 或远程内容误申请权限的面。
 */
export function isAllowedAudioPermission(
  permission: string,
  details?: AudioPermissionDetails
) {
  if (permission === 'speaker-selection') {
    return true
  }

  if (permission !== 'media') {
    return false
  }

  const mediaTypes = details?.mediaTypes || []
  const mediaType = details?.mediaType
  if (!mediaTypes.length && mediaType) {
    return mediaType === 'audio'
  }

  return mediaTypes.includes('audio') && !mediaTypes.includes('video')
}

/**
 * 注册窗口权限校验和请求处理器。
 *
 * 只有当前主窗口的 webContents 可以申请权限，并且权限必须是音频相关；两层校验同时覆盖
 * Electron 的同步检查和异步请求流程。
 */
export function registerWindowPermissionHandlers({
  session,
  isAllowedWebContents,
}: RegisterWindowPermissionHandlersOptions) {
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, _requestingOrigin, details) => {
      return (
        isAllowedWebContents(webContents) &&
        isAllowedAudioPermission(
          String(permission),
          details as AudioPermissionDetails
        )
      )
    }
  )

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      callback(
        isAllowedWebContents(webContents) &&
          isAllowedAudioPermission(
            String(permission),
            details as AudioPermissionDetails
          )
      )
    }
  )
}
