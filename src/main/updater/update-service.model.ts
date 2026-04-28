/** 生成 quitAndInstall 参数；Windows 静默安装体验更接近常见桌面应用更新流程。 */
export function resolveQuitAndInstallOptions(platform: NodeJS.Platform) {
  return {
    isSilent: platform === 'win32',
    isForceRunAfter: true,
  }
}
