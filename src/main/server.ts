/**
 * Check if a port is available
 * @param port
 * @returns
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const net = require('net')
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false)
      })
      .once('listening', () => {
        tester.close(() => resolve(true))
      })
      .listen(port)
  })
}

async function startMusicApi(): Promise<void> {
  console.log('MUSIC API STARTING...')
  let port = 7703
  const maxRetries = 10
  // 检查端口是否可用，如果不可用则尝试下一个端口
  for (let i = 0; i < maxRetries; i++) {
    const isAvailable = await checkPortAvailable(port)
    if (isAvailable) {
      break
    }
    console.log(`端口 ${port} 被占用，尝试切换到端口 ${port + 1}`)
    port++
  }

  // 如果端口发生变化，保存新端口到配置

  try {
    const server = require('@neteasecloudmusicapienhanced/api/server')
    await server.serveNcmApi({
      port,
      // 安全默认值：仅监听本机回环地址，避免对局域网暴露
      host: '127.0.0.1',
    })
    console.log(`MUSIC API STARTED on port ${port}`)
  } catch (error) {
    console.error(`MUSIC API 启动失败:`, error)
    throw error
  }
}

export { startMusicApi }
