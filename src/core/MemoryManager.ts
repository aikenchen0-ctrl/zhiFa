/**
 * 内存管理器
 * Memory Manager
 */

import { 
  ObjectPool, 
  MemoryMetrics,
  Logger 
} from './types'

/**
 * 对象池实现
 */
export class ObjectPoolImpl<T> implements ObjectPool<T> {
  private pool: T[] = []
  private factory: () => T
  private reset: (obj: T) => void
  private maxSize: number
  private created = 0

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize = 100
  ) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    
    this.created++
    return this.factory()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj)
      this.pool.push(obj)
    }
  }

  clear(): void {
    this.pool = []
  }

  get size(): number {
    return this.pool.length
  }

  get activeCount(): number {
    return this.created - this.pool.length
  }

  get totalCreated(): number {
    return this.created
  }
}

/**
 * 内存管理器
 */
export class MemoryManager {
  private pools: Map<string, ObjectPoolImpl<any>> = new Map()
  private references: Map<string, WeakRef<any>> = new Map()
  private finalizationRegistry: FinalizationRegistry<string>
  private gcInterval: number
  private config: any
  private metrics: MemoryMetrics
  private isRunning = false

  constructor(config: any, private logger?: Logger) {
    this.config = config
    
    this.metrics = {
      totalMemory: 0,
      usedMemory: 0,
      freeMemory: 0,
      pooledObjects: 0,
      activeObjects: 0
    }

    // 创建清理注册表
    this.finalizationRegistry = new FinalizationRegistry((heldValue: string) => {
      this.onObjectFinalized(heldValue)
    })

    // 设置垃圾回收检查间隔
    this.gcInterval = setInterval(() => {
      this.performGarbageCollection()
    }, 30000) // 每30秒检查一次
  }

  async init(): Promise<void> {
    this.logger?.info('Memory manager initialized')
    
    // 创建预定义的对象池
    this.createDefaultPools()
    
    this.isRunning = true
  }

  private createDefaultPools(): void {
    // Graphics对象池
    this.createPool('graphics', 
      () => new (window as any).PIXI?.Graphics?.() || {},
      (obj: any) => {
        if (obj.clear) obj.clear()
        if (obj.removeFromParent) obj.removeFromParent()
      },
      this.config.poolSizes?.graphics || 50
    )

    // Container对象池
    this.createPool('container',
      () => new (window as any).PIXI?.Container?.() || {},
      (obj: any) => {
        if (obj.removeChildren) obj.removeChildren()
        if (obj.removeFromParent) obj.removeFromParent()
      },
      this.config.poolSizes?.container || 100
    )

    // Text对象池
    this.createPool('text',
      () => new (window as any).PIXI?.Text?.('', {}) || {},
      (obj: any) => {
        if (obj.text !== undefined) obj.text = ''
        if (obj.removeFromParent) obj.removeFromParent()
      },
      this.config.poolSizes?.text || 30
    )

    // 通用对象池
    this.createPool('point',
      () => ({ x: 0, y: 0 }),
      (obj: any) => {
        obj.x = 0
        obj.y = 0
      },
      this.config.poolSizes?.point || 200
    )

    this.createPool('rectangle',
      () => ({ x: 0, y: 0, width: 0, height: 0 }),
      (obj: any) => {
        obj.x = 0
        obj.y = 0
        obj.width = 0
        obj.height = 0
      },
      this.config.poolSizes?.rectangle || 50
    )
  }

  // 创建对象池
  createPool<T>(
    name: string, 
    factory: () => T, 
    reset: (obj: T) => void, 
    maxSize = 100
  ): ObjectPoolImpl<T> {
    if (this.pools.has(name)) {
      this.logger?.warn(`Pool ${name} already exists`)
      return this.pools.get(name) as ObjectPoolImpl<T>
    }

    const pool = new ObjectPoolImpl<T>(factory, reset, maxSize)
    this.pools.set(name, pool)
    
    this.logger?.debug(`Created object pool: ${name} (max: ${maxSize})`)
    return pool
  }

  // 获取对象池
  getPool<T>(name: string): ObjectPoolImpl<T> | null {
    return (this.pools.get(name) as ObjectPoolImpl<T>) || null
  }

  // 从池中获取对象
  get<T>(poolName: string): T | null {
    const pool = this.getPool<T>(poolName)
    if (!pool) {
      this.logger?.warn(`Pool ${poolName} not found`)
      return null
    }

    const obj = pool.get()
    
    // 注册对象用于垃圾回收跟踪
    if (obj && typeof obj === 'object') {
      const id = this.generateObjectId()
      this.references.set(id, new WeakRef(obj))
      this.finalizationRegistry.register(obj, id)
    }

    return obj
  }

  // 释放对象回池中
  release<T>(poolName: string, obj: T): void {
    const pool = this.getPool<T>(poolName)
    if (!pool) {
      this.logger?.warn(`Pool ${poolName} not found`)
      return
    }

    pool.release(obj)
  }

  // 批量释放对象
  releaseBatch<T>(poolName: string, objects: T[]): void {
    const pool = this.getPool<T>(poolName)
    if (!pool) {
      this.logger?.warn(`Pool ${poolName} not found`)
      return
    }

    for (const obj of objects) {
      pool.release(obj)
    }
  }

  // 预热对象池
  warmUp(poolName: string, count: number): void {
    const pool = this.getPool(poolName)
    if (!pool) {
      this.logger?.warn(`Pool ${poolName} not found`)
      return
    }

    const objects = []
    for (let i = 0; i < count; i++) {
      objects.push(pool.get())
    }

    for (const obj of objects) {
      pool.release(obj)
    }

    this.logger?.debug(`Warmed up pool ${poolName} with ${count} objects`)
  }

  // 清理指定池
  clearPool(poolName: string): void {
    const pool = this.getPool(poolName)
    if (pool) {
      pool.clear()
      this.logger?.debug(`Cleared pool: ${poolName}`)
    }
  }

  // 清理所有池
  clearAllPools(): void {
    for (const [name, pool] of this.pools) {
      pool.clear()
    }
    this.logger?.info('All pools cleared')
  }

  // 执行垃圾回收
  performGarbageCollection(): void {
    if (!this.isRunning) return

    let cleanedReferences = 0

    // 清理已经被垃圾回收的弱引用
    for (const [id, weakRef] of this.references) {
      if (weakRef.deref() === undefined) {
        this.references.delete(id)
        cleanedReferences++
      }
    }

    // 更新指标
    this.updateMetrics()

    if (cleanedReferences > 0) {
      this.logger?.debug(`GC cleaned up ${cleanedReferences} references`)
    }

    // 如果内存使用率过高，执行紧急清理
    if (this.getMemoryUsagePercentage() > 90) {
      this.performEmergencyCleanup()
    }
  }

  // 紧急内存清理
  performEmergencyCleanup(): void {
    this.logger?.warn('Performing emergency memory cleanup')

    // 清理所有对象池
    this.clearAllPools()

    // 强制垃圾回收（如果浏览器支持）
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }

    // 清理弱引用
    this.references.clear()

    this.logger?.info('Emergency cleanup completed')
  }

  // 更新内存指标
  update(): void {
    this.updateMetrics()
  }

  private updateMetrics(): void {
    let pooledObjects = 0
    let activeObjects = 0

    // 统计池中的对象
    for (const pool of this.pools.values()) {
      pooledObjects += pool.size
      activeObjects += pool.activeCount
    }

    // 获取内存使用情况
    let totalMemory = 0
    let usedMemory = 0

    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      totalMemory = memInfo.jsHeapSizeLimit || 0
      usedMemory = memInfo.usedJSHeapSize || 0
    }

    this.metrics = {
      totalMemory,
      usedMemory,
      freeMemory: totalMemory - usedMemory,
      pooledObjects,
      activeObjects
    }
  }

  // 获取内存使用百分比
  getMemoryUsagePercentage(): number {
    if (this.metrics.totalMemory === 0) return 0
    return (this.metrics.usedMemory / this.metrics.totalMemory) * 100
  }

  // 获取内存指标
  getMetrics(): MemoryMetrics {
    return { ...this.metrics }
  }

  // 获取池统计信息
  getPoolStats(): Map<string, any> {
    const stats = new Map()

    for (const [name, pool] of this.pools) {
      stats.set(name, {
        size: pool.size,
        activeCount: pool.activeCount,
        totalCreated: pool.totalCreated,
        efficiency: pool.totalCreated > 0 ? (pool.size / pool.totalCreated) * 100 : 0
      })
    }

    return stats
  }

  // 获取详细的内存报告
  getMemoryReport(): MemoryReport {
    const poolStats = this.getPoolStats()
    const memoryUsagePercentage = this.getMemoryUsagePercentage()

    return {
      metrics: this.getMetrics(),
      poolStats: Object.fromEntries(poolStats),
      memoryUsagePercentage,
      recommendations: this.generateMemoryRecommendations(),
      weakReferences: this.references.size
    }
  }

  private generateMemoryRecommendations(): string[] {
    const recommendations: string[] = []
    const usage = this.getMemoryUsagePercentage()

    if (usage > 80) {
      recommendations.push('Memory usage is high. Consider clearing unused objects.')
    }

    if (usage > 90) {
      recommendations.push('Critical memory usage. Perform emergency cleanup.')
    }

    // 分析池的效率
    const poolStats = this.getPoolStats()
    for (const [name, stats] of poolStats) {
      if (stats.efficiency < 50 && stats.totalCreated > 10) {
        recommendations.push(`Pool '${name}' has low efficiency (${stats.efficiency.toFixed(1)}%). Consider adjusting pool size.`)
      }
    }

    return recommendations
  }

  // 对象最终化处理
  private onObjectFinalized(id: string): void {
    this.references.delete(id)
  }

  // 生成对象ID
  private generateObjectId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 监听内存压力事件
  setupMemoryPressureHandling(): void {
    // 监听内存压力事件（实验性API）
    if ('memory' in performance && 'addEventListener' in performance.memory) {
      // @ts-ignore - 实验性API
      performance.memory.addEventListener?.('memorywarning', () => {
        this.logger?.warn('Memory pressure detected')
        this.performEmergencyCleanup()
      })
    }

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时执行内存清理
        setTimeout(() => {
          if (document.hidden) {
            this.performGarbageCollection()
          }
        }, 5000)
      }
    })
  }

  // 销毁内存管理器
  destroy(): void {
    this.isRunning = false

    // 清理定时器
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
    }

    // 清理所有池
    this.clearAllPools()

    // 清理弱引用
    this.references.clear()

    this.logger?.info('Memory manager destroyed')
  }
}

// 类型定义
export interface MemoryReport {
  metrics: MemoryMetrics
  poolStats: { [poolName: string]: any }
  memoryUsagePercentage: number
  recommendations: string[]
  weakReferences: number
}