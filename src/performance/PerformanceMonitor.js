/**
 * PerformanceMonitor - Real-time performance tracking for PixiJS v8
 * Monitors FPS, memory usage, draw calls, and mobile-specific metrics
 */

class PerformanceMonitor {
    constructor() {
        this.isEnabled = true;
        this.metrics = {
            fps: 0,
            avgFPS: 0,
            minFPS: Infinity,
            maxFPS: 0,
            frameTime: 0,
            drawCalls: 0,
            textureSwaps: 0,
            memoryUsage: 0,
            activeBatches: 0,
            visibleObjects: 0,
            totalObjects: 0,
            touchLatency: 0
        };
        
        this.samples = {
            fps: [],
            frameTime: [],
            memory: [],
            maxSamples: 60
        };
        
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.startTime = this.lastTime;
        
        // Mobile-specific monitoring
        this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        // Performance thresholds for mobile
        this.thresholds = {
            minFPS: this.isMobile ? 30 : 60,
            maxFrameTime: this.isMobile ? 33.33 : 16.67, // ms
            maxMemoryMB: this.isMobile ? 100 : 200,
            maxDrawCalls: this.isMobile ? 50 : 100
        };
        
        this.warnings = [];
        this.setupMemoryMonitoring();
        this.createUI();
    }
    
    setupMemoryMonitoring() {
        // Try to use performance.memory if available (Chrome)
        this.memoryAPI = performance.memory;
        
        // Fallback memory estimation
        if (!this.memoryAPI) {
            this.estimatedMemory = 0;
        }
    }
    
    update(app, connectionSystem, objectPool) {
        if (!this.isEnabled) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        
        // FPS calculation
        this.frameCount++;
        const fps = 1000 / deltaTime;
        this.metrics.fps = fps;
        this.metrics.frameTime = deltaTime;
        
        // Update FPS samples
        this.samples.fps.push(fps);
        this.samples.frameTime.push(deltaTime);
        if (this.samples.fps.length > this.samples.maxSamples) {
            this.samples.fps.shift();
            this.samples.frameTime.shift();
        }
        
        // Calculate averages
        this.metrics.avgFPS = this.samples.fps.reduce((a, b) => a + b, 0) / this.samples.fps.length;
        this.metrics.minFPS = Math.min(this.metrics.minFPS, fps);
        this.metrics.maxFPS = Math.max(this.metrics.maxFPS, fps);
        
        // PixiJS specific metrics
        if (app && app.renderer) {
            const renderer = app.renderer;
            
            // Draw calls and batches (PixiJS v8 specific)
            if (renderer.batch) {
                this.metrics.activeBatches = renderer.batch._batches ? renderer.batch._batches.length : 0;
            }
            
            // Texture swaps
            if (renderer.texture && renderer.texture._unknownBoundTextures) {
                this.metrics.textureSwaps = renderer.texture._unknownBoundTextures;
            }
            
            // Visible objects count
            if (app.stage) {
                this.metrics.totalObjects = this.countChildren(app.stage);
                this.metrics.visibleObjects = this.countVisibleChildren(app.stage);
            }
        }
        
        // Connection system metrics
        if (connectionSystem) {
            this.metrics.activeConnections = connectionSystem.connections ? connectionSystem.connections.length : 0;
            this.metrics.connectionUpdates = connectionSystem.updateCount || 0;
        }
        
        // Object pool metrics
        if (objectPool) {
            this.metrics.pooledObjects = objectPool.getTotalPooled();
            this.metrics.activeObjects = objectPool.getTotalActive();
        }
        
        // Memory monitoring
        this.updateMemoryMetrics();
        
        // Check performance warnings
        this.checkPerformanceWarnings();
        
        // Update UI
        this.updateUI();
        
        this.lastTime = now;
    }
    
    updateMemoryMetrics() {
        if (this.memoryAPI) {
            // Chrome's performance.memory
            this.metrics.memoryUsage = this.memoryAPI.usedJSHeapSize / 1024 / 1024; // MB
            this.metrics.memoryLimit = this.memoryAPI.jsHeapSizeLimit / 1024 / 1024; // MB
        } else {
            // Estimate based on created objects
            this.metrics.memoryUsage = this.estimateMemoryUsage();
        }
        
        this.samples.memory.push(this.metrics.memoryUsage);
        if (this.samples.memory.length > this.samples.maxSamples) {
            this.samples.memory.shift();
        }
    }
    
    estimateMemoryUsage() {
        // Rough estimation based on object counts and typical sizes
        const estimatedSize = 
            (this.metrics.totalObjects * 0.001) + // Objects overhead
            (this.metrics.textureSwaps * 0.5) + // Texture memory estimate
            (this.metrics.activeBatches * 0.1); // Batch overhead
        
        return Math.max(this.estimatedMemory, estimatedSize);
    }
    
    countChildren(container, count = 0) {
        if (!container || !container.children) return count;
        
        count += container.children.length;
        for (const child of container.children) {
            count = this.countChildren(child, count);
        }
        return count;
    }
    
    countVisibleChildren(container, count = 0) {
        if (!container || !container.children) return count;
        
        for (const child of container.children) {
            if (child.visible) {
                count++;
                count = this.countVisibleChildren(child, count);
            }
        }
        return count;
    }
    
    checkPerformanceWarnings() {
        this.warnings = [];
        
        // FPS warnings
        if (this.metrics.avgFPS < this.thresholds.minFPS) {
            this.warnings.push(`Low FPS: ${this.metrics.avgFPS.toFixed(1)} (target: ${this.thresholds.minFPS})`);
        }
        
        // Frame time warnings
        if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
            this.warnings.push(`High frame time: ${this.metrics.frameTime.toFixed(1)}ms`);
        }
        
        // Memory warnings
        if (this.metrics.memoryUsage > this.thresholds.maxMemoryMB) {
            this.warnings.push(`High memory usage: ${this.metrics.memoryUsage.toFixed(1)}MB`);
        }
        
        // Draw call warnings
        if (this.metrics.activeBatches > this.thresholds.maxDrawCalls) {
            this.warnings.push(`Too many draw calls: ${this.metrics.activeBatches}`);
        }
        
        // Mobile-specific warnings
        if (this.isMobile) {
            if (this.metrics.visibleObjects > 500) {
                this.warnings.push(`Too many visible objects for mobile: ${this.metrics.visibleObjects}`);
            }
            
            if (this.devicePixelRatio > 2 && this.metrics.memoryUsage > 50) {
                this.warnings.push('High DPI + memory usage may cause issues');
            }
        }
    }
    
    createUI() {
        if (typeof document === 'undefined') return;
        
        // Create performance overlay
        this.ui = document.createElement('div');
        this.ui.id = 'performance-monitor';
        this.ui.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            min-width: 200px;
            max-height: 400px;
            overflow-y: auto;
            pointer-events: none;
            ${this.isMobile ? 'font-size: 10px; padding: 5px;' : ''}
        `;
        
        document.body.appendChild(this.ui);
        
        // Add toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = 'Perf';
        this.toggleButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 220px;
            background: #333;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            z-index: 10001;
            pointer-events: auto;
        `;
        
        this.toggleButton.onclick = () => this.toggle();
        document.body.appendChild(this.toggleButton);
    }
    
    updateUI() {
        if (!this.ui) return;
        
        const formatNumber = (num, decimals = 1) => num.toFixed(decimals);
        
        let html = `
            <div style="color: ${this.metrics.fps < this.thresholds.minFPS ? '#ff4444' : '#44ff44'}">
                <strong>FPS:</strong> ${formatNumber(this.metrics.fps)} (avg: ${formatNumber(this.metrics.avgFPS)})
            </div>
            <div><strong>Frame Time:</strong> ${formatNumber(this.metrics.frameTime)}ms</div>
            <div><strong>Memory:</strong> ${formatNumber(this.metrics.memoryUsage)}MB</div>
            <div><strong>Objects:</strong> ${this.metrics.visibleObjects}/${this.metrics.totalObjects}</div>
            <div><strong>Batches:</strong> ${this.metrics.activeBatches}</div>
            <div><strong>Texture Swaps:</strong> ${this.metrics.textureSwaps}</div>
        `;
        
        if (this.metrics.activeConnections !== undefined) {
            html += `<div><strong>Connections:</strong> ${this.metrics.activeConnections}</div>`;
        }
        
        if (this.metrics.pooledObjects !== undefined) {
            html += `<div><strong>Pool:</strong> ${this.metrics.activeObjects}/${this.metrics.pooledObjects}</div>`;
        }
        
        // Runtime info
        html += `
            <div style="margin-top: 10px; font-size: 10px; color: #ccc;">
                <div>Device: ${this.isMobile ? 'Mobile' : 'Desktop'} (${this.devicePixelRatio}x)</div>
                <div>Runtime: ${formatNumber((performance.now() - this.startTime) / 1000)}s</div>
            </div>
        `;
        
        // Warnings
        if (this.warnings.length > 0) {
            html += '<div style="margin-top: 10px; color: #ff4444;"><strong>Warnings:</strong></div>';
            for (const warning of this.warnings) {
                html += `<div style="font-size: 10px; color: #ff4444;">• ${warning}</div>`;
            }
        }
        
        this.ui.innerHTML = html;
    }
    
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.ui.style.display = this.isEnabled ? 'block' : 'none';
        this.toggleButton.textContent = this.isEnabled ? 'Hide' : 'Perf';
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    getReport() {
        const uptime = (performance.now() - this.startTime) / 1000;
        
        return {
            summary: {
                uptime: uptime,
                avgFPS: this.metrics.avgFPS,
                minFPS: this.metrics.minFPS,
                maxFPS: this.metrics.maxFPS,
                avgMemory: this.samples.memory.reduce((a, b) => a + b, 0) / this.samples.memory.length,
                warningCount: this.warnings.length
            },
            current: this.metrics,
            warnings: [...this.warnings],
            device: {
                isMobile: this.isMobile,
                devicePixelRatio: this.devicePixelRatio,
                userAgent: navigator.userAgent
            }
        };
    }
    
    exportCSV() {
        const data = [
            ['timestamp', 'fps', 'frameTime', 'memory', 'objects', 'batches']
        ];
        
        const now = performance.now();
        for (let i = 0; i < this.samples.fps.length; i++) {
            data.push([
                now - ((this.samples.fps.length - i) * 16.67), // approximate timestamp
                this.samples.fps[i],
                this.samples.frameTime[i],
                this.samples.memory[i] || 0,
                this.metrics.totalObjects,
                this.metrics.activeBatches
            ]);
        }
        
        return data.map(row => row.join(',')).join('\n');
    }
    
    destroy() {
        if (this.ui && this.ui.parentNode) {
            this.ui.parentNode.removeChild(this.ui);
        }
        if (this.toggleButton && this.toggleButton.parentNode) {
            this.toggleButton.parentNode.removeChild(this.toggleButton);
        }
    }
}

export default PerformanceMonitor;