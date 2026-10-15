import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, useToast } from './providers'
import { errorMessage } from './api'
import AppIcon from './components/AppIcon'
import LoginView from './views/LoginView'
import EquipmentListView from './views/EquipmentListView'
import EquipmentDetailView from './views/EquipmentDetailView'
import ReservationsView from './views/ReservationsView'
import EquipmentAdminView from './views/EquipmentAdminView'

function Workspace() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const notify = useToast()
  const [leaving, setLeaving] = useState(false)
  if (loading) return <div className="empty-state">正在恢复登录状态…</div>
  if (!user) return <Navigate to="/login" replace />
  async function signOut() {
    setLeaving(true)
    try {
      await logout()
    } catch (error) {
      notify(errorMessage(error))
    } finally {
      setLeaving(false)
    }
  }
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link to="/equipment" className="brand">
          <span className="brand-icon">
            <AppIcon size={25} />
          </span>
          <span>
            共用间<small>SHARED STUDIO</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="live-dot" />
          团队设备工作台
        </div>
        <nav aria-label="主要导航">
          <p className="nav-label">我的工作空间</p>
          <NavLink to="/equipment">
            <AppIcon />
            设备库
          </NavLink>
          <NavLink to="/mine">
            <AppIcon name="calendar" />
            我的预约
          </NavLink>
          {user.role === 'ADMIN' && (
            <>
              <p className="nav-label admin-label">管理员</p>
              <NavLink to="/admin/equipment">
                <AppIcon name="settings" />
                设备管理
              </NavLink>
              <NavLink to="/admin/reservations">
                <AppIcon name="calendar" />
                预约与借还
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-note">
          <AppIcon name="sun" size={24} />
          <p>好设备，一起用。</p>
          <small>按时借还，让协作更轻松。</small>
        </div>
        <div className="profile">
          <span className="avatar">{user.displayName.slice(-2)}</span>
          <span className="profile-name">
            {user.displayName}
            <small>{user.role === 'ADMIN' ? '管理员' : '团队成员'}</small>
          </span>
          <button
            className="icon-button"
            aria-label="退出登录"
            title="退出登录"
            disabled={leaving}
            onClick={signOut}
          >
            <AppIcon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            共用间<span className="divider">/</span>
            {location.pathname.startsWith('/admin') ? '团队管理' : '工作空间'}
          </span>
          <span className="timezone">
            <span className="live-dot" />
            北京时间 · Asia/Shanghai
          </span>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="footer">
          共用间 · 小型团队设备共享<span>每一件设备，都物尽其用。</span>
        </footer>
      </div>
    </div>
  )
}
function AdminOnly() {
  return useAuth().user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/equipment" replace />
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route element={<Workspace />}>
        <Route index element={<Navigate to="/equipment" replace />} />
        <Route path="/equipment" element={<EquipmentListView />} />
        <Route path="/equipment/:id" element={<EquipmentDetailView />} />
        <Route path="/mine" element={<ReservationsView key="mine" admin={false} />} />
        <Route element={<AdminOnly />}>
          <Route path="/admin/equipment" element={<EquipmentAdminView />} />
          <Route path="/admin/reservations" element={<ReservationsView key="all" admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/equipment" replace />} />
      </Route>
    </Routes>
  )
}
