# 移动端调试优化完全指南

## 1. Chrome DevTools 远程调试

### Android设备调试配置

#### 1. 启用开发者选项
```bash
# ADB调试命令
adb devices  # 查看连接的设备
adb shell settings put global development_settings_enabled 1
adb shell settings put global adb_enabled 1
```

#### 2. Chrome远程调试
```javascript
// 在应用中启用调试
if (__DEV__) {
  // 启用网络检查
  XMLHttpRequest = GLOBAL.originalXMLHttpRequest ?
    GLOBAL.originalXMLHttpRequest : XMLHttpRequest;
  
  // 启用控制台
  console.disableYellowBox = true;
}
```

#### 3. 网络代理设置
```javascript
// 代理配置用于远程调试
const setupProxy = () => {
  if (__DEV__) {
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      console.log('API Request:', url, options);
      try {
        const response = await originalFetch(url, options);
        console.log('API Response:', response.status, response.url);
        return response;
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    };
  }
};
```

### Chrome DevTools 高级功能
```javascript
// 设备模拟配置
const deviceEmulation = {
  mobile: true,
  width: 375,
  height: 667,
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)...'
};

// 网络节流配置
const networkThrottling = {
  offline: false,
  downloadThroughput: 500 * 1024 / 8, // 500kbps
  uploadThroughput: 500 * 1024 / 8,
  latency: 20
};
```

## 2. Safari Web Inspector - iOS专属调试

### iOS设备配置
```bash
# 启用iOS设备Web检查器
# 设置 -> Safari -> 高级 -> Web检查器 (开启)
# 设置 -> 开发者 -> Enable Web Inspector (开启)
```

### iOS模拟器调试
```javascript
// 在React Native项目中启用Safari调试
// ios/YourApp/AppDelegate.m
#if DEBUG
  #import <React/RCTDevSettings.h>
  
  - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [[RCTDevSettings sharedSettings] setIsDebuggingRemotely:YES];
    return YES;
  }
#endif
```

### WebView调试配置
```javascript
// 在WebView组件中启用调试
import { WebView } from 'react-native-webview';

const DebugWebView = ({ source, ...props }) => {
  const webViewProps = {
    ...props,
    // 启用调试
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    // 注入调试脚本
    injectedJavaScript: __DEV__ ? `
      (function() {
        console.log('WebView loaded in debug mode');
        window.addEventListener('error', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: e.message,
            filename: e.filename,
            lineno: e.lineno
          }));
        });
      })();
    ` : undefined,
    onMessage: (event) => {
      if (__DEV__) {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'error') {
            console.error('WebView Error:', data);
          }
        } catch (e) {
          // 普通消息处理
        }
      }
    }
  };

  return <WebView source={source} {...webViewProps} />;
};
```

## 3. vconsole - 移动端调试控制台

### 安装和配置
```bash
npm install vconsole --save-dev
```

```javascript
// 移动端调试工具配置
import VConsole from 'vconsole';

// 条件性加载vconsole
const initVConsole = () => {
  if (process.env.NODE_ENV === 'development' || 
      window.location.search.includes('debug=true')) {
    
    const vConsole = new VConsole({
      defaultPlugins: ['system', 'network', 'element', 'storage'],
      maxLogNumber: 1000,
      onReady: function () {
        console.log('vConsole is ready.');
      },
      onClearLog: function () {
        console.log('Console log cleared.');
      }
    });

    // 自定义插件 - 设备信息
    vConsole.addPlugin({
      id: 'device_info',
      name: 'Device Info',
      show: function() {
        return `
          <div style="padding: 10px;">
            <h3>设备信息</h3>
            <p>User Agent: ${navigator.userAgent}</p>
            <p>屏幕尺寸: ${screen.width}x${screen.height}</p>
            <p>设备像素比: ${devicePixelRatio}</p>
            <p>内存: ${navigator.deviceMemory || 'Unknown'}</p>
            <p>网络类型: ${navigator.connection?.effectiveType || 'Unknown'}</p>
          </div>
        `;
      }
    });

    return vConsole;
  }
  return null;
};

// 在应用启动时初始化
const vConsole = initVConsole();
```

### 自定义日志功能
```javascript
// 增强版日志功能
class EnhancedLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      args,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logs.push(logEntry);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 发送到控制台
    console[level](
      `[${timestamp}] ${message}`,
      ...args
    );

    // 发送关键错误到远程日志服务
    if (level === 'error') {
      this.sendToRemote(logEntry);
    }
  }

  async sendToRemote(logEntry) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // 静默处理远程日志错误
    }
  }

  exportLogs() {
    const logsData = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}

// 全局日志实例
window.logger = new EnhancedLogger();

// 重写console方法
['log', 'info', 'warn', 'error'].forEach(level => {
  const originalMethod = console[level];
  console[level] = (...args) => {
    window.logger.log(level, '', ...args);
    originalMethod.apply(console, args);
  };
});
```

## 4. eruda - 轻量级移动调试工具

### 基础配置
```javascript
// 动态加载eruda
const loadEruda = () => {
  return new Promise((resolve, reject) => {
    if (window.eruda) {
      resolve(window.eruda);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda@2.4.1/eruda.min.js';
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
      resolve(window.eruda);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// 条件加载
if (process.env.NODE_ENV === 'development' || 
    localStorage.getItem('debug-mode') === 'true') {
  loadEruda();
}
```

### 自定义插件开发
```javascript
// eruda自定义插件
const createPerformancePlugin = () => {
  const plugin = {
    name: 'performance',
    init($el) {
      this.$el = $el;
      this.render();
      this.bindEvents();
    },
    render() {
      this.$el.html(`
        <div class="performance-monitor">
          <h3>性能监控</h3>
          <div id="fps-counter">FPS: --</div>
          <div id="memory-usage">内存: --</div>
          <div id="network-speed">网络: --</div>
          <button id="clear-cache">清理缓存</button>
          <button id="export-performance">导出性能数据</button>
        </div>
      `);
    },
    bindEvents() {
      let fps = 0;
      let lastTime = performance.now();

      const updateFPS = () => {
        const now = performance.now();
        fps = Math.round(1000 / (now - lastTime));
        lastTime = now;
        this.$el.find('#fps-counter').text(`FPS: ${fps}`);
        requestAnimationFrame(updateFPS);
      };

      updateFPS();

      // 内存监控
      if (performance.memory) {
        setInterval(() => {
          const memory = performance.memory;
          const used = Math.round(memory.usedJSHeapSize / 1048576);
          const total = Math.round(memory.totalJSHeapSize / 1048576);
          this.$el.find('#memory-usage').text(`内存: ${used}MB/${total}MB`);
        }, 1000);
      }

      // 绑定按钮事件
      this.$el.find('#clear-cache').on('click', () => {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }).then(() => {
          alert('缓存已清理');
          location.reload();
        });
      });
    }
  };

  return plugin;
};

// 注册插件
eruda.add(createPerformancePlugin());
```

## 5. Weinre - 远程调试工具

### 服务器配置
```bash
# 安装weinre
npm install -g weinre

# 启动weinre服务器
weinre --boundHost YOUR_IP --httpPort 8080
```

### 客户端集成
```javascript
// 动态注入weinre调试脚本
const initWeinre = (weinreServer) => {
  if (!__DEV__ && !localStorage.getItem('enable-weinre')) return;

  const script = document.createElement('script');
  script.src = `http://${weinreServer}:8080/target/target-script-min.js#anonymous`;
  document.head.appendChild(script);

  // 添加调试信息
  console.log(`Weinre调试地址: http://${weinreServer}:8080/client/#anonymous`);
};

// 自动检测调试环境
const detectDebugEnvironment = () => {
  // URL参数中包含调试信息
  const urlParams = new URLSearchParams(window.location.search);
  const weinreServer = urlParams.get('weinre');
  
  if (weinreServer) {
    initWeinre(weinreServer);
  }
  
  // 检查localStorage设置
  const savedWeinreServer = localStorage.getItem('weinre-server');
  if (savedWeinreServer) {
    initWeinre(savedWeinreServer);
  }
};

// 页面加载时检测
document.addEventListener('DOMContentLoaded', detectDebugEnvironment);
```

## 6. 统一调试配置管理

### 调试配置中心
```javascript
// DebugManager.js - 统一调试管理
class DebugManager {
  constructor() {
    this.config = {
      vconsole: false,
      eruda: false,
      weinre: null,
      remoteLogging: false,
      performance: false
    };
    
    this.loadConfig();
    this.init();
  }

  loadConfig() {
    // 从localStorage加载配置
    const savedConfig = localStorage.getItem('debug-config');
    if (savedConfig) {
      this.config = { ...this.config, ...JSON.parse(savedConfig) };
    }

    // 从URL参数加载配置
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      this.config.vconsole = true;
    }
    if (urlParams.get('eruda') === 'true') {
      this.config.eruda = true;
    }
    if (urlParams.get('weinre')) {
      this.config.weinre = urlParams.get('weinre');
    }
  }

  saveConfig() {
    localStorage.setItem('debug-config', JSON.stringify(this.config));
  }

  async init() {
    // 初始化vconsole
    if (this.config.vconsole) {
      await this.loadVConsole();
    }

    // 初始化eruda
    if (this.config.eruda) {
      await this.loadEruda();
    }

    // 初始化weinre
    if (this.config.weinre) {
      this.loadWeinre(this.config.weinre);
    }

    // 初始化远程日志
    if (this.config.remoteLogging) {
      this.initRemoteLogging();
    }

    // 初始化性能监控
    if (this.config.performance) {
      this.initPerformanceMonitor();
    }
  }

  // ... 其他方法的具体实现

  // 创建调试面板
  createDebugPanel() {
    if (document.getElementById('debug-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 200px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10000;
      display: none;
    `;

    panel.innerHTML = `
      <h4>调试工具</h4>
      <label><input type="checkbox" ${this.config.vconsole ? 'checked' : ''}> vConsole</label><br>
      <label><input type="checkbox" ${this.config.eruda ? 'checked' : ''}> Eruda</label><br>
      <label><input type="checkbox" ${this.config.remoteLogging ? 'checked' : ''}> 远程日志</label><br>
      <button id="export-logs">导出日志</button>
      <button id="clear-debug">清理调试数据</button>
    `;

    document.body.appendChild(panel);

    // 双击显示/隐藏面板
    let tapCount = 0;
    document.addEventListener('touchend', () => {
      tapCount++;
      if (tapCount === 1) {
        setTimeout(() => {
          if (tapCount === 1) {
            tapCount = 0;
          }
        }, 300);
      } else if (tapCount === 2) {
        tapCount = 0;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    });

    return panel;
  }
}

// 全局初始化
window.debugManager = new DebugManager();
```

## 最佳实践建议

### 1. 环境分离
```javascript
// 环境配置
const DEBUG_CONFIG = {
  development: {
    vconsole: true,
    remoteLogging: false,
    performance: true
  },
  staging: {
    vconsole: false,
    remoteLogging: true,
    performance: true
  },
  production: {
    vconsole: false,
    remoteLogging: true,
    performance: false
  }
};
```

### 2. 性能监控
```javascript
// 关键性能指标监控
const performanceMonitor = {
  // 页面加载性能
  trackPageLoad() {
    window.addEventListener('load', () => {
      const timing = performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      console.log('页面加载时间:', pageLoadTime + 'ms');
    });
  },
  
  // API性能监控
  trackAPIPerformance() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const end = performance.now();
        console.log(`API ${args[0]} 响应时间: ${end - start}ms`);
        return response;
      } catch (error) {
        const end = performance.now();
        console.error(`API ${args[0]} 错误 (${end - start}ms):`, error);
        throw error;
      }
    };
  }
};
```

### 3. 错误收集和上报
```javascript
// 全局错误处理
window.addEventListener('error', (event) => {
  const errorInfo = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  // 发送到远程错误收集服务
  if (window.debugManager?.config.remoteLogging) {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorInfo)
    }).catch(() => {
      // 静默处理上报错误
    });
  }
});
```

这个完整的移动端调试解决方案涵盖了从基础的Chrome DevTools到高级的自定义调试工具，可以根据项目需求和开发阶段选择合适的工具组合。