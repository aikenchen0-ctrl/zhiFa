/**
 * ConnectionLineSystem - Advanced connection line management system for PixiJS v8
 * Provides real-time following connection lines with smooth rounded corners
 * Optimized for high-performance rendering of thousands of connections
 */

import { Container, Point } from 'pixi.js';
import GeometryUtils from './GeometryUtils.js';
import RealTimeRenderer from './RealTimeRenderer.js';

export class ConnectionLineSystem {
    constructor(options = {}) {
        this.logger = this.createLogger();
        this.options = {
            cornerRadius: 8,
            lineWidth: 2,
            lineColor: 0x007bff,
            glowEffect: false,
            smoothing: true,
            autoUpdate: true,
            maxConnections: 1000,
            updateThrottle: 16, // ~60fps
            ...options
        };

        // Core components
        this.renderer = null;
        this.connections = new Map();
        this.elementMap = new Map(); // Maps DOM elements to their rects
        this.scrollListeners = new Set();
        
        // Performance optimization
        this.updateQueue = [];
        this.lastUpdateTime = 0;
        this.isUpdating = false;
        this.frameId = null;
        
        // Intersection Observer for performance
        this.intersectionObserver = null;
        this.visibleElements = new Set();

        // Statistics
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            updatesPerSecond: 0,
            avgUpdateTime: 0,
            maxUpdateTime: 0
        };

        this.logger.info('ConnectionLineSystem initialized', this.options);
    }

    /**
     * Initialize the connection line system
     * @param {HTMLElement} container - Container element for the renderer
     * @returns {Promise<void>}
     */
    async initialize(container) {
        try {
            this.logger.info('Initializing connection line system...');
            const startTime = performance.now();

            // Initialize the renderer
            this.renderer = new RealTimeRenderer({
                width: container.clientWidth,
                height: container.clientHeight,
                backgroundColor: 0x000000,
                backgroundAlpha: 0,
                antialias: true
            });

            await this.renderer.initialize(container);

            // Setup intersection observer for performance
            this.setupIntersectionObserver();

            // Setup scroll listeners
            this.setupScrollListeners();

            // Start update loop if auto-update is enabled
            if (this.options.autoUpdate) {
                this.startUpdateLoop();
            }

            const initTime = performance.now() - startTime;
            this.logger.info(`Connection line system initialized in ${initTime.toFixed(2)}ms`);

        } catch (error) {
            this.logger.error('Failed to initialize connection line system', error);
            throw error;
        }
    }

    /**
     * Create a new connection between two DOM elements
     * @param {string} id - Unique connection identifier
     * @param {HTMLElement} sourceElement - Source element (bubble)
     * @param {HTMLElement} targetElement - Target element (avatar)
     * @param {Object} options - Connection options
     * @returns {Promise<boolean>} Success status
     */
    async createConnection(id, sourceElement, targetElement, options = {}) {
        try {
            if (this.connections.has(id)) {
                this.logger.warn(`Connection ${id} already exists, updating instead`);
                return this.updateConnection(id, sourceElement, targetElement, options);
            }

            if (this.connections.size >= this.options.maxConnections) {
                this.logger.error(`Maximum connections (${this.options.maxConnections}) reached`);
                return false;
            }

            // Detect message type (own vs others)
            const isOwn = this.detectMessageType(sourceElement);
            
            const connection = {
                id,
                sourceElement,
                targetElement,
                isOwn,
                style: {
                    color: options.color || this.options.lineColor,
                    width: options.width || this.options.lineWidth,
                    alpha: options.alpha || 1,
                    glow: options.glow || this.options.glowEffect
                },
                lastUpdate: 0,
                visible: true,
                path: [],
                needsUpdate: true
            };

            this.connections.set(id, connection);
            this.stats.totalConnections++;

            // Add elements to tracking
            this.trackElement(sourceElement);
            this.trackElement(targetElement);

            // Initial path calculation
            this.calculateConnectionPath(connection);

            // Queue for rendering
            this.queueConnectionUpdate(id);

            this.logger.debug(`Created connection ${id}`, {
                isOwn,
                sourceElement: sourceElement.className,
                targetElement: targetElement.className
            });

            return true;

        } catch (error) {
            this.logger.error(`Failed to create connection ${id}`, error);
            return false;
        }
    }

    /**
     * Update an existing connection
     * @param {string} id - Connection identifier
     * @param {HTMLElement} sourceElement - Updated source element
     * @param {HTMLElement} targetElement - Updated target element
     * @param {Object} options - Updated options
     * @returns {boolean} Success status
     */
    updateConnection(id, sourceElement, targetElement, options = {}) {
        try {
            const connection = this.connections.get(id);
            if (!connection) {
                this.logger.warn(`Connection ${id} not found for update`);
                return false;
            }

            // Update connection properties
            if (sourceElement) connection.sourceElement = sourceElement;
            if (targetElement) connection.targetElement = targetElement;
            
            if (options.color !== undefined) connection.style.color = options.color;
            if (options.width !== undefined) connection.style.width = options.width;
            if (options.alpha !== undefined) connection.style.alpha = options.alpha;
            if (options.glow !== undefined) connection.style.glow = options.glow;

            connection.needsUpdate = true;
            this.queueConnectionUpdate(id);

            this.logger.debug(`Updated connection ${id}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to update connection ${id}`, error);
            return false;
        }
    }

    /**
     * Remove a connection
     * @param {string} id - Connection identifier
     * @returns {boolean} Success status
     */
    removeConnection(id) {
        try {
            const connection = this.connections.get(id);
            if (!connection) {
                this.logger.warn(`Connection ${id} not found for removal`);
                return false;
            }

            // Remove from renderer
            this.renderer.removeObject(id, 'connection');

            // Remove from tracking
            this.connections.delete(id);
            this.stats.totalConnections--;

            this.logger.debug(`Removed connection ${id}`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to remove connection ${id}`, error);
            return false;
        }
    }

    /**
     * Detect whether a message bubble is from the current user
     * @param {HTMLElement} element - Message element
     * @returns {boolean} True if it's own message
     */
    detectMessageType(element) {
        // Common class patterns for own messages
        const ownPatterns = ['own', 'self', 'me', 'right', 'sent'];
        const className = element.className.toLowerCase();
        
        for (const pattern of ownPatterns) {
            if (className.includes(pattern)) {
                return true;
            }
        }

        // Check positioning - own messages are usually on the right
        const rect = element.getBoundingClientRect();
        const containerWidth = element.parentElement?.clientWidth || window.innerWidth;
        
        return rect.left > containerWidth * 0.6;
    }

    /**
     * Calculate connection path with rounded corners
     * @param {Object} connection - Connection object
     */
    calculateConnectionPath(connection) {
        try {
            const sourceRect = this.getElementRect(connection.sourceElement);
            const targetRect = this.getElementRect(connection.targetElement);

            if (!sourceRect || !targetRect) {
                this.logger.warn(`Cannot calculate path for ${connection.id}: missing element rects`);
                return;
            }

            // Calculate path using geometry utils
            const path = GeometryUtils.calculateConnectionPath(
                sourceRect,
                targetRect,
                connection.isOwn,
                this.options.cornerRadius
            );

            // Apply smoothing if enabled
            if (this.options.smoothing && path.length > 3) {
                connection.path = GeometryUtils.smoothPath(path, 0.5, 5);
            } else {
                connection.path = path;
            }

            connection.lastUpdate = performance.now();
            connection.needsUpdate = false;

        } catch (error) {
            this.logger.error(`Failed to calculate path for ${connection.id}`, error);
        }
    }

    /**
     * Get element rectangle with caching for performance
     * @param {HTMLElement} element - DOM element
     * @returns {Object} Element rectangle
     */
    getElementRect(element) {
        try {
            if (!element || !element.isConnected) return null;

            const rect = element.getBoundingClientRect();
            const containerRect = this.renderer.app.canvas.getBoundingClientRect();

            return {
                x: rect.left - containerRect.left,
                y: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height,
                right: rect.right - containerRect.left,
                bottom: rect.bottom - containerRect.top
            };

        } catch (error) {
            this.logger.error('Failed to get element rect', error);
            return null;
        }
    }

    /**
     * Track DOM element for updates
     * @param {HTMLElement} element - Element to track
     */
    trackElement(element) {
        if (!element || this.elementMap.has(element)) return;

        const rect = this.getElementRect(element);
        if (rect) {
            this.elementMap.set(element, rect);
        }
    }

    /**
     * Queue connection for update
     * @param {string} id - Connection identifier
     */
    queueConnectionUpdate(id) {
        if (!this.updateQueue.includes(id)) {
            this.updateQueue.push(id);
        }
    }

    /**
     * Process update queue
     */
    processUpdateQueue() {
        if (this.updateQueue.length === 0) return;

        const startTime = performance.now();
        const updates = this.updateQueue.splice(0, 50); // Process up to 50 per frame
        let processed = 0;

        for (const id of updates) {
            const connection = this.connections.get(id);
            if (!connection) continue;

            // Check if elements are still visible
            const sourceVisible = this.isElementVisible(connection.sourceElement);
            const targetVisible = this.isElementVisible(connection.targetElement);
            
            if (!sourceVisible || !targetVisible) {
                connection.visible = false;
                this.renderer.removeObject(id, 'connection');
                continue;
            }

            // Recalculate path if needed
            if (connection.needsUpdate || this.hasElementMoved(connection)) {
                this.calculateConnectionPath(connection);
            }

            // Update renderer
            if (connection.path.length > 1) {
                this.renderer.queueUpdate(id, 'connection', {
                    path: connection.path,
                    style: connection.style
                });
                
                connection.visible = true;
                processed++;
            }
        }

        const updateTime = performance.now() - startTime;
        this.stats.avgUpdateTime = (this.stats.avgUpdateTime + updateTime) / 2;
        this.stats.maxUpdateTime = Math.max(this.stats.maxUpdateTime, updateTime);
        this.stats.activeConnections = processed;
    }

    /**
     * Check if connection elements have moved
     * @param {Object} connection - Connection object
     * @returns {boolean} True if elements have moved
     */
    hasElementMoved(connection) {
        const currentSourceRect = this.getElementRect(connection.sourceElement);
        const currentTargetRect = this.getElementRect(connection.targetElement);
        
        if (!currentSourceRect || !currentTargetRect) return false;

        const threshold = 1; // 1px threshold
        const lastSourceRect = this.elementMap.get(connection.sourceElement);
        const lastTargetRect = this.elementMap.get(connection.targetElement);

        if (!lastSourceRect || !lastTargetRect) {
            // First time or missing cache, update cache
            this.elementMap.set(connection.sourceElement, currentSourceRect);
            this.elementMap.set(connection.targetElement, currentTargetRect);
            return true;
        }

        const sourceMoved = 
            Math.abs(currentSourceRect.x - lastSourceRect.x) > threshold ||
            Math.abs(currentSourceRect.y - lastSourceRect.y) > threshold;
            
        const targetMoved = 
            Math.abs(currentTargetRect.x - lastTargetRect.x) > threshold ||
            Math.abs(currentTargetRect.y - lastTargetRect.y) > threshold;

        if (sourceMoved || targetMoved) {
            this.elementMap.set(connection.sourceElement, currentSourceRect);
            this.elementMap.set(connection.targetElement, currentTargetRect);
            return true;
        }

        return false;
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if visible
     */
    isElementVisible(element) {
        if (!element || !element.isConnected) return false;
        
        // Use intersection observer result if available
        if (this.intersectionObserver && this.visibleElements.has(element)) {
            return true;
        }

        // Fallback to manual visibility check
        const rect = element.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        return (
            rect.right > 0 &&
            rect.bottom > 0 &&
            rect.left < viewport.width &&
            rect.top < viewport.height
        );
    }

    /**
     * Setup intersection observer for performance optimization
     */
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.visibleElements.add(entry.target);
                } else {
                    this.visibleElements.delete(entry.target);
                }
            }
        }, {
            rootMargin: '50px' // Extra margin for smooth transitions
        });
    }

    /**
     * Setup scroll event listeners
     */
    setupScrollListeners() {
        const scrollHandler = this.throttle(() => {
            // Mark all connections for update on scroll
            for (const connection of this.connections.values()) {
                connection.needsUpdate = true;
                this.queueConnectionUpdate(connection.id);
            }
        }, this.options.updateThrottle);

        // Listen to scroll events on window and scrollable containers
        window.addEventListener('scroll', scrollHandler, { passive: true });
        document.addEventListener('scroll', scrollHandler, { passive: true });

        this.scrollListeners.add(() => {
            window.removeEventListener('scroll', scrollHandler);
            document.removeEventListener('scroll', scrollHandler);
        });
    }

    /**
     * Start the update loop
     */
    startUpdateLoop() {
        if (this.isUpdating) return;

        this.isUpdating = true;
        this.lastUpdateTime = performance.now();

        const loop = () => {
            if (!this.isUpdating) return;

            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastUpdateTime;

            // Process updates at specified interval
            if (deltaTime >= this.options.updateThrottle) {
                this.processUpdateQueue();
                this.lastUpdateTime = currentTime;
                
                // Update stats
                this.stats.updatesPerSecond = 1000 / deltaTime;
            }

            this.frameId = requestAnimationFrame(loop);
        };

        loop();
        this.logger.info('Update loop started');
    }

    /**
     * Stop the update loop
     */
    stopUpdateLoop() {
        this.isUpdating = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.logger.info('Update loop stopped');
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    /**
     * Get system performance statistics
     * @returns {Object} Performance stats
     */
    getStats() {
        return {
            ...this.stats,
            rendererStats: this.renderer?.getPerformanceMetrics(),
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Get memory usage information
     * @returns {Object} Memory usage data
     */
    getMemoryUsage() {
        return {
            connections: this.connections.size,
            elementMap: this.elementMap.size,
            updateQueue: this.updateQueue.length,
            visibleElements: this.visibleElements.size
        };
    }

    /**
     * Clean up and destroy the system
     */
    destroy() {
        this.logger.info('Destroying connection line system...');
        
        this.stopUpdateLoop();
        
        // Remove scroll listeners
        this.scrollListeners.forEach(removeListener => removeListener());
        this.scrollListeners.clear();
        
        // Disconnect intersection observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Clear all data
        this.connections.clear();
        this.elementMap.clear();
        this.visibleElements.clear();
        this.updateQueue = [];
        
        // Destroy renderer
        if (this.renderer) {
            this.renderer.destroy();
        }
        
        this.logger.info('Connection line system destroyed');
    }

    /**
     * Create logger instance
     * @returns {Object} Logger object
     */
    createLogger() {
        const prefix = '[ConnectionLineSystem]';
        return {
            debug: (msg, data) => console.debug(`${prefix} ${msg}`, data || ''),
            info: (msg, data) => console.info(`${prefix} ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`${prefix} ${msg}`, data || ''),
            error: (msg, error) => console.error(`${prefix} ${msg}`, error)
        };
    }
}

export default ConnectionLineSystem;