import * as PIXI from 'pixi.js';

/**
 * Mobile Scroll Manager - Advanced scrolling with inertia, momentum, and boundaries
 * Handles smooth scrolling, elastic boundaries, and performance optimization
 */
export class ScrollManager {
    constructor(app, options = {}) {
        this.app = app;
        this.stage = app.stage;
        
        // Configuration
        this.config = {
            friction: 0.92, // Friction coefficient for inertia
            bounceStrength: 0.3, // Bounce back strength
            bounceThreshold: 50, // Pixels beyond boundary to trigger bounce
            minVelocity: 0.1, // Minimum velocity to continue scrolling
            maxVelocity: 50, // Maximum velocity cap
            snapThreshold: 100, // Snap to nearest boundary if within threshold
            enableInertia: true,
            enableBounce: true,
            enableSnapping: false,
            enableHorizontalScroll: true,
            enableVerticalScroll: true,
            debugMode: false,
            ...options
        };
        
        // Scroll state
        this.scrollState = {
            x: 0,
            y: 0,
            velocityX: 0,
            velocityY: 0,
            isDragging: false,
            isScrolling: false,
            lastUpdateTime: 0
        };
        
        // Scroll boundaries
        this.boundaries = {
            minX: -Infinity,
            maxX: Infinity,
            minY: -Infinity,
            maxY: Infinity
        };
        
        // Touch tracking for velocity calculation
        this.touchHistory = [];
        this.maxTouchHistory = 5;
        
        // Animation frame ID
        this.animationFrame = null;
        
        // Performance tracking
        this.stats = {
            scrollEvents: 0,
            bounceEvents: 0,
            snapEvents: 0,
            averageVelocity: 0
        };
        
        this.init();
    }
    
    init() {
        console.log('[ScrollManager] Initializing mobile scroll system');
        
        // Add to app ticker for smooth animation
        this.app.ticker.add(this.update, this);
        
        // Setup event listeners if TouchManager is available
        this.setupTouchEvents();
        
        console.log('[ScrollManager] Scroll system initialized');
    }
    
    setupTouchEvents() {
        // Listen for touch events from TouchManager if available
        this.app.canvas.addEventListener('touch-swipe', this.handleSwipe.bind(this));
        this.app.canvas.addEventListener('touch-pan', this.handlePan.bind(this));
        
        // Fallback to native events if TouchManager not available
        this.app.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.app.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.app.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    handleSwipe(event) {
        const { deltaX, deltaY } = event.detail;
        
        // Apply scroll delta
        if (this.config.enableHorizontalScroll) {
            this.scrollState.velocityX += deltaX * 0.1;
        }
        
        if (this.config.enableVerticalScroll) {
            this.scrollState.velocityY += deltaY * 0.1;
        }
        
        // Cap velocity
        this.scrollState.velocityX = Math.max(-this.config.maxVelocity, 
            Math.min(this.config.maxVelocity, this.scrollState.velocityX));
        this.scrollState.velocityY = Math.max(-this.config.maxVelocity, 
            Math.min(this.config.maxVelocity, this.scrollState.velocityY));
        
        this.scrollState.isScrolling = true;
        
        if (this.config.debugMode) {
            console.log(`[ScrollManager] Swipe detected: velocity=(${this.scrollState.velocityX.toFixed(2)}, ${this.scrollState.velocityY.toFixed(2)})`);
        }
        
        this.stats.scrollEvents++;
    }
    
    handlePan(event) {
        const { deltaX, deltaY } = event.detail;
        
        // Direct scrolling during pan
        if (this.config.enableHorizontalScroll) {
            this.scrollTo(this.scrollState.x - deltaX, this.scrollState.y);
        }
        
        if (this.config.enableVerticalScroll) {
            this.scrollTo(this.scrollState.x, this.scrollState.y - deltaY);
        }
        
        this.scrollState.isDragging = true;
        this.scrollState.isScrolling = false; // Stop inertia during pan
    }
    
    // Fallback touch handlers
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.scrollState.isDragging = true;
            this.scrollState.isScrolling = false;
            this.scrollState.velocityX = 0;
            this.scrollState.velocityY = 0;
            
            // Clear touch history
            this.touchHistory = [];
            
            const touch = event.touches[0];
            this.addTouchPoint(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchMove(event) {
        if (this.scrollState.isDragging && event.touches.length === 1) {
            event.preventDefault();
            
            const touch = event.touches[0];
            this.addTouchPoint(touch.clientX, touch.clientY);
            
            // Calculate delta from last touch point
            if (this.touchHistory.length >= 2) {
                const current = this.touchHistory[this.touchHistory.length - 1];
                const previous = this.touchHistory[this.touchHistory.length - 2];
                
                const deltaX = current.x - previous.x;
                const deltaY = current.y - previous.y;
                
                // Apply scroll
                if (this.config.enableHorizontalScroll) {
                    this.scrollTo(this.scrollState.x - deltaX, this.scrollState.y);
                }
                
                if (this.config.enableVerticalScroll) {
                    this.scrollTo(this.scrollState.x, this.scrollState.y - deltaY);
                }
            }
        }
    }
    
    handleTouchEnd(event) {
        if (this.scrollState.isDragging) {
            this.scrollState.isDragging = false;
            
            // Calculate velocity from touch history
            if (this.config.enableInertia) {
                this.calculateVelocityFromHistory();
                
                if (Math.abs(this.scrollState.velocityX) > this.config.minVelocity || 
                    Math.abs(this.scrollState.velocityY) > this.config.minVelocity) {
                    this.scrollState.isScrolling = true;
                }
            }
        }
    }
    
    addTouchPoint(x, y) {
        const now = performance.now();
        
        this.touchHistory.push({ x, y, time: now });
        
        // Keep only recent history
        if (this.touchHistory.length > this.maxTouchHistory) {
            this.touchHistory.shift();
        }
    }
    
    calculateVelocityFromHistory() {
        if (this.touchHistory.length < 2) return;
        
        const recent = this.touchHistory[this.touchHistory.length - 1];
        const older = this.touchHistory[0];
        
        const deltaTime = recent.time - older.time;
        if (deltaTime > 0) {
            this.scrollState.velocityX = (recent.x - older.x) / deltaTime * 16; // 60fps normalization
            this.scrollState.velocityY = (recent.y - older.y) / deltaTime * 16;
            
            // Cap velocity
            this.scrollState.velocityX = Math.max(-this.config.maxVelocity, 
                Math.min(this.config.maxVelocity, this.scrollState.velocityX));
            this.scrollState.velocityY = Math.max(-this.config.maxVelocity, 
                Math.min(this.config.maxVelocity, this.scrollState.velocityY));
        }
    }
    
    update() {
        if (!this.scrollState.isScrolling) return;
        
        const now = performance.now();
        const deltaTime = now - this.scrollState.lastUpdateTime;
        this.scrollState.lastUpdateTime = now;
        
        // Apply friction to velocity
        this.scrollState.velocityX *= this.config.friction;
        this.scrollState.velocityY *= this.config.friction;
        
        // Apply velocity to position
        const newX = this.scrollState.x + this.scrollState.velocityX;
        const newY = this.scrollState.y + this.scrollState.velocityY;
        
        this.scrollTo(newX, newY);
        
        // Check if velocity is too low to continue
        const totalVelocity = Math.abs(this.scrollState.velocityX) + Math.abs(this.scrollState.velocityY);
        if (totalVelocity < this.config.minVelocity) {
            this.stopScrolling();
            
            // Snap to boundary if enabled and close
            if (this.config.enableSnapping) {
                this.checkSnapToBoundary();
            }
        }
        
        // Update average velocity for stats
        this.stats.averageVelocity = (this.stats.averageVelocity * 0.9) + (totalVelocity * 0.1);
    }
    
    scrollTo(x, y, immediate = false) {
        const oldX = this.scrollState.x;
        const oldY = this.scrollState.y;
        
        // Apply boundaries and bounce
        const result = this.applyBoundaries(x, y);
        this.scrollState.x = result.x;
        this.scrollState.y = result.y;
        
        // Handle bounce velocity adjustment
        if (result.bouncedX) {
            this.scrollState.velocityX *= -this.config.bounceStrength;
            this.stats.bounceEvents++;
            
            if (this.config.debugMode) {
                console.log(`[ScrollManager] Horizontal bounce at x=${this.scrollState.x}`);
            }
        }
        
        if (result.bouncedY) {
            this.scrollState.velocityY *= -this.config.bounceStrength;
            this.stats.bounceEvents++;
            
            if (this.config.debugMode) {
                console.log(`[ScrollManager] Vertical bounce at y=${this.scrollState.y}`);
            }
        }
        
        // Apply transform to stage
        this.stage.position.set(-this.scrollState.x, -this.scrollState.y);
        
        // Emit scroll event if position changed
        if (this.scrollState.x !== oldX || this.scrollState.y !== oldY) {
            this.app.emit('scroll-change', {
                x: this.scrollState.x,
                y: this.scrollState.y,
                deltaX: this.scrollState.x - oldX,
                deltaY: this.scrollState.y - oldY,
                velocityX: this.scrollState.velocityX,
                velocityY: this.scrollState.velocityY
            });
        }
        
        if (immediate) {
            this.stopScrolling();
        }
    }
    
    applyBoundaries(x, y) {
        let finalX = x;
        let finalY = y;
        let bouncedX = false;
        let bouncedY = false;
        
        // Horizontal boundaries
        if (this.boundaries.minX !== -Infinity || this.boundaries.maxX !== Infinity) {
            if (x < this.boundaries.minX) {
                if (this.config.enableBounce && this.scrollState.isScrolling) {
                    // Allow going beyond boundary with reduced movement
                    const overshoot = this.boundaries.minX - x;
                    if (overshoot > this.config.bounceThreshold) {
                        finalX = this.boundaries.minX - this.config.bounceThreshold;
                        bouncedX = true;
                    } else {
                        finalX = x;
                    }
                } else {
                    finalX = this.boundaries.minX;
                }
            } else if (x > this.boundaries.maxX) {
                if (this.config.enableBounce && this.scrollState.isScrolling) {
                    // Allow going beyond boundary with reduced movement
                    const overshoot = x - this.boundaries.maxX;
                    if (overshoot > this.config.bounceThreshold) {
                        finalX = this.boundaries.maxX + this.config.bounceThreshold;
                        bouncedX = true;
                    } else {
                        finalX = x;
                    }
                } else {
                    finalX = this.boundaries.maxX;
                }
            }
        }
        
        // Vertical boundaries
        if (this.boundaries.minY !== -Infinity || this.boundaries.maxY !== Infinity) {
            if (y < this.boundaries.minY) {
                if (this.config.enableBounce && this.scrollState.isScrolling) {
                    const overshoot = this.boundaries.minY - y;
                    if (overshoot > this.config.bounceThreshold) {
                        finalY = this.boundaries.minY - this.config.bounceThreshold;
                        bouncedY = true;
                    } else {
                        finalY = y;
                    }
                } else {
                    finalY = this.boundaries.minY;
                }
            } else if (y > this.boundaries.maxY) {
                if (this.config.enableBounce && this.scrollState.isScrolling) {
                    const overshoot = y - this.boundaries.maxY;
                    if (overshoot > this.config.bounceThreshold) {
                        finalY = this.boundaries.maxY + this.config.bounceThreshold;
                        bouncedY = true;
                    } else {
                        finalY = y;
                    }
                } else {
                    finalY = this.boundaries.maxY;
                }
            }
        }
        
        return { x: finalX, y: finalY, bouncedX, bouncedY };
    }
    
    checkSnapToBoundary() {
        let snapX = null;
        let snapY = null;
        
        // Check horizontal snapping
        if (Math.abs(this.scrollState.x - this.boundaries.minX) < this.config.snapThreshold) {
            snapX = this.boundaries.minX;
        } else if (Math.abs(this.scrollState.x - this.boundaries.maxX) < this.config.snapThreshold) {
            snapX = this.boundaries.maxX;
        }
        
        // Check vertical snapping
        if (Math.abs(this.scrollState.y - this.boundaries.minY) < this.config.snapThreshold) {
            snapY = this.boundaries.minY;
        } else if (Math.abs(this.scrollState.y - this.boundaries.maxY) < this.config.snapThreshold) {
            snapY = this.boundaries.maxY;
        }
        
        // Perform snap with animation
        if (snapX !== null || snapY !== null) {
            this.animateToPosition(
                snapX !== null ? snapX : this.scrollState.x,
                snapY !== null ? snapY : this.scrollState.y
            );
            
            this.stats.snapEvents++;
            
            if (this.config.debugMode) {
                console.log(`[ScrollManager] Snapping to (${snapX}, ${snapY})`);
            }
        }
    }
    
    animateToPosition(targetX, targetY, duration = 300) {
        const startX = this.scrollState.x;
        const startY = this.scrollState.y;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentX = startX + (targetX - startX) * easedProgress;
            const currentY = startY + (targetY - startY) * easedProgress;
            
            this.scrollTo(currentX, currentY, true);
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.stopScrolling();
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    stopScrolling() {
        this.scrollState.isScrolling = false;
        this.scrollState.velocityX = 0;
        this.scrollState.velocityY = 0;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.app.emit('scroll-stop', {
            x: this.scrollState.x,
            y: this.scrollState.y
        });
    }
    
    // Public API methods
    setBoundaries(minX = -Infinity, maxX = Infinity, minY = -Infinity, maxY = Infinity) {
        this.boundaries = { minX, maxX, minY, maxY };
        
        // Ensure current position is within new boundaries
        const result = this.applyBoundaries(this.scrollState.x, this.scrollState.y);
        if (result.x !== this.scrollState.x || result.y !== this.scrollState.y) {
            this.scrollTo(result.x, result.y, true);
        }
        
        if (this.config.debugMode) {
            console.log(`[ScrollManager] Boundaries set: X(${minX}, ${maxX}) Y(${minY}, ${maxY})`);
        }
    }
    
    getScrollPosition() {
        return {
            x: this.scrollState.x,
            y: this.scrollState.y
        };
    }
    
    setScrollPosition(x, y, animated = false) {
        if (animated) {
            this.animateToPosition(x, y);
        } else {
            this.scrollTo(x, y, true);
        }
    }
    
    isScrolling() {
        return this.scrollState.isScrolling || this.scrollState.isDragging;
    }
    
    getVelocity() {
        return {
            x: this.scrollState.velocityX,
            y: this.scrollState.velocityY
        };
    }
    
    addVelocity(velocityX, velocityY) {
        this.scrollState.velocityX += velocityX;
        this.scrollState.velocityY += velocityY;
        
        // Cap velocity
        this.scrollState.velocityX = Math.max(-this.config.maxVelocity, 
            Math.min(this.config.maxVelocity, this.scrollState.velocityX));
        this.scrollState.velocityY = Math.max(-this.config.maxVelocity, 
            Math.min(this.config.maxVelocity, this.scrollState.velocityY));
        
        // Start scrolling if velocity is significant
        const totalVelocity = Math.abs(this.scrollState.velocityX) + Math.abs(this.scrollState.velocityY);
        if (totalVelocity > this.config.minVelocity) {
            this.scrollState.isScrolling = true;
        }
    }
    
    getStats() {
        return { ...this.stats };
    }
    
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        console.log(`[ScrollManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    destroy() {
        console.log('[ScrollManager] Destroying scroll manager');
        
        // Remove from ticker
        this.app.ticker.remove(this.update, this);
        
        // Cancel any ongoing animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove event listeners
        this.app.canvas.removeEventListener('touch-swipe', this.handleSwipe);
        this.app.canvas.removeEventListener('touch-pan', this.handlePan);
        
        // Reset stage position
        this.stage.position.set(0, 0);
        
        // Clear state
        this.scrollState.isScrolling = false;
        this.scrollState.isDragging = false;
        this.touchHistory = [];
    }
}