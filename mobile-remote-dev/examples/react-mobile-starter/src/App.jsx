import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// 导入调试工具
import './utils/debug-init.js';

// 移动端特性检测
const MobileFeatures = () => {
  const [features, setFeatures] = useState({});
  
  useEffect(() => {
    const detectFeatures = () => {
      const detectedFeatures = {
        // 触摸支持
        touchEvents: 'ontouchstart' in window,
        
        // 设备方向
        deviceOrientation: 'DeviceOrientationEvent' in window,
        
        // 振动支持
        vibration: 'vibrate' in navigator,
        
        // 相机支持
        camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        
        // 地理位置
        geolocation: 'geolocation' in navigator,
        
        // 本地存储
        localStorage: typeof Storage !== 'undefined',
        
        // Service Worker
        serviceWorker: 'serviceWorker' in navigator,
        
        // 推送通知
        pushNotifications: 'Notification' in window,
        
        // 网络信息
        networkInfo: 'connection' in navigator,
        
        // 设备内存
        deviceMemory: 'deviceMemory' in navigator,
        
        // 在线状态
        onlineStatus: 'onLine' in navigator
      };
      
      setFeatures(detectedFeatures);
    };
    
    detectFeatures();
  }, []);
  
  return (
    <div className="mobile-features">
      <h2>📱 移动端特性检测</h2>
      <div className="features-grid">
        {Object.entries(features).map(([feature, supported]) => (
          <div key={feature} className={`feature-item ${supported ? 'supported' : 'not-supported'}`}>
            <span className="feature-name">{feature}</span>
            <span className="feature-status">{supported ? '✅' : '❌'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 设备信息组件
const DeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState({});
  
  useEffect(() => {
    const getDeviceInfo = () => {
      const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine,
        screenWidth: screen.width,
        screenHeight: screen.height,
        devicePixelRatio: devicePixelRatio,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      };
      
      // 网络连接信息
      if (navigator.connection) {
        info.networkType = navigator.connection.effectiveType;
        info.downlink = navigator.connection.downlink;
        info.rtt = navigator.connection.rtt;
      }
      
      // 设备内存信息
      if (navigator.deviceMemory) {
        info.deviceMemory = navigator.deviceMemory + 'GB';
      }
      
      // 硬件并发数
      if (navigator.hardwareConcurrency) {
        info.cpuCores = navigator.hardwareConcurrency;
      }
      
      setDeviceInfo(info);
    };
    
    getDeviceInfo();
    
    // 监听在线状态变化
    const handleOnlineStatusChange = () => {
      setDeviceInfo(prev => ({
        ...prev,
        onlineStatus: navigator.onLine
      }));
    };
    
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);
  
  return (
    <div className="device-info">
      <h2>🔧 设备信息</h2>
      <div className="info-grid">
        {Object.entries(deviceInfo).map(([key, value]) => (
          <div key={key} className="info-item">
            <span className="info-key">{key}:</span>
            <span className="info-value">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 性能监控组件
const PerformanceMonitor = () => {
  const [performance, setPerformance] = useState({
    fps: 0,
    memory: {},
    timing: {}
  });
  
  useEffect(() => {
    let fps = 0;
    let lastTime = Date.now();
    let frameCount = 0;
    
    const updateFPS = () => {
      frameCount++;
      const now = Date.now();
      
      if (now - lastTime >= 1000) {
        fps = Math.round(frameCount * 1000 / (now - lastTime));
        frameCount = 0;
        lastTime = now;
        
        setPerformance(prev => ({
          ...prev,
          fps
        }));
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    updateFPS();
    
    // 内存信息
    const updateMemory = () => {
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        setPerformance(prev => ({
          ...prev,
          memory: {
            used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
          }
        }));
      }
    };
    
    updateMemory();
    const memoryInterval = setInterval(updateMemory, 5000);
    
    // 页面性能时机
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      setPerformance(prev => ({
        ...prev,
        timing: {
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          firstPaint: timing.responseEnd - timing.requestStart
        }
      }));
    }
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, []);
  
  return (
    <div className="performance-monitor">
      <h2>⚡ 性能监控</h2>
      <div className="performance-grid">
        <div className="performance-item">
          <span className="performance-label">FPS:</span>
          <span className={`performance-value ${performance.fps < 30 ? 'low' : performance.fps < 50 ? 'medium' : 'high'}`}>
            {performance.fps}
          </span>
        </div>
        
        {Object.keys(performance.memory).length > 0 && (
          <div className="performance-item">
            <span className="performance-label">内存使用:</span>
            <span className="performance-value">{performance.memory.used}</span>
          </div>
        )}
        
        {Object.keys(performance.timing).length > 0 && (
          <div className="performance-item">
            <span className="performance-label">DOM加载:</span>
            <span className="performance-value">{performance.timing.domReady}ms</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 网络测试组件
const NetworkTest = () => {
  const [networkTest, setNetworkTest] = useState({
    status: 'idle',
    latency: null,
    speed: null
  });
  
  const testNetwork = async () => {
    setNetworkTest(prev => ({ ...prev, status: 'testing' }));
    
    try {
      // 测试延迟
      const start = Date.now();
      await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      }).catch(() => {
        // 如果API不存在，使用当前域名测试
        return fetch('/', { method: 'HEAD', cache: 'no-cache' });
      });
      const latency = Date.now() - start;
      
      // 简单的速度测试（下载小文件）
      const speedStart = Date.now();
      const response = await fetch('/', { cache: 'no-cache' });
      const speedEnd = Date.now();
      const size = parseInt(response.headers.get('content-length') || '1000');
      const speed = Math.round(size / (speedEnd - speedStart) * 1000 / 1024); // KB/s
      
      setNetworkTest({
        status: 'completed',
        latency,
        speed: speed > 0 ? speed : '未知'
      });
    } catch (error) {
      setNetworkTest({
        status: 'error',
        latency: null,
        speed: null
      });
    }
  };
  
  return (
    <div className="network-test">
      <h2>🌐 网络测试</h2>
      <button onClick={testNetwork} disabled={networkTest.status === 'testing'}>
        {networkTest.status === 'testing' ? '测试中...' : '开始网络测试'}
      </button>
      
      {networkTest.status !== 'idle' && (
        <div className="network-results">
          {networkTest.status === 'completed' && (
            <>
              <div className="network-item">
                <span>延迟: {networkTest.latency}ms</span>
              </div>
              <div className="network-item">
                <span>速度: {networkTest.speed}KB/s</span>
              </div>
            </>
          )}
          
          {networkTest.status === 'error' && (
            <div className="network-item error">
              网络测试失败
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 主页面
const HomePage = () => (
  <div className="home-page">
    <header className="app-header">
      <h1>🚀 移动端开发测试页面</h1>
      <p>这是一个用于测试移动端开发环境的示例应用</p>
    </header>
    
    <nav className="app-nav">
      <Link to="/features" className="nav-link">特性检测</Link>
      <Link to="/device" className="nav-link">设备信息</Link>
      <Link to="/performance" className="nav-link">性能监控</Link>
      <Link to="/network" className="nav-link">网络测试</Link>
    </nav>
    
    <main className="app-main">
      <div className="quick-info">
        <div className="info-card">
          <h3>📱 快速信息</h3>
          <p>User Agent: {navigator.userAgent.substring(0, 50)}...</p>
          <p>屏幕尺寸: {screen.width}×{screen.height}</p>
          <p>视口尺寸: {window.innerWidth}×{window.innerHeight}</p>
          <p>设备像素比: {devicePixelRatio}</p>
        </div>
        
        <div className="info-card">
          <h3>🔗 调试信息</h3>
          <p>环境: {__DEV__ ? '开发环境' : '生产环境'}</p>
          <p>移动开发模式: {__MOBILE_DEV__ ? '启用' : '关闭'}</p>
          <p>版本: {__VERSION__}</p>
          <p>构建时间: {new Date(__BUILD_TIME__).toLocaleString()}</p>
        </div>
      </div>
    </main>
  </div>
);

// 主应用组件
function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<MobileFeatures />} />
          <Route path="/device" element={<DeviceInfo />} />
          <Route path="/performance" element={<PerformanceMonitor />} />
          <Route path="/network" element={<NetworkTest />} />
        </Routes>
        
        <footer className="app-footer">
          <Link to="/" className="home-link">🏠 返回首页</Link>
        </footer>
      </div>
    </Router>
  );
}

export default App;