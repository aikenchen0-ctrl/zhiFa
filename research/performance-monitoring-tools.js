/**
 * Performance Monitoring System and Debugging Tools for Mobile Overlay Systems
 * 移动端蒙层系统性能监控体系和调试工具
 */

// 综合性能监控中心
class PerformanceMonitoringCenter {
  constructor(options = {}) {
    this.options = {
      enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
      enableFrameRateMonitoring: options.enableFrameRateMonitoring !== false,
      enableNetworkMonitoring: options.enableNetworkMonitoring !== false,
      enableUserTimingMonitoring: options.enableUserTimingMonitoring !== false,
      reportingInterval: options.reportingInterval || 30000, // 30秒
      alertThresholds: {
        memoryUsage: options.alertThresholds?.memoryUsage || 0.8,
        frameRate: options.alertThresholds?.frameRate || 30,
        loadTime: options.alertThresholds?.loadTime || 3000,
        ...options.alertThresholds
      }
    };
    
    this.metrics = {
      performance: {},
      memory: {},
      network: {},
      userTiming: {},
      errors: []
    };
    
    this.monitors = {};
    this.alerts = [];
    this.isRunning = false;
    
    this.init();
  }

  // 初始化监控系统
  init() {
    // 性能监控
    if (this.options.enableFrameRateMonitoring) {
      this.monitors.frameRate = new FrameRateMonitor();
    }
    
    // 内存监控
    if (this.options.enableMemoryMonitoring && 'memory' in performance) {
      this.monitors.memory = new MemoryUsageMonitor();
    }
    
    // 网络监控
    if (this.options.enableNetworkMonitoring) {
      this.monitors.network = new NetworkPerformanceMonitor();
    }
    
    // 用户计时监控
    if (this.options.enableUserTimingMonitoring) {
      this.monitors.userTiming = new UserTimingMonitor();
    }
    
    // 错误监控
    this.monitors.error = new ErrorMonitor();
    
    // 页面可见性监控
    this.monitors.visibility = new VisibilityMonitor();
  }

  // 开始监控
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // 启动各个监控器
    Object.values(this.monitors).forEach(monitor => {
      if (monitor.start) monitor.start();
    });
    
    // 定期报告
    this.reportingTimer = setInterval(() => {
      this.generateReport();
    }, this.options.reportingInterval);
    
    console.log('Performance monitoring started');
  }

  // 停止监控
  stopMonitoring() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // 停止各个监控器
    Object.values(this.monitors).forEach(monitor => {
      if (monitor.stop) monitor.stop();
    });
    
    // 清除定时器
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    
    console.log('Performance monitoring stopped');
  }

  // 生成性能报告
  generateReport() {
    const report = {
      timestamp: Date.now(),
      metrics: {},
      alerts: [...this.alerts],
      recommendations: []
    };
    
    // 收集各监控器的数据
    Object.entries(this.monitors).forEach(([name, monitor]) => {
      if (monitor.getMetrics) {
        report.metrics[name] = monitor.getMetrics();
      }
    });
    
    // 检查警报条件
    this.checkAlertConditions(report);
    
    // 生成建议
    report.recommendations = this.generateRecommendations(report);
    
    // 触发报告事件
    this.onReportGenerated(report);
    
    return report;
  }

  // 检查警报条件
  checkAlertConditions(report) {
    const { alertThresholds } = this.options;
    
    // 内存使用警报
    if (report.metrics.memory?.usageRatio > alertThresholds.memoryUsage) {
      this.addAlert('memory', 'high', `Memory usage: ${(report.metrics.memory.usageRatio * 100).toFixed(1)}%`);
    }
    
    // 帧率警报
    if (report.metrics.frameRate?.averageFPS < alertThresholds.frameRate) {
      this.addAlert('performance', 'low-fps', `Low frame rate: ${report.metrics.frameRate.averageFPS}fps`);
    }
    
    // 网络加载时间警报
    if (report.metrics.network?.averageLoadTime > alertThresholds.loadTime) {
      this.addAlert('network', 'slow', `Slow load time: ${report.metrics.network.averageLoadTime}ms`);
    }
  }

  // 添加警报
  addAlert(category, type, message) {
    const alert = {
      category,
      type,
      message,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.alerts.push(alert);
    
    // 保持警报历史限制
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
    
    console.warn(`Performance Alert [${category}:${type}]:`, message);
    
    return alert;
  }

  // 生成优化建议
  generateRecommendations(report) {
    const recommendations = [];
    
    // 基于内存使用的建议
    if (report.metrics.memory?.usageRatio > 0.7) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        message: 'High memory usage detected',
        actions: [
          'Review DOM node retention',
          'Check for memory leaks in event listeners',
          'Consider implementing object pooling',
          'Clear unnecessary caches'
        ]
      });
    }
    
    // 基于帧率的建议
    if (report.metrics.frameRate?.averageFPS < 45) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: 'Low frame rate detected',
        actions: [
          'Reduce concurrent animations',
          'Use CSS transforms instead of layout changes',
          'Implement virtual scrolling for long lists',
          'Consider debouncing frequent operations'
        ]
      });
    }
    
    // 基于网络性能的建议
    if (report.metrics.network?.averageLoadTime > 2000) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        message: 'Slow network performance',
        actions: [
          'Implement resource preloading',
          'Optimize image sizes and formats',
          'Use CDN for static assets',
          'Consider lazy loading strategies'
        ]
      });
    }
    
    return recommendations;
  }

  // 报告生成回调
  onReportGenerated(report) {
    // 子类可以覆盖此方法来处理报告
    // 例如：发送到服务器、更新UI等
  }

  // 获取当前状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitorCount: Object.keys(this.monitors).length,
      alertCount: this.alerts.length,
      lastReport: this.lastReport
    };
  }
}

// 帧率监控器
class FrameRateMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameRates = [];
    this.isRunning = false;
    this.animationId = null;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.measureFrameRate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  measureFrameRate() {
    if (!this.isRunning) return;
    
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastTime + 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      
      this.frameRates.push({
        timestamp: currentTime,
        fps
      });
      
      // 保持最近100个数据点
      if (this.frameRates.length > 100) {
        this.frameRates.shift();
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    this.animationId = requestAnimationFrame(() => this.measureFrameRate());
  }

  getMetrics() {
    if (this.frameRates.length === 0) return null;
    
    const recent = this.frameRates.slice(-10);
    const averageFPS = recent.reduce((sum, item) => sum + item.fps, 0) / recent.length;
    const minFPS = Math.min(...recent.map(item => item.fps));
    const maxFPS = Math.max(...recent.map(item => item.fps));
    
    return {
      averageFPS: Math.round(averageFPS),
      minFPS,
      maxFPS,
      sampleCount: this.frameRates.length,
      isStable: maxFPS - minFPS < 10
    };
  }
}

// 内存使用监控器
class MemoryUsageMonitor {
  constructor() {
    this.measurements = [];
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning || !performance.memory) return;
    
    this.isRunning = true;
    
    this.intervalId = setInterval(() => {
      this.takeMeasurement();
    }, 5000); // 每5秒测量一次
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  takeMeasurement() {
    if (!performance.memory) return;
    
    const memory = performance.memory;
    const measurement = {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit
    };
    
    this.measurements.push(measurement);
    
    // 保持最近50个测量值
    if (this.measurements.length > 50) {
      this.measurements.shift();
    }
  }

  getMetrics() {
    if (this.measurements.length === 0) return null;
    
    const latest = this.measurements[this.measurements.length - 1];
    const trend = this.calculateTrend();
    
    return {
      usedMB: Math.round(latest.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(latest.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(latest.jsHeapSizeLimit / 1024 / 1024),
      usageRatio: latest.usageRatio,
      trend,
      sampleCount: this.measurements.length
    };
  }

  calculateTrend() {
    if (this.measurements.length < 10) return 'stable';
    
    const recent = this.measurements.slice(-5);
    const older = this.measurements.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.usageRatio, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.usageRatio, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 0.05) return 'increasing';
    if (difference < -0.05) return 'decreasing';
    return 'stable';
  }
}

// 网络性能监控器
class NetworkPerformanceMonitor {
  constructor() {
    this.measurements = [];
    this.observer = null;
  }

  start() {
    if (!('PerformanceObserver' in window)) return;
    
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          this.recordNavigationTiming(entry);
        } else if (entry.entryType === 'resource') {
          this.recordResourceTiming(entry);
        }
      });
    });
    
    try {
      this.observer.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      console.warn('Network monitoring not fully supported');
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  recordNavigationTiming(entry) {
    this.measurements.push({
      type: 'navigation',
      timestamp: Date.now(),
      loadTime: entry.loadEventEnd - entry.loadEventStart,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      ttfb: entry.responseStart - entry.requestStart
    });
  }

  recordResourceTiming(entry) {
    // 只记录重要资源
    if (entry.name.includes('.css') || entry.name.includes('.js') || entry.name.includes('api/')) {
      this.measurements.push({
        type: 'resource',
        timestamp: Date.now(),
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0
      });
    }
  }

  getMetrics() {
    if (this.measurements.length === 0) return null;
    
    const resources = this.measurements.filter(m => m.type === 'resource');
    const avgLoadTime = resources.length > 0 
      ? resources.reduce((sum, r) => sum + r.duration, 0) / resources.length 
      : 0;
    
    const navigation = this.measurements.filter(m => m.type === 'navigation');
    const lastNavigation = navigation[navigation.length - 1];
    
    return {
      resourceCount: resources.length,
      averageLoadTime: Math.round(avgLoadTime),
      lastNavigation: lastNavigation ? {
        loadTime: lastNavigation.loadTime,
        domContentLoaded: lastNavigation.domContentLoaded,
        ttfb: lastNavigation.ttfb
      } : null
    };
  }
}

// 用户计时监控器
class UserTimingMonitor {
  constructor() {
    this.measurements = [];
    this.observer = null;
  }

  start() {
    if (!('PerformanceObserver' in window)) return;
    
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          this.measurements.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          });
        }
      });
    });
    
    try {
      this.observer.observe({ entryTypes: ['measure'] });
    } catch (e) {
      console.warn('User timing monitoring not supported');
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  getMetrics() {
    if (this.measurements.length === 0) return null;
    
    const recent = this.measurements.slice(-20);
    const byName = {};
    
    recent.forEach(measurement => {
      if (!byName[measurement.name]) {
        byName[measurement.name] = [];
      }
      byName[measurement.name].push(measurement.duration);
    });
    
    const summary = {};
    Object.entries(byName).forEach(([name, durations]) => {
      summary[name] = {
        count: durations.length,
        average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      };
    });
    
    return {
      totalMeasurements: this.measurements.length,
      recentCount: recent.length,
      byName: summary
    };
  }
}

// 错误监控器
class ErrorMonitor {
  constructor() {
    this.errors = [];
    this.isListening = false;
  }

  start() {
    if (this.isListening) return;
    
    this.isListening = true;
    
    // JavaScript错误
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      });
    });
    
    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'promise',
        message: event.reason.toString(),
        timestamp: Date.now()
      });
    });
  }

  stop() {
    this.isListening = false;
    // 注意：这里没有移除事件监听器，因为可能影响其他错误处理
  }

  recordError(error) {
    this.errors.push(error);
    
    // 保持最近100个错误
    if (this.errors.length > 100) {
      this.errors.shift();
    }
  }

  getMetrics() {
    const recent = this.errors.slice(-10);
    const byType = {};
    
    recent.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
    });
    
    return {
      totalErrors: this.errors.length,
      recentErrors: recent.length,
      errorsByType: byType,
      lastError: this.errors[this.errors.length - 1] || null
    };
  }
}

// 页面可见性监控器
class VisibilityMonitor {
  constructor() {
    this.visibilityChanges = [];
    this.isListening = false;
    this.startTime = Date.now();
    this.visibleTime = 0;
    this.lastVisibilityChange = Date.now();
  }

  start() {
    if (this.isListening) return;
    
    this.isListening = true;
    
    document.addEventListener('visibilitychange', () => {
      const now = Date.now();
      
      if (document.hidden) {
        this.visibleTime += now - this.lastVisibilityChange;
      }
      
      this.visibilityChanges.push({
        timestamp: now,
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
      
      this.lastVisibilityChange = now;
    });
  }

  stop() {
    this.isListening = false;
  }

  getMetrics() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    let currentVisibleTime = this.visibleTime;
    
    if (!document.hidden) {
      currentVisibleTime += now - this.lastVisibilityChange;
    }
    
    return {
      totalTime,
      visibleTime: currentVisibleTime,
      visibilityRatio: currentVisibleTime / totalTime,
      visibilityChanges: this.visibilityChanges.length,
      currentlyVisible: !document.hidden
    };
  }
}

// 移动端调试工具集
const MOBILE_DEBUG_TOOLS = {
  console: {
    name: 'Mobile Console',
    description: 'In-page console for mobile debugging',
    setup: `
      // Create floating console
      const createMobileConsole = () => {
        const console = document.createElement('div');
        console.id = 'mobile-debug-console';
        console.innerHTML = '<div id="console-content"></div><button onclick="this.parentNode.remove()">Close</button>';
        console.style.cssText = 'position:fixed;top:10px;right:10px;width:300px;height:200px;background:#000;color:#0f0;font-family:monospace;font-size:10px;overflow:auto;z-index:10000;border:1px solid #555;padding:5px';
        document.body.appendChild(console);
        return console;
      };
    `
  },
  
  performanceOverlay: {
    name: 'Performance Overlay',
    description: 'Real-time performance metrics overlay',
    features: [
      'FPS counter',
      'Memory usage',
      'Network status',
      'Battery level (if available)'
    ]
  },
  
  touchVisualization: {
    name: 'Touch Event Visualization',
    description: 'Visualize touch events and gestures',
    implementation: 'Show touch points, drag paths, gesture recognition'
  },
  
  networkThrottling: {
    name: 'Network Throttling Simulation',
    description: 'Simulate various network conditions',
    conditions: ['3G', '4G', 'WiFi', 'Offline']
  },
  
  deviceSimulation: {
    name: 'Device Simulation',
    description: 'Test different device characteristics',
    parameters: ['Screen size', 'Pixel ratio', 'Memory', 'CPU cores']
  }
};

export {
  PerformanceMonitoringCenter,
  FrameRateMonitor,
  MemoryUsageMonitor,
  NetworkPerformanceMonitor,
  UserTimingMonitor,
  ErrorMonitor,
  VisibilityMonitor,
  MOBILE_DEBUG_TOOLS
};