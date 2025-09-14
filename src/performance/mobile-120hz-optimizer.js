/**
 * Mobile 120Hz Performance Optimizer
 * Optimizes connection line rendering for high refresh rate mobile displays
 */

class Mobile120HzOptimizer {
  constructor() {
    this.targetFrameTime = 8.33; // 120Hz = 8.33ms per frame
    this.frameTimeBuffer = 2; // 2ms safety buffer
    this.effectiveFrameTime = this.targetFrameTime - this.frameTimeBuffer;
    
    this.performanceMetrics = {
      frameTime: [],
      gpuUtilization: 0,
      memoryUsage: 0,
      fps: 0,
      connectionCount: 0
    };
    
    this.optimizationLevel = 'high';
    this.connectionPool = new Map();
    this.visibleConnections = new Set();
    this.frameTimeHistory = [];
    
    this.initPerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring for 120Hz optimization
   */
  initPerformanceMonitoring() {
    this.frameStart = performance.now();
    this.rafId = null;
    
    // Monitor frame times
    this.startFrameTimeMonitoring();
    
    // Monitor memory usage
    if ('memory' in performance) {
      this.monitorMemoryUsage();
    }
    
    // Detect device capabilities
    this.detectMobileCapabilities();
  }

  /**
   * Start monitoring frame times for 120Hz optimization
   */
  startFrameTimeMonitoring() {
    const measureFrame = () => {
      const now = performance.now();
      const frameTime = now - this.frameStart;
      
      this.frameTimeHistory.push(frameTime);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
      
      this.performanceMetrics.frameTime = frameTime;
      this.performanceMetrics.fps = 1000 / frameTime;
      
      // Adaptive quality based on frame time
      this.adaptQualityBasedOnPerformance(frameTime);
      
      this.frameStart = now;
      this.rafId = requestAnimationFrame(measureFrame);
    };
    
    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Monitor memory usage for mobile optimization
   */
  monitorMemoryUsage() {
    setInterval(() => {
      if ('memory' in performance) {
        const memInfo = performance.memory;
        this.performanceMetrics.memoryUsage = {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit,
          percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
        };
        
        // Trigger garbage collection hint if memory usage is high
        if (this.performanceMetrics.memoryUsage.percentage > 80) {
          this.triggerMemoryOptimization();
        }
      }
    }, 1000);
  }

  /**
   * Detect mobile device capabilities
   */
  detectMobileCapabilities() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    this.deviceCapabilities = {
      supportsWebGL: !!gl,
      supportsWebGL2: !!canvas.getContext('webgl2'),
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
      supportsHardwareAcceleration: this.detectHardwareAcceleration(),
      touchSupport: 'ontouchstart' in window,
      highRefreshRate: screen.colorDepth > 24 || window.devicePixelRatio > 2
    };
    
    canvas.remove();
  }

  /**
   * Detect hardware acceleration support
   */
  detectHardwareAcceleration() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.remove();
    
    // Check if canvas uses hardware acceleration
    return ctx && typeof ctx.isPointInPath === 'function';
  }

  /**
   * Optimize connection rendering for 120Hz
   */
  optimizeConnectionRendering(connections) {
    const startTime = performance.now();
    
    // Step 1: Cull non-visible connections
    const visibleConnections = this.cullInvisibleConnections(connections);
    
    // Step 2: Use object pooling for connection elements
    const optimizedConnections = this.useConnectionPooling(visibleConnections);
    
    // Step 3: Apply GPU-accelerated transforms
    this.applyGPUAcceleratedTransforms(optimizedConnections);
    
    // Step 4: Batch DOM updates
    this.batchDOMUpdates(optimizedConnections);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    // Ensure we stay within frame time budget
    if (processingTime > this.effectiveFrameTime) {
      console.warn(`Frame time exceeded: ${processingTime.toFixed(2)}ms > ${this.effectiveFrameTime}ms`);
      this.adaptQualityBasedOnPerformance(processingTime);
    }
    
    return optimizedConnections;
  }

  /**
   * Cull connections outside viewport for performance
   */
  cullInvisibleConnections(connections) {
    const viewport = this.getViewportBounds();
    return connections.filter(connection => {
      return this.isConnectionVisible(connection, viewport);
    });
  }

  /**
   * Get current viewport bounds for culling
   */
  getViewportBounds() {
    return {
      left: window.scrollX,
      top: window.scrollY,
      right: window.scrollX + window.innerWidth,
      bottom: window.scrollY + window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  /**
   * Check if connection is visible in viewport
   */
  isConnectionVisible(connection, viewport) {
    const bounds = connection.getBoundingRect();
    
    return !(
      bounds.right < viewport.left ||
      bounds.left > viewport.right ||
      bounds.bottom < viewport.top ||
      bounds.top > viewport.bottom
    );
  }

  /**
   * Use object pooling for connection elements
   */
  useConnectionPooling(connections) {
    const pooledConnections = [];
    
    connections.forEach((connection, index) => {
      let pooledElement = this.connectionPool.get(connection.id);
      
      if (!pooledElement) {
        pooledElement = this.createOptimizedConnectionElement(connection);
        this.connectionPool.set(connection.id, pooledElement);
      }
      
      // Update pooled element with current data
      this.updatePooledElement(pooledElement, connection);
      pooledConnections.push(pooledElement);
    });
    
    return pooledConnections;
  }

  /**
   * Create optimized connection element with GPU acceleration
   */
  createOptimizedConnectionElement(connection) {
    const element = document.createElement('div');
    element.className = 'connection-line optimized';
    
    // Enable GPU acceleration
    element.style.willChange = 'transform, opacity';
    element.style.transform = 'translateZ(0)'; // Force GPU layer
    element.style.contain = 'layout style paint';
    element.style.contentVisibility = 'auto';
    
    // Optimize for touch interactions
    element.style.touchAction = 'manipulation';
    element.style.userSelect = 'none';
    element.style.webkitUserSelect = 'none';
    
    return element;
  }

  /**
   * Update pooled element with current connection data
   */
  updatePooledElement(element, connection) {
    const transform = `translate3d(${connection.x}px, ${connection.y}px, 0) rotate(${connection.angle}deg) scaleX(${connection.length})`;
    element.style.transform = transform;
    element.style.opacity = connection.opacity || 1;
  }

  /**
   * Apply GPU-accelerated transforms for smooth 120Hz rendering
   */
  applyGPUAcceleratedTransforms(connections) {
    connections.forEach(connection => {
      // Use transform3d for GPU acceleration
      const transform = `translate3d(${connection.x}px, ${connection.y}px, 0)`;
      connection.style.transform = transform;
      
      // Ensure GPU layer creation
      if (!connection.style.willChange) {
        connection.style.willChange = 'transform, opacity';
      }
    });
  }

  /**
   * Batch DOM updates to prevent layout thrashing
   */
  batchDOMUpdates(connections) {
    // Use DocumentFragment for batching
    const fragment = document.createDocumentFragment();
    
    requestAnimationFrame(() => {
      connections.forEach(connection => {
        if (!connection.parentNode) {
          fragment.appendChild(connection);
        }
      });
      
      // Single DOM insertion
      if (fragment.hasChildNodes()) {
        document.querySelector('.connection-container')?.appendChild(fragment);
      }
    });
  }

  /**
   * Adapt rendering quality based on performance
   */
  adaptQualityBasedOnPerformance(currentFrameTime) {
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    
    if (avgFrameTime > this.targetFrameTime * 1.5) {
      // Reduce quality
      if (this.optimizationLevel !== 'low') {
        this.optimizationLevel = 'low';
        this.applyLowQualityOptimizations();
      }
    } else if (avgFrameTime < this.targetFrameTime * 0.8) {
      // Increase quality
      if (this.optimizationLevel !== 'high') {
        this.optimizationLevel = 'high';
        this.applyHighQualityOptimizations();
      }
    }
  }

  /**
   * Apply low quality optimizations for better performance
   */
  applyLowQualityOptimizations() {
    document.documentElement.style.setProperty('--connection-quality', 'low');
    
    // Reduce visual effects
    const connections = document.querySelectorAll('.connection-line');
    connections.forEach(connection => {
      connection.style.filter = 'none';
      connection.style.boxShadow = 'none';
    });
  }

  /**
   * Apply high quality optimizations when performance allows
   */
  applyHighQualityOptimizations() {
    document.documentElement.style.setProperty('--connection-quality', 'high');
    
    // Restore visual effects
    const connections = document.querySelectorAll('.connection-line');
    connections.forEach(connection => {
      connection.style.filter = '';
      connection.style.boxShadow = '';
    });
  }

  /**
   * Trigger memory optimization when usage is high
   */
  triggerMemoryOptimization() {
    // Clear unused pooled connections
    const activeIds = new Set(this.visibleConnections);
    for (const [id, element] of this.connectionPool.entries()) {
      if (!activeIds.has(id)) {
        element.remove();
        this.connectionPool.delete(id);
      }
    }
    
    // Suggest garbage collection
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
  }

  /**
   * Optimize touch scrolling for smooth 120Hz experience
   */
  optimizeTouchScrolling(container) {
    let isScrolling = false;
    let scrollTimeout = null;
    
    // Use passive listeners for better performance
    container.addEventListener('touchstart', (e) => {
      isScrolling = true;
      this.pauseNonCriticalAnimations();
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Throttle updates during scroll
      scrollTimeout = setTimeout(() => {
        this.updateVisibleConnections();
      }, 16); // ~60fps during scroll to save performance
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
      isScrolling = false;
      this.resumeNonCriticalAnimations();
    }, { passive: true });
  }

  /**
   * Pause non-critical animations during scroll
   */
  pauseNonCriticalAnimations() {
    document.documentElement.style.setProperty('--animation-state', 'paused');
  }

  /**
   * Resume non-critical animations after scroll
   */
  resumeNonCriticalAnimations() {
    document.documentElement.style.setProperty('--animation-state', 'running');
  }

  /**
   * Update visible connections during scroll
   */
  updateVisibleConnections() {
    const viewport = this.getViewportBounds();
    const allConnections = document.querySelectorAll('.connection-line');
    
    this.visibleConnections.clear();
    
    allConnections.forEach(connection => {
      const bounds = connection.getBoundingClientRect();
      const isVisible = this.isElementVisible(bounds, viewport);
      
      if (isVisible) {
        this.visibleConnections.add(connection.dataset.id);
        connection.style.display = '';
      } else {
        connection.style.display = 'none';
      }
    });
  }

  /**
   * Check if element is visible in viewport
   */
  isElementVisible(bounds, viewport) {
    return !(
      bounds.right < 0 ||
      bounds.left > viewport.width ||
      bounds.bottom < 0 ||
      bounds.top > viewport.height
    );
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      optimizationLevel: this.optimizationLevel,
      frameTimeHistory: [...this.frameTimeHistory],
      avgFrameTime: this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length,
      deviceCapabilities: this.deviceCapabilities,
      pooledConnections: this.connectionPool.size,
      visibleConnections: this.visibleConnections.size
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Clear connection pool
    for (const element of this.connectionPool.values()) {
      element.remove();
    }
    this.connectionPool.clear();
    this.visibleConnections.clear();
  }
}

export default Mobile120HzOptimizer;