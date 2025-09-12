import { MobileDeviceInfo } from '../types';

export class MobileUtils {
  private static deviceInfo: MobileDeviceInfo | null = null;

  /**
   * Get comprehensive device information
   */
  static getDeviceInfo(): MobileDeviceInfo {
    if (this.deviceInfo) return this.deviceInfo;

    const userAgent = navigator.userAgent.toLowerCase();
    const viewport = this.getViewportSize();
    
    this.deviceInfo = {
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      platform: this.getPlatform(),
      viewport,
      dpr: window.devicePixelRatio || 1,
      hasTouch: this.hasTouchSupport()
    };

    return this.deviceInfo;
  }

  /**
   * Check if device is mobile
   */
  static isMobile(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'mobile', 'iphone', 'ipod', 'android', 'blackberry', 
      'nokia', 'opera mini', 'windows mobile', 'windows phone', 'iemobile'
    ];
    return mobileKeywords.some(keyword => userAgent.includes(keyword));
  }

  /**
   * Check if device is tablet
   */
  static isTablet(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const tabletKeywords = ['ipad', 'tablet', 'playbook', 'silk'];
    return tabletKeywords.some(keyword => userAgent.includes(keyword));
  }

  /**
   * Get platform information
   */
  static getPlatform(): 'ios' | 'android' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    } else if (userAgent.includes('android')) {
      return 'android';
    }
    return 'unknown';
  }

  /**
   * Check touch support
   */
  static hasTouchSupport(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get viewport dimensions
   */
  static getViewportSize() {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }

  /**
   * Get safe area insets for iOS devices
   */
  static getSafeAreaInsets() {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0', 10),
      right: parseInt(style.getPropertyValue('--sar') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
      left: parseInt(style.getPropertyValue('--sal') || '0', 10)
    };
  }

  /**
   * Convert touch event to normalized coordinates
   */
  static normalizeTouchEvent(event: TouchEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const touches = Array.from(event.touches).map((touch, index) => ({
      id: touch.identifier || index,
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      timestamp: Date.now(),
      pressure: touch.force || 0.5,
      radiusX: touch.radiusX || 10,
      radiusY: touch.radiusY || 10
    }));

    return touches;
  }

  /**
   * Calculate distance between two points
   */
  static getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate velocity
   */
  static calculateVelocity(
    startPos: { x: number; y: number; timestamp: number },
    endPos: { x: number; y: number; timestamp: number }
  ): number {
    const distance = this.getDistance(startPos, endPos);
    const time = endPos.timestamp - startPos.timestamp;
    return time > 0 ? distance / time : 0;
  }

  /**
   * Get swipe direction
   */
  static getSwipeDirection(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    threshold = 30
  ): Direction | null {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return null;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Throttle function for performance
   */
  static throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Debounce function for performance
   */
  static debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Request animation frame with fallback
   */
  static requestAnimationFrame(callback: FrameRequestCallback): number {
    return window.requestAnimationFrame?.(callback) || 
           window.setTimeout(callback, 16);
  }

  /**
   * Cancel animation frame with fallback
   */
  static cancelAnimationFrame(id: number): void {
    window.cancelAnimationFrame?.(id) || window.clearTimeout(id);
  }

  /**
   * Add CSS vendor prefixes
   */
  static addVendorPrefix(property: string, value: string): Record<string, string> {
    const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
    const styles: Record<string, string> = {};
    
    prefixes.forEach(prefix => {
      styles[`${prefix}${property}`] = value;
    });

    return styles;
  }

  /**
   * Check if element is in viewport
   */
  static isInViewport(element: HTMLElement, threshold = 0): boolean {
    const rect = element.getBoundingClientRect();
    const viewport = this.getViewportSize();
    
    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= viewport.height + threshold &&
      rect.right <= viewport.width + threshold
    );
  }

  /**
   * Smooth scroll to element
   */
  static smoothScrollToElement(
    container: HTMLElement,
    target: HTMLElement,
    duration = 300
  ): void {
    const startTime = performance.now();
    const startScrollTop = container.scrollTop;
    const targetScrollTop = target.offsetTop - container.offsetTop;
    const distance = targetScrollTop - startScrollTop;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = this.easeInOutCubic(progress);
      
      container.scrollTop = startScrollTop + distance * easeProgress;
      
      if (progress < 1) {
        this.requestAnimationFrame(animate);
      }
    };

    this.requestAnimationFrame(animate);
  }

  /**
   * Easing function for smooth animations
   */
  static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Prevent scroll chaining (iOS Safari)
   */
  static preventScrollChaining(element: HTMLElement): void {
    let startY = 0;
    
    element.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    element.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].clientY;
      const scrollTop = element.scrollTop;
      const maxScroll = element.scrollHeight - element.clientHeight;
      
      // Prevent overscroll at top
      if (currentY > startY && scrollTop === 0) {
        e.preventDefault();
      }
      
      // Prevent overscroll at bottom
      if (currentY < startY && scrollTop >= maxScroll) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}