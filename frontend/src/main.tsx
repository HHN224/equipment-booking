import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider, ToastProvider } from './providers'
import './style.css'

createRoot(document.getElementById('app')!).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>,
)
