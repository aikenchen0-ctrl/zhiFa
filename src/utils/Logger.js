/**
 * Advanced Logging System for PixiJS Mobile Applications
 * Supports multiple log levels, performance tracking, and mobile debugging
 */

export class Logger {
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };

  static LOG_CATEGORIES = {
    PIXI: 'PIXI',
    PERFORMANCE: 'PERF',
    INTERACTION: 'INTERACTION',
    RENDER: 'RENDER',
    MOBILE: 'MOBILE',
    MEMORY: 'MEMORY',
    TOUCH: 'TOUCH',
    NETWORK: 'NETWORK'
  };

  constructor(options = {}) {
    this.logLevel = options.logLevel ?? Logger.LOG_LEVELS.INFO;
    this.enableConsole = options.enableConsole ?? true;
    this.enableStorage = options.enableStorage ?? false;
    this.enableRemote = options.enableRemote ?? false;
    this.maxStorageEntries = options.maxStorageEntries ?? 1000;
    this.remoteEndpoint = options.remoteEndpoint;
    
    this.logs = [];
    this.performanceMarks = new Map();
    this.startTime = performance.now();
    
    // Mobile-specific logging
    this.isMobile = this.detectMobile();
    this.touchEvents = [];
    
    // Initialize performance observer for mobile
    if (this.isMobile && 'PerformanceObserver' in window) {
      this.initPerformanceObserver();
    }
    
    this.setupErrorHandling();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }

  initPerformanceObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.debug(Logger.LOG_CATEGORIES.PERFORMANCE, 
            `Performance entry: ${entry.name} - ${entry.duration}ms`, {
            type: entry.entryType,
            startTime: entry.startTime,
            duration: entry.duration
          });
        }
      });
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (e) {
      this.warn(Logger.LOG_CATEGORIES.PERFORMANCE, 'PerformanceObserver not supported');
    }
  }

  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      this.error(Logger.LOG_CATEGORIES.PIXI, 'Global error caught', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error(Logger.LOG_CATEGORIES.NETWORK, 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  createLogEntry(level, category, message, data = null) {
    const timestamp = performance.now() - this.startTime;
    const entry = {
      timestamp,
      level,
      category,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      memory: this.getMemoryInfo()
    };

    if (this.enableStorage) {
      this.logs.push(entry);
      if (this.logs.length > this.maxStorageEntries) {
        this.logs.shift();
      }
    }

    return entry;
  }

  getMemoryInfo() {
    if ('memory' in performance) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  }

  formatLogMessage(entry) {
    const levelName = Object.keys(Logger.LOG_LEVELS)[entry.level];
    const timeStr = (entry.timestamp / 1000).toFixed(3);
    let message = `[${timeStr}s] ${levelName} [${entry.category}] ${entry.message}`;
    
    if (entry.memory) {
      message += ` (Memory: ${entry.memory.used}MB)`;
    }
    
    return message;
  }

  shouldLog(level) {
    return level <= this.logLevel;
  }

  log(level, category, message, data = null) {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, category, message, data);
    const formattedMessage = this.formatLogMessage(entry);

    if (this.enableConsole) {
      const consoleMethod = this.getConsoleMethod(level);
      if (data) {
        console[consoleMethod](formattedMessage, data);
      } else {
        console[consoleMethod](formattedMessage);
      }
    }

    if (this.enableRemote && this.remoteEndpoint) {
      this.sendToRemote(entry);
    }

    return entry;
  }

  getConsoleMethod(level) {
    switch (level) {
      case Logger.LOG_LEVELS.ERROR: return 'error';
      case Logger.LOG_LEVELS.WARN: return 'warn';
      case Logger.LOG_LEVELS.INFO: return 'info';
      case Logger.LOG_LEVELS.DEBUG: return 'debug';
      case Logger.LOG_LEVELS.TRACE: return 'trace';
      default: return 'log';
    }
  }

  error(category, message, data) {
    return this.log(Logger.LOG_LEVELS.ERROR, category, message, data);
  }

  warn(category, message, data) {
    return this.log(Logger.LOG_LEVELS.WARN, category, message, data);
  }

  info(category, message, data) {
    return this.log(Logger.LOG_LEVELS.INFO, category, message, data);
  }

  debug(category, message, data) {
    return this.log(Logger.LOG_LEVELS.DEBUG, category, message, data);
  }

  trace(category, message, data) {
    return this.log(Logger.LOG_LEVELS.TRACE, category, message, data);
  }

  // Performance logging methods
  startPerformanceMark(name) {
    const mark = `${name}-start`;
    performance.mark(mark);
    this.performanceMarks.set(name, { start: performance.now() });
    this.debug(Logger.LOG_CATEGORIES.PERFORMANCE, `Started performance mark: ${name}`);
  }

  endPerformanceMark(name) {
    if (!this.performanceMarks.has(name)) {
      this.warn(Logger.LOG_CATEGORIES.PERFORMANCE, `Performance mark ${name} not found`);
      return;
    }

    const mark = this.performanceMarks.get(name);
    const duration = performance.now() - mark.start;
    
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    } catch (e) {
      this.warn(Logger.LOG_CATEGORIES.PERFORMANCE, `Failed to create performance measure for ${name}`);
    }

    this.performanceMarks.delete(name);
    this.info(Logger.LOG_CATEGORIES.PERFORMANCE, `Performance mark ${name} completed: ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  // Touch event logging for mobile debugging
  logTouchEvent(eventType, event) {
    if (!this.isMobile) return;

    const touchData = {
      type: eventType,
      timestamp: performance.now(),
      touches: Array.from(event.touches || []).map(touch => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0
      })),
      target: event.target?.tagName || 'unknown'
    };

    this.touchEvents.push(touchData);
    if (this.touchEvents.length > 100) {
      this.touchEvents.shift();
    }

    this.debug(Logger.LOG_CATEGORIES.TOUCH, `Touch event: ${eventType}`, touchData);
  }

  // Memory usage tracking
  logMemoryUsage(context = '') {
    const memInfo = this.getMemoryInfo();
    if (memInfo) {
      this.info(Logger.LOG_CATEGORIES.MEMORY, 
        `Memory usage${context ? ' (' + context + ')' : ''}: ${memInfo.used}MB / ${memInfo.limit}MB`, 
        memInfo
      );
    }
  }

  // PIXI-specific logging
  logPixiStats(app) {
    if (!app || !app.renderer) return;

    const stats = {
      fps: app.ticker.FPS,
      deltaTime: app.ticker.deltaTime,
      drawCalls: app.renderer.gl?.drawCalls || 0,
      textureUploads: app.renderer.texture?.managedTextures?.length || 0,
      geometryCount: app.stage.children.length
    };

    this.debug(Logger.LOG_CATEGORIES.PIXI, 'PIXI stats', stats);
    return stats;
  }

  // Export logs for debugging
  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'message'];
      const rows = this.logs.map(log => [
        log.timestamp,
        Object.keys(Logger.LOG_LEVELS)[log.level],
        log.category,
        log.message.replace(/"/g, '""')
      ]);
      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
    return this.logs;
  }

  // Remote logging
  async sendToRemote(entry) {
    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Avoid infinite loop by not logging this error
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.touchEvents = [];
    this.performanceMarks.clear();
    this.info(Logger.LOG_CATEGORIES.PIXI, 'Logs cleared');
  }

  // Get filtered logs
  getLogsByCategory(category) {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }
}

// Create default logger instance
export const logger = new Logger({
  logLevel: Logger.LOG_LEVELS.DEBUG,
  enableConsole: true,
  enableStorage: true
});

// Export for global access
window.logger = logger;