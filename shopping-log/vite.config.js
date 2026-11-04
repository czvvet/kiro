import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 同じWi-Fi内のスマートフォンからアクセスできるようにする
  server: { host: true },
})
