import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider, ToastProvider } from './providers'
import './style.css'

// Router 提供页面导航；两个 Provider 分别共享短提示和当前登录用户。
createRoot(document.getElementById('app')!).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>,
)
