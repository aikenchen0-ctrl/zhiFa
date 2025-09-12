/**
 * 高性能连接线渲染引擎
 * 支持SVG、Canvas、WebGL三种渲染模式，自动选择最优模式
 */
class RenderingEngine {
  constructor(options = {}) {
    this.container = options.container;
    this.mode = options.mode || 'auto';
    this.maxConnections = options.maxConnections || 1000;
    this.performanceThresholds = {
      svg: 50,
      canvas: 500,
      webgl: 10000
    };
    
    this.currentRenderer = null;
    this.metrics = {
      renderTime: 0,
      connectionCount: 0,
      frameRate: 0,
      memoryUsage: 0
    };
    
    this.observers = new Set();
    this.isRendering = false;
    this.renderQueue = [];
    
    this.init();
  }

  init() {
    this.detectBestRenderer();
    this.setupPerformanceMonitoring();
  }

  /**
   * 自动检测最佳渲染器
   */
  detectBestRenderer() {
    if (this.mode !== 'auto') {
      this.currentRenderer = this.createRenderer(this.mode);
      return;
    }

    const connectionCount = this.getEstimatedConnectionCount();
    let selectedMode = 'svg';

    if (connectionCount > this.performanceThresholds.webgl && this.isWebGLSupported()) {
      selectedMode = 'webgl';
    } else if (connectionCount > this.performanceThresholds.canvas) {
      selectedMode = 'canvas';
    }

    this.currentRenderer = this.createRenderer(selectedMode);
    this.notifyObservers('rendererChanged', selectedMode);
  }

  createRenderer(mode) {
    switch (mode) {
      case 'svg':
        return new SVGRenderer(this.container, this.options);
      case 'canvas':
        return new CanvasRenderer(this.container, this.options);
      case 'webgl':
        return new WebGLRenderer(this.container, this.options);
      default:
        throw new Error(`Unsupported rendering mode: ${mode}`);
    }
  }

  /**
   * 批量渲染连接线
   */
  renderConnections(connections) {
    if (!connections || connections.length === 0) return;

    const startTime = performance.now();
    
    // 视窗裁剪
    const visibleConnections = this.cullConnections(connections);
    
    // 批量更新
    this.currentRenderer.batchRender(visibleConnections);
    
    const renderTime = performance.now() - startTime;
    this.updateMetrics(renderTime, connections.length);
    
    // 性能监控和自动降级
    this.checkPerformanceThresholds();
  }

  /**
   * 视窗裁剪 - 只渲染可见连接线
   */
  cullConnections(connections) {
    const viewport = this.getViewport();
    return connections.filter(connection => 
      this.isConnectionVisible(connection, viewport)
    );
  }

  isConnectionVisible(connection, viewport) {
    const bounds = this.getConnectionBounds(connection);
    return this.boundsIntersectViewport(bounds, viewport);
  }

  getConnectionBounds(connection) {
    return {
      minX: Math.min(connection.start.x, connection.end.x),
      minY: Math.min(connection.start.y, connection.end.y),
      maxX: Math.max(connection.start.x, connection.end.x),
      maxY: Math.max(connection.start.y, connection.end.y)
    };
  }

  boundsIntersectViewport(bounds, viewport) {
    return !(
      bounds.maxX < viewport.left ||
      bounds.minX > viewport.right ||
      bounds.maxY < viewport.top ||
      bounds.minY > viewport.bottom
    );
  }

  getViewport() {
    return {
      left: 0,
      top: 0,
      right: this.container.clientWidth,
      bottom: this.container.clientHeight
    };
  }

  /**
   * 性能监控
   */
  setupPerformanceMonitoring() {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name.startsWith('render-')) {
          this.metrics.renderTime = entry.duration;
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  checkPerformanceThresholds() {
    const { renderTime, connectionCount } = this.metrics;
    
    // 如果渲染时间超过16ms（60fps），考虑降级
    if (renderTime > 16 && this.mode === 'auto') {
      this.downgradeRenderer();
    }
    
    // 如果连接数量超过当前渲染器阈值，升级
    if (connectionCount > this.getCurrentThreshold() && this.mode === 'auto') {
      this.upgradeRenderer();
    }
  }

  downgradeRenderer() {
    const currentMode = this.currentRenderer.mode;
    let newMode = currentMode;

    if (currentMode === 'webgl') newMode = 'canvas';
    else if (currentMode === 'canvas') newMode = 'svg';

    if (newMode !== currentMode) {
      this.switchRenderer(newMode);
    }
  }

  upgradeRenderer() {
    const currentMode = this.currentRenderer.mode;
    let newMode = currentMode;

    if (currentMode === 'svg' && this.metrics.connectionCount > this.performanceThresholds.canvas) {
      newMode = 'canvas';
    } else if (currentMode === 'canvas' && 
               this.metrics.connectionCount > this.performanceThresholds.webgl &&
               this.isWebGLSupported()) {
      newMode = 'webgl';
    }

    if (newMode !== currentMode) {
      this.switchRenderer(newMode);
    }
  }

  switchRenderer(newMode) {
    if (this.currentRenderer) {
      this.currentRenderer.destroy();
    }
    
    this.currentRenderer = this.createRenderer(newMode);
    this.notifyObservers('rendererChanged', newMode);
  }

  getCurrentThreshold() {
    const mode = this.currentRenderer.mode;
    return this.performanceThresholds[mode];
  }

  updateMetrics(renderTime, connectionCount) {
    this.metrics.renderTime = renderTime;
    this.metrics.connectionCount = connectionCount;
    this.metrics.frameRate = 1000 / renderTime;
    this.metrics.memoryUsage = performance.memory ? performance.memory.usedJSHeapSize : 0;
  }

  getEstimatedConnectionCount() {
    // 估算连接数量，用于初始渲染器选择
    return this.maxConnections;
  }

  isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  // Observer pattern for performance notifications
  addObserver(callback) {
    this.observers.add(callback);
  }

  removeObserver(callback) {
    this.observers.delete(callback);
  }

  notifyObservers(event, data) {
    this.observers.forEach(callback => callback(event, data));
  }

  getMetrics() {
    return { ...this.metrics };
  }

  destroy() {
    if (this.currentRenderer) {
      this.currentRenderer.destroy();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.observers.clear();
  }
}

export default RenderingEngine;