import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Launch browser for shared state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Setup performance monitoring baseline
  await context.addInitScript(() => {
    window.performanceMetrics = {
      renderTimes: [],
      memoryUsage: [],
      touchLatency: [],
      scrollPerformance: []
    };

    // Monitor memory usage
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
      return originalRequestAnimationFrame(function(timestamp) {
        if (performance.memory) {
          window.performanceMetrics.memoryUsage.push({
            timestamp,
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          });
        }
        return callback(timestamp);
      });
    };

    // Monitor touch events
    let touchStartTime = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartTime = performance.now();
    });

    document.addEventListener('touchend', (e) => {
      const touchEndTime = performance.now();
      const latency = touchEndTime - touchStartTime;
      window.performanceMetrics.touchLatency.push({
        latency,
        timestamp: touchEndTime
      });
    });

    // Monitor scroll performance
    let scrollStartTime = 0;
    let isScrolling = false;
    
    document.addEventListener('touchstart', () => {
      if (!isScrolling) {
        scrollStartTime = performance.now();
        isScrolling = true;
      }
    });

    document.addEventListener('touchend', () => {
      if (isScrolling) {
        const scrollEndTime = performance.now();
        const duration = scrollEndTime - scrollStartTime;
        window.performanceMetrics.scrollPerformance.push({
          duration,
          timestamp: scrollEndTime
        });
        isScrolling = false;
      }
    });
  });

  await browser.close();
  
  // Setup test environment
  process.env.TEST_MODE = 'true';
  process.env.PERFORMANCE_MONITORING = 'true';
}

export default globalSetup;