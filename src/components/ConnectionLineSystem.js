/**
 * ConnectionLineSystem - High-Performance WebGL Connection Line System
 * 
 * Features:
 * - PIXI.js v8 Graphics API for WebGL optimization
 * - Real-time position tracking with batch rendering
 * - Rounded corner path calculation
 * - Performance monitoring and detailed logging
 * - Dynamic updates without unnecessary redraws
 * 
 * Connection Logic:
 * - Others' bubbles: Left border center → horizontal 5px → rounded turn → vertical to avatar height → rounded turn → horizontal to avatar right edge center
 * - Own bubbles: Right border center → horizontal 5px → rounded turn → vertical to avatar height → rounded turn → horizontal to avatar left edge center
 */

class ConnectionLineSystem {
    constructor(options = {}) {
        this.options = {
            containerSelector: options.containerSelector || 'body',
            lineColor: options.lineColor || 0xFFFFFF,
            lineAlpha: options.lineAlpha || 0.6,
            lineWidth: options.lineWidth || 2,
            cornerRadius: options.cornerRadius || 8,
            horizontalExtension: options.horizontalExtension || 5,
            enablePerformanceLogging: options.enablePerformanceLogging !== false,
            maxFPS: options.maxFPS || 60,
            batchSize: options.batchSize || 50,
            ...options
        };

        // Performance tracking
        this.performanceMetrics = {
            frameCount: 0,
            renderTime: 0,
            updateTime: 0,
            lastFPS: 0,
            connectionCount: 0,
            memoryUsage: 0
        };

        // Connection tracking
        this.connections = new Map();
        this.frameId = null;
        this.lastUpdateTime = 0;
        this.isDestroyed = false;

        this.init();
    }

    /**
     * Initialize the PIXI application and set up the rendering system
     */
    async init() {
        try {
            const startTime = performance.now();

            // Get container element
            this.container = document.querySelector(this.options.containerSelector);
            if (!this.container) {
                throw new Error(`Container not found: ${this.options.containerSelector}`);
            }

            // Calculate canvas size
            const rect = this.container.getBoundingClientRect();
            this.canvasWidth = Math.max(rect.width, window.innerWidth);
            this.canvasHeight = Math.max(rect.height, window.innerHeight);

            // Initialize PIXI Application with WebGL optimization
            this.app = new PIXI.Application();
            await this.app.init({
                width: this.canvasWidth,
                height: this.canvasHeight,
                backgroundColor: 0x000000,
                backgroundAlpha: 0,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                preference: 'webgl2', // Force WebGL2 for better performance
                powerPreference: 'high-performance'
            });

            // Set canvas style for overlay
            this.app.canvas.style.position = 'fixed';
            this.app.canvas.style.top = '0';
            this.app.canvas.style.left = '0';
            this.app.canvas.style.pointerEvents = 'none';
            this.app.canvas.style.zIndex = '1000';

            // Add canvas to container
            this.container.appendChild(this.app.canvas);

            // Create main graphics container
            this.graphicsContainer = new PIXI.Container();
            this.app.stage.addChild(this.graphicsContainer);

            // Setup event listeners
            this.setupEventListeners();

            // Start render loop
            this.startRenderLoop();

            const initTime = performance.now() - startTime;
            this.log(`ConnectionLineSystem initialized in ${initTime.toFixed(2)}ms`, 'info');
            this.log(`Canvas size: ${this.canvasWidth}x${this.canvasHeight}`, 'info');
            this.log(`WebGL Renderer: ${this.app.renderer.type}`, 'info');

        } catch (error) {
            this.log(`Initialization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Setup event listeners for resize and scroll
     */
    setupEventListeners() {
        // Throttled resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });

        // Throttled scroll handler
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.updateConnections(), 16); // ~60fps
        }, { passive: true });

        // Intersection Observer for performance optimization
        this.intersectionObserver = new IntersectionObserver(
            (entries) => this.handleVisibilityChange(entries),
            { threshold: 0, rootMargin: '50px' }
        );
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const rect = this.container.getBoundingClientRect();
        this.canvasWidth = Math.max(rect.width, window.innerWidth);
        this.canvasHeight = Math.max(rect.height, window.innerHeight);

        this.app.renderer.resize(this.canvasWidth, this.canvasHeight);
        this.updateConnections();

        this.log(`Canvas resized to: ${this.canvasWidth}x${this.canvasHeight}`, 'debug');
    }

    /**
     * Handle element visibility changes for performance optimization
     */
    handleVisibilityChange(entries) {
        for (const entry of entries) {
            const element = entry.target;
            const connectionId = element.dataset.connectionId;
            
            if (connectionId && this.connections.has(connectionId)) {
                const connection = this.connections.get(connectionId);
                connection.isVisible = entry.isIntersecting;
            }
        }
    }

    /**
     * Add a connection between bubble and avatar
     */
    addConnection(bubbleElement, avatarElement, type = 'other') {
        const connectionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store connection data
        const connection = {
            id: connectionId,
            bubbleElement,
            avatarElement,
            type, // 'other' or 'self'
            graphics: new PIXI.Graphics(),
            isVisible: true,
            lastUpdate: 0
        };

        // Add graphics to container
        this.graphicsContainer.addChild(connection.graphics);
        
        // Store connection
        this.connections.set(connectionId, connection);

        // Add to intersection observer
        bubbleElement.dataset.connectionId = connectionId;
        avatarElement.dataset.connectionId = connectionId;
        this.intersectionObserver.observe(bubbleElement);
        this.intersectionObserver.observe(avatarElement);

        this.performanceMetrics.connectionCount = this.connections.size;
        this.log(`Connection added: ${connectionId} (type: ${type})`, 'debug');

        return connectionId;
    }

    /**
     * Remove a connection
     */
    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        // Remove graphics
        this.graphicsContainer.removeChild(connection.graphics);
        connection.graphics.destroy();

        // Remove from intersection observer
        this.intersectionObserver.unobserve(connection.bubbleElement);
        this.intersectionObserver.unobserve(connection.avatarElement);

        // Clean up dataset
        delete connection.bubbleElement.dataset.connectionId;
        delete connection.avatarElement.dataset.connectionId;

        // Remove from connections
        this.connections.delete(connectionId);

        this.performanceMetrics.connectionCount = this.connections.size;
        this.log(`Connection removed: ${connectionId}`, 'debug');

        return true;
    }

    /**
     * Calculate connection path with rounded corners
     */
    calculateConnectionPath(bubbleRect, avatarRect, type) {
        const path = [];
        const radius = this.options.cornerRadius;
        const extension = this.options.horizontalExtension;

        let startX, startY, endX, endY;

        if (type === 'other') {
            // Others' bubbles: left border center to avatar right edge center
            startX = bubbleRect.left;
            startY = bubbleRect.top + bubbleRect.height / 2;
            endX = avatarRect.right;
            endY = avatarRect.top + avatarRect.height / 2;
        } else {
            // Own bubbles: right border center to avatar left edge center
            startX = bubbleRect.right;
            startY = bubbleRect.top + bubbleRect.height / 2;
            endX = avatarRect.left;
            endY = avatarRect.top + avatarRect.height / 2;
        }

        // Calculate path points
        const direction = type === 'other' ? -1 : 1; // left vs right
        const horizontalPoint = startX + (extension * direction);
        const verticalDiff = endY - startY;

        // Start point
        path.push({ x: startX, y: startY, type: 'start' });

        // Horizontal extension
        path.push({ x: horizontalPoint, y: startY, type: 'line' });

        // First corner (vertical turn)
        if (Math.abs(verticalDiff) > radius * 2) {
            const cornerStartY = startY + (verticalDiff > 0 ? radius : -radius);
            const cornerEndY = endY + (verticalDiff > 0 ? -radius : radius);

            // Rounded corner to vertical
            path.push({
                x: horizontalPoint,
                y: cornerStartY,
                type: 'arc',
                centerX: horizontalPoint + (radius * direction),
                centerY: cornerStartY,
                startAngle: Math.PI + (direction > 0 ? Math.PI / 2 : 0),
                endAngle: Math.PI / 2 + (direction > 0 ? Math.PI / 2 : 0),
                radius
            });

            // Vertical line
            path.push({ x: horizontalPoint + (radius * direction), y: cornerEndY, type: 'line' });

            // Second corner (horizontal turn to avatar)
            const finalDirection = type === 'other' ? 1 : -1;
            path.push({
                x: endX - (radius * finalDirection),
                y: endY,
                type: 'arc',
                centerX: endX - (radius * finalDirection),
                centerY: cornerEndY,
                startAngle: Math.PI / 2 + (finalDirection > 0 ? 0 : Math.PI / 2),
                endAngle: finalDirection > 0 ? 0 : Math.PI,
                radius
            });
        }

        // End point
        path.push({ x: endX, y: endY, type: 'end' });

        return path;
    }

    /**
     * Draw connection line with WebGL optimization
     */
    drawConnection(connection) {
        const { bubbleElement, avatarElement, graphics, type } = connection;

        // Get element positions
        const bubbleRect = bubbleElement.getBoundingClientRect();
        const avatarRect = avatarElement.getBoundingClientRect();

        // Skip if elements are not visible
        if (bubbleRect.width === 0 || avatarRect.width === 0) {
            graphics.clear();
            return;
        }

        // Calculate path
        const path = this.calculateConnectionPath(bubbleRect, avatarRect, type);
        
        // Clear previous drawing
        graphics.clear();

        // Set line style
        graphics.setStrokeStyle({
            width: this.options.lineWidth,
            color: this.options.lineColor,
            alpha: this.options.lineAlpha,
            cap: 'round',
            join: 'round'
        });

        // Draw path
        if (path.length > 0) {
            graphics.moveTo(path[0].x, path[0].y);

            for (let i = 1; i < path.length; i++) {
                const point = path[i];

                if (point.type === 'line' || point.type === 'end') {
                    graphics.lineTo(point.x, point.y);
                } else if (point.type === 'arc') {
                    // Draw arc using quadratic curve approximation for better WebGL performance
                    this.drawRoundedCorner(graphics, point);
                }
            }

            graphics.stroke();
        }

        connection.lastUpdate = performance.now();
    }

    /**
     * Draw rounded corner using optimized arc
     */
    drawRoundedCorner(graphics, arcData) {
        const { centerX, centerY, radius, startAngle, endAngle } = arcData;
        
        // Use PIXI's optimized arc method
        const startX = centerX + Math.cos(startAngle) * radius;
        const startY = centerY + Math.sin(startAngle) * radius;
        const endX = centerX + Math.cos(endAngle) * radius;
        const endY = centerY + Math.sin(endAngle) * radius;

        // Move to start of arc
        graphics.lineTo(startX, startY);
        
        // Draw arc
        graphics.arc(centerX, centerY, radius, startAngle, endAngle);
        
        // Continue to end point
        graphics.lineTo(endX, endY);
    }

    /**
     * Update all connections with batch processing
     */
    updateConnections() {
        if (this.isDestroyed || this.connections.size === 0) return;

        const updateStartTime = performance.now();
        let updatedCount = 0;

        // Batch process connections
        const connectionsArray = Array.from(this.connections.values());
        const batchSize = this.options.batchSize;

        for (let i = 0; i < connectionsArray.length; i += batchSize) {
            const batch = connectionsArray.slice(i, i + batchSize);
            
            for (const connection of batch) {
                if (connection.isVisible) {
                    this.drawConnection(connection);
                    updatedCount++;
                } else {
                    // Clear invisible connections to save performance
                    connection.graphics.clear();
                }
            }

            // Yield control to prevent blocking
            if (i + batchSize < connectionsArray.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        const updateTime = performance.now() - updateStartTime;
        this.performanceMetrics.updateTime = updateTime;

        if (this.options.enablePerformanceLogging && updatedCount > 0) {
            this.log(`Updated ${updatedCount} connections in ${updateTime.toFixed(2)}ms`, 'debug');
        }
    }

    /**
     * Start the render loop with FPS control
     */
    startRenderLoop() {
        const targetFrameTime = 1000 / this.options.maxFPS;
        
        const renderLoop = (currentTime) => {
            if (this.isDestroyed) return;

            const deltaTime = currentTime - this.lastUpdateTime;

            if (deltaTime >= targetFrameTime) {
                const renderStartTime = performance.now();

                // Update performance metrics
                this.performanceMetrics.frameCount++;
                if (this.performanceMetrics.frameCount % 60 === 0) {
                    this.performanceMetrics.lastFPS = Math.round(1000 / deltaTime);
                    this.updateMemoryUsage();
                }

                // Update connections
                this.updateConnections();

                this.performanceMetrics.renderTime = performance.now() - renderStartTime;
                this.lastUpdateTime = currentTime;
            }

            this.frameId = requestAnimationFrame(renderLoop);
        };

        this.frameId = requestAnimationFrame(renderLoop);
        this.log('Render loop started', 'info');
    }

    /**
     * Update memory usage metrics
     */
    updateMemoryUsage() {
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            memoryUsageMB: (this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2),
            averageRenderTime: this.performanceMetrics.renderTime.toFixed(2),
            averageUpdateTime: this.performanceMetrics.updateTime.toFixed(2)
        };
    }

    /**
     * Logging with different levels
     */
    log(message, level = 'info') {
        if (!this.options.enablePerformanceLogging) return;

        const timestamp = new Date().toISOString();
        const logMessage = `[ConnectionLineSystem][${level.toUpperCase()}] ${timestamp}: ${message}`;

        switch (level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'debug':
                console.debug(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }

    /**
     * Auto-detect and connect bubble-avatar pairs
     */
    autoDetectConnections() {
        // Find all bubbles and avatars
        const bubbles = document.querySelectorAll('[class*="glass-"], .cursor-pointer');
        const avatars = document.querySelectorAll('[class*="w-10 h-10"], [class*="w-8 h-8"]');

        let detectCount = 0;

        bubbles.forEach(bubble => {
            // Skip if already has connection
            if (bubble.dataset.connectionId) return;

            // Find closest avatar
            const bubbleRect = bubble.getBoundingClientRect();
            let closestAvatar = null;
            let minDistance = Infinity;

            avatars.forEach(avatar => {
                const avatarRect = avatar.getBoundingClientRect();
                const distance = Math.sqrt(
                    Math.pow(bubbleRect.left - avatarRect.left, 2) +
                    Math.pow(bubbleRect.top - avatarRect.top, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestAvatar = avatar;
                }
            });

            if (closestAvatar && minDistance < 500) { // 500px threshold
                // Determine type based on bubble position
                const type = bubble.closest('.flex-row-reverse') ? 'self' : 'other';
                this.addConnection(bubble, closestAvatar, type);
                detectCount++;
            }
        });

        this.log(`Auto-detected ${detectCount} connections`, 'info');
        return detectCount;
    }

    /**
     * Destroy the connection system and clean up resources
     */
    destroy() {
        this.log('Destroying ConnectionLineSystem...', 'info');
        
        this.isDestroyed = true;

        // Cancel animation frame
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }

        // Remove event listeners
        this.intersectionObserver?.disconnect();

        // Clear all connections
        this.connections.forEach(connection => {
            connection.graphics.destroy();
        });
        this.connections.clear();

        // Destroy PIXI application
        if (this.app) {
            this.app.destroy(true, true);
            if (this.app.canvas.parentNode) {
                this.app.canvas.parentNode.removeChild(this.app.canvas);
            }
        }

        this.log('ConnectionLineSystem destroyed', 'info');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionLineSystem;
}

// Global usage
if (typeof window !== 'undefined') {
    window.ConnectionLineSystem = ConnectionLineSystem;
}