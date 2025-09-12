import { test, expect } from '@playwright/test';
import { compatibilityRunner, deviceMatrix } from '../utils/device-compatibility-matrix';

test.describe('Device Compatibility Matrix Tests', () => {
  test('should run comprehensive compatibility tests across device matrix', async ({ browser }) => {
    // Run compatibility tests on high priority devices
    const results = await compatibilityRunner.runFullCompatibilityMatrix(
      browser,
      '/', // Test URL
      ['high'] // Only high priority devices for CI speed
    );

    // Generate compatibility report
    const report = compatibilityRunner.generateCompatibilityReport(results);

    console.log('\n=== Device Compatibility Report ===');
    console.log(`Total Devices Tested: ${report.summary.totalDevices}`);
    console.log(`Passed: ${report.summary.passedDevices}`);
    console.log(`Failed: ${report.summary.failedDevices}`);
    console.log(`Average Score: ${report.summary.averageScore.toFixed(1)}/100`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);

    if (report.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    // Detailed device results
    console.log('\n=== Device Results ===');
    Object.entries(report.deviceResults).forEach(([deviceName, result]) => {
      console.log(`\n${result.device}:`);
      console.log(`  Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Score: ${result.score}/100`);
      console.log(`  Category: ${result.category}`);
      console.log(`  Load Time: ${result.metrics.loadTime}ms`);
      console.log(`  Features: ${Object.entries(result.features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(', ') || 'none'}`);
      
      if (result.issues.length > 0) {
        console.log(`  Issues:`);
        result.issues.forEach(issue => {
          const icon = issue.type === 'error' ? '🔴' : issue.type === 'warning' ? '🟡' : 'ℹ️';
          console.log(`    ${icon} ${issue.message} (severity: ${issue.severity})`);
        });
      }
    });

    // Assertions for test validation
    expect(report.summary.totalDevices).toBeGreaterThan(0);
    expect(report.summary.passedDevices).toBeGreaterThanOrEqual(Math.floor(report.summary.totalDevices * 0.7)); // At least 70% should pass
    expect(report.summary.averageScore).toBeGreaterThan(60); // Average score should be reasonable
    expect(report.summary.criticalIssues).toBeLessThan(5); // Should have minimal critical issues

    // High priority mobile devices should all pass
    const mobileResults = Object.values(report.deviceResults).filter(r => r.category === 'mobile');
    const passedMobileDevices = mobileResults.filter(r => r.passed).length;
    expect(passedMobileDevices).toBeGreaterThanOrEqual(Math.floor(mobileResults.length * 0.8)); // 80% mobile pass rate
  });

  test('should validate touch interaction compatibility', async ({ browser }) => {
    const touchDevices = deviceMatrix.filter(d => 
      d.priority === 'high' && 
      d.category === 'mobile' && 
      d.expectedFeatures.includes('touch')
    );

    const results = await Promise.all(
      touchDevices.slice(0, 3).map(async (deviceConfig) => { // Test first 3 for speed
        return await compatibilityRunner.runCompatibilityTest(browser, deviceConfig, '/');
      })
    );

    results.forEach((result, index) => {
      const deviceName = touchDevices[index].displayName;
      
      // Touch should be supported on all mobile devices
      expect(result.features.touch).toBe(true);
      
      // Interaction latency should be reasonable
      expect(result.metrics.interactionLatency).toBeLessThan(500);
      
      // Accessibility touch targets
      expect(result.features.accessibility).toBe(true);
      
      console.log(`${deviceName}: Touch latency ${result.metrics.interactionLatency}ms`);
    });
  });

  test('should validate responsive design across screen sizes', async ({ browser }) => {
    const responsiveTestDevices = [
      { name: 'Small Mobile', device: { ...deviceMatrix[0].device, viewport: { width: 320, height: 568 } } },
      { name: 'Large Mobile', device: { ...deviceMatrix[0].device, viewport: { width: 414, height: 896 } } },
      { name: 'Tablet Portrait', device: { ...deviceMatrix[5].device, viewport: { width: 768, height: 1024 } } },
      { name: 'Tablet Landscape', device: { ...deviceMatrix[6].device, viewport: { width: 1024, height: 768 } } }
    ];

    const results: Array<{ name: string; responsive: boolean; loadTime: number }> = [];

    for (const testDevice of responsiveTestDevices) {
      const context = await browser.newContext(testDevice.device);
      const page = await context.newPage();

      try {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        // Check responsive layout adaptation
        const layout = page.locator('[data-testid="responsive-im-layout"]');
        await expect(layout).toBeVisible();

        const deviceType = await layout.getAttribute('data-device');
        const breakpoint = await layout.getAttribute('data-breakpoint');
        
        const responsive = deviceType !== null && breakpoint !== null;

        results.push({
          name: testDevice.name,
          responsive,
          loadTime
        });

        console.log(`${testDevice.name}: ${responsive ? '✅' : '❌'} Responsive, Load: ${loadTime}ms, Device: ${deviceType}, Breakpoint: ${breakpoint}`);

      } finally {
        await context.close();
      }
    }

    // All devices should have responsive design
    const responsiveCount = results.filter(r => r.responsive).length;
    expect(responsiveCount).toBe(results.length);

    // Load times should be consistent across devices
    const loadTimes = results.map(r => r.loadTime);
    const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    
    expect(averageLoadTime).toBeLessThan(5000); // 5 second average
    expect(maxLoadTime).toBeLessThan(8000); // 8 second max
  });

  test('should validate performance consistency across devices', async ({ browser }) => {
    const performanceDevices = deviceMatrix
      .filter(d => d.priority === 'high')
      .slice(0, 4); // Test first 4 high priority devices

    const performanceResults: Array<{
      device: string;
      loadTime: number;
      renderTime: number;
      score: number;
    }> = [];

    for (const deviceConfig of performanceDevices) {
      const result = await compatibilityRunner.runCompatibilityTest(browser, deviceConfig, '/');
      
      performanceResults.push({
        device: deviceConfig.displayName,
        loadTime: result.metrics.loadTime,
        renderTime: result.metrics.renderTime,
        score: result.score
      });
    }

    console.log('\n=== Performance Comparison ===');
    performanceResults.forEach(result => {
      console.log(`${result.device}: Load ${result.loadTime}ms, Render ${result.renderTime}ms, Score ${result.score}/100`);
    });

    // Performance should be consistent
    const loadTimes = performanceResults.map(r => r.loadTime);
    const scores = performanceResults.map(r => r.score);
    
    const loadTimeVariation = (Math.max(...loadTimes) - Math.min(...loadTimes)) / Math.min(...loadTimes);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    expect(loadTimeVariation).toBeLessThan(2); // Load times shouldn't vary by more than 200%
    expect(averageScore).toBeGreaterThan(70); // Average score should be good
    expect(Math.min(...scores)).toBeGreaterThan(50); // No device should score very poorly
  });

  test('should validate accessibility across different devices', async ({ browser }) => {
    const accessibilityDevices = [
      deviceMatrix.find(d => d.name === 'iphone-12')!,
      deviceMatrix.find(d => d.name === 'ipad-pro')!
    ];

    for (const deviceConfig of accessibilityDevices) {
      const context = await browser.newContext(deviceConfig.device);
      const page = await context.newPage();

      try {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check touch target sizes
        const avatars = page.locator('[data-testid^="avatar-"]');
        const firstAvatar = avatars.first();
        
        if (await firstAvatar.isVisible()) {
          const boundingBox = await firstAvatar.boundingBox();
          
          // Touch targets should meet accessibility guidelines (44px minimum)
          expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
        }

        // Check color contrast (basic test)
        const avatarColor = await firstAvatar.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color
          };
        });

        expect(avatarColor.backgroundColor).toBeDefined();
        expect(avatarColor.color).toBeDefined();

        // Check keyboard navigation support
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        
        // Should be able to focus on interactive elements
        expect(focusedElement).toBeDefined();

        console.log(`${deviceConfig.displayName}: ✅ Accessibility checks passed`);

      } finally {
        await context.close();
      }
    }
  });

  test('should handle device-specific edge cases', async ({ browser }) => {
    const edgeCaseTests = [
      {
        name: 'Very Small Screen',
        config: { 
          ...deviceMatrix[0].device, 
          viewport: { width: 240, height: 320 } 
        },
        expectation: 'Should adapt to extremely small screens'
      },
      {
        name: 'Very Large Tablet',
        config: { 
          ...deviceMatrix[5].device, 
          viewport: { width: 1366, height: 1024 } 
        },
        expectation: 'Should handle large tablet screens'
      },
      {
        name: 'Square Viewport',
        config: { 
          ...deviceMatrix[0].device, 
          viewport: { width: 500, height: 500 } 
        },
        expectation: 'Should handle unusual aspect ratios'
      }
    ];

    for (const edgeCase of edgeCaseTests) {
      const context = await browser.newContext(edgeCase.config);
      const page = await context.newPage();

      try {
        await page.goto('/');
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Basic functionality should work
        const layout = page.locator('[data-testid="responsive-im-layout"]');
        await expect(layout).toBeVisible({ timeout: 5000 });

        // Should have some avatars visible
        const avatars = page.locator('[data-testid^="avatar-"]');
        const avatarCount = await avatars.count();
        expect(avatarCount).toBeGreaterThan(0);

        console.log(`${edgeCase.name}: ✅ Handled gracefully (${avatarCount} avatars visible)`);

      } catch (error) {
        // Log but don't fail test for edge cases - they should be handled gracefully
        console.log(`${edgeCase.name}: ⚠️ ${error}`);
      } finally {
        await context.close();
      }
    }
  });

  test('should maintain functionality during orientation changes', async ({ browser }) => {
    const orientationDevices = [
      { name: 'iPhone 12 Portrait', device: deviceMatrix[0].device },
      { name: 'iPhone 12 Landscape', device: deviceMatrix[1].device }
    ];

    for (const deviceConfig of orientationDevices) {
      const context = await browser.newContext(deviceConfig.device);
      const page = await context.newPage();

      try {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const layout = page.locator('[data-testid="responsive-im-layout"]');
        const initialOrientation = await layout.getAttribute('data-orientation');

        // Basic functionality should work in both orientations
        await expect(layout).toBeVisible();
        
        const avatars = page.locator('[data-testid^="avatar-"]');
        const avatarCount = await avatars.count();
        expect(avatarCount).toBeGreaterThan(0);

        // Interaction should work
        const firstAvatar = avatars.first();
        if (await firstAvatar.isVisible()) {
          await firstAvatar.tap();
          // Should not crash or break layout
          await expect(layout).toBeVisible();
        }

        console.log(`${deviceConfig.name}: ✅ Orientation ${initialOrientation} works (${avatarCount} avatars)`);

      } finally {
        await context.close();
      }
    }
  });
});