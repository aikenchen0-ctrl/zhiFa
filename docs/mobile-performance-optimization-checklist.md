# 移动端性能优化最佳实践清单

## 📱 设备性能分析

### 设备性能等级划分
- **低端设备**: 单核ARM ~1GHz, 1-2GB RAM, 30fps目标
- **中端设备**: 四核ARM ~2GHz, 3-4GB RAM, 60fps目标  
- **高端设备**: 八核ARM ~3GHz, 6-12GB RAM, 60fps目标

### 浏览器兼容性差异
- **iOS Safari**: WebKit引擎，内存限制1.5GB/标签页，积极的后台节流
- **Android Chrome**: Blink引擎，更好的Web标准支持，更宽松的内存限制

## 🎨 CSS性能优化

### CSS Containment 策略
```css
/* 布局隔离 - 减少40-60%布局抖动 */
.overlay-container {
  contain: layout;
}

/* 样式隔离 - 减少30-50%样式重算时间 */
.overlay-content {
  contain: style;
}

/* 绘制隔离 - 减少50-70%绘制区域 */
.overlay-modal {
  contain: paint;
  overflow: hidden;
}

/* 严格隔离 - 最大优化但限制性强 */
.overlay-isolated {
  contain: strict;
}
```

### will-change 最佳实践
```css
/* ✅ 仅在动画期间使用 */
.overlay-slide-in {
  will-change: transform, opacity;
  transition: transform 0.3s ease;
}

/* ✅ 动画结束后移除 */
.overlay-slide-in.animation-end {
  will-change: auto;
}

/* ❌ 避免在静态元素上使用 */
.static-element {
  will-change: transform; /* 不要这样做 */
}
```

### GPU加速技巧
```css
/* 强制硬件加速 */
.gpu-accelerated {
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}

/* 移动端触摸优化 */
.touchable {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
```

## 🔄 虚拟滚动与懒加载

### 虚拟滚动实现要点
- **固定高度**: 使用固定项目高度以获得最佳性能
- **缓冲区大小**: 2-5个项目缓冲，根据滚动行为调整
- **批量DOM操作**: 使用DocumentFragment减少重排
- **内存清理**: 及时清理事件监听器和引用

### 懒加载策略
```javascript
// 图片懒加载
const lazyImageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.add('lazy-loaded');
      lazyImageObserver.unobserve(img);
    }
  });
}, { rootMargin: '50px' });

// 内容懒加载
const lazyContentObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadContentAsync(entry.target);
    }
  });
}, { rootMargin: '100px' });
```

## 🧵 Web Workers 应用策略

### 适用场景
- **数据处理**: 列表数据 > 1000项，复杂过滤/排序
- **图片处理**: 批量图片操作，Canvas计算
- **后台任务**: 定期数据同步，缓存管理

### Workers使用原则
```javascript
// ✅ 适合CPU密集型任务 > 16ms
const worker = new Worker('data-processor.js');
worker.postMessage({ data: largeDataSet, operation: 'filter' });

// ❌ 避免为简单操作创建Worker
// const worker = new Worker('simple-calc.js'); // 不要这样做

// ✅ 移动端限制并发Worker数量
const maxWorkers = Math.min(4, navigator.hardwareConcurrency || 2);
```

### 移动端Worker优化
- 限制并发Worker数量为CPU核心数/2
- 使用较小数据块处理
- 考虑电池使用影响
- 监控热节流效应

## ⚡ 实时更新性能优化

### Debounce & Throttle 应用
```javascript
// 防抖 - 适用于搜索输入
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

// 节流 - 适用于滚动事件
const throttledScroll = throttle((event) => {
  updateScrollPosition(event);
}, 16); // 60fps

// 智能节流 - 根据性能动态调整
const adaptiveThrottle = (func, baseDelay = 16) => {
  let currentDelay = baseDelay;
  return throttle(func, () => currentDelay);
};
```

### 批量更新管理
```javascript
// 批量DOM操作
const batchUpdates = (updates) => {
  requestAnimationFrame(() => {
    const fragment = document.createDocumentFragment();
    updates.forEach(update => {
      applyUpdate(fragment, update);
    });
    targetElement.appendChild(fragment);
  });
};

// 优先级队列
const updateQueue = new PriorityQueue();
updateQueue.add('high', criticalUpdate);
updateQueue.add('normal', regularUpdate);
updateQueue.add('low', backgroundUpdate);
```

## 🎯 重排重绘优化

### 避免强制同步布局
```javascript
// ❌ 错误 - 导致布局抖动
element1.style.width = element2.offsetWidth + 'px';
element3.style.height = element4.offsetHeight + 'px';

// ✅ 正确 - 批量读取然后写入
const width = element2.offsetWidth;
const height = element4.offsetHeight;
requestAnimationFrame(() => {
  element1.style.width = width + 'px';
  element3.style.height = height + 'px';
});
```

### Transform优化
```javascript
// ❌ 触发重排
element.style.left = '100px';
element.style.top = '50px';

// ✅ 仅触发合成
element.style.transform = 'translate3d(100px, 50px, 0)';
```

### 性能预算
- **移动端低端设备**: 布局<8ms, 绘制<3ms, 合成<1ms
- **移动端中端设备**: 布局<10ms, 绘制<5ms, 合成<2ms
- **桌面设备**: 布局<5ms, 绘制<3ms, 合成<1ms

## 🖼️ OffscreenCanvas 应用

### 适用场景
- 复杂图形绘制操作 > 16ms
- 批量图像处理
- Canvas动画和特效
- 数据可视化

### 实施策略
```javascript
// 检查支持并创建回退
const createDrawingCanvas = (width, height) => {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const worker = new Worker('drawing-worker.js');
    worker.postMessage({ canvas }, [canvas]);
    return worker;
  } else {
    // 回退到主线程Canvas
    return createMainThreadCanvas(width, height);
  }
};

// 移动端限制
const shouldUseOffscreen = (complexity) => {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const hasEnoughCores = navigator.hardwareConcurrency > 2;
  return complexity > 16 && (!isMobile || hasEnoughCores);
};
```

### 浏览器支持回退
- Chrome 69+, Firefox 105+支持
- Safari支持有限，需要检测和回退
- 实施优雅降级策略

## 💾 内存管理

### 内存泄漏预防
```javascript
// ✅ 正确的事件监听器管理
class ComponentManager {
  constructor() {
    this.boundHandlers = new Map();
    this.timers = new Set();
    this.observers = new Set();
  }
  
  addEventListener(element, event, handler) {
    const boundHandler = handler.bind(this);
    this.boundHandlers.set(handler, boundHandler);
    element.addEventListener(event, boundHandler);
  }
  
  cleanup() {
    // 清理事件监听器
    this.boundHandlers.forEach((boundHandler, originalHandler) => {
      // 移除监听器的逻辑
    });
    
    // 清理定时器
    this.timers.forEach(timer => clearTimeout(timer));
    
    // 清理观察者
    this.observers.forEach(observer => observer.disconnect());
  }
}

// ✅ 使用WeakMap避免内存泄漏
const nodeCache = new WeakMap();
const setNodeData = (node, data) => {
  nodeCache.set(node, data);
};
```

### 内存监控
```javascript
// 监控内存使用
const monitorMemory = () => {
  if (performance.memory) {
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usageRatio = usedJSHeapSize / jsHeapSizeLimit;
    
    if (usageRatio > 0.8) {
      console.warn('High memory usage detected:', usageRatio);
      // 触发清理机制
      triggerMemoryCleanup();
    }
  }
};

setInterval(monitorMemory, 5000);
```

## 📊 性能监控

### 关键指标监控
```javascript
// FPS监控
const fpsMonitor = new class {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
  }
  
  measure() {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastTime + 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      console.log('FPS:', fps);
      
      if (fps < 30) {
        console.warn('Low FPS detected');
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    requestAnimationFrame(() => this.measure());
  }
};

// 网络性能监控
const networkMonitor = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    if (entry.duration > 1000) {
      console.warn('Slow resource:', entry.name, entry.duration + 'ms');
    }
  });
});

networkMonitor.observe({ entryTypes: ['resource'] });
```

### 用户自定义指标
```javascript
// 自定义性能标记
performance.mark('overlay-start');
// ... 执行蒙层操作
performance.mark('overlay-end');
performance.measure('overlay-duration', 'overlay-start', 'overlay-end');

// 监听自定义指标
const userTimingObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

userTimingObserver.observe({ entryTypes: ['measure'] });
```

## 🔧 调试工具推荐

### 浏览器开发者工具
- **Chrome DevTools**: Performance面板，Memory面板，Network面板
- **Firefox DevTools**: Performance工具，内存工具
- **Safari DevTools**: Timelines，资源监控

### 移动端调试
- **Remote Debugging**: Chrome远程调试Android设备
- **Safari Web Inspector**: 调试iOS Safari
- **weinre**: 远程Web Inspector
- **Vorlon.js**: 远程调试工具

### 第三方性能监控
- **Web Vitals**: Google的核心Web指标
- **Lighthouse**: 自动化性能审计
- **SpeedCurve**: 持续性能监控
- **New Relic**: 应用性能监控

## 📱 移动端特殊优化

### 触摸和手势优化
```css
/* 优化触摸响应 */
.touchable {
  touch-action: manipulation; /* 禁用双击缩放 */
  -webkit-tap-highlight-color: transparent; /* 移除点击高亮 */
}

/* 滚动性能优化 */
.scrollable {
  -webkit-overflow-scrolling: touch; /* iOS弹性滚动 */
  overscroll-behavior: contain; /* 防止滚动穿透 */
}
```

### 电池和性能平衡
- 减少不必要的动画和轮询
- 使用`requestIdleCallback`执行非关键任务
- 在页面不可见时暂停动画
- 监控设备温度和电池状态

### 网络条件适配
```javascript
// 根据网络条件调整策略
const connection = navigator.connection;
if (connection) {
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    // 启用激进的优化模式
    enableLowBandwidthMode();
  } else if (connection.effectiveType === '4g') {
    // 启用标准模式
    enableStandardMode();
  }
}

// 监听网络变化
connection.addEventListener('change', () => {
  adaptToNetworkConditions();
});
```

## ✅ 性能优化检查清单

### 开发阶段
- [ ] 实施CSS containment策略
- [ ] 优化will-change使用
- [ ] 实现虚拟滚动（列表>100项）
- [ ] 配置图片懒加载
- [ ] 设置适当的缓冲区大小
- [ ] 使用Web Workers处理重型任务
- [ ] 实施防抖/节流机制
- [ ] 批量DOM操作
- [ ] 避免强制同步布局
- [ ] 使用transform替代位置变更

### 测试阶段
- [ ] 在低端设备上测试
- [ ] 监控内存使用情况
- [ ] 测试不同网络条件
- [ ] 验证FPS保持在目标范围
- [ ] 检查内存泄漏
- [ ] 验证触摸响应性能
- [ ] 测试长时间使用稳定性

### 发布前
- [ ] 启用性能监控
- [ ] 设置性能预警
- [ ] 配置错误追踪
- [ ] 优化资源加载
- [ ] 启用GZIP压缩
- [ ] 配置CDN
- [ ] 实施渐进式增强

### 生产监控
- [ ] 监控真实用户性能数据
- [ ] 追踪核心Web指标
- [ ] 设置性能预算
- [ ] 定期性能审计
- [ ] 用户体验监控
- [ ] 错误率监控

## 📈 性能基准与目标

### 核心Web指标目标
- **LCP (Largest Contentful Paint)**: < 2.5秒
- **FID (First Input Delay)**: < 100毫秒  
- **CLS (Cumulative Layout Shift)**: < 0.1

### 移动端性能目标
- **首屏渲染**: < 1.5秒
- **交互准备时间**: < 2秒
- **滚动帧率**: 保持30fps+（低端设备）或60fps（高端设备）
- **内存使用**: < 80% heap limit
- **电池影响**: 最小化CPU使用

记住：性能优化是一个持续的过程，需要根据实际用户数据和设备性能表现不断调整和改进。