/**
 * Browser Reflow & Repaint Optimization for Mobile Overlay Systems
 * 移动端蒙层系统浏览器重排重绘优化机制研究
 */

// 重排重绘分析器
class ReflowRepaintAnalyzer {
  constructor() {
    this.measurements = [];
    this.observer = null;
    this.isMonitoring = false;
    
    // 触发重排的CSS属性列表
    this.reflowProperties = new Set([
      'width', 'height', 'padding', 'margin', 'border',
      'position', 'top', 'left', 'right', 'bottom',
      'font-size', 'font-family', 'line-height',
      'display', 'float', 'clear', 'overflow',
      'min-width', 'max-width', 'min-height', 'max-height'
    ]);
    
    // 触发重绘的CSS属性列表
    this.repaintProperties = new Set([
      'color', 'background', 'background-color', 'background-image',
      'border-color', 'border-style', 'border-radius',
      'box-shadow', 'text-shadow', 'outline',
      'visibility', 'opacity', 'cursor'
    ]);
    
    // 仅触发合成的CSS属性列表
    this.compositeProperties = new Set([
      'transform', 'opacity', 'filter', 'backdrop-filter'
    ]);
  }

  // 开始监控性能
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 使用Performance Observer监控布局事件
    if ('PerformanceObserver' in window) {
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
      
      this.observer.observe({ entryTypes: ['measure'] });
    }
  }

  // 停止监控
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isMonitoring = false;
  }

  // 测量DOM操作性能
  measureDOMOperation(operationName, operation) {
    const startMark = `${operationName}-start`;
    const endMark = `${operationName}-end`;
    
    performance.mark(startMark);
    
    const result = operation();
    
    performance.mark(endMark);
    performance.measure(operationName, startMark, endMark);
    
    // 清理marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    
    return result;
  }

  // 分析CSS属性变更的性能影响
  analyzeCSSPropertyImpact(property) {
    if (this.compositeProperties.has(property)) {
      return {
        type: 'composite',
        cost: 'low',
        description: 'Only triggers composite layer update - best performance',
        gpuAccelerated: true
      };
    } else if (this.repaintProperties.has(property)) {
      return {
        type: 'repaint',
        cost: 'medium',
        description: 'Triggers repaint - moderate performance impact',
        gpuAccelerated: false
      };
    } else if (this.reflowProperties.has(property)) {
      return {
        type: 'reflow',
        cost: 'high',
        description: 'Triggers layout/reflow - highest performance impact',
        gpuAccelerated: false
      };
    } else {
      return {
        type: 'unknown',
        cost: 'unknown',
        description: 'Unknown property - impact varies',
        gpuAccelerated: false
      };
    }
  }

  // 获取性能报告
  getPerformanceReport() {
    const recentMeasurements = this.measurements.slice(-50);
    
    if (recentMeasurements.length === 0) {
      return { message: 'No performance measurements available' };
    }
    
    const totalDuration = recentMeasurements.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / recentMeasurements.length;
    
    const slowOperations = recentMeasurements.filter(m => m.duration > 16);
    
    return {
      totalMeasurements: recentMeasurements.length,
      averageDuration: avgDuration.toFixed(2) + 'ms',
      totalTime: totalDuration.toFixed(2) + 'ms',
      slowOperations: slowOperations.length,
      recommendations: this.generateOptimizationRecommendations(recentMeasurements)
    };
  }

  generateOptimizationRecommendations(measurements) {
    const recommendations = [];
    
    const avgDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
    
    if (avgDuration > 16) {
      recommendations.push('Average operation duration exceeds 16ms frame budget');
      recommendations.push('Consider batching DOM operations');
    }
    
    const slowOps = measurements.filter(m => m.duration > 50);
    if (slowOps.length > 0) {
      recommendations.push(`${slowOps.length} operations took longer than 50ms`);
      recommendations.push('Investigate and optimize slow operations');
    }
    
    return recommendations;
  }
}

// DOM优化工具类
class DOMOptimizer {
  constructor() {
    this.pendingReads = [];
    this.pendingWrites = [];
    this.isScheduled = false;
  }

  // 读写分离优化 - 避免强制同步布局
  scheduleRead(readFn) {
    this.pendingReads.push(readFn);
    this.scheduleFlush();
  }

  scheduleWrite(writeFn) {
    this.pendingWrites.push(writeFn);
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (this.isScheduled) return;
    
    this.isScheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  flush() {
    // 先执行所有读操作
    while (this.pendingReads.length > 0) {
      const readFn = this.pendingReads.shift();
      readFn();
    }
    
    // 再执行所有写操作
    while (this.pendingWrites.length > 0) {
      const writeFn = this.pendingWrites.shift();
      writeFn();
    }
    
    this.isScheduled = false;
  }

  // 批量样式更新
  batchStyleUpdate(elements, styles) {
    const fragment = document.createDocumentFragment();
    
    // 使用DocumentFragment避免多次重排
    elements.forEach(element => {
      Object.assign(element.style, styles);
    });
  }

  // 优化的元素创建
  createOptimizedElement(tagName, attributes = {}, styles = {}, children = []) {
    const element = document.createElement(tagName);
    
    // 批量设置属性
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
    
    // 批量设置样式
    Object.assign(element.style, styles);
    
    // 批量添加子元素
    const fragment = document.createDocumentFragment();
    children.forEach(child => {
      if (typeof child === 'string') {
        fragment.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        fragment.appendChild(child);
      }
    });
    
    element.appendChild(fragment);
    
    return element;
  }

  // 安全的DOM查询
  safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.warn('Invalid selector:', selector, error);
      return null;
    }
  }

  // 批量DOM操作
  batchOperation(operations) {
    const results = [];
    
    // 创建临时容器避免重排
    const tempContainer = document.createDocumentFragment();
    
    operations.forEach(operation => {
      const result = operation(tempContainer);
      results.push(result);
    });
    
    return results;
  }
}

// CSS Transform优化器
class TransformOptimizer {
  constructor() {
    this.transformCache = new WeakMap();
    this.activeAnimations = new Set();
  }

  // 优化Transform组合
  combineTransforms(transforms) {
    const combined = {
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      skewX: 0,
      skewY: 0
    };
    
    transforms.forEach(transform => {
      Object.assign(combined, transform);
    });
    
    return this.buildTransformString(combined);
  }

  buildTransformString(transforms) {
    const parts = [];
    
    if (transforms.translateX || transforms.translateY || transforms.translateZ) {
      parts.push(`translate3d(${transforms.translateX || 0}px, ${transforms.translateY || 0}px, ${transforms.translateZ || 0}px)`);
    }
    
    if (transforms.scaleX !== 1 || transforms.scaleY !== 1) {
      parts.push(`scale(${transforms.scaleX || 1}, ${transforms.scaleY || 1})`);
    }
    
    if (transforms.rotate) {
      parts.push(`rotate(${transforms.rotate}deg)`);
    }
    
    if (transforms.skewX) {
      parts.push(`skewX(${transforms.skewX}deg)`);
    }
    
    if (transforms.skewY) {
      parts.push(`skewY(${transforms.skewY}deg)`);
    }
    
    return parts.join(' ');
  }

  // GPU加速优化
  enableGPUAcceleration(element, transforms = {}) {
    // 强制创建合成层
    element.style.transform = this.combineTransforms([transforms, { translateZ: 0 }]);
    element.style.willChange = 'transform';
    
    // 缓存transform状态
    this.transformCache.set(element, transforms);
  }

  // 更新Transform而不触发重排
  updateTransform(element, newTransforms) {
    const cached = this.transformCache.get(element) || {};
    const combined = { ...cached, ...newTransforms };
    
    element.style.transform = this.combineTransforms([combined]);
    this.transformCache.set(element, combined);
  }

  // 清理GPU加速
  cleanupGPUAcceleration(element) {
    element.style.willChange = 'auto';
    element.style.transform = '';
    this.transformCache.delete(element);
  }
}

// 移动端重排重绘优化策略
const MOBILE_REFLOW_REPAINT_STRATEGIES = {
  avoidance: {
    'use-transform-opacity': {
      description: 'Use transform and opacity for animations',
      benefit: 'Triggers only composite layer updates',
      example: `
        // ❌ Bad - triggers reflow
        element.style.left = '100px';
        element.style.top = '50px';
        
        // ✅ Good - only composite
        element.style.transform = 'translate3d(100px, 50px, 0)';
      `
    },
    
    'batch-dom-reads-writes': {
      description: 'Separate DOM reads and writes',
      benefit: 'Avoids forced synchronous layout',
      example: `
        // ❌ Bad - causes layout thrashing
        element1.style.width = element2.offsetWidth + 'px';
        element3.style.height = element4.offsetHeight + 'px';
        
        // ✅ Good - batch reads then writes
        const width = element2.offsetWidth;
        const height = element4.offsetHeight;
        element1.style.width = width + 'px';
        element3.style.height = height + 'px';
      `
    },
    
    'use-css-containment': {
      description: 'Use CSS contain property',
      benefit: 'Limits reflow/repaint scope',
      example: `
        .overlay-container {
          contain: layout style paint;
        }
      `
    }
  },
  
  techniques: {
    'document-fragment': 'Use DocumentFragment for batch DOM operations',
    'css-variables': 'Use CSS custom properties for dynamic styling',
    'will-change': 'Hint browser about upcoming changes',
    'transform3d': 'Force hardware acceleration with 3D transforms',
    'optimize-selectors': 'Use efficient CSS selectors'
  },
  
  measurements: {
    'layout-duration': 'Monitor layout calculation time',
    'paint-duration': 'Track painting operation time',
    'composite-duration': 'Measure composite layer updates',
    'forced-reflow-count': 'Count synchronous layout triggers'
  }
};

// 性能预算和阈值
const PERFORMANCE_THRESHOLDS = {
  mobile: {
    maxLayoutTime: 10, // ms
    maxPaintTime: 5,   // ms
    maxCompositeTime: 2, // ms
    frameBudget: 16,   // ms (60fps)
    
    // 低端设备阈值更严格
    lowEnd: {
      maxLayoutTime: 8,
      maxPaintTime: 3,
      maxCompositeTime: 1,
      frameBudget: 33  // 30fps
    }
  },
  
  desktop: {
    maxLayoutTime: 5,
    maxPaintTime: 3,
    maxCompositeTime: 1,
    frameBudget: 16
  }
};

export {
  ReflowRepaintAnalyzer,
  DOMOptimizer,
  TransformOptimizer,
  MOBILE_REFLOW_REPAINT_STRATEGIES,
  PERFORMANCE_THRESHOLDS
};