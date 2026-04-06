import axios, { InternalAxiosRequestConfig } from 'axios'

// 扩展请求配置接口
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  retryCount?: number
  noRetry?: boolean
}
const musicApiPort = 7703
const baseURL = window.electron ? `http://127.0.0.1:${musicApiPort}` : import.meta.env.VITE_API

const request = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
})

// 最大重试次数
const MAX_RETRIES = 1
// 重试延迟（毫秒）
const RETRY_DELAY = 500

// 请求拦截器，添加重试配置
request.interceptors.request.use((config: CustomAxiosRequestConfig) => {
  // 初始化重试计数器
  config.retryCount = config.retryCount || 0
  return config
})

// 响应拦截器，处理错误并实现重试机制
request.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config as CustomAxiosRequestConfig
    // 如果没有配置，直接返回错误
    if (!config) {
      return Promise.reject(error)
    }

    if (config.noRetry) {
      return Promise.reject(error)
    }
    if (config.retryCount !== undefined && config.retryCount < MAX_RETRIES) {
      config.retryCount += 1
      console.error(`请求重试第 ${config.retryCount} 次`)
      // 使用 Promise.delay 实现延迟重试
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return request(config)
    }
    console.error(`重试${MAX_RETRIES}次后仍然失败`)
    return Promise.reject(error)
  }
)

export default request
