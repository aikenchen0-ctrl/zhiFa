import { Page, expect } from '@playwright/test';
import { userEvent } from '@testing-library/user-event';

export class MobileTestHelpers {
  constructor(private page: Page) {}

  // Touch gesture helpers
  async tap(selector: string, options?: { force?: boolean; timeout?: number }) {
    await this.page.locator(selector).tap(options);
  }

  async longPress(selector: string, duration: number = 1000) {
    const element = this.page.locator(selector);
    await element.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(duration);
    await this.page.mouse.up();
  }

  async swipe(
    startSelector: string,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number = 200
  ) {
    const element = this.page.locator(startSelector);
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not found for swipe');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'up':
        endY -= distance;
        break;
      case 'down':
        endY += distance;
        break;
      case 'left':
        endX -= distance;
        break;
      case 'right':
        endX += distance;
        break;
    }

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
  }

  async pinchZoom(selector: string, scale: number) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not found for pinch');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Simulate pinch gesture
    await this.page.touchscreen.tap(centerX - 50, centerY);
    await this.page.touchscreen.tap(centerX + 50, centerY);
    
    // Scale gesture simulation would require more complex coordinate calculations
    // This is a simplified version
    await this.page.mouse.wheel(0, scale > 1 ? -100 : 100);
  }

  async scrollToElement(selector: string) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    await expect(element).toBeInViewport();
  }

  // Viewport and orientation helpers
  async setPortraitMode() {
    await this.page.setViewportSize({ width: 390, height: 844 });
  }

  async setLandscapeMode() {
    await this.page.setViewportSize({ width: 844, height: 390 });
  }

  async simulateDeviceRotation() {
    const currentSize = this.page.viewportSize();
    if (currentSize) {
      await this.page.setViewportSize({
        width: currentSize.height,
        height: currentSize.width,
      });
    }
  }

  // Network and performance helpers
  async simulateSlowNetwork() {
    await this.page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      await route.continue();
    });
  }

  async simulateOfflineMode() {
    await this.page.context().setOffline(true);
  }

  async restoreOnlineMode() {
    await this.page.context().setOffline(false);
  }

  // Visual helpers
  async waitForLayoutStable(timeout: number = 3000) {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Additional stability wait
  }

  async captureScreenshot(name: string, options?: { fullPage?: boolean }) {
    return await this.page.screenshot({
      path: `tests/reports/screenshots/${name}.png`,
      fullPage: options?.fullPage || false,
    });
  }

  // Form interaction helpers
  async fillMobileForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`[name="${field}"], #${field}, [data-testid="${field}"]`);
      await input.tap();
      await input.fill(value);
      // Hide mobile keyboard
      await this.page.keyboard.press('Tab');
    }
  }

  // Assertion helpers
  async expectElementVisible(selector: string) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeInViewport();
  }

  async expectResponsiveLayout(breakpoint: 'mobile' | 'tablet') {
    if (breakpoint === 'mobile') {
      await this.setPortraitMode();
      // Verify mobile-specific elements
      await expect(this.page.locator('[data-mobile="true"]')).toBeVisible();
    } else {
      await this.page.setViewportSize({ width: 1024, height: 768 });
      // Verify tablet-specific elements
      await expect(this.page.locator('[data-tablet="true"]')).toBeVisible();
    }
  }
}

// Unit test helpers
export const createTouchEvent = (
  type: string,
  touches: Array<{ clientX: number; clientY: number; identifier: number }>
): TouchEvent => {
  const touchObjects = touches.map(touch => ({
    ...touch,
    target: document.body,
    radiusX: 10,
    radiusY: 10,
    rotationAngle: 0,
    force: 1,
  }));

  return new TouchEvent(type, {
    touches: touchObjects as any,
    targetTouches: touchObjects as any,
    changedTouches: touchObjects as any,
    bubbles: true,
    cancelable: true,
  });
};

export const mockMobileUserAgent = () => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    configurable: true,
  });
};

export const mockTouchScreen = () => {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: 5,
    configurable: true,
  });
};