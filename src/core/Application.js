/**
 * Main Application Entry Point for PixiJS v8 Mobile Framework
 * Handles initialization, mobile optimization, and debugging integration
 */

import * as PIXI from 'pixi.js';
import { Logger, logger } from '../utils/Logger.js';
import { MobileOptimizer } from './MobileOptimizer.js';
import { DebugPanel } from '../debug/DebugPanel.js';

export class Application {
  constructor(options = {}) {
    this.options = {
      width: options.width || window.innerWidth,
      height: options.height || window.innerHeight,
      backgroundColor: options.backgroundColor || 0x1099bb,
      resolution: options.resolution || window.devicePixelRatio || 1,
      antialias: options.antialias ?? true,
      autoResize: options.autoResize ?? true,
      debug: options.debug ?? (process.env.NODE_ENV === 'development'),
      ...options
    };

    this.app = null;
    this.mobileOptimizer = null;
    this.debugPanel = null;
    this.isInitialized = false;
    this.stats = {
      frameCount: 0,
      lastFpsUpdate: 0,
      fps: 60,
      renderTime: 0,
      updateTime: 0
    };

    // Mobile detection
    this.isMobile = this.detectMobile();
    
    // Performance tracking
    this.performanceMetrics = {
      initTime: 0,
      avgFrameTime: 0,
      memoryUsage: [],
      touchLatency: []
    };

    logger.info(Logger.LOG_CATEGORIES.PIXI, 'Application instance created', {
      isMobile: this.isMobile,
      options: this.options
    });
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }

  async init() {
    if (this.isInitialized) {
      logger.warn(Logger.LOG_CATEGORIES.PIXI, 'Application already initialized');
      return this.app;
    }

    logger.startPerformanceMark('app-init');
    
    try {
      // Create PIXI application with mobile-optimized settings
      await this.createPixiApp();
      
      // Setup mobile optimizations
      if (this.isMobile) {
        this.mobileOptimizer = new MobileOptimizer(this.app);
        await this.mobileOptimizer.init();
      }

      // Setup debug tools in development
      if (this.options.debug) {
        this.debugPanel = new DebugPanel(this.app, logger);
        this.debugPanel.init();
      }

      // Setup event listeners
      this.setupEventListeners();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      this.isInitialized = true;
      
      const initTime = logger.endPerformanceMark('app-init');
      this.performanceMetrics.initTime = initTime;
      
      logger.info(Logger.LOG_CATEGORIES.PIXI, `Application initialized successfully in ${initTime.toFixed(2)}ms`, {
        renderer: this.app.renderer.type,
        resolution: this.app.renderer.resolution,
        size: { width: this.app.screen.width, height: this.app.screen.height }
      });

      return this.app;

    } catch (error) {
      logger.error(Logger.LOG_CATEGORIES.PIXI, 'Failed to initialize application', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async createPixiApp() {
    // Mobile-specific optimizations
    const pixiOptions = {
      ...this.options,
      preference: this.isMobile ? 'webgl2' : 'webgl',
      powerPreference: this.isMobile ? 'high-performance' : 'default',
      
      // Mobile performance optimizations
      ...(this.isMobile && {
        resolution: Math.min(window.devicePixelRatio, 2), // Cap at 2x for performance
        antialias: false, // Disable for better mobile performance
        preserveDrawingBuffer: false,
        clearBeforeRender: true,
        backgroundAlpha: 1
      })
    };

    logger.debug(Logger.LOG_CATEGORIES.PIXI, 'Creating PIXI application', pixiOptions);

    this.app = new PIXI.Application();
    await this.app.init(pixiOptions);

    // Configure renderer for mobile
    if (this.isMobile) {
      this.app.renderer.gl.pixelStorei(this.app.renderer.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }

    // Mount to DOM
    const canvas = this.app.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    document.body.appendChild(canvas);
  }

  setupEventListeners() {
    // Resize handling
    if (this.options.autoResize) {
      const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.app.renderer.resize(width, height);
        
        logger.debug(Logger.LOG_CATEGORIES.PIXI, 'Application resized', { width, height });
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 100); // Delay for mobile orientation change
      });
    }

    // Mobile-specific touch event logging
    if (this.isMobile) {
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(eventType => {
        this.app.canvas.addEventListener(eventType, (event) => {
          logger.logTouchEvent(eventType, event);
        }, { passive: true });
      });
    }

    // Page visibility for performance optimization
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.app.ticker.stop();
        logger.info(Logger.LOG_CATEGORIES.PIXI, 'Application paused (page hidden)');
      } else {
        this.app.ticker.start();
        logger.info(Logger.LOG_CATEGORIES.PIXI, 'Application resumed (page visible)');
      }
    });

    // Memory pressure handling for mobile
    if ('onmemorywarning' in window) {
      window.addEventListener('memorywarning', () => {
        logger.warn(Logger.LOG_CATEGORIES.MEMORY, 'Memory warning received - triggering cleanup');
        this.performMemoryCleanup();
      });
    }
  }

  setupPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFpsUpdate = 0;

    this.app.ticker.add(() => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      
      frameCount++;
      this.stats.frameCount = frameCount;
      this.stats.renderTime = deltaTime;

      // Update FPS every second
      if (now - lastFpsUpdate >= 1000) {
        this.stats.fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;

        // Log performance stats periodically
        if (this.stats.frameCount % 300 === 0) { // Every 5 seconds at 60fps
          logger.logPixiStats(this.app);
          logger.logMemoryUsage('periodic check');
        }
      }

      lastTime = now;
    });

    // Monitor memory usage periodically
    setInterval(() => {
      const memInfo = logger.getMemoryInfo();
      if (memInfo) {
        this.performanceMetrics.memoryUsage.push({
          timestamp: performance.now(),
          ...memInfo
        });

        // Keep only last 100 entries
        if (this.performanceMetrics.memoryUsage.length > 100) {
          this.performanceMetrics.memoryUsage.shift();
        }

        // Warn on high memory usage
        if (memInfo.used > memInfo.limit * 0.8) {
          logger.warn(Logger.LOG_CATEGORIES.MEMORY, 'High memory usage detected', memInfo);
        }
      }
    }, 5000);
  }

  performMemoryCleanup() {
    logger.startPerformanceMark('memory-cleanup');

    // Clear unused textures
    this.app.renderer.texture.gc();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Clear old performance metrics
    this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-20);
    this.performanceMetrics.touchLatency = this.performanceMetrics.touchLatency.slice(-50);

    const cleanupTime = logger.endPerformanceMark('memory-cleanup');
    logger.info(Logger.LOG_CATEGORIES.MEMORY, `Memory cleanup completed in ${cleanupTime.toFixed(2)}ms`);
  }

  // Public API methods
  getStats() {
    return {
      ...this.stats,
      memory: logger.getMemoryInfo(),
      performance: this.performanceMetrics
    };
  }

  addToStage(displayObject) {
    if (!this.isInitialized) {
      throw new Error('Application not initialized. Call init() first.');
    }
    this.app.stage.addChild(displayObject);
    logger.debug(Logger.LOG_CATEGORIES.PIXI, 'Display object added to stage', {
      type: displayObject.constructor.name
    });
  }

  removeFromStage(displayObject) {
    if (!this.isInitialized) return;
    this.app.stage.removeChild(displayObject);
    logger.debug(Logger.LOG_CATEGORIES.PIXI, 'Display object removed from stage');
  }

  destroy() {
    if (!this.isInitialized) return;

    logger.info(Logger.LOG_CATEGORIES.PIXI, 'Destroying application');

    if (this.debugPanel) {
      this.debugPanel.destroy();
    }

    if (this.mobileOptimizer) {
      this.mobileOptimizer.destroy();
    }

    this.app.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true
    });

    this.isInitialized = false;
  }
}

// Export default instance for convenience
export const app = new Application();

// Global error handling for PIXI
PIXI.utils.skipHello();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.PIXIApp = app;
}