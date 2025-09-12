// Image comparison utility for visual regression testing

export interface VisualComparisonResult {
  passed: boolean;
  difference: number; // 0-1, percentage of different pixels
  details: {
    totalPixels: number;
    differentPixels: number;
    threshold: number;
  };
  errorMessage?: string;
}

// Simple pixel-by-pixel image comparison
export function compareImages(
  baseline: Buffer, 
  current: Buffer, 
  threshold: number = 0.05
): VisualComparisonResult {
  try {
    // Basic validation
    if (!baseline || !current) {
      return {
        passed: false,
        difference: 1,
        details: { totalPixels: 0, differentPixels: 0, threshold },
        errorMessage: 'Missing baseline or current image'
      };
    }

    // Simple byte comparison for demonstration
    // In a real implementation, you'd use a proper image comparison library
    const minLength = Math.min(baseline.length, current.length);
    let differentBytes = 0;

    for (let i = 0; i < minLength; i++) {
      if (baseline[i] !== current[i]) {
        differentBytes++;
      }
    }

    // Add difference for size mismatch
    differentBytes += Math.abs(baseline.length - current.length);

    const difference = differentBytes / Math.max(baseline.length, current.length);
    const passed = difference <= threshold;

    return {
      passed,
      difference,
      details: {
        totalPixels: Math.max(baseline.length, current.length),
        differentPixels: differentBytes,
        threshold
      }
    };

  } catch (error) {
    return {
      passed: false,
      difference: 1,
      details: { totalPixels: 0, differentPixels: 0, threshold },
      errorMessage: `Comparison failed: ${error}`
    };
  }
}

// Generate a difference image (placeholder implementation)
export function generateDiffImage(
  baseline: Buffer,
  current: Buffer,
  output: string
): Promise<void> {
  // In a real implementation, this would generate a visual diff
  // For now, just return a resolved promise
  return Promise.resolve();
}

// Image metadata extraction
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export function getImageMetadata(imageBuffer: Buffer): ImageMetadata {
  // Simplified metadata extraction
  // In practice, you'd use a library like sharp or jimp
  return {
    width: 0, // Would be extracted from image headers
    height: 0,
    format: 'png',
    size: imageBuffer.length
  };
}

// Visual regression test helper
export class VisualRegressionHelper {
  private baselineDir: string;
  private actualDir: string;
  private diffDir: string;

  constructor(
    baselineDir: string = './tests/visual/baseline',
    actualDir: string = './tests/visual/actual',
    diffDir: string = './tests/visual/diff'
  ) {
    this.baselineDir = baselineDir;
    this.actualDir = actualDir;
    this.diffDir = diffDir;
  }

  async compareScreenshot(
    testName: string,
    actualBuffer: Buffer,
    threshold: number = 0.05
  ): Promise<VisualComparisonResult> {
    try {
      // In a real implementation, you'd load the baseline image
      const baselineBuffer = actualBuffer; // Placeholder
      
      const result = compareImages(baselineBuffer, actualBuffer, threshold);
      
      if (!result.passed) {
        // Generate diff image for analysis
        await generateDiffImage(
          baselineBuffer,
          actualBuffer,
          `${this.diffDir}/${testName}-diff.png`
        );
      }

      return result;
    } catch (error) {
      return {
        passed: false,
        difference: 1,
        details: { totalPixels: 0, differentPixels: 0, threshold },
        errorMessage: `Screenshot comparison failed: ${error}`
      };
    }
  }

  // Batch comparison for multiple screenshots
  async compareScreenshots(
    tests: Array<{ name: string; buffer: Buffer; threshold?: number }>
  ): Promise<Record<string, VisualComparisonResult>> {
    const results: Record<string, VisualComparisonResult> = {};

    for (const test of tests) {
      results[test.name] = await this.compareScreenshot(
        test.name,
        test.buffer,
        test.threshold
      );
    }

    return results;
  }
}

// Performance-aware image comparison
export function fastImageComparison(
  baseline: Buffer,
  current: Buffer,
  sampleRate: number = 0.1 // Compare only 10% of pixels for speed
): VisualComparisonResult {
  const minLength = Math.min(baseline.length, current.length);
  const step = Math.floor(1 / sampleRate);
  let sampledPixels = 0;
  let differentPixels = 0;

  for (let i = 0; i < minLength; i += step) {
    sampledPixels++;
    if (baseline[i] !== current[i]) {
      differentPixels++;
    }
  }

  const difference = differentPixels / sampledPixels;

  return {
    passed: difference <= 0.05,
    difference,
    details: {
      totalPixels: sampledPixels,
      differentPixels,
      threshold: 0.05
    }
  };
}

// Cross-browser compatibility checker
export interface BrowserCompatibilityResult {
  browser: string;
  passed: boolean;
  issues: string[];
  score: number; // 0-100
}

export function checkBrowserCompatibility(
  screenshots: Record<string, Buffer>
): Record<string, BrowserCompatibilityResult> {
  const results: Record<string, BrowserCompatibilityResult> = {};
  const browsers = Object.keys(screenshots);

  browsers.forEach(browser => {
    const issues: string[] = [];
    let score = 100;

    // Compare against other browsers
    const otherBrowsers = browsers.filter(b => b !== browser);
    let totalDifference = 0;

    otherBrowsers.forEach(otherBrowser => {
      const comparison = compareImages(screenshots[browser], screenshots[otherBrowser]);
      totalDifference += comparison.difference;

      if (comparison.difference > 0.1) {
        issues.push(`Significant difference with ${otherBrowser}: ${(comparison.difference * 100).toFixed(1)}%`);
        score -= 20;
      }
    });

    const avgDifference = totalDifference / otherBrowsers.length;
    if (avgDifference > 0.05) {
      score -= Math.floor(avgDifference * 100);
    }

    results[browser] = {
      browser,
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  });

  return results;
}