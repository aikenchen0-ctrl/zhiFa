/**
 * Debug Panel for PixiJS Mobile Applications
 * Provides real-time monitoring and debugging tools
 */

import { Logger } from '../utils/Logger.js';

export class DebugPanel {
  constructor(pixiApp, logger) {
    this.app = pixiApp;
    this.logger = logger;
    this.panel = null;
    this.isVisible = false;
    this.updateInterval = null;
    this.stats = {
      fps: 0,
      memory: null,
      drawCalls: 0,
      textures: 0
    };

    this.createDebugPanel();
  }

  init() {
    this.setupKeyboardShortcuts();
    this.startStatsCollection();
    
    this.logger.info(Logger.LOG_CATEGORIES.PIXI, 'Debug panel initialized');
  }

  createDebugPanel() {
    // Create debug panel container
    this.panel = document.createElement('div');
    this.panel.id = 'pixi-debug-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 320px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid #333;
      border-radius: 8px;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      display: none;
      backdrop-filter: blur(5px);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'PixiJS Debug Panel';
    title.style.cssText = 'margin: 0; font-size: 14px; color: #4CAF50;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
    `;
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create content sections
    const content = document.createElement('div');
    content.style.padding = '10px';

    // Performance stats section
    const perfSection = this.createSection('Performance Stats');
    this.perfStatsContainer = perfSection.content;

    // Memory stats section
    const memSection = this.createSection('Memory Usage');
    this.memStatsContainer = memSection.content;

    // PIXI stats section
    const pixiSection = this.createSection('PIXI Stats');
    this.pixiStatsContainer = pixiSection.content;

    // Touch/Interaction section
    const touchSection = this.createSection('Touch Events');
    this.touchStatsContainer = touchSection.content;

    // Log controls section
    const logSection = this.createSection('Log Controls');
    this.logControlsContainer = logSection.content;
    this.createLogControls();

    // Recent logs section
    const logsSection = this.createSection('Recent Logs');
    this.recentLogsContainer = logsSection.content;

    content.appendChild(perfSection.container);
    content.appendChild(memSection.container);
    content.appendChild(pixiSection.container);
    content.appendChild(touchSection.container);
    content.appendChild(logSection.container);
    content.appendChild(logsSection.container);

    this.panel.appendChild(header);
    this.panel.appendChild(content);

    document.body.appendChild(this.panel);
  }

  createSection(title) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 15px;';

    const header = document.createElement('h4');
    header.textContent = title;
    header.style.cssText = `
      margin: 0 0 8px 0;
      color: #2196F3;
      font-size: 13px;
      border-bottom: 1px solid #333;
      padding-bottom: 4px;
    `;

    const content = document.createElement('div');
    content.style.cssText = 'font-size: 11px; line-height: 1.4;';

    container.appendChild(header);
    container.appendChild(content);

    return { container, content };
  }

  createLogControls() {
    // Log level selector
    const levelSelect = document.createElement('select');
    levelSelect.style.cssText = `
      background: #333;
      border: 1px solid #555;
      color: #fff;
      padding: 4px;
      margin-right: 8px;
      border-radius: 4px;
    `;

    Object.keys(Logger.LOG_LEVELS).forEach(level => {
      const option = document.createElement('option');
      option.value = Logger.LOG_LEVELS[level];
      option.textContent = level;
      option.selected = Logger.LOG_LEVELS[level] === this.logger.logLevel;
      levelSelect.appendChild(option);
    });

    levelSelect.addEventListener('change', (e) => {
      this.logger.logLevel = parseInt(e.target.value);
      this.logger.info(Logger.LOG_CATEGORIES.PIXI, `Log level changed to ${e.target.selectedOptions[0].text}`);
    });

    // Clear logs button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Logs';
    clearBtn.style.cssText = `
      background: #f44336;
      border: none;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 8px;
    `;
    clearBtn.onclick = () => {
      this.logger.clearLogs();
      this.updateRecentLogs();
    };

    // Export logs button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export';
    exportBtn.style.cssText = `
      background: #4CAF50;
      border: none;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    `;
    exportBtn.onclick = () => this.exportLogs();

    const controls = document.createElement('div');
    controls.style.marginBottom = '8px';
    controls.appendChild(document.createTextNode('Level: '));
    controls.appendChild(levelSelect);
    controls.appendChild(document.createElement('br'));
    controls.appendChild(document.createElement('br'));
    controls.appendChild(clearBtn);
    controls.appendChild(exportBtn);

    this.logControlsContainer.appendChild(controls);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + D to toggle debug panel
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        this.toggle();
      }
      
      // Ctrl/Cmd + Shift + L to export logs
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault();
        this.exportLogs();
      }
    });

    // Show instructions
    console.log('Debug Panel Shortcuts:');
    console.log('Ctrl+Shift+D - Toggle debug panel');
    console.log('Ctrl+Shift+L - Export logs');
  }

  startStatsCollection() {
    this.updateInterval = setInterval(() => {
      this.updateStats();
      this.updateDisplay();
    }, 500); // Update every 500ms
  }

  updateStats() {
    // Performance stats
    this.stats.fps = this.app.ticker.FPS;
    this.stats.deltaTime = this.app.ticker.deltaTime;
    this.stats.deltaMS = this.app.ticker.deltaMS;
    
    // Memory stats
    this.stats.memory = this.logger.getMemoryInfo();
    
    // PIXI renderer stats
    if (this.app.renderer) {
      this.stats.drawCalls = this.app.renderer.gl?.drawCalls || 0;
      this.stats.textureUploads = this.app.renderer.texture?.managedTextures?.length || 0;
      this.stats.geometryCount = this.app.stage.children.length;
      this.stats.rendererType = this.app.renderer.type;
    }
  }

  updateDisplay() {
    if (!this.isVisible) return;

    // Update performance stats
    this.perfStatsContainer.innerHTML = `
      <div>FPS: <span style="color: ${this.stats.fps > 55 ? '#4CAF50' : this.stats.fps > 30 ? '#FF9800' : '#f44336'}">${this.stats.fps.toFixed(1)}</span></div>
      <div>Delta Time: ${this.stats.deltaTime.toFixed(3)}</div>
      <div>Delta MS: ${this.stats.deltaMS.toFixed(2)}ms</div>
    `;

    // Update memory stats
    if (this.stats.memory) {
      const usagePercent = (this.stats.memory.used / this.stats.memory.limit * 100).toFixed(1);
      this.memStatsContainer.innerHTML = `
        <div>Used: ${this.stats.memory.used}MB</div>
        <div>Total: ${this.stats.memory.total}MB</div>
        <div>Limit: ${this.stats.memory.limit}MB</div>
        <div>Usage: <span style="color: ${usagePercent < 50 ? '#4CAF50' : usagePercent < 80 ? '#FF9800' : '#f44336'}">${usagePercent}%</span></div>
      `;
    }

    // Update PIXI stats
    this.pixiStatsContainer.innerHTML = `
      <div>Renderer: ${this.stats.rendererType}</div>
      <div>Draw Calls: ${this.stats.drawCalls}</div>
      <div>Textures: ${this.stats.textureUploads}</div>
      <div>Stage Children: ${this.stats.geometryCount}</div>
      <div>Resolution: ${this.app.renderer.resolution}</div>
    `;

    // Update touch stats
    const touchEvents = this.logger.touchEvents || [];
    const recentTouches = touchEvents.slice(-5);
    this.touchStatsContainer.innerHTML = recentTouches.length > 0 
      ? recentTouches.map(touch => 
          `<div>${touch.type}: ${touch.touches.length} touches</div>`
        ).join('')
      : '<div>No recent touch events</div>';

    // Update recent logs
    this.updateRecentLogs();
  }

  updateRecentLogs() {
    const recentLogs = this.logger.logs.slice(-10);
    this.recentLogsContainer.innerHTML = recentLogs.length > 0
      ? recentLogs.map(log => {
          const levelName = Object.keys(Logger.LOG_LEVELS)[log.level];
          const time = (log.timestamp / 1000).toFixed(2);
          const color = this.getLogLevelColor(log.level);
          return `<div style="color: ${color}; margin-bottom: 2px;">
            [${time}s] ${levelName} [${log.category}] ${log.message}
          </div>`;
        }).join('')
      : '<div>No recent logs</div>';
  }

  getLogLevelColor(level) {
    switch (level) {
      case Logger.LOG_LEVELS.ERROR: return '#f44336';
      case Logger.LOG_LEVELS.WARN: return '#FF9800';
      case Logger.LOG_LEVELS.INFO: return '#4CAF50';
      case Logger.LOG_LEVELS.DEBUG: return '#2196F3';
      case Logger.LOG_LEVELS.TRACE: return '#9C27B0';
      default: return '#fff';
    }
  }

  exportLogs() {
    const logs = this.logger.exportLogs('json');
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixi-debug-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.logger.info(Logger.LOG_CATEGORIES.PIXI, 'Debug logs exported');
  }

  show() {
    this.isVisible = true;
    this.panel.style.display = 'block';
    this.logger.info(Logger.LOG_CATEGORIES.PIXI, 'Debug panel shown');
  }

  hide() {
    this.isVisible = false;
    this.panel.style.display = 'none';
    this.logger.info(Logger.LOG_CATEGORIES.PIXI, 'Debug panel hidden');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    
    this.logger.info(Logger.LOG_CATEGORIES.PIXI, 'Debug panel destroyed');
  }
}