/**
 * AnimationSystem - Advanced scrolling and animation system for PixiJS v8
 * Provides smooth scrolling, UI animations, connection line animations with performance optimization
 * Includes object pooling, memory management, and 60fps optimizations
 */

import * as PIXI from 'pixi.js';
import { PixiObjectPool } from '../performance/ObjectPool.js';

export class AnimationSystem {
    constructor(pixiApp, options = {}) {
        this.app = pixiApp;
        this.logger = this.createLogger();
        
        this.config = {
            // Scrolling configuration
            scrollConfig: {
                friction: 0.92,
                elasticity: 0.85,
                inertiaDecay: 0.88,
                bounceStrength: 0.15,
                maxVelocity: 40,
                minVelocity: 0.1,
                scrollBounds: { x: 0, y: 0, width: 3000, height: 2000 },
                enableVirtualScrolling: true,
                virtualBufferZone: 200
            },
            
            // Animation configuration
            animationConfig: {
                enableGPUAcceleration: true,
                targetFPS: 60,
                maxAnimations: 500,
                defaultDuration: 300,
                defaultEasing: 'easeOutCubic',
                prioritySystem: true
            },
            
            // Performance configuration
            performanceConfig: {
                enableObjectPooling: true,
                enableBatching: true,
                maxBatchSize: 100,
                memoryCleanupInterval: 30000,
                frameSkipping: false,
                adaptiveQuality: true
            },
            
            // Debug configuration
            debugMode: false,
            showPerformanceStats: false,
            logAnimations: false,
            
            ...options
        };

        // Core systems
        this.scrollSystem = null;
        this.uiAnimationSystem = null;
        this.connectionAnimationSystem = null;
        this.performanceOptimizer = null;
        
        // Object pooling
        this.objectPool = null;
        
        // Animation management
        this.animations = new Map();
        this.animationQueue = [];
        this.ticker = null;
        
        // Scroll state
        this.scrollState = {
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            targetPosition: { x: 0, y: 0 },
            isDragging: false,
            isInertia: false,
            bounds: this.config.scrollConfig.scrollBounds
        };
        
        // Performance tracking
        this.performanceMetrics = {
            fps: 60,
            frameTime: 16.67,
            animationsActive: 0,
            memoryUsage: 0,
            objectsPooled: 0,
            renderCalls: 0,
            lastFrameTime: 0,
            averageFrameTime: 16.67
        };
        
        // Event handlers
        this.boundHandlers = new Map();
        
        this.init();
    }

    /**
     * Initialize the animation system
     */
    async init() {
        try {
            this.logger.info('Initializing AnimationSystem with PIXI v8...');
            const startTime = performance.now();

            // Initialize object pooling
            await this.initObjectPooling();
            
            // Initialize core systems
            await this.initScrollSystem();
            await this.initUIAnimationSystem();
            await this.initConnectionAnimationSystem();
            await this.initPerformanceOptimizer();
            
            // Setup PIXI ticker for 60fps
            this.setupTicker();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            const initTime = performance.now() - startTime;
            this.logger.info(`AnimationSystem initialized in ${initTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.logger.error('Failed to initialize AnimationSystem', error);
            throw error;
        }
    }

    /**
     * Initialize object pooling system
     */
    async initObjectPooling() {
        if (!this.config.performanceConfig.enableObjectPooling) return;

        this.objectPool = new PixiObjectPool();
        await this.objectPool.preWarmForMobile();
        
        this.logger.info('Object pooling initialized');
    }

    /**
     * Initialize scroll system with physics
     */
    async initScrollSystem() {
        this.scrollSystem = {
            // Smooth scrolling interpolation
            smoothScrollTo: (targetX, targetY, duration = 500) => {
                return this.createAnimation({
                    target: this.scrollState.position,
                    to: { x: targetX, y: targetY },
                    duration,
                    easing: 'easeOutCubic',
                    onUpdate: (values) => {
                        this.updateScrollPosition(values.x, values.y);
                    },
                    priority: 'high'
                });
            },

            // Inertia scrolling physics
            applyInertia: () => {
                if (!this.scrollState.isInertia) return;
                
                const friction = this.config.scrollConfig.friction;
                const minVel = this.config.scrollConfig.minVelocity;
                
                this.scrollState.velocity.x *= friction;
                this.scrollState.velocity.y *= friction;
                
                // Stop inertia when velocity is too low
                if (Math.abs(this.scrollState.velocity.x) < minVel && 
                    Math.abs(this.scrollState.velocity.y) < minVel) {
                    this.scrollState.velocity.x = 0;
                    this.scrollState.velocity.y = 0;
                    this.scrollState.isInertia = false;
                    return;
                }
                
                this.scrollState.position.x += this.scrollState.velocity.x;
                this.scrollState.position.y += this.scrollState.velocity.y;
                
                this.applyScrollBounds();
                this.updateScrollPosition(this.scrollState.position.x, this.scrollState.position.y);
            },

            // Boundary bounce animation
            createBounceAnimation: (axis) => {
                const bounceStrength = this.config.scrollConfig.bounceStrength;
                const elasticity = this.config.scrollConfig.elasticity;
                
                return this.createAnimation({
                    target: this.scrollState.position,
                    to: { [axis]: this.getConstrainedPosition()[axis] },
                    duration: 400,
                    easing: 'easeOutElastic',
                    elasticity,
                    onUpdate: (values) => {
                        this.updateScrollPosition(values.x || this.scrollState.position.x, 
                                                values.y || this.scrollState.position.y);
                    }
                });
            },

            // Virtual scrolling optimization
            updateVirtualScrolling: () => {
                if (!this.config.scrollConfig.enableVirtualScrolling) return;
                
                const viewport = this.getViewportBounds();
                const buffer = this.config.scrollConfig.virtualBufferZone;
                
                // Cull objects outside viewport + buffer
                this.app.stage.children.forEach(child => {
                    if (child.cullable) {
                        const bounds = child.getBounds();
                        child.visible = this.isInViewport(bounds, viewport, buffer);
                    }
                });
            }
        };

        this.logger.info('Scroll system initialized');
    }

    /**
     * Initialize UI animation system
     */
    async initUIAnimationSystem() {
        this.uiAnimationSystem = {
            // Bubble appearance animation
            animateBubbleAppear: (bubble, fromSide = 'left') => {
                const startX = fromSide === 'left' ? -bubble.width : this.app.screen.width + bubble.width;
                bubble.x = startX;
                bubble.alpha = 0;
                bubble.scale.set(0.8);

                return this.createAnimation({
                    target: bubble,
                    to: { 
                        x: bubble.targetX || bubble.x,
                        alpha: 1,
                        scaleX: 1,
                        scaleY: 1
                    },
                    duration: 400,
                    easing: 'easeOutBack',
                    priority: 'high'
                });
            },

            // Bubble disappear animation
            animateBubbleDisappear: (bubble, toSide = 'right') => {
                const endX = toSide === 'right' ? this.app.screen.width + bubble.width : -bubble.width;
                
                return this.createAnimation({
                    target: bubble,
                    to: { 
                        x: endX,
                        alpha: 0,
                        scaleX: 0.8,
                        scaleY: 0.8
                    },
                    duration: 300,
                    easing: 'easeInBack',
                    onComplete: () => {
                        if (this.objectPool) {
                            this.objectPool.release(bubble);
                        }
                    }
                });
            },

            // Button click feedback animation
            animateButtonClick: (button) => {
                const originalScale = { x: button.scale.x, y: button.scale.y };
                
                return this.createSequence([
                    this.createAnimation({
                        target: button,
                        to: { scaleX: originalScale.x * 0.95, scaleY: originalScale.y * 0.95 },
                        duration: 100,
                        easing: 'easeOutQuad'
                    }),
                    this.createAnimation({
                        target: button,
                        to: { scaleX: originalScale.x, scaleY: originalScale.y },
                        duration: 150,
                        easing: 'easeOutElastic'
                    })
                ]);
            },

            // Popup expand animation
            animatePopupExpand: (popup) => {
                popup.scale.set(0);
                popup.alpha = 0;
                
                return this.createAnimation({
                    target: popup,
                    to: { 
                        scaleX: 1,
                        scaleY: 1,
                        alpha: 1
                    },
                    duration: 350,
                    easing: 'easeOutBack'
                });
            },

            // Popup collapse animation
            animatePopupCollapse: (popup) => {
                return this.createAnimation({
                    target: popup,
                    to: { 
                        scaleX: 0,
                        scaleY: 0,
                        alpha: 0
                    },
                    duration: 250,
                    easing: 'easeInBack'
                });
            },

            // Area expansion animation
            animateAreaExpand: (area, targetWidth, targetHeight) => {
                const originalBounds = area.getBounds();
                
                return this.createAnimation({
                    target: area,
                    to: { 
                        width: targetWidth,
                        height: targetHeight
                    },
                    duration: 400,
                    easing: 'easeOutQuart',
                    onUpdate: (values) => {
                        area.mask = this.createExpandMask(values.width, values.height);
                    }
                });
            }
        };

        this.logger.info('UI animation system initialized');
    }

    /**
     * Initialize connection line animation system
     */
    async initConnectionAnimationSystem() {
        this.connectionAnimationSystem = {
            // Connection line drawing animation
            animateConnectionDraw: (connection, path) => {
                connection.clear();
                let progress = 0;
                
                return this.createAnimation({
                    target: { progress: 0 },
                    to: { progress: 1 },
                    duration: 600,
                    easing: 'easeOutQuart',
                    onUpdate: (values) => {
                        this.drawConnectionProgress(connection, path, values.progress);
                    }
                });
            },

            // Position transition animation
            animateConnectionMove: (connection, newPath) => {
                const currentPath = connection.currentPath || [];
                
                return this.createAnimation({
                    target: { t: 0 },
                    to: { t: 1 },
                    duration: 300,
                    easing: 'easeOutCubic',
                    onUpdate: (values) => {
                        const interpolatedPath = this.interpolatePaths(currentPath, newPath, values.t);
                        this.drawConnectionPath(connection, interpolatedPath);
                    },
                    onComplete: () => {
                        connection.currentPath = newPath;
                    }
                });
            },

            // Batch update optimization for multiple connections
            batchUpdateConnections: (connections) => {
                const batchSize = this.config.performanceConfig.maxBatchSize;
                const batches = this.createBatches(connections, batchSize);
                
                return Promise.all(batches.map((batch, index) => {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            batch.forEach(connection => {
                                this.updateSingleConnection(connection);
                            });
                            resolve();
                        }, index * 16); // Stagger updates across frames
                    });
                }));
            }
        };

        this.logger.info('Connection animation system initialized');
    }

    /**
     * Initialize performance optimizer
     */
    async initPerformanceOptimizer() {
        this.performanceOptimizer = {
            // GPU acceleration for transforms
            enableGPUAcceleration: (displayObject) => {
                if (this.config.animationConfig.enableGPUAcceleration) {
                    displayObject.cacheAsBitmap = true;
                    displayObject.cacheAsBitmapResolution = this.app.renderer.resolution;
                }
            },

            // Adaptive quality system
            adjustQualityBasedOnPerformance: () => {
                if (!this.config.performanceConfig.adaptiveQuality) return;
                
                const avgFrameTime = this.performanceMetrics.averageFrameTime;
                const targetFrameTime = 1000 / this.config.animationConfig.targetFPS;
                
                if (avgFrameTime > targetFrameTime * 1.5) {
                    // Performance is poor, reduce quality
                    this.app.renderer.resolution = Math.max(0.5, this.app.renderer.resolution * 0.9);
                    this.config.scrollConfig.friction = Math.min(0.98, this.config.scrollConfig.friction + 0.01);
                } else if (avgFrameTime < targetFrameTime * 0.8) {
                    // Performance is good, increase quality
                    this.app.renderer.resolution = Math.min(2, this.app.renderer.resolution * 1.05);
                    this.config.scrollConfig.friction = Math.max(0.85, this.config.scrollConfig.friction - 0.01);
                }
            },

            // Memory cleanup
            performMemoryCleanup: () => {
                // Clean up completed animations
                for (const [id, animation] of this.animations) {
                    if (animation.completed) {
                        this.animations.delete(id);
                    }
                }

                // Clean up object pool
                if (this.objectPool) {
                    this.objectPool.cleanup();
                }

                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }

                this.logger.debug('Memory cleanup performed');
            },

            // Frame skipping for low-end devices
            shouldSkipFrame: () => {
                if (!this.config.performanceConfig.frameSkipping) return false;
                
                return this.performanceMetrics.averageFrameTime > 25; // Skip if below 40fps
            }
        };

        // Setup memory cleanup interval
        setInterval(() => {
            this.performanceOptimizer.performMemoryCleanup();
        }, this.config.performanceConfig.memoryCleanupInterval);

        this.logger.info('Performance optimizer initialized');
    }

    /**
     * Setup PIXI ticker for 60fps animation loop
     */
    setupTicker() {
        this.ticker = this.app.ticker;
        this.ticker.maxFPS = this.config.animationConfig.targetFPS;
        
        this.ticker.add(this.updateFrame.bind(this));
        this.logger.info('PIXI ticker configured for 60fps');
    }

    /**
     * Main frame update loop
     */
    updateFrame(deltaTime) {
        const frameStartTime = performance.now();
        
        // Skip frame if performance is poor
        if (this.performanceOptimizer.shouldSkipFrame()) {
            return;
        }

        try {
            // Update scroll physics
            if (this.scrollState.isInertia) {
                this.scrollSystem.applyInertia();
            }

            // Update virtual scrolling
            this.scrollSystem.updateVirtualScrolling();

            // Update animations
            this.updateAnimations(deltaTime);

            // Update performance metrics
            this.updatePerformanceMetrics(frameStartTime);

            // Adaptive quality adjustment
            this.performanceOptimizer.adjustQualityBasedOnPerformance();

        } catch (error) {
            this.logger.error('Error in frame update', error);
        }
    }

    /**
     * Create new animation with easing and priority support
     */
    createAnimation(options) {
        const id = this.generateAnimationId();
        const animation = {
            id,
            target: options.target,
            from: this.getCurrentValues(options.target, Object.keys(options.to)),
            to: options.to,
            duration: options.duration || this.config.animationConfig.defaultDuration,
            easing: options.easing || this.config.animationConfig.defaultEasing,
            priority: options.priority || 'normal',
            onUpdate: options.onUpdate,
            onComplete: options.onComplete,
            startTime: performance.now(),
            progress: 0,
            completed: false
        };

        // Apply priority system
        if (this.config.animationConfig.prioritySystem) {
            this.insertAnimationByPriority(animation);
        } else {
            this.animations.set(id, animation);
        }

        this.performanceMetrics.animationsActive++;
        
        if (this.config.debugMode && this.config.logAnimations) {
            this.logger.debug(`Created animation ${id}`, options);
        }

        return {
            id,
            cancel: () => this.cancelAnimation(id),
            promise: this.createAnimationPromise(id)
        };
    }

    /**
     * Create animation sequence
     */
    createSequence(animations) {
        let currentIndex = 0;
        const sequenceId = this.generateAnimationId();
        
        const executeNext = () => {
            if (currentIndex >= animations.length) return Promise.resolve();
            
            return animations[currentIndex++].promise.then(() => executeNext());
        };

        return {
            id: sequenceId,
            promise: executeNext(),
            cancel: () => {
                animations.forEach(anim => anim.cancel());
            }
        };
    }

    /**
     * Update all active animations
     */
    updateAnimations(deltaTime) {
        const currentTime = performance.now();
        const toRemove = [];

        for (const [id, animation] of this.animations) {
            if (animation.completed) {
                toRemove.push(id);
                continue;
            }

            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // Apply easing
            const easedProgress = this.applyEasing(progress, animation.easing);
            
            // Calculate current values
            const currentValues = {};
            for (const [key, targetValue] of Object.entries(animation.to)) {
                const fromValue = animation.from[key];
                currentValues[key] = fromValue + (targetValue - fromValue) * easedProgress;
                
                // Apply to target object
                if (animation.target[key] !== undefined) {
                    animation.target[key] = currentValues[key];
                }
            }

            // Call update callback
            if (animation.onUpdate) {
                animation.onUpdate(currentValues, easedProgress);
            }

            animation.progress = progress;

            // Check if animation is complete
            if (progress >= 1) {
                animation.completed = true;
                
                if (animation.onComplete) {
                    animation.onComplete();
                }
                
                toRemove.push(id);
            }
        }

        // Remove completed animations
        toRemove.forEach(id => {
            this.animations.delete(id);
            this.performanceMetrics.animationsActive--;
        });
    }

    /**
     * Easing functions
     */
    applyEasing(t, easingType) {
        switch (easingType) {
            case 'linear':
                return t;
            case 'easeInQuad':
                return t * t;
            case 'easeOutQuad':
                return t * (2 - t);
            case 'easeInOutQuad':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeInCubic':
                return t * t * t;
            case 'easeOutCubic':
                return --t * t * t + 1;
            case 'easeInOutCubic':
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            case 'easeInQuart':
                return t * t * t * t;
            case 'easeOutQuart':
                return 1 - --t * t * t * t;
            case 'easeInBack':
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * t * t * t - c1 * t * t;
            case 'easeOutBack':
                const c1b = 1.70158;
                const c3b = c1b + 1;
                return 1 + c3b * Math.pow(t - 1, 3) + c1b * Math.pow(t - 1, 2);
            case 'easeOutElastic':
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            default:
                return t; // fallback to linear
        }
    }

    /**
     * Scroll event handlers
     */
    setupEventHandlers() {
        // Touch/mouse scroll handlers
        const canvas = this.app.canvas;
        
        // Start drag
        const onDragStart = (event) => {
            this.scrollState.isDragging = true;
            this.scrollState.isInertia = false;
            this.scrollState.lastPointer = { x: event.clientX, y: event.clientY };
            this.scrollState.velocity = { x: 0, y: 0 };
        };

        // Drag move
        const onDragMove = (event) => {
            if (!this.scrollState.isDragging) return;
            
            const deltaX = event.clientX - this.scrollState.lastPointer.x;
            const deltaY = event.clientY - this.scrollState.lastPointer.y;
            
            this.scrollState.velocity.x = deltaX * 0.5;
            this.scrollState.velocity.y = deltaY * 0.5;
            
            this.scrollState.position.x += deltaX;
            this.scrollState.position.y += deltaY;
            
            this.applyScrollBounds();
            this.updateScrollPosition(this.scrollState.position.x, this.scrollState.position.y);
            
            this.scrollState.lastPointer = { x: event.clientX, y: event.clientY };
        };

        // End drag
        const onDragEnd = () => {
            if (!this.scrollState.isDragging) return;
            
            this.scrollState.isDragging = false;
            
            // Start inertia if velocity is sufficient
            const totalVelocity = Math.abs(this.scrollState.velocity.x) + Math.abs(this.scrollState.velocity.y);
            if (totalVelocity > this.config.scrollConfig.minVelocity) {
                this.scrollState.isInertia = true;
            }
        };

        // Bind events
        canvas.addEventListener('pointerdown', onDragStart);
        window.addEventListener('pointermove', onDragMove);
        window.addEventListener('pointerup', onDragEnd);
        
        // Store handlers for cleanup
        this.boundHandlers.set('dragStart', onDragStart);
        this.boundHandlers.set('dragMove', onDragMove);
        this.boundHandlers.set('dragEnd', onDragEnd);

        // Wheel scroll handler
        const onWheel = (event) => {
            event.preventDefault();
            
            this.scrollState.velocity.x = -event.deltaX * 0.5;
            this.scrollState.velocity.y = -event.deltaY * 0.5;
            
            this.scrollState.position.x += this.scrollState.velocity.x;
            this.scrollState.position.y += this.scrollState.velocity.y;
            
            this.applyScrollBounds();
            this.updateScrollPosition(this.scrollState.position.x, this.scrollState.position.y);
            
            // Start brief inertia
            this.scrollState.isInertia = true;
            setTimeout(() => {
                this.scrollState.isInertia = false;
            }, 100);
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        this.boundHandlers.set('wheel', onWheel);
    }

    /**
     * Apply scroll bounds with bounce
     */
    applyScrollBounds() {
        const bounds = this.scrollState.bounds;
        let needsBounce = false;
        
        if (this.scrollState.position.x < bounds.x) {
            this.scrollState.position.x = bounds.x;
            this.scrollState.velocity.x = 0;
            needsBounce = true;
        } else if (this.scrollState.position.x > bounds.width) {
            this.scrollState.position.x = bounds.width;
            this.scrollState.velocity.x = 0;
            needsBounce = true;
        }
        
        if (this.scrollState.position.y < bounds.y) {
            this.scrollState.position.y = bounds.y;
            this.scrollState.velocity.y = 0;
            needsBounce = true;
        } else if (this.scrollState.position.y > bounds.height) {
            this.scrollState.position.y = bounds.height;
            this.scrollState.velocity.y = 0;
            needsBounce = true;
        }
        
        if (needsBounce) {
            this.scrollSystem.createBounceAnimation('x');
            this.scrollSystem.createBounceAnimation('y');
        }
    }

    /**
     * Update scroll position
     */
    updateScrollPosition(x, y) {
        this.app.stage.x = -x;
        this.app.stage.y = -y;
        
        // Update virtual scrolling
        this.scrollSystem.updateVirtualScrolling();
    }

    /**
     * Performance monitoring
     */
    startPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        setInterval(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            this.performanceMetrics.fps = Math.round(frameCount / (deltaTime / 1000));
            this.performanceMetrics.frameTime = deltaTime / frameCount;
            
            frameCount = 0;
            lastTime = currentTime;
            
            if (this.config.showPerformanceStats) {
                this.logPerformanceStats();
            }
        }, 1000);
        
        // Count frames
        this.ticker.add(() => frameCount++);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(frameStartTime) {
        const frameTime = performance.now() - frameStartTime;
        this.performanceMetrics.lastFrameTime = frameTime;
        this.performanceMetrics.averageFrameTime = 
            (this.performanceMetrics.averageFrameTime + frameTime) / 2;
        
        if (this.objectPool) {
            const poolStats = this.objectPool.getStats();
            this.performanceMetrics.objectsPooled = poolStats.global.created - poolStats.global.destroyed;
        }
        
        this.performanceMetrics.memoryUsage = this.getMemoryUsage();
    }

    /**
     * Get memory usage estimation
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }

    /**
     * Log performance statistics
     */
    logPerformanceStats() {
        const stats = {
            FPS: this.performanceMetrics.fps,
            'Frame Time': `${this.performanceMetrics.frameTime.toFixed(2)}ms`,
            'Active Animations': this.performanceMetrics.animationsActive,
            'Objects Pooled': this.performanceMetrics.objectsPooled,
            'Memory (MB)': this.performanceMetrics.memoryUsage.used || 'N/A'
        };
        
        console.table(stats);
    }

    /**
     * Connection line animation helpers
     */
    drawConnectionProgress(connection, path, progress) {
        connection.clear();
        if (path.length < 2) return;
        
        const totalLength = this.calculatePathLength(path);
        const targetLength = totalLength * progress;
        let currentLength = 0;
        
        connection.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            const segmentLength = this.distance(path[i-1], path[i]);
            
            if (currentLength + segmentLength <= targetLength) {
                connection.lineTo(path[i].x, path[i].y);
                currentLength += segmentLength;
            } else {
                const remaining = targetLength - currentLength;
                const ratio = remaining / segmentLength;
                const endX = path[i-1].x + (path[i].x - path[i-1].x) * ratio;
                const endY = path[i-1].y + (path[i].y - path[i-1].y) * ratio;
                connection.lineTo(endX, endY);
                break;
            }
        }
        
        connection.stroke({ width: 3, color: 0x00ff00 });
    }

    drawConnectionPath(connection, path) {
        connection.clear();
        if (path.length < 2) return;
        
        connection.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            connection.lineTo(path[i].x, path[i].y);
        }
        connection.stroke({ width: 3, color: 0x00ff00 });
    }

    interpolatePaths(pathA, pathB, t) {
        const maxLength = Math.max(pathA.length, pathB.length);
        const result = [];
        
        for (let i = 0; i < maxLength; i++) {
            const pointA = pathA[i] || pathA[pathA.length - 1] || { x: 0, y: 0 };
            const pointB = pathB[i] || pathB[pathB.length - 1] || { x: 0, y: 0 };
            
            result.push({
                x: pointA.x + (pointB.x - pointA.x) * t,
                y: pointA.y + (pointB.y - pointA.y) * t
            });
        }
        
        return result;
    }

    calculatePathLength(path) {
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            length += this.distance(path[i-1], path[i]);
        }
        return length;
    }

    distance(pointA, pointB) {
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    updateSingleConnection(connection) {
        // Update individual connection (placeholder for batch processing)
        if (connection.needsUpdate) {
            connection.needsUpdate = false;
            // Perform connection update logic
        }
    }

    createExpandMask(width, height) {
        const mask = new PIXI.Graphics()
            .rect(0, 0, width, height)
            .fill(0xffffff);
        return mask;
    }

    /**
     * Helper methods
     */
    generateAnimationId() {
        return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getCurrentValues(target, keys) {
        const values = {};
        keys.forEach(key => {
            values[key] = target[key] || 0;
        });
        return values;
    }

    insertAnimationByPriority(animation) {
        const priorities = { high: 3, normal: 2, low: 1 };
        const priority = priorities[animation.priority] || 2;
        
        // Simple priority insertion - in a real implementation, 
        // you might use a priority queue
        this.animations.set(animation.id, animation);
    }

    createAnimationPromise(id) {
        return new Promise((resolve, reject) => {
            const checkComplete = () => {
                const animation = this.animations.get(id);
                if (!animation) {
                    resolve();
                    return;
                }
                
                if (animation.completed) {
                    resolve();
                } else {
                    setTimeout(checkComplete, 16);
                }
            };
            
            checkComplete();
        });
    }

    cancelAnimation(id) {
        const animation = this.animations.get(id);
        if (animation) {
            animation.completed = true;
            this.animations.delete(id);
            this.performanceMetrics.animationsActive--;
        }
    }

    getViewportBounds() {
        return {
            x: -this.app.stage.x,
            y: -this.app.stage.y,
            width: this.app.screen.width,
            height: this.app.screen.height
        };
    }

    isInViewport(bounds, viewport, buffer = 0) {
        return !(bounds.x > viewport.x + viewport.width + buffer ||
                bounds.x + bounds.width < viewport.x - buffer ||
                bounds.y > viewport.y + viewport.height + buffer ||
                bounds.y + bounds.height < viewport.y - buffer);
    }

    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    getConstrainedPosition() {
        const bounds = this.scrollState.bounds;
        return {
            x: Math.max(bounds.x, Math.min(bounds.width, this.scrollState.position.x)),
            y: Math.max(bounds.y, Math.min(bounds.height, this.scrollState.position.y))
        };
    }

    /**
     * Public API methods
     */
    
    // Scroll API
    scrollTo(x, y, smooth = true) {
        if (smooth) {
            return this.scrollSystem.smoothScrollTo(x, y);
        } else {
            this.scrollState.position.x = x;
            this.scrollState.position.y = y;
            this.applyScrollBounds();
            this.updateScrollPosition(x, y);
        }
    }

    getScrollPosition() {
        return { ...this.scrollState.position };
    }

    setScrollBounds(bounds) {
        this.scrollState.bounds = { ...bounds };
    }

    // Animation API
    animateBubble(bubble, type, options = {}) {
        switch (type) {
            case 'appear':
                return this.uiAnimationSystem.animateBubbleAppear(bubble, options.fromSide);
            case 'disappear':
                return this.uiAnimationSystem.animateBubbleDisappear(bubble, options.toSide);
            default:
                this.logger.warn(`Unknown bubble animation type: ${type}`);
        }
    }

    animateButton(button, type = 'click') {
        return this.uiAnimationSystem.animateButtonClick(button);
    }

    animatePopup(popup, type, options = {}) {
        switch (type) {
            case 'expand':
                return this.uiAnimationSystem.animatePopupExpand(popup);
            case 'collapse':
                return this.uiAnimationSystem.animatePopupCollapse(popup);
            default:
                this.logger.warn(`Unknown popup animation type: ${type}`);
        }
    }

    animateConnection(connection, type, data) {
        switch (type) {
            case 'draw':
                return this.connectionAnimationSystem.animateConnectionDraw(connection, data);
            case 'move':
                return this.connectionAnimationSystem.animateConnectionMove(connection, data);
            default:
                this.logger.warn(`Unknown connection animation type: ${type}`);
        }
    }

    // Performance API
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    enableDebugMode(enabled = true) {
        this.config.debugMode = enabled;
        this.config.showPerformanceStats = enabled;
        this.logger.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    optimizeForMobile() {
        this.config.performanceConfig.adaptiveQuality = true;
        this.config.performanceConfig.frameSkipping = true;
        this.config.scrollConfig.friction = 0.95;
        this.app.renderer.resolution = Math.min(1.5, window.devicePixelRatio);
        
        this.logger.info('Mobile optimizations applied');
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.logger.info('Destroying AnimationSystem...');
        
        // Stop ticker
        if (this.ticker) {
            this.ticker.destroy();
        }
        
        // Clear animations
        this.animations.clear();
        
        // Remove event handlers
        const canvas = this.app.canvas;
        for (const [event, handler] of this.boundHandlers) {
            if (event === 'dragStart') canvas.removeEventListener('pointerdown', handler);
            else if (event === 'dragMove') window.removeEventListener('pointermove', handler);
            else if (event === 'dragEnd') window.removeEventListener('pointerup', handler);
            else if (event === 'wheel') canvas.removeEventListener('wheel', handler);
        }
        this.boundHandlers.clear();
        
        // Destroy object pool
        if (this.objectPool) {
            this.objectPool.destroy();
        }
        
        this.logger.info('AnimationSystem destroyed');
    }

    /**
     * Create logger
     */
    createLogger() {
        const prefix = '[AnimationSystem]';
        return {
            debug: (msg, data) => this.config.debugMode && console.debug(`${prefix} ${msg}`, data || ''),
            info: (msg, data) => console.info(`${prefix} ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`${prefix} ${msg}`, data || ''),
            error: (msg, error) => console.error(`${prefix} ${msg}`, error)
        };
    }
}

export default AnimationSystem;