import { performance } from 'perf_hooks';

// Mock performance observer
class MockPerformanceObserver {
  private callback: PerformanceObserverCallback;
  private entries: PerformanceEntry[] = [];

  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
  }

  observe(options: PerformanceObserverInit): void {
    // Mock implementation
  }

  disconnect(): void {
    // Mock implementation
  }

  takeRecords(): PerformanceEntryList {
    return this.entries as PerformanceEntryList;
  }

  // Helper method to simulate performance entries
  addEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);
    this.callback({ getEntries: () => this.entries } as any, this);
  }
}

// Memory monitoring utility
class MemoryMonitor {
  private samples: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  }> = [];

  private performanceEntries: PerformanceEntry[] = [];
  private observer: MockPerformanceObserver;

  constructor() {
    this.observer = new MockPerformanceObserver((list) => {
      this.performanceEntries.push(...list.getEntries());
    });
  }

  startMonitoring(): void {
    this.samples = [];
    this.performanceEntries = [];
    this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  takeSample(label?: string): void {
    if (process.memoryUsage) {
      const memory = process.memoryUsage();
      this.samples.push({
        timestamp: performance.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss
      });
    } else {
      // Fallback for environments without process.memoryUsage
      this.samples.push({
        timestamp: performance.now(),
        heapUsed: Math.random() * 50 * 1024 * 1024, // Mock value
        heapTotal: Math.random() * 100 * 1024 * 1024,
        external: Math.random() * 10 * 1024 * 1024,
        rss: Math.random() * 200 * 1024 * 1024
      });
    }
  }

  stopMonitoring(): void {
    this.observer.disconnect();
  }

  detectMemoryLeak(): {
    hasLeak: boolean;
    growthRate: number; // bytes per sample
    confidence: number; // 0-1
    details: {
      initialMemory: number;
      finalMemory: number;
      peakMemory: number;
      samples: number;
    };
  } {
    if (this.samples.length < 3) {
      return {
        hasLeak: false,
        growthRate: 0,
        confidence: 0,
        details: {
          initialMemory: 0,
          finalMemory: 0,
          peakMemory: 0,
          samples: this.samples.length
        }
      };
    }

    const heapValues = this.samples.map(s => s.heapUsed);
    const initialMemory = heapValues[0];
    const finalMemory = heapValues[heapValues.length - 1];
    const peakMemory = Math.max(...heapValues);
    
    // Calculate linear regression to detect growth trend
    const n = this.samples.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    this.samples.forEach((sample, index) => {
      const x = index;
      const y = sample.heapUsed;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const growthRate = slope;
    
    // Determine if there's a leak
    const memoryIncrease = finalMemory - initialMemory;
    const relativeIncrease = memoryIncrease / initialMemory;
    
    // Confidence based on trend consistency and magnitude
    let confidence = 0;
    if (growthRate > 0) {
      confidence = Math.min(1, relativeIncrease * 2); // Max confidence at 50% increase
      if (growthRate > 1024 * 1024) { // 1MB per sample
        confidence = Math.min(1, confidence * 1.5);
      }
    }
    
    const hasLeak = growthRate > 0 && relativeIncrease > 0.1 && confidence > 0.5;

    return {
      hasLeak,
      growthRate,
      confidence,
      details: {
        initialMemory,
        finalMemory,
        peakMemory,
        samples: n
      }
    };
  }

  getMemoryReport(): {
    totalSamples: number;
    averageHeapUsed: number;
    peakHeapUsed: number;
    memoryVariation: number;
    potentialLeaks: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  } {
    if (this.samples.length === 0) {
      return {
        totalSamples: 0,
        averageHeapUsed: 0,
        peakHeapUsed: 0,
        memoryVariation: 0,
        potentialLeaks: []
      };
    }

    const heapValues = this.samples.map(s => s.heapUsed);
    const averageHeapUsed = heapValues.reduce((sum, val) => sum + val, 0) / heapValues.length;
    const peakHeapUsed = Math.max(...heapValues);
    const minHeapUsed = Math.min(...heapValues);
    const memoryVariation = (peakHeapUsed - minHeapUsed) / averageHeapUsed;

    const potentialLeaks: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }> = [];

    // Analyze for different types of leaks
    if (memoryVariation > 0.5) {
      potentialLeaks.push({
        type: 'high_variation',
        severity: 'medium',
        description: 'High memory variation detected, possible inefficient cleanup'
      });
    }

    const leak = this.detectMemoryLeak();
    if (leak.hasLeak) {
      potentialLeaks.push({
        type: 'continuous_growth',
        severity: leak.confidence > 0.8 ? 'high' : 'medium',
        description: `Continuous memory growth detected: ${(leak.growthRate / 1024 / 1024).toFixed(2)} MB/sample`
      });
    }

    return {
      totalSamples: this.samples.length,
      averageHeapUsed,
      peakHeapUsed,
      memoryVariation,
      potentialLeaks
    };
  }
}

// Mock IM system components for memory testing
class IMSystemComponent {
  private connections: Map<string, any> = new Map();
  private avatars: Map<string, any> = new Map();
  private eventListeners: Array<{ element: any; event: string; handler: any }> = [];
  private timers: number[] = [];
  private observers: any[] = [];

  addConnection(id: string, data: any): void {
    this.connections.set(id, data);
  }

  removeConnection(id: string): void {
    this.connections.delete(id);
  }

  addAvatar(id: string, data: any): void {
    this.avatars.set(id, data);
    
    // Simulate event listener attachment (common leak source)
    const handler = () => console.log(`Avatar ${id} updated`);
    document.addEventListener('click', handler);
    this.eventListeners.push({ element: document, event: 'click', handler });
  }

  removeAvatar(id: string): void {
    this.avatars.delete(id);
    // Note: Not removing event listener (simulating a leak)
  }

  startPeriodicUpdate(interval: number = 1000): void {
    const timerId = setInterval(() => {
      // Simulate periodic updates that might accumulate data
      this.connections.forEach((conn, id) => {
        conn.lastUpdate = Date.now();
        conn.history = conn.history || [];
        conn.history.push({ timestamp: Date.now(), data: Math.random() });
        
        // Simulate history growth (potential leak)
        if (conn.history.length > 1000) {
          conn.history = conn.history.slice(-500); // Should clean up but might not
        }
      });
    }, interval);
    
    this.timers.push(timerId);
  }

  dispose(): void {
    // Clean up connections
    this.connections.clear();
    
    // Clean up avatars
    this.avatars.clear();
    
    // Clean up event listeners (proper cleanup)
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    
    // Clear timers
    this.timers.forEach(timerId => clearInterval(timerId));
    this.timers = [];
    
    // Cleanup observers
    this.observers.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    this.observers = [];
  }

  // Simulate improper cleanup (for testing leak detection)
  improperDispose(): void {
    // Only clear connections but leave other resources
    this.connections.clear();
    // Event listeners, timers, and observers remain (leaks!)
  }

  getResourceCounts(): {
    connections: number;
    avatars: number;
    eventListeners: number;
    timers: number;
    observers: number;
  } {
    return {
      connections: this.connections.size,
      avatars: this.avatars.size,
      eventListeners: this.eventListeners.length,
      timers: this.timers.length,
      observers: this.observers.length
    };
  }
}

// Performance regression detector
class PerformanceRegressionDetector {
  private benchmarks: Map<string, Array<{
    timestamp: number;
    duration: number;
    metadata?: any;
  }>> = new Map();

  recordBenchmark(operation: string, duration: number, metadata?: any): void {
    if (!this.benchmarks.has(operation)) {
      this.benchmarks.set(operation, []);
    }
    
    this.benchmarks.get(operation)!.push({
      timestamp: performance.now(),
      duration,
      metadata
    });
  }

  detectRegression(operation: string, threshold: number = 0.2): {
    hasRegression: boolean;
    severity: 'low' | 'medium' | 'high';
    currentAverage: number;
    baselineAverage: number;
    slowdownFactor: number;
    confidence: number;
  } {
    const records = this.benchmarks.get(operation);
    if (!records || records.length < 6) {
      return {
        hasRegression: false,
        severity: 'low',
        currentAverage: 0,
        baselineAverage: 0,
        slowdownFactor: 1,
        confidence: 0
      };
    }

    // Use first third as baseline, last third as current
    const baselineCount = Math.floor(records.length / 3);
    const currentStart = records.length - baselineCount;
    
    const baseline = records.slice(0, baselineCount);
    const current = records.slice(currentStart);
    
    const baselineAverage = baseline.reduce((sum, r) => sum + r.duration, 0) / baseline.length;
    const currentAverage = current.reduce((sum, r) => sum + r.duration, 0) / current.length;
    
    const slowdownFactor = currentAverage / baselineAverage;
    const hasRegression = slowdownFactor > (1 + threshold);
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (slowdownFactor > 2) severity = 'high';
    else if (slowdownFactor > 1.5) severity = 'medium';
    
    // Confidence based on sample size and consistency
    const confidence = Math.min(1, (baseline.length + current.length) / 20);

    return {
      hasRegression,
      severity,
      currentAverage,
      baselineAverage,
      slowdownFactor,
      confidence
    };
  }

  getPerformanceReport(): {
    operations: string[];
    regressions: Array<{
      operation: string;
      severity: 'low' | 'medium' | 'high';
      slowdownFactor: number;
    }>;
    summary: {
      totalOperations: number;
      regressionsDetected: number;
      averageSlowdown: number;
    };
  } {
    const operations = Array.from(this.benchmarks.keys());
    const regressions: Array<{
      operation: string;
      severity: 'low' | 'medium' | 'high';
      slowdownFactor: number;
    }> = [];

    let totalSlowdown = 0;
    let regressionsCount = 0;

    operations.forEach(operation => {
      const regression = this.detectRegression(operation);
      if (regression.hasRegression) {
        regressions.push({
          operation,
          severity: regression.severity,
          slowdownFactor: regression.slowdownFactor
        });
        totalSlowdown += regression.slowdownFactor;
        regressionsCount++;
      }
    });

    return {
      operations,
      regressions,
      summary: {
        totalOperations: operations.length,
        regressionsDetected: regressionsCount,
        averageSlowdown: regressionsCount > 0 ? totalSlowdown / regressionsCount : 1
      }
    };
  }

  clear(): void {
    this.benchmarks.clear();
  }
}

describe('Memory Leak and Performance Regression Tests', () => {
  let memoryMonitor: MemoryMonitor;
  let imSystem: IMSystemComponent;
  let performanceDetector: PerformanceRegressionDetector;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
    imSystem = new IMSystemComponent();
    performanceDetector = new PerformanceRegressionDetector();
  });

  afterEach(() => {
    memoryMonitor.stopMonitoring();
    imSystem.dispose();
    performanceDetector.clear();
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks from event listeners', async () => {
      memoryMonitor.startMonitoring();
      memoryMonitor.takeSample();

      // Add many avatars without proper cleanup
      for (let i = 0; i < 100; i++) {
        imSystem.addAvatar(`avatar-${i}`, { name: `User ${i}` });
        if (i % 10 === 0) {
          memoryMonitor.takeSample();
        }
      }

      // Remove avatars but don't clean up event listeners (simulating leak)
      for (let i = 0; i < 100; i++) {
        imSystem.removeAvatar(`avatar-${i}`); // This doesn't remove event listeners
        if (i % 10 === 0) {
          memoryMonitor.takeSample();
        }
      }

      memoryMonitor.takeSample();
      const leakAnalysis = memoryMonitor.detectMemoryLeak();
      const report = memoryMonitor.getMemoryReport();

      // Should detect potential leaks
      expect(report.potentialLeaks.length).toBeGreaterThan(0);
      expect(report.totalSamples).toBeGreaterThan(5);

      // Verify resource cleanup status
      const resources = imSystem.getResourceCounts();
      expect(resources.eventListeners).toBeGreaterThan(0); // Leak: listeners not cleaned
      expect(resources.avatars).toBe(0); // Should be cleaned
    });

    it('should detect memory growth from data accumulation', async () => {
      memoryMonitor.startMonitoring();
      memoryMonitor.takeSample();

      // Add connections with periodic updates that accumulate data
      for (let i = 0; i < 50; i++) {
        imSystem.addConnection(`conn-${i}`, { 
          id: i, 
          history: [],
          data: new Array(1000).fill(Math.random()) // Large data
        });
      }

      imSystem.startPeriodicUpdate(100); // Fast updates
      memoryMonitor.takeSample();

      // Let the system run and accumulate data
      await new Promise(resolve => setTimeout(resolve, 1000));
      memoryMonitor.takeSample();

      await new Promise(resolve => setTimeout(resolve, 1000));
      memoryMonitor.takeSample();

      const leakAnalysis = memoryMonitor.detectMemoryLeak();
      
      if (process.memoryUsage) {
        // Only run detailed checks if memory monitoring is available
        expect(leakAnalysis.details.samples).toBeGreaterThan(2);
        expect(leakAnalysis.details.finalMemory).toBeGreaterThan(leakAnalysis.details.initialMemory);
      }
    });

    it('should distinguish between temporary spikes and leaks', async () => {
      memoryMonitor.startMonitoring();
      memoryMonitor.takeSample();

      // Temporary memory usage spike
      const tempData: any[] = [];
      for (let i = 0; i < 1000; i++) {
        tempData.push(new Array(1000).fill(i));
      }
      memoryMonitor.takeSample();

      // Clean up temporary data
      tempData.length = 0;
      if (global.gc) {
        global.gc(); // Force garbage collection if available
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      memoryMonitor.takeSample();
      memoryMonitor.takeSample();

      const leakAnalysis = memoryMonitor.detectMemoryLeak();
      const report = memoryMonitor.getMemoryReport();

      // Should not detect a leak for temporary spikes
      expect(leakAnalysis.confidence).toBeLessThan(0.8);
      expect(report.memoryVariation).toBeGreaterThan(0); // Should show variation
    });

    it('should handle proper resource cleanup', () => {
      memoryMonitor.startMonitoring();
      memoryMonitor.takeSample();

      // Add resources
      for (let i = 0; i < 50; i++) {
        imSystem.addAvatar(`avatar-${i}`, { name: `User ${i}` });
        imSystem.addConnection(`conn-${i}`, { id: i });
      }
      memoryMonitor.takeSample();

      // Proper cleanup
      imSystem.dispose();
      memoryMonitor.takeSample();

      const resources = imSystem.getResourceCounts();
      expect(resources.connections).toBe(0);
      expect(resources.avatars).toBe(0);
      expect(resources.eventListeners).toBe(0);
      expect(resources.timers).toBe(0);
    });
  });

  describe('Performance Regression Detection', () => {
    const simulateOperation = (baseTime: number, variation: number = 0.1) => {
      const variationAmount = baseTime * variation * (Math.random() - 0.5) * 2;
      return baseTime + variationAmount;
    };

    it('should detect performance regressions in operations', () => {
      // Establish baseline performance
      for (let i = 0; i < 20; i++) {
        const duration = simulateOperation(10); // 10ms baseline
        performanceDetector.recordBenchmark('avatar-render', duration);
      }

      // Simulate performance regression
      for (let i = 0; i < 20; i++) {
        const duration = simulateOperation(25); // 25ms - significant slowdown
        performanceDetector.recordBenchmark('avatar-render', duration);
      }

      const regression = performanceDetector.detectRegression('avatar-render');
      
      expect(regression.hasRegression).toBe(true);
      expect(regression.slowdownFactor).toBeGreaterThan(2);
      expect(regression.severity).toBe('high');
    });

    it('should not flag normal performance variations', () => {
      // Record normal performance with typical variation
      for (let i = 0; i < 30; i++) {
        const duration = simulateOperation(10, 0.15); // 15% variation
        performanceDetector.recordBenchmark('connection-update', duration);
      }

      const regression = performanceDetector.detectRegression('connection-update');
      
      expect(regression.hasRegression).toBe(false);
      expect(regression.slowdownFactor).toBeLessThan(1.2);
    });

    it('should categorize regression severity correctly', () => {
      const testCases = [
        { slowdown: 1.3, expectedSeverity: 'low' },
        { slowdown: 1.6, expectedSeverity: 'medium' },
        { slowdown: 2.5, expectedSeverity: 'high' }
      ];

      testCases.forEach(({ slowdown, expectedSeverity }) => {
        const operationName = `test-operation-${slowdown}`;
        
        // Baseline
        for (let i = 0; i < 15; i++) {
          performanceDetector.recordBenchmark(operationName, 10);
        }
        
        // Regression
        for (let i = 0; i < 15; i++) {
          performanceDetector.recordBenchmark(operationName, 10 * slowdown);
        }

        const regression = performanceDetector.detectRegression(operationName);
        expect(regression.severity).toBe(expectedSeverity);
      });
    });

    it('should provide comprehensive performance reports', () => {
      // Create multiple operations with different performance characteristics
      const operations = [
        { name: 'fast-operation', baseTime: 5 },
        { name: 'medium-operation', baseTime: 15 },
        { name: 'slow-operation', baseTime: 50 }
      ];

      operations.forEach(({ name, baseTime }) => {
        // Baseline
        for (let i = 0; i < 10; i++) {
          performanceDetector.recordBenchmark(name, simulateOperation(baseTime));
        }
        
        // Some with regression, some without
        const hasRegression = name.includes('slow');
        const regressionFactor = hasRegression ? 2.0 : 1.0;
        
        for (let i = 0; i < 10; i++) {
          performanceDetector.recordBenchmark(
            name, 
            simulateOperation(baseTime * regressionFactor)
          );
        }
      });

      const report = performanceDetector.getPerformanceReport();
      
      expect(report.operations).toHaveLength(3);
      expect(report.summary.totalOperations).toBe(3);
      expect(report.regressions.length).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing and Edge Cases', () => {
    it('should handle extreme memory pressure', async () => {
      memoryMonitor.startMonitoring();
      memoryMonitor.takeSample();

      try {
        // Create extreme memory pressure
        const largeArrays: any[][] = [];
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(10000).fill(Math.random()));
          if (i % 10 === 0) {
            memoryMonitor.takeSample();
          }
        }

        memoryMonitor.takeSample();
        
        // Clean up
        largeArrays.length = 0;
        if (global.gc) {
          global.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        memoryMonitor.takeSample();

        const report = memoryMonitor.getMemoryReport();
        expect(report.totalSamples).toBeGreaterThan(5);
        expect(report.memoryVariation).toBeGreaterThan(0);
      } catch (error) {
        // Handle potential out-of-memory errors gracefully
        console.warn('Memory stress test limited by environment:', error);
      }
    });

    it('should detect cumulative performance degradation', () => {
      // Simulate gradual performance degradation
      let currentPerformance = 10; // Start at 10ms
      
      for (let batch = 0; batch < 10; batch++) {
        for (let i = 0; i < 5; i++) {
          performanceDetector.recordBenchmark('degrading-operation', currentPerformance);
        }
        currentPerformance += 2; // Gradually get slower
      }

      const regression = performanceDetector.detectRegression('degrading-operation');
      
      expect(regression.hasRegression).toBe(true);
      expect(regression.slowdownFactor).toBeGreaterThan(1.5);
    });

    it('should maintain accuracy with limited data', () => {
      // Test with minimal data points
      for (let i = 0; i < 3; i++) {
        performanceDetector.recordBenchmark('limited-data', 10);
      }

      const regression = performanceDetector.detectRegression('limited-data');
      
      expect(regression.confidence).toBeLessThan(0.5);
      expect(regression.hasRegression).toBe(false);
    });
  });

  describe('Integration with Real Components', () => {
    it('should monitor actual component lifecycle memory usage', () => {
      memoryMonitor.startMonitoring();
      memoryMonitor.takeSample();

      // Simulate component mount/unmount cycles
      const components: IMSystemComponent[] = [];
      
      // Mount phase
      for (let cycle = 0; cycle < 5; cycle++) {
        const component = new IMSystemComponent();
        
        // Add data to component
        for (let i = 0; i < 20; i++) {
          component.addAvatar(`avatar-${cycle}-${i}`, { data: Math.random() });
          component.addConnection(`conn-${cycle}-${i}`, { data: Math.random() });
        }
        
        component.startPeriodicUpdate();
        components.push(component);
        memoryMonitor.takeSample();
      }

      // Unmount phase
      components.forEach((component, index) => {
        component.dispose();
        memoryMonitor.takeSample();
      });

      const report = memoryMonitor.getMemoryReport();
      expect(report.totalSamples).toBeGreaterThan(8);
    });

    it('should track performance across different operation types', () => {
      const operationTypes = [
        { name: 'avatar-add', baseTime: 5 },
        { name: 'avatar-remove', baseTime: 3 },
        { name: 'connection-update', baseTime: 8 },
        { name: 'viewport-cull', baseTime: 12 }
      ];

      // Record baseline performance
      operationTypes.forEach(({ name, baseTime }) => {
        for (let i = 0; i < 15; i++) {
          const startTime = performance.now();
          // Simulate operation
          const duration = simulateOperation(baseTime);
          performanceDetector.recordBenchmark(name, duration);
        }
      });

      // Introduce regression to some operations
      ['avatar-add', 'viewport-cull'].forEach(name => {
        const baseTime = operationTypes.find(op => op.name === name)!.baseTime;
        for (let i = 0; i < 15; i++) {
          const duration = simulateOperation(baseTime * 1.8); // 80% slower
          performanceDetector.recordBenchmark(name, duration);
        }
      });

      const report = performanceDetector.getPerformanceReport();
      
      expect(report.operations).toHaveLength(4);
      expect(report.regressions.length).toBeGreaterThan(0);
      expect(report.regressions.length).toBeLessThan(4); // Not all operations should have regressions
    });
  });
});