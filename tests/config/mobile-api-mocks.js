// Mobile API Mocks for Testing

// Mock orientation API
Object.defineProperty(screen, 'orientation', {
  writable: true,
  value: {
    angle: 0,
    type: 'portrait-primary',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock battery API
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: jest.fn().mockResolvedValue({
    charging: true,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    level: 0.8,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })
});

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn().mockReturnValue(true)
});

// Mock device memory API
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  value: 4
});

// Mock hardware concurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4
});

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  }
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 1));
global.cancelIdleCallback = jest.fn();

// Mock Pointer Events
window.PointerEvent = class PointerEvent extends MouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId || 1;
    this.width = init.width || 1;
    this.height = init.height || 1;
    this.pressure = init.pressure || 0;
    this.tangentialPressure = init.tangentialPressure || 0;
    this.tiltX = init.tiltX || 0;
    this.tiltY = init.tiltY || 0;
    this.twist = init.twist || 0;
    this.pointerType = init.pointerType || 'touch';
    this.isPrimary = init.isPrimary || true;
  }
};

// Mock CSS.supports
if (!window.CSS) {
  window.CSS = {};
}
window.CSS.supports = jest.fn().mockReturnValue(true);

// Mock scroll behavior
Element.prototype.scrollIntoView = jest.fn();
window.scroll = jest.fn();
window.scrollTo = jest.fn();

// Mock visual viewport API
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    width: 375,
    height: 667,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock ambient light sensor
global.AmbientLightSensor = class AmbientLightSensor extends EventTarget {
  constructor() {
    super();
    this.illuminance = 100;
    this.activated = false;
  }
  
  start() {
    this.activated = true;
  }
  
  stop() {
    this.activated = false;
  }
};

// Mock accelerometer
global.Accelerometer = class Accelerometer extends EventTarget {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.z = 9.8;
    this.activated = false;
  }
  
  start() {
    this.activated = true;
  }
  
  stop() {
    this.activated = false;
  }
};