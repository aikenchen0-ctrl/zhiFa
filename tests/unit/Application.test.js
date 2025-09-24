/**
 * Unit Tests for Application Core
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Application } from '../../src/core/Application.js';

// Mock PIXI
vi.mock('pixi.js', () => ({
  Application: class MockPixiApp {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.renderer = {
        type: 'webgl2',
        resolution: 1,
        resize: vi.fn(),
        gl: { pixelStorei: vi.fn() },
        texture: { gc: vi.fn() }
      };
      this.ticker = {
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        FPS: 60,
        deltaTime: 1,
        deltaMS: 16.67,
        maxFPS: 60
      };
      this.stage = {
        children: [],
        addChild: vi.fn(),
        removeChild: vi.fn()
      };
      this.screen = { width: 800, height: 600 };
    }
    
    async init() {
      return Promise.resolve();
    }
    
    destroy() {}
  }
}));

// Mock MobileOptimizer
vi.mock('../../src/core/MobileOptimizer.js', () => ({
  MobileOptimizer: class MockMobileOptimizer {
    constructor() {}
    async init() {}
    destroy() {}
  }
}));

// Mock DebugPanel
vi.mock('../../src/debug/DebugPanel.js', () => ({
  DebugPanel: class MockDebugPanel {
    constructor() {}
    init() {}
    destroy() {}
  }
}));

describe('Application', () => {
  let app;

  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    
    // Mock DOM methods
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    
    app = new Application();
  });

  afterEach(() => {
    if (app && app.isInitialized) {
      app.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should create application with default options', () => {
      expect(app.options.width).toBe(1024);
      expect(app.options.height).toBe(768);
      expect(app.options.resolution).toBe(2);
      expect(app.options.backgroundColor).toBe(0x1099bb);
      expect(app.isInitialized).toBe(false);
    });

    it('should create application with custom options', () => {
      const customApp = new Application({
        width: 500,
        height: 400,
        backgroundColor: 0xFF0000,
        resolution: 1,
        debug: true
      });
      
      expect(customApp.options.width).toBe(500);
      expect(customApp.options.height).toBe(400);
      expect(customApp.options.backgroundColor).toBe(0xFF0000);
      expect(customApp.options.resolution).toBe(1);
      expect(customApp.options.debug).toBe(true);
    });

    it('should detect mobile devices', () => {
      const originalUserAgent = navigator.userAgent;
      
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      });
      
      const mobileApp = new Application();
      expect(mobileApp.isMobile).toBe(true);
      
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true
      });
    });
  });

  describe('Initialization Process', () => {
    it('should initialize successfully', async () => {
      await app.init();
      
      expect(app.isInitialized).toBe(true);
      expect(app.app).toBeDefined();
      expect(app.performanceMetrics.initTime).toBeGreaterThan(0);
    });

    it('should mount canvas to DOM', async () => {
      await app.init();
      
      const canvas = document.querySelector('canvas');
      expect(canvas).not.toBeNull();
      expect(canvas.style.display).toBe('block');
      expect(canvas.style.width).toBe('100%');
      expect(canvas.style.height).toBe('100%');
    });

    it('should initialize mobile optimizer on mobile', async () => {
      app.isMobile = true;
      await app.init();
      
      expect(app.mobileOptimizer).toBeDefined();
    });

    it('should initialize debug panel in debug mode', async () => {
      app.options.debug = true;
      await app.init();
      
      expect(app.debugPanel).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      await app.init();
      const originalApp = app.app;
      
      await app.init(); // Second initialization
      
      expect(app.app).toBe(originalApp);
    });

    it('should handle initialization errors', async () => {
      // Mock PIXI Application to throw error
      vi.doMock('pixi.js', () => ({
        Application: class MockPixiApp {
          async init() {
            throw new Error('WebGL not supported');
          }
        }
      }));
      
      await expect(app.init()).rejects.toThrow('WebGL not supported');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should handle window resize', () => {
      const resizeSpy = vi.spyOn(app.app.renderer, 'resize');
      
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      expect(resizeSpy).toHaveBeenCalledWith(1200, 900);
    });

    it('should handle orientation change', (done) => {
      const resizeSpy = vi.spyOn(app.app.renderer, 'resize');
      
      Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1200, configurable: true });
      
      window.dispatchEvent(new Event('orientationchange'));
      
      // Orientation change has a 100ms delay
      setTimeout(() => {
        expect(resizeSpy).toHaveBeenCalledWith(900, 1200);
        done();
      }, 150);
    });

    it('should pause/resume on visibility change', () => {
      const stopSpy = vi.spyOn(app.app.ticker, 'stop');
      const startSpy = vi.spyOn(app.app.ticker, 'start');
      
      // Mock page as hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(stopSpy).toHaveBeenCalled();
      
      // Mock page as visible
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(startSpy).toHaveBeenCalled();
    });

    it('should handle memory warnings on mobile', async () => {
      const cleanupSpy = vi.spyOn(app, 'performMemoryCleanup');
      
      // Mock memory warning event
      window.dispatchEvent(new Event('memorywarning'));
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should track performance stats', () => {
      expect(app.stats).toBeDefined();
      expect(app.stats.fps).toBe(60);
      expect(app.stats.frameCount).toBe(0);
    });

    it('should update stats on ticker', () => {
      const tickerCallback = app.app.ticker.add.mock.calls[0][0];
      
      // Simulate ticker callback
      tickerCallback();
      
      expect(app.stats.frameCount).toBe(1);
      expect(app.stats.renderTime).toBeGreaterThan(0);
    });

    it('should collect memory usage metrics', () => {
      expect(Array.isArray(app.performanceMetrics.memoryUsage)).toBe(true);
      expect(Array.isArray(app.performanceMetrics.touchLatency)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should perform memory cleanup', () => {
      const gcSpy = vi.spyOn(app.app.renderer.texture, 'gc');
      
      app.performMemoryCleanup();
      
      expect(gcSpy).toHaveBeenCalled();
    });

    it('should limit performance metrics history', () => {
      // Fill memory usage with more than limit
      for (let i = 0; i < 150; i++) {
        app.performanceMetrics.memoryUsage.push({ timestamp: i, used: i });
      }
      
      app.performMemoryCleanup();
      
      expect(app.performanceMetrics.memoryUsage.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Public API', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should return application stats', () => {
      const stats = app.getStats();
      
      expect(stats.fps).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.performance).toBeDefined();
    });

    it('should add display objects to stage', () => {
      const mockDisplayObject = { type: 'Graphics' };
      
      app.addToStage(mockDisplayObject);
      
      expect(app.app.stage.addChild).toHaveBeenCalledWith(mockDisplayObject);
    });

    it('should remove display objects from stage', () => {
      const mockDisplayObject = { type: 'Graphics' };
      
      app.removeFromStage(mockDisplayObject);
      
      expect(app.app.stage.removeChild).toHaveBeenCalledWith(mockDisplayObject);
    });

    it('should throw when adding to stage before initialization', () => {
      const uninitializedApp = new Application();
      const mockDisplayObject = { type: 'Graphics' };
      
      expect(() => {
        uninitializedApp.addToStage(mockDisplayObject);
      }).toThrow('Application not initialized');
    });
  });

  describe('Destruction', () => {
    it('should destroy cleanly', async () => {
      await app.init();
      
      const destroySpy = vi.spyOn(app.app, 'destroy');
      
      app.destroy();
      
      expect(destroySpy).toHaveBeenCalledWith(true, {
        children: true,
        texture: true,
        baseTexture: true
      });
      expect(app.isInitialized).toBe(false);
    });

    it('should not throw when destroying uninitialized app', () => {
      const uninitializedApp = new Application();
      
      expect(() => {
        uninitializedApp.destroy();
      }).not.toThrow();
    });

    it('should destroy mobile optimizer and debug panel', async () => {
      app.isMobile = true;
      app.options.debug = true;
      await app.init();
      
      const mobileDestroySpy = vi.spyOn(app.mobileOptimizer, 'destroy');
      const debugDestroySpy = vi.spyOn(app.debugPanel, 'destroy');
      
      app.destroy();
      
      expect(mobileDestroySpy).toHaveBeenCalled();
      expect(debugDestroySpy).toHaveBeenCalled();
    });
  });

  describe('Mobile-Specific Features', () => {
    it('should apply mobile optimizations', async () => {
      app.isMobile = true;
      
      await app.init();
      
      expect(app.mobileOptimizer).toBeDefined();
    });

    it('should cap resolution on mobile devices', async () => {
      app.isMobile = true;
      Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
      
      await app.init();
      
      // Resolution should be capped at 2x for mobile
      expect(app.app.renderer.resolution).toBeLessThanOrEqual(2);
    });
  });
});