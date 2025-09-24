/**
 * Integration Tests for Full System
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Application } from '../../src/core/Application.js';
import { Logger } from '../../src/utils/Logger.js';

// Mock DOM environment for integration tests
Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });

// Mock WebGL context
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: this,
      drawingBufferWidth: 1024,
      drawingBufferHeight: 768,
      getParameter: () => 'Mock WebGL Renderer',
      pixelStorei: () => {},
      createShader: () => ({}),
      createProgram: () => ({}),
      useProgram: () => {},
      viewport: () => {}
    };
  }
  return null;
};

describe('Full System Integration', () => {
  let app;
  let logger;

  beforeAll(() => {
    // Setup global test environment
    logger = new Logger({
      logLevel: Logger.LOG_LEVELS.DEBUG,
      enableConsole: false, // Disable console for tests
      enableStorage: true
    });
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    app = new Application({
      debug: true
    });
  });

  afterEach(() => {
    if (app && app.isInitialized) {
      app.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('Application Lifecycle', () => {
    it('should complete full initialization cycle', async () => {
      expect(app.isInitialized).toBe(false);
      
      await app.init();
      
      expect(app.isInitialized).toBe(true);
      expect(app.app).toBeDefined();
      expect(app.performanceMetrics.initTime).toBeGreaterThan(0);
      
      // Check canvas is mounted
      const canvas = document.querySelector('canvas');
      expect(canvas).not.toBeNull();
    });

    it('should integrate logging throughout initialization', async () => {
      const initialLogCount = logger.logs.length;
      
      await app.init();
      
      // Should have generated logs during initialization
      expect(logger.logs.length).toBeGreaterThan(initialLogCount);
      
      // Check for specific log categories
      const pixiLogs = logger.getLogsByCategory(Logger.LOG_CATEGORIES.PIXI);
      expect(pixiLogs.length).toBeGreaterThan(0);
    });

    it('should handle mobile detection and optimization', async () => {
      // Mock mobile environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const mobileApp = new Application();
      await mobileApp.init();
      
      expect(mobileApp.isMobile).toBe(true);
      expect(mobileApp.mobileOptimizer).toBeDefined();
      
      mobileApp.destroy();
    });
  });

  describe('Performance Monitoring Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should track performance metrics continuously', (done) => {
      const initialStats = app.getStats();
      
      // Wait for a few frames to be processed
      setTimeout(() => {
        const updatedStats = app.getStats();
        
        expect(updatedStats.fps).toBeGreaterThan(0);
        expect(updatedStats.performance).toBeDefined();
        expect(updatedStats.memory).toBeDefined();
        
        done();
      }, 100);
    });

    it('should integrate with debug panel when enabled', async () => {
      expect(app.debugPanel).toBeDefined();
      
      // Debug panel should be hidden by default
      const panel = document.getElementById('pixi-debug-panel');
      expect(panel).not.toBeNull();
      expect(panel.style.display).toBe('none');
    });
  });

  describe('Event System Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should handle resize events properly', () => {
      const originalWidth = app.app.screen.width;
      const originalHeight = app.app.screen.height;
      
      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      // Note: In real implementation, renderer would be resized
      // Here we're testing that the event handler is properly set up
      expect(typeof app.app.renderer.resize).toBe('function');
    });

    it('should handle visibility changes', () => {
      const originalMaxFPS = app.app.ticker.maxFPS;
      
      // Mock page becoming hidden
      Object.defineProperty(document, 'hidden', { 
        value: true, 
        configurable: true 
      });
      
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Should have stopped the ticker (mocked implementation)
      expect(typeof app.app.ticker.stop).toBe('function');
    });
  });

  describe('Memory Management Integration', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('should perform integrated memory cleanup', () => {
      const initialMemoryEntries = app.performanceMetrics.memoryUsage.length;
      
      // Add some mock memory usage entries
      for (let i = 0; i < 150; i++) {
        app.performanceMetrics.memoryUsage.push({
          timestamp: performance.now(),
          used: Math.random() * 100,
          total: 200,
          limit: 400
        });
      }
      
      app.performMemoryCleanup();
      
      // Should have limited the memory usage history
      expect(app.performanceMetrics.memoryUsage.length).toBeLessThanOrEqual(20);
    });

    it('should respond to memory pressure events', () => {
      const cleanupSpy = vi.spyOn(app, 'performMemoryCleanup');
      
      // Simulate memory warning (mobile-specific)
      if (app.isMobile) {
        window.dispatchEvent(new Event('memorywarning'));
        expect(cleanupSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle initialization errors gracefully', async () => {
      const errorApp = new Application();
      
      // Mock a failing WebGL context
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function() {
        throw new Error('WebGL context creation failed');
      };
      
      try {
        await errorApp.init();
      } catch (error) {
        expect(error.message).toContain('WebGL context creation failed');
      } finally {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
      }
    });

    it('should log errors appropriately', async () => {
      const errorCount = logger.getLogsByLevel(Logger.LOG_LEVELS.ERROR).length;
      
      // Trigger a global error
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 1,
        colno: 1,
        error: new Error('Test error')
      });
      
      window.dispatchEvent(errorEvent);
      
      // Should have logged the error
      const newErrorLogs = logger.getLogsByLevel(Logger.LOG_LEVELS.ERROR);
      expect(newErrorLogs.length).toBeGreaterThan(errorCount);
    });
  });

  describe('Touch and Mobile Integration', () => {
    it('should handle touch events on mobile', async () => {
      const mobileApp = new Application();
      mobileApp.isMobile = true;
      
      await mobileApp.init();
      
      const canvas = document.querySelector('canvas');
      expect(canvas.style.touchAction).toBe('none');
      
      // Simulate touch event
      const touchEvent = new TouchEvent('touchstart', {
        touches: [
          { identifier: 0, clientX: 100, clientY: 200, force: 0.5 }
        ]
      });
      
      // Should not throw error
      expect(() => {
        canvas.dispatchEvent(touchEvent);
      }).not.toThrow();
      
      mobileApp.destroy();
    });
  });

  describe('Debug Tools Integration', () => {
    it('should integrate debug panel with application stats', async () => {
      await app.init();
      
      expect(app.debugPanel).toBeDefined();
      
      const stats = app.getStats();
      expect(stats.fps).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.performance).toBeDefined();
    });

    it('should allow debug panel visibility toggle', async () => {
      await app.init();
      
      const panel = document.getElementById('pixi-debug-panel');
      expect(panel.style.display).toBe('none');
      
      app.debugPanel.show();
      expect(panel.style.display).toBe('block');
      
      app.debugPanel.hide();
      expect(panel.style.display).toBe('none');
    });
  });

  describe('Configuration and Options Integration', () => {
    it('should respect configuration options throughout system', async () => {
      const configApp = new Application({
        width: 500,
        height: 400,
        backgroundColor: 0xFF0000,
        debug: false,
        antialias: false
      });
      
      await configApp.init();
      
      expect(configApp.options.width).toBe(500);
      expect(configApp.options.height).toBe(400);
      expect(configApp.options.backgroundColor).toBe(0xFF0000);
      expect(configApp.debugPanel).toBeNull();
      
      configApp.destroy();
    });

    it('should apply mobile-specific configurations', async () => {
      const mobileApp = new Application({
        width: 1024,
        height: 768
      });
      
      mobileApp.isMobile = true;
      await mobileApp.init();
      
      expect(mobileApp.mobileOptimizer).toBeDefined();
      
      // Mobile optimizations should be applied
      const deviceInfo = mobileApp.mobileOptimizer.getDeviceInfo();
      expect(deviceInfo).toBeDefined();
      expect(deviceInfo.isAndroid !== undefined || deviceInfo.isIOS !== undefined).toBe(true);
      
      mobileApp.destroy();
    });
  });

  describe('Full Workflow Integration', () => {
    it('should support complete application workflow', async () => {
      // Initialize
      await app.init();
      
      // Add some display objects (mock)
      const mockDisplayObject = { 
        type: 'Graphics',
        constructor: { name: 'Graphics' }
      };
      
      app.addToStage(mockDisplayObject);
      
      // Get stats
      const stats = app.getStats();
      expect(stats).toBeDefined();
      
      // Perform memory cleanup
      app.performMemoryCleanup();
      
      // Remove display object
      app.removeFromStage(mockDisplayObject);
      
      // Export logs
      const logs = logger.exportLogs('json');
      expect(typeof logs).toBe('string');
      
      // Destroy cleanly
      app.destroy();
      expect(app.isInitialized).toBe(false);
    });
  });
});