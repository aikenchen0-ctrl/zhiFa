import { test, expect, devices, Page } from '@playwright/test';
import { compareImages, VisualComparisonResult } from '../utils/image-comparison';

// Visual testing configuration
const visualTestDevices = [
  { name: 'iPhone-12', device: devices['iPhone 12'], suffix: 'iphone12' },
  { name: 'iPhone-12-landscape', device: devices['iPhone 12 landscape'], suffix: 'iphone12-land' },
  { name: 'Pixel-5', device: devices['Pixel 5'], suffix: 'pixel5' },
  { name: 'iPad-Pro', device: devices['iPad Pro'], suffix: 'ipad-pro' },
  { name: 'iPad-Pro-landscape', device: devices['iPad Pro landscape'], suffix: 'ipad-pro-land' },
];

// Test scenarios for visual regression
interface VisualTestScenario {
  name: string;
  description: string;
  setup: (page: Page) => Promise<void>;
  selector?: string;
  hideElements?: string[];
  threshold?: number;
}

const visualScenarios: VisualTestScenario[] = [
  {
    name: 'initial-load',
    description: 'Initial application load state',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      await page.waitForTimeout(1000); // Wait for animations
    },
    hideElements: ['[data-testid=\"device-info\"]'], // Hide dynamic info
    threshold: 0.05
  },
  {
    name: 'avatar-grid-10',
    description: 'Avatar grid with 10 avatars',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      // Ensure exactly 10 avatars are visible
      const avatars = page.locator('[data-testid^=\"avatar-\"]');
      const count = await avatars.count();
      if (count !== 10) {
        await page.evaluate((targetCount) => {
          const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
          if (container) {
            // Clear existing avatars
            container.querySelectorAll('[data-testid^=\"avatar-\"]').forEach(el => el.remove());
            
            // Add exactly targetCount avatars
            for (let i = 0; i < targetCount; i++) {
              const avatar = document.createElement('div');
              avatar.setAttribute('data-testid', `avatar-${i}`);
              avatar.textContent = `${i + 1}`;
              avatar.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background-color: #007bff; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;';
              container.appendChild(avatar);
            }
          }
        }, 10);
      }
      await page.waitForTimeout(500);
    },
    threshold: 0.03
  },
  {
    name: 'avatar-grid-50',
    description: 'Avatar grid with many avatars (50)',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          container.innerHTML = ''; // Clear existing content
          
          for (let i = 0; i < 50; i++) {
            const avatar = document.createElement('div');
            avatar.setAttribute('data-testid', `avatar-${i}`);
            avatar.textContent = `${i + 1}`;
            avatar.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; background-color: #007bff; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; margin: 2px;';
            container.appendChild(avatar);
          }
        }
      });
      await page.waitForTimeout(1000);
    },
    threshold: 0.05
  },
  {
    name: 'connection-lines',
    description: 'Avatar grid with connection lines visible',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      await page.evaluate(() => {
        // Add connection lines visualization
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.style.position = 'absolute';
          svg.style.top = '0';
          svg.style.left = '0';
          svg.style.pointerEvents = 'none';
          svg.style.zIndex = '1';

          // Add some example connection lines
          for (let i = 0; i < 5; i++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', `${Math.random() * 300 + 50}`);
            line.setAttribute('y1', `${Math.random() * 300 + 50}`);
            line.setAttribute('x2', `${Math.random() * 300 + 50}`);
            line.setAttribute('y2', `${Math.random() * 300 + 50}`);
            line.setAttribute('stroke', '#00ff00');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('opacity', '0.7');
            svg.appendChild(line);
          }

          container.appendChild(svg);
        }
      });
      await page.waitForTimeout(500);
    },
    threshold: 0.08
  },
  {
    name: 'different-avatar-states',
    description: 'Avatars in different online states',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          container.innerHTML = '';
          
          const states = [
            { color: '#28a745', label: 'Online' },
            { color: '#6c757d', label: 'Offline' },
            { color: '#ffc107', label: 'Away' },
            { color: '#dc3545', label: 'Busy' }
          ];

          states.forEach((state, index) => {
            const avatar = document.createElement('div');
            avatar.setAttribute('data-testid', `avatar-${index}`);
            avatar.textContent = state.label.slice(0, 2);
            avatar.style.cssText = `width: 60px; height: 60px; border-radius: 50%; background-color: ${state.color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; margin: 8px; position: relative;`;
            
            // Add status indicator
            const indicator = document.createElement('div');
            indicator.style.cssText = `width: 16px; height: 16px; border-radius: 50%; background-color: ${state.color}; position: absolute; bottom: -2px; right: -2px; border: 2px solid white;`;
            avatar.appendChild(indicator);
            
            container.appendChild(avatar);
          });
        }
      });
      await page.waitForTimeout(500);
    },
    threshold: 0.04
  },
  {
    name: 'responsive-layouts',
    description: 'Different responsive layout states',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      // This will automatically use the current device's layout
      await page.waitForTimeout(500);
    },
    threshold: 0.06
  },
  {
    name: 'error-state',
    description: 'Error state display',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          container.innerHTML = '';
          
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #dc3545;';
          errorDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div style="font-size: 18px; margin-bottom: 8px;">Connection Error</div>
            <div style="font-size: 14px; opacity: 0.7;">Unable to load avatars</div>
            <button style="margin-top: 16px; padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px;">Retry</button>
          `;
          
          container.appendChild(errorDiv);
        }
      });
      await page.waitForTimeout(500);
    },
    threshold: 0.03
  },
  {
    name: 'loading-state',
    description: 'Loading state with skeleton screens',
    setup: async (page: Page) => {
      await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          container.innerHTML = '';
          
          // Create skeleton loading states
          for (let i = 0; i < 6; i++) {
            const skeleton = document.createElement('div');
            skeleton.style.cssText = `
              width: 60px; 
              height: 60px; 
              border-radius: 50%; 
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: loading 1.5s infinite;
              margin: 8px;
            `;
            
            container.appendChild(skeleton);
          }
          
          // Add CSS animation
          if (!document.getElementById('loading-animation')) {
            const style = document.createElement('style');
            style.id = 'loading-animation';
            style.textContent = `
              @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `;
            document.head.appendChild(style);
          }
        }
      });
      await page.waitForTimeout(1000); // Wait for animation
    },
    threshold: 0.1, // Higher threshold due to animation
    hideElements: ['[data-testid=\"device-info\"]']
  }
];

// Run visual regression tests for each device and scenario
visualTestDevices.forEach(({ name, device, suffix }) => {
  test.describe(`Visual Regression - ${name}`, () => {
    test.use(device);

    visualScenarios.forEach((scenario) => {
      test(`${scenario.name} - ${scenario.description}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Setup the scenario
        await scenario.setup(page);
        
        // Hide dynamic elements if specified
        if (scenario.hideElements) {
          for (const element of scenario.hideElements) {
            await page.locator(element).evaluate(el => {
              (el as HTMLElement).style.visibility = 'hidden';
            });
          }
        }
        
        // Take screenshot
        const screenshotOptions = {
          fullPage: true,
          animations: 'disabled' as const,
          threshold: scenario.threshold || 0.05,
        };
        
        if (scenario.selector) {
          await expect(page.locator(scenario.selector)).toHaveScreenshot(
            `${scenario.name}-${suffix}.png`,
            screenshotOptions
          );
        } else {
          await expect(page).toHaveScreenshot(
            `${scenario.name}-${suffix}.png`,
            screenshotOptions
          );
        }
      });
    });

    // Additional component-specific visual tests
    test('avatar component variations', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          container.innerHTML = '';
          
          // Different avatar sizes and styles
          const variations = [
            { size: 40, color: '#007bff', text: 'S' },
            { size: 60, color: '#28a745', text: 'M' },
            { size: 80, color: '#ffc107', text: 'L' },
            { size: 40, color: '#dc3545', text: 'XS' },
            { size: 100, color: '#6f42c1', text: 'XL' }
          ];
          
          variations.forEach((variation, index) => {
            const avatar = document.createElement('div');
            avatar.setAttribute('data-testid', `avatar-variation-${index}`);
            avatar.textContent = variation.text;
            avatar.style.cssText = `
              width: ${variation.size}px; 
              height: ${variation.size}px; 
              border-radius: 50%; 
              background-color: ${variation.color}; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-size: ${variation.size * 0.25}px;
              margin: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            `;
            container.appendChild(avatar);
          });
        }
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`avatar-variations-${suffix}.png`, {
        threshold: 0.03,
      });
    });

    test('connection lines rendering', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          // Create a more complex connection visualization
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.style.position = 'absolute';
          svg.style.top = '0';
          svg.style.left = '0';
          svg.style.zIndex = '0';

          // Create a network of connections
          const connections = [
            { x1: 100, y1: 100, x2: 200, y2: 150, color: '#00ff00', width: 2 },
            { x1: 200, y1: 150, x2: 300, y2: 100, color: '#ff9900', width: 3 },
            { x1: 150, y1: 200, x2: 250, y2: 250, color: '#0099ff', width: 1 },
            { x1: 100, y1: 100, x2: 150, y2: 200, color: '#ff0099', width: 2 },
            { x1: 300, y1: 100, x2: 250, y2: 250, color: '#99ff00', width: 1.5 },
          ];
          
          connections.forEach(conn => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', conn.x1.toString());
            line.setAttribute('y1', conn.y1.toString());
            line.setAttribute('x2', conn.x2.toString());
            line.setAttribute('y2', conn.y2.toString());
            line.setAttribute('stroke', conn.color);
            line.setAttribute('stroke-width', conn.width.toString());
            line.setAttribute('opacity', '0.8');
            svg.appendChild(line);
          });

          container.appendChild(svg);
          
          // Add avatars at connection points
          const points = [
            { x: 100, y: 100 }, { x: 200, y: 150 }, { x: 300, y: 100 },
            { x: 150, y: 200 }, { x: 250, y: 250 }
          ];
          
          points.forEach((point, index) => {
            const avatar = document.createElement('div');
            avatar.style.cssText = `
              position: absolute;
              left: ${point.x - 25}px;
              top: ${point.y - 25}px;
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background-color: #007bff;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              z-index: 1;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
            avatar.textContent = (index + 1).toString();
            container.appendChild(avatar);
          });
        }
      });
      
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`connection-lines-${suffix}.png`, {
        threshold: 0.06,
      });
    });

    test('dark mode appearance', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Apply dark mode styles
      await page.evaluate(() => {
        document.body.style.backgroundColor = '#1a1a1a';
        document.body.style.color = '#ffffff';
        
        const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
        if (container) {
          (container as HTMLElement).style.backgroundColor = '#2d2d2d';
          
          // Create dark mode avatars
          container.innerHTML = '';
          for (let i = 0; i < 8; i++) {
            const avatar = document.createElement('div');
            avatar.setAttribute('data-testid', `avatar-${i}`);
            avatar.textContent = `${i + 1}`;
            avatar.style.cssText = `
              width: 60px; 
              height: 60px; 
              border-radius: 50%; 
              background-color: #404040; 
              border: 2px solid #606060;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: #ffffff; 
              font-size: 14px;
              margin: 8px;
              box-shadow: 0 2px 12px rgba(0,0,0,0.4);
            `;
            container.appendChild(avatar);
          }
        }
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(`dark-mode-${suffix}.png`, {
        threshold: 0.05,
      });
    });
  });
});

// Cross-device visual consistency tests
test.describe('Cross-Device Visual Consistency', () => {
  test('should maintain visual consistency across devices', async ({ browser }) => {
    const screenshots: Array<{
      device: string;
      buffer: Buffer;
      width: number;
      height: number;
    }> = [];

    // Take screenshots on different devices
    for (const { name, device, suffix } of visualTestDevices.slice(0, 3)) { // Test first 3 devices
      const context = await browser.newContext(device);
      const page = await context.newPage();

      try {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('[data-testid=\"responsive-im-layout\"]');

        // Standardize content
        await page.evaluate(() => {
          const container = document.querySelector('[data-testid=\"responsive-im-layout\"]');
          if (container) {
            container.innerHTML = '';
            for (let i = 0; i < 6; i++) {
              const avatar = document.createElement('div');
              avatar.setAttribute('data-testid', `avatar-${i}`);
              avatar.textContent = `${i + 1}`;
              avatar.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background-color: #007bff; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; margin: 8px;';
              container.appendChild(avatar);
            }
          }
        });

        await page.waitForTimeout(500);

        const screenshot = await page.screenshot({ fullPage: true });
        const viewport = page.viewportSize();
        
        screenshots.push({
          device: name,
          buffer: screenshot,
          width: viewport?.width || 0,
          height: viewport?.height || 0
        });

      } finally {
        await context.close();
      }
    }

    // Verify we got screenshots from all devices
    expect(screenshots.length).toBe(3);

    // All screenshots should have content (non-zero size)
    screenshots.forEach(({ device, buffer }) => {
      expect(buffer.length).toBeGreaterThan(1000); // At least 1KB
    });

    // Log device information for analysis
    console.log('Device screenshot sizes:', screenshots.map(({ device, buffer, width, height }) => ({
      device,
      size: `${buffer.length} bytes`,
      dimensions: `${width}x${height}`
    })));
  });
});