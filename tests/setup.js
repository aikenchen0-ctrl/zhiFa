/**
 * Test Setup Configuration for Vitest
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock browser APIs that aren't available in Node.js
global.HTMLCanvasElement = class MockCanvas {
  constructor() {
    this.style = {};
    this.width = 800;
    this.height = 600;
  }
  
  getContext(contextType) {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        canvas: this,
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getParameter: vi.fn(() => 'Mock WebGL Renderer'),
        pixelStorei: vi.fn(),
        createShader: vi.fn(() => ({})),
        createProgram: vi.fn(() => ({})),
        useProgram: vi.fn(),
        viewport: vi.fn()
      };
    }
    return null;
  }
  
  addEventListener() {}
  removeEventListener() {}
};

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  };
}

// Mock PerformanceObserver
global.PerformanceObserver = class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  static supportedEntryTypes = ['measure', 'navigation', 'resource'];
};

// Mock window and document for tests
Object.defineProperty(window, 'innerWidth', { 
  writable: true, 
  configurable: true, 
  value: 1024 
});

Object.defineProperty(window, 'innerHeight', { 
  writable: true, 
  configurable: true, 
  value: 768 
});

Object.defineProperty(window, 'devicePixelRatio', { 
  writable: true, 
  configurable: true, 
  value: 2 
});

Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  configurable: true,
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
});

Object.defineProperty(navigator, 'platform', {
  writable: true,
  configurable: true,
  value: 'MacIntel'
});

Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  configurable: true,
  value: 0
});

Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  configurable: true,
  value: 8
});

Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  configurable: true,
  value: 8
});

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  writable: true,
  configurable: true,
  value: (tagName) => ({
    tagName: tagName.toUpperCase(),
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    getAttribute: vi.fn(),
    setAttribute: vi.fn(),
    textContent: '',
    innerHTML: '',
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
      toggle: vi.fn()
    }
  })
});

Object.defineProperty(document, 'body', {
  writable: true,
  configurable: true,
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    style: {},
    innerHTML: ''
  }
});

Object.defineProperty(document, 'hidden', {
  writable: true,
  configurable: true,
  value: false
});

// Mock console methods to avoid test pollution
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn()
};

// Mock fetch API
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK'
  })
);

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
  }
  
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null)
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset DOM
  if (document.body) {
    document.body.innerHTML = '';
  }
  
  // Reset window properties
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  
  // Reset navigator
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    configurable: true
  });
  
  // Reset performance.memory if it exists
  if (performance.memory) {
    delete performance.memory;
  }
});

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});