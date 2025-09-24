import * as PIXI from 'pixi.js';

/**
 * Mobile Touch Manager - Advanced touch handling for mobile devices
 * Supports multi-touch, gestures, and performance optimizations
 */
export class TouchManager {
    constructor(app, options = {}) {
        this.app = app;
        this.canvas = app.canvas;
        this.stage = app.stage;
        
        // Configuration
        this.config = {
            enableMultiTouch: true,
            enableGestures: true,
            tapThreshold: 10, // pixels
            longPressDelay: 500, // ms
            doubleTapDelay: 300, // ms
            preventContextMenu: true,
            debugMode: false,
            ...options
        };
        
        // Touch state
        this.touches = new Map();
        this.activeGesture = null;
        this.lastTap = { x: 0, y: 0, time: 0 };
        this.longPressTimer = null;
        
        // Event handlers (bound once)
        this.boundHandlers = {
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            touchCancel: this.handleTouchCancel.bind(this)
        };
        
        // Performance tracking
        this.stats = {
            touchEvents: 0,
            gestureEvents: 0,
            averageProcessingTime: 0
        };
        
        this.init();
    }
    
    init() {
        console.log('[TouchManager] Initializing mobile touch system');
        
        // Add touch event listeners
        this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.boundHandlers.touchCancel, { passive: false });
        
        // Prevent context menu on long press
        if (this.config.preventContextMenu) {
            this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        // Disable default touch behaviors
        this.canvas.style.touchAction = 'none';
        
        console.log('[TouchManager] Touch system initialized successfully');
    }
    
    handleTouchStart(event) {
        const startTime = performance.now();
        event.preventDefault();
        
        const changedTouches = Array.from(event.changedTouches);
        
        changedTouches.forEach(touch => {
            const touchData = this.createTouchData(touch);
            this.touches.set(touch.identifier, touchData);
            
            if (this.config.debugMode) {
                console.log(`[TouchManager] Touch start: ID=${touch.identifier}, pos=(${touchData.x}, ${touchData.y})`);
            }
        });
        
        this.processGestures(event);
        this.checkForTap(changedTouches[0]);
        this.setupLongPress(changedTouches[0]);
        
        this.updateStats(startTime);
    }
    
    handleTouchMove(event) {
        const startTime = performance.now();
        event.preventDefault();
        
        const changedTouches = Array.from(event.changedTouches);
        
        changedTouches.forEach(touch => {
            const existingTouch = this.touches.get(touch.identifier);
            if (existingTouch) {
                const newTouchData = this.createTouchData(touch);
                const deltaX = newTouchData.x - existingTouch.x;
                const deltaY = newTouchData.y - existingTouch.y;
                
                // Update touch data
                existingTouch.previousX = existingTouch.x;
                existingTouch.previousY = existingTouch.y;
                existingTouch.x = newTouchData.x;
                existingTouch.y = newTouchData.y;
                existingTouch.deltaX = deltaX;
                existingTouch.deltaY = deltaY;
                existingTouch.moved = true;
                
                if (this.config.debugMode && Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                    console.log(`[TouchManager] Touch move: ID=${touch.identifier}, delta=(${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
                }
            }
        });
        
        this.processGestures(event);
        this.clearLongPress(); // Cancel long press on move
        
        this.updateStats(startTime);
    }
    
    handleTouchEnd(event) {
        const startTime = performance.now();
        event.preventDefault();
        
        const changedTouches = Array.from(event.changedTouches);
        
        changedTouches.forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                if (!touchData.moved) {
                    this.processTap(touchData);
                }
                
                this.touches.delete(touch.identifier);
                
                if (this.config.debugMode) {
                    console.log(`[TouchManager] Touch end: ID=${touch.identifier}`);
                }
            }
        });
        
        this.processGestures(event);
        this.clearLongPress();
        
        // Reset gesture if no touches remain
        if (this.touches.size === 0) {
            this.activeGesture = null;
        }
        
        this.updateStats(startTime);
    }
    
    handleTouchCancel(event) {
        console.log('[TouchManager] Touch cancelled');
        this.touches.clear();
        this.activeGesture = null;
        this.clearLongPress();
    }
    
    createTouchData(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            id: touch.identifier,
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
            previousX: 0,
            previousY: 0,
            deltaX: 0,
            deltaY: 0,
            startX: (touch.clientX - rect.left) * scaleX,
            startY: (touch.clientY - rect.top) * scaleY,
            time: performance.now(),
            moved: false
        };
    }
    
    processGestures(event) {
        if (!this.config.enableGestures) return;
        
        const touchCount = this.touches.size;
        
        if (touchCount === 2) {
            this.processPinchGesture();
            this.processPanGesture();
        } else if (touchCount === 1) {
            this.processSingleTouchGesture();
        }
    }
    
    processPinchGesture() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;
        
        const [touch1, touch2] = touches;
        const currentDistance = Math.sqrt(
            Math.pow(touch1.x - touch2.x, 2) + 
            Math.pow(touch1.y - touch2.y, 2)
        );
        
        const previousDistance = Math.sqrt(
            Math.pow(touch1.previousX - touch2.previousX, 2) + 
            Math.pow(touch1.previousY - touch2.previousY, 2)
        );
        
        if (previousDistance > 0) {
            const scale = currentDistance / previousDistance;
            const centerX = (touch1.x + touch2.x) / 2;
            const centerY = (touch1.y + touch2.y) / 2;
            
            this.emitGestureEvent('pinch', {
                scale,
                centerX,
                centerY,
                distance: currentDistance,
                previousDistance
            });
            
            if (this.config.debugMode) {
                console.log(`[TouchManager] Pinch: scale=${scale.toFixed(3)}, center=(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
            }
        }
    }
    
    processPanGesture() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;
        
        const [touch1, touch2] = touches;
        const centerX = (touch1.x + touch2.x) / 2;
        const centerY = (touch1.y + touch2.y) / 2;
        const previousCenterX = (touch1.previousX + touch2.previousX) / 2;
        const previousCenterY = (touch1.previousY + touch2.previousY) / 2;
        
        if (previousCenterX !== 0 || previousCenterY !== 0) {
            const deltaX = centerX - previousCenterX;
            const deltaY = centerY - previousCenterY;
            
            this.emitGestureEvent('pan', {
                deltaX,
                deltaY,
                centerX,
                centerY,
                touchCount: 2
            });
        }
    }
    
    processSingleTouchGesture() {
        const touch = Array.from(this.touches.values())[0];
        if (!touch || !touch.moved) return;
        
        this.emitGestureEvent('swipe', {
            deltaX: touch.deltaX,
            deltaY: touch.deltaY,
            x: touch.x,
            y: touch.y,
            touchCount: 1
        });
    }
    
    checkForTap(touch) {
        const now = performance.now();
        const touchData = this.createTouchData(touch);
        
        // Check for double tap
        if (now - this.lastTap.time < this.config.doubleTapDelay) {
            const distance = Math.sqrt(
                Math.pow(touchData.x - this.lastTap.x, 2) + 
                Math.pow(touchData.y - this.lastTap.y, 2)
            );
            
            if (distance < this.config.tapThreshold) {
                this.emitGestureEvent('doubletap', {
                    x: touchData.x,
                    y: touchData.y
                });
                
                if (this.config.debugMode) {
                    console.log(`[TouchManager] Double tap at (${touchData.x.toFixed(1)}, ${touchData.y.toFixed(1)})`);
                }
            }
        }
        
        this.lastTap = {
            x: touchData.x,
            y: touchData.y,
            time: now
        };
    }
    
    processTap(touchData) {
        const distance = Math.sqrt(
            Math.pow(touchData.x - touchData.startX, 2) + 
            Math.pow(touchData.y - touchData.startY, 2)
        );
        
        if (distance < this.config.tapThreshold) {
            this.emitGestureEvent('tap', {
                x: touchData.x,
                y: touchData.y
            });
            
            if (this.config.debugMode) {
                console.log(`[TouchManager] Tap at (${touchData.x.toFixed(1)}, ${touchData.y.toFixed(1)})`);
            }
        }
    }
    
    setupLongPress(touch) {
        this.clearLongPress();
        
        const touchData = this.createTouchData(touch);
        
        this.longPressTimer = setTimeout(() => {
            const currentTouch = this.touches.get(touch.identifier);
            if (currentTouch && !currentTouch.moved) {
                this.emitGestureEvent('longpress', {
                    x: currentTouch.x,
                    y: currentTouch.y
                });
                
                if (this.config.debugMode) {
                    console.log(`[TouchManager] Long press at (${currentTouch.x.toFixed(1)}, ${currentTouch.y.toFixed(1)})`);
                }
            }
        }, this.config.longPressDelay);
    }
    
    clearLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    
    emitGestureEvent(type, data) {
        const event = new CustomEvent(`touch-${type}`, {
            detail: { ...data, timestamp: performance.now() }
        });
        
        this.canvas.dispatchEvent(event);
        this.stats.gestureEvents++;
        
        // Also emit on app for global listening
        this.app.emit(`touch-${type}`, data);
    }
    
    updateStats(startTime) {
        this.stats.touchEvents++;
        const processingTime = performance.now() - startTime;
        this.stats.averageProcessingTime = 
            (this.stats.averageProcessingTime * (this.stats.touchEvents - 1) + processingTime) / 
            this.stats.touchEvents;
    }
    
    // Public API methods
    getTouchCount() {
        return this.touches.size;
    }
    
    getTouch(id) {
        return this.touches.get(id);
    }
    
    getAllTouches() {
        return Array.from(this.touches.values());
    }
    
    getStats() {
        return { ...this.stats };
    }
    
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        console.log(`[TouchManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    destroy() {
        console.log('[TouchManager] Destroying touch manager');
        
        // Remove event listeners
        this.canvas.removeEventListener('touchstart', this.boundHandlers.touchStart);
        this.canvas.removeEventListener('touchmove', this.boundHandlers.touchMove);
        this.canvas.removeEventListener('touchend', this.boundHandlers.touchEnd);
        this.canvas.removeEventListener('touchcancel', this.boundHandlers.touchCancel);
        
        // Clear state
        this.touches.clear();
        this.clearLongPress();
        this.activeGesture = null;
        
        // Reset canvas style
        this.canvas.style.touchAction = 'auto';
    }
}