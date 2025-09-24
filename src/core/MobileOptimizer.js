/**
 * Mobile Optimization System for PixiJS Applications
 * Handles device-specific optimizations and performance tuning
 */

import { Logger, logger } from '../utils/Logger.js';

export class MobileOptimizer {
  constructor(pixiApp) {
    this.app = pixiApp;
    this.deviceInfo = this.detectDevice();
    this.optimizations = {
      textureOptimization: true,
      renderOptimization: true,
      touchOptimization: true,
      memoryOptimization: true,
      powerOptimization: true
    };

    logger.info(Logger.LOG_CATEGORIES.MOBILE, 'MobileOptimizer created', this.deviceInfo);
  }

  detectDevice() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      devicePixelRatio: window.devicePixelRatio || 1,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      touchSupport: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
      memory: navigator.deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown',
      gpu: gl ? gl.getParameter(gl.RENDERER) : 'unknown'
    };

    // Detect specific devices/browsers
    deviceInfo.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    deviceInfo.isAndroid = /Android/.test(navigator.userAgent);
    deviceInfo.isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    deviceInfo.isChrome = /Chrome/.test(navigator.userAgent);
    deviceInfo.isOldDevice = this.detectOldDevice();
    deviceInfo.isLowEnd = this.detectLowEndDevice(deviceInfo);

    canvas.remove();
    return deviceInfo;
  }

  detectOldDevice() {
    const ua = navigator.userAgent;
    
    // Check for old iOS versions
    const iosMatch = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (iosMatch && parseInt(iosMatch[1]) < 13) {
      return true;
    }

    // Check for old Android versions
    const androidMatch = ua.match(/Android (\d+)\.(\d+)/);
    if (androidMatch && (parseInt(androidMatch[1]) < 8 || 
        (parseInt(androidMatch[1]) === 8 && parseInt(androidMatch[2]) < 1))) {
      return true;
    }

    return false;
  }

  detectLowEndDevice(deviceInfo) {
    return (
      deviceInfo.memory && deviceInfo.memory <= 2 ||
      deviceInfo.cores && deviceInfo.cores <= 2 ||
      deviceInfo.devicePixelRatio < 2 ||
      deviceInfo.isOldDevice
    );
  }

  async init() {
    logger.startPerformanceMark('mobile-optimization');

    try {
      // Apply optimizations based on device capabilities
      await this.applyTextureOptimizations();
      await this.applyRenderOptimizations();
      await this.applyTouchOptimizations();
      await this.applyMemoryOptimizations();
      await this.applyPowerOptimizations();

      const optimizationTime = logger.endPerformanceMark('mobile-optimization');
      
      logger.info(Logger.LOG_CATEGORIES.MOBILE, 
        `Mobile optimizations applied in ${optimizationTime.toFixed(2)}ms`, {
        deviceInfo: this.deviceInfo,
        optimizations: this.optimizations
      });

    } catch (error) {
      logger.error(Logger.LOG_CATEGORIES.MOBILE, 'Failed to apply mobile optimizations', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async applyTextureOptimizations() {
    if (!this.optimizations.textureOptimization) return;

    const renderer = this.app.renderer;
    
    // Set texture cache limits based on device memory
    const maxTextures = this.deviceInfo.isLowEnd ? 128 : 256;
    renderer.texture.maxIdleFrames = this.deviceInfo.isLowEnd ? 30 : 60;

    // Configure texture formats for mobile
    if (this.deviceInfo.isLowEnd) {
      // Use compressed textures when possible
      renderer.texture.defaultOptions.format = 'rgba8unorm';
      renderer.texture.defaultOptions.type = 'uint8';
    }

    // Enable texture garbage collection
    setInterval(() => {
      renderer.texture.gc();
      logger.debug(Logger.LOG_CATEGORIES.MOBILE, 'Texture garbage collection executed');
    }, this.deviceInfo.isLowEnd ? 30000 : 60000);

    logger.debug(Logger.LOG_CATEGORIES.MOBILE, 'Texture optimizations applied', {
      maxTextures,
      maxIdleFrames: renderer.texture.maxIdleFrames
    });
  }

  async applyRenderOptimizations() {
    if (!this.optimizations.renderOptimization) return;

    const renderer = this.app.renderer;

    // Optimize render settings for mobile
    if (this.deviceInfo.isLowEnd) {
      // Reduce resolution for low-end devices
      const targetResolution = Math.min(this.deviceInfo.devicePixelRatio, 1.5);
      renderer.resolution = targetResolution;
      
      // Disable expensive rendering features
      renderer.antialias = false;
      renderer.preserveDrawingBuffer = false;
    }

    // Configure batch renderer for mobile
    renderer.batch.maxTextures = this.deviceInfo.isLowEnd ? 8 : 16;

    // Optimize for specific browsers/devices
    if (this.deviceInfo.isSafari) {
      // Safari-specific optimizations
      renderer.backgroundAlpha = 1; // Avoid transparent canvas issues
    }

    logger.debug(Logger.LOG_CATEGORIES.MOBILE, 'Render optimizations applied', {
      resolution: renderer.resolution,
      antialias: renderer.antialias,
      maxTextures: renderer.batch.maxTextures
    });
  }

  async applyTouchOptimizations() {
    if (!this.optimizations.touchOptimization) return;

    // Prevent default touch behaviors that interfere with app
    const canvas = this.app.canvas;
    
    // Prevent pinch zoom
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Add touch-action CSS to prevent browser touch handling
    canvas.style.touchAction = 'none';
    canvas.style.msTouchAction = 'none';

    // Optimize touch event handling
    this.setupTouchEventOptimization();

    logger.debug(Logger.LOG_CATEGORIES.MOBILE, 'Touch optimizations applied');
  }

  setupTouchEventOptimization() {
    let touchStartTime = 0;
    let lastTouchTime = 0;

    this.app.canvas.addEventListener('touchstart', (e) => {
      touchStartTime = performance.now();
      lastTouchTime = touchStartTime;
      
      logger.debug(Logger.LOG_CATEGORIES.TOUCH, 'Touch start detected', {
        touches: e.touches.length,
        timestamp: touchStartTime
      });
    }, { passive: true });

    this.app.canvas.addEventListener('touchend', (e) => {
      const touchEndTime = performance.now();
      const touchDuration = touchEndTime - touchStartTime;
      const timeSinceLastTouch = touchEndTime - lastTouchTime;
      
      logger.debug(Logger.LOG_CATEGORIES.TOUCH, 'Touch end detected', {
        duration: touchDuration,
        timeSinceLastTouch,
        remainingTouches: e.touches.length
      });
      
      lastTouchTime = touchEndTime;
    }, { passive: true });
  }

  async applyMemoryOptimizations() {
    if (!this.optimizations.memoryOptimization) return;

    // Set up aggressive garbage collection for low-end devices
    if (this.deviceInfo.isLowEnd) {
      setInterval(() => {
        this.performMemoryCleanup();
      }, 15000); // Every 15 seconds for low-end devices
    } else {
      setInterval(() => {
        this.performMemoryCleanup();
      }, 30000); // Every 30 seconds for regular devices
    }

    // Monitor memory usage
    this.setupMemoryMonitoring();

    logger.debug(Logger.LOG_CATEGORIES.MOBILE, 'Memory optimizations applied');
  }

  performMemoryCleanup() {
    // Clear texture cache
    this.app.renderer.texture.gc();
    
    // Clear shader cache if available
    if (this.app.renderer.shader && this.app.renderer.shader.gc) {
      this.app.renderer.shader.gc();
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    logger.debug(Logger.LOG_CATEGORIES.MEMORY, 'Memory cleanup performed');
  }

  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usage > 0.8) {
          logger.warn(Logger.LOG_CATEGORIES.MEMORY, 'High memory usage detected', {
            used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB',
            usage: Math.round(usage * 100) + '%'
          });
          
          // Trigger aggressive cleanup
          this.performMemoryCleanup();
        }
      }, 10000);
    }
  }

  async applyPowerOptimizations() {
    if (!this.optimizations.powerOptimization) return;

    // Reduce frame rate when app is not focused
    let isAppFocused = true;
    let originalMaxFPS = this.app.ticker.maxFPS;

    const handleVisibilityChange = () => {
      if (document.hidden && isAppFocused) {
        this.app.ticker.maxFPS = 15; // Reduce to 15fps when hidden
        isAppFocused = false;
        logger.info(Logger.LOG_CATEGORIES.MOBILE, 'App backgrounded - reducing FPS to 15');
      } else if (!document.hidden && !isAppFocused) {
        this.app.ticker.maxFPS = originalMaxFPS;
        isAppFocused = true;
        logger.info(Logger.LOG_CATEGORIES.MOBILE, 'App foregrounded - restoring normal FPS');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Adaptive frame rate based on performance
    this.setupAdaptiveFrameRate();

    logger.debug(Logger.LOG_CATEGORIES.MOBILE, 'Power optimizations applied');
  }

  setupAdaptiveFrameRate() {
    let frameTimeHistory = [];
    const maxHistoryLength = 60; // Track last 60 frames

    this.app.ticker.add(() => {
      const frameTime = this.app.ticker.deltaMS;
      frameTimeHistory.push(frameTime);
      
      if (frameTimeHistory.length > maxHistoryLength) {
        frameTimeHistory.shift();
      }

      // Check performance every second
      if (frameTimeHistory.length === maxHistoryLength) {
        const avgFrameTime = frameTimeHistory.reduce((a, b) => a + b) / frameTimeHistory.length;
        const targetFrameTime = 1000 / 60; // 60fps target
        
        if (avgFrameTime > targetFrameTime * 1.5 && this.deviceInfo.isLowEnd) {
          // Performance is poor, reduce max FPS
          this.app.ticker.maxFPS = Math.max(30, this.app.ticker.maxFPS * 0.9);
          logger.warn(Logger.LOG_CATEGORIES.MOBILE, 'Performance degraded - reducing max FPS', {
            avgFrameTime: avgFrameTime.toFixed(2),
            newMaxFPS: this.app.ticker.maxFPS
          });
        }
        
        frameTimeHistory = []; // Reset history
      }
    });
  }

  // Public methods
  getDeviceInfo() {
    return { ...this.deviceInfo };
  }

  enableOptimization(optimization) {
    if (optimization in this.optimizations) {
      this.optimizations[optimization] = true;
      logger.info(Logger.LOG_CATEGORIES.MOBILE, `Enabled optimization: ${optimization}`);
    }
  }

  disableOptimization(optimization) {
    if (optimization in this.optimizations) {
      this.optimizations[optimization] = false;
      logger.info(Logger.LOG_CATEGORIES.MOBILE, `Disabled optimization: ${optimization}`);
    }
  }

  destroy() {
    logger.info(Logger.LOG_CATEGORIES.MOBILE, 'MobileOptimizer destroyed');
    // Cleanup any intervals or event listeners if needed
  }
}