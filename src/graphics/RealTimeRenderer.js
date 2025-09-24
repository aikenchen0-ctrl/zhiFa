/**
 * RealTimeRenderer - High-performance real-time rendering engine for PixiJS v8
 * Optimized for WebGL batch rendering and efficient frame updates
 * Handles thousands of connection lines with smooth 60fps performance
 */

import { Application, Container, Graphics, Ticker } from 'pixi.js';

export class RealTimeRenderer {
    constructor(options = {}) {
        this.logger = this.createLogger();
        this.performanceMonitor = new PerformanceMonitor();
        
        // Configuration
        this.config = {
            width: options.width || window.innerWidth,
            height: options.height || window.innerHeight,
            backgroundColor: options.backgroundColor || 0x000000,
            antialias: options.antialias !== false,
            resolution: options.resolution || window.devicePixelRatio,
            autoDensity: true,
            powerPreference: 'high-performance',
            ...options
        };

        // Rendering state
        this.app = null;
        this.stage = null;
        this.connectionContainer = null;
        this.popupContainer = null;
        this.isInitialized = false;
        this.isRendering = false;
        
        // Performance optimization
        this.frameBuffer = [];
        this.batchSize = options.batchSize || 100;
        this.updateQueue = new Map();
        this.renderStats = {
            frameCount: 0,
            avgFrameTime: 0,
            maxFrameTime: 0,
            drawCalls: 0,
            objectsRendered: 0
        };

        // Event listeners
        this.resizeHandler = this.handleResize.bind(this);
        this.visibilityHandler = this.handleVisibilityChange.bind(this);
        
        this.logger.info('RealTimeRenderer initialized', this.config);
    }

    /**
     * Initialize the renderer and create PIXI application
     * @param {HTMLElement} container - DOM container element
     * @returns {Promise<void>}
     */
    async initialize(container) {
        try {
            this.logger.info('Initializing renderer...');
            const startTime = performance.now();

            // Create PIXI application with optimized settings
            this.app = new Application();
            await this.app.init(this.config);

            // Setup stage and containers
            this.stage = this.app.stage;
            this.stage.sortableChildren = true;

            // Create organized container hierarchy
            this.connectionContainer = new Container();
            this.connectionContainer.name = 'connections';
            this.connectionContainer.zIndex = 1;
            this.stage.addChild(this.connectionContainer);

            this.popupContainer = new Container();
            this.popupContainer.name = 'popups';
            this.popupContainer.zIndex = 2;
            this.stage.addChild(this.popupContainer);

            // Append to DOM
            if (container) {
                container.appendChild(this.app.canvas);
            }

            // Setup event listeners
            this.setupEventListeners();

            // Initialize performance monitoring
            this.performanceMonitor.start();
            this.setupRenderLoop();

            this.isInitialized = true;
            const initTime = performance.now() - startTime;
            
            this.logger.info(`Renderer initialized successfully in ${initTime.toFixed(2)}ms`, {
                renderer: this.app.renderer.name,
                webgl: this.app.renderer.gl !== null,
                resolution: this.config.resolution,
                size: `${this.config.width}x${this.config.height}`
            });

        } catch (error) {
            this.logger.error('Failed to initialize renderer', error);
            throw error;
        }
    }

    /**
     * Setup optimized render loop with performance monitoring
     */
    setupRenderLoop() {
        const ticker = Ticker.shared;
        ticker.maxFPS = 60;
        ticker.minFPS = 30;

        ticker.add(() => {
            if (!this.isRendering) return;

            const frameStart = performance.now();
            
            try {
                // Process update queue in batches
                this.processUpdateQueue();
                
                // Update performance stats
                const frameTime = performance.now() - frameStart;
                this.updateRenderStats(frameTime);
                
                // Log performance warnings
                if (frameTime > 16.67) { // >60fps threshold
                    this.logger.warn(`Slow frame detected: ${frameTime.toFixed(2)}ms`);
                }

            } catch (error) {
                this.logger.error('Render loop error', error);
            }
        });

        this.isRendering = true;
        this.logger.info('Render loop started');
    }

    /**
     * Process queued updates in batches for optimal performance
     */
    processUpdateQueue() {
        if (this.updateQueue.size === 0) return;

        const updates = Array.from(this.updateQueue.values()).slice(0, this.batchSize);
        let processed = 0;

        for (const update of updates) {
            try {
                if (update.type === 'connection') {
                    this.updateConnectionLine(update.id, update.data);
                } else if (update.type === 'popup') {
                    this.updatePopupLayer(update.id, update.data);
                }
                
                this.updateQueue.delete(update.id);
                processed++;
                
            } catch (error) {
                this.logger.error(`Failed to process update ${update.id}`, error);
                this.updateQueue.delete(update.id);
            }
        }

        if (processed > 0) {
            this.renderStats.objectsRendered += processed;
        }
    }

    /**
     * Queue an update for batch processing
     * @param {string} id - Unique identifier for the update
     * @param {string} type - Type of update ('connection' or 'popup')
     * @param {Object} data - Update data
     */
    queueUpdate(id, type, data) {
        this.updateQueue.set(id, {
            id,
            type,
            data,
            timestamp: performance.now()
        });
    }

    /**
     * Create or update a connection line graphics object
     * @param {string} id - Unique connection identifier
     * @param {Object} data - Connection data with path points and style
     */
    updateConnectionLine(id, data) {
        try {
            let graphics = this.connectionContainer.getChildByName(id);
            
            if (!graphics) {
                graphics = new Graphics();
                graphics.name = id;
                this.connectionContainer.addChild(graphics);
            }

            // Clear previous drawing
            graphics.clear();

            // Apply line style
            const style = data.style || {};
            graphics.stroke({
                color: style.color || 0x007bff,
                width: style.width || 2,
                alpha: style.alpha || 1,
                cap: 'round',
                join: 'round'
            });

            // Draw the connection path
            if (data.path && data.path.length > 1) {
                graphics.moveTo(data.path[0].x, data.path[0].y);
                
                for (let i = 1; i < data.path.length; i++) {
                    graphics.lineTo(data.path[i].x, data.path[i].y);
                }
            }

            // Add glow effect if specified
            if (style.glow) {
                this.addGlowEffect(graphics, style.glow);
            }

            this.renderStats.drawCalls++;

        } catch (error) {
            this.logger.error(`Failed to update connection line ${id}`, error);
        }
    }

    /**
     * Add glow effect to graphics object
     * @param {Graphics} graphics - Graphics object to add glow to
     * @param {Object} glowConfig - Glow configuration
     */
    addGlowEffect(graphics, glowConfig) {
        try {
            // Create glow using multiple strokes with decreasing opacity
            const glowLayers = glowConfig.layers || 3;
            const glowColor = glowConfig.color || 0x007bff;
            const maxWidth = glowConfig.width || 8;
            const baseAlpha = glowConfig.alpha || 0.3;

            for (let i = glowLayers; i > 0; i--) {
                const layer = new Graphics();
                layer.name = `${graphics.name}_glow_${i}`;
                
                const width = (maxWidth * i) / glowLayers;
                const alpha = (baseAlpha * (glowLayers - i + 1)) / glowLayers;
                
                layer.stroke({
                    color: glowColor,
                    width: width,
                    alpha: alpha,
                    cap: 'round',
                    join: 'round'
                });

                // Copy path from main graphics
                // Note: This is a simplified approach, in production you'd want to 
                // store the path data and replay it
                this.connectionContainer.addChildAt(layer, 0);
            }

        } catch (error) {
            this.logger.error('Failed to add glow effect', error);
        }
    }

    /**
     * Create or update popup layer
     * @param {string} id - Unique popup identifier  
     * @param {Object} data - Popup data with geometry and style
     */
    updatePopupLayer(id, data) {
        try {
            let popup = this.popupContainer.getChildByName(id);
            
            if (!popup) {
                popup = new Container();
                popup.name = id;
                this.popupContainer.addChild(popup);
            }

            // Clear existing content
            popup.removeChildren();

            // Create background shape
            const background = new Graphics();
            this.drawComplexShape(background, data.shape, data.style);
            popup.addChild(background);

            // Position popup
            popup.position.set(data.position.x, data.position.y);
            popup.zIndex = data.zIndex || 100;

            this.renderStats.drawCalls++;

        } catch (error) {
            this.logger.error(`Failed to update popup layer ${id}`, error);
        }
    }

    /**
     * Draw complex shapes for popup backgrounds
     * @param {Graphics} graphics - Graphics object to draw on
     * @param {Object} shape - Shape definition
     * @param {Object} style - Style configuration
     */
    drawComplexShape(graphics, shape, style = {}) {
        graphics.clear();
        
        // Set fill and stroke
        if (style.fill) {
            graphics.fill(style.fill);
        }
        if (style.stroke) {
            graphics.stroke(style.stroke);
        }

        switch (shape.type) {
            case 'roundedRect':
                graphics.roundRect(0, 0, shape.width, shape.height, shape.radius || 10);
                break;
                
            case 'polygon':
                if (shape.points && shape.points.length > 0) {
                    graphics.poly(shape.points);
                }
                break;
                
            case 'custom':
                if (shape.path) {
                    this.drawCustomPath(graphics, shape.path);
                }
                break;
                
            default:
                graphics.rect(0, 0, shape.width || 100, shape.height || 50);
        }
    }

    /**
     * Draw custom path from point array
     * @param {Graphics} graphics - Graphics object
     * @param {Point[]} path - Array of points defining the path
     */
    drawCustomPath(graphics, path) {
        if (!path || path.length === 0) return;

        graphics.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            graphics.lineTo(path[i].x, path[i].y);
        }
        graphics.closePath();
    }

    /**
     * Remove connection line or popup
     * @param {string} id - Object identifier
     * @param {string} type - Object type ('connection' or 'popup')
     */
    removeObject(id, type) {
        try {
            const container = type === 'connection' ? this.connectionContainer : this.popupContainer;
            const object = container.getChildByName(id);
            
            if (object) {
                container.removeChild(object);
                object.destroy();
                this.logger.debug(`Removed ${type} ${id}`);
            }
            
            // Remove from update queue if present
            this.updateQueue.delete(id);
            
        } catch (error) {
            this.logger.error(`Failed to remove ${type} ${id}`, error);
        }
    }

    /**
     * Handle window resize events
     */
    handleResize() {
        if (!this.app) return;

        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        this.app.renderer.resize(newWidth, newHeight);
        this.config.width = newWidth;
        this.config.height = newHeight;

        this.logger.info(`Renderer resized to ${newWidth}x${newHeight}`);
    }

    /**
     * Handle page visibility changes for performance optimization
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseRendering();
        } else {
            this.resumeRendering();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', this.resizeHandler);
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Pause rendering to save resources
     */
    pauseRendering() {
        this.isRendering = false;
        this.performanceMonitor.pause();
        this.logger.info('Rendering paused');
    }

    /**
     * Resume rendering
     */
    resumeRendering() {
        this.isRendering = true;
        this.performanceMonitor.resume();
        this.logger.info('Rendering resumed');
    }

    /**
     * Update render statistics
     * @param {number} frameTime - Frame processing time in ms
     */
    updateRenderStats(frameTime) {
        this.renderStats.frameCount++;
        this.renderStats.avgFrameTime = (this.renderStats.avgFrameTime + frameTime) / 2;
        this.renderStats.maxFrameTime = Math.max(this.renderStats.maxFrameTime, frameTime);
        
        // Reset stats every 1000 frames
        if (this.renderStats.frameCount % 1000 === 0) {
            this.logger.debug('Render stats', { ...this.renderStats });
            this.renderStats.drawCalls = 0;
            this.renderStats.objectsRendered = 0;
            this.renderStats.maxFrameTime = 0;
        }
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance data
     */
    getPerformanceMetrics() {
        return {
            ...this.renderStats,
            fps: 1000 / this.renderStats.avgFrameTime,
            memory: this.performanceMonitor.getMemoryUsage(),
            activeObjects: {
                connections: this.connectionContainer.children.length,
                popups: this.popupContainer.children.length
            },
            queueSize: this.updateQueue.size
        };
    }

    /**
     * Clean up and destroy renderer
     */
    destroy() {
        this.logger.info('Destroying renderer...');
        
        this.pauseRendering();
        this.removeEventListeners();
        this.performanceMonitor.stop();
        
        if (this.app) {
            this.app.destroy(true);
        }
        
        this.updateQueue.clear();
        this.isInitialized = false;
        
        this.logger.info('Renderer destroyed');
    }

    /**
     * Create logger instance
     * @returns {Object} Logger object
     */
    createLogger() {
        const prefix = '[RealTimeRenderer]';
        return {
            debug: (msg, data) => console.debug(`${prefix} ${msg}`, data || ''),
            info: (msg, data) => console.info(`${prefix} ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`${prefix} ${msg}`, data || ''),
            error: (msg, error) => console.error(`${prefix} ${msg}`, error)
        };
    }
}

/**
 * Performance monitoring utility class
 */
class PerformanceMonitor {
    constructor() {
        this.startTime = 0;
        this.isRunning = false;
        this.samples = [];
        this.maxSamples = 60; // Keep last 60 samples
    }

    start() {
        this.startTime = performance.now();
        this.isRunning = true;
    }

    pause() {
        this.isRunning = false;
    }

    resume() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
        this.samples = [];
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
                total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
            };
        }
        return null;
    }

    addSample(value) {
        if (!this.isRunning) return;
        
        this.samples.push(value);
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }

    getAveragePerformance() {
        if (this.samples.length === 0) return 0;
        
        const sum = this.samples.reduce((a, b) => a + b, 0);
        return sum / this.samples.length;
    }
}

export default RealTimeRenderer;