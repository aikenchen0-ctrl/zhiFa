import { Page, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

export class VisualTestingUtils {
  private readonly baselineDir = 'tests/visual/baselines';
  private readonly actualDir = 'tests/reports/visual/actual';
  private readonly diffDir = 'tests/reports/visual/diff';

  constructor(private page: Page) {
    // Ensure directories exist
    [this.baselineDir, this.actualDir, this.diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async compareScreenshot(
    name: string, 
    options: {
      threshold?: number;
      fullPage?: boolean;
      clip?: { x: number; y: number; width: number; height: number };
      mask?: string[];
    } = {}
  ): Promise<{ match: boolean; diffPixels?: number; diffPercentage?: number }> {
    const { threshold = 0.2, fullPage = false, clip, mask } = options;
    
    // Mask dynamic content before screenshot
    if (mask) {
      for (const selector of mask) {
        await this.page.locator(selector).evaluate(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      }
    }

    // Take screenshot
    const actualPath = path.join(this.actualDir, `${name}.png`);
    await this.page.screenshot({
      path: actualPath,
      fullPage,
      clip,
    });

    // Restore masked elements
    if (mask) {
      for (const selector of mask) {
        await this.page.locator(selector).evaluate(el => {
          (el as HTMLElement).style.visibility = 'visible';
        });
      }
    }

    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    
    // If baseline doesn't exist, create it
    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(actualPath, baselinePath);
      return { match: true };
    }

    // Compare images
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const actual = PNG.sync.read(fs.readFileSync(actualPath));
    
    const { width, height } = baseline;
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      baseline.data,
      actual.data,
      diff.data,
      width,
      height,
      { threshold }
    );

    const totalPixels = width * height;
    const diffPercentage = (diffPixels / totalPixels) * 100;

    if (diffPixels > 0) {
      const diffPath = path.join(this.diffDir, `${name}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      match: diffPixels === 0,
      diffPixels,
      diffPercentage,
    };
  }

  async compareComponentScreenshot(
    selector: string,
    name: string,
    options: { threshold?: number; mask?: string[] } = {}
  ) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Element ${selector} not found or not visible`);
    }

    return this.compareScreenshot(name, {
      ...options,
      clip: box,
    });
  }

  async waitForAnimationsToComplete() {
    await this.page.waitForFunction(() => {
      const animations = document.getAnimations();
      return animations.length === 0 || animations.every(anim => anim.playState === 'finished');
    });
  }

  async stabilizeForScreenshot() {
    await this.page.waitForLoadState('networkidle');
    await this.waitForAnimationsToComplete();
    await this.page.waitForTimeout(500); // Additional stability buffer
  }

  async createBaseline(name: string, fullPage: boolean = false) {
    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    await this.page.screenshot({
      path: baselinePath,
      fullPage,
    });
  }

  async updateBaseline(name: string) {
    const actualPath = path.join(this.actualDir, `${name}.png`);
    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    
    if (fs.existsSync(actualPath)) {
      fs.copyFileSync(actualPath, baselinePath);
    }
  }

  // Mobile-specific visual testing
  async compareResponsiveScreenshots(
    name: string,
    viewports: Array<{ name: string; width: number; height: number }>,
    options: { threshold?: number; mask?: string[] } = {}
  ) {
    const results: Record<string, any> = {};

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.stabilizeForScreenshot();
      
      const result = await this.compareScreenshot(`${name}-${viewport.name}`, options);
      results[viewport.name] = result;
    }

    return results;
  }

  async generateVisualReport(testResults: Array<{
    name: string;
    match: boolean;
    diffPixels?: number;
    diffPercentage?: number;
  }>) {
    const reportPath = path.join('tests/reports', 'visual-report.html');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-case { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        .images { display: flex; gap: 10px; margin-top: 10px; }
        .images img { max-width: 300px; height: auto; }
        .stats { background: #f8f9fa; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>Visual Regression Test Report</h1>
    <div class="stats">
        <p>Total Tests: ${testResults.length}</p>
        <p>Passed: ${testResults.filter(r => r.match).length}</p>
        <p>Failed: ${testResults.filter(r => !r.match).length}</p>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    ${testResults.map(result => `
        <div class="test-case ${result.match ? 'passed' : 'failed'}">
            <h3>${result.name}</h3>
            <p>Status: ${result.match ? 'PASSED' : 'FAILED'}</p>
            ${!result.match ? `
                <p>Diff Pixels: ${result.diffPixels}</p>
                <p>Diff Percentage: ${result.diffPercentage?.toFixed(2)}%</p>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>
    `;

    fs.writeFileSync(reportPath, html);
    return reportPath;
  }
}

// CSS-in-JS testing helpers
export const getComputedStyles = async (page: Page, selector: string, properties: string[]) => {
  return await page.locator(selector).evaluate((element, props) => {
    const computed = window.getComputedStyle(element);
    return props.reduce((acc, prop) => ({
      ...acc,
      [prop]: computed.getPropertyValue(prop)
    }), {});
  }, properties);
};

export const verifyResponsiveStyles = async (
  page: Page, 
  selector: string, 
  breakpoints: Array<{ width: number; expectedStyles: Record<string, string> }>
) => {
  for (const { width, expectedStyles } of breakpoints) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(100); // Allow styles to apply
    
    const actualStyles = await getComputedStyles(page, selector, Object.keys(expectedStyles));
    
    for (const [property, expectedValue] of Object.entries(expectedStyles)) {
      expect(actualStyles[property]).toBe(expectedValue);
    }
  }
};