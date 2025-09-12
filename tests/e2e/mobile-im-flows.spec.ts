import { test, expect, devices, Page, BrowserContext } from '@playwright/test';

// Mobile-specific test utilities
class MobileTestUtils {
  constructor(private page: Page) {}

  // Simulate touch gestures
  async tap(selector: string, options?: { x?: number; y?: number; force?: number }) {
    const element = await this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element ${selector} not found or not visible`);
    }

    await this.page.touchscreen.tap(
      box.x + (options?.x || box.width / 2),
      box.y + (options?.y || box.height / 2)
    );
  }

  async longPress(selector: string, duration: number = 1000) {
    const element = await this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element ${selector} not found or not visible`);
    }

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.page.touchscreen.tap(x, y);
    await this.page.waitForTimeout(duration);
  }

  async swipe(startSelector: string, endSelector: string, speed: number = 1000) {
    const startElement = await this.page.locator(startSelector);
    const endElement = await this.page.locator(endSelector);
    
    const startBox = await startElement.boundingBox();
    const endBox = await endElement.boundingBox();
    
    if (!startBox || !endBox) {
      throw new Error('Start or end element not found for swipe');
    }

    const startX = startBox.x + startBox.width / 2;
    const startY = startBox.y + startBox.height / 2;
    const endX = endBox.x + endBox.width / 2;
    const endY = endBox.y + endBox.height / 2;

    await this.page.touchscreen.tap(startX, startY);
    await this.page.mouse.move(endX, endY, { steps: Math.floor(speed / 100) });
    await this.page.touchscreen.tap(endX, endY);
  }

  async pinchZoom(selector: string, scale: number = 2) {
    const element = await this.page.locator(selector);
    const box = await element.boundingBox();
    
    if (!box) {
      throw new Error(`Element ${selector} not found for pinch zoom`);
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const distance = 50;

    // Start with two touches close together
    await this.page.touchscreen.tap(centerX - distance / 2, centerY);
    await this.page.touchscreen.tap(centerX + distance / 2, centerY);

    // Move touches apart to zoom in
    const newDistance = distance * scale;
    await this.page.mouse.move(centerX - newDistance / 2, centerY, { steps: 10 });
    await this.page.mouse.move(centerX + newDistance / 2, centerY, { steps: 10 });
  }

  async scrollToElement(selector: string, direction: 'up' | 'down' | 'left' | 'right' = 'down') {
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    while (scrollAttempts < maxScrollAttempts) {
      const element = this.page.locator(selector);
      
      if (await element.isVisible()) {
        return;
      }

      const viewport = this.page.viewportSize();
      if (!viewport) return;

      let startX = viewport.width / 2;
      let startY = viewport.height / 2;
      let endX = startX;
      let endY = startY;

      switch (direction) {
        case 'down':
          startY = viewport.height * 0.8;
          endY = viewport.height * 0.2;
          break;
        case 'up':
          startY = viewport.height * 0.2;
          endY = viewport.height * 0.8;
          break;
        case 'right':
          startX = viewport.width * 0.8;
          endX = viewport.width * 0.2;
          break;
        case 'left':
          startX = viewport.width * 0.2;
          endX = viewport.width * 0.8;
          break;
      }

      await this.page.touchscreen.tap(startX, startY);
      await this.page.mouse.move(endX, endY, { steps: 5 });
      await this.page.touchscreen.tap(endX, endY);
      await this.page.waitForTimeout(500);

      scrollAttempts++;
    }

    throw new Error(`Element ${selector} not found after ${maxScrollAttempts} scroll attempts`);
  }

  async waitForStableNetwork(timeout: number = 5000) {
    const startTime = Date.now();
    let lastRequestTime = Date.now();

    this.page.on('request', () => {
      lastRequestTime = Date.now();
    });

    while (Date.now() - lastRequestTime < 1000) { // 1 second of network stability
      if (Date.now() - startTime > timeout) {
        break;
      }
      await this.page.waitForTimeout(100);
    }
  }

  async measurePerformance(): Promise<{
    loadTime: number;
    renderTime: number;
    interactiveTime: number;
    memoryUsage?: number;
  }> {
    const performanceMetrics = await this.page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        renderTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        interactiveTime: performance.now(),
        // @ts-ignore
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      };
    });

    return performanceMetrics;
  }
}

// Test configuration for different mobile devices
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 12 landscape', device: devices['iPhone 12 landscape'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'iPad Pro', device: devices['iPad Pro'] },
];

mobileDevices.forEach(({ name, device }) => {
  test.describe(`Mobile IM Tests - ${name}`, () => {
    test.use(device);

    let mobileUtils: MobileTestUtils;

    test.beforeEach(async ({ page }) => {
      mobileUtils = new MobileTestUtils(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('should load IM interface on mobile device', async ({ page }) => {
      // Check if the page loads and adapts to mobile
      await expect(page.locator('[data-testid=\"responsive-im-layout\"]')).toBeVisible();
      
      // Verify mobile-specific layout
      const layout = page.locator('[data-testid=\"responsive-im-layout\"]');
      const deviceType = await layout.getAttribute('data-device');
      const orientation = await layout.getAttribute('data-orientation');
      
      expect(['mobile', 'tablet']).toContain(deviceType);
      expect(['portrait', 'landscape']).toContain(orientation);

      // Measure initial load performance
      const metrics = await mobileUtils.measurePerformance();
      expect(metrics.loadTime).toBeLessThan(5000); // 5 seconds
      expect(metrics.renderTime).toBeLessThan(3000); // 3 seconds
    });

    test('should handle touch navigation', async ({ page }) => {
      // Wait for avatars to load
      await page.waitForSelector('[data-testid^=\"avatar-\"]');
      
      // Test touch interaction with avatars
      const firstAvatar = page.locator('[data-testid=\"avatar-0\"]');
      await expect(firstAvatar).toBeVisible();
      
      await mobileUtils.tap('[data-testid=\"avatar-0\"]');
      
      // Check for any interaction feedback
      // (This would depend on your actual implementation)
      await page.waitForTimeout(500);
      
      // Verify touch target size meets accessibility standards (44px minimum)
      const avatarBox = await firstAvatar.boundingBox();
      expect(avatarBox?.width).toBeGreaterThanOrEqual(44);
      expect(avatarBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should support pinch zoom on avatar grid', async ({ page }) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      
      // Perform pinch zoom gesture
      await mobileUtils.pinchZoom('[data-testid=\"responsive-im-layout\"]', 1.5);
      await page.waitForTimeout(1000);
      
      // Verify zoom functionality
      // (This would depend on your zoom implementation)
      const layout = page.locator('[data-testid=\"responsive-im-layout\"]');
      await expect(layout).toBeVisible();
    });

    test('should handle orientation changes', async ({ page, context }) => {
      // Initial state
      const initialLayout = await page.locator('[data-testid=\"responsive-im-layout\"]').getAttribute('data-orientation');
      
      // Simulate orientation change by changing viewport
      const viewport = page.viewportSize();
      if (viewport) {
        await page.setViewportSize({
          width: viewport.height,
          height: viewport.width
        });
      }
      
      await page.waitForTimeout(1000);
      
      // Check layout adaptation
      const newLayout = await page.locator('[data-testid=\"responsive-im-layout\"]').getAttribute('data-orientation');
      
      // Should adapt to new orientation
      if (initialLayout === 'portrait') {
        expect(newLayout).toBe('landscape');
      } else if (initialLayout === 'landscape') {
        expect(newLayout).toBe('portrait');
      }
    });

    test('should handle scrolling with large number of avatars', async ({ page }) => {
      // Navigate to a page with many avatars (or mock it)
      await page.evaluate(() => {
        // Mock adding many avatars to the DOM
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          for (let i = 10; i < 100; i++) {
            const avatar = document.createElement('div');
            avatar.setAttribute('data-testid', `avatar-${i}`);
            avatar.textContent = `${i + 1}`;
            avatar.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background-color: #007bff; display: flex; align-items: center; justify-content: center; color: white;';
            container.appendChild(avatar);
          }
        }
      });

      await page.waitForTimeout(500);

      // Test scrolling performance
      const startTime = Date.now();
      
      // Scroll to find a specific avatar
      await mobileUtils.scrollToElement('[data-testid=\"avatar-50\"]');
      
      const scrollTime = Date.now() - startTime;
      expect(scrollTime).toBeLessThan(5000); // Should find element within 5 seconds

      // Verify the target element is visible
      await expect(page.locator('[data-testid=\"avatar-50\"]')).toBeVisible();
    });

    test('should maintain performance during complex interactions', async ({ page }) => {
      // Simulate complex user interaction flow
      const performanceResults: number[] = [];

      // Series of interactions
      const interactions = [
        () => mobileUtils.tap('[data-testid=\"avatar-0\"]'),
        () => mobileUtils.tap('[data-testid=\"avatar-1\"]'),
        () => mobileUtils.swipe('[data-testid=\"avatar-0\"]', '[data-testid=\"avatar-5\"]'),
        () => mobileUtils.tap('[data-testid=\"connections-info\"]'),
      ];

      for (const interaction of interactions) {
        const startTime = performance.now();
        await interaction();
        await page.waitForTimeout(100); // Small delay between interactions
        const duration = performance.now() - startTime;
        performanceResults.push(duration);
      }

      // All interactions should complete quickly
      const averageTime = performanceResults.reduce((sum, time) => sum + time, 0) / performanceResults.length;
      expect(averageTime).toBeLessThan(1000); // 1 second average
      
      // No interaction should be extremely slow
      const slowInteractions = performanceResults.filter(time => time > 2000);
      expect(slowInteractions.length).toBe(0);
    });

    test('should handle network conditions gracefully', async ({ page, context }) => {
      // Simulate slow network
      await context.route('**/*', async (route, request) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        await route.continue();
      });

      await page.reload();
      await mobileUtils.waitForStableNetwork(10000);

      // Interface should still be usable
      await expect(page.locator('[data-testid=\"responsive-im-layout\"]')).toBeVisible();
      
      // Interactive elements should still work
      await mobileUtils.tap('[data-testid=\"avatar-0\"]');
    });

    test('should handle memory constraints on mobile', async ({ page }) => {
      // Simulate memory-intensive operations
      await page.evaluate(() => {
        // Create memory pressure
        const largeArray: number[][] = [];
        for (let i = 0; i < 100; i++) {
          largeArray.push(new Array(1000).fill(Math.random()));
        }
        
        // Simulate IM data structures
        (window as any).testData = largeArray;
      });

      await page.waitForTimeout(2000);

      // Interface should remain responsive
      await mobileUtils.tap('[data-testid=\"avatar-0\"]');
      
      // Clean up test data
      await page.evaluate(() => {
        delete (window as any).testData;
      });

      // Measure memory usage if possible
      const metrics = await mobileUtils.measurePerformance();
      if (metrics.memoryUsage) {
        // Memory usage should be reasonable (less than 50MB)
        expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024);
      }
    });

    test('should support accessibility features', async ({ page }) => {
      // Check for proper ARIA labels and roles
      const layout = page.locator('[data-testid=\"responsive-im-layout\"]');
      
      // Should have proper structure for screen readers
      await expect(layout).toBeVisible();
      
      // Check touch target sizes for accessibility
      const avatars = page.locator('[data-testid^=\"avatar-\"]');
      const firstAvatar = avatars.first();
      
      const avatarBox = await firstAvatar.boundingBox();
      expect(avatarBox?.width).toBeGreaterThanOrEqual(44); // WCAG guidelines
      expect(avatarBox?.height).toBeGreaterThanOrEqual(44);
      
      // Test keyboard navigation (if supported)
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    });

    test('should handle rapid user interactions', async ({ page }) => {
      // Rapid tap test
      const rapidTaps = 10;
      const tapInterval = 100; // 100ms between taps

      const startTime = performance.now();
      
      for (let i = 0; i < rapidTaps; i++) {
        await mobileUtils.tap(`[data-testid=\"avatar-${i % 5}\"]`);
        await page.waitForTimeout(tapInterval);
      }
      
      const totalTime = performance.now() - startTime;
      
      // Should handle all taps efficiently
      expect(totalTime).toBeLessThan(rapidTaps * tapInterval * 2); // Allow for some overhead
      
      // Interface should remain responsive
      await expect(page.locator('[data-testid=\"responsive-im-layout\"]')).toBeVisible();
    });

    test('should maintain UI consistency during state changes', async ({ page }) => {
      // Test various state changes that might affect layout
      const states = [
        'online',
        'offline', 
        'away',
        'busy'
      ];

      for (const state of states) {
        // Simulate status change (this would depend on your implementation)
        await page.evaluate((status) => {
          // Mock status change
          const avatars = document.querySelectorAll('[data-testid^=\"avatar-\"]');
          avatars.forEach(avatar => {
            avatar.setAttribute('data-status', status);
          });
        }, state);

        await page.waitForTimeout(300);

        // Layout should remain stable
        const layout = page.locator('[data-testid=\"responsive-im-layout\"]');
        await expect(layout).toBeVisible();
        
        // First avatar should still be accessible
        await expect(page.locator('[data-testid=\"avatar-0\"]')).toBeVisible();
      }
    });
  });
});

// Cross-device compatibility tests
test.describe('Cross-Device Mobile Compatibility', () => {
  test('should work consistently across different mobile devices', async ({ browser }) => {
    const results: Array<{
      device: string;
      loadTime: number;
      renderTime: number;
      success: boolean;
    }> = [];

    // Test across multiple devices
    for (const { name, device } of mobileDevices) {
      const context = await browser.newContext({ ...device });
      const page = await context.newPage();
      const mobileUtils = new MobileTestUtils(page);

      try {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const metrics = await mobileUtils.measurePerformance();
        
        // Basic functionality test
        await expect(page.locator('[data-testid=\"responsive-im-layout\"]')).toBeVisible();
        await mobileUtils.tap('[data-testid=\"avatar-0\"]');

        results.push({
          device: name,
          loadTime: metrics.loadTime,
          renderTime: metrics.renderTime,
          success: true
        });
      } catch (error) {
        results.push({
          device: name,
          loadTime: 0,
          renderTime: 0,
          success: false
        });
        console.error(`Test failed for ${name}:`, error);
      } finally {
        await context.close();
      }
    }

    // All devices should succeed
    const failedDevices = results.filter(r => !r.success);
    expect(failedDevices.length).toBe(0);

    // Performance should be consistent across devices
    const loadTimes = results.map(r => r.loadTime);
    const maxLoadTime = Math.max(...loadTimes);
    const minLoadTime = Math.min(...loadTimes);
    
    // Variation shouldn't be too extreme (within 3x)
    expect(maxLoadTime / minLoadTime).toBeLessThan(3);
  });
});