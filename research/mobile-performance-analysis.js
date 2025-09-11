/**
 * Mobile Performance Analysis - Device & Browser Constraints Research
 * 移动端设备性能限制和浏览器差异分析
 */

// 移动设备性能基准数据
const MOBILE_DEVICE_SPECS = {
  lowEnd: {
    cpu: 'Single-core ARMv7 ~1GHz',
    memory: '1-2GB RAM',
    gpu: 'Adreno 304/Mali-400',
    battery: '2000-3000mAh',
    constraints: {
      maxDOMNodes: 1000,
      maxConcurrentAnimations: 3,
      maxImageSize: '2MB',
      renderBudget: '16ms'
    }
  },
  midRange: {
    cpu: 'Quad-core ARMv8 ~2GHz',
    memory: '3-4GB RAM',
    gpu: 'Adreno 530/Mali-G71',
    battery: '3000-4000mAh',
    constraints: {
      maxDOMNodes: 3000,
      maxConcurrentAnimations: 6,
      maxImageSize: '5MB',
      renderBudget: '16ms'
    }
  },
  highEnd: {
    cpu: 'Octa-core ARMv8 ~3GHz',
    memory: '6-12GB RAM',
    gpu: 'Adreno 660/Mali-G78',
    battery: '4000-5000mAh',
    constraints: {
      maxDOMNodes: 8000,
      maxConcurrentAnimations: 12,
      maxImageSize: '10MB',
      renderBudget: '16ms'
    }
  }
};

// 移动浏览器性能差异分析
const MOBILE_BROWSER_PERFORMANCE = {
  iosSafari: {
    engine: 'WebKit',
    performanceFeatures: {
      willChange: 'excellent',
      containment: 'good',
      intersectionObserver: 'excellent',
      webWorkers: 'good',
      offscreenCanvas: 'limited',
      webGL: 'excellent'
    },
    limitations: {
      memoryLimit: '1.5GB per tab',
      backgroundThrottling: 'aggressive',
      serviceWorker: 'limited',
      fullscreenAPI: 'restricted'
    },
    optimizations: [
      'Use -webkit-transform3d for hardware acceleration',
      'Minimize DOM manipulations during scroll',
      'Use will-change sparingly',
      'Optimize for 120Hz displays (iPad Pro)'
    ]
  },
  androidChrome: {
    engine: 'Blink',
    performanceFeatures: {
      willChange: 'excellent',
      containment: 'excellent',
      intersectionObserver: 'excellent',
      webWorkers: 'excellent',
      offscreenCanvas: 'good',
      webGL: 'good'
    },
    limitations: {
      memoryLimit: 'varies by device',
      backgroundThrottling: 'moderate',
      serviceWorker: 'full support',
      fullscreenAPI: 'full support'
    },
    optimizations: [
      'Use contain property for isolation',
      'Leverage passive event listeners',
      'Use requestIdleCallback for non-critical tasks',
      'Optimize for variable refresh rates'
    ]
  }
};

// 移动端性能测试函数
class MobilePerformanceAnalyzer {
  constructor() {
    this.metrics = {
      deviceInfo: this.getDeviceInfo(),
      performanceEntries: [],
      memoryUsage: [],
      frameRates: [],
      networkConditions: null
    };
  }

  // 获取设备信息
  getDeviceInfo() {
    const navigator = window.navigator;
    const screen = window.screen;
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 1,
      memory: navigator.deviceMemory || 'unknown',
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: screen.orientation?.type || 'unknown'
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  // 内存使用监控
  monitorMemoryUsage() {
    if (!performance.memory) return null;
    
    const memory = performance.memory;
    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      utilization: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2)
    };
  }

  // 帧率监控
  monitorFrameRate() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.metrics.frameRates.push({
          timestamp: currentTime,
          fps: fps
        });
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  // 网络条件检测
  detectNetworkConditions() {
    if (!navigator.connection) return null;
    
    const connection = navigator.connection;
    return {
      effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
      downlink: connection.downlink, // Mbps
      rtt: connection.rtt, // ms
      saveData: connection.saveData
    };
  }

  // 综合性能评分
  calculatePerformanceScore() {
    const device = this.metrics.deviceInfo;
    let score = 100;
    
    // CPU评分
    if (device.cores < 4) score -= 20;
    else if (device.cores >= 8) score += 10;
    
    // 内存评分
    if (device.memory < 3) score -= 30;
    else if (device.memory >= 6) score += 15;
    
    // 网络评分
    const network = this.detectNetworkConditions();
    if (network) {
      if (network.effectiveType === 'slow-2g' || network.effectiveType === '2g') {
        score -= 25;
      } else if (network.effectiveType === '4g') {
        score += 5;
      }
    }
    
    // 屏幕分辨率影响
    const pixelCount = device.screen.width * device.screen.height * device.screen.pixelRatio;
    if (pixelCount > 2000000) score -= 10; // 高分辨率屏幕
    
    return Math.max(0, Math.min(100, score));
  }
}

// 性能预算建议
const PERFORMANCE_BUDGETS = {
  lowEnd: {
    maxBundleSize: '100KB',
    maxImageSize: '50KB per image',
    maxDOMNodes: '800',
    maxCSSRules: '1000',
    targetFPS: '30fps',
    maxMemory: '50MB'
  },
  midRange: {
    maxBundleSize: '200KB',
    maxImageSize: '100KB per image',
    maxDOMNodes: '2000',
    maxCSSRules: '2000',
    targetFPS: '60fps',
    maxMemory: '100MB'
  },
  highEnd: {
    maxBundleSize: '500KB',
    maxImageSize: '200KB per image',
    maxDOMNodes: '5000',
    maxCSSRules: '3000',
    targetFPS: '60fps',
    maxMemory: '200MB'
  }
};

export {
  MOBILE_DEVICE_SPECS,
  MOBILE_BROWSER_PERFORMANCE,
  MobilePerformanceAnalyzer,
  PERFORMANCE_BUDGETS
};