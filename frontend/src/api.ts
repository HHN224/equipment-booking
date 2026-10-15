export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}
async function decode(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && !response.url.endsWith('/auth/login'))
      window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(
      body.message ||
        (response.status >= 500
          ? '服务暂时不可用，请确认后端已启动或稍后重试'
          : '请求失败，请稍后重试'),
      response.status,
    )
  }
  return body
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  try {
    if (options.method && options.method !== 'GET') {
      // 每次写请求获取当前会话 token，登录后 token 轮换也能正常工作。
      const csrf = await decode(await fetch('/api/auth/csrf', { credentials: 'same-origin' }))
      headers.set(csrf.headerName, csrf.token)
      if (!(options.body instanceof URLSearchParams))
        headers.set('Content-Type', 'application/json')
    }
    return await decode(
      await fetch('/api' + path, { ...options, headers, credentials: 'same-origin' }),
    )
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('无法连接服务，请检查后端是否启动，再重试', 0)
  }
}
export function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== undefined) params.set(key, String(value))
  })
  return '?' + params.toString()
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试'
}
