import type { AxiosResponse } from 'axios'
import request from '@/lib/request'
import type {
  RawAuthResponseBody,
  RawVipInfoResponseBody,
} from '../../shared/auth'
import type {
  CaptchaParams,
  EmailLoginParams,
  PhoneLoginParams,
  QrLoginCheckParams,
} from '@/types/api'

/**
 * 剥离 AxiosResponse，仅把接口业务体交给 auth store 归一化。
 */
function unwrapResponse<T>(response: AxiosResponse<T>) {
  return response.data
}

/** 邮箱密码登录，返回原始认证响应体。 */
export function loginWithEmail(params: EmailLoginParams) {
  return request
    .post<RawAuthResponseBody>('/login', params)
    .then(unwrapResponse)
}

/** 手机号登录，支持密码或验证码，由 params 中字段决定。 */
export function loginWithPhone(params: PhoneLoginParams) {
  return request
    .post<RawAuthResponseBody>('/login/cellphone', params)
    .then(unwrapResponse)
}

/**
 * 发送手机验证码
 *
 * ctcode 默认中国区号 86，和登录表单默认国家码保持一致。
 */
export function sendLoginCaptcha(params: CaptchaParams) {
  return request
    .post<RawAuthResponseBody>('/captcha/sent', {
      ctcode: params.ctcode ?? '86',
      phone: params.phone,
    })
    .then(unwrapResponse)
}

/** 校验手机验证码，当前主要保留给验证码登录流程扩展使用。 */
export function verifyLoginCaptcha(params: PhoneLoginParams) {
  return request
    .post<RawAuthResponseBody>('/captcha/verify', {
      ctcode: params.countrycode ?? '86',
      phone: params.phone,
      captcha: params.captcha,
    })
    .then(unwrapResponse)
}

/**
 * 获取二维码登录 key
 *
 * timestamp 用于绕过接口缓存；ua=pc 可以减少移动端二维码兼容分支。
 */
export function getLoginQrKey() {
  return request
    .get<RawAuthResponseBody>('/login/qr/key', {
      params: {
        timestamp: Date.now(),
        ua: 'pc',
      },
    })
    .then(unwrapResponse)
}

/**
 * 根据二维码 key 创建二维码图片和跳转地址
 * @param key `/login/qr/key` 返回的 unikey
 */
export function createLoginQr(key: string) {
  return request
    .get<RawAuthResponseBody>('/login/qr/create', {
      params: {
        key,
        platform: 'web',
        qrimg: true,
        ua: 'pc',
        timestamp: Date.now(),
      },
    })
    .then(unwrapResponse)
}

/**
 * 轮询二维码登录状态
 *
 * 典型 code：801 等待扫码，802 已扫码待确认，803 授权成功，800 过期。
 */
export function checkLoginQr(key: QrLoginCheckParams['key']) {
  return request
    .get<RawAuthResponseBody>('/login/qr/check', {
      params: {
        key,
        ua: 'pc',
        timestamp: Date.now(),
      },
    })
    .then(unwrapResponse)
}

/**
 * 使用 cookie 检查登录状态
 * @param cookie 本地持久化的网易云 cookie
 */
export function getLoginStatus(cookie: string) {
  return request
    .post<RawAuthResponseBody>(
      '/login/status',
      {
        cookie,
      },
      {
        params: {
          timestamp: Date.now(),
          ua: 'pc',
        },
      }
    )
    .then(unwrapResponse)
}

/**
 * 获取当前账号信息
 * @param cookie 已登录会话 cookie，水合登录态时必须显式传入
 */
export function getUserAccount(cookie: string) {
  return request
    .get<RawAuthResponseBody>('/user/account', {
      params: {
        cookie,
        timestamp: Date.now(),
        ua: 'pc',
      },
    })
    .then(unwrapResponse)
}

/**
 * 获取会员信息
 *
 * VIP 状态只影响音源策略，不应阻断基础登录流程；调用方通常需要自行兜底。
 */
export function getVipInfoV2(cookie: string, uid?: number | null) {
  return request
    .get<RawVipInfoResponseBody>('/vip/info/v2', {
      params: {
        cookie,
        uid: typeof uid === 'number' && uid > 0 ? uid : undefined,
        timestamp: Date.now(),
        ua: 'pc',
      },
    })
    .then(unwrapResponse)
}

/** 刷新当前登录态，依赖请求层携带的当前 cookie。 */
export function refreshLoginStatus() {
  return request
    .post<RawAuthResponseBody>('/login/refresh', null, {
      params: {
        timestamp: Date.now(),
        ua: 'pc',
      },
    })
    .then(unwrapResponse)
}

/** 退出登录并让服务端清理会话。 */
export function logout() {
  return request.post('/logout').then(unwrapResponse)
}
