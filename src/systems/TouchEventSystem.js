/**
 * Mobile Touch Event and Gesture Recognition System
 * 完整的移动端触摸事件和手势处理系统
 * 
 * Features:
 * - Multi-touch support with PIXI v8 event system
 * - Comprehensive gesture recognition (tap, long press, swipe, drag, pinch)
 * - Advanced scrolling with inertia and bounce
 * - Special interactions (5s hover detection, swipe to reveal, multi-select)
 * - High-performance event handling with throttling
 * - Detailed touch logging
 */

import * as PIXI from 'pixi.js';

export class TouchEventSystem {
    constructor(pixiApp, options = {}) {
        this.app = pixiApp;
        this.stage = pixiApp.stage;
        
        // Configuration
        this.config = {
            // Gesture thresholds
            tapMaxDuration: 300,
            tapMaxDistance: 10,
            longPressMinDuration: 500,
            swipeMinDistance: 50,
            swipeMaxDuration: 500,
            
            // Scroll settings
            scrollDecceleration: 0.95,
            scrollBounceStiffness: 0.1,
            scrollBoundaryThreshold: 50,
            
            // Pinch settings
            pinchMinDistance: 10,
            pinchMaxScale: 3,
            pinchMinScale: 0.5,
            
            // Special interactions
            hoverDetectionTime: 5000,
            multiSelectDelay: 200,
            
            // Performance
            throttleDelay: 16, // ~60fps
            logLevel: 'info', // debug, info, warn, error
            
            ...options
        };
        
        // Touch state
        this.touches = new Map();
        this.activeGestures = new Set();
        this.lastTouchTime = 0;
        
        // Scroll state
        this.scrollVelocity = { x: 0, y: 0 };
        this.scrollPosition = { x: 0, y: 0 };
        this.isScrolling = false;
        
        // Gesture state
        this.gestureState = {
            tap: { count: 0, lastTime: 0, position: null },
            longPress: { timer: null, active: false },
            swipe: { startPos: null, startTime: 0 },
            drag: { active: false, startPos: null, target: null },
            pinch: { active: false, startDistance: 0, startScale: 1 },
            hover: { timer: null, target: null, position: null }
        };
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Performance optimization
        this.throttledHandlers = {
            touchMove: this.throttle(this._handleTouchMove.bind(this), this.config.throttleDelay),
            scroll: this.throttle(this._updateScroll.bind(this), this.config.throttleDelay)
        };
        
        this.init();
    }
    
    init() {
        this.log('info', 'TouchEventSystem initializing...');
        
        // Enable interaction on stage
        this.stage.eventMode = 'static';
        this.stage.hitArea = this.app.screen;
        
        // Register PIXI v8 event handlers
        this.stage.on('pointerdown', this._handlePointerDown.bind(this));
        this.stage.on('pointermove', this._handlePointerMove.bind(this));
        this.stage.on('pointerup', this._handlePointerUp.bind(this));
        this.stage.on('pointercancel', this._handlePointerCancel.bind(this));
        this.stage.on('pointerupoutside', this._handlePointerUp.bind(this));
        
        // Start scroll animation loop
        this.app.ticker.add(this.throttledHandlers.scroll);
        
        this.log('info', 'TouchEventSystem initialized successfully');
    }
    
    // ===========================================
    // CORE TOUCH EVENT HANDLERS
    // ===========================================
    
    _handlePointerDown(event) {
        const touch = this._createTouchData(event);
        this.touches.set(event.pointerId, touch);
        this.lastTouchTime = performance.now();
        
        this.log('debug', 'Touch start', { id: event.pointerId, pos: touch.position });
        
        // Reset scroll velocity on new touch
        if (this.touches.size === 1) {
            this.scrollVelocity.x = 0;
            this.scrollVelocity.y = 0;
            this.isScrolling = false;
        }
        
        // Handle different touch scenarios
        if (this.touches.size === 1) {
            this._handleSingleTouchStart(touch, event);
        } else if (this.touches.size === 2) {
            this._handleMultiTouchStart(touch, event);
        }
        
        this._dispatchEvent('touchstart', {
            touch,
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });
    }
    
    _handlePointerMove(event) {
        const touch = this.touches.get(event.pointerId);
        if (!touch) return;
        
        this._updateTouchData(touch, event);
        this.throttledHandlers.touchMove(event);
    }
    
    _handleTouchMove(event) {
        const touch = this.touches.get(event.pointerId);
        if (!touch) return;
        
        const distance = this._calculateDistance(touch.startPosition, touch.position);
        const deltaTime = performance.now() - touch.startTime;
        
        this.log('debug', 'Touch move', { 
            id: event.pointerId, 
            pos: touch.position, 
            distance,
            deltaTime 
        });
        
        // Update velocity for scroll calculations
        touch.velocity = {
            x: touch.deltaPosition.x / (touch.deltaTime || 1),
            y: touch.deltaPosition.y / (touch.deltaTime || 1)
        };
        
        // Handle gestures based on touch count
        if (this.touches.size === 1) {
            this._handleSingleTouchMove(touch, event);
        } else if (this.touches.size === 2) {
            this._handleMultiTouchMove(touch, event);
        }
        
        this._dispatchEvent('touchmove', {
            touch,
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });
    }
    
    _handlePointerUp(event) {
        const touch = this.touches.get(event.pointerId);
        if (!touch) return;
        
        this._updateTouchData(touch, event);
        touch.endTime = performance.now();
        touch.totalDuration = touch.endTime - touch.startTime;
        
        this.log('debug', 'Touch end', { 
            id: event.pointerId, 
            duration: touch.totalDuration,
            distance: this._calculateDistance(touch.startPosition, touch.position)
        });
        
        // Handle gesture completion
        if (this.touches.size === 1) {
            this._handleSingleTouchEnd(touch, event);
        } else if (this.touches.size === 2) {
            this._handleMultiTouchEnd(touch, event);
        }
        
        this._dispatchEvent('touchend', {
            touch,
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });
        
        // Remove touch from tracking
        this.touches.delete(event.pointerId);
        
        // Clean up timers
        this._cleanupGestureTimers();
    }
    
    _handlePointerCancel(event) {
        const touch = this.touches.get(event.pointerId);
        if (!touch) return;
        
        this.log('debug', 'Touch cancel', { id: event.pointerId });
        
        this._dispatchEvent('touchcancel', {
            touch,
            touches: Array.from(this.touches.values()),
            originalEvent: event
        });
        
        this.touches.delete(event.pointerId);
        this._cleanupGestureTimers();
        this._resetGestureStates();
    }
    
    // ===========================================
    // SINGLE TOUCH GESTURES
    // ===========================================
    
    _handleSingleTouchStart(touch, event) {
        const target = event.target;
        
        // Start long press detection
        this.gestureState.longPress.timer = setTimeout(() => {
            if (this.touches.has(event.pointerId)) {
                this._triggerLongPress(touch, target);
            }
        }, this.config.longPressMinDuration);
        
        // Start hover detection (5 second rule)
        this.gestureState.hover.timer = setTimeout(() => {
            if (this.touches.has(event.pointerId)) {
                this._triggerHoverDetection(touch, target);
            }
        }, this.config.hoverDetectionTime);
        
        // Initialize swipe detection
        this.gestureState.swipe.startPos = { ...touch.position };
        this.gestureState.swipe.startTime = touch.startTime;
        
        // Initialize potential drag
        this.gestureState.drag.startPos = { ...touch.position };
        this.gestureState.drag.target = target;
    }
    
    _handleSingleTouchMove(touch, event) {
        const distance = this._calculateDistance(touch.startPosition, touch.position);
        
        // Cancel long press if moved too far
        if (distance > this.config.tapMaxDistance) {
            this._cancelLongPress();
            this._cancelHoverDetection();
        }
        
        // Check for drag start
        if (!this.gestureState.drag.active && distance > this.config.tapMaxDistance) {
            this._startDrag(touch, event.target);
        }
        
        // Update drag if active
        if (this.gestureState.drag.active) {
            this._updateDrag(touch, event);
        }
        
        // Update scroll if not dragging specific target
        if (!this.gestureState.drag.active || this.gestureState.drag.target === this.stage) {
            this._updateScrollFromTouch(touch);
        }
    }
    
    _handleSingleTouchEnd(touch, event) {
        const distance = this._calculateDistance(touch.startPosition, touch.position);
        const duration = touch.totalDuration;
        
        // Check for tap
        if (distance <= this.config.tapMaxDistance && duration <= this.config.tapMaxDuration) {
            this._triggerTap(touch, event.target);
        }
        
        // Check for swipe
        else if (distance >= this.config.swipeMinDistance && duration <= this.config.swipeMaxDuration) {
            this._triggerSwipe(touch, event.target);
        }
        
        // End drag
        if (this.gestureState.drag.active) {
            this._endDrag(touch, event);
        }
        
        // Start inertial scroll
        if (!this.gestureState.drag.active && touch.velocity) {
            this._startInertialScroll(touch.velocity);
        }
    }
    
    // ===========================================
    // MULTI-TOUCH GESTURES
    // ===========================================
    
    _handleMultiTouchStart(touch, event) {
        if (this.touches.size === 2) {
            // Initialize pinch gesture
            const touches = Array.from(this.touches.values());
            const distance = this._calculateDistance(touches[0].position, touches[1].position);
            
            this.gestureState.pinch.active = true;
            this.gestureState.pinch.startDistance = distance;
            this.gestureState.pinch.startScale = 1;
            
            this.log('info', 'Pinch gesture started', { startDistance: distance });
        }
    }
    
    _handleMultiTouchMove(touch, event) {
        if (this.touches.size === 2 && this.gestureState.pinch.active) {
            const touches = Array.from(this.touches.values());
            const currentDistance = this._calculateDistance(touches[0].position, touches[1].position);
            
            if (currentDistance > this.config.pinchMinDistance) {
                const scale = currentDistance / this.gestureState.pinch.startDistance;
                this._updatePinch(scale, touches);
            }
        }
    }
    
    _handleMultiTouchEnd(touch, event) {
        if (this.gestureState.pinch.active) {
            this._endPinch();
        }
    }
    
    // ===========================================
    // GESTURE IMPLEMENTATIONS
    // ===========================================
    
    _triggerTap(touch, target) {
        const now = performance.now();
        const timeSinceLastTap = now - this.gestureState.tap.lastTime;
        
        // Multi-tap detection
        if (timeSinceLastTap < this.config.multiSelectDelay && 
            this.gestureState.tap.position &&
            this._calculateDistance(this.gestureState.tap.position, touch.position) < this.config.tapMaxDistance) {
            this.gestureState.tap.count++;
        } else {
            this.gestureState.tap.count = 1;
        }
        
        this.gestureState.tap.lastTime = now;
        this.gestureState.tap.position = { ...touch.position };
        
        this.log('info', 'Tap gesture', { count: this.gestureState.tap.count, target: target.constructor.name });
        
        this._dispatchEvent('tap', {
            position: touch.position,
            count: this.gestureState.tap.count,
            target,
            touch
        });
        
        // Multi-select mode
        if (this.gestureState.tap.count >= 2) {
            this._dispatchEvent('multiselect', {
                position: touch.position,
                target,
                touch
            });
        }
    }
    
    _triggerLongPress(touch, target) {
        this.gestureState.longPress.active = true;
        
        this.log('info', 'Long press gesture', { target: target.constructor.name });
        
        this._dispatchEvent('longpress', {
            position: touch.position,
            target,
            touch
        });
    }
    
    _triggerSwipe(touch, target) {
        const direction = this._getSwipeDirection(touch.startPosition, touch.position);
        const distance = this._calculateDistance(touch.startPosition, touch.position);
        const velocity = distance / touch.totalDuration;
        
        this.log('info', 'Swipe gesture', { direction, distance, velocity });
        
        this._dispatchEvent('swipe', {
            direction,
            distance,
            velocity,
            startPosition: touch.startPosition,
            endPosition: touch.position,
            target,
            touch
        });
        
        // Swipe to reveal functionality
        if (direction === 'left' || direction === 'right') {
            this._dispatchEvent('swipetoreveal', {
                direction,
                target,
                touch
            });
        }
    }
    
    _startDrag(touch, target) {
        this.gestureState.drag.active = true;
        this.gestureState.drag.target = target;
        
        this.log('info', 'Drag started', { target: target.constructor.name });
        
        this._dispatchEvent('dragstart', {
            position: touch.position,
            startPosition: touch.startPosition,
            target,
            touch
        });
    }
    
    _updateDrag(touch, event) {
        this._dispatchEvent('dragmove', {
            position: touch.position,
            startPosition: touch.startPosition,
            deltaPosition: touch.deltaPosition,
            target: this.gestureState.drag.target,
            touch
        });
    }
    
    _endDrag(touch, event) {
        this.log('info', 'Drag ended');
        
        this._dispatchEvent('dragend', {
            position: touch.position,
            startPosition: touch.startPosition,
            target: this.gestureState.drag.target,
            touch
        });
        
        this.gestureState.drag.active = false;
        this.gestureState.drag.target = null;
    }
    
    _updatePinch(scale, touches) {
        // Clamp scale
        scale = Math.max(this.config.pinchMinScale, Math.min(this.config.pinchMaxScale, scale));
        
        // Calculate center point
        const center = {
            x: (touches[0].position.x + touches[1].position.x) / 2,
            y: (touches[0].position.y + touches[1].position.y) / 2
        };
        
        this.log('debug', 'Pinch update', { scale, center });
        
        this._dispatchEvent('pinch', {
            scale,
            center,
            touches
        });
    }
    
    _endPinch() {
        this.log('info', 'Pinch ended');
        
        this._dispatchEvent('pinchend', {
            finalScale: this.gestureState.pinch.startScale
        });
        
        this.gestureState.pinch.active = false;
    }
    
    _triggerHoverDetection(touch, target) {
        this.log('info', '5-second hover detected', { target: target.constructor.name });
        
        this._dispatchEvent('hoverdetection', {
            position: touch.position,
            target,
            duration: this.config.hoverDetectionTime,
            touch
        });
    }
    
    // ===========================================
    // SCROLL SYSTEM
    // ===========================================
    
    _updateScrollFromTouch(touch) {
        if (!this.isScrolling) {
            this.isScrolling = true;
        }
        
        // Update scroll position based on touch delta
        this.scrollPosition.x += touch.deltaPosition.x;
        this.scrollPosition.y += touch.deltaPosition.y;
        
        // Apply boundaries
        this._applyScrollBoundaries();
        
        this._dispatchEvent('scroll', {
            position: this.scrollPosition,
            delta: touch.deltaPosition,
            velocity: touch.velocity
        });
    }
    
    _startInertialScroll(velocity) {
        this.scrollVelocity.x = velocity.x * 100; // Scale up velocity
        this.scrollVelocity.y = velocity.y * 100;
        
        this.log('info', 'Inertial scroll started', { velocity: this.scrollVelocity });
    }
    
    _updateScroll() {
        if (Math.abs(this.scrollVelocity.x) < 0.1 && Math.abs(this.scrollVelocity.y) < 0.1) {
            this.scrollVelocity.x = 0;
            this.scrollVelocity.y = 0;
            if (this.isScrolling) {
                this.isScrolling = false;
                this._dispatchEvent('scrollend', { position: this.scrollPosition });
            }
            return;
        }
        
        // Apply velocity to position
        this.scrollPosition.x += this.scrollVelocity.x;
        this.scrollPosition.y += this.scrollVelocity.y;
        
        // Apply boundaries and bounce
        this._applyScrollBoundaries();
        
        // Apply deceleration
        this.scrollVelocity.x *= this.config.scrollDecceleration;
        this.scrollVelocity.y *= this.config.scrollDecceleration;
        
        this._dispatchEvent('scroll', {
            position: this.scrollPosition,
            velocity: this.scrollVelocity
        });
    }
    
    _applyScrollBoundaries() {
        const bounds = this.getScrollBounds();
        
        // Horizontal boundaries
        if (this.scrollPosition.x < bounds.left) {
            this.scrollPosition.x += (bounds.left - this.scrollPosition.x) * this.config.scrollBounceStiffness;
            this.scrollVelocity.x *= -0.5; // Bounce back
        } else if (this.scrollPosition.x > bounds.right) {
            this.scrollPosition.x += (bounds.right - this.scrollPosition.x) * this.config.scrollBounceStiffness;
            this.scrollVelocity.x *= -0.5;
        }
        
        // Vertical boundaries
        if (this.scrollPosition.y < bounds.top) {
            this.scrollPosition.y += (bounds.top - this.scrollPosition.y) * this.config.scrollBounceStiffness;
            this.scrollVelocity.y *= -0.5;
        } else if (this.scrollPosition.y > bounds.bottom) {
            this.scrollPosition.y += (bounds.bottom - this.scrollPosition.y) * this.config.scrollBounceStiffness;
            this.scrollVelocity.y *= -0.5;
        }
    }
    
    getScrollBounds() {
        // Override this method to define custom scroll boundaries
        return {
            left: -1000,
            right: 1000,
            top: -1000,
            bottom: 1000
        };
    }
    
    // ===========================================
    // UTILITY METHODS
    // ===========================================
    
    _createTouchData(event) {
        const position = { x: event.global.x, y: event.global.y };
        const now = performance.now();
        
        return {
            id: event.pointerId,
            startPosition: { ...position },
            position: { ...position },
            previousPosition: { ...position },
            deltaPosition: { x: 0, y: 0 },
            startTime: now,
            previousTime: now,
            deltaTime: 0,
            velocity: { x: 0, y: 0 },
            target: event.target
        };
    }
    
    _updateTouchData(touch, event) {
        const newPosition = { x: event.global.x, y: event.global.y };
        const now = performance.now();
        
        touch.deltaPosition.x = newPosition.x - touch.position.x;
        touch.deltaPosition.y = newPosition.y - touch.position.y;
        touch.deltaTime = now - touch.previousTime;
        
        touch.previousPosition = { ...touch.position };
        touch.position = newPosition;
        touch.previousTime = now;
    }
    
    _calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    _getSwipeDirection(startPos, endPos) {
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }
    
    _cancelLongPress() {
        if (this.gestureState.longPress.timer) {
            clearTimeout(this.gestureState.longPress.timer);
            this.gestureState.longPress.timer = null;
        }
        this.gestureState.longPress.active = false;
    }
    
    _cancelHoverDetection() {
        if (this.gestureState.hover.timer) {
            clearTimeout(this.gestureState.hover.timer);
            this.gestureState.hover.timer = null;
        }
    }
    
    _cleanupGestureTimers() {
        this._cancelLongPress();
        this._cancelHoverDetection();
    }
    
    _resetGestureStates() {
        this.gestureState.drag.active = false;
        this.gestureState.drag.target = null;
        this.gestureState.pinch.active = false;
        this.activeGestures.clear();
    }
    
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = performance.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = performance.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    // ===========================================
    // EVENT SYSTEM
    // ===========================================
    
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
        
        return () => {
            this.off(eventName, callback);
        };
    }
    
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.delete(callback);
        }
    }
    
    _dispatchEvent(eventName, data) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log('error', `Error in ${eventName} event listener:`, error);
                }
            });
        }
    }
    
    // ===========================================
    // LOGGING SYSTEM
    // ===========================================
    
    log(level, message, data = null) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const configLevel = levels[this.config.logLevel] || 1;
        
        if (levels[level] >= configLevel) {
            const timestamp = new Date().toISOString();
            const logMessage = `[TouchEventSystem ${timestamp}] ${message}`;
            
            if (data) {
                console[level](logMessage, data);
            } else {
                console[level](logMessage);
            }
        }
    }
    
    // ===========================================
    // PUBLIC API
    // ===========================================
    
    getActiveTouches() {
        return Array.from(this.touches.values());
    }
    
    getTouchCount() {
        return this.touches.size;
    }
    
    isGestureActive(gestureType) {
        return this.activeGestures.has(gestureType);
    }
    
    setScrollPosition(x, y) {
        this.scrollPosition.x = x;
        this.scrollPosition.y = y;
        this._applyScrollBoundaries();
    }
    
    getScrollPosition() {
        return { ...this.scrollPosition };
    }
    
    stopScroll() {
        this.scrollVelocity.x = 0;
        this.scrollVelocity.y = 0;
        this.isScrolling = false;
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('info', 'Configuration updated', newConfig);
    }
    
    destroy() {
        this.log('info', 'TouchEventSystem destroying...');
        
        // Remove event listeners
        this.stage.off('pointerdown');
        this.stage.off('pointermove');
        this.stage.off('pointerup');
        this.stage.off('pointercancel');
        this.stage.off('pointerupoutside');
        
        // Stop ticker
        this.app.ticker.remove(this.throttledHandlers.scroll);
        
        // Clean up timers
        this._cleanupGestureTimers();
        
        // Clear state
        this.touches.clear();
        this.eventListeners.clear();
        this.activeGestures.clear();
        
        this.log('info', 'TouchEventSystem destroyed');
    }
}

// Usage example and factory function
export function createTouchEventSystem(pixiApp, options = {}) {
    return new TouchEventSystem(pixiApp, options);
}

export default TouchEventSystem;