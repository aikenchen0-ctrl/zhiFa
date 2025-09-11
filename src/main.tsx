import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 移动端调试工具 - 仅在开发环境启用
if (import.meta.env.DEV) {
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole({
      theme: 'dark',
      defaultPlugins: ['system', 'network', 'element', 'storage']
    })
  }).catch(() => {
    console.log('VConsole加载失败，继续正常运行')
  })
}

// 添加移动端性能监控
if (typeof window !== 'undefined') {
  // 网络状态检测
  const connection = (navigator as any).connection
  if (connection) {
    console.log(`📱 网络类型: ${connection.effectiveType}`)
    console.log(`📊 下行速度: ${connection.downlink}Mbps`)
    console.log(`💾 数据节省: ${connection.saveData ? '开启' : '关闭'}`)
  }

  // 设备信息
  console.log(`📱 设备信息:`, {
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    platform: navigator.platform
  })

  // 页面加载性能监控
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      console.log(`⚡ 页面性能:`, {
        DNS解析: `${perfData.domainLookupEnd - perfData.domainLookupStart}ms`,
        TCP连接: `${perfData.connectEnd - perfData.connectStart}ms`,
        首次响应: `${perfData.responseStart - perfData.requestStart}ms`,
        DOM解析: `${perfData.domContentLoadedEventEnd - perfData.responseEnd}ms`,
        总加载时间: `${perfData.loadEventEnd - perfData.navigationStart}ms`
      })
    }, 0)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)