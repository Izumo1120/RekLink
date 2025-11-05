import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// ★★★ 修正 ★★★
// パスエイリアスを使用してグローバルCSSをインポート
import '@styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

