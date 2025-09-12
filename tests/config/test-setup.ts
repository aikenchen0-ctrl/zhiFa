import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach } from 'vitest';

// Mock ResizeObserver for mobile layout tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for scroll-based tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock touch events
class MockTouchEvent extends Event {
  touches: Touch[];
  targetTouches: Touch[];
  changedTouches: Touch[];

  constructor(type: string, eventInitDict?: TouchEventInit) {
    super(type, eventInitDict);
    this.touches = eventInitDict?.touches ? Array.from(eventInitDict.touches) : [];
    this.targetTouches = eventInitDict?.targetTouches ? Array.from(eventInitDict.targetTouches) : [];
    this.changedTouches = eventInitDict?.changedTouches ? Array.from(eventInitDict.changedTouches) : [];
  }
}

global.TouchEvent = MockTouchEvent as any;

// Mock navigator for mobile detection
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
});

// Mock viewport for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock device orientation
Object.defineProperty(screen, 'orientation', {
  writable: true,
  value: {
    angle: 0,
    type: 'portrait-primary',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// Setup global test utilities
beforeAll(() => {
  // Global setup for mobile testing
});

afterEach(() => {
  vi.clearAllMocks();
});