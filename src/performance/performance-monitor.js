/**
 * Performance Monitor for Mobile 120Hz Optimization
 * Comprehensive performance tracking and analysis system
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameTime: [],
      fps: [],
      memoryUsage: [],
      cpuUsage: [],
      touchLatency: [],
      scrollPerformance: [],
      renderingTime: [],
      connectionCount: []
    };
    
    this.thresholds = {
      frameTime: 8.33, // 120Hz target
      fps: 120,
      memoryUsage: 80, // 80% threshold
      touchLatency: 16, // 16ms max
      scrollPerformance: 60 // 60fps during scroll
    };
    
    this.isMonitoring = false;
    this.observers = [];
    this.startTime = performance.now();
    
    this.initializeMonitoring();
  }

  /**
   * Initialize all performance monitoring systems
   */
  initializeMonitoring() {
    this.setupFrameTimeMonitoring();
    this.setupMemoryMonitoring();
    this.setupTouchLatencyMonitoring();
    this.setupScrollPerformanceMonitoring();
    this.setupRenderingMetrics();
    this.setupPerformanceObserver();
  }

  /**
   * Setup frame time monitoring for 120Hz optimization
   */
  setupFrameTimeMonitoring() {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    
    const measureFrame = (timestamp) => {
      if (!this.isMonitoring) return;
      
      const frameTime = timestamp - lastFrameTime;
      const fps = 1000 / frameTime;
      
      this.metrics.frameTime.push(frameTime);
      this.metrics.fps.push(fps);
      
      // Keep only last 300 frames (2.5 seconds at 120Hz)
      if (this.metrics.frameTime.length > 300) {
        this.metrics.frameTime.shift();
        this.metrics.fps.shift();
      }
      
      // Check for performance degradation
      if (frameTime > this.thresholds.frameTime * 1.5) {
        this.onPerformanceThresholdExceeded('frameTime', frameTime);
      }
      
      lastFrameTime = timestamp;
      frameCount++;
      
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  /**
   * Setup memory usage monitoring
   */
  setupMemoryMonitoring() {
    if (!('memory' in performance)) {
      console.warn('Memory API not available');
      return;
    }
    
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      const memInfo = performance.memory;
      const memoryData = {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
        percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100,
        timestamp: performance.now()
      };
      
      this.metrics.memoryUsage.push(memoryData);
      
      // Keep only last 60 samples (1 minute)
      if (this.metrics.memoryUsage.length > 60) {
        this.metrics.memoryUsage.shift();
      }
      
      // Check memory threshold
      if (memoryData.percentage > this.thresholds.memoryUsage) {
        this.onPerformanceThresholdExceeded('memoryUsage', memoryData.percentage);
      }
    }, 1000);
  }

  /**
   * Setup touch latency monitoring
   */
  setupTouchLatencyMonitoring() {
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartTime = performance.now();
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (touchStartTime && this.isMonitoring) {
        const latency = performance.now() - touchStartTime;
        this.metrics.touchLatency.push(latency);
        
        // Keep only last 50 touch events
        if (this.metrics.touchLatency.length > 50) {
          this.metrics.touchLatency.shift();
        }
        
        if (latency > this.thresholds.touchLatency) {
          this.onPerformanceThresholdExceeded('touchLatency', latency);
        }
      }
    }, { passive: true });
  }

  /**
   * Setup scroll performance monitoring
   */
  setupScrollPerformanceMonitoring() {
    let scrollStartTime = 0;
    let scrollFrameCount = 0;
    let isScrolling = false;
    
    const onScrollStart = () => {
      if (!isScrolling) {
        scrollStartTime = performance.now();
        scrollFrameCount = 0;
        isScrolling = true;
      }
    };
    
    const onScrollEnd = () => {
      if (isScrolling && this.isMonitoring) {
        const scrollDuration = performance.now() - scrollStartTime;
        const scrollFPS = (scrollFrameCount / scrollDuration) * 1000;
        
        this.metrics.scrollPerformance.push({
          duration: scrollDuration,
          fps: scrollFPS,
          frameCount: scrollFrameCount,
          timestamp: performance.now()
        });
        
        // Keep only last 20 scroll sessions
        if (this.metrics.scrollPerformance.length > 20) {
          this.metrics.scrollPerformance.shift();
        }
        
        if (scrollFPS < this.thresholds.scrollPerformance) {
          this.onPerformanceThresholdExceeded('scrollPerformance', scrollFPS);
        }
        
        isScrolling = false;
      }
    };
    
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      onScrollStart();
      scrollFrameCount++;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(onScrollEnd, 150);
    }, { passive: true });
  }

  /**
   * Setup rendering metrics
   */
  setupRenderingMetrics() {
    const measureRenderTime = () => {
      if (!this.isMonitoring) return;
      
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const renderTime = performance.now() - startTime;
        this.metrics.renderingTime.push(renderTime);
        
        // Keep only last 120 samples (1 second at 120Hz)
        if (this.metrics.renderingTime.length > 120) {
          this.metrics.renderingTime.shift();
        }
        
        measureRenderTime();
      });
    };
    
    measureRenderTime();
  }

  /**
   * Setup Performance Observer for additional metrics
   */
  setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not available');
      return;
    }
    
    // Monitor paint timing
    const paintObserver = new PerformanceObserver((list) => {
      if (!this.isMonitoring) return;
      
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          this.metrics[entry.name + 'Time'] = entry.startTime;
        }
      }
    });
    
    paintObserver.observe({ entryTypes: ['paint'] });
    this.observers.push(paintObserver);
    
    // Monitor layout shifts
    const layoutShiftObserver = new PerformanceObserver((list) => {
      if (!this.isMonitoring) return;
      
      let cumulativeScore = 0;
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
        }
      }
      
      if (cumulativeScore > 0) {
        this.metrics.layoutShift = (this.metrics.layoutShift || 0) + cumulativeScore;
      }
    });
    
    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(layoutShiftObserver);
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.startTime = performance.now();
    console.log('Performance monitoring started for 120Hz optimization');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Handle performance threshold exceeded
   */
  onPerformanceThresholdExceeded(metric, value) {
    console.warn(`Performance threshold exceeded: ${metric} = ${value}`);
    
    // Trigger optimization actions based on metric
    switch (metric) {
      case 'frameTime':
        this.suggestFrameTimeOptimization();
        break;
      case 'memoryUsage':
        this.suggestMemoryOptimization();
        break;
      case 'touchLatency':
        this.suggestTouchOptimization();
        break;
      case 'scrollPerformance':
        this.suggestScrollOptimization();
        break;
    }
  }

  /**
   * Suggest frame time optimizations
   */
  suggestFrameTimeOptimization() {
    const suggestions = [
      'Reduce connection line complexity',
      'Enable viewport culling',
      'Use object pooling for elements',
      'Implement adaptive quality scaling',
      'Optimize CSS animations'
    ];
    
    console.log('Frame time optimization suggestions:', suggestions);
  }

  /**
   * Suggest memory optimizations
   */
  suggestMemoryOptimization() {
    const suggestions = [
      'Clear unused connection pool objects',
      'Reduce cached elements',
      'Implement lazy loading for connections',
      'Use memory-efficient data structures',
      'Trigger garbage collection'
    ];
    
    console.log('Memory optimization suggestions:', suggestions);
  }

  /**
   * Suggest touch optimizations
   */
  suggestTouchOptimization() {
    const suggestions = [
      'Use passive event listeners',
      'Debounce touch events',
      'Reduce touch handler complexity',
      'Optimize touch feedback animations',
      'Use hardware acceleration for touch elements'
    ];
    
    console.log('Touch optimization suggestions:', suggestions);
  }

  /**
   * Suggest scroll optimizations
   */
  suggestScrollOptimization() {
    const suggestions = [
      'Enable CSS contain for scrollable areas',
      'Use IntersectionObserver for visibility',
      'Implement virtual scrolling for large lists',
      'Throttle scroll event handlers',
      'Use transform3d for smooth scrolling'
    ];
    
    console.log('Scroll optimization suggestions:', suggestions);
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const currentTime = performance.now();
    const monitoringDuration = currentTime - this.startTime;
    
    return {
      duration: monitoringDuration,
      frameTime: {
        current: this.metrics.frameTime[this.metrics.frameTime.length - 1] || 0,
        average: this.calculateAverage(this.metrics.frameTime),
        p95: this.calculatePercentile(this.metrics.frameTime, 95),
        p99: this.calculatePercentile(this.metrics.frameTime, 99),
        samples: this.metrics.frameTime.length
      },
      fps: {
        current: this.metrics.fps[this.metrics.fps.length - 1] || 0,
        average: this.calculateAverage(this.metrics.fps),
        min: Math.min(...this.metrics.fps),
        max: Math.max(...this.metrics.fps)
      },
      memory: {
        current: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1],
        peak: this.getPeakMemoryUsage(),
        trend: this.calculateMemoryTrend()
      },
      touchLatency: {
        average: this.calculateAverage(this.metrics.touchLatency),
        p95: this.calculatePercentile(this.metrics.touchLatency, 95),
        samples: this.metrics.touchLatency.length
      },
      scrollPerformance: {
        averageFPS: this.calculateAverageScrollFPS(),
        totalSessions: this.metrics.scrollPerformance.length
      },
      rendering: {
        averageTime: this.calculateAverage(this.metrics.renderingTime),
        p95: this.calculatePercentile(this.metrics.renderingTime, 95)
      },
      thresholdViolations: this.getThresholdViolations()
    };
  }

  /**
   * Calculate average of array
   */
  calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate percentile of array
   */
  calculatePercentile(arr, percentile) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get peak memory usage
   */
  getPeakMemoryUsage() {
    if (!this.metrics.memoryUsage.length) return null;
    
    return this.metrics.memoryUsage.reduce((peak, current) => {
      return current.percentage > peak.percentage ? current : peak;
    });
  }

  /**
   * Calculate memory usage trend
   */
  calculateMemoryTrend() {
    if (this.metrics.memoryUsage.length < 2) return 'stable';
    
    const recent = this.metrics.memoryUsage.slice(-10);
    const trend = recent[recent.length - 1].percentage - recent[0].percentage;
    
    if (trend > 5) return 'increasing';
    if (trend < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate average scroll FPS
   */
  calculateAverageScrollFPS() {
    if (!this.metrics.scrollPerformance.length) return 0;
    
    const totalFPS = this.metrics.scrollPerformance.reduce((sum, session) => sum + session.fps, 0);
    return totalFPS / this.metrics.scrollPerformance.length;
  }

  /**
   * Get threshold violations count
   */
  getThresholdViolations() {
    return {
      frameTime: this.metrics.frameTime.filter(t => t > this.thresholds.frameTime).length,
      touchLatency: this.metrics.touchLatency.filter(l => l > this.thresholds.touchLatency).length,
      memoryUsage: this.metrics.memoryUsage.filter(m => m.percentage > this.thresholds.memoryUsage).length,
      scrollPerformance: this.metrics.scrollPerformance.filter(s => s.fps < this.thresholds.scrollPerformance).length
    };
  }

  /**
   * Export performance data
   */
  exportData() {
    return {
      metrics: this.metrics,
      thresholds: this.thresholds,
      report: this.getPerformanceReport(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    Object.keys(this.metrics).forEach(key => {
      if (Array.isArray(this.metrics[key])) {
        this.metrics[key] = [];
      } else {
        this.metrics[key] = 0;
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopMonitoring();
    
    // Disconnect all observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
    
    this.clearMetrics();
  }
}

export default PerformanceMonitor;