import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers'
import { errorMessage } from '../api'
import AppIcon from '../components/AppIcon'
export default function LoginView() {
  const { user, loading, login, connectionError } = useAuth()
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  if (loading) return <div className="empty-state">正在连接工作台…</div>
  if (user) return <Navigate to="/equipment" replace />
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <AppIcon size={26} />
          </span>
          <span>
            共用间<small>SHARED STUDIO</small>
          </span>
        </div>
        <div className="login-story-body">
          <p className="eyebrow">LESS WAITING. MORE CREATING.</p>
          <h1>
            把好设备，
            <br />
            留给好想法。
          </h1>
          <p>
            让团队的每一件设备有序流转。
            <br />
            预约、领用、归还，简单完成。
          </p>
          <div className="login-objects">
            <AppIcon name="camera" size={92} />
            <AppIcon name="phone" size={72} />
            <AppIcon name="projector" size={86} />
          </div>
        </div>
        <small>一个共享工作室，无限种可能。</small>
      </section>
      <section className="login-form-area">
        <form className="login-form" onSubmit={submit}>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>欢迎回到共用间</h2>
          <p className="muted">登录后，开始安排你的下一次创作。</p>
          {(error || connectionError) && (
            <div className="alert error" role="alert">
              {error || connectionError}
            </div>
          )}
          <label>
            账号
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="请输入账号"
              required
              maxLength={50}
              disabled={busy}
            />
          </label>
          <label>
            密码
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              required
              disabled={busy}
            />
          </label>
          <button className="button full" disabled={busy}>
            {busy ? '正在登录…' : '登录工作台'}
            <AppIcon name="arrow" size={18} />
          </button>
          <div className="login-help">
            <strong>本地演示账号</strong>
            <p>
              管理员：<code>admin / Admin123!</code>
            </p>
            <p>
              成员：<code>member1</code>、<code>member2</code>
              <br />
              密码均为 <code>Member123!</code>
            </p>
            <small>仅用于本地学习与体验。</small>
          </div>
        </form>
      </section>
    </div>
  )
}
