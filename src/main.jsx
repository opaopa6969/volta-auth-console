import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { setUnauthorizedHandler } from './lib/api'
import { DialogProvider } from './components/Dialogs'

// 401 を受けたらログインへ送る (#24)。
//
// api.js 側にリダイレクトを直接書くと DOM/Router 依存でテストしづらいので、
// 「どこへ送るか」はエントリポイント側で決める。return_to を付けて、ログイン後に
// 元の画面へ戻れるようにする。
setUnauthorizedHandler(() => {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/login?return_to=${returnTo}`
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DialogProvider>
        <App />
      </DialogProvider>
    </BrowserRouter>
  </StrictMode>,
)
