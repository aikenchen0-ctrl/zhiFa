/**
 * DOM节点池化管理器 - 专为高频DOM操作优化
 * 
 * 核心优化原理：
 * 1. 对象池模式：预创建DOM元素避免运行时开销
 * 2. 分层池管理：不同类型元素使用不同池策略
 * 3. 智能回收：基于使用频率和内存压力自动回收
 * 4. 惰性清理：延迟销毁减少GC压力
 * 5. 内存监控：实时监控内存使用并自动优化
 */

export interface PoolConfig {
  initialSize: number; // 初始池大小
  maxSize: number; // 最大池大小
  growthFactor: number; // 增长因子
  shrinkThreshold: number; // 收缩阈值（使用率）
  maxIdleTime: number; // 最大闲置时间（毫秒）
  enableAutoGC: boolean; // 自动垃圾回收
  enableMemoryMonitoring: boolean; // 内存监控
}

export interface PooledElement {
  element: HTMLElement;
  id: string;
  type: string;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
  poolIndex: number;
}

export interface PoolStats {
  type: string;
  totalElements: number;
  inUse: number;
  available: number;
  usageRate: number;
  hitRate: number;
  memoryUsage: number; // 估计内存使用（字节）
  lastGC: number;
}

export class DOMPool {
  private config: PoolConfig;
  private elements: PooledElement[] = [];
  private availableIndices: number[] = [];
  private createElement: () => HTMLElement;
  private setupElement: (element: HTMLElement, data?: any) => void;
  private cleanupElement: (element: HTMLElement) => void;
  
  // 性能统计
  private stats = {
    requests: 0,
    hits: 0,
    misses: 0,
    lastGC: 0
  };
  
  // 内存监控
  private memoryUsage = 0;
  private estimatedElementSize = 0;
  
  constructor(
    type: string,
    createElement: () => HTMLElement,
    setupElement: (element: HTMLElement, data?: any) => void,
    cleanupElement: (element: HTMLElement) => void,
    config: Partial<PoolConfig> = {}
  ) {
    this.createElement = createElement;
    this.setupElement = setupElement;
    this.cleanupElement = cleanupElement;
    
    this.config = {
      initialSize: 20,
      maxSize: 100,
      growthFactor: 1.5,
      shrinkThreshold: 0.3,
      maxIdleTime: 30000, // 30秒
      enableAutoGC: true,
      enableMemoryMonitoring: true,
      ...config
    };
    
    this.initialize();
    
    if (this.config.enableAutoGC) {
      this.startAutoGC();
    }
    
    console.log(`🏊‍♂️ ${type}池初始化完成 - 初始大小:${this.config.initialSize}`);
  }
  
  /**
   * 初始化池
   */
  private initialize(): void {
    // 创建初始元素
    for (let i = 0; i < this.config.initialSize; i++) {
      this.createPooledElement();
    }
    
    // 估算单个元素内存占用
    this.estimateElementSize();
  }
  
  /**
   * 估算元素内存大小
   */
  private estimateElementSize(): void {
    if (this.elements.length > 0) {
      const element = this.elements[0].element;
      
      // 估算DOM元素的内存占用
      const htmlSize = element.outerHTML.length * 2; // 假设UTF-16编码
      const styleSize = element.style.cssText.length * 2;
      const baseSize = 200; // DOM节点基础开销估算
      
      this.estimatedElementSize = htmlSize + styleSize + baseSize;
      this.updateMemoryUsage();
    }
  }
  
  /**
   * 更新内存使用统计
   */
  private updateMemoryUsage(): void {
    this.memoryUsage = this.elements.length * this.estimatedElementSize;
  }
  
  /**
   * 创建池化元素
   */
  private createPooledElement(): PooledElement {
    const element = this.createElement();
    const pooledElement: PooledElement = {
      element,
      id: `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.constructor.name,
      inUse: false,
      createdAt: Date.now(),
      lastUsed: 0,
      usageCount: 0,
      poolIndex: this.elements.length
    };
    
    // 隐藏元素
    element.style.display = 'none';
    element.setAttribute('data-pool-id', pooledElement.id);
    
    this.elements.push(pooledElement);
    this.availableIndices.push(pooledElement.poolIndex);
    this.updateMemoryUsage();
    
    return pooledElement;
  }
  
  /**
   * 获取元素
   */
  acquire(data?: any): HTMLElement | null {
    this.stats.requests++;
    
    // 尝试从可用元素中获取
    const availableIndex = this.availableIndices.pop();
    
    if (availableIndex !== undefined && availableIndex < this.elements.length) {
      const pooledElement = this.elements[availableIndex];
      
      if (pooledElement && !pooledElement.inUse) {
        // 标记为使用中
        pooledElement.inUse = true;
        pooledElement.lastUsed = Date.now();
        pooledElement.usageCount++;
        
        // 设置元素
        this.setupElement(pooledElement.element, data);
        pooledElement.element.style.display = '';
        
        this.stats.hits++;
        return pooledElement.element;
      }
    }
    
    // 池中没有可用元素，尝试扩展池
    if (this.elements.length < this.config.maxSize) {
      const pooledElement = this.createPooledElement();
      pooledElement.inUse = true;
      pooledElement.lastUsed = Date.now();
      pooledElement.usageCount++;
      
      this.setupElement(pooledElement.element, data);
      pooledElement.element.style.display = '';
      
      this.stats.misses++;
      
      console.log(`📈 池扩展 - 当前大小:${this.elements.length}`);
      return pooledElement.element;
    }
    
    // 池已满，无法获取元素
    this.stats.misses++;
    console.warn('⚠️ 池已满，无法获取元素');
    return null;
  }
  
  /**
   * 释放元素
   */
  release(element: HTMLElement): boolean {
    const poolId = element.getAttribute('data-pool-id');
    if (!poolId) {
      return false;
    }
    
    const pooledElement = this.elements.find(pe => pe.id === poolId);
    if (!pooledElement || !pooledElement.inUse) {
      return false;
    }
    
    // 清理元素
    this.cleanupElement(pooledElement.element);
    pooledElement.element.style.display = 'none';
    
    // 标记为可用
    pooledElement.inUse = false;
    this.availableIndices.push(pooledElement.poolIndex);
    
    return true;
  }
  
  /**
   * 开始自动垃圾回收
   */
  private startAutoGC(): void {
    const gcInterval = 10000; // 10秒检查一次
    
    setInterval(() => {
      this.performGarbageCollection();
    }, gcInterval);
  }
  
  /**
   * 执行垃圾回收
   */
  private performGarbageCollection(): void {
    const now = Date.now();
    const elementsToRemove: number[] = [];
    
    // 查找需要清理的元素
    this.elements.forEach((pooledElement, index) => {
      if (!pooledElement.inUse) {
        const idleTime = now - pooledElement.lastUsed;
        
        // 超过最大闲置时间且池大小超过初始大小
        if (idleTime > this.config.maxIdleTime && this.elements.length > this.config.initialSize) {
          elementsToRemove.push(index);
        }
      }
    });
    
    // 检查是否需要收缩池
    const usageRate = this.getUsageRate();
    const shouldShrink = usageRate < this.config.shrinkThreshold && 
                        this.elements.length > this.config.initialSize;
    
    if (shouldShrink && elementsToRemove.length === 0) {
      // 找到一些未使用的元素进行收缩
      const targetSize = Math.max(this.config.initialSize, Math.floor(this.elements.length * 0.8));
      const toRemove = this.elements.length - targetSize;
      
      let removed = 0;
      for (let i = this.elements.length - 1; i >= 0 && removed < toRemove; i--) {
        if (!this.elements[i].inUse) {
          elementsToRemove.push(i);
          removed++;
        }
      }
    }
    
    // 执行清理
    if (elementsToRemove.length > 0) {
      this.removeElements(elementsToRemove);
      this.stats.lastGC = now;
      
      console.log(`🧹 池GC完成 - 清理${elementsToRemove.length}个元素，当前大小:${this.elements.length}`);
    }
  }
  
  /**
   * 移除元素
   */
  private removeElements(indices: number[]): void {
    // 按索引倒序排序，从后往前删除
    indices.sort((a, b) => b - a);
    
    indices.forEach(index => {
      if (index >= 0 && index < this.elements.length) {
        const pooledElement = this.elements[index];
        
        // 从DOM中移除
        if (pooledElement.element.parentNode) {
          pooledElement.element.parentNode.removeChild(pooledElement.element);
        }
        
        // 从可用索引中移除
        const availableIndex = this.availableIndices.indexOf(index);
        if (availableIndex > -1) {
          this.availableIndices.splice(availableIndex, 1);
        }
        
        // 从元素数组中移除
        this.elements.splice(index, 1);
        
        // 更新后续元素的索引
        for (let i = index; i < this.elements.length; i++) {
          this.elements[i].poolIndex = i;
          
          // 更新可用索引数组
          const avIdx = this.availableIndices.indexOf(i + 1);
          if (avIdx > -1) {
            this.availableIndices[avIdx] = i;
          }
        }
      }
    });
    
    this.updateMemoryUsage();
  }
  
  /**
   * 获取使用率
   */
  private getUsageRate(): number {
    const inUseCount = this.elements.filter(pe => pe.inUse).length;
    return this.elements.length > 0 ? inUseCount / this.elements.length : 0;
  }
  
  /**
   * 获取池统计信息
   */
  getStats(): PoolStats {
    const inUseCount = this.elements.filter(pe => pe.inUse).length;
    const hitRate = this.stats.requests > 0 ? 
      (this.stats.hits / this.stats.requests) * 100 : 0;
    
    return {
      type: this.constructor.name,
      totalElements: this.elements.length,
      inUse: inUseCount,
      available: this.elements.length - inUseCount,
      usageRate: this.getUsageRate() * 100,
      hitRate,
      memoryUsage: this.memoryUsage,
      lastGC: this.stats.lastGC
    };
  }
  
  /**
   * 强制垃圾回收
   */
  forceGC(): void {
    this.performGarbageCollection();
  }
  
  /**
   * 清空池
   */
  clear(): void {
    this.elements.forEach(pooledElement => {
      if (pooledElement.element.parentNode) {
        pooledElement.element.parentNode.removeChild(pooledElement.element);
      }
    });
    
    this.elements.length = 0;
    this.availableIndices.length = 0;
    this.updateMemoryUsage();
    
    console.log('🧹 池已清空');
  }
  
  /**
   * 预热池（提前创建元素）
   */
  warmUp(size: number): void {
    const targetSize = Math.min(size, this.config.maxSize);
    const elementsToCreate = targetSize - this.elements.length;
    
    for (let i = 0; i < elementsToCreate; i++) {
      this.createPooledElement();
    }
    
    console.log(`🔥 池预热完成 - 目标大小:${targetSize}, 当前大小:${this.elements.length}`);
  }
}

/**
 * DOM池管理器 - 统一管理多个池
 */
export class DOMPoolManager {
  private pools = new Map<string, DOMPool>();
  private globalConfig: Partial<PoolConfig>;
  private memoryPressureThreshold = 50 * 1024 * 1024; // 50MB
  private isMonitoring = false;
  
  // 全局统计
  private globalStats = {
    totalRequests: 0,
    totalHits: 0,
    totalMemoryUsage: 0,
    lastGlobalGC: 0
  };
  
  constructor(config: Partial<PoolConfig> = {}) {
    this.globalConfig = config;
    
    // 启动内存监控
    if (config.enableMemoryMonitoring !== false) {
      this.startMemoryMonitoring();
    }
    
    console.log('🎱 DOM池管理器初始化完成');
  }
  
  /**
   * 创建头像元素池
   */
  createAvatarPool(config?: Partial<PoolConfig>): void {
    const createElement = (): HTMLElement => {
      const avatar = document.createElement('div');
      avatar.className = 'pooled-avatar absolute';
      avatar.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium shadow-lg">
          <span class="avatar-initial text-sm"></span>
        </div>
      `;
      return avatar;
    };
    
    const setupElement = (element: HTMLElement, data?: any): void => {
      if (data) {
        const initial = element.querySelector('.avatar-initial') as HTMLElement;
        if (initial && data.name) {
          initial.textContent = data.name.charAt(0).toUpperCase();
        }
        
        if (data.color) {
          const avatarDiv = element.querySelector('div') as HTMLElement;
          avatarDiv.style.background = data.color;
        }
        
        if (data.position) {
          element.style.left = data.position.x + 'px';
          element.style.top = data.position.y + 'px';
        }
      }
    };
    
    const cleanupElement = (element: HTMLElement): void => {
      const initial = element.querySelector('.avatar-initial') as HTMLElement;
      if (initial) initial.textContent = '';
      
      const avatarDiv = element.querySelector('div') as HTMLElement;
      if (avatarDiv) {
        avatarDiv.style.background = '';
      }
      
      element.style.left = '';
      element.style.top = '';
      element.style.transform = '';
    };
    
    const poolConfig = { ...this.globalConfig, ...config };
    const pool = new DOMPool('Avatar', createElement, setupElement, cleanupElement, poolConfig);
    
    this.pools.set('avatar', pool);
  }
  
  /**
   * 创建消息气泡元素池
   */
  createMessagePool(config?: Partial<PoolConfig>): void {
    const createElement = (): HTMLElement => {
      const message = document.createElement('div');
      message.className = 'pooled-message absolute w-full px-4 py-2';
      message.innerHTML = `
        <div class="message-bubble max-w-xs lg:max-w-md rounded-lg p-3 shadow-sm">
          <div class="message-content text-sm whitespace-pre-wrap"></div>
          <div class="message-time text-xs opacity-70 mt-1"></div>
        </div>
      `;
      return message;
    };
    
    const setupElement = (element: HTMLElement, data?: any): void => {
      if (data) {
        const content = element.querySelector('.message-content') as HTMLElement;
        const time = element.querySelector('.message-time') as HTMLElement;
        const bubble = element.querySelector('.message-bubble') as HTMLElement;
        
        if (content) content.textContent = data.content || '';
        if (time) time.textContent = data.time || '';
        
        // 设置消息样式
        if (bubble) {
          const isOwn = data.type === 'self';
          bubble.className = `message-bubble max-w-xs lg:max-w-md rounded-lg p-3 shadow-sm ${
            isOwn 
              ? 'bg-blue-500 text-white ml-auto' 
              : 'bg-white text-gray-900'
          }`;
        }
        
        if (data.position) {
          element.style.top = data.position.y + 'px';
        }
      }
    };
    
    const cleanupElement = (element: HTMLElement): void => {
      const content = element.querySelector('.message-content') as HTMLElement;
      const time = element.querySelector('.message-time') as HTMLElement;
      
      if (content) content.textContent = '';
      if (time) time.textContent = '';
      
      element.style.top = '';
      element.style.transform = '';
      
      // 重置样式
      const bubble = element.querySelector('.message-bubble') as HTMLElement;
      if (bubble) {
        bubble.className = 'message-bubble max-w-xs lg:max-w-md rounded-lg p-3 shadow-sm bg-white text-gray-900';
      }
    };
    
    const poolConfig = { ...this.globalConfig, ...config };
    const pool = new DOMPool('Message', createElement, setupElement, cleanupElement, poolConfig);
    
    this.pools.set('message', pool);
  }
  
  /**
   * 创建连接线元素池
   */
  createConnectionPool(config?: Partial<PoolConfig>): void {
    const createElement = (): HTMLElement => {
      // 创建一个包装SVG的div元素
      const wrapper = document.createElement('div');
      wrapper.className = 'pooled-connection absolute pointer-events-none';
      wrapper.style.zIndex = '10';
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'connection-svg');
      svg.style.position = 'absolute';
      svg.style.overflow = 'visible';
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke', 'rgba(59, 130, 246, 0.6)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      
      svg.appendChild(path);
      wrapper.appendChild(svg);
      
      return wrapper;
    };
    
    const setupElement = (element: HTMLElement, data?: any): void => {
      if (data) {
        const svg = element.querySelector('svg') as SVGElement;
        const path = element.querySelector('path') as SVGPathElement;
        
        if (data.path && path) {
          path.setAttribute('d', data.path);
        }
        
        if (data.color && path) {
          path.setAttribute('stroke', data.color);
        }
        
        if (data.strokeWidth && path) {
          path.setAttribute('stroke-width', data.strokeWidth.toString());
        }
        
        if (data.bounds) {
          svg.setAttribute('width', data.bounds.width.toString());
          svg.setAttribute('height', data.bounds.height.toString());
          element.style.left = data.bounds.x + 'px';
          element.style.top = data.bounds.y + 'px';
        }
      }
    };
    
    const cleanupElement = (element: HTMLElement): void => {
      const path = element.querySelector('path') as SVGPathElement;
      if (path) {
        path.setAttribute('d', '');
        path.setAttribute('stroke', 'rgba(59, 130, 246, 0.6)');
        path.setAttribute('stroke-width', '2');
      }
      
      element.style.left = '';
      element.style.top = '';
    };
    
    const poolConfig = { ...this.globalConfig, ...config };
    const pool = new DOMPool('Connection', createElement, setupElement, cleanupElement, poolConfig);
    
    this.pools.set('connection', pool);
  }
  
  /**
   * 获取元素
   */
  acquire(poolType: string, data?: any): HTMLElement | null {
    const pool = this.pools.get(poolType);
    if (!pool) {
      console.error(`❌ 未找到池类型: ${poolType}`);
      return null;
    }
    
    this.globalStats.totalRequests++;
    const element = pool.acquire(data);
    
    if (element) {
      this.globalStats.totalHits++;
    }
    
    return element;
  }
  
  /**
   * 释放元素
   */
  release(poolType: string, element: HTMLElement): boolean {
    const pool = this.pools.get(poolType);
    if (!pool) {
      return false;
    }
    
    return pool.release(element);
  }
  
  /**
   * 预热所有池
   */
  warmUpAllPools(sizes: Record<string, number> = {}): void {
    this.pools.forEach((pool, poolType) => {
      const size = sizes[poolType] || 20;
      pool.warmUp(size);
    });
    
    console.log('🔥 所有池预热完成');
  }
  
  /**
   * 启动内存监控
   */
  private startMemoryMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    const monitorInterval = 5000; // 5秒检查一次
    
    setInterval(() => {
      this.checkMemoryPressure();
    }, monitorInterval);
  }
  
  /**
   * 检查内存压力
   */
  private checkMemoryPressure(): void {
    let totalMemory = 0;
    
    this.pools.forEach(pool => {
      const stats = pool.getStats();
      totalMemory += stats.memoryUsage;
    });
    
    this.globalStats.totalMemoryUsage = totalMemory;
    
    // 如果内存使用超过阈值，执行全局GC
    if (totalMemory > this.memoryPressureThreshold) {
      console.warn(`🔥 内存压力检测 - 当前使用:${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
      this.performGlobalGC();
    }
  }
  
  /**
   * 执行全局垃圾回收
   */
  performGlobalGC(): void {
    console.log('🧹 执行全局GC...');
    
    this.pools.forEach((pool, poolType) => {
      pool.forceGC();
    });
    
    this.globalStats.lastGlobalGC = Date.now();
    
    // 触发浏览器GC（如果可用）
    if (window.gc) {
      window.gc();
    }
    
    console.log('✅ 全局GC完成');
  }
  
  /**
   * 获取所有池的统计信息
   */
  getAllStats(): {
    pools: Record<string, PoolStats>;
    global: typeof this.globalStats;
  } {
    const poolStats: Record<string, PoolStats> = {};
    
    this.pools.forEach((pool, poolType) => {
      poolStats[poolType] = pool.getStats();
    });
    
    return {
      pools: poolStats,
      global: this.globalStats
    };
  }
  
  /**
   * 输出性能报告
   */
  printPerformanceReport(): void {
    console.log('📊 DOM池管理器性能报告');
    console.log('================================');
    
    const stats = this.getAllStats();
    
    // 全局统计
    const globalHitRate = stats.global.totalRequests > 0 
      ? (stats.global.totalHits / stats.global.totalRequests * 100).toFixed(1)
      : '0';
      
    console.log(`全局统计:`);
    console.log(`  请求总数: ${stats.global.totalRequests}`);
    console.log(`  命中率: ${globalHitRate}%`);
    console.log(`  总内存使用: ${(stats.global.totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  上次GC: ${stats.global.lastGlobalGC ? new Date(stats.global.lastGlobalGC).toLocaleTimeString() : '未执行'}`);
    console.log('');
    
    // 各池统计
    Object.entries(stats.pools).forEach(([poolType, poolStats]) => {
      console.log(`${poolType}池:`);
      console.log(`  元素总数: ${poolStats.totalElements}`);
      console.log(`  使用中: ${poolStats.inUse}`);
      console.log(`  可用: ${poolStats.available}`);
      console.log(`  使用率: ${poolStats.usageRate.toFixed(1)}%`);
      console.log(`  命中率: ${poolStats.hitRate.toFixed(1)}%`);
      console.log(`  内存使用: ${(poolStats.memoryUsage / 1024).toFixed(1)}KB`);
      console.log('');
    });
  }
  
  /**
   * 清理所有池
   */
  clearAllPools(): void {
    this.pools.forEach(pool => {
      pool.clear();
    });
    
    this.globalStats = {
      totalRequests: 0,
      totalHits: 0,
      totalMemoryUsage: 0,
      lastGlobalGC: 0
    };
    
    console.log('🧹 所有池已清理');
  }
  
  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clearAllPools();
    this.pools.clear();
    this.isMonitoring = false;
    
    console.log('🧹 DOM池管理器已销毁');
  }
}

// 全局实例
export const globalDOMPoolManager = new DOMPoolManager({
  enableAutoGC: true,
  enableMemoryMonitoring: true,
  maxIdleTime: 30000,
  initialSize: 20,
  maxSize: 100
});

// 初始化默认池
globalDOMPoolManager.createAvatarPool();
globalDOMPoolManager.createMessagePool();
globalDOMPoolManager.createConnectionPool();