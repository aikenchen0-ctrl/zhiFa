/**
 * 日志系统
 * Logging System
 */

import { 
  Logger as ILogger, 
  LogLevel, 
  LogEntry 
} from './types'

/**
 * 日志输出器接口
 */
export interface LogOutput {
  write(entry: LogEntry): void
  flush?(): void
  close?(): void
}

/**
 * 控制台日志输出器
 */
export class ConsoleOutput implements LogOutput {
  private colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // cyan
    [LogLevel.INFO]: '\x1b[32m',  // green
    [LogLevel.WARN]: '\x1b[33m',  // yellow
    [LogLevel.ERROR]: '\x1b[31m', // red
    [LogLevel.FATAL]: '\x1b[35m'  // magenta
  }

  private levelNames = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL'
  }

  write(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString()
    const levelName = this.levelNames[entry.level]
    const color = this.colors[entry.level]
    const reset = '\x1b[0m'
    
    const prefix = `${color}[${timestamp}] ${levelName}${reset}`
    const category = entry.category ? ` [${entry.category}]` : ''
    const message = `${prefix}${category}: ${entry.message}`

    // 根据日志级别选择控制台方法
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '')
        break
      case LogLevel.INFO:
        console.info(message, entry.data || '')
        break
      case LogLevel.WARN:
        console.warn(message, entry.data || '')
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.data || '')
        break
      default:
        console.log(message, entry.data || '')
    }
  }
}

/**
 * 内存日志输出器
 */
export class MemoryOutput implements LogOutput {
  private entries: LogEntry[] = []
  private maxEntries: number

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries
  }

  write(entry: LogEntry): void {
    this.entries.push(entry)
    
    // 限制内存中的日志数量
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries]
  }

  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(entry => entry.level >= level)
  }

  getEntriesByCategory(category: string): LogEntry[] {
    return this.entries.filter(entry => entry.category === category)
  }

  clear(): void {
    this.entries = []
  }

  flush(): void {
    // 内存输出器不需要刷新
  }
}

/**
 * 本地存储日志输出器
 */
export class LocalStorageOutput implements LogOutput {
  private storageKey: string
  private maxEntries: number

  constructor(storageKey = 'app-logs', maxEntries = 500) {
    this.storageKey = storageKey
    this.maxEntries = maxEntries
  }

  write(entry: LogEntry): void {
    try {
      const existingLogs = this.getStoredLogs()
      existingLogs.push(entry)
      
      // 限制存储的日志数量
      if (existingLogs.length > this.maxEntries) {
        existingLogs.splice(0, existingLogs.length - this.maxEntries)
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(existingLogs))
    } catch (error) {
      // 如果存储失败（例如配额已满），清理旧日志并重试
      this.clearOldLogs()
      try {
        localStorage.setItem(this.storageKey, JSON.stringify([entry]))
      } catch (retryError) {
        // 如果仍然失败，放弃存储
        console.warn('Failed to store log entry:', retryError)
      }
    }
  }

  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      return []
    }
  }

  private clearOldLogs(): void {
    try {
      const logs = this.getStoredLogs()
      const reducedLogs = logs.slice(-Math.floor(this.maxEntries / 2))
      localStorage.setItem(this.storageKey, JSON.stringify(reducedLogs))
    } catch (error) {
      localStorage.removeItem(this.storageKey)
    }
  }

  getLogs(): LogEntry[] {
    return this.getStoredLogs()
  }

  clear(): void {
    localStorage.removeItem(this.storageKey)
  }
}

/**
 * 远程日志输出器
 */
export class RemoteOutput implements LogOutput {
  private endpoint: string
  private batchSize: number
  private buffer: LogEntry[] = []
  private flushInterval: number
  private headers: Record<string, string>

  constructor(
    endpoint: string,
    options: {
      batchSize?: number
      flushIntervalMs?: number
      headers?: Record<string, string>
    } = {}
  ) {
    this.endpoint = endpoint
    this.batchSize = options.batchSize || 10
    this.headers = options.headers || { 'Content-Type': 'application/json' }
    
    // 设置定期刷新
    this.flushInterval = setInterval(
      () => this.flush(),
      options.flushIntervalMs || 5000
    )
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry)
    
    // 如果缓冲区达到批量大小，立即刷新
    if (this.buffer.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const logsToSend = [...this.buffer]
    this.buffer = []

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ logs: logsToSend })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      // 如果发送失败，将日志放回缓冲区
      this.buffer = [...logsToSend, ...this.buffer]
      console.error('Failed to send logs to remote endpoint:', error)
    }
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

/**
 * 日志过滤器
 */
export class LogFilter {
  private levelFilter?: LogLevel
  private categoryFilter?: string[]
  private messageFilter?: RegExp

  setLevelFilter(level: LogLevel): void {
    this.levelFilter = level
  }

  setCategoryFilter(categories: string[]): void {
    this.categoryFilter = categories
  }

  setMessageFilter(pattern: RegExp): void {
    this.messageFilter = pattern
  }

  shouldLog(entry: LogEntry): boolean {
    // 级别过滤
    if (this.levelFilter !== undefined && entry.level < this.levelFilter) {
      return false
    }

    // 分类过滤
    if (this.categoryFilter && entry.category) {
      if (!this.categoryFilter.includes(entry.category)) {
        return false
      }
    }

    // 消息过滤
    if (this.messageFilter && !this.messageFilter.test(entry.message)) {
      return false
    }

    return true
  }

  clear(): void {
    this.levelFilter = undefined
    this.categoryFilter = undefined
    this.messageFilter = undefined
  }
}

/**
 * 主要日志器实现
 */
export class Logger implements ILogger {
  private outputs: LogOutput[] = []
  private filter: LogFilter = new LogFilter()
  private config: any
  private context: Record<string, any> = {}

  constructor(config: any) {
    this.config = config
    this.setupOutputs()
    this.setupFilter()
  }

  private setupOutputs(): void {
    const outputs = this.config.outputs || ['console']

    for (const outputType of outputs) {
      switch (outputType) {
        case 'console':
          this.addOutput(new ConsoleOutput())
          break
        case 'memory':
          this.addOutput(new MemoryOutput())
          break
        case 'localStorage':
          this.addOutput(new LocalStorageOutput())
          break
        case 'remote':
          if (this.config.remoteEndpoint) {
            this.addOutput(new RemoteOutput(this.config.remoteEndpoint))
          }
          break
      }
    }
  }

  private setupFilter(): void {
    if (this.config.level !== undefined) {
      this.filter.setLevelFilter(this.config.level)
    }

    if (this.config.categories) {
      this.filter.setCategoryFilter(this.config.categories)
    }
  }

  addOutput(output: LogOutput): void {
    this.outputs.push(output)
  }

  removeOutput(output: LogOutput): void {
    const index = this.outputs.indexOf(output)
    if (index > -1) {
      this.outputs.splice(index, 1)
    }
  }

  setContext(key: string, value: any): void {
    this.context[key] = value
  }

  clearContext(): void {
    this.context = {}
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data)
  }

  fatal(message: string, data?: any): void {
    this.log(LogLevel.FATAL, message, data)
  }

  log(level: LogLevel, message: string, data?: any, category?: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      category,
      data: data || this.context
    }

    // 应用过滤器
    if (!this.filter.shouldLog(entry)) {
      return
    }

    // 输出到所有输出器
    for (const output of this.outputs) {
      try {
        output.write(entry)
      } catch (error) {
        console.error('Error in log output:', error)
      }
    }
  }

  // 创建子日志器
  child(category: string, context?: Record<string, any>): Logger {
    const childLogger = new Logger(this.config)
    childLogger.outputs = this.outputs
    childLogger.filter = this.filter
    childLogger.context = { ...this.context, ...context }
    
    // 重写log方法以包含分类
    const originalLog = childLogger.log.bind(childLogger)
    childLogger.log = (level: LogLevel, message: string, data?: any, cat?: string) => {
      originalLog(level, message, data, cat || category)
    }

    return childLogger
  }

  // 性能日志
  time(label: string): void {
    this.setContext(`timer_${label}`, performance.now())
  }

  timeEnd(label: string): void {
    const startTime = this.context[`timer_${label}`]
    if (startTime) {
      const duration = performance.now() - startTime
      this.info(`Timer ${label}: ${duration.toFixed(2)}ms`)
      delete this.context[`timer_${label}`]
    }
  }

  // 统计计数
  count(label: string): void {
    const countKey = `count_${label}`
    const currentCount = this.context[countKey] || 0
    this.context[countKey] = currentCount + 1
    this.debug(`Count ${label}: ${this.context[countKey]}`)
  }

  // 获取内存输出器的日志（如果存在）
  getLogs(): LogEntry[] {
    for (const output of this.outputs) {
      if (output instanceof MemoryOutput) {
        return output.getEntries()
      }
    }
    return []
  }

  // 获取本地存储的日志（如果存在）
  getStoredLogs(): LogEntry[] {
    for (const output of this.outputs) {
      if (output instanceof LocalStorageOutput) {
        return output.getLogs()
      }
    }
    return []
  }

  // 清理所有日志
  clearLogs(): void {
    for (const output of this.outputs) {
      if ('clear' in output && typeof output.clear === 'function') {
        output.clear()
      }
    }
  }

  // 刷新所有输出器
  flush(): void {
    for (const output of this.outputs) {
      if ('flush' in output && typeof output.flush === 'function') {
        output.flush()
      }
    }
  }

  // 关闭所有输出器
  close(): void {
    for (const output of this.outputs) {
      if ('close' in output && typeof output.close === 'function') {
        output.close()
      }
    }
    this.outputs = []
  }

  // 获取日志统计
  getStats(): LogStats {
    const logs = this.getLogs()
    const stats: LogStats = {
      total: logs.length,
      byLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.FATAL]: 0
      },
      byCategory: {},
      oldestTimestamp: 0,
      newestTimestamp: 0
    }

    if (logs.length > 0) {
      stats.oldestTimestamp = Math.min(...logs.map(log => log.timestamp))
      stats.newestTimestamp = Math.max(...logs.map(log => log.timestamp))

      for (const log of logs) {
        stats.byLevel[log.level]++
        
        if (log.category) {
          stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1
        }
      }
    }

    return stats
  }
}

// 类型定义
export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byCategory: Record<string, number>
  oldestTimestamp: number
  newestTimestamp: number
}