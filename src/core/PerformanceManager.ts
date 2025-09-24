/**
 * 性能管理器
 * Performance Manager
 */

import { 
  PerformanceMetrics, 
  PerformanceConfig,
  Logger 
} from './types'

/**
 * 性能监控器
 */
export class PerformanceManager {
  private config: PerformanceConfig
  private metrics: PerformanceMetrics
  private startTime: number
  private frameCount = 0
  private lastFrameTime = 0
  private frameTimes: number[] = []
  private isRunning = false
  private updateInterval: number

  // 性能警告阈值
  private thresholds = {
    lowFPS: 30,
    highFrameTime: 33.33, // 30fps = 33.33ms per frame
    highMemory: 100 * 1024 * 1024, // 100MB
    maxFrameTimeHistory: 60
  }

  constructor(config: PerformanceConfig, private logger?: Logger) {
    this.config = { ...config }
    this.startTime = performance.now()
    
    this.metrics = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      textureBindings: 0,
      geometries: 0,
      textures: 0,
      memoryUsage: 0
    }

    this.updateInterval = setInterval(
      () => this.updateMetrics(), 
      config.metricsUpdateInterval || 1000
    )
  }

  async init(): Promise<void> {
    this.logger?.info('Performance manager initialized')
    this.isRunning = true
  }

  update(deltaTime: number): void {
    if (!this.isRunning) return

    this.frameCount++
    const currentTime = performance.now()
    
    // 记录帧时间
    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime
      this.frameTimes.push(frameTime)
      
      // 限制帧时间历史记录长度
      if (this.frameTimes.length > this.thresholds.maxFrameTimeHistory) {
        this.frameTimes.shift()
      }
      
      // 检测性能问题
      this.checkPerformanceIssues(frameTime)
    }
    
    this.lastFrameTime = currentTime
  }

  private updateMetrics(): void {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const elapsedTime = currentTime - this.startTime

    // 计算FPS
    this.metrics.fps = (this.frameCount / elapsedTime) * 1000

    // 计算平均帧时间
    if (this.frameTimes.length > 0) {
      this.metrics.frameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
    }

    // 获取内存使用情况
    this.updateMemoryMetrics()

    // 重置计数器（保持滚动窗口）
    if (elapsedTime > 5000) { // 每5秒重置一次
      this.startTime = currentTime
      this.frameCount = 0
    }

    this.logger?.debug('Performance metrics updated', this.metrics)
  }

  private updateMemoryMetrics(): void {
    // 检查浏览器内存API
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      this.metrics.memoryUsage = memInfo.usedJSHeapSize || 0
    }

    // 估算PIXI资源使用情况（如果可用）
    if (typeof window !== 'undefined' && window.PIXI?.utils?.BaseTextureCache) {
      this.metrics.textures = Object.keys(window.PIXI.utils.BaseTextureCache).length
    }
  }

  private checkPerformanceIssues(frameTime: number): void {
    // 检测低FPS
    if (this.metrics.fps < this.thresholds.lowFPS) {
      this.logger?.warn('Low FPS detected', { 
        fps: this.metrics.fps,
        threshold: this.thresholds.lowFPS 
      })
    }

    // 检测高帧时间
    if (frameTime > this.thresholds.highFrameTime) {
      this.logger?.warn('High frame time detected', { 
        frameTime,
        threshold: this.thresholds.highFrameTime 
      })
    }

    // 检测高内存使用
    if (this.metrics.memoryUsage > this.thresholds.highMemory) {
      this.logger?.warn('High memory usage detected', { 
        memoryUsage: this.metrics.memoryUsage,
        threshold: this.thresholds.highMemory 
      })
    }
  }

  // 公共API
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getFPS(): number {
    return this.metrics.fps
  }

  getAverageFrameTime(): number {
    return this.metrics.frameTime
  }

  getMemoryUsage(): number {
    return this.metrics.memoryUsage
  }

  // 性能分析工具
  startProfiler(name: string): PerformanceProfiler {
    return new PerformanceProfiler(name, this.logger)
  }

  // 基准测试
  async benchmark(name: string, iterations: number, fn: () => void | Promise<void>): Promise<BenchmarkResult> {
    this.logger?.info(`Starting benchmark: ${name}`)
    
    const results: number[] = []
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now()
      
      try {
        await fn()
      } catch (error) {
        this.logger?.error(`Benchmark error in iteration ${i}`, error)
        throw error
      }
      
      const iterationTime = performance.now() - iterationStart
      results.push(iterationTime)
    }

    const totalTime = performance.now() - startTime
    const averageTime = results.reduce((sum, time) => sum + time, 0) / iterations
    const minTime = Math.min(...results)
    const maxTime = Math.max(...results)
    
    // 计算标准差
    const variance = results.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / iterations
    const standardDeviation = Math.sqrt(variance)

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond: 1000 / averageTime
    }

    this.logger?.info(`Benchmark completed: ${name}`, result)
    return result
  }

  // 内存分析
  analyzeMemoryUsage(): MemoryAnalysis | null {
    if (!('memory' in performance)) {
      this.logger?.warn('Memory API not available')
      return null
    }

    const memInfo = (performance as any).memory
    const analysis: MemoryAnalysis = {
      usedJSHeapSize: memInfo.usedJSHeapSize || 0,
      totalJSHeapSize: memInfo.totalJSHeapSize || 0,
      jsHeapSizeLimit: memInfo.jsHeapSizeLimit || 0,
      usagePercentage: ((memInfo.usedJSHeapSize || 0) / (memInfo.jsHeapSizeLimit || 1)) * 100,
      recommendations: []
    }

    // 生成建议
    if (analysis.usagePercentage > 80) {
      analysis.recommendations.push('Memory usage is high (>80%). Consider cleaning up unused objects.')
    }
    
    if (analysis.usagePercentage > 90) {
      analysis.recommendations.push('Critical memory usage (>90%). Immediate cleanup required.')
    }

    return analysis
  }

  // 设置性能阈值
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
    this.logger?.debug('Performance thresholds updated', this.thresholds)
  }

  // 获取性能报告
  getPerformanceReport(): PerformanceReport {
    const memoryAnalysis = this.analyzeMemoryUsage()
    const currentTime = performance.now()
    
    return {
      timestamp: currentTime,
      uptime: currentTime - this.startTime,
      metrics: this.getMetrics(),
      memoryAnalysis,
      frameTimes: [...this.frameTimes],
      recommendations: this.generateRecommendations()
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.metrics.fps < this.thresholds.lowFPS) {
      recommendations.push('FPS is below target. Consider optimizing render operations.')
    }
    
    if (this.metrics.frameTime > this.thresholds.highFrameTime) {
      recommendations.push('Frame time is high. Look for performance bottlenecks.')
    }
    
    if (this.metrics.textures > 100) {
      recommendations.push('Large number of textures loaded. Consider texture atlasing.')
    }
    
    return recommendations
  }

  // 清理资源
  destroy(): void {
    this.isRunning = false
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    this.frameTimes = []
    this.logger?.info('Performance manager destroyed')
  }
}

/**
 * 性能分析器
 */
export class PerformanceProfiler {
  private startTime: number
  private endTime?: number
  private marks: Map<string, number> = new Map()

  constructor(private name: string, private logger?: Logger) {
    this.startTime = performance.now()
    this.logger?.debug(`Profiler started: ${name}`)
  }

  mark(label: string): void {
    const time = performance.now()
    this.marks.set(label, time - this.startTime)
    this.logger?.debug(`Profiler mark: ${this.name}.${label} at ${time - this.startTime}ms`)
  }

  measure(startMark: string, endMark: string): number {
    const startTime = this.marks.get(startMark) || 0
    const endTime = this.marks.get(endMark) || (performance.now() - this.startTime)
    const duration = endTime - startTime
    
    this.logger?.debug(`Profiler measure: ${this.name}.${startMark} to ${endMark} = ${duration}ms`)
    return duration
  }

  end(): ProfilerResult {
    this.endTime = performance.now()
    const totalTime = this.endTime - this.startTime
    
    const result: ProfilerResult = {
      name: this.name,
      totalTime,
      marks: new Map(this.marks),
      endTime: this.endTime
    }
    
    this.logger?.debug(`Profiler ended: ${this.name}`, result)
    return result
  }
}

// 类型定义
export interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  standardDeviation: number
  operationsPerSecond: number
}

export interface MemoryAnalysis {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  usagePercentage: number
  recommendations: string[]
}

export interface PerformanceReport {
  timestamp: number
  uptime: number
  metrics: PerformanceMetrics
  memoryAnalysis: MemoryAnalysis | null
  frameTimes: number[]
  recommendations: string[]
}

export interface ProfilerResult {
  name: string
  totalTime: number
  marks: Map<string, number>
  endTime: number
}