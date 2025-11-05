import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // ★★★ パスエイリアスに必須 ★★★

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // ★★★ tsconfig.app.jsonのパスエイリアスをViteに認識させるための設定 ★★★
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@store': path.resolve(__dirname, './src/store'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },

  server: {
    port: 3000,  // 使用するポート番号を指定
    host: '0.0.0.0',  // すべてのIPアドレスからアクセスを受け入れる
    watch: {
      usePolling: true,  // ファイル変更の検出をポーリング方式にする（特にDocker環境で必要）
    },
  },
})

