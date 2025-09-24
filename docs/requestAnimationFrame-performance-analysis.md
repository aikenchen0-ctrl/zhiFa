# requestAnimationFrame 核心工作原理与性能优化深度分析

## 1. 与浏览器渲染管线的关系

### 浏览器渲染管线核心流程

```
JavaScript → Style → Layout → Paint → Composite
     ↑                                    ↓
requestAnimationFrame ←── VSync Signal ←──┘
```

### requestAnimationFrame在渲染管线中的作用

requestAnimationFrame (rAF) 是浏览器提供的一个精确同步机制，它确保JavaScript动画代码在浏览器准备绘制下一帧之前执行：

1. **VSync 同步**: rAF回调函数在每个刷新周期的开始执行，与显示器的垂直同步信号(VSync)对齐
2. **避免重复绘制**: 确保每个渲染周期只绘制一次，避免不必要的中间帧
3. **自动节流**: 当页面不可见时自动暂停，节省CPU和电池
4. **优化布局计算**: 在Style和Layout阶段之前执行，避免强制同步布局

### 关键时间节点分析

```javascript
// 浏览器渲染管线时间线
Frame Start (t=0ms)
├── rAF callbacks (t=0-2ms)
├── Style calculation (t=2-4ms) 
├── Layout/Reflow (t=4-8ms)
├── Paint (t=8-12ms)
├── Composite (t=12-16ms)
└── Frame End (t=16ms for 60Hz)
```

## 2. 60Hz vs 120Hz显示器的帧率同步机制

### 60Hz显示器特征

- **帧间隔**: 16.67ms (1000ms / 60fps)
- **VSync频率**: 每16.67ms触发一次
- **性能预算**: 16ms内必须完成所有渲染工作
- **掉帧阈值**: 超过16.67ms会导致掉帧

### 120Hz显示器特征

- **帧间隔**: 8.33ms (1000ms / 120fps)
- **VSync频率**: 每8.33ms触发一次
- **性能预算**: 8ms内完成渲染工作
- **更高性能要求**: 需要更严格的性能优化

### 自适应帧率检测与优化

```javascript
class AdaptiveFrameRateManager {
    constructor() {
        this.targetFPS = this.detectRefreshRate();
        this.frameTime = 1000 / this.targetFPS;
        this.performanceBudget = this.frameTime * 0.8; // 80%的性能预算
    }

    detectRefreshRate() {
        return new Promise((resolve) => {
            let frameCount = 0;
            let startTime = performance.now();
            
            const measureFrameRate = () => {
                frameCount++;
                if (frameCount === 120) { // 测量120帧
                    const elapsed = performance.now() - startTime;
                    const fps = Math.round(120000 / elapsed);
                    resolve(fps > 100 ? 120 : 60);
                } else {
                    requestAnimationFrame(measureFrameRate);
                }
            };
            
            requestAnimationFrame(measureFrameRate);
        });
    }

    // 根据显示器刷新率调整动画策略
    adaptAnimationStrategy() {
        if (this.targetFPS === 120) {
            // 120Hz优化策略
            return {
                maxAnimationsPerFrame: 50,
                enableFrameSkipping: true,
                cullDistance: 500,
                updateInterval: 1 // 每帧更新
            };
        } else {
            // 60Hz标准策略
            return {
                maxAnimationsPerFrame: 100,
                enableFrameSkipping: false,
                cullDistance: 800,
                updateInterval: 1
            };
        }
    }
}
```

## 3. 大量DOM元素场景下的性能瓶颈分析

### 主要性能瓶颈

#### 3.1 DOM查询与访问瓶颈

在2000+元素场景中，DOM查询成为关键瓶颈：

```javascript
// ❌ 低效方式 - 每帧重复查询
function inefficientUpdate() {
    document.querySelectorAll('.connection-element').forEach(element => {
        // 每次查询都要遍历整个DOM树
        const rect = element.getBoundingClientRect();
        updateConnection(rect);
    });
}

// ✅ 高效方式 - 缓存DOM引用
class ElementManager {
    constructor() {
        this.elements = new Map();
        this.boundingRects = new Map();
        this.dirtyElements = new Set();
    }
    
    cacheElements() {
        document.querySelectorAll('.connection-element').forEach(element => {
            const id = element.id || this.generateId();
            this.elements.set(id, element);
            this.boundingRects.set(id, element.getBoundingClientRect());
        });
    }
    
    markDirty(elementId) {
        this.dirtyElements.add(elementId);
    }
    
    updateDirtyElements() {
        this.dirtyElements.forEach(id => {
            const element = this.elements.get(id);
            if (element) {
                this.boundingRects.set(id, element.getBoundingClientRect());
            }
        });
        this.dirtyElements.clear();
    }
}
```

#### 3.2 布局抖动(Layout Thrashing)

大量DOM操作导致的强制同步布局：

```javascript
// ❌ 布局抖动 - 读写混合
function causeLayoutThrashing() {
    elements.forEach(element => {
        element.style.left = element.offsetLeft + 10 + 'px'; // 触发强制布局
        element.style.top = element.offsetTop + 5 + 'px';   // 再次触发布局
    });
}

// ✅ 批量操作 - 分离读写
function optimizedBatchUpdate() {
    // 第一阶段：批量读取
    const positions = elements.map(element => ({
        element,
        left: element.offsetLeft,
        top: element.offsetTop
    }));
    
    // 第二阶段：批量写入
    positions.forEach(({element, left, top}) => {
        element.style.transform = `translate(${left + 10}px, ${top + 5}px)`;
    });
}
```

#### 3.3 重绘与重排优化

```javascript
class PerformantRenderer {
    constructor() {
        this.pendingUpdates = [];
        this.scheduledFrame = false;
    }
    
    scheduleUpdate(updateFn) {
        this.pendingUpdates.push(updateFn);
        
        if (!this.scheduledFrame) {
            this.scheduledFrame = true;
            requestAnimationFrame(() => {
                this.flushUpdates();
            });
        }
    }
    
    flushUpdates() {
        // 使用DocumentFragment减少重排
        const fragment = document.createDocumentFragment();
        
        // 批量应用更新
        this.pendingUpdates.forEach(updateFn => updateFn(fragment));
        
        // 一次性插入DOM
        if (fragment.children.length > 0) {
            this.container.appendChild(fragment);
        }
        
        this.pendingUpdates = [];
        this.scheduledFrame = false;
    }
}
```

## 4. 虚拟滚动与位置监听的最佳结合方式

### 智能虚拟滚动实现

```javascript
class IntelligentVirtualScroller {
    constructor(container, options = {}) {
        this.container = container;
        this.itemHeight = options.itemHeight || 50;
        this.bufferSize = options.bufferSize || 5;
        this.visibleItems = new Map();
        this.scrollTop = 0;
        this.containerHeight = container.clientHeight;
        
        this.setupScrollListener();
        this.setupIntersectionObserver();
    }
    
    setupScrollListener() {
        let ticking = false;
        
        this.container.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateVisibleRange();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }
    
    updateVisibleRange() {
        this.scrollTop = this.container.scrollTop;
        
        const visibleStart = Math.floor(this.scrollTop / this.itemHeight);
        const visibleEnd = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight);
        
        // 添加缓冲区
        const renderStart = Math.max(0, visibleStart - this.bufferSize);
        const renderEnd = Math.min(this.totalItems, visibleEnd + this.bufferSize);
        
        this.renderRange(renderStart, renderEnd);
    }
    
    // 使用Intersection Observer优化可见性检测
    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const itemId = entry.target.dataset.itemId;
                if (entry.isIntersecting) {
                    this.onItemVisible(itemId);
                } else {
                    this.onItemHidden(itemId);
                }
            });
        }, {
            root: this.container,
            rootMargin: '50px',
            threshold: [0, 0.1, 0.9, 1]
        });
    }
}
```

### 高性能位置监听系统

```javascript
class PositionTracker {
    constructor() {
        this.trackedElements = new Map();
        this.positionCache = new Map();
        this.dirtyElements = new Set();
        this.isUpdating = false;
        
        this.setupMutationObserver();
        this.setupResizeObserver();
    }
    
    trackElement(id, element, callback) {
        this.trackedElements.set(id, { element, callback });
        this.positionCache.set(id, this.getElementPosition(element));
        
        // 监听元素
        this.resizeObserver.observe(element);
    }
    
    setupMutationObserver() {
        this.mutationObserver = new MutationObserver((mutations) => {
            const affectedElements = new Set();
            
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || 
                     mutation.attributeName === 'class')) {
                    
                    const elementId = this.getElementId(mutation.target);
                    if (elementId) {
                        affectedElements.add(elementId);
                    }
                }
            });
            
            if (affectedElements.size > 0) {
                this.scheduleUpdate(affectedElements);
            }
        });
        
        this.mutationObserver.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            const affectedElements = new Set();
            
            entries.forEach(entry => {
                const elementId = this.getElementId(entry.target);
                if (elementId) {
                    affectedElements.add(elementId);
                }
            });
            
            this.scheduleUpdate(affectedElements);
        });
    }
    
    scheduleUpdate(elementIds) {
        elementIds.forEach(id => this.dirtyElements.add(id));
        
        if (!this.isUpdating) {
            this.isUpdating = true;
            requestAnimationFrame(() => {
                this.updateDirtyElements();
                this.isUpdating = false;
            });
        }
    }
    
    updateDirtyElements() {
        const updates = [];
        
        this.dirtyElements.forEach(id => {
            const tracked = this.trackedElements.get(id);
            if (tracked) {
                const oldPosition = this.positionCache.get(id);
                const newPosition = this.getElementPosition(tracked.element);
                
                if (!this.positionsEqual(oldPosition, newPosition)) {
                    this.positionCache.set(id, newPosition);
                    updates.push({ id, oldPosition, newPosition, callback: tracked.callback });
                }
            }
        });
        
        // 批量执行回调
        updates.forEach(({ id, oldPosition, newPosition, callback }) => {
            callback(id, newPosition, oldPosition);
        });
        
        this.dirtyElements.clear();
    }
}
```

## 5. 内存管理和对象池应用

### 高效对象池实现

```javascript
class AdvancedObjectPool {
    constructor() {
        this.pools = new Map();
        this.stats = {
            created: 0,
            reused: 0,
            released: 0,
            peak: 0
        };
    }
    
    createPool(type, factory, reset, maxSize = 100) {
        this.pools.set(type, {
            objects: [],
            factory,
            reset,
            maxSize,
            created: 0,
            reused: 0
        });
    }
    
    acquire(type) {
        const pool = this.pools.get(type);
        if (!pool) throw new Error(`Pool ${type} not found`);
        
        let obj;
        if (pool.objects.length > 0) {
            obj = pool.objects.pop();
            pool.reused++;
            this.stats.reused++;
        } else {
            obj = pool.factory();
            pool.created++;
            this.stats.created++;
        }
        
        return obj;
    }
    
    release(type, obj) {
        const pool = this.pools.get(type);
        if (!pool) return;
        
        if (pool.objects.length < pool.maxSize) {
            pool.reset(obj);
            pool.objects.push(obj);
            this.stats.released++;
        }
    }
    
    // 智能清理策略
    cleanup() {
        this.pools.forEach((pool, type) => {
            const targetSize = Math.ceil(pool.reused * 0.1); // 保留10%的重用量
            const removeCount = Math.max(0, pool.objects.length - targetSize);
            
            if (removeCount > 0) {
                pool.objects.splice(0, removeCount);
            }
        });
    }
}

// 连接线对象池
const connectionPool = new AdvancedObjectPool();

connectionPool.createPool('connection', 
    () => ({ 
        id: null, 
        startPos: { x: 0, y: 0 }, 
        endPos: { x: 0, y: 0 }, 
        path: null,
        visible: false 
    }),
    (obj) => {
        obj.id = null;
        obj.startPos.x = 0;
        obj.startPos.y = 0;
        obj.endPos.x = 0;
        obj.endPos.y = 0;
        obj.path = null;
        obj.visible = false;
    }
);
```

### 内存泄漏检测与预防

```javascript
class MemoryLeakDetector {
    constructor() {
        this.references = new WeakMap();
        this.counters = new Map();
        this.threshold = 1000;
        
        this.startMonitoring();
    }
    
    trackObject(obj, type) {
        this.references.set(obj, { type, created: Date.now() });
        
        const count = this.counters.get(type) || 0;
        this.counters.set(type, count + 1);
        
        if (count > this.threshold) {
            console.warn(`Potential memory leak: ${type} count exceeded ${this.threshold}`);
        }
    }
    
    startMonitoring() {
        setInterval(() => {
            if (performance.memory) {
                const used = performance.memory.usedJSHeapSize;
                const total = performance.memory.totalJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                
                if (used / limit > 0.8) {
                    console.warn('High memory usage detected', {
                        used: Math.round(used / 1024 / 1024) + 'MB',
                        total: Math.round(total / 1024 / 1024) + 'MB',
                        limit: Math.round(limit / 1024 / 1024) + 'MB'
                    });
                    
                    this.suggestCleanup();
                }
            }
        }, 5000);
    }
    
    suggestCleanup() {
        // 触发垃圾回收建议
        this.counters.forEach((count, type) => {
            if (count > 100) {
                console.info(`Consider cleaning up ${type} objects (${count} instances)`);
            }
        });
    }
}
```

## 6. 2000+元素滚动场景性能瓶颈分析

### 关键性能指标分析

```javascript
class ScrollPerformanceAnalyzer {
    constructor() {
        this.metrics = {
            scrollEvents: 0,
            layoutCalculations: 0,
            paintCalls: 0,
            frameDrops: 0,
            averageFrameTime: 0
        };
        
        this.performanceMarks = [];
        this.startTime = performance.now();
    }
    
    analyzeScrollPerformance(elementCount) {
        const analysis = {
            elementCount,
            recommendations: [],
            bottlenecks: [],
            optimizations: []
        };
        
        // 基于元素数量的性能预测
        if (elementCount > 2000) {
            analysis.bottlenecks.push('High DOM element count');
            analysis.recommendations.push('Implement virtual scrolling');
            analysis.recommendations.push('Use CSS containment');
            analysis.recommendations.push('Enable hardware acceleration');
        }
        
        // 帧率分析
        if (this.metrics.averageFrameTime > 16.67) {
            analysis.bottlenecks.push('Frame time exceeds 60fps budget');
            analysis.optimizations.push('Reduce work per frame');
            analysis.optimizations.push('Implement frame time budgeting');
        }
        
        return analysis;
    }
    
    // 实时性能监控
    startRealTimeMonitoring() {
        let frameCount = 0;
        let totalFrameTime = 0;
        
        const measureFrame = (timestamp) => {
            const frameStart = performance.now();
            
            // 模拟帧工作
            requestAnimationFrame(() => {
                const frameTime = performance.now() - frameStart;
                totalFrameTime += frameTime;
                frameCount++;
                
                if (frameCount % 60 === 0) {
                    this.metrics.averageFrameTime = totalFrameTime / frameCount;
                    
                    if (this.metrics.averageFrameTime > 20) {
                        this.triggerPerformanceAlert();
                    }
                }
                
                measureFrame(performance.now());
            });
        };
        
        measureFrame(performance.now());
    }
}
```

### 滚动性能优化策略

```javascript
class OptimizedScrollHandler {
    constructor(container, elements) {
        this.container = container;
        this.elements = elements;
        this.visibleElements = new Set();
        this.frameScheduled = false;
        this.scrollTop = 0;
        this.scrollDirection = 0;
        
        this.setupOptimizedScrolling();
    }
    
    setupOptimizedScrolling() {
        let lastScrollTop = 0;
        let ticking = false;
        
        // 使用被动监听器提高性能
        this.container.addEventListener('scroll', (e) => {
            this.scrollTop = e.target.scrollTop;
            this.scrollDirection = this.scrollTop > lastScrollTop ? 1 : -1;
            lastScrollTop = this.scrollTop;
            
            if (!ticking) {
                this.scheduleScrollUpdate();
                ticking = true;
                
                requestAnimationFrame(() => {
                    ticking = false;
                });
            }
        }, { passive: true });
    }
    
    scheduleScrollUpdate() {
        if (!this.frameScheduled) {
            this.frameScheduled = true;
            
            requestAnimationFrame(() => {
                this.updateVisibleElements();
                this.frameScheduled = false;
            });
        }
    }
    
    updateVisibleElements() {
        const containerRect = this.container.getBoundingClientRect();
        const buffer = 100; // 缓冲区
        
        // 使用二分查找优化可见元素查找
        const visibleRange = this.findVisibleRange(
            containerRect.top - buffer,
            containerRect.bottom + buffer
        );
        
        // 更新可见性状态
        this.updateElementVisibility(visibleRange);
    }
    
    findVisibleRange(viewportTop, viewportBottom) {
        const start = this.binarySearchStart(viewportTop);
        const end = this.binarySearchEnd(viewportBottom);
        return { start, end };
    }
    
    // 只更新变化的元素
    updateElementVisibility(range) {
        const newVisibleElements = new Set();
        
        for (let i = range.start; i <= range.end; i++) {
            if (this.elements[i]) {
                newVisibleElements.add(i);
                
                if (!this.visibleElements.has(i)) {
                    this.showElement(i);
                }
            }
        }
        
        // 隐藏不再可见的元素
        this.visibleElements.forEach(index => {
            if (!newVisibleElements.has(index)) {
                this.hideElement(index);
            }
        });
        
        this.visibleElements = newVisibleElements;
    }
}
```

## 7. SVG连接线跟随动画优化建议

### 高性能SVG路径动画

```javascript
class OptimizedSVGConnectionSystem {
    constructor(svg) {
        this.svg = svg;
        this.connections = new Map();
        this.pathPool = [];
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.setupOptimizations();
    }
    
    setupOptimizations() {
        // 启用GPU加速
        this.svg.style.willChange = 'transform';
        this.svg.style.transform = 'translateZ(0)';
        
        // 预创建路径元素池
        for (let i = 0; i < 50; i++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.style.willChange = 'd';
            this.pathPool.push(path);
        }
    }
    
    createConnection(id, startElement, endElement, options = {}) {
        const pathElement = this.pathPool.pop() || 
            document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const connection = {
            id,
            pathElement,
            startElement,
            endElement,
            lastStartPos: null,
            lastEndPos: null,
            options: {
                animationDuration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                ...options
            }
        };
        
        this.connections.set(id, connection);
        this.svg.appendChild(pathElement);
        
        this.updateConnection(id);
        return connection;
    }
    
    updateConnection(id) {
        const connection = this.connections.get(id);
        if (!connection) return;
        
        const startPos = this.getElementCenter(connection.startElement);
        const endPos = this.getElementCenter(connection.endElement);
        
        // 检查是否需要更新
        if (this.positionsChanged(connection, startPos, endPos)) {
            this.schedulePathUpdate(connection, startPos, endPos);
        }
    }
    
    schedulePathUpdate(connection, startPos, endPos) {
        this.animationQueue.push({
            connection,
            startPos,
            endPos,
            timestamp: performance.now()
        });
        
        this.processAnimationQueue();
    }
    
    processAnimationQueue() {
        if (this.isAnimating || this.animationQueue.length === 0) return;
        
        this.isAnimating = true;
        
        requestAnimationFrame(() => {
            const batch = this.animationQueue.splice(0, 10); // 批量处理
            
            batch.forEach(({ connection, startPos, endPos }) => {
                this.animatePathTransition(connection, startPos, endPos);
            });
            
            this.isAnimating = false;
            
            if (this.animationQueue.length > 0) {
                this.processAnimationQueue();
            }
        });
    }
    
    animatePathTransition(connection, startPos, endPos) {
        const currentPath = connection.pathElement.getAttribute('d') || '';
        const targetPath = this.generateSmoothPath(startPos, endPos);
        
        if (currentPath && currentPath !== targetPath) {
            // 使用Web Animations API进行高性能动画
            connection.pathElement.animate([
                { d: currentPath },
                { d: targetPath }
            ], {
                duration: connection.options.animationDuration,
                easing: connection.options.easing,
                fill: 'forwards'
            }).addEventListener('finish', () => {
                connection.pathElement.setAttribute('d', targetPath);
                connection.lastStartPos = startPos;
                connection.lastEndPos = endPos;
            });
        } else {
            connection.pathElement.setAttribute('d', targetPath);
            connection.lastStartPos = startPos;
            connection.lastEndPos = endPos;
        }
    }
    
    generateSmoothPath(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 自适应控制点
        const controlOffset = Math.min(distance * 0.3, 100);
        const cp1x = start.x + controlOffset;
        const cp1y = start.y;
        const cp2x = end.x - controlOffset;
        const cp2y = end.y;
        
        return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
    }
    
    // 批量更新优化
    updateAllConnections() {
        const updates = [];
        
        this.connections.forEach((connection, id) => {
            const startPos = this.getElementCenter(connection.startElement);
            const endPos = this.getElementCenter(connection.endElement);
            
            if (this.positionsChanged(connection, startPos, endPos)) {
                updates.push({ connection, startPos, endPos });
            }
        });
        
        // 分批处理以避免阻塞
        this.processBatchUpdates(updates);
    }
    
    processBatchUpdates(updates, batchSize = 5) {
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            
            setTimeout(() => {
                batch.forEach(({ connection, startPos, endPos }) => {
                    this.animatePathTransition(connection, startPos, endPos);
                });
            }, (i / batchSize) * 16); // 分散到不同帧
        }
    }
}
```

### 性能监控与自动优化

```javascript
class SVGPerformanceOptimizer {
    constructor(connectionSystem) {
        this.connectionSystem = connectionSystem;
        this.performanceMetrics = {
            pathUpdatesPerSecond: 0,
            averageUpdateTime: 0,
            frameDrops: 0
        };
        
        this.optimizationStrategies = {
            REDUCE_ANIMATION_DURATION: (connection) => {
                connection.options.animationDuration *= 0.8;
            },
            SKIP_INTERMEDIATE_FRAMES: (connection) => {
                connection.skipFrames = true;
            },
            INCREASE_UPDATE_THRESHOLD: () => {
                this.connectionSystem.updateThreshold *= 1.2;
            }
        };
        
        this.startPerformanceMonitoring();
    }
    
    startPerformanceMonitoring() {
        let updateCount = 0;
        let totalUpdateTime = 0;
        
        setInterval(() => {
            const fps = this.measureFPS();
            
            if (fps < 50) {
                this.applyOptimizations();
            } else if (fps > 55) {
                this.relaxOptimizations();
            }
            
            updateCount = 0;
            totalUpdateTime = 0;
        }, 1000);
    }
    
    applyOptimizations() {
        console.log('Applying SVG performance optimizations...');
        
        // 1. 减少动画时长
        this.connectionSystem.connections.forEach(connection => {
            this.optimizationStrategies.REDUCE_ANIMATION_DURATION(connection);
        });
        
        // 2. 提高更新阈值
        this.optimizationStrategies.INCREASE_UPDATE_THRESHOLD();
        
        // 3. 启用更激进的批量处理
        this.connectionSystem.batchSize = Math.max(this.connectionSystem.batchSize - 1, 3);
    }
}
```

## 总结

通过以上分析和优化策略，可以显著提升大量DOM元素场景下的动画性能：

1. **requestAnimationFrame同步**: 确保与浏览器渲染管线完美对齐
2. **自适应帧率**: 根据显示器刷新率调整性能策略
3. **虚拟滚动**: 只渲染可视区域元素，大幅减少DOM操作
4. **对象池**: 复用对象减少GC压力
5. **批量更新**: 避免布局抖动，提高渲染效率
6. **智能优化**: 根据实时性能指标自动调整策略

这些优化技术可以使2000+元素的滚动场景保持60fps的流畅性能。