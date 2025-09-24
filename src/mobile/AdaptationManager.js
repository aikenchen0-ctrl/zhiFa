import * as PIXI from 'pixi.js';

/**
 * Mobile Adaptation Manager - Handles multi-resolution, safe areas, and device adaptation
 * Manages viewport scaling, orientation changes, and device-specific optimizations
 */
export class AdaptationManager {
    constructor(app, options = {}) {
        this.app = app;
        this.renderer = app.renderer;
        this.stage = app.stage;
        
        // Configuration
        this.config = {
            baseWidth: 1920,
            baseHeight: 1080,
            minScale: 0.5,
            maxScale: 3.0,
            scaleMode: 'contain', // 'contain', 'cover', 'fill', 'none'
            enableSafeAreaDetection: true,
            enableOrientationHandling: true,
            enableDPRHandling: true,
            debugMode: false,
            ...options
        };
        
        // Device info
        this.deviceInfo = {
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            orientation: this.getOrientation(),
            isRetina: window.devicePixelRatio > 1,
            isMobile: this.isMobileDevice(),
            isTablet: this.isTabletDevice(),
            platform: this.getPlatform()
        };
        
        // Safe area info
        this.safeArea = {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        };
        
        // Scale info
        this.scaleInfo = {
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            offsetX: 0,
            offsetY: 0
        };
        
        // Bound handlers
        this.boundHandlers = {
            resize: this.handleResize.bind(this),
            orientationChange: this.handleOrientationChange.bind(this),
            visibilityChange: this.handleVisibilityChange.bind(this)
        };
        
        this.init();
    }
    
    init() {
        console.log('[AdaptationManager] Initializing mobile adaptation system');
        
        // Log device info
        if (this.config.debugMode) {
            this.logDeviceInfo();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Detect safe areas
        if (this.config.enableSafeAreaDetection) {
            this.detectSafeAreas();
        }
        
        // Initial resize
        this.handleResize();
        
        console.log('[AdaptationManager] Adaptation system initialized');
    }
    
    setupEventListeners() {
        // Resize handling
        window.addEventListener('resize', this.boundHandlers.resize);
        
        // Orientation change handling
        if (this.config.enableOrientationHandling) {
            window.addEventListener('orientationchange', this.boundHandlers.orientationChange);
            screen.orientation?.addEventListener('change', this.boundHandlers.orientationChange);
        }
        
        // Visibility change (for performance optimization)
        document.addEventListener('visibilitychange', this.boundHandlers.visibilityChange);
    }
    
    handleResize() {
        const startTime = performance.now();
        
        // Update viewport dimensions
        this.deviceInfo.viewportWidth = window.innerWidth;
        this.deviceInfo.viewportHeight = window.innerHeight;
        
        // Update safe areas
        if (this.config.enableSafeAreaDetection) {
            this.detectSafeAreas();
        }
        
        // Calculate new scale
        this.calculateScale();
        
        // Apply scale to app
        this.applyScale();
        
        // Emit resize event
        this.app.emit('mobile-resize', {
            viewport: {
                width: this.deviceInfo.viewportWidth,
                height: this.deviceInfo.viewportHeight
            },
            scale: this.scaleInfo,
            safeArea: this.safeArea
        });
        
        if (this.config.debugMode) {
            const processingTime = performance.now() - startTime;
            console.log(`[AdaptationManager] Resize handled in ${processingTime.toFixed(2)}ms`);
            this.logScaleInfo();
        }
    }
    
    handleOrientationChange() {
        // Add delay to ensure dimensions are updated
        setTimeout(() => {
            const newOrientation = this.getOrientation();
            const oldOrientation = this.deviceInfo.orientation;
            
            this.deviceInfo.orientation = newOrientation;
            
            if (this.config.debugMode) {
                console.log(`[AdaptationManager] Orientation changed: ${oldOrientation} -> ${newOrientation}`);
            }
            
            // Handle resize after orientation change
            this.handleResize();
            
            // Emit orientation change event
            this.app.emit('mobile-orientation-change', {
                from: oldOrientation,
                to: newOrientation,
                viewport: {
                    width: this.deviceInfo.viewportWidth,
                    height: this.deviceInfo.viewportHeight
                }
            });
        }, 100);
    }
    
    handleVisibilityChange() {
        const isVisible = !document.hidden;
        
        if (this.config.debugMode) {
            console.log(`[AdaptationManager] Visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
        }
        
        // Pause/resume app ticker for performance
        if (isVisible) {
            this.app.ticker.start();
        } else {
            this.app.ticker.stop();
        }
        
        this.app.emit('mobile-visibility-change', { visible: isVisible });
    }
    
    calculateScale() {
        const { baseWidth, baseHeight, scaleMode, minScale, maxScale } = this.config;
        const { viewportWidth, viewportHeight } = this.deviceInfo;
        
        let scaleX, scaleY, scale;
        
        switch (scaleMode) {
            case 'contain':
                scale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
                scaleX = scaleY = scale;
                break;
                
            case 'cover':
                scale = Math.max(viewportWidth / baseWidth, viewportHeight / baseHeight);
                scaleX = scaleY = scale;
                break;
                
            case 'fill':
                scaleX = viewportWidth / baseWidth;
                scaleY = viewportHeight / baseHeight;
                scale = Math.min(scaleX, scaleY);
                break;
                
            case 'none':
            default:
                scaleX = scaleY = scale = 1;
                break;
        }
        
        // Apply scale limits
        scale = Math.max(minScale, Math.min(maxScale, scale));
        scaleX = Math.max(minScale, Math.min(maxScale, scaleX));
        scaleY = Math.max(minScale, Math.min(maxScale, scaleY));
        
        // Calculate offsets for centering
        const scaledWidth = baseWidth * scaleX;
        const scaledHeight = baseHeight * scaleY;
        const offsetX = (viewportWidth - scaledWidth) / 2;
        const offsetY = (viewportHeight - scaledHeight) / 2;
        
        this.scaleInfo = {
            scale,
            scaleX,
            scaleY,
            offsetX,
            offsetY
        };
    }
    
    applyScale() {
        const { scaleX, scaleY, offsetX, offsetY } = this.scaleInfo;
        
        // Resize renderer
        this.app.renderer.resize(this.deviceInfo.viewportWidth, this.deviceInfo.viewportHeight);
        
        // Apply scale to stage
        this.stage.scale.set(scaleX, scaleY);
        this.stage.position.set(offsetX, offsetY);
        
        // Handle device pixel ratio
        if (this.config.enableDPRHandling && window.devicePixelRatio > 1) {
            const dpr = Math.min(window.devicePixelRatio, 2); // Cap at 2x for performance
            this.app.renderer.resolution = dpr;
        }
    }
    
    detectSafeAreas() {
        // Use CSS environment variables for safe areas (iOS notch, etc.)
        const computedStyle = getComputedStyle(document.documentElement);
        
        this.safeArea = {
            top: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
            right: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
            bottom: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
            left: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0
        };
        
        // Alternative detection for devices that don't support env()
        if (this.safeArea.top === 0 && this.safeArea.bottom === 0) {
            this.detectSafeAreasAlternative();
        }
        
        if (this.config.debugMode) {
            console.log('[AdaptationManager] Safe areas detected:', this.safeArea);
        }
    }
    
    detectSafeAreasAlternative() {
        // Heuristic detection for common devices
        const { userAgent } = navigator;
        const { viewportWidth, viewportHeight, screenWidth, screenHeight } = this.deviceInfo;
        
        // iPhone X and newer detection
        if (/iPhone/i.test(userAgent)) {
            const aspectRatio = Math.max(screenWidth, screenHeight) / Math.min(screenWidth, screenHeight);
            
            // iPhone X aspect ratio is approximately 2.17
            if (aspectRatio > 2.1) {
                if (viewportWidth > viewportHeight) {
                    // Landscape
                    this.safeArea.left = 44;
                    this.safeArea.right = 44;
                } else {
                    // Portrait
                    this.safeArea.top = 44;
                    this.safeArea.bottom = 34;
                }
            }
        }
        
        // Android with notch/cutout detection
        if (/Android/i.test(userAgent)) {
            // Check for common Android devices with notches
            const hasNotch = screenHeight > viewportHeight + 50; // Rough heuristic
            if (hasNotch) {
                this.safeArea.top = 24; // Status bar height approximation
            }
        }
    }
    
    parseCSSValue(value) {
        if (!value || value === '') return 0;
        return parseFloat(value.replace('px', ''));
    }
    
    // Device detection methods
    isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    }
    
    isTabletDevice() {
        const userAgent = navigator.userAgent;
        return /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    }
    
    getPlatform() {
        const userAgent = navigator.userAgent;
        
        if (/iPhone|iPod/i.test(userAgent)) return 'ios-phone';
        if (/iPad/i.test(userAgent)) return 'ios-tablet';
        if (/Android.*Mobile/i.test(userAgent)) return 'android-phone';
        if (/Android/i.test(userAgent)) return 'android-tablet';
        if (/Windows Phone/i.test(userAgent)) return 'windows-phone';
        
        return 'unknown';
    }
    
    getOrientation() {
        // Use screen.orientation if available
        if (screen.orientation && screen.orientation.angle !== undefined) {
            const angle = screen.orientation.angle;
            return (angle === 0 || angle === 180) ? 'portrait' : 'landscape';
        }
        
        // Fallback to window dimensions
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    
    // Utility methods for converting coordinates
    screenToCanvas(screenX, screenY) {
        const { scaleX, scaleY, offsetX, offsetY } = this.scaleInfo;
        
        return {
            x: (screenX - offsetX) / scaleX,
            y: (screenY - offsetY) / scaleY
        };
    }
    
    canvasToScreen(canvasX, canvasY) {
        const { scaleX, scaleY, offsetX, offsetY } = this.scaleInfo;
        
        return {
            x: canvasX * scaleX + offsetX,
            y: canvasY * scaleY + offsetY
        };
    }
    
    // Safe area utilities
    applySafeAreaToContainer(container) {
        const { top, right, bottom, left } = this.safeArea;
        const { scaleX, scaleY } = this.scaleInfo;
        
        container.position.set(
            left / scaleX,
            top / scaleY
        );
        
        // Adjust container size if it has explicit dimensions
        if (container.width && container.height) {
            container.width -= (left + right) / scaleX;
            container.height -= (top + bottom) / scaleY;
        }
        
        if (this.config.debugMode) {
            console.log(`[AdaptationManager] Applied safe area to container: offset=(${container.x}, ${container.y})`);
        }
    }
    
    getSafeAreaInCanvasSpace() {
        const { scaleX, scaleY } = this.scaleInfo;
        
        return {
            top: this.safeArea.top / scaleY,
            right: this.safeArea.right / scaleX,
            bottom: this.safeArea.bottom / scaleY,
            left: this.safeArea.left / scaleX
        };
    }
    
    // Device-specific optimizations
    getOptimalSettings() {
        const { platform, isRetina, pixelRatio } = this.deviceInfo;
        const settings = {
            antialias: true,
            resolution: 1,
            backgroundColor: 0x000000,
            clearBeforeRender: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        };
        
        // iOS optimizations
        if (platform.startsWith('ios')) {
            settings.antialias = true;
            settings.resolution = Math.min(pixelRatio, 2);
            settings.powerPreference = 'high-performance';
        }
        
        // Android optimizations
        if (platform.startsWith('android')) {
            settings.antialias = !this.isLowEndAndroid();
            settings.resolution = isRetina ? Math.min(pixelRatio, 1.5) : 1;
            settings.powerPreference = this.isLowEndAndroid() ? 'low-power' : 'high-performance';
        }
        
        return settings;
    }
    
    isLowEndAndroid() {
        // Simple heuristic for low-end Android devices
        const userAgent = navigator.userAgent;
        const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
        
        return /Android [1-6]\./i.test(userAgent) || memory < 3;
    }
    
    // Debug utilities
    logDeviceInfo() {
        console.group('[AdaptationManager] Device Information');
        console.log('Platform:', this.deviceInfo.platform);
        console.log('Screen Size:', `${this.deviceInfo.screenWidth} x ${this.deviceInfo.screenHeight}`);
        console.log('Viewport Size:', `${this.deviceInfo.viewportWidth} x ${this.deviceInfo.viewportHeight}`);
        console.log('Pixel Ratio:', this.deviceInfo.pixelRatio);
        console.log('Orientation:', this.deviceInfo.orientation);
        console.log('Is Mobile:', this.deviceInfo.isMobile);
        console.log('Is Tablet:', this.deviceInfo.isTablet);
        console.log('Is Retina:', this.deviceInfo.isRetina);
        console.groupEnd();
    }
    
    logScaleInfo() {
        console.group('[AdaptationManager] Scale Information');
        console.log('Scale:', `${this.scaleInfo.scale.toFixed(3)}`);
        console.log('Scale X/Y:', `${this.scaleInfo.scaleX.toFixed(3)} / ${this.scaleInfo.scaleY.toFixed(3)}`);
        console.log('Offset X/Y:', `${this.scaleInfo.offsetX.toFixed(1)} / ${this.scaleInfo.offsetY.toFixed(1)}`);
        console.log('Safe Area:', this.safeArea);
        console.groupEnd();
    }
    
    // Public API
    getDeviceInfo() {
        return { ...this.deviceInfo };
    }
    
    getScaleInfo() {
        return { ...this.scaleInfo };
    }
    
    getSafeArea() {
        return { ...this.safeArea };
    }
    
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        console.log(`[AdaptationManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    destroy() {
        console.log('[AdaptationManager] Destroying adaptation manager');
        
        // Remove event listeners
        window.removeEventListener('resize', this.boundHandlers.resize);
        window.removeEventListener('orientationchange', this.boundHandlers.orientationChange);
        screen.orientation?.removeEventListener('change', this.boundHandlers.orientationChange);
        document.removeEventListener('visibilitychange', this.boundHandlers.visibilityChange);
        
        // Reset stage transform
        this.stage.scale.set(1);
        this.stage.position.set(0);
    }
}