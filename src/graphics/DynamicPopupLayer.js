/**
 * DynamicPopupLayer - Advanced dynamic popup system for PixiJS v8
 * Supports irregular shapes, sub-bubbles, and complex connection triggers
 * Optimized for smooth animations and interactive elements
 */

import { Container, Graphics, Point } from 'pixi.js';
import GeometryUtils from './GeometryUtils.js';

export class DynamicPopupLayer {
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        this.logger = this.createLogger();
        
        this.options = {
            animationDuration: 300,
            easeType: 'easeOutCubic',
            maxPopups: 50,
            autoHide: true,
            hideDelay: 3000,
            shadowBlur: 10,
            shadowColor: 0x000000,
            shadowAlpha: 0.3,
            ...options
        };

        // Popup management
        this.popups = new Map();
        this.activeAnimations = new Map();
        this.triggers = new Map();
        this.layouts = new Map();
        
        // Animation system
        this.animationQueue = [];
        this.isAnimating = false;
        this.frameId = null;

        // Event handling
        this.eventListeners = new Map();
        this.setupEventHandlers();

        this.logger.info('DynamicPopupLayer initialized', this.options);
    }

    /**
     * Create a new dynamic popup with irregular shape
     * @param {string} id - Unique popup identifier
     * @param {Object} config - Popup configuration
     * @returns {Promise<boolean>} Success status
     */
    async createPopup(id, config) {
        try {
            if (this.popups.has(id)) {
                this.logger.warn(`Popup ${id} already exists, updating instead`);
                return this.updatePopup(id, config);
            }

            if (this.popups.size >= this.options.maxPopups) {
                this.logger.error(`Maximum popups (${this.options.maxPopups}) reached`);
                return false;
            }

            const popup = {
                id,
                container: new Container(),
                background: new Graphics(),
                content: new Container(),
                triggers: new Container(),
                
                // Configuration
                shape: config.shape || this.getDefaultShape(),
                position: config.position || { x: 0, y: 0 },
                style: config.style || this.getDefaultStyle(),
                
                // Layout containers
                subBubbles: new Container(), // Horizontal layout
                viceBubbles: new Container(), // Vertical layout
                
                // State
                visible: false,
                animated: true,
                interactive: config.interactive !== false,
                autoHide: config.autoHide !== false,
                
                // Timing
                createdAt: performance.now(),
                lastUpdate: 0,
                hideTimer: null,
                
                // Animation properties
                scale: { x: 0, y: 0 },
                targetScale: { x: 1, y: 1 },
                alpha: 0,
                targetAlpha: 1
            };

            // Setup container hierarchy
            this.setupPopupHierarchy(popup);
            
            // Create the popup shape
            this.createPopupShape(popup);
            
            // Add content if provided
            if (config.content) {
                this.addPopupContent(popup, config.content);
            }
            
            // Setup sub-bubbles and vice-bubbles
            if (config.subBubbles) {
                this.createSubBubbles(popup, config.subBubbles);
            }
            
            if (config.viceBubbles) {
                this.createViceBubbles(popup, config.viceBubbles);
            }
            
            // Setup triggers
            if (config.triggers) {
                this.setupPopupTriggers(popup, config.triggers);
            }
            
            // Add to renderer
            this.renderer.popupContainer.addChild(popup.container);
            this.popups.set(id, popup);
            
            // Setup auto-hide if enabled
            if (popup.autoHide && this.options.autoHide) {
                this.setupAutoHide(popup);
            }
            
            // Animate in
            await this.animatePopupIn(popup);
            
            this.logger.debug(`Created popup ${id}`, {
                shape: config.shape?.type || 'default',
                position: config.position,
                hasContent: !!config.content,
                subBubbles: config.subBubbles?.length || 0,
                viceBubbles: config.viceBubbles?.length || 0
            });

            return true;

        } catch (error) {
            this.logger.error(`Failed to create popup ${id}`, error);
            return false;
        }
    }

    /**
     * Setup popup container hierarchy
     * @param {Object} popup - Popup object
     */
    setupPopupHierarchy(popup) {
        // Set container properties
        popup.container.name = popup.id;
        popup.container.sortableChildren = true;
        popup.container.interactive = popup.interactive;
        popup.container.cursor = 'pointer';
        
        // Add child containers in order
        popup.background.zIndex = 0;
        popup.content.zIndex = 1;
        popup.subBubbles.zIndex = 2;
        popup.viceBubbles.zIndex = 3;
        popup.triggers.zIndex = 4;
        
        popup.container.addChild(popup.background);
        popup.container.addChild(popup.content);
        popup.container.addChild(popup.subBubbles);
        popup.container.addChild(popup.viceBubbles);
        popup.container.addChild(popup.triggers);
        
        // Position the container
        popup.container.position.set(popup.position.x, popup.position.y);
    }

    /**
     * Create the main popup shape
     * @param {Object} popup - Popup object
     */
    createPopupShape(popup) {
        const { shape, style } = popup;
        const graphics = popup.background;
        
        graphics.clear();
        
        // Set fill style
        if (style.fill) {
            graphics.fill({
                color: style.fill.color || 0xffffff,
                alpha: style.fill.alpha || 1
            });
        }
        
        // Set stroke style
        if (style.stroke) {
            graphics.stroke({
                color: style.stroke.color || 0x000000,
                width: style.stroke.width || 1,
                alpha: style.stroke.alpha || 1
            });
        }
        
        // Draw shape based on type
        switch (shape.type) {
            case 'cloud':
                this.drawCloudShape(graphics, shape);
                break;
                
            case 'speech':
                this.drawSpeechBubble(graphics, shape);
                break;
                
            case 'organic':
                this.drawOrganicShape(graphics, shape);
                break;
                
            case 'star':
                this.drawStarShape(graphics, shape);
                break;
                
            case 'polygon':
                this.drawPolygonShape(graphics, shape);
                break;
                
            case 'custom':
                this.drawCustomShape(graphics, shape);
                break;
                
            default:
                this.drawDefaultShape(graphics, shape);
        }
        
        // Add shadow effect
        if (style.shadow) {
            this.addShadowEffect(popup);
        }
        
        // Add glow effect
        if (style.glow) {
            this.addGlowEffect(popup);
        }
    }

    /**
     * Draw cloud-like shape
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawCloudShape(graphics, shape) {
        const width = shape.width || 200;
        const height = shape.height || 100;
        const bumps = shape.bumps || 6;
        
        const points = [];
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i <= bumps; i++) {
            const angle = (i / bumps) * Math.PI * 2;
            const radius = (width / 2) * (0.7 + Math.random() * 0.3);
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * (radius * height / width);
            
            points.push(new Point(x, y));
        }
        
        // Smooth the path
        const smoothPoints = GeometryUtils.smoothPath(points, 0.8, 8);
        
        if (smoothPoints.length > 0) {
            graphics.moveTo(smoothPoints[0].x, smoothPoints[0].y);
            for (let i = 1; i < smoothPoints.length; i++) {
                graphics.lineTo(smoothPoints[i].x, smoothPoints[i].y);
            }
            graphics.closePath();
        }
    }

    /**
     * Draw speech bubble with tail
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawSpeechBubble(graphics, shape) {
        const width = shape.width || 200;
        const height = shape.height || 100;
        const radius = shape.radius || 20;
        const tailDirection = shape.tailDirection || 'bottom';
        const tailSize = shape.tailSize || 20;
        
        // Main bubble
        graphics.roundRect(0, 0, width, height, radius);
        
        // Add tail based on direction
        const tailPoints = this.calculateTailPoints(width, height, tailDirection, tailSize);
        if (tailPoints.length > 0) {
            graphics.moveTo(tailPoints[0].x, tailPoints[0].y);
            for (let i = 1; i < tailPoints.length; i++) {
                graphics.lineTo(tailPoints[i].x, tailPoints[i].y);
            }
            graphics.closePath();
        }
    }

    /**
     * Calculate tail points for speech bubble
     * @param {number} width - Bubble width
     * @param {number} height - Bubble height
     * @param {string} direction - Tail direction
     * @param {number} size - Tail size
     * @returns {Point[]} Tail points
     */
    calculateTailPoints(width, height, direction, size) {
        const points = [];
        
        switch (direction) {
            case 'bottom':
                points.push(new Point(width * 0.3, height));
                points.push(new Point(width * 0.4, height + size));
                points.push(new Point(width * 0.5, height));
                break;
                
            case 'top':
                points.push(new Point(width * 0.3, 0));
                points.push(new Point(width * 0.4, -size));
                points.push(new Point(width * 0.5, 0));
                break;
                
            case 'left':
                points.push(new Point(0, height * 0.3));
                points.push(new Point(-size, height * 0.4));
                points.push(new Point(0, height * 0.5));
                break;
                
            case 'right':
                points.push(new Point(width, height * 0.3));
                points.push(new Point(width + size, height * 0.4));
                points.push(new Point(width, height * 0.5));
                break;
        }
        
        return points;
    }

    /**
     * Draw organic/blob shape
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawOrganicShape(graphics, shape) {
        const width = shape.width || 200;
        const height = shape.height || 100;
        const variation = shape.variation || 0.3;
        const points = shape.points || 12;
        
        const organicPoints = [];
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const baseRadius = Math.min(width, height) / 2;
            const radius = baseRadius * (1 + (Math.random() - 0.5) * variation);
            
            const x = centerX + Math.cos(angle) * radius * (width / height);
            const y = centerY + Math.sin(angle) * radius;
            
            organicPoints.push(new Point(x, y));
        }
        
        // Apply smoothing for organic feel
        const smoothed = GeometryUtils.smoothPath(organicPoints, 0.6, 10);
        
        if (smoothed.length > 0) {
            graphics.moveTo(smoothed[0].x, smoothed[0].y);
            for (let i = 1; i < smoothed.length; i++) {
                graphics.lineTo(smoothed[i].x, smoothed[i].y);
            }
            graphics.closePath();
        }
    }

    /**
     * Draw star shape
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawStarShape(graphics, shape) {
        const outerRadius = shape.outerRadius || 50;
        const innerRadius = shape.innerRadius || 25;
        const points = shape.points || 5;
        const center = new Point(shape.width / 2 || 50, shape.height / 2 || 50);
        
        const starPoints = GeometryUtils.generatePolygon(points, outerRadius, innerRadius, center);
        
        if (starPoints.length > 0) {
            graphics.moveTo(starPoints[0].x, starPoints[0].y);
            for (let i = 1; i < starPoints.length; i++) {
                graphics.lineTo(starPoints[i].x, starPoints[i].y);
            }
            graphics.closePath();
        }
    }

    /**
     * Draw polygon shape
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawPolygonShape(graphics, shape) {
        if (shape.points && shape.points.length > 0) {
            graphics.poly(shape.points);
        }
    }

    /**
     * Draw custom shape from path data
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawCustomShape(graphics, shape) {
        if (shape.pathData) {
            // Parse SVG-like path data or point array
            if (typeof shape.pathData === 'string') {
                this.drawSVGPath(graphics, shape.pathData);
            } else if (Array.isArray(shape.pathData)) {
                graphics.poly(shape.pathData);
            }
        }
    }

    /**
     * Draw default rounded rectangle shape
     * @param {Graphics} graphics - Graphics object
     * @param {Object} shape - Shape configuration
     */
    drawDefaultShape(graphics, shape) {
        const width = shape.width || 200;
        const height = shape.height || 100;
        const radius = shape.radius || 10;
        
        graphics.roundRect(0, 0, width, height, radius);
    }

    /**
     * Create sub-bubbles with horizontal layout
     * @param {Object} popup - Parent popup object
     * @param {Array} subBubbleConfigs - Sub-bubble configurations
     */
    createSubBubbles(popup, subBubbleConfigs) {
        const container = popup.subBubbles;
        let xOffset = 20;
        const yOffset = popup.shape.height + 30;
        
        subBubbleConfigs.forEach((config, index) => {
            const subBubble = this.createMiniPopup({
                ...config,
                id: `${popup.id}_sub_${index}`,
                position: { x: xOffset, y: yOffset },
                size: 'small'
            });
            
            container.addChild(subBubble.container);
            
            // Create connection line to parent
            this.createConnectionLine(
                popup.background,
                subBubble.background,
                { style: 'dashed', color: 0x888888 }
            );
            
            xOffset += (config.width || 80) + 15;
        });
    }

    /**
     * Create vice-bubbles with vertical layout
     * @param {Object} popup - Parent popup object
     * @param {Array} viceBubbleConfigs - Vice-bubble configurations
     */
    createViceBubbles(popup, viceBubbleConfigs) {
        const container = popup.viceBubbles;
        const xOffset = popup.shape.width + 30;
        let yOffset = 20;
        
        viceBubbleConfigs.forEach((config, index) => {
            const viceBubble = this.createMiniPopup({
                ...config,
                id: `${popup.id}_vice_${index}`,
                position: { x: xOffset, y: yOffset },
                size: 'small'
            });
            
            container.addChild(viceBubble.container);
            
            // Create connection line to parent
            this.createConnectionLine(
                popup.background,
                viceBubble.background,
                { style: 'dotted', color: 0x666666 }
            );
            
            yOffset += (config.height || 50) + 15;
        });
    }

    /**
     * Create mini popup for sub/vice bubbles
     * @param {Object} config - Mini popup configuration
     * @returns {Object} Mini popup object
     */
    createMiniPopup(config) {
        const miniPopup = {
            container: new Container(),
            background: new Graphics(),
            content: new Container()
        };
        
        miniPopup.container.addChild(miniPopup.background);
        miniPopup.container.addChild(miniPopup.content);
        
        // Draw mini shape
        const size = config.size === 'small' ? 0.6 : 0.8;
        const width = (config.width || 100) * size;
        const height = (config.height || 60) * size;
        
        miniPopup.background.fill(config.fill || 0xf0f0f0);
        miniPopup.background.stroke({ color: 0xcccccc, width: 1 });
        miniPopup.background.roundRect(0, 0, width, height, 8);
        
        // Add content if provided
        if (config.text) {
            // Note: In a real implementation, you'd use PIXI.Text here
            // This is a simplified example
        }
        
        return miniPopup;
    }

    /**
     * Setup popup triggers and connection points
     * @param {Object} popup - Popup object
     * @param {Array} triggerConfigs - Trigger configurations
     */
    setupPopupTriggers(popup, triggerConfigs) {
        const container = popup.triggers;
        
        triggerConfigs.forEach((config, index) => {
            const trigger = new Graphics();
            const triggerId = `${popup.id}_trigger_${index}`;
            
            // Draw trigger shape
            trigger.fill(config.color || 0xff6b6b);
            trigger.circle(config.position.x, config.position.y, config.radius || 8);
            
            // Make interactive
            trigger.interactive = true;
            trigger.cursor = 'pointer';
            trigger.name = triggerId;
            
            // Setup event handlers
            this.setupTriggerEvents(trigger, config, popup);
            
            container.addChild(trigger);
            this.triggers.set(triggerId, { trigger, config, popup });
        });
    }

    /**
     * Setup trigger event handlers
     * @param {Graphics} trigger - Trigger graphics object
     * @param {Object} config - Trigger configuration
     * @param {Object} popup - Parent popup
     */
    setupTriggerEvents(trigger, config, popup) {
        // Click handler
        trigger.on('pointerdown', (event) => {
            event.stopPropagation();
            
            if (config.onClick) {
                config.onClick(trigger, popup, event);
            }
            
            // Default action: close popup
            if (config.action === 'close') {
                this.hidePopup(popup.id);
            } else if (config.action === 'navigate') {
                // Handle navigation
                this.handleNavigation(config.target, popup);
            }
        });
        
        // Hover effects
        trigger.on('pointerover', () => {
            trigger.scale.set(1.1);
            if (config.hoverColor) {
                trigger.tint = config.hoverColor;
            }
        });
        
        trigger.on('pointerout', () => {
            trigger.scale.set(1);
            trigger.tint = 0xffffff;
        });
    }

    /**
     * Create connection line between elements
     * @param {Graphics} source - Source element
     * @param {Graphics} target - Target element
     * @param {Object} style - Line style
     */
    createConnectionLine(source, target, style = {}) {
        const line = new Graphics();
        
        // Calculate connection points
        const sourceBounds = source.getBounds();
        const targetBounds = target.getBounds();
        
        const sourcePoint = new Point(
            sourceBounds.x + sourceBounds.width / 2,
            sourceBounds.y + sourceBounds.height / 2
        );
        
        const targetPoint = new Point(
            targetBounds.x + targetBounds.width / 2,
            targetBounds.y + targetBounds.height / 2
        );
        
        // Style the line
        const strokeStyle = {
            color: style.color || 0x999999,
            width: style.width || 1,
            alpha: style.alpha || 0.7
        };
        
        if (style.style === 'dashed') {
            // Note: PIXI v8 may have built-in dash support
            // This is a simplified implementation
            this.drawDashedLine(line, sourcePoint, targetPoint, strokeStyle);
        } else if (style.style === 'dotted') {
            this.drawDottedLine(line, sourcePoint, targetPoint, strokeStyle);
        } else {
            line.stroke(strokeStyle);
            line.moveTo(sourcePoint.x, sourcePoint.y);
            line.lineTo(targetPoint.x, targetPoint.y);
        }
        
        return line;
    }

    /**
     * Draw dashed line
     * @param {Graphics} graphics - Graphics object
     * @param {Point} start - Start point
     * @param {Point} end - End point
     * @param {Object} style - Line style
     */
    drawDashedLine(graphics, start, end, style) {
        const dashLength = 8;
        const gapLength = 4;
        const totalLength = GeometryUtils.distance(start, end);
        const dashCount = Math.floor(totalLength / (dashLength + gapLength));
        
        graphics.stroke(style);
        
        for (let i = 0; i < dashCount; i++) {
            const startT = (i * (dashLength + gapLength)) / totalLength;
            const endT = ((i * (dashLength + gapLength)) + dashLength) / totalLength;
            
            if (endT > 1) break;
            
            const dashStart = GeometryUtils.lerp(start, end, startT);
            const dashEnd = GeometryUtils.lerp(start, end, endT);
            
            graphics.moveTo(dashStart.x, dashStart.y);
            graphics.lineTo(dashEnd.x, dashEnd.y);
        }
    }

    /**
     * Draw dotted line
     * @param {Graphics} graphics - Graphics object
     * @param {Point} start - Start point
     * @param {Point} end - End point
     * @param {Object} style - Line style
     */
    drawDottedLine(graphics, start, end, style) {
        const dotSpacing = 6;
        const totalLength = GeometryUtils.distance(start, end);
        const dotCount = Math.floor(totalLength / dotSpacing);
        
        graphics.fill(style.color);
        
        for (let i = 0; i <= dotCount; i++) {
            const t = i / dotCount;
            const point = GeometryUtils.lerp(start, end, t);
            graphics.circle(point.x, point.y, 1);
        }
    }

    /**
     * Animate popup entrance
     * @param {Object} popup - Popup object
     * @returns {Promise<void>}
     */
    async animatePopupIn(popup) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const duration = this.options.animationDuration;
            
            // Initial state
            popup.container.scale.set(0);
            popup.container.alpha = 0;
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);
                
                // Update transform
                popup.container.scale.set(eased);
                popup.container.alpha = eased;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    popup.visible = true;
                    resolve();
                }
            };
            
            animate();
        });
    }

    /**
     * Animate popup exit
     * @param {Object} popup - Popup object
     * @returns {Promise<void>}
     */
    async animatePopupOut(popup) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const duration = this.options.animationDuration * 0.7; // Faster exit
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeInCubic(progress);
                
                // Update transform
                const scale = 1 - eased;
                const alpha = 1 - eased;
                
                popup.container.scale.set(scale);
                popup.container.alpha = alpha;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    popup.visible = false;
                    resolve();
                }
            };
            
            animate();
        });
    }

    /**
     * Hide popup with animation
     * @param {string} id - Popup identifier
     * @returns {Promise<boolean>} Success status
     */
    async hidePopup(id) {
        try {
            const popup = this.popups.get(id);
            if (!popup) {
                this.logger.warn(`Popup ${id} not found for hiding`);
                return false;
            }
            
            // Clear auto-hide timer
            if (popup.hideTimer) {
                clearTimeout(popup.hideTimer);
                popup.hideTimer = null;
            }
            
            // Animate out
            await this.animatePopupOut(popup);
            
            // Remove from renderer
            this.renderer.popupContainer.removeChild(popup.container);
            popup.container.destroy();
            
            // Clean up
            this.popups.delete(id);
            this.cleanupTriggers(id);
            
            this.logger.debug(`Hidden popup ${id}`);
            return true;
            
        } catch (error) {
            this.logger.error(`Failed to hide popup ${id}`, error);
            return false;
        }
    }

    /**
     * Setup auto-hide functionality
     * @param {Object} popup - Popup object
     */
    setupAutoHide(popup) {
        if (popup.hideTimer) {
            clearTimeout(popup.hideTimer);
        }
        
        popup.hideTimer = setTimeout(() => {
            this.hidePopup(popup.id);
        }, this.options.hideDelay);
    }

    /**
     * Clean up triggers associated with popup
     * @param {string} popupId - Popup identifier
     */
    cleanupTriggers(popupId) {
        const triggersToRemove = [];
        
        for (const [triggerId, triggerData] of this.triggers.entries()) {
            if (triggerData.popup.id === popupId) {
                triggersToRemove.push(triggerId);
            }
        }
        
        triggersToRemove.forEach(triggerId => {
            this.triggers.delete(triggerId);
        });
    }

    /**
     * Setup event handlers for the popup system
     */
    setupEventHandlers() {
        // Global click handler to close popups when clicking outside
        const globalClickHandler = (event) => {
            const clickedPopup = this.findPopupUnderPoint(event.global);
            
            if (!clickedPopup) {
                // Clicked outside any popup, close all auto-closable ones
                for (const popup of this.popups.values()) {
                    if (popup.autoHide) {
                        this.hidePopup(popup.id);
                    }
                }
            }
        };
        
        if (this.renderer.app.stage) {
            this.renderer.app.stage.on('pointerdown', globalClickHandler);
            this.eventListeners.set('globalClick', globalClickHandler);
        }
    }

    /**
     * Find popup under a given point
     * @param {Point} point - Point to check
     * @returns {Object|null} Popup object or null
     */
    findPopupUnderPoint(point) {
        for (const popup of this.popups.values()) {
            if (!popup.visible) continue;
            
            const bounds = popup.container.getBounds();
            if (GeometryUtils.pointInRect(point, bounds)) {
                return popup;
            }
        }
        return null;
    }

    /**
     * Get default shape configuration
     * @returns {Object} Default shape config
     */
    getDefaultShape() {
        return {
            type: 'roundedRect',
            width: 200,
            height: 100,
            radius: 10
        };
    }

    /**
     * Get default style configuration
     * @returns {Object} Default style config
     */
    getDefaultStyle() {
        return {
            fill: { color: 0xffffff, alpha: 0.95 },
            stroke: { color: 0xcccccc, width: 1, alpha: 1 },
            shadow: true,
            glow: false
        };
    }

    /**
     * Easing functions
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInCubic(t) {
        return t * t * t;
    }

    /**
     * Get system statistics
     * @returns {Object} System stats
     */
    getStats() {
        return {
            activePopups: this.popups.size,
            activeTriggers: this.triggers.size,
            activeAnimations: this.activeAnimations.size,
            memoryUsage: {
                popups: this.popups.size,
                triggers: this.triggers.size,
                eventListeners: this.eventListeners.size
            }
        };
    }

    /**
     * Clean up and destroy the popup layer
     */
    destroy() {
        this.logger.info('Destroying dynamic popup layer...');
        
        // Stop animations
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
        
        // Clear all popups
        for (const popup of this.popups.values()) {
            if (popup.hideTimer) {
                clearTimeout(popup.hideTimer);
            }
            popup.container.destroy();
        }
        
        // Clear data structures
        this.popups.clear();
        this.triggers.clear();
        this.activeAnimations.clear();
        
        // Remove event listeners
        for (const [eventName, handler] of this.eventListeners.entries()) {
            if (this.renderer.app.stage) {
                this.renderer.app.stage.off('pointerdown', handler);
            }
        }
        this.eventListeners.clear();
        
        this.logger.info('Dynamic popup layer destroyed');
    }

    /**
     * Create logger instance
     * @returns {Object} Logger object
     */
    createLogger() {
        const prefix = '[DynamicPopupLayer]';
        return {
            debug: (msg, data) => console.debug(`${prefix} ${msg}`, data || ''),
            info: (msg, data) => console.info(`${prefix} ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`${prefix} ${msg}`, data || ''),
            error: (msg, error) => console.error(`${prefix} ${msg}`, error)
        };
    }
}

export default DynamicPopupLayer;