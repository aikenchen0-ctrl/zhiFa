import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [touchInfo, setTouchInfo] = useState<string>('')
  const [networkInfo, setNetworkInfo] = useState<any>(null)

  useEffect(() => {
    // 获取网络信息
    const connection = (navigator as any).connection
    if (connection) {
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        saveData: connection.saveData
      })
    }
  }, [])

  // 触摸事件处理
  const handleTouch = (e: React.TouchEvent, type: string) => {
    const touch = e.touches[0] || e.changedTouches[0]
    if (touch) {
      setTouchInfo(`${type}: ${touch.clientX.toFixed(0)}, ${touch.clientY.toFixed(0)} | 触摸点数: ${e.touches.length}`)
    }
  }

  return (
    <div className="App">
      <h1>📱 Claude Flow + GitHub Pages 演示</h1>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          点击计数: {count}
        </button>
        <p>
          每次代码修改都会自动提交到Git，然后GitHub Pages自动部署！
        </p>
      </div>

      {/* 移动端信息面板 */}
      <div className="mobile-info">
        <h3>📊 移动端信息</h3>
        <div>
          <p><strong>屏幕尺寸:</strong> {window.innerWidth} × {window.innerHeight}</p>
          <p><strong>设备像素比:</strong> {window.devicePixelRatio}</p>
          {networkInfo && (
            <>
              <p><strong>网络类型:</strong> {networkInfo.effectiveType}</p>
              <p><strong>下行速度:</strong> {networkInfo.downlink}Mbps</p>
              <p><strong>省流量模式:</strong> {networkInfo.saveData ? '开启' : '关闭'}</p>
            </>
          )}
        </div>
      </div>

      {/* 触摸测试区域 */}
      <div 
        className="touch-area"
        onTouchStart={(e) => handleTouch(e, '开始触摸')}
        onTouchMove={(e) => handleTouch(e, '触摸移动')}
        onTouchEnd={(e) => handleTouch(e, '结束触摸')}
      >
        <h3>👆 触摸测试区域</h3>
        <p>在这里测试触摸、手势操作</p>
        <div className="touch-feedback">
          {touchInfo && <p>{touchInfo}</p>}
        </div>
      </div>

      {/* 部署信息 */}
      <div className="deploy-info">
        <h3>🚀 部署信息</h3>
        <p>当前环境: {import.meta.env.MODE}</p>
        <p>构建时间: {new Date().toLocaleString('zh-CN')}</p>
        <p>GitHub Pages URL: https://aikenchen0-ctrl.github.io/zhiFa/</p>
      </div>
    </div>
  )
}

export default App