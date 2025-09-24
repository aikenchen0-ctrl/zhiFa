/**
 * Performance Benchmark Suite for PixiJS Mobile Framework
 */

import { performance } from 'perf_hooks';
import { Application } from '../../src/core/Application.js';
import { Logger } from '../../src/utils/Logger.js';

// Mock browser environment for Node.js testing
global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 2,
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.document = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  addEventListener: () => {},
  hidden: false
};

global.navigator = {
  userAgent: 'Node.js Test Environment',
  platform: 'test',
  maxTouchPoints: 0,
  deviceMemory: 8,
  hardwareConcurrency: 8
};

global.HTMLCanvasElement = class {
  constructor() {
    this.style = {};
  }
  
  getContext() {
    return {
      drawingBufferWidth: 1024,
      drawingBufferHeight: 768,
      getParameter: () => 'Mock WebGL Renderer',
      pixelStorei: () => {}
    };
  }
  
  addEventListener() {}
};

// Performance test suite
class PerformanceBenchmark {
  constructor() {
    this.results = {
      initialization: {},
      logging: {},
      memoryManagement: {},
      eventHandling: {},
      statistics: {}
    };
  }

  async runAllBenchmarks() {
    console.log('🚀 Starting Performance Benchmark Suite');
    console.log('=====================================\n');

    await this.benchmarkInitialization();
    await this.benchmarkLogging();
    await this.benchmarkMemoryManagement();
    await this.benchmarkEventHandling();
    
    this.printResults();
    this.generateReport();
  }

  async benchmarkInitialization() {
    console.log('📱 Benchmarking Application Initialization...');
    
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      const app = new Application({
        width: 800,
        height: 600,
        debug: false
      });
      
      // Mock PIXI Application for benchmarking
      app.createPixiApp = async function() {
        this.app = {
          canvas: global.document.createElement('canvas'),
          renderer: {
            type: 'webgl2',
            resolution: 1,
            resize: () => {},
            gl: { pixelStorei: () => {} },
            texture: { gc: () => {} }
          },
          ticker: {
            add: () => {},
            start: () => {},
            stop: () => {},
            FPS: 60,
            deltaTime: 1,
            maxFPS: 60
          },
          stage: { children: [], addChild: () => {}, removeChild: () => {} },
          screen: { width: 800, height: 600 }
        };
      };
      
      await app.init();
      
      const end = performance.now();
      times.push(end - start);
      
      app.destroy();
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    this.results.initialization = {
      average: avgTime.toFixed(2),
      min: minTime.toFixed(2),
      max: maxTime.toFixed(2),
      iterations,
      times
    };
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime.toFixed(2)}ms`);
    console.log(`   Max: ${maxTime.toFixed(2)}ms\n`);
  }

  async benchmarkLogging() {
    console.log('📝 Benchmarking Logging System...');
    
    const logger = new Logger({
      logLevel: Logger.LOG_LEVELS.DEBUG,
      enableConsole: false,
      enableStorage: true
    });
    
    // Benchmark single log entry
    const singleLogTimes = [];
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      logger.info('BENCHMARK', `Test message ${i}`, { data: i });
      const end = performance.now();
      singleLogTimes.push(end - start);
    }
    
    // Benchmark bulk logging
    const bulkStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      logger.debug('BULK', `Bulk message ${i}`);
    }
    const bulkEnd = performance.now();
    const bulkTime = bulkEnd - bulkStart;
    
    // Benchmark log filtering
    const filterStart = performance.now();
    const errorLogs = logger.getLogsByLevel(Logger.LOG_LEVELS.ERROR);
    const categoryLogs = logger.getLogsByCategory('BENCHMARK');
    const filterEnd = performance.now();
    const filterTime = filterEnd - filterStart;
    
    // Benchmark log export
    const exportStart = performance.now();
    const jsonExport = logger.exportLogs('json');
    const csvExport = logger.exportLogs('csv');
    const exportEnd = performance.now();
    const exportTime = exportEnd - exportStart;
    
    const avgSingleLog = singleLogTimes.reduce((a, b) => a + b) / singleLogTimes.length;
    
    this.results.logging = {
      singleLogAverage: avgSingleLog.toFixed(4),
      bulkLogging: (bulkTime / 10000).toFixed(4),
      filterTime: filterTime.toFixed(2),
      exportTime: exportTime.toFixed(2),
      logCount: logger.logs.length,
      jsonSize: jsonExport.length,
      csvSize: csvExport.length
    };
    
    console.log(`   Single log average: ${avgSingleLog.toFixed(4)}ms`);
    console.log(`   Bulk logging (per entry): ${(bulkTime / 10000).toFixed(4)}ms`);
    console.log(`   Filter time: ${filterTime.toFixed(2)}ms`);
    console.log(`   Export time: ${exportTime.toFixed(2)}ms\n`);
  }

  async benchmarkMemoryManagement() {
    console.log('💾 Benchmarking Memory Management...');
    
    const app = new Application({ debug: false });
    
    // Mock PIXI for memory benchmarking
    app.createPixiApp = async function() {
      this.app = {
        canvas: global.document.createElement('canvas'),
        renderer: {
          texture: { 
            gc: () => {
              // Simulate garbage collection time
              const start = performance.now();
              while (performance.now() - start < 1) {} // 1ms simulation
            }
          }
        },
        ticker: { add: () => {}, start: () => {}, stop: () => {} },
        stage: { children: [] },
        screen: { width: 800, height: 600 }
      };
    };
    
    await app.init();
    
    // Benchmark memory cleanup
    const cleanupTimes = [];
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      // Add some mock memory usage
      app.performanceMetrics.memoryUsage.push(
        ...Array(50).fill(null).map((_, idx) => ({
          timestamp: performance.now(),
          used: Math.random() * 100,
          total: 200,
          limit: 400
        }))
      );
      
      const start = performance.now();
      app.performMemoryCleanup();
      const end = performance.now();
      
      cleanupTimes.push(end - start);
    }
    
    const avgCleanup = cleanupTimes.reduce((a, b) => a + b) / cleanupTimes.length;
    
    // Benchmark memory metrics collection
    const metricsStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const stats = app.getStats();
    }
    const metricsEnd = performance.now();
    const metricsTime = (metricsEnd - metricsStart) / 1000;
    
    this.results.memoryManagement = {
      cleanupAverage: avgCleanup.toFixed(2),
      metricsCollection: metricsTime.toFixed(4),
      maxMemoryEntries: app.performanceMetrics.memoryUsage.length
    };
    
    console.log(`   Cleanup average: ${avgCleanup.toFixed(2)}ms`);
    console.log(`   Metrics collection: ${metricsTime.toFixed(4)}ms per call`);
    console.log(`   Memory entries maintained: ${app.performanceMetrics.memoryUsage.length}\n`);
    
    app.destroy();
  }

  async benchmarkEventHandling() {
    console.log('🎯 Benchmarking Event Handling...');
    
    const logger = new Logger({
      logLevel: Logger.LOG_LEVELS.DEBUG,
      enableConsole: false,
      enableStorage: true
    });
    
    // Mock mobile environment
    logger.isMobile = true;
    
    // Benchmark touch event logging
    const touchTimes = [];
    const touchIterations = 1000;
    
    for (let i = 0; i < touchIterations; i++) {
      const mockTouchEvent = {
        type: 'touchmove',
        touches: Array(Math.floor(Math.random() * 5) + 1).fill(null).map((_, idx) => ({
          identifier: idx,
          clientX: Math.random() * 1024,
          clientY: Math.random() * 768,
          force: Math.random()
        })),
        target: { tagName: 'CANVAS' }
      };
      
      const start = performance.now();
      logger.logTouchEvent('touchmove', mockTouchEvent);
      const end = performance.now();
      
      touchTimes.push(end - start);
    }
    
    // Benchmark performance marking
    const markingTimes = [];
    const markingIterations = 500;
    
    for (let i = 0; i < markingIterations; i++) {
      const start = performance.now();
      logger.startPerformanceMark(`test-mark-${i}`);
      // Simulate some work
      const workStart = performance.now();
      while (performance.now() - workStart < Math.random() * 5) {} // 0-5ms work
      logger.endPerformanceMark(`test-mark-${i}`);
      const end = performance.now();
      
      markingTimes.push(end - start);
    }
    
    const avgTouchTime = touchTimes.reduce((a, b) => a + b) / touchTimes.length;
    const avgMarkingTime = markingTimes.reduce((a, b) => a + b) / markingTimes.length;
    
    this.results.eventHandling = {
      touchEventAverage: avgTouchTime.toFixed(4),
      performanceMarkingAverage: avgMarkingTime.toFixed(4),
      touchEventCount: logger.touchEvents.length
    };
    
    console.log(`   Touch event logging: ${avgTouchTime.toFixed(4)}ms per event`);
    console.log(`   Performance marking: ${avgMarkingTime.toFixed(4)}ms per mark`);
    console.log(`   Touch events stored: ${logger.touchEvents.length}\n`);
  }

  printResults() {
    console.log('📊 Performance Benchmark Results');
    console.log('===============================\n');
    
    console.log('🚀 Initialization:');
    console.log(`   Average: ${this.results.initialization.average}ms`);
    console.log(`   Range: ${this.results.initialization.min}ms - ${this.results.initialization.max}ms`);
    
    console.log('\n📝 Logging Performance:');
    console.log(`   Single Log: ${this.results.logging.singleLogAverage}ms`);
    console.log(`   Bulk Logging: ${this.results.logging.bulkLogging}ms per entry`);
    console.log(`   Filter Operations: ${this.results.logging.filterTime}ms`);
    console.log(`   Export Operations: ${this.results.logging.exportTime}ms`);
    
    console.log('\n💾 Memory Management:');
    console.log(`   Cleanup Operations: ${this.results.memoryManagement.cleanupAverage}ms`);
    console.log(`   Metrics Collection: ${this.results.memoryManagement.metricsCollection}ms`);
    
    console.log('\n🎯 Event Handling:');
    console.log(`   Touch Events: ${this.results.eventHandling.touchEventAverage}ms`);
    console.log(`   Performance Marking: ${this.results.eventHandling.performanceMarkingAverage}ms`);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: global.navigator.platform,
        userAgent: global.navigator.userAgent,
        memory: global.navigator.deviceMemory,
        cores: global.navigator.hardwareConcurrency
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n💡 Performance Recommendations:');
    report.recommendations.forEach((rec, idx) => {
      console.log(`   ${idx + 1}. ${rec}`);
    });
    
    console.log('\n📄 Benchmark completed. Results saved to benchmark-report.json');
    
    // In a real environment, you would save this to a file
    // require('fs').writeFileSync('benchmark-report.json', JSON.stringify(report, null, 2));
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Initialization recommendations
    if (parseFloat(this.results.initialization.average) > 50) {
      recommendations.push('Initialization time is high. Consider lazy loading or reducing initial setup complexity.');
    }
    
    // Logging recommendations
    if (parseFloat(this.results.logging.singleLogAverage) > 1) {
      recommendations.push('Single log entry time is high. Consider batching log entries or reducing data payload.');
    }
    
    // Memory recommendations
    if (parseFloat(this.results.memoryManagement.cleanupAverage) > 10) {
      recommendations.push('Memory cleanup is slow. Consider more frequent cleanup or reducing memory retention.');
    }
    
    // Event handling recommendations
    if (parseFloat(this.results.eventHandling.touchEventAverage) > 0.5) {
      recommendations.push('Touch event processing is slow. Consider throttling or optimizing event handlers.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All performance metrics are within acceptable ranges. Great job!');
    }
    
    return recommendations;
  }
}

// Run benchmarks
const benchmark = new PerformanceBenchmark();
benchmark.runAllBenchmarks().catch(console.error);