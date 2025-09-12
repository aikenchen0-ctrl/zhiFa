import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock Web APIs commonly used in mobile testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Mock IntersectionObserver
class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserver;

// Mock touch events
window.TouchEvent = class TouchEvent extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.touches = init.touches || [];
    this.targetTouches = init.targetTouches || [];
    this.changedTouches = init.changedTouches || [];
  }
};

// Mock performance API
window.performance.mark = jest.fn();
window.performance.measure = jest.fn();
window.performance.getEntriesByName = jest.fn(() => []);

// Mock WebGL context
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: {},
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      viewport: jest.fn(),
      createShader: jest.fn(),
      createProgram: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      getAttribLocation: jest.fn(),
      getUniformLocation: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      uniformMatrix4fv: jest.fn(),
    };
  }
  return null;
});

// Mock device pixel ratio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 2
});

// Mobile viewport simulation
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 375
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: 667
});

// Mock Network Information API
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    saveData: false
  }
});

// Global test utilities
global.createMockTouch = (x, y, identifier = 0) => ({
  identifier,
  clientX: x,
  clientY: y,
  pageX: x,
  pageY: y,
  screenX: x,
  screenY: y,
  target: document.body,
  radiusX: 20,
  radiusY: 20,
  rotationAngle: 0,
  force: 1
});

global.createTouchEvent = (type, touches = []) => {
  const touchList = {
    0: touches[0],
    length: touches.length,
    item: (index) => touches[index],
    [Symbol.iterator]: function* () {
      for (let i = 0; i < touches.length; i++) {
        yield touches[i];
      }
    }
  };

  return new TouchEvent(type, {
    touches: type === 'touchend' ? [] : touchList,
    targetTouches: type === 'touchend' ? [] : touchList,
    changedTouches: touchList,
    bubbles: true,
    cancelable: true
  });
};