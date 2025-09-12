import { MemoryPoolConfig, PerformanceMetrics } from '../types';

interface PooledObject {
  id: string;
  inUse: boolean;
  data: any;
  createdAt: number;
  lastUsed: number;
}

interface MemoryPool<T> {
  available: T[];
  inUse: Set<T>;
  factory: () => T;
  reset: (obj: T) => void;
  maxSize: number;
}

/**
 * MemoryManager - 高效内存管理器
 * 提供对象池、垃圾回收优化、内存监控等功能
 */
export class MemoryManager {
  private pools: Map<string, MemoryPool<any>> = new Map();
  private references: Map<string, WeakRef<any>> = new Map();
  private registry = new FinalizationRegistry((heldValue: string) => {
    this.references.delete(heldValue);
  });
  private gcScheduled = false;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB
  private config: MemoryPoolConfig;

  constructor(config: Partial<MemoryPoolConfig> = {}) {
    this.config = {
      maxSize: 1000,
      initialSize: 50,
      growthFactor: 1.5,
      shrinkThreshold: 0.3,
      ...config
    };

    this.setupMemoryMonitoring();
    this.scheduleCleanup();
  }

  /**
   * 创建对象池
   */
  createPool<T>(
    name: string,
    factory: () => T,
    reset: (obj: T) => void,
    options: Partial<MemoryPoolConfig> = {}
  ): void {
    const poolConfig = { ...this.config, ...options };
    
    const pool: MemoryPool<T> = {
      available: [],
      inUse: new Set(),
      factory,
      reset,
      maxSize: poolConfig.maxSize
    };

    // 预创建初始对象
    for (let i = 0; i < poolConfig.initialSize; i++) {
      pool.available.push(factory());
    }

    this.pools.set(name, pool);
  }

  /**
   * 从对象池获取对象
   */
  acquire<T>(poolName: string): T | null {
    const pool = this.pools.get(poolName) as MemoryPool<T>;
    if (!pool) return null;

    let obj: T;

    if (pool.available.length > 0) {
      obj = pool.available.pop()!;
    } else if (pool.inUse.size < pool.maxSize) {
      obj = pool.factory();
    } else {
      // 池已满，触发清理
      this.forceCleanup(poolName);
      return null;
    }

    pool.inUse.add(obj);
    return obj;
  }

  /**
   * 将对象返回到池中
   */
  release<T>(poolName: string, obj: T): void {
    const pool = this.pools.get(poolName) as MemoryPool<T>;
    if (!pool || !pool.inUse.has(obj)) return;

    pool.inUse.delete(obj);
    pool.reset(obj);
    
    if (pool.available.length < pool.maxSize * this.config.shrinkThreshold) {
      pool.available.push(obj);
    }
    // 否则让对象被垃圾回收
  }

  /**
   * 创建弱引用缓存
   */
  setWeakReference(key: string, value: any): void {
    this.references.set(key, new WeakRef(value));
    this.registry.register(value, key);
  }

  /**
   * 获取弱引用对象
   */
  getWeakReference(key: string): any | null {
    const ref = this.references.get(key);
    if (!ref) return null;

    const value = ref.deref();
    if (!value) {
      this.references.delete(key);
      return null;
    }

    return value;
  }

  /**
   * 强制垃圾回收（在支持的环境中）
   */
  forceGC(): Promise<void> {
    return new Promise((resolve) => {
      if ('gc' in globalThis && typeof (globalThis as any).gc === 'function') {
        (globalThis as any).gc();
      }
      
      // 模拟GC延迟
      setTimeout(resolve, 10);
    });
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): {
    used: number;
    total: number;
    pools: Record<string, { available: number; inUse: number }>;
    weakRefs: number;
  } {
    const poolStats: Record<string, { available: number; inUse: number }> = {};
    
    this.pools.forEach((pool, name) => {
      poolStats[name] = {
        available: pool.available.length,
        inUse: pool.inUse.size
      };
    });

    // 尝试获取真实内存使用情况
    let memoryInfo = { used: 0, total: 0 };
    if ('memory' in performance && (performance as any).memory) {
      const perfMemory = (performance as any).memory;
      memoryInfo = {
        used: perfMemory.usedJSHeapSize,
        total: perfMemory.totalJSHeapSize
      };
    }

    return {
      ...memoryInfo,
      pools: poolStats,
      weakRefs: this.references.size
    };
  }

  /**
   * 内存压力检测
   */
  private checkMemoryPressure(): boolean {
    if ('memory' in performance && (performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      return memoryInfo.usedJSHeapSize > this.memoryThreshold;
    }
    
    // 基于对象池使用率判断
    let totalUsage = 0;
    let totalCapacity = 0;
    
    this.pools.forEach((pool) => {
      totalUsage += pool.inUse.size;
      totalCapacity += pool.maxSize;
    });

    return totalUsage / totalCapacity > 0.8;
  }

  /**
   * 自动清理不活跃的对象
   */
  private scheduleCleanup(): void {
    const cleanup = () => {
      if (this.checkMemoryPressure()) {
        this.performCleanup();
      }

      // 清理过期的弱引用
      this.cleanupWeakReferences();

      setTimeout(cleanup, 5000); // 每5秒检查一次
    };

    setTimeout(cleanup, 5000);
  }

  /**
   * 执行内存清理
   */
  private performCleanup(): void {
    this.pools.forEach((pool, name) => {
      const targetSize = Math.floor(pool.available.length * this.config.shrinkThreshold);
      while (pool.available.length > targetSize) {
        pool.available.pop();
      }
    });

    // 建议进行垃圾回收
    if (!this.gcScheduled) {
      this.gcScheduled = true;
      setTimeout(() => {
        this.forceGC().then(() => {
          this.gcScheduled = false;
        });
      }, 100);
    }
  }

  /**
   * 强制清理特定池
   */
  private forceCleanup(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    // 清空可用对象列表
    pool.available = [];
    
    // 尝试释放一些正在使用的对象（如果可能）
    const oldestItems = Array.from(pool.inUse).slice(0, Math.floor(pool.inUse.size * 0.1));
    oldestItems.forEach(item => {
      pool.inUse.delete(item);
    });
  }

  /**
   * 清理过期的弱引用
   */
  private cleanupWeakReferences(): void {
    const keysToDelete: string[] = [];
    
    this.references.forEach((ref, key) => {
      if (!ref.deref()) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.references.delete(key);
    });
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring(): void {
    // 监听内存警告事件（如果支持）
    if ('navigator' in globalThis && 'storage' in navigator && (navigator as any).deviceMemory) {
      const deviceMemory = (navigator as any).deviceMemory;
      this.memoryThreshold = Math.min(this.memoryThreshold, deviceMemory * 1024 * 1024 * 0.3);
    }

    // 监听页面可见性变化，不可见时清理内存
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          setTimeout(() => this.performCleanup(), 1000);
        }
      });
    }
  }

  /**
   * 批量释放对象
   */
  releaseBatch<T>(poolName: string, objects: T[]): void {
    objects.forEach(obj => this.release(poolName, obj));
  }

  /**
   * 预热对象池
   */
  warmupPool(poolName: string, count: number): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const needed = Math.min(count, pool.maxSize - pool.available.length);
    for (let i = 0; i < needed; i++) {
      pool.available.push(pool.factory());
    }
  }

  /**
   * 销毁对象池
   */
  destroyPool(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    pool.available = [];
    pool.inUse.clear();
    this.pools.delete(poolName);
  }

  /**
   * 获取详细的内存指标
   */
  getDetailedMetrics(): PerformanceMetrics & {
    poolMetrics: Record<string, any>;
    memoryPressure: boolean;
    gcCount: number;
  } {
    const memoryUsage = this.getMemoryUsage();
    
    return {
      fps: 0, // 由其他监控器提供
      memoryUsage: memoryUsage.used,
      domNodeCount: 0, // 由其他监控器提供
      paintTime: 0,
      scriptTime: 0,
      renderTime: 0,
      gcTime: 0,
      cacheHitRate: 0,
      poolMetrics: memoryUsage.pools,
      memoryPressure: this.checkMemoryPressure(),
      gcCount: this.gcScheduled ? 1 : 0
    };
  }

  /**
   * 清理所有资源
   */
  destroy(): void {
    this.pools.clear();
    this.references.clear();
  }
}