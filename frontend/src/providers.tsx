import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from './types'
import { api, ApiError, errorMessage } from './api'
import AppIcon from './components/AppIcon'

interface AuthState {
  user: User | null
  loading: boolean
  connectionError: string
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  useEffect(() => {
    let active = true
    api<User>('/auth/me')
      .then((result) => {
        if (active) setUser(result)
      })
      .catch((error) => {
        if (active && !(error instanceof ApiError && error.status === 401))
          setConnectionError(errorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const expired = () => setUser(null)
    window.addEventListener('session-expired', expired)
    return () => {
      active = false
      window.removeEventListener('session-expired', expired)
    }
  }, [])
  async function login(username: string, password: string) {
    setConnectionError('')
    const result = await api<User>('/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    })
    setUser(result)
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
  }
  return (
    <AuthContext.Provider value={{ user, loading, connectionError, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
const ToastContext = createContext<(message: string) => void>(() => {})
export function useToast() {
  return useContext(ToastContext)
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback((text: string) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), 5000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {message && (
        <div className="toast" role="status">
          <AppIcon name="check" size={18} />
          {message}
          <button aria-label="关闭提示" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}
