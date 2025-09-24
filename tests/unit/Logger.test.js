/**
 * Unit Tests for Logger System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/Logger.js';

describe('Logger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      trace: vi.spyOn(console, 'trace').mockImplementation(() => {})
    };

    logger = new Logger({
      logLevel: Logger.LOG_LEVELS.DEBUG,
      enableConsole: true,
      enableStorage: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.clearLogs();
  });

  describe('Initialization', () => {
    it('should create logger with default options', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger.logLevel).toBe(Logger.LOG_LEVELS.INFO);
      expect(defaultLogger.enableConsole).toBe(true);
      expect(defaultLogger.enableStorage).toBe(false);
    });

    it('should create logger with custom options', () => {
      const customLogger = new Logger({
        logLevel: Logger.LOG_LEVELS.ERROR,
        enableConsole: false,
        enableStorage: true,
        maxStorageEntries: 500
      });
      
      expect(customLogger.logLevel).toBe(Logger.LOG_LEVELS.ERROR);
      expect(customLogger.enableConsole).toBe(false);
      expect(customLogger.enableStorage).toBe(true);
      expect(customLogger.maxStorageEntries).toBe(500);
    });

    it('should detect mobile devices', () => {
      const originalUserAgent = navigator.userAgent;
      
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      });
      
      const mobileLogger = new Logger();
      expect(mobileLogger.isMobile).toBe(true);
      
      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true
      });
    });
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      logger.logLevel = Logger.LOG_LEVELS.WARN;
      
      logger.error('TEST', 'Error message');
      logger.warn('TEST', 'Warn message');
      logger.info('TEST', 'Info message'); // Should be filtered
      logger.debug('TEST', 'Debug message'); // Should be filtered
      
      expect(consoleSpy.error).toHaveBeenCalledOnce();
      expect(consoleSpy.warn).toHaveBeenCalledOnce();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should log all levels when set to TRACE', () => {
      logger.logLevel = Logger.LOG_LEVELS.TRACE;
      
      logger.error('TEST', 'Error message');
      logger.warn('TEST', 'Warn message');
      logger.info('TEST', 'Info message');
      logger.debug('TEST', 'Debug message');
      logger.trace('TEST', 'Trace message');
      
      expect(consoleSpy.error).toHaveBeenCalledOnce();
      expect(consoleSpy.warn).toHaveBeenCalledOnce();
      expect(consoleSpy.info).toHaveBeenCalledOnce();
      expect(consoleSpy.debug).toHaveBeenCalledOnce();
      expect(consoleSpy.trace).toHaveBeenCalledOnce();
    });
  });

  describe('Log Storage', () => {
    it('should store logs when enabled', () => {
      expect(logger.logs).toHaveLength(0);
      
      logger.info('TEST', 'Test message');
      
      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].message).toBe('Test message');
      expect(logger.logs[0].category).toBe('TEST');
    });

    it('should limit stored logs to maxStorageEntries', () => {
      logger.maxStorageEntries = 3;
      
      logger.info('TEST', 'Message 1');
      logger.info('TEST', 'Message 2');
      logger.info('TEST', 'Message 3');
      logger.info('TEST', 'Message 4');
      
      expect(logger.logs).toHaveLength(3);
      expect(logger.logs[0].message).toBe('Message 2'); // First one should be removed
      expect(logger.logs[2].message).toBe('Message 4');
    });

    it('should include memory info when available', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 1048576,
          totalJSHeapSize: 2097152,
          jsHeapSizeLimit: 4194304
        },
        configurable: true
      });
      
      logger.info('TEST', 'Test message');
      
      expect(logger.logs[0].memory).toBeDefined();
      expect(logger.logs[0].memory.used).toBe(1); // 1MB
      expect(logger.logs[0].memory.total).toBe(2); // 2MB
      expect(logger.logs[0].memory.limit).toBe(4); // 4MB
    });
  });

  describe('Performance Marking', () => {
    it('should create and measure performance marks', () => {
      const markSpy = vi.spyOn(performance, 'mark');
      const measureSpy = vi.spyOn(performance, 'measure');
      
      logger.startPerformanceMark('test-operation');
      expect(markSpy).toHaveBeenCalledWith('test-operation-start');
      
      const duration = logger.endPerformanceMark('test-operation');
      expect(markSpy).toHaveBeenCalledWith('test-operation-end');
      expect(measureSpy).toHaveBeenCalledWith('test-operation', 'test-operation-start', 'test-operation-end');
      expect(typeof duration).toBe('number');
    });

    it('should warn when ending non-existent performance mark', () => {
      logger.endPerformanceMark('non-existent');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance mark non-existent not found')
      );
    });
  });

  describe('Touch Event Logging', () => {
    it('should log touch events on mobile', () => {
      logger.isMobile = true;
      
      const mockTouchEvent = {
        type: 'touchstart',
        touches: [
          { identifier: 0, clientX: 100, clientY: 200, force: 0.5 }
        ],
        target: { tagName: 'CANVAS' }
      };
      
      logger.logTouchEvent('touchstart', mockTouchEvent);
      
      expect(logger.touchEvents).toHaveLength(1);
      expect(logger.touchEvents[0].type).toBe('touchstart');
      expect(logger.touchEvents[0].touches[0].x).toBe(100);
      expect(logger.touchEvents[0].touches[0].y).toBe(200);
    });

    it('should not log touch events on non-mobile', () => {
      logger.isMobile = false;
      
      const mockTouchEvent = {
        type: 'touchstart',
        touches: [{ identifier: 0, clientX: 100, clientY: 200 }]
      };
      
      logger.logTouchEvent('touchstart', mockTouchEvent);
      
      expect(logger.touchEvents).toHaveLength(0);
    });

    it('should limit touch event history', () => {
      logger.isMobile = true;
      
      // Add 105 touch events (more than the 100 limit)
      for (let i = 0; i < 105; i++) {
        logger.logTouchEvent('touchmove', {
          touches: [{ identifier: 0, clientX: i, clientY: i }],
          target: { tagName: 'CANVAS' }
        });
      }
      
      expect(logger.touchEvents).toHaveLength(100);
      expect(logger.touchEvents[0].touches[0].x).toBe(5); // First 5 should be removed
    });
  });

  describe('PIXI Stats Logging', () => {
    it('should log PIXI application stats', () => {
      const mockApp = {
        ticker: {
          FPS: 60,
          deltaTime: 1
        },
        renderer: {
          gl: { drawCalls: 10 },
          texture: { managedTextures: new Array(5) }
        },
        stage: {
          children: new Array(3)
        }
      };
      
      const stats = logger.logPixiStats(mockApp);
      
      expect(stats.fps).toBe(60);
      expect(stats.deltaTime).toBe(1);
      expect(stats.drawCalls).toBe(10);
      expect(stats.textureUploads).toBe(5);
      expect(stats.geometryCount).toBe(3);
    });

    it('should handle missing PIXI app gracefully', () => {
      const stats = logger.logPixiStats(null);
      expect(stats).toBeUndefined();
    });
  });

  describe('Log Export', () => {
    beforeEach(() => {
      logger.info('TEST', 'Message 1');
      logger.warn('TEST', 'Message 2');
      logger.error('TEST', 'Message 3');
    });

    it('should export logs as JSON', () => {
      const exported = logger.exportLogs('json');
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].message).toBe('Message 1');
      expect(parsed[2].message).toBe('Message 3');
    });

    it('should export logs as CSV', () => {
      const exported = logger.exportLogs('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toBe('"timestamp","level","category","message"');
      expect(lines).toHaveLength(4); // Header + 3 log entries
      expect(lines[1]).toContain('"Message 1"');
    });

    it('should return raw logs for unknown format', () => {
      const exported = logger.exportLogs('unknown');
      expect(Array.isArray(exported)).toBe(true);
      expect(exported).toHaveLength(3);
    });
  });

  describe('Log Filtering', () => {
    beforeEach(() => {
      logger.error('CATEGORY1', 'Error message');
      logger.warn('CATEGORY2', 'Warn message');
      logger.info('CATEGORY1', 'Info message');
    });

    it('should filter logs by category', () => {
      const category1Logs = logger.getLogsByCategory('CATEGORY1');
      expect(category1Logs).toHaveLength(2);
      expect(category1Logs[0].level).toBe(Logger.LOG_LEVELS.ERROR);
      expect(category1Logs[1].level).toBe(Logger.LOG_LEVELS.INFO);
    });

    it('should filter logs by level', () => {
      const errorLogs = logger.getLogsByLevel(Logger.LOG_LEVELS.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage when available', () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10485760, // 10MB
          totalJSHeapSize: 20971520, // 20MB
          jsHeapSizeLimit: 41943040  // 40MB
        },
        configurable: true
      });
      
      logger.logMemoryUsage('test context');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Memory usage (test context): 10MB / 40MB')
      );
    });

    it('should handle missing memory API gracefully', () => {
      // Remove memory property
      delete performance.memory;
      
      logger.logMemoryUsage('test context');
      
      // Should not throw and should not log anything
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('Clear Logs', () => {
    it('should clear all stored data', () => {
      logger.info('TEST', 'Test message');
      logger.logTouchEvent('touchstart', {
        touches: [{ identifier: 0, clientX: 100, clientY: 200 }],
        target: { tagName: 'CANVAS' }
      });
      logger.startPerformanceMark('test');
      
      expect(logger.logs.length).toBeGreaterThan(0);
      expect(logger.touchEvents.length).toBeGreaterThan(0);
      expect(logger.performanceMarks.size).toBeGreaterThan(0);
      
      logger.clearLogs();
      
      expect(logger.logs).toHaveLength(1); // Clear operation creates a log entry
      expect(logger.touchEvents).toHaveLength(0);
      expect(logger.performanceMarks.size).toBe(0);
    });
  });
});