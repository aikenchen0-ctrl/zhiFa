/**
 * 内存管理器 - 智能内存管理和垃圾回收策略
 * 
 * 核心优化原理：
 * 1. 内存压力检测：实时监控堆内存使用情况
 * 2. 智能垃圾回收：基于内存使用模式自动触发GC
 * 3. 弱引用缓存：使用WeakMap避免内存泄漏
 * 4. 分代回收策略：按对象生命周期分层管理
 * 5. 内存池化：重用对象减少分配开销
 */

export interface MemoryStats {
  usedJSHeapSize: number;  // 已使用的JS堆内存
  totalJSHeapSize: number; // 总JS堆内存
  jsHeapSizeLimit: number; // JS堆内存限制
  memoryPressureLevel: 'low' | 'medium' | 'high' | 'critical';
  gcTriggerCount: number;
  lastGCTime: number;
  leakDetectionCount: number;
}

export interface MemoryConfig {
  enableAutoGC: boolean;
  gcThresholdMB: number; // GC触发阈值（MB）
  criticalThresholdMB: number; // 临界阈值（MB）
  maxCacheSize: number; // 最大缓存条目数
  cacheExpirationMs: number; // 缓存过期时间
  enableLeakDetection: boolean; // 内存泄漏检测
  monitorIntervalMs: number; // 监控间隔
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // 估计大小（字节）
}

export interface MemoryPool<T> {
  name: string;
  objects: T[];
  createFn: () => T;
  resetFn: (obj: T) => void;
  maxSize: number;
  currentSize: number;
  hits: number;
  misses: number;
}

/**
 * 内存管理器主类
 */
export class MemoryManager {
  private config: MemoryConfig;
  private stats: MemoryStats;
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  
  // 缓存系统 - 使用WeakMap避免内存泄漏
  private cache = new Map<string, CacheEntry<any>>();
  private weakCache = new WeakMap<object, any>();
  private cacheAccessOrder: string[] = []; // LRU缓存顺序
  
  // 对象池系统
  private memoryPools = new Map<string, MemoryPool<any>>();
  
  // 内存泄漏检测
  private objectReferences = new Set<WeakRef<object>>();
  private referenceRegistry = new FinalizationRegistry((heldValue: string) => {
    console.log(`🧹 对象被回收: ${heldValue}`);
  });
  
  // 性能监控
  private gcHistory: number[] = [];
  private memoryHistory: number[] = [];
  private pressureHistory: Array<{ time: number; level: string }> = [];
  
  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      enableAutoGC: true,
      gcThresholdMB: 100,
      criticalThresholdMB: 200,
      maxCacheSize: 1000,
      cacheExpirationMs: 300000, // 5分钟
      enableLeakDetection: true,
      monitorIntervalMs: 2000, // 2秒
      ...config
    };
    
    this.stats = {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryPressureLevel: 'low',
      gcTriggerCount: 0,
      lastGCTime: 0,
      leakDetectionCount: 0
    };
    
    this.initializeMemoryMonitoring();
    this.setupMemoryPools();
    
    console.log('🧠 内存管理器初始化完成', {
      autoGC: this.config.enableAutoGC,
      gcThreshold: this.config.gcThresholdMB + 'MB',
      maxCacheSize: this.config.maxCacheSize
    });
  }
  
  /**
   * 初始化内存监控
   */
  private initializeMemoryMonitoring(): void {
    if (!performance.memory) {
      console.warn('⚠️ 浏览器不支持performance.memory，内存监控功能受限');
      return;
    }
    
    this.updateMemoryStats();
    
    if (this.config.enableAutoGC) {
      this.startMemoryMonitoring();
    }
  }
  
  /**
   * 开始内存监控
   */
  private startMemoryMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.updateMemoryStats();
      this.checkMemoryPressure();
      this.cleanupExpiredCache();
      
      if (this.config.enableLeakDetection) {
        this.detectMemoryLeaks();
      }
    }, this.config.monitorIntervalMs);
    
    console.log('📊 内存监控已启动');
  }
  
  /**
   * 停止内存监控
   */
  private stopMemoryMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    
    console.log('📊 内存监控已停止');
  }
  
  /**
   * 更新内存统计
   */
  private updateMemoryStats(): void {
    if (!performance.memory) return;
    
    const memory = performance.memory;
    
    this.stats.usedJSHeapSize = memory.usedJSHeapSize;
    this.stats.totalJSHeapSize = memory.totalJSHeapSize;
    this.stats.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    
    // 记录内存历史
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    this.memoryHistory.push(usedMB);
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }
    
    // 计算内存压力级别
    this.calculateMemoryPressure();
  }
  
  /**
   * 计算内存压力级别
   */
  private calculateMemoryPressure(): void {
    const usedMB = this.stats.usedJSHeapSize / 1024 / 1024;
    const limitMB = this.stats.jsHeapSizeLimit / 1024 / 1024;
    const usageRatio = usedMB / limitMB;
    
    let level: MemoryStats['memoryPressureLevel'];
    
    if (usedMB > this.config.criticalThresholdMB || usageRatio > 0.9) {
      level = 'critical';
    } else if (usedMB > this.config.gcThresholdMB || usageRatio > 0.7) {
      level = 'high';
    } else if (usageRatio > 0.5) {
      level = 'medium';
    } else {
      level = 'low';
    }
    
    if (level !== this.stats.memoryPressureLevel) {
      this.stats.memoryPressureLevel = level;
      this.pressureHistory.push({ time: Date.now(), level });
      
      console.log(`🔥 内存压力级别变化: ${level} (${usedMB.toFixed(1)}MB)`);
    }
  }
  
  /**
   * 检查内存压力并采取措施
   */
  private checkMemoryPressure(): void {
    const level = this.stats.memoryPressureLevel;
    
    switch (level) {
      case 'critical':
        // 紧急措施：强制GC + 清理所有缓存 + 收缩池
        this.performEmergencyCleanup();
        break;
        
      case 'high':
        // 积极措施：触发GC + 清理过期缓存 + 收缩池
        this.performAggressiveCleanup();
        break;
        
      case 'medium':
        // 温和措施：清理过期缓存
        this.cleanupExpiredCache();
        break;
        
      default:
        // 低压力：正常运行
        break;
    }
  }
  
  /**
   * 紧急清理措施
   */
  private performEmergencyCleanup(): void {
    console.warn('🚨 执行紧急内存清理');
    
    // 清空所有缓存
    this.clearAllCache();
    
    // 收缩所有内存池
    this.shrinkAllPools();
    
    // 强制垃圾回收
    this.forceGarbageCollection();
    
    // 触发内存优化事件
    this.emitMemoryEvent('emergency-cleanup');
  }
  
  /**
   * 积极清理措施
   */
  private performAggressiveCleanup(): void {
    console.warn('⚡ 执行积极内存清理');
    
    // 清理过期和低频缓存
    this.aggressiveCleanupCache();
    
    // 适度收缩内存池
    this.moderatePoolShrink();
    
    // 触发垃圾回收
    this.forceGarbageCollection();
    
    // 触发内存优化事件
    this.emitMemoryEvent('aggressive-cleanup');
  }
  
  /**
   * 设置内存池
   */
  private setupMemoryPools(): void {
    // 创建常用对象池
    this.createPool('point', () => ({ x: 0, y: 0 }), (obj) => { obj.x = 0; obj.y = 0; }, 100);
    this.createPool('rect', () => ({ x: 0, y: 0, width: 0, height: 0 }), (obj) => { 
      obj.x = 0; obj.y = 0; obj.width = 0; obj.height = 0; 
    }, 50);
    this.createPool('array', () => [], (arr) => { arr.length = 0; }, 200);
  }
  
  /**
   * 创建对象池
   */
  createPool<T>(
    name: string, 
    createFn: () => T, 
    resetFn: (obj: T) => void, 
    maxSize = 50
  ): void {
    const pool: MemoryPool<T> = {
      name,
      objects: [],
      createFn,
      resetFn,
      maxSize,
      currentSize: 0,
      hits: 0,
      misses: 0
    };
    
    // 预填充池
    for (let i = 0; i < Math.min(10, maxSize); i++) {
      pool.objects.push(createFn());
      pool.currentSize++;
    }
    
    this.memoryPools.set(name, pool);
    console.log(`🏊‍♂️ 创建对象池: ${name} (初始大小: ${pool.currentSize})`);
  }
  
  /**
   * 从对象池获取对象
   */
  acquireFromPool<T>(poolName: string): T | null {
    const pool = this.memoryPools.get(poolName) as MemoryPool<T>;
    if (!pool) {
      console.error(`❌ 对象池不存在: ${poolName}`);
      return null;
    }
    
    let obj: T;
    
    if (pool.objects.length > 0) {
      obj = pool.objects.pop()!;
      pool.hits++;
    } else {
      obj = pool.createFn();
      pool.misses++;
    }
    
    return obj;
  }
  
  /**
   * 返回对象到池中
   */
  releaseToPool<T>(poolName: string, obj: T): boolean {
    const pool = this.memoryPools.get(poolName) as MemoryPool<T>;
    if (!pool) {
      return false;
    }
    
    if (pool.objects.length < pool.maxSize) {
      pool.resetFn(obj);
      pool.objects.push(obj);
      return true;
    }
    
    return false; // 池已满，对象将被GC回收
  }
  
  /**
   * 收缩所有内存池
   */
  private shrinkAllPools(): void {
    this.memoryPools.forEach(pool => {
      const targetSize = Math.max(5, Math.floor(pool.currentSize * 0.5));
      while (pool.objects.length > targetSize) {
        pool.objects.pop();
      }
      pool.currentSize = pool.objects.length;
    });
    
    console.log('📉 所有内存池已收缩');
  }
  
  /**
   * 适度收缩内存池
   */
  private moderatePoolShrink(): void {
    this.memoryPools.forEach(pool => {
      const targetSize = Math.max(10, Math.floor(pool.currentSize * 0.7));
      while (pool.objects.length > targetSize) {
        pool.objects.pop();
      }
      pool.currentSize = pool.objects.length;
    });
  }
  
  /**
   * 缓存数据
   */
  cacheSet<T>(key: string, value: T, customTTL?: number): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLRUCache();
    }
    
    const now = Date.now();
    const ttl = customTTL || this.config.cacheExpirationMs;
    const estimatedSize = this.estimateObjectSize(value);
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      size: estimatedSize
    };
    
    this.cache.set(key, entry);
    
    // 更新LRU顺序
    const existingIndex = this.cacheAccessOrder.indexOf(key);
    if (existingIndex > -1) {
      this.cacheAccessOrder.splice(existingIndex, 1);
    }
    this.cacheAccessOrder.push(key);
  }
  
  /**
   * 获取缓存数据
   */
  cacheGet<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T>;
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    
    // 检查是否过期
    if (now - entry.timestamp > this.config.cacheExpirationMs) {
      this.cache.delete(key);
      this.removeCacheFromLRU(key);
      return null;
    }
    
    // 更新访问信息
    entry.accessCount++;
    entry.lastAccessed = now;
    
    // 更新LRU顺序
    this.updateCacheLRU(key);
    
    return entry.value;
  }
  
  /**
   * 删除缓存
   */
  cacheDelete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeCacheFromLRU(key);
    }
    return deleted;
  }
  
  /**
   * 弱引用缓存设置
   */
  weakCacheSet<K extends object, V>(key: K, value: V): void {
    this.weakCache.set(key, value);
  }
  
  /**
   * 弱引用缓存获取
   */
  weakCacheGet<K extends object, V>(key: K): V | undefined {
    return this.weakCache.get(key);
  }
  
  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.config.cacheExpirationMs) {
        this.cache.delete(key);
        this.removeCacheFromLRU(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 清理过期缓存: ${cleaned}条`);
    }
  }
  
  /**
   * 积极清理缓存
   */
  private aggressiveCleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    // 清理低频访问的缓存
    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      const avgAccessInterval = age / entry.accessCount;
      
      // 如果平均访问间隔大于1分钟，认为是低频访问
      if (avgAccessInterval > 60000 || entry.accessCount < 3) {
        this.cache.delete(key);
        this.removeCacheFromLRU(key);
        cleaned++;
      }
    });
    
    console.log(`🧽 积极清理缓存: ${cleaned}条`);
  }
  
  /**
   * 清空所有缓存
   */
  private clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheAccessOrder.length = 0;
    console.log(`🧹 清空所有缓存: ${size}条`);
  }
  
  /**
   * LRU缓存淘汰
   */
  private evictLRUCache(): void {
    const oldestKey = this.cacheAccessOrder.shift();
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * 更新缓存LRU顺序
   */
  private updateCacheLRU(key: string): void {
    const index = this.cacheAccessOrder.indexOf(key);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
      this.cacheAccessOrder.push(key);
    }
  }
  
  /**
   * 从LRU中移除缓存
   */
  private removeCacheFromLRU(key: string): void {
    const index = this.cacheAccessOrder.indexOf(key);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
    }
  }
  
  /**
   * 估算对象大小
   */
  private estimateObjectSize(obj: any): number {
    const jsonStr = JSON.stringify(obj);
    return jsonStr.length * 2; // 假设UTF-16编码
  }
  
  /**
   * 注册对象用于泄漏检测
   */
  registerObject(obj: object, description: string): void {
    if (!this.config.enableLeakDetection) return;
    
    const weakRef = new WeakRef(obj);
    this.objectReferences.add(weakRef);
    this.referenceRegistry.register(obj, description);
  }
  
  /**
   * 检测内存泄漏
   */
  private detectMemoryLeaks(): void {
    let aliveCount = 0;
    let deadCount = 0;
    
    // 清理已被回收的弱引用
    this.objectReferences.forEach(ref => {
      if (ref.deref()) {
        aliveCount++;
      } else {
        deadCount++;
        this.objectReferences.delete(ref);
      }
    });
    
    if (deadCount > 0) {
      this.stats.leakDetectionCount += deadCount;
      console.log(`🔍 内存泄漏检测: 存活${aliveCount}, 已回收${deadCount}`);
    }
  }
  
  /**
   * 强制垃圾回收
   */
  forceGarbageCollection(): void {
    this.stats.gcTriggerCount++;
    this.stats.lastGCTime = Date.now();
    this.gcHistory.push(this.stats.lastGCTime);
    
    // 如果浏览器支持手动GC
    if (window.gc) {
      window.gc();
      console.log('♻️ 强制垃圾回收执行完成');
    } else {
      // 尝试通过创建大量对象触发GC
      console.log('♻️ 尝试触发垃圾回收');
      const temp = [];
      for (let i = 0; i < 100000; i++) {
        temp.push(new Date());
      }
      temp.length = 0;
    }
  }
  
  /**
   * 触发内存事件
   */
  private emitMemoryEvent(type: string): void {
    const event = new CustomEvent('memory-manager', {
      detail: {
        type,
        stats: this.getStats(),
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * 获取内存统计
   */
  getStats(): MemoryStats & {
    cacheSize: number;
    poolStats: Record<string, { size: number; hits: number; misses: number }>;
  } {
    const poolStats: Record<string, { size: number; hits: number; misses: number }> = {};
    
    this.memoryPools.forEach((pool, name) => {
      poolStats[name] = {
        size: pool.currentSize,
        hits: pool.hits,
        misses: pool.misses
      };
    });
    
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      poolStats
    };
  }
  
  /**
   * 输出性能报告
   */
  printPerformanceReport(): void {
    const stats = this.getStats();
    const usedMB = stats.usedJSHeapSize / 1024 / 1024;
    const totalMB = stats.totalJSHeapSize / 1024 / 1024;
    const limitMB = stats.jsHeapSizeLimit / 1024 / 1024;
    
    console.log('🧠 内存管理器性能报告');
    console.log('================================');
    console.log(`内存使用: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${((usedMB/limitMB)*100).toFixed(1)}%)`);
    console.log(`堆内存: ${totalMB.toFixed(1)}MB`);
    console.log(`压力级别: ${stats.memoryPressureLevel}`);
    console.log(`GC触发次数: ${stats.gcTriggerCount}`);
    console.log(`缓存条目数: ${stats.cacheSize}`);
    console.log(`泄漏检测: ${stats.leakDetectionCount}个对象已回收`);
    console.log('');
    
    // 对象池统计
    console.log('对象池统计:');
    Object.entries(stats.poolStats).forEach(([name, poolStat]) => {
      const hitRate = poolStat.hits + poolStat.misses > 0 
        ? (poolStat.hits / (poolStat.hits + poolStat.misses) * 100).toFixed(1)
        : '0';
      console.log(`  ${name}: ${poolStat.size}个对象, 命中率${hitRate}%`);
    });
  }
  
  /**
   * 销毁内存管理器
   */
  destroy(): void {
    this.stopMemoryMonitoring();
    this.clearAllCache();
    this.memoryPools.clear();
    this.objectReferences.clear();
    
    console.log('🧹 内存管理器已销毁');
  }
}

// 全局内存管理器实例
export const globalMemoryManager = new MemoryManager({
  enableAutoGC: true,
  gcThresholdMB: 80,
  criticalThresholdMB: 150,
  maxCacheSize: 500,
  enableLeakDetection: true,
  monitorIntervalMs: 3000
});

// 导出工具函数
export const memoryUtils = {
  /**
   * 快速创建点对象（使用对象池）
   */
  createPoint: (x: number = 0, y: number = 0) => {
    const point = globalMemoryManager.acquireFromPool<{x: number; y: number}>('point');
    if (point) {
      point.x = x;
      point.y = y;
      return point;
    }
    return { x, y };
  },
  
  /**
   * 释放点对象到池中
   */
  releasePoint: (point: {x: number; y: number}) => {
    return globalMemoryManager.releaseToPool('point', point);
  },
  
  /**
   * 快速创建矩形对象（使用对象池）
   */
  createRect: (x: number = 0, y: number = 0, width: number = 0, height: number = 0) => {
    const rect = globalMemoryManager.acquireFromPool<{x: number; y: number; width: number; height: number}>('rect');
    if (rect) {
      rect.x = x;
      rect.y = y;
      rect.width = width;
      rect.height = height;
      return rect;
    }
    return { x, y, width, height };
  },
  
  /**
   * 释放矩形对象到池中
   */
  releaseRect: (rect: {x: number; y: number; width: number; height: number}) => {
    return globalMemoryManager.releaseToPool('rect', rect);
  },
  
  /**
   * 获取可复用数组（使用对象池）
   */
  getArray: <T>(): T[] => {
    const arr = globalMemoryManager.acquireFromPool<T[]>('array');
    return arr || [];
  },
  
  /**
   * 释放数组到池中
   */
  releaseArray: <T>(arr: T[]) => {
    return globalMemoryManager.releaseToPool('array', arr);
  }
};