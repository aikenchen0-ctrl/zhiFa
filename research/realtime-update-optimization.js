/**
 * Real-time Update Performance Optimization for Mobile Overlay Systems
 * 移动端蒙层系统实时更新性能优化策略
 */

// Debounce 和 Throttle 优化实现
class PerformanceThrottler {
  constructor() {
    this.timers = new Map();
    this.lastExecution = new Map();
  }

  // 防抖函数 - 适用于搜索输入、窗口调整
  debounce(key, func, delay = 300, immediate = false) {
    return (...args) => {
      const callNow = immediate && !this.timers.has(key);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      this.timers.set(key, setTimeout(() => {
        this.timers.delete(key);
        if (!immediate) func.apply(this, args);
      }, delay));
      
      if (callNow) func.apply(this, args);
    };
  }

  // 节流函数 - 适用于滚动事件、拖拽
  throttle(key, func, delay = 16) { // 16ms = 60fps
    return (...args) => {
      const now = Date.now();
      const lastTime = this.lastExecution.get(key) || 0;
      
      if (now - lastTime >= delay) {
        this.lastExecution.set(key, now);
        func.apply(this, args);
      }
    };
  }

  // 智能节流 - 根据性能动态调整间隔
  adaptiveThrottle(key, func, baseDelay = 16) {
    let currentDelay = baseDelay;
    let performanceScore = 100;
    
    return (...args) => {
      const startTime = performance.now();
      const now = Date.now();
      const lastTime = this.lastExecution.get(key) || 0;
      
      if (now - lastTime >= currentDelay) {
        this.lastExecution.set(key, now);
        
        const result = func.apply(this, args);
        
        // 测量执行时间并调整延迟
        const executionTime = performance.now() - startTime;
        
        if (executionTime > 16) { // 超过一帧时间
          performanceScore = Math.max(20, performanceScore - 10);
          currentDelay = Math.min(100, baseDelay * (100 / performanceScore));
        } else {
          performanceScore = Math.min(100, performanceScore + 5);
          currentDelay = Math.max(baseDelay, currentDelay * 0.95);
        }
        
        return result;
      }
    };
  }

  // 清理定时器
  clear(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.lastExecution.delete(key);
  }

  // 清理所有定时器
  clearAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.lastExecution.clear();
  }
}

// 批量更新管理器
class BatchUpdateManager {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.batchDelay = options.batchDelay || 16; // 一帧时间
    this.maxBatchTime = options.maxBatchTime || 10; // 最大批处理时间(ms)
    
    this.pendingUpdates = new Map();
    this.updateQueue = [];
    this.isProcessing = false;
    
    this.frameId = null;
  }

  // 添加更新任务
  addUpdate(key, updateFn, priority = 'normal') {
    const update = {
      key,
      updateFn,
      priority,
      timestamp: performance.now()
    };
    
    // 如果已存在相同key的更新，替换之
    this.pendingUpdates.set(key, update);
    
    this.scheduleProcess();
  }

  // 调度处理
  scheduleProcess() {
    if (this.frameId) return;
    
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.processUpdates();
    });
  }

  // 处理更新队列
  processUpdates() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const startTime = performance.now();
    
    // 将Map转换为数组并按优先级排序
    const updates = Array.from(this.pendingUpdates.values());
    updates.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    let processedCount = 0;
    let currentTime = startTime;
    
    // 批量处理更新
    while (updates.length > 0 && processedCount < this.batchSize) {
      const update = updates.shift();
      
      try {
        update.updateFn();
        this.pendingUpdates.delete(update.key);
        processedCount++;
      } catch (error) {
        console.error('Update processing error:', error);
      }
      
      currentTime = performance.now();
      
      // 如果超过最大批处理时间，暂停处理
      if (currentTime - startTime > this.maxBatchTime) {
        break;
      }
    }
    
    this.isProcessing = false;
    
    // 如果还有待处理的更新，继续调度
    if (this.pendingUpdates.size > 0) {
      this.scheduleProcess();
    }
  }

  // 立即处理高优先级更新
  flushHighPriority() {
    const highPriorityUpdates = Array.from(this.pendingUpdates.values())
      .filter(update => update.priority === 'high');
    
    highPriorityUpdates.forEach(update => {
      try {
        update.updateFn();
        this.pendingUpdates.delete(update.key);
      } catch (error) {
        console.error('High priority update error:', error);
      }
    });
  }

  // 清空所有待处理更新
  clear() {
    this.pendingUpdates.clear();
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.isProcessing = false;
  }
}

// 智能DOM更新优化器
class SmartDOMUpdater {
  constructor() {
    this.observedElements = new WeakSet();
    this.updateQueue = new Map();
    this.mutationObserver = null;
    
    this.init();
  }

  init() {
    // 监听DOM变更
    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
  }

  // 优化的DOM更新方法
  updateElement(element, updates, options = {}) {
    const { batch = true, priority = 'normal' } = options;
    
    if (!batch) {
      this.applyUpdates(element, updates);
      return;
    }
    
    // 批量更新
    const key = this.getElementKey(element);
    const existingUpdates = this.updateQueue.get(key) || {};
    
    // 合并更新
    const mergedUpdates = { ...existingUpdates, ...updates };
    this.updateQueue.set(key, mergedUpdates);
    
    // 调度批量应用
    requestAnimationFrame(() => {
      if (this.updateQueue.has(key)) {
        const finalUpdates = this.updateQueue.get(key);
        this.updateQueue.delete(key);
        this.applyUpdates(element, finalUpdates);
      }
    });
  }

  // 应用DOM更新
  applyUpdates(element, updates) {
    const fragment = document.createDocumentFragment();
    let needsReflow = false;
    
    // 分类更新操作
    const styleUpdates = {};
    const attributeUpdates = {};
    let textContent = null;
    let innerHTML = null;
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'textContent') {
        textContent = value;
      } else if (key === 'innerHTML') {
        innerHTML = value;
      } else if (key.startsWith('style.')) {
        const styleProp = key.substring(6);
        styleUpdates[styleProp] = value;
      } else {
        attributeUpdates[key] = value;
      }
    }
    
    // 批量应用样式更新
    if (Object.keys(styleUpdates).length > 0) {
      Object.assign(element.style, styleUpdates);
    }
    
    // 批量应用属性更新
    for (const [attr, value] of Object.entries(attributeUpdates)) {
      element.setAttribute(attr, value);
    }
    
    // 更新内容
    if (textContent !== null) {
      element.textContent = textContent;
    } else if (innerHTML !== null) {
      element.innerHTML = innerHTML;
    }
  }

  // 获取元素唯一标识
  getElementKey(element) {
    if (element.id) return `id:${element.id}`;
    if (element.className) return `class:${element.className}`;
    return `element:${element.tagName}-${Math.random()}`;
  }

  // 处理DOM变更
  handleMutations(mutations) {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // 处理子元素变更
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.optimizeNewElement(node);
          }
        });
      }
    });
  }

  // 优化新添加的元素
  optimizeNewElement(element) {
    // 为新元素应用性能优化
    if (element.style) {
      // 避免不必要的重绘
      element.style.willChange = 'auto';
      
      // 如果是列表项，应用containment
      if (element.matches('.list-item, .overlay-item')) {
        element.style.contain = 'layout style paint';
      }
    }
  }

  // 开始观察元素
  observe(element) {
    if (!this.observedElements.has(element)) {
      this.observedElements.add(element);
      this.mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true
      });
    }
  }

  // 停止观察
  disconnect() {
    this.mutationObserver.disconnect();
    this.updateQueue.clear();
  }
}

// 实时更新性能监控器
class RealTimePerformanceMonitor {
  constructor() {
    this.metrics = {
      updateLatency: [],
      frameRate: [],
      memoryUsage: [],
      updateFrequency: 0
    };
    
    this.startTime = performance.now();
    this.frameCount = 0;
    this.lastFrameTime = this.startTime;
    
    this.startMonitoring();
  }

  startMonitoring() {
    // 监控帧率
    const measureFrame = () => {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= this.lastFrameTime + 1000) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
        this.metrics.frameRate.push({
          timestamp: currentTime,
          fps
        });
        
        // 保持最近50个数据点
        if (this.metrics.frameRate.length > 50) {
          this.metrics.frameRate.shift();
        }
        
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }
      
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
    
    // 监控内存使用
    if (performance.memory) {
      setInterval(() => {
        this.metrics.memoryUsage.push({
          timestamp: performance.now(),
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        });
        
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }
      }, 5000); // 每5秒检查一次
    }
  }

  // 记录更新延迟
  recordUpdateLatency(startTime, endTime) {
    const latency = endTime - startTime;
    this.metrics.updateLatency.push({
      timestamp: endTime,
      latency
    });
    
    if (this.metrics.updateLatency.length > 100) {
      this.metrics.updateLatency.shift();
    }
  }

  // 获取性能报告
  getPerformanceReport() {
    const avgLatency = this.metrics.updateLatency.length > 0
      ? this.metrics.updateLatency.reduce((sum, item) => sum + item.latency, 0) / this.metrics.updateLatency.length
      : 0;
    
    const avgFPS = this.metrics.frameRate.length > 0
      ? this.metrics.frameRate.reduce((sum, item) => sum + item.fps, 0) / this.metrics.frameRate.length
      : 60;
    
    const lastMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const memoryUsage = lastMemory ? (lastMemory.used / lastMemory.limit * 100).toFixed(2) : 0;
    
    return {
      averageUpdateLatency: avgLatency.toFixed(2) + 'ms',
      averageFPS: avgFPS.toFixed(1),
      memoryUsagePercent: memoryUsage + '%',
      recommendations: this.generateRecommendations(avgLatency, avgFPS, parseFloat(memoryUsage))
    };
  }

  generateRecommendations(latency, fps, memoryUsage) {
    const recommendations = [];
    
    if (latency > 16) {
      recommendations.push('Update latency is high - consider batching updates');
    }
    
    if (fps < 50) {
      recommendations.push('Low frame rate detected - reduce concurrent animations');
    }
    
    if (memoryUsage > 80) {
      recommendations.push('High memory usage - implement cleanup mechanisms');
    }
    
    if (this.metrics.updateLatency.length > 50) {
      const recentLatency = this.metrics.updateLatency.slice(-10);
      const trend = recentLatency[recentLatency.length - 1].latency - recentLatency[0].latency;
      
      if (trend > 5) {
        recommendations.push('Update latency is increasing - check for memory leaks');
      }
    }
    
    return recommendations;
  }
}

// 移动端实时更新优化策略
const MOBILE_REALTIME_STRATEGIES = {
  updateFrequency: {
    'high-end': '60fps (16ms interval)',
    'mid-range': '30fps (33ms interval)', 
    'low-end': '20fps (50ms interval)'
  },
  
  batchSizes: {
    'high-end': '50-100 updates per batch',
    'mid-range': '20-50 updates per batch',
    'low-end': '10-20 updates per batch'
  },
  
  optimizationTechniques: [
    'Use requestAnimationFrame for visual updates',
    'Batch DOM operations within single frame',
    'Implement adaptive throttling based on device performance',
    'Prioritize visible content updates',
    'Use CSS containment to isolate update scopes',
    'Implement intelligent update queuing',
    'Monitor performance metrics continuously'
  ]
};

export {
  PerformanceThrottler,
  BatchUpdateManager,
  SmartDOMUpdater,
  RealTimePerformanceMonitor,
  MOBILE_REALTIME_STRATEGIES
};