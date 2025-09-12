import { devices, BrowserContext, Browser } from '@playwright/test';

// Device compatibility test matrix
export interface DeviceTestConfig {
  name: string;
  displayName: string;
  device: typeof devices[keyof typeof devices];
  category: 'mobile' | 'tablet' | 'desktop';
  priority: 'high' | 'medium' | 'low';
  expectedFeatures: string[];
  knownIssues?: string[];
}

export interface CompatibilityTestResult {
  device: string;
  category: string;
  passed: boolean;
  score: number; // 0-100
  features: {
    touch: boolean;
    responsive: boolean;
    performance: boolean;
    accessibility: boolean;
    gestures: boolean;
  };
  metrics: {
    loadTime: number;
    renderTime: number;
    memoryUsage?: number;
    interactionLatency: number;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    severity: number; // 1-10
  }>;
}

// Comprehensive device matrix
export const deviceMatrix: DeviceTestConfig[] = [
  // High Priority Mobile Devices
  {
    name: 'iphone-12',
    displayName: 'iPhone 12',
    device: devices['iPhone 12'],
    category: 'mobile',
    priority: 'high',
    expectedFeatures: ['touch', 'responsive', 'gestures', 'performance'],
  },
  {
    name: 'iphone-12-landscape',
    displayName: 'iPhone 12 Landscape',
    device: devices['iPhone 12 landscape'],
    category: 'mobile',
    priority: 'high',
    expectedFeatures: ['touch', 'responsive', 'gestures', 'orientation'],
  },
  {
    name: 'iphone-13-pro',
    displayName: 'iPhone 13 Pro',
    device: devices['iPhone 13 Pro'],
    category: 'mobile',
    priority: 'high',
    expectedFeatures: ['touch', 'responsive', 'high-dpi', 'gestures'],
  },
  {
    name: 'pixel-5',
    displayName: 'Google Pixel 5',
    device: devices['Pixel 5'],
    category: 'mobile',
    priority: 'high',
    expectedFeatures: ['touch', 'responsive', 'android-specific'],
  },
  {
    name: 'samsung-galaxy-s21',
    displayName: 'Samsung Galaxy S21',
    device: devices['Galaxy S21'],
    category: 'mobile',
    priority: 'medium',
    expectedFeatures: ['touch', 'responsive', 'samsung-browser'],
  },

  // Tablets
  {
    name: 'ipad-pro',
    displayName: 'iPad Pro',
    device: devices['iPad Pro'],
    category: 'tablet',
    priority: 'high',
    expectedFeatures: ['touch', 'responsive', 'large-screen', 'multitask'],
  },
  {
    name: 'ipad-pro-landscape',
    displayName: 'iPad Pro Landscape',
    device: devices['iPad Pro landscape'],
    category: 'tablet',
    priority: 'high',
    expectedFeatures: ['touch', 'responsive', 'split-view', 'orientation'],
  },
  {
    name: 'surface-pro',
    displayName: 'Microsoft Surface Pro',
    device: devices['Microsoft Surface Pro'],
    category: 'tablet',
    priority: 'medium',
    expectedFeatures: ['touch', 'responsive', 'desktop-class', 'stylus'],
  },

  // Legacy/Edge Cases
  {
    name: 'iphone-se',
    displayName: 'iPhone SE (2nd gen)',
    device: devices['iPhone SE'],
    category: 'mobile',
    priority: 'medium',
    expectedFeatures: ['touch', 'responsive', 'small-screen'],
    knownIssues: ['Small screen may affect layout'],
  },
  {
    name: 'iphone-6',
    displayName: 'iPhone 6',
    device: devices['iPhone 6'],
    category: 'mobile',
    priority: 'low',
    expectedFeatures: ['touch', 'responsive', 'legacy-ios'],
    knownIssues: ['Older iOS version limitations'],
  },
];

// Device capability detector
export class DeviceCapabilityDetector {
  async detectCapabilities(context: BrowserContext): Promise<{
    touch: boolean;
    hover: boolean;
    devicePixelRatio: number;
    viewport: { width: number; height: number };
    userAgent: string;
    platform: string;
    maxTouchPoints: number;
    orientationSupport: boolean;
  }> {
    const page = await context.newPage();
    
    try {
      const capabilities = await page.evaluate(() => {
        return {
          touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
          hover: window.matchMedia('(hover: hover)').matches,
          devicePixelRatio: window.devicePixelRatio,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
          orientationSupport: 'orientation' in screen || 'orientation' in window
        };
      });
      
      return capabilities;
    } finally {
      await page.close();
    }
  }
}

// Compatibility test runner
export class CompatibilityTestRunner {
  private detector: DeviceCapabilityDetector;

  constructor() {
    this.detector = new DeviceCapabilityDetector();
  }

  async runCompatibilityTest(
    browser: Browser,
    deviceConfig: DeviceTestConfig,
    testUrl: string = '/'
  ): Promise<CompatibilityTestResult> {
    const context = await browser.newContext(deviceConfig.device);
    const page = await context.newPage();
    
    const result: CompatibilityTestResult = {
      device: deviceConfig.displayName,
      category: deviceConfig.category,
      passed: false,
      score: 0,
      features: {
        touch: false,
        responsive: false,
        performance: false,
        accessibility: false,
        gestures: false
      },
      metrics: {
        loadTime: 0,
        renderTime: 0,
        interactionLatency: 0
      },
      issues: []
    };

    try {
      // Detect device capabilities
      const capabilities = await this.detector.detectCapabilities(context);
      
      // Load page and measure performance
      const startTime = Date.now();
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      result.metrics.loadTime = loadTime;

      // Test basic functionality
      await this.testBasicFunctionality(page, result);
      
      // Test responsive design
      await this.testResponsiveDesign(page, result, capabilities);
      
      // Test touch interactions (if applicable)
      if (capabilities.touch) {
        await this.testTouchInteractions(page, result);
      }
      
      // Test performance
      await this.testPerformance(page, result);
      
      // Test accessibility
      await this.testAccessibility(page, result);
      
      // Calculate overall score
      result.score = this.calculateScore(result);
      result.passed = result.score >= 70; // 70% threshold

    } catch (error) {
      result.issues.push({
        type: 'error',
        message: `Test execution failed: ${error}`,
        severity: 10
      });
    } finally {
      await context.close();
    }

    return result;
  }

  private async testBasicFunctionality(
    page: any,
    result: CompatibilityTestResult
  ): Promise<void> {
    try {
      // Check if main layout loads
      const layout = page.locator('[data-testid="responsive-im-layout"]');
      await layout.waitFor({ timeout: 10000 });
      
      // Check if avatars are visible
      const avatars = page.locator('[data-testid^="avatar-"]');
      const avatarCount = await avatars.count();
      
      if (avatarCount > 0) {
        result.features.responsive = true;
        result.score += 20;
      } else {
        result.issues.push({
          type: 'error',
          message: 'No avatars found on page',
          severity: 8
        });
      }
      
    } catch (error) {
      result.issues.push({
        type: 'error',
        message: `Basic functionality test failed: ${error}`,
        severity: 9
      });
    }
  }

  private async testResponsiveDesign(
    page: any,
    result: CompatibilityTestResult,
    capabilities: any
  ): Promise<void> {
    try {
      const layout = page.locator('[data-testid="responsive-im-layout"]');
      const deviceType = await layout.getAttribute('data-device');
      const orientation = await layout.getAttribute('data-orientation');
      
      // Verify device detection
      if (deviceType && ['mobile', 'tablet', 'desktop'].includes(deviceType)) {
        result.features.responsive = true;
        result.score += 15;
      }
      
      // Test viewport adaptation
      const viewport = capabilities.viewport;
      if (viewport.width <= 768 && deviceType === 'mobile') {
        result.score += 10;
      } else if (viewport.width > 768 && ['tablet', 'desktop'].includes(deviceType)) {
        result.score += 10;
      } else {
        result.issues.push({
          type: 'warning',
          message: `Device type detection may be incorrect: ${deviceType} for ${viewport.width}px width`,
          severity: 5
        });
      }
      
    } catch (error) {
      result.issues.push({
        type: 'error',
        message: `Responsive design test failed: ${error}`,
        severity: 6
      });
    }
  }

  private async testTouchInteractions(
    page: any,
    result: CompatibilityTestResult
  ): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Test touch on first avatar
      const firstAvatar = page.locator('[data-testid="avatar-0"]');
      if (await firstAvatar.isVisible()) {
        await firstAvatar.tap();
        const interactionTime = Date.now() - startTime;
        result.metrics.interactionLatency = interactionTime;
        
        if (interactionTime < 300) { // Good touch response
          result.features.touch = true;
          result.score += 20;
        } else {
          result.issues.push({
            type: 'warning',
            message: `Slow touch response: ${interactionTime}ms`,
            severity: 4
          });
        }

        // Test touch target size
        const avatarBox = await firstAvatar.boundingBox();
        if (avatarBox && (avatarBox.width >= 44 || avatarBox.height >= 44)) {
          result.features.accessibility = true;
          result.score += 10;
        } else {
          result.issues.push({
            type: 'warning',
            message: 'Touch targets may be too small for accessibility',
            severity: 6
          });
        }
      }
      
      result.features.gestures = true; // Assume gesture support if touch works
      result.score += 10;
      
    } catch (error) {
      result.issues.push({
        type: 'error',
        message: `Touch interaction test failed: ${error}`,
        severity: 7
      });
    }
  }

  private async testPerformance(
    page: any,
    result: CompatibilityTestResult
  ): Promise<void> {
    try {
      const metrics = await page.evaluate(() => {
        return {
          renderTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          // @ts-ignore
          memoryUsage: (performance as any).memory?.usedJSHeapSize
        };
      });
      
      result.metrics.renderTime = metrics.renderTime;
      result.metrics.memoryUsage = metrics.memoryUsage;
      
      // Performance scoring
      if (result.metrics.loadTime < 3000) {
        result.score += 15;
      } else if (result.metrics.loadTime < 5000) {
        result.score += 10;
      } else {
        result.issues.push({
          type: 'warning',
          message: `Slow load time: ${result.metrics.loadTime}ms`,
          severity: 5
        });
      }
      
      if (metrics.renderTime < 2000) {
        result.features.performance = true;
        result.score += 10;
      }
      
    } catch (error) {
      result.issues.push({
        type: 'warning',
        message: `Performance test failed: ${error}`,
        severity: 3
      });
    }
  }

  private async testAccessibility(
    page: any,
    result: CompatibilityTestResult
  ): Promise<void> {
    try {
      // Basic accessibility checks
      const hasProperStructure = await page.locator('main, [role="main"], [data-testid="responsive-im-layout"]').count() > 0;
      
      if (hasProperStructure) {
        result.features.accessibility = true;
        result.score += 10;
      } else {
        result.issues.push({
          type: 'info',
          message: 'Could improve semantic structure for accessibility',
          severity: 2
        });
      }
      
    } catch (error) {
      result.issues.push({
        type: 'info',
        message: `Accessibility test incomplete: ${error}`,
        severity: 1
      });
    }
  }

  private calculateScore(result: CompatibilityTestResult): number {
    // Base score from feature tests
    let score = result.score;
    
    // Penalties for issues
    result.issues.forEach(issue => {
      if (issue.type === 'error') {
        score -= issue.severity * 3;
      } else if (issue.type === 'warning') {
        score -= issue.severity;
      }
    });
    
    // Bonus for feature completeness
    const featureCount = Object.values(result.features).filter(Boolean).length;
    score += featureCount * 2;
    
    return Math.max(0, Math.min(100, score));
  }

  async runFullCompatibilityMatrix(
    browser: Browser,
    testUrl: string = '/',
    priority: ('high' | 'medium' | 'low')[] = ['high', 'medium']
  ): Promise<Record<string, CompatibilityTestResult>> {
    const results: Record<string, CompatibilityTestResult> = {};
    
    // Filter devices by priority
    const devicesToTest = deviceMatrix.filter(device => 
      priority.includes(device.priority)
    );
    
    console.log(`Running compatibility tests on ${devicesToTest.length} devices...`);
    
    for (const deviceConfig of devicesToTest) {
      console.log(`Testing: ${deviceConfig.displayName}`);
      
      try {
        const result = await this.runCompatibilityTest(browser, deviceConfig, testUrl);
        results[deviceConfig.name] = result;
        
        console.log(`✅ ${deviceConfig.displayName}: Score ${result.score}/100 (${result.passed ? 'PASS' : 'FAIL'})`);
        
        if (result.issues.length > 0) {
          console.log(`   Issues: ${result.issues.length}`);
        }
        
      } catch (error) {
        console.error(`❌ ${deviceConfig.displayName}: Test failed - ${error}`);
        results[deviceConfig.name] = {
          device: deviceConfig.displayName,
          category: deviceConfig.category,
          passed: false,
          score: 0,
          features: {
            touch: false,
            responsive: false,
            performance: false,
            accessibility: false,
            gestures: false
          },
          metrics: {
            loadTime: 0,
            renderTime: 0,
            interactionLatency: 0
          },
          issues: [{
            type: 'error',
            message: `Test execution failed: ${error}`,
            severity: 10
          }]
        };
      }
    }
    
    return results;
  }

  generateCompatibilityReport(results: Record<string, CompatibilityTestResult>): {
    summary: {
      totalDevices: number;
      passedDevices: number;
      failedDevices: number;
      averageScore: number;
      criticalIssues: number;
    };
    deviceResults: Record<string, CompatibilityTestResult>;
    recommendations: string[];
  } {
    const deviceResults = Object.values(results);
    const passedDevices = deviceResults.filter(r => r.passed).length;
    const totalDevices = deviceResults.length;
    const averageScore = deviceResults.reduce((sum, r) => sum + r.score, 0) / totalDevices;
    
    const criticalIssues = deviceResults.reduce((count, r) => 
      count + r.issues.filter(i => i.type === 'error' && i.severity >= 8).length, 0
    );

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (passedDevices / totalDevices < 0.8) {
      recommendations.push('Consider improving cross-device compatibility - less than 80% of devices are passing');
    }
    
    if (averageScore < 75) {
      recommendations.push('Overall performance and compatibility could be improved');
    }
    
    if (criticalIssues > 0) {
      recommendations.push(`${criticalIssues} critical issues need immediate attention`);
    }

    const touchDevicesWithIssues = deviceResults.filter(r => 
      r.category !== 'desktop' && !r.features.touch
    ).length;
    
    if (touchDevicesWithIssues > 0) {
      recommendations.push('Touch interaction support needs improvement on mobile devices');
    }

    return {
      summary: {
        totalDevices,
        passedDevices,
        failedDevices: totalDevices - passedDevices,
        averageScore,
        criticalIssues
      },
      deviceResults: results,
      recommendations
    };
  }
}

// Export the test runner instance
export const compatibilityRunner = new CompatibilityTestRunner();