import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // GitHub Pages部署配置
  base: process.env.NODE_ENV === 'production' 
    ? '/zhiFa/' // 用户的仓库名
    : '/',
    
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173,
    hmr: {
      port: 5173,
    },
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 移动端优化
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  
  // 预览服务器配置
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})