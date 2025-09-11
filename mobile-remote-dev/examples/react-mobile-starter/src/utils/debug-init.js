// 移动端调试工具初始化和管理

/**
 * 移动端调试管理器
 * 统一管理各种调试工具的加载和配置
 */
class MobileDebugManager {
  constructor() {
    this.config = {
      vconsole: import.meta.env.VITE_DEBUG_VCONSOLE === 'true',
      eruda: import.meta.env.VITE_DEBUG_ERUDA === 'true',
      performance: import.meta.env.VITE_PERFORMANCE_MONITOR === 'true',
      remoteLogging: import.meta.env.VITE_REMOTE_LOGGING === 'true',
      weinre: import.meta.env.VITE_DEBUG_WEINRE
    };
    
    this.logs = [];
    this.maxLogs = 500;
    this.debugPanel = null;
    
    this.init();
  }
  
  /**
   * 初始化调试工具
   */
  async init() {
    console.log('🚀 Mobile Debug Manager 初始化中...');
    
    // 从URL参数读取调试配置
    this.loadConfigFromURL();
    
    // 从localStorage读取调试配置
    this.loadConfigFromStorage();
    
    // 初始化各种调试工具
    if (this.config.vconsole) {
      await this.loadVConsole();
    }
    
    if (this.config.eruda) {
      await this.loadEruda();
    }
    
    if (this.config.weinre) {
      this.loadWeinre(this.config.weinre);
    }
    
    if (this.config.performance) {
      this.initPerformanceMonitor();
    }
    
    if (this.config.remoteLogging) {
      this.initRemoteLogging();
    }
    
    // 初始化全局错误处理
    this.initGlobalErrorHandler();
    
    // 创建调试面板
    this.createDebugPanel();
    
    // 初始化手势控制
    this.initGestureControl();
    
    console.log('✅ Mobile Debug Manager 初始化完成', this.config);
  }
  
  /**
   * 从URL参数加载配置
   */
  loadConfigFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('debug') === 'true') {
      this.config.vconsole = true;
    }
    
    if (urlParams.get('eruda') === 'true') {
      this.config.eruda = true;
    }
    
    if (urlParams.get('performance') === 'true') {
      this.config.performance = true;
    }
    
    if (urlParams.get('weinre')) {
      this.config.weinre = urlParams.get('weinre');
    }
    
    if (urlParams.get('remote-log') === 'true') {
      this.config.remoteLogging = true;
    }
  }
  
  /**
   * 从localStorage加载配置
   */
  loadConfigFromStorage() {
    try {
      const savedConfig = localStorage.getItem('mobile-debug-config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.warn('加载调试配置失败:', error);
    }
  }
  
  /**
   * 保存配置到localStorage
   */
  saveConfigToStorage() {
    try {
      localStorage.setItem('mobile-debug-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('保存调试配置失败:', error);
    }
  }
  
  /**
   * 加载vConsole调试工具
   */
  async loadVConsole() {
    try {
      console.log('📱 加载 vConsole...');
      
      // 动态导入vConsole
      const VConsole = await import('vconsole');
      const vConsole = new VConsole.default({
        defaultPlugins: ['system', 'network', 'element', 'storage'],
        maxLogNumber: 1000,
        onReady: () => {
          console.log('✅ vConsole 调试工具已启动');
        },
        onClearLog: () => {
          console.log('🧹 控制台日志已清理');
        }
      });
      
      // 添加自定义插件
      this.addVConsolePlugins(vConsole);
      
      this.vConsole = vConsole;
      
    } catch (error) {
      console.error('❌ vConsole 加载失败:', error);
    }
  }
  
  /**
   * 为vConsole添加自定义插件
   */
  addVConsolePlugins(vConsole) {
    // 设备信息插件
    const deviceInfoPlugin = new vConsole.constructor.VConsolePlugin('device_info', 'Device');
    deviceInfoPlugin.on('renderTab', (callback) => {
      const html = `
        <div style="padding: 15px; font-size: 13px; line-height: 1.5;">
          <h3 style="margin-bottom: 10px; color: #007AFF;">设备信息</h3>
          <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
          <p><strong>屏幕尺寸:</strong> ${screen.width}×${screen.height}</p>
          <p><strong>视口尺寸:</strong> ${window.innerWidth}×${window.innerHeight}</p>
          <p><strong>设备像素比:</strong> ${devicePixelRatio}</p>
          <p><strong>平台:</strong> ${navigator.platform}</p>
          <p><strong>语言:</strong> ${navigator.language}</p>
          <p><strong>在线状态:</strong> ${navigator.onLine ? '在线' : '离线'}</p>
          ${navigator.connection ? `
            <p><strong>网络类型:</strong> ${navigator.connection.effectiveType}</p>
            <p><strong>下行速度:</strong> ${navigator.connection.downlink}Mbps</p>
          ` : ''}
          ${navigator.deviceMemory ? `
            <p><strong>设备内存:</strong> ${navigator.deviceMemory}GB</p>
          ` : ''}
        </div>
      `;
      callback(html);
    });
    vConsole.addPlugin(deviceInfoPlugin);
    
    // 性能监控插件
    const performancePlugin = new vConsole.constructor.VConsolePlugin('performance', 'Performance');
    performancePlugin.on('renderTab', (callback) => {
      const timing = performance.timing;
      const memory = performance.memory;
      
      const html = `
        <div style="padding: 15px; font-size: 13px; line-height: 1.5;">
          <h3 style="margin-bottom: 10px; color: #007AFF;">性能数据</h3>
          <p><strong>DOM加载:</strong> ${timing.domContentLoadedEventEnd - timing.navigationStart}ms</p>
          <p><strong>页面加载:</strong> ${timing.loadEventEnd - timing.navigationStart}ms</p>
          <p><strong>首次渲染:</strong> ${timing.responseEnd - timing.requestStart}ms</p>
          ${memory ? `
            <h4 style="margin: 15px 0 5px 0; color: #007AFF;">内存使用</h4>
            <p><strong>已使用:</strong> ${Math.round(memory.usedJSHeapSize / 1048576)}MB</p>
            <p><strong>总共:</strong> ${Math.round(memory.totalJSHeapSize / 1048576)}MB</p>
            <p><strong>限制:</strong> ${Math.round(memory.jsHeapSizeLimit / 1048576)}MB</p>
          ` : ''}
          <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 15px; background: #007AFF; color: white; border: none; border-radius: 4px;">刷新页面</button>
        </div>
      `;
      callback(html);
    });
    vConsole.addPlugin(performancePlugin);
  }
  
  /**
   * 加载Eruda调试工具
   */
  async loadEruda() {
    try {
      console.log('🛠 加载 Eruda...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
      
      script.onload = () => {
        eruda.init({
          container: document.body,
          tool: ['console', 'elements', 'network', 'resource', 'info', 'snippets'],
          useShadowDom: true,
          autoScale: true,
          defaults: {
            displaySize: 50,
            transparency: 0.9,
            theme: 'Dark'
          }
        });
        
        console.log('✅ Eruda 调试工具已启动');
      };
      
      script.onerror = () => {
        console.error('❌ Eruda 加载失败');
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('❌ Eruda 加载失败:', error);
    }
  }
  
  /**
   * 加载Weinre远程调试工具
   */
  loadWeinre(serverUrl) {
    try {
      console.log('🔗 加载 Weinre 远程调试...');
      
      const script = document.createElement('script');
      script.src = `http://${serverUrl}/target/target-script-min.js#anonymous`;
      
      script.onload = () => {
        console.log(`✅ Weinre 远程调试已连接: http://${serverUrl}/client/#anonymous`);
      };
      
      script.onerror = () => {
        console.error('❌ Weinre 连接失败');
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('❌ Weinre 加载失败:', error);
    }
  }
  
  /**
   * 初始化性能监控
   */
  initPerformanceMonitor() {
    console.log('📊 初始化性能监控...');
    
    let fps = 0;
    let lastTime = performance.now();
    
    // FPS监控
    const updateFPS = () => {
      const now = performance.now();
      fps = Math.round(1000 / (now - lastTime));
      lastTime = now;
      requestAnimationFrame(updateFPS);
    };
    updateFPS();
    
    // 性能数据收集
    const collectPerformanceData = () => {
      const data = {
        timestamp: Date.now(),
        fps: fps,
        timing: performance.timing,
        navigation: performance.navigation,
        url: window.location.href
      };
      
      // 内存信息
      if (performance.memory) {
        data.memory = {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576),
          total: Math.round(performance.memory.totalJSHeapSize / 1048576),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        };
      }
      
      // 网络信息
      if (navigator.connection) {
        data.connection = {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        };
      }
      
      this.logPerformanceData(data);
      
      return data;
    };
    
    // 定期收集性能数据
    const interval = parseInt(import.meta.env.VITE_PERF_INTERVAL) || 30000;
    setInterval(collectPerformanceData, interval);
    
    // 页面卸载时收集最后的性能数据
    window.addEventListener('beforeunload', collectPerformanceData);
    
    console.log('✅ 性能监控已启动');
  }
  
  /**
   * 记录性能数据
   */
  logPerformanceData(data) {
    console.log('📊 性能数据:', data);
    
    // 发送到远程服务器（如果配置了）
    if (this.config.remoteLogging) {
      this.sendToRemote('performance', data);
    }
  }
  
  /**
   * 初始化远程日志
   */
  initRemoteLogging() {
    console.log('📡 初始化远程日志...');
    
    // 拦截console方法
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    Object.keys(originalConsole).forEach(method => {
      console[method] = (...args) => {
        // 调用原始方法
        originalConsole[method].apply(console, args);
        
        // 记录日志
        this.addLog(method, args);
      };
    });
    
    console.log('✅ 远程日志已启动');
  }
  
  /**
   * 添加日志记录
   */
  addLog(level, args) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.logs.push(logEntry);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // 发送错误日志到远程服务器
    if (level === 'error') {
      this.sendToRemote('error', logEntry);
    }
  }
  
  /**
   * 发送数据到远程服务器
   */
  async sendToRemote(type, data) {
    try {
      const endpoint = import.meta.env.VITE_REMOTE_LOG_ENDPOINT || '/api/logs';
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
          sessionId: this.getSessionId()
        })
      });
    } catch (error) {
      // 静默处理远程日志错误，避免循环
    }
  }
  
  /**
   * 获取会话ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('debug-session-id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('debug-session-id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * 初始化全局错误处理
   */
  initGlobalErrorHandler() {
    // JavaScript错误
    window.addEventListener('error', (event) => {
      const errorInfo = {
        type: 'javascript-error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
        timestamp: Date.now()
      };
      
      console.error('🚨 JavaScript错误:', errorInfo);
      this.sendToRemote('error', errorInfo);
    });
    
    // Promise拒绝错误
    window.addEventListener('unhandledrejection', (event) => {
      const errorInfo = {
        type: 'promise-rejection',
        reason: event.reason,
        timestamp: Date.now()
      };
      
      console.error('🚨 Promise拒绝:', errorInfo);
      this.sendToRemote('error', errorInfo);
    });
    
    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const errorInfo = {
          type: 'resource-error',
          source: event.target.src || event.target.href,
          tagName: event.target.tagName,
          timestamp: Date.now()
        };
        
        console.error('🚨 资源加载错误:', errorInfo);
        this.sendToRemote('error', errorInfo);
      }
    }, true);
  }
  
  /**
   * 创建调试面板
   */
  createDebugPanel() {
    if (document.getElementById('mobile-debug-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'mobile-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      width: 250px;
      max-height: 400px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 999999;
      display: none;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    this.updateDebugPanel(panel);
    document.body.appendChild(panel);
    this.debugPanel = panel;
  }
  
  /**
   * 更新调试面板内容
   */
  updateDebugPanel(panel) {
    panel.innerHTML = `
      <div style="border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #007AFF;">🛠 移动端调试</h4>
        <div style="font-size: 10px; color: #999;">会话: ${this.getSessionId().substr(0, 8)}</div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>调试工具状态:</strong><br>
        vConsole: ${this.config.vconsole ? '✅' : '❌'}<br>
        Eruda: ${this.config.eruda ? '✅' : '❌'}<br>
        性能监控: ${this.config.performance ? '✅' : '❌'}<br>
        远程日志: ${this.config.remoteLogging ? '✅' : '❌'}
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>快速操作:</strong><br>
        <button onclick="window.mobileDebug.exportLogs()" style="margin: 2px; padding: 4px 8px; background: #007AFF; color: white; border: none; border-radius: 3px; font-size: 10px;">导出日志</button>
        <button onclick="window.mobileDebug.clearLogs()" style="margin: 2px; padding: 4px 8px; background: #FF3B30; color: white; border: none; border-radius: 3px; font-size: 10px;">清理日志</button>
        <button onclick="location.reload()" style="margin: 2px; padding: 4px 8px; background: #34C759; color: white; border: none; border-radius: 3px; font-size: 10px;">刷新页面</button>
      </div>
      
      <div style="font-size: 10px; color: #999;">
        提示: 三指点击屏幕显示/隐藏此面板
      </div>
    `;
  }
  
  /**
   * 初始化手势控制
   */
  initGestureControl() {
    let touchCount = 0;
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchCount = e.touches.length;
      touchStartTime = Date.now();
    });
    
    document.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      
      // 三指点击显示/隐藏调试面板
      if (touchCount === 3 && touchDuration < 500) {
        this.toggleDebugPanel();
      }
    });
    
    // 摇一摇手势（如果支持）
    if (window.DeviceMotionEvent) {
      let lastShake = 0;
      window.addEventListener('devicemotion', (e) => {
        const acceleration = e.accelerationIncludingGravity;
        const x = Math.abs(acceleration.x);
        const y = Math.abs(acceleration.y);
        const z = Math.abs(acceleration.z);
        
        const shakeThreshold = 15;
        const now = Date.now();
        
        if (x > shakeThreshold || y > shakeThreshold || z > shakeThreshold) {
          if (now - lastShake > 1000) {
            lastShake = now;
            this.toggleDebugPanel();
            navigator.vibrate && navigator.vibrate(100);
          }
        }
      });
    }
  }
  
  /**
   * 切换调试面板显示状态
   */
  toggleDebugPanel() {
    if (!this.debugPanel) return;
    
    const isVisible = this.debugPanel.style.display !== 'none';
    this.debugPanel.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.updateDebugPanel(this.debugPanel);
    }
  }
  
  /**
   * 导出日志
   */
  exportLogs() {
    const data = {
      logs: this.logs,
      config: this.config,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-debug-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 日志已导出');
  }
  
  /**
   * 清理日志
   */
  clearLogs() {
    this.logs = [];
    console.log('🧹 日志已清理');
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.mobileDebug = new MobileDebugManager();
    });
  } else {
    window.mobileDebug = new MobileDebugManager();
  }
}

export default MobileDebugManager;