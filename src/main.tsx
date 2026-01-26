import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './components/common'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
