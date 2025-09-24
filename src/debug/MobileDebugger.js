/**
 * Mobile Debugging Tools and Remote Debugging Support
 * Enables debugging PixiJS applications on mobile devices
 */

import { Logger, logger } from '../utils/Logger.js';

export class MobileDebugger {
  constructor(app, options = {}) {
    this.app = app;
    this.options = {
      enableRemoteLogging: options.enableRemoteLogging ?? true,
      remotePort: options.remotePort ?? 8080,
      enableTouchVisualization: options.enableTouchVisualization ?? true,
      enablePerformanceOverlay: options.enablePerformanceOverlay ?? true,
      logLevel: options.logLevel ?? Logger.LOG_LEVELS.DEBUG,
      ...options
    };

    this.isActive = false;
    this.touchPoints = new Map();
    this.performanceData = {
      frameRate: [],
      memoryUsage: [],
      touchLatency: []
    };
    this.remoteConnection = null;
    
    this.setupRemoteDebugging();
  }

  async init() {
    if (this.isActive) return;

    try {
      await this.setupMobileUI();
      this.setupTouchVisualization();
      this.setupPerformanceMonitoring();
      this.setupShakeToDebug();
      this.setupRemoteLogging();

      this.isActive = true;
      logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Mobile debugger initialized');

    } catch (error) {
      logger.error(Logger.LOG_CATEGORIES.MOBILE, 'Failed to initialize mobile debugger', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async setupMobileUI() {
    // Create mobile-friendly debug UI
    this.debugUI = document.createElement('div');
    this.debugUI.id = 'mobile-debug-ui';
    this.debugUI.style.cssText = `
      position: fixed;
      top: 0;
      right: -300px;
      width: 300px;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      color: white;
      font-family: monospace;
      font-size: 12px;
      z-index: 10001;
      overflow-y: auto;
      transition: right 0.3s ease;
      backdrop-filter: blur(10px);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
    `;

    // Create toggle button
    this.toggleButton = document.createElement('button');
    this.toggleButton.textContent = '🔧';
    this.toggleButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      font-size: 20px;
      z-index: 10002;
      backdrop-filter: blur(5px);
      touch-action: manipulation;
    `;

    this.toggleButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggle();
    }, { passive: false });

    // Create debug content
    this.createDebugContent();

    document.body.appendChild(this.debugUI);
    document.body.appendChild(this.toggleButton);
  }

  createDebugContent() {
    const content = document.createElement('div');
    content.style.padding = '20px';

    // Performance section
    const perfSection = this.createSection('Performance', [
      { label: 'FPS', id: 'fps-display', value: '--' },
      { label: 'Frame Time', id: 'frametime-display', value: '--' },
      { label: 'Memory', id: 'memory-display', value: '--' },
      { label: 'Draw Calls', id: 'drawcalls-display', value: '--' }
    ]);

    // Touch section
    const touchSection = this.createSection('Touch Events', [
      { label: 'Active Touches', id: 'touches-display', value: '0' },
      { label: 'Last Touch Latency', id: 'latency-display', value: '--' },
      { label: 'Touch History', id: 'touch-history', value: '', type: 'list' }
    ]);

    // Device info section
    const deviceSection = this.createSection('Device Info', [
      { label: 'User Agent', value: navigator.userAgent.slice(0, 50) + '...', type: 'text' },
      { label: 'Screen Size', value: `${screen.width}x${screen.height}`, type: 'text' },
      { label: 'Viewport', value: `${window.innerWidth}x${window.innerHeight}`, type: 'text' },
      { label: 'DPR', value: window.devicePixelRatio, type: 'text' },
      { label: 'Touch Points', value: navigator.maxTouchPoints || 'Unknown', type: 'text' }
    ]);

    // Log controls
    const logSection = this.createLogControls();

    content.appendChild(perfSection);
    content.appendChild(touchSection);
    content.appendChild(deviceSection);
    content.appendChild(logSection);

    this.debugUI.appendChild(content);
  }

  createSection(title, items) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 15px;';

    const header = document.createElement('h3');
    header.textContent = title;
    header.style.cssText = 'margin: 0 0 10px 0; color: #4CAF50; font-size: 14px;';

    section.appendChild(header);

    items.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 5px; align-items: center;';

      const label = document.createElement('span');
      label.textContent = item.label + ':';
      label.style.cssText = 'color: rgba(255, 255, 255, 0.7);';

      const value = document.createElement('span');
      if (item.id) {
        value.id = item.id;
      }
      
      if (item.type === 'list') {
        value.style.cssText = 'font-size: 10px; max-height: 60px; overflow-y: auto; word-break: break-all;';
      } else if (item.type === 'text') {
        value.style.cssText = 'font-size: 10px; max-width: 150px; word-break: break-all;';
      } else {
        value.style.cssText = 'color: #2196F3; font-weight: bold;';
      }
      
      value.textContent = item.value;

      row.appendChild(label);
      row.appendChild(value);
      section.appendChild(row);
    });

    return section;
  }

  createLogControls() {
    const section = document.createElement('div');
    section.style.marginBottom = '20px';

    const header = document.createElement('h3');
    header.textContent = 'Debug Controls';
    header.style.cssText = 'margin: 0 0 10px 0; color: #4CAF50; font-size: 14px;';
    section.appendChild(header);

    // Export logs button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Logs';
    exportBtn.style.cssText = `
      width: 100%;
      margin-bottom: 10px;
      padding: 8px;
      background: #FF9800;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
    `;
    exportBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.exportLogs();
    });

    // Clear logs button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Logs';
    clearBtn.style.cssText = `
      width: 100%;
      margin-bottom: 10px;
      padding: 8px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
    `;
    clearBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      logger.clearLogs();
      this.clearPerformanceData();
    });

    // Performance test button
    const perfTestBtn = document.createElement('button');
    perfTestBtn.textContent = 'Run Performance Test';
    perfTestBtn.style.cssText = `
      width: 100%;
      margin-bottom: 10px;
      padding: 8px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
    `;
    perfTestBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.runPerformanceTest();
    });

    section.appendChild(exportBtn);
    section.appendChild(clearBtn);
    section.appendChild(perfTestBtn);

    return section;
  }

  setupTouchVisualization() {
    if (!this.options.enableTouchVisualization) return;

    this.touchVisualizationLayer = document.createElement('div');
    this.touchVisualizationLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(this.touchVisualizationLayer);

    // Listen for touch events
    const canvas = this.app.canvas;
    
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: true });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: true });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: true });
  }

  onTouchStart(event) {
    const now = performance.now();
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchId = touch.identifier;
      const touchData = {
        id: touchId,
        startTime: now,
        lastTime: now,
        x: touch.clientX,
        y: touch.clientY,
        element: this.createTouchVisualization(touch.clientX, touch.clientY)
      };
      
      this.touchPoints.set(touchId, touchData);
      this.touchVisualizationLayer.appendChild(touchData.element);
      
      logger.debug(Logger.LOG_CATEGORIES.TOUCH, `Touch started: ${touchId}`, {
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0
      });
    });

    this.updateTouchDisplay();
  }

  onTouchMove(event) {
    const now = performance.now();
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchId = touch.identifier;
      const touchData = this.touchPoints.get(touchId);
      
      if (touchData) {
        const latency = now - touchData.lastTime;
        touchData.lastTime = now;
        touchData.x = touch.clientX;
        touchData.y = touch.clientY;
        
        // Update visualization
        touchData.element.style.left = (touch.clientX - 25) + 'px';
        touchData.element.style.top = (touch.clientY - 25) + 'px';
        
        // Track latency
        this.performanceData.touchLatency.push(latency);
        if (this.performanceData.touchLatency.length > 100) {
          this.performanceData.touchLatency.shift();
        }
      }
    });
  }

  onTouchEnd(event) {
    const now = performance.now();
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchId = touch.identifier;
      const touchData = this.touchPoints.get(touchId);
      
      if (touchData) {
        const duration = now - touchData.startTime;
        
        // Remove visualization with fade out
        touchData.element.style.transition = 'opacity 0.3s ease';
        touchData.element.style.opacity = '0';
        setTimeout(() => {
          if (touchData.element.parentNode) {
            touchData.element.parentNode.removeChild(touchData.element);
          }
        }, 300);
        
        this.touchPoints.delete(touchId);
        
        logger.debug(Logger.LOG_CATEGORIES.TOUCH, `Touch ended: ${touchId}`, {
          duration: duration.toFixed(2),
          x: touch.clientX,
          y: touch.clientY
        });
      }
    });

    this.updateTouchDisplay();
  }

  createTouchVisualization(x, y) {
    const element = document.createElement('div');
    element.style.cssText = `
      position: absolute;
      left: ${x - 25}px;
      top: ${y - 25}px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.8);
      pointer-events: none;
      animation: touchPulse 0.3s ease-out;
    `;
    
    return element;
  }

  setupPerformanceMonitoring() {
    if (!this.options.enablePerformanceOverlay || !this.app) return;

    setInterval(() => {
      this.updatePerformanceData();
    }, 100); // Update every 100ms for smooth data
  }

  updatePerformanceData() {
    if (!this.app || !this.isActive) return;

    const stats = this.app.getStats();
    
    // Update performance data arrays
    this.performanceData.frameRate.push(stats.fps);
    if (this.performanceData.frameRate.length > 100) {
      this.performanceData.frameRate.shift();
    }

    if (stats.memory) {
      this.performanceData.memoryUsage.push(stats.memory.used);
      if (this.performanceData.memoryUsage.length > 100) {
        this.performanceData.memoryUsage.shift();
      }
    }

    // Update UI
    this.updatePerformanceDisplay(stats);
  }

  updatePerformanceDisplay(stats) {
    const fpsElement = document.getElementById('fps-display');
    const frametimeElement = document.getElementById('frametime-display');
    const memoryElement = document.getElementById('memory-display');
    const drawCallsElement = document.getElementById('drawcalls-display');

    if (fpsElement) {
      fpsElement.textContent = stats.fps.toFixed(1);
      fpsElement.style.color = stats.fps > 55 ? '#4CAF50' : stats.fps > 30 ? '#FF9800' : '#f44336';
    }

    if (frametimeElement) {
      frametimeElement.textContent = stats.deltaMS?.toFixed(1) + 'ms' || '--';
    }

    if (memoryElement && stats.memory) {
      memoryElement.textContent = `${stats.memory.used}MB`;
      memoryElement.style.color = stats.memory.used < 100 ? '#4CAF50' : '#FF9800';
    }

    if (drawCallsElement) {
      drawCallsElement.textContent = stats.drawCalls || '--';
    }

    // Update touch latency
    const latencyElement = document.getElementById('latency-display');
    if (latencyElement && this.performanceData.touchLatency.length > 0) {
      const avgLatency = this.performanceData.touchLatency.reduce((a, b) => a + b) / this.performanceData.touchLatency.length;
      latencyElement.textContent = avgLatency.toFixed(1) + 'ms';
    }
  }

  updateTouchDisplay() {
    const touchesElement = document.getElementById('touches-display');
    if (touchesElement) {
      touchesElement.textContent = this.touchPoints.size.toString();
    }

    // Update touch history
    const historyElement = document.getElementById('touch-history');
    if (historyElement) {
      const recentTouches = Array.from(this.touchPoints.values())
        .slice(-3)
        .map(t => `${t.id}: (${t.x.toFixed(0)}, ${t.y.toFixed(0)})`)
        .join('\n');
      historyElement.textContent = recentTouches;
    }
  }

  setupShakeToDebug() {
    if (!('DeviceMotionEvent' in window)) return;

    let lastAcceleration = { x: 0, y: 0, z: 0 };
    let shakeThreshold = 15;
    
    window.addEventListener('devicemotion', (event) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
      const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
      const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);

      if (deltaX + deltaY + deltaZ > shakeThreshold) {
        this.toggle();
        logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Debug panel toggled by shake gesture');
      }

      lastAcceleration = { x: acceleration.x, y: acceleration.y, z: acceleration.z };
    });
  }

  setupRemoteDebugging() {
    if (!this.options.enableRemoteLogging) return;

    // Setup WebSocket connection for remote debugging
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.hostname}:${this.options.remotePort}/debug`;
      
      this.remoteConnection = new WebSocket(wsUrl);
      
      this.remoteConnection.onopen = () => {
        logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Remote debugging connection established');
      };
      
      this.remoteConnection.onerror = (error) => {
        logger.warn(Logger.LOG_CATEGORIES.MOBILE, 'Remote debugging connection failed');
      };
      
    } catch (error) {
      logger.warn(Logger.LOG_CATEGORIES.MOBILE, 'WebSocket not available for remote debugging');
    }
  }

  setupRemoteLogging() {
    // Intercept logger to send to remote if connected
    const originalLog = logger.log.bind(logger);
    
    logger.log = (level, category, message, data) => {
      const logEntry = originalLog(level, category, message, data);
      
      if (this.remoteConnection && this.remoteConnection.readyState === WebSocket.OPEN) {
        this.remoteConnection.send(JSON.stringify({
          type: 'log',
          entry: logEntry
        }));
      }
      
      return logEntry;
    };
  }

  runPerformanceTest() {
    logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Starting performance test');
    
    const testDuration = 5000; // 5 seconds
    const startTime = performance.now();
    let frameCount = 0;
    let minFPS = Infinity;
    let maxFPS = 0;
    
    const testTicker = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed < testDuration) {
        frameCount++;
        const currentFPS = this.app.getStats().fps;
        minFPS = Math.min(minFPS, currentFPS);
        maxFPS = Math.max(maxFPS, currentFPS);
        
        requestAnimationFrame(testTicker);
      } else {
        const avgFPS = frameCount / (testDuration / 1000);
        const results = {
          duration: testDuration,
          frameCount,
          avgFPS: avgFPS.toFixed(1),
          minFPS: minFPS.toFixed(1),
          maxFPS: maxFPS.toFixed(1),
          memoryUsage: this.performanceData.memoryUsage.slice(-50),
          touchLatency: this.performanceData.touchLatency.slice(-50)
        };
        
        logger.info(Logger.LOG_CATEGORIES.PERFORMANCE, 'Performance test completed', results);
        
        // Show results in a temporary overlay
        this.showPerformanceResults(results);
      }
    };
    
    requestAnimationFrame(testTicker);
  }

  showPerformanceResults(results) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 10003;
      font-family: monospace;
      font-size: 12px;
      max-width: 300px;
      text-align: center;
    `;
    
    overlay.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #4CAF50;">Performance Test Results</h3>
      <div>Average FPS: ${results.avgFPS}</div>
      <div>Min FPS: ${results.minFPS}</div>
      <div>Max FPS: ${results.maxFPS}</div>
      <div>Frames: ${results.frameCount}</div>
      <button id="close-results" style="margin-top: 15px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px;">Close</button>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('close-results').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }, 10000);
  }

  exportLogs() {
    const exportData = {
      timestamp: new Date().toISOString(),
      logs: logger.logs,
      performance: this.performanceData,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screen: { width: screen.width, height: screen.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        touchPoints: navigator.maxTouchPoints
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-debug-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Debug data exported');
  }

  clearPerformanceData() {
    this.performanceData = {
      frameRate: [],
      memoryUsage: [],
      touchLatency: []
    };
    this.touchPoints.clear();
    
    logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Performance data cleared');
  }

  toggle() {
    const isVisible = this.debugUI.style.right === '0px';
    this.debugUI.style.right = isVisible ? '-300px' : '0px';
    
    logger.info(Logger.LOG_CATEGORIES.MOBILE, `Debug panel ${isVisible ? 'hidden' : 'shown'}`);
  }

  show() {
    this.debugUI.style.right = '0px';
  }

  hide() {
    this.debugUI.style.right = '-300px';
  }

  destroy() {
    if (this.debugUI && this.debugUI.parentNode) {
      this.debugUI.parentNode.removeChild(this.debugUI);
    }
    
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }
    
    if (this.touchVisualizationLayer && this.touchVisualizationLayer.parentNode) {
      this.touchVisualizationLayer.parentNode.removeChild(this.touchVisualizationLayer);
    }
    
    if (this.remoteConnection) {
      this.remoteConnection.close();
    }
    
    this.isActive = false;
    logger.info(Logger.LOG_CATEGORIES.MOBILE, 'Mobile debugger destroyed');
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes touchPulse {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    100% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }
`;
document.head.appendChild(style);