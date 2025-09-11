/**
 * Mobile Memory Management and Leak Prevention for Overlay Systems
 * 移动端内存管理和泄漏防范策略
 */

// 内存使用监控器
class MemoryMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 5000; // 5秒监控间隔
    this.historyLimit = options.historyLimit || 50;
    this.warningThreshold = options.warningThreshold || 0.8; // 80%内存使用率警告
    this.criticalThreshold = options.criticalThreshold || 0.9; // 90%内存使用率危险
    
    this.memoryHistory = [];
    this.listeners = new Set();
    this.monitoringId = null;
    this.isSupported = this.checkSupport();
  }

  // 检查浏览器支持
  checkSupport() {
    return 'memory' in performance;
  }

  // 开始监控
  startMonitoring() {
    if (!this.isSupported) {
      console.warn('Performance.memory API not supported');
      return false;
    }

    if (this.monitoringId) return true;

    this.monitoringId = setInterval(() => {
      const memoryInfo = this.getMemoryInfo();
      this.recordMemoryUsage(memoryInfo);
      this.checkThresholds(memoryInfo);
    }, this.interval);

    return true;
  }

  // 停止监控
  stopMonitoring() {
    if (this.monitoringId) {
      clearInterval(this.monitoringId);
      this.monitoringId = null;
    }
  }

  // 获取内存信息
  getMemoryInfo() {
    if (!this.isSupported) return null;

    const memory = performance.memory;
    const timestamp = Date.now();
    
    return {
      timestamp,
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      allocatedRatio: memory.totalJSHeapSize / memory.jsHeapSizeLimit
    };
  }

  // 记录内存使用
  recordMemoryUsage(memoryInfo) {
    if (!memoryInfo) return;

    this.memoryHistory.push(memoryInfo);
    
    // 保持历史记录限制
    if (this.memoryHistory.length > this.historyLimit) {
      this.memoryHistory.shift();
    }
  }

  // 检查阈值
  checkThresholds(memoryInfo) {
    if (!memoryInfo) return;

    const { usageRatio } = memoryInfo;
    
    if (usageRatio > this.criticalThreshold) {
      this.notifyListeners('critical', memoryInfo);
    } else if (usageRatio > this.warningThreshold) {
      this.notifyListeners('warning', memoryInfo);
    }
  }

  // 添加监听器
  addListener(callback) {
    this.listeners.add(callback);
  }

  // 移除监听器
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // 通知监听器
  notifyListeners(level, memoryInfo) {
    this.listeners.forEach(callback => {
      try {
        callback(level, memoryInfo);
      } catch (error) {
        console.error('Memory monitor listener error:', error);
      }
    });
  }

  // 获取内存趋势
  getMemoryTrend() {
    if (this.memoryHistory.length < 2) return 'stable';

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);
    
    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, item) => sum + item.usageRatio, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.usageRatio, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 0.1) return 'increasing';
    if (difference < -0.1) return 'decreasing';
    return 'stable';
  }

  // 获取内存报告
  getMemoryReport() {
    const current = this.getMemoryInfo();
    const trend = this.getMemoryTrend();
    
    return {
      current: current ? {
        used: this.formatBytes(current.usedJSHeapSize),
        total: this.formatBytes(current.totalJSHeapSize),
        limit: this.formatBytes(current.jsHeapSizeLimit),
        usagePercent: (current.usageRatio * 100).toFixed(2) + '%'
      } : null,
      trend,
      history: this.memoryHistory.length,
      recommendations: this.generateRecommendations(current, trend)
    };
  }

  // 生成建议
  generateRecommendations(current, trend) {
    const recommendations = [];
    
    if (!current) {
      recommendations.push('Memory monitoring not available in this browser');
      return recommendations;
    }
    
    if (current.usageRatio > this.criticalThreshold) {
      recommendations.push('Critical memory usage - implement immediate cleanup');
      recommendations.push('Consider reducing cached data');
    } else if (current.usageRatio > this.warningThreshold) {
      recommendations.push('High memory usage - review memory intensive operations');
    }
    
    if (trend === 'increasing') {
      recommendations.push('Memory usage is increasing - check for memory leaks');
      recommendations.push('Review event listener cleanup');
      recommendations.push('Check DOM node retention');
    }
    
    return recommendations;
  }

  // 格式化字节数
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return size.toFixed(2) + ' ' + units[unitIndex];
  }
}

// DOM节点泄漏检测器
class DOMLeakDetector {
  constructor() {
    this.nodeRegistry = new WeakMap();
    this.observedNodes = new Set();
    this.mutationObserver = null;
    this.detachedNodes = [];
    
    this.init();
  }

  init() {
    // 创建MutationObserver监听DOM变化
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        // 监听节点移除
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkDetachedNode(node);
          }
        });
      });
    });
    
    // 监听整个文档
    this.mutationObserver.observe(document, {
      childList: true,
      subtree: true
    });
  }

  // 注册需要监控的节点
  registerNode(node, metadata = {}) {
    this.nodeRegistry.set(node, {
      ...metadata,
      registeredAt: Date.now(),
      tagName: node.tagName,
      className: node.className,
      id: node.id
    });
    
    this.observedNodes.add(node);
  }

  // 检查分离的节点
  checkDetachedNode(node) {
    if (this.observedNodes.has(node)) {
      const metadata = this.nodeRegistry.get(node);
      
      // 延迟检查节点是否真正泄漏
      setTimeout(() => {
        if (!document.contains(node) && this.hasEventListeners(node)) {
          this.detachedNodes.push({
            node,
            metadata,
            detachedAt: Date.now()
          });
          
          console.warn('Potential DOM leak detected:', {
            tagName: node.tagName,
            className: node.className,
            id: node.id,
            metadata
          });
        }
      }, 1000);
    }
  }

  // 检查节点是否有事件监听器（简化检查）
  hasEventListeners(node) {
    // 这是一个简化的检查，实际情况更复杂
    // 可以检查常见的事件属性
    const eventProps = ['onclick', 'onmouseover', 'onmouseout', 'onload'];
    return eventProps.some(prop => node[prop] !== null);
  }

  // 获取泄漏报告
  getLeakReport() {
    return {
      detachedNodesCount: this.detachedNodes.length,
      observedNodesCount: this.observedNodes.size,
      detachedNodes: this.detachedNodes.map(item => ({
        tagName: item.node.tagName,
        className: item.node.className,
        id: item.node.id,
        detachedAt: item.detachedAt,
        metadata: item.metadata
      }))
    };
  }

  // 清理检测器
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    this.observedNodes.clear();
    this.detachedNodes = [];
  }
}

// 事件监听器管理器
class EventListenerManager {
  constructor() {
    this.listeners = new Map();
    this.listenerCount = 0;
  }

  // 添加事件监听器
  addEventListener(element, event, handler, options = {}) {
    const listenerId = ++this.listenerCount;
    const listenerInfo = {
      element,
      event,
      handler,
      options,
      addedAt: Date.now(),
      stack: new Error().stack // 记录添加位置
    };
    
    this.listeners.set(listenerId, listenerInfo);
    element.addEventListener(event, handler, options);
    
    return listenerId;
  }

  // 移除事件监听器
  removeEventListener(listenerId) {
    const listenerInfo = this.listeners.get(listenerId);
    if (!listenerInfo) return false;
    
    const { element, event, handler, options } = listenerInfo;
    element.removeEventListener(event, handler, options);
    this.listeners.delete(listenerId);
    
    return true;
  }

  // 移除元素的所有监听器
  removeAllListeners(element) {
    const toRemove = [];
    
    this.listeners.forEach((info, id) => {
      if (info.element === element) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.removeEventListener(id));
  }

  // 获取监听器统计
  getListenerStats() {
    const stats = {
      total: this.listeners.size,
      byEvent: {},
      byElement: {},
      oldListeners: []
    };
    
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    this.listeners.forEach((info, id) => {
      // 按事件类型统计
      stats.byEvent[info.event] = (stats.byEvent[info.event] || 0) + 1;
      
      // 按元素统计
      const elementKey = `${info.element.tagName}${info.element.id ? '#' + info.element.id : ''}${info.element.className ? '.' + info.element.className : ''}`;
      stats.byElement[elementKey] = (stats.byElement[elementKey] || 0) + 1;
      
      // 检查长期存在的监听器
      if (now - info.addedAt > dayMs) {
        stats.oldListeners.push({
          id,
          event: info.event,
          age: Math.floor((now - info.addedAt) / dayMs),
          element: elementKey
        });
      }
    });
    
    return stats;
  }

  // 清理所有监听器
  cleanup() {
    this.listeners.forEach((info, id) => {
      this.removeEventListener(id);
    });
  }
}

// WeakMap/WeakSet缓存管理器
class WeakCacheManager {
  constructor() {
    this.caches = new Map();
    this.stats = {
      created: 0,
      accessed: 0,
      cleanup: 0
    };
  }

  // 创建WeakMap缓存
  createWeakMapCache(name) {
    if (this.caches.has(name)) {
      return this.caches.get(name);
    }
    
    const cache = {
      data: new WeakMap(),
      type: 'WeakMap',
      createdAt: Date.now(),
      accessCount: 0
    };
    
    this.caches.set(name, cache);
    this.stats.created++;
    
    return cache;
  }

  // 创建WeakSet缓存
  createWeakSetCache(name) {
    if (this.caches.has(name)) {
      return this.caches.get(name);
    }
    
    const cache = {
      data: new WeakSet(),
      type: 'WeakSet',
      createdAt: Date.now(),
      accessCount: 0
    };
    
    this.caches.set(name, cache);
    this.stats.created++;
    
    return cache;
  }

  // 获取缓存
  getCache(name) {
    const cache = this.caches.get(name);
    if (cache) {
      cache.accessCount++;
      this.stats.accessed++;
    }
    return cache;
  }

  // 设置WeakMap值
  setWeakMap(cacheName, key, value) {
    const cache = this.getCache(cacheName);
    if (cache && cache.type === 'WeakMap') {
      cache.data.set(key, value);
    }
  }

  // 获取WeakMap值
  getWeakMap(cacheName, key) {
    const cache = this.getCache(cacheName);
    if (cache && cache.type === 'WeakMap') {
      return cache.data.get(key);
    }
    return undefined;
  }

  // 添加到WeakSet
  addWeakSet(cacheName, value) {
    const cache = this.getCache(cacheName);
    if (cache && cache.type === 'WeakSet') {
      cache.data.add(value);
    }
  }

  // 检查WeakSet
  hasWeakSet(cacheName, value) {
    const cache = this.getCache(cacheName);
    if (cache && cache.type === 'WeakSet') {
      return cache.data.has(value);
    }
    return false;
  }

  // 获取统计信息
  getStats() {
    const cacheInfo = {};
    
    this.caches.forEach((cache, name) => {
      cacheInfo[name] = {
        type: cache.type,
        createdAt: cache.createdAt,
        accessCount: cache.accessCount,
        age: Date.now() - cache.createdAt
      };
    });
    
    return {
      ...this.stats,
      totalCaches: this.caches.size,
      caches: cacheInfo
    };
  }
}

// 移动端内存管理最佳实践
const MOBILE_MEMORY_BEST_PRACTICES = {
  prevention: {
    eventListeners: [
      'Always remove event listeners when components unmount',
      'Use weak references for temporary listeners',
      'Prefer passive event listeners for touch/scroll',
      'Avoid anonymous functions as event handlers'
    ],
    
    domNodes: [
      'Remove detached DOM nodes from references',
      'Clear innerHTML instead of removing individual children',
      'Use document fragments for batch operations',
      'Avoid storing references to removed nodes'
    ],
    
    timers: [
      'Clear all setTimeout and setInterval',
      'Cancel requestAnimationFrame callbacks',
      'Clear IntersectionObserver instances',
      'Cleanup MutationObserver instances'
    ],
    
    closures: [
      'Avoid large objects in closure scope',
      'Break circular references explicitly',
      'Use WeakMap for object-keyed caches',
      'Limit closure lifetime to component lifecycle'
    ]
  },
  
  detection: {
    tools: [
      'Chrome DevTools Memory tab',
      'Performance.memory API monitoring',
      'Custom DOM node tracking',
      'Event listener auditing'
    ],
    
    patterns: [
      'Increasing memory usage over time',
      'High object retention after cleanup',
      'Growing event listener counts',
      'Detached DOM node accumulation'
    ]
  },
  
  mitigation: {
    immediate: [
      'Force garbage collection in dev tools',
      'Remove unnecessary DOM references',
      'Clear large data structures',
      'Cleanup component state'
    ],
    
    proactive: [
      'Implement object pooling for frequent allocations',
      'Use lazy loading for non-critical resources',
      'Batch DOM operations to reduce allocations',
      'Monitor memory usage in production'
    ]
  }
};

export {
  MemoryMonitor,
  DOMLeakDetector,
  EventListenerManager,
  WeakCacheManager,
  MOBILE_MEMORY_BEST_PRACTICES
};