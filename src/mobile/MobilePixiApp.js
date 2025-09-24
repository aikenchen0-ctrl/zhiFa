import * as PIXI from 'pixi.js';
import { TouchManager } from './TouchManager.js';
import { PerformanceManager } from './PerformanceManager.js';
import { AdaptationManager } from './AdaptationManager.js';
import { ScrollManager } from './ScrollManager.js';

/**
 * Mobile PixiJS Application - Complete mobile optimization integration
 * Combines all mobile managers for a comprehensive mobile experience
 */
export class MobilePixiApp {
    constructor(options = {}) {
        // Configuration
        this.config = {
            // App configuration
            width: 1920,
            height: 1080,
            backgroundColor: 0x1099bb,
            antialias: true,
            
            // Mobile-specific options
            enableTouch: true,
            enablePerformanceOptimization: true,
            enableAdaptation: true,
            enableScrolling: true,
            debugMode: false,
            
            // Manager configurations
            touchOptions: {},
            performanceOptions: {},
            adaptationOptions: {},
            scrollOptions: {},
            
            ...options
        };
        
        // Managers
        this.touchManager = null;
        this.performanceManager = null;
        this.adaptationManager = null;
        this.scrollManager = null;
        
        // PIXI app
        this.app = null;
        
        this.init();
    }
    
    async init() {
        console.log('[MobilePixiApp] Initializing mobile PIXI application');
        
        // Create PIXI application with optimized settings
        await this.createPixiApp();
        
        // Initialize managers
        this.initializeManagers();
        
        // Setup integrated event handling
        this.setupIntegratedEvents();
        
        // Create demo content
        if (this.config.debugMode) {
            this.createDemoContent();
        }
        
        console.log('[MobilePixiApp] Mobile PIXI application initialized successfully');
    }
    
    async createPixiApp() {
        // Get optimal settings for the device
        const tempAdaptation = new (await import('./AdaptationManager.js')).AdaptationManager(
            { canvas: document.createElement('canvas') }
        );
        const optimalSettings = tempAdaptation.getOptimalSettings();
        tempAdaptation.destroy();
        
        // Merge with user config
        const appConfig = {
            width: this.config.width,
            height: this.config.height,
            backgroundColor: this.config.backgroundColor,
            ...optimalSettings,
            ...this.config.pixiOptions
        };
        
        this.app = new PIXI.Application();
        await this.app.init(appConfig);
        
        // Add canvas to DOM if not provided
        if (!this.config.canvas) {
            document.body.appendChild(this.app.canvas);
            this.app.canvas.style.width = '100vw';
            this.app.canvas.style.height = '100vh';
            this.app.canvas.style.display = 'block';
        }
        
        if (this.config.debugMode) {
            console.log('[MobilePixiApp] PIXI app created with config:', appConfig);
        }
    }
    
    initializeManagers() {
        // Initialize Adaptation Manager first (affects other managers)
        if (this.config.enableAdaptation) {
            this.adaptationManager = new AdaptationManager(this.app, {
                debugMode: this.config.debugMode,
                ...this.config.adaptationOptions
            });
        }
        
        // Initialize Performance Manager
        if (this.config.enablePerformanceOptimization) {
            this.performanceManager = new PerformanceManager(this.app, {
                debugMode: this.config.debugMode,
                ...this.config.performanceOptions
            });
        }
        
        // Initialize Touch Manager
        if (this.config.enableTouch) {
            this.touchManager = new TouchManager(this.app, {
                debugMode: this.config.debugMode,
                ...this.config.touchOptions
            });
        }
        
        // Initialize Scroll Manager
        if (this.config.enableScrolling) {
            this.scrollManager = new ScrollManager(this.app, {
                debugMode: this.config.debugMode,
                ...this.config.scrollOptions
            });
        }
        
        if (this.config.debugMode) {
            console.log('[MobilePixiApp] All managers initialized');
        }
    }
    
    setupIntegratedEvents() {
        // Integration between TouchManager and ScrollManager
        if (this.touchManager && this.scrollManager) {
            this.app.canvas.addEventListener('touch-swipe', (event) => {
                // Forward swipe events to scroll manager
                this.scrollManager.handleSwipe(event);
            });
            
            this.app.canvas.addEventListener('touch-pan', (event) => {
                // Forward pan events to scroll manager
                this.scrollManager.handlePan(event);
            });
        }
        
        // Integration between AdaptationManager and PerformanceManager
        if (this.adaptationManager && this.performanceManager) {
            this.app.on('mobile-resize', (data) => {
                // Update performance manager viewport
                this.performanceManager.setViewport(
                    0, 0, data.viewport.width, data.viewport.height
                );
            });
            
            this.app.on('mobile-orientation-change', () => {
                // Trigger performance cleanup on orientation change
                setTimeout(() => {
                    this.performanceManager.cleanupUnusedTextures();
                }, 100);
            });
        }
        
        // Integration between ScrollManager and PerformanceManager
        if (this.scrollManager && this.performanceManager) {
            this.app.on('scroll-change', (data) => {
                // Update performance manager viewport based on scroll
                this.performanceManager.updateViewport(data.deltaX, data.deltaY);
            });
        }
        
        // Global error handling
        this.app.on('error', (error) => {
            console.error('[MobilePixiApp] PIXI error:', error);
            
            // Try to recover by cleaning up resources
            if (this.performanceManager) {
                this.performanceManager.cleanupUnusedTextures();
                this.performanceManager.forceGarbageCollection();
            }
        });
    }
    
    createDemoContent() {
        // Create a scrollable area with various objects
        const container = new PIXI.Container();
        this.app.stage.addChild(container);
        
        // Create background
        const background = new PIXI.Graphics()
            .rect(0, 0, 3000, 2000)
            .fill(0x2c3e50);
        container.addChild(background);
        
        // Create grid of interactive sprites
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 8; y++) {
                const sprite = new PIXI.Graphics()
                    .rect(0, 0, 100, 100)
                    .fill(Math.random() * 0xffffff)
                    .stroke({ width: 2, color: 0xffffff });
                    
                sprite.x = x * 150 + 100;
                sprite.y = y * 150 + 100;
                sprite.eventMode = 'static';
                sprite.cullable = true; // Enable viewport culling
                
                // Add touch interaction
                sprite.on('pointerdown', () => {
                    sprite.scale.set(0.9);
                });
                
                sprite.on('pointerup', () => {
                    sprite.scale.set(1);
                });
                
                sprite.on('pointerupoutside', () => {
                    sprite.scale.set(1);
                });
                
                container.addChild(sprite);
            }
        }
        
        // Set scroll boundaries
        if (this.scrollManager) {
            this.scrollManager.setBoundaries(0, 1500, 0, 800);
        }
        
        // Add performance stats display
        this.createStatsDisplay();
        
        console.log('[MobilePixiApp] Demo content created');
    }
    
    createStatsDisplay() {
        const statsContainer = new PIXI.Container();
        statsContainer.zIndex = 1000;
        this.app.stage.addChild(statsContainer);
        
        const statsText = new PIXI.Text({
            text: 'Stats will appear here',
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0xffffff,
                backgroundColor: 0x000000,
                padding: 5
            }
        });
        
        statsContainer.addChild(statsText);
        
        // Update stats every second
        setInterval(() => {
            const stats = this.getDetailedStats();
            statsText.text = this.formatStatsText(stats);
        }, 1000);
    }
    
    formatStatsText(stats) {
        return [
            `FPS: ${stats.performance?.fps || 0}`,
            `Frame: ${(stats.performance?.frameTime || 0).toFixed(1)}ms`,
            `Touch Events: ${stats.touch?.touchEvents || 0}`,
            `Gestures: ${stats.touch?.gestureEvents || 0}`,
            `Rendered: ${stats.performance?.objectsRendered || 0}`,
            `Culled: ${stats.performance?.objectsCulled || 0}`,
            `Scale: ${(stats.adaptation?.scale || 1).toFixed(2)}`,
            `Scroll: (${(stats.scroll?.x || 0).toFixed(0)}, ${(stats.scroll?.y || 0).toFixed(0)})`,
            `Velocity: ${(stats.scroll?.totalVelocity || 0).toFixed(1)}`
        ].join('\n');
    }
    
    // Public API methods
    getDetailedStats() {
        return {
            touch: this.touchManager?.getStats(),
            performance: this.performanceManager?.getStats(),
            adaptation: this.adaptationManager?.getScaleInfo(),
            scroll: {
                ...this.scrollManager?.getScrollPosition(),
                ...this.scrollManager?.getVelocity(),
                totalVelocity: this.scrollManager ? 
                    Math.abs(this.scrollManager.getVelocity().x) + Math.abs(this.scrollManager.getVelocity().y) : 0,
                ...this.scrollManager?.getStats()
            },
            device: this.adaptationManager?.getDeviceInfo()
        };
    }
    
    // Manager access methods
    getTouchManager() {
        return this.touchManager;
    }
    
    getPerformanceManager() {
        return this.performanceManager;
    }
    
    getAdaptationManager() {
        return this.adaptationManager;
    }
    
    getScrollManager() {
        return this.scrollManager;
    }
    
    // Utility methods
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        
        this.touchManager?.setDebugMode(enabled);
        this.performanceManager?.setDebugMode(enabled);
        this.adaptationManager?.setDebugMode(enabled);
        this.scrollManager?.setDebugMode(enabled);
        
        console.log(`[MobilePixiApp] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    optimizeForDevice() {
        console.log('[MobilePixiApp] Applying device-specific optimizations');
        
        if (this.performanceManager) {
            this.performanceManager.optimizeForMobile();
        }
        
        // Apply device-specific settings
        const deviceInfo = this.adaptationManager?.getDeviceInfo();
        if (deviceInfo) {
            // Reduce quality on low-end devices
            if (deviceInfo.platform === 'android-phone' && !deviceInfo.isRetina) {
                this.app.renderer.resolution = 0.75;
            }
            
            // Optimize for tablets
            if (deviceInfo.isTablet) {
                if (this.scrollManager) {
                    this.scrollManager.config.friction = 0.95; // Smoother scrolling
                }
            }
        }
    }
    
    // Lifecycle methods
    pause() {
        console.log('[MobilePixiApp] Pausing application');
        this.app.ticker.stop();
    }
    
    resume() {
        console.log('[MobilePixiApp] Resuming application');
        this.app.ticker.start();
        
        // Clean up after resume
        if (this.performanceManager) {
            setTimeout(() => {
                this.performanceManager.cleanupUnusedTextures();
            }, 100);
        }
    }
    
    destroy() {
        console.log('[MobilePixiApp] Destroying mobile PIXI application');
        
        // Destroy managers in reverse order
        this.scrollManager?.destroy();
        this.touchManager?.destroy();
        this.performanceManager?.destroy();
        this.adaptationManager?.destroy();
        
        // Destroy PIXI app
        this.app?.destroy(true, true);
        
        // Clear references
        this.touchManager = null;
        this.performanceManager = null;
        this.adaptationManager = null;
        this.scrollManager = null;
        this.app = null;
    }
    
    // Static factory methods
    static async createOptimized(options = {}) {
        const app = new MobilePixiApp({
            enableTouch: true,
            enablePerformanceOptimization: true,
            enableAdaptation: true,
            enableScrolling: true,
            debugMode: false,
            ...options
        });
        
        // Apply automatic optimizations
        app.optimizeForDevice();
        
        return app;
    }
    
    static async createDebug(options = {}) {
        const app = new MobilePixiApp({
            enableTouch: true,
            enablePerformanceOptimization: true,
            enableAdaptation: true,
            enableScrolling: true,
            debugMode: true,
            ...options
        });
        
        return app;
    }
}