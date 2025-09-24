import * as PIXI from 'pixi.js';

/**
 * Mobile Performance Manager - Advanced performance optimization for mobile devices
 * Handles viewport culling, object pooling, texture management, and render batching
 */
export class PerformanceManager {
    constructor(app, options = {}) {
        this.app = app;
        this.renderer = app.renderer;
        this.stage = app.stage;
        
        // Configuration
        this.config = {
            enableViewportCulling: true,
            enableObjectPooling: true,
            enableTexturePacking: true,
            enableRenderBatching: true,
            cullMargin: 100, // pixels outside viewport to keep
            maxPoolSize: 1000,
            textureAtlasSize: 2048,
            targetFPS: 60,
            debugMode: false,
            memoryThreshold: 0.8, // 80% memory usage warning
            ...options
        };
        
        // Performance tracking
        this.stats = {
            fps: 0,
            frameTime: 0,
            drawCalls: 0,
            textureMemory: 0,
            objectsRendered: 0,
            objectsCulled: 0,
            poolHits: 0,
            poolMisses: 0
        };
        
        // Object pools
        this.pools = new Map();
        
        // Texture management
        this.textureCache = new Map();
        this.compressedTextures = new Map();
        
        // Viewport culling
        this.viewport = {
            x: 0,
            y: 0,
            width: app.screen.width,
            height: app.screen.height
        };
        
        // Performance monitoring
        this.frameCounter = 0;
        this.lastFPSUpdate = 0;
        this.frameTimeHistory = [];
        this.maxFrameTimeHistory = 60;
        
        // Culling lists
        this.cullableObjects = new Set();
        this.visibleObjects = new Set();
        
        this.init();
    }
    
    init() {
        console.log('[PerformanceManager] Initializing mobile performance system');
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Setup viewport culling
        if (this.config.enableViewportCulling) {
            this.setupViewportCulling();
        }
        
        // Setup object pooling
        if (this.config.enableObjectPooling) {
            this.setupObjectPooling();
        }
        
        // Setup texture management
        if (this.config.enableTexturePacking) {
            this.setupTextureManagement();
        }
        
        // Setup render batching
        if (this.config.enableRenderBatching) {
            this.setupRenderBatching();
        }
        
        console.log('[PerformanceManager] Performance system initialized');
    }
    
    setupPerformanceMonitoring() {
        // Hook into PIXI's ticker for FPS monitoring
        this.app.ticker.add(() => {
            const now = performance.now();
            const deltaTime = this.app.ticker.deltaMS;
            
            this.frameCounter++;
            this.frameTimeHistory.push(deltaTime);
            
            if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
                this.frameTimeHistory.shift();
            }
            
            // Update FPS every second
            if (now - this.lastFPSUpdate >= 1000) {
                this.stats.fps = this.frameCounter;
                this.stats.frameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
                
                this.frameCounter = 0;
                this.lastFPSUpdate = now;
                
                if (this.config.debugMode) {
                    this.logPerformanceStats();
                }
            }
            
            // Update viewport culling
            if (this.config.enableViewportCulling) {
                this.updateViewportCulling();
            }
        });
    }
    
    setupViewportCulling() {
        console.log('[PerformanceManager] Setting up viewport culling');
        
        // Override stage addChild to track cullable objects
        const originalAddChild = this.stage.addChild;
        this.stage.addChild = (...children) => {
            children.forEach(child => {
                if (child.cullable !== false) {
                    this.cullableObjects.add(child);
                }
            });
            return originalAddChild.apply(this.stage, children);
        };
        
        // Override stage removeChild
        const originalRemoveChild = this.stage.removeChild;
        this.stage.removeChild = (...children) => {
            children.forEach(child => {
                this.cullableObjects.delete(child);
                this.visibleObjects.delete(child);
            });
            return originalRemoveChild.apply(this.stage, children);
        };
    }
    
    updateViewportCulling() {
        this.stats.objectsRendered = 0;
        this.stats.objectsCulled = 0;
        
        const { x, y, width, height } = this.viewport;
        const margin = this.config.cullMargin;
        
        const cullBounds = {
            left: x - margin,
            right: x + width + margin,
            top: y - margin,
            bottom: y + height + margin
        };
        
        this.cullableObjects.forEach(obj => {
            const bounds = obj.getBounds();
            const isVisible = (
                bounds.right >= cullBounds.left &&
                bounds.left <= cullBounds.right &&
                bounds.bottom >= cullBounds.top &&
                bounds.top <= cullBounds.bottom
            );
            
            if (isVisible !== obj.visible) {
                obj.visible = isVisible;
                
                if (isVisible) {
                    this.visibleObjects.add(obj);
                    this.stats.objectsRendered++;
                } else {
                    this.visibleObjects.delete(obj);
                    this.stats.objectsCulled++;
                }
            }
        });
    }
    
    setupObjectPooling() {
        console.log('[PerformanceManager] Setting up object pooling');
        
        // Create common object pools
        this.createPool('Sprite', () => new PIXI.Sprite());
        this.createPool('Graphics', () => new PIXI.Graphics());
        this.createPool('Container', () => new PIXI.Container());
        this.createPool('Text', () => new PIXI.Text());
    }
    
    createPool(type, factory, initialSize = 10) {
        const pool = {
            objects: [],
            factory,
            active: new Set(),
            hits: 0,
            misses: 0
        };
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            pool.objects.push(factory());
        }
        
        this.pools.set(type, pool);
        
        if (this.config.debugMode) {
            console.log(`[PerformanceManager] Created pool for ${type} with ${initialSize} objects`);
        }
    }
    
    getFromPool(type, resetFn = null) {
        const pool = this.pools.get(type);
        if (!pool) {
            console.warn(`[PerformanceManager] Pool '${type}' not found`);
            return null;
        }
        
        let obj;
        
        if (pool.objects.length > 0) {
            obj = pool.objects.pop();
            pool.hits++;
            this.stats.poolHits++;
        } else {
            obj = pool.factory();
            pool.misses++;
            this.stats.poolMisses++;
            
            if (this.config.debugMode) {
                console.log(`[PerformanceManager] Pool miss for ${type}, creating new object`);
            }
        }
        
        pool.active.add(obj);
        
        // Reset object if reset function provided
        if (resetFn) {
            resetFn(obj);
        }
        
        return obj;
    }
    
    returnToPool(type, obj) {
        const pool = this.pools.get(type);
        if (!pool || !pool.active.has(obj)) {
            return false;
        }
        
        pool.active.delete(obj);
        
        // Reset common properties
        obj.visible = true;
        obj.alpha = 1;
        obj.scale.set(1);
        obj.rotation = 0;
        obj.position.set(0);
        
        // Clear parent
        if (obj.parent) {
            obj.parent.removeChild(obj);
        }
        
        // Add back to pool if not at max size
        if (pool.objects.length < this.config.maxPoolSize) {
            pool.objects.push(obj);
        } else {
            // Destroy if pool is full
            obj.destroy();
        }
        
        return true;
    }
    
    setupTextureManagement() {
        console.log('[PerformanceManager] Setting up texture management');
        
        // Monitor texture memory usage
        this.app.ticker.add(() => {
            this.updateTextureMemoryStats();
        });
    }
    
    createCompressedTexture(source, format = 'webp', quality = 0.8) {
        const cacheKey = `${source}-${format}-${quality}`;
        
        if (this.compressedTextures.has(cacheKey)) {
            return this.compressedTextures.get(cacheKey);
        }
        
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const texture = PIXI.Texture.from(blob);
                    this.compressedTextures.set(cacheKey, texture);
                    resolve(texture);
                }, `image/${format}`, quality);
            };
            img.src = source;
        });
    }
    
    updateTextureMemoryStats() {
        let totalMemory = 0;
        
        // Estimate texture memory usage
        PIXI.utils.TextureCache.forEach((texture) => {
            if (texture.baseTexture && texture.baseTexture.resource) {
                const { width, height } = texture.baseTexture;
                totalMemory += width * height * 4; // RGBA = 4 bytes per pixel
            }
        });
        
        this.stats.textureMemory = totalMemory;
        
        // Warn if memory usage is high
        if (totalMemory > this.config.memoryThreshold * 1024 * 1024 * 100) { // 100MB threshold
            console.warn(`[PerformanceManager] High texture memory usage: ${(totalMemory / 1024 / 1024).toFixed(1)}MB`);
        }
    }
    
    setupRenderBatching() {
        console.log('[PerformanceManager] Setting up render batching');
        
        // Monitor draw calls
        const originalRender = this.renderer.render;
        this.renderer.render = (displayObject, options) => {
            const startDrawCalls = this.renderer.gl ? this.renderer.gl.drawingBufferHeight : 0;
            const result = originalRender.call(this.renderer, displayObject, options);
            const endDrawCalls = this.renderer.gl ? this.renderer.gl.drawingBufferHeight : 0;
            
            this.stats.drawCalls = Math.abs(endDrawCalls - startDrawCalls);
            
            return result;
        };
    }
    
    // Viewport management
    setViewport(x, y, width, height) {
        this.viewport = { x, y, width, height };
        
        if (this.config.debugMode) {
            console.log(`[PerformanceManager] Viewport updated: (${x}, ${y}, ${width}, ${height})`);
        }
    }
    
    updateViewport(deltaX, deltaY) {
        this.viewport.x += deltaX;
        this.viewport.y += deltaY;
    }
    
    // Performance optimization methods
    optimizeForMobile() {
        console.log('[PerformanceManager] Applying mobile optimizations');
        
        // Reduce render resolution on low-end devices
        if (this.isLowEndDevice()) {
            this.app.renderer.resolution = 0.75;
            console.log('[PerformanceManager] Reduced render resolution for low-end device');
        }
        
        // Enable multi-sampling for better quality on high-DPI screens
        if (window.devicePixelRatio > 1) {
            this.app.renderer.antialias = true;
        }
        
        // Optimize ticker for mobile
        this.app.ticker.maxFPS = this.config.targetFPS;
    }
    
    isLowEndDevice() {
        // Simple heuristic for low-end device detection
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return true;
        
        const renderer = gl.getParameter(gl.RENDERER);
        const vendor = gl.getParameter(gl.VENDOR);
        
        // Check for known low-end GPUs
        const lowEndIndicators = [
            'PowerVR', 'Mali-400', 'Mali-450', 'Adreno 2', 'Adreno 3'
        ];
        
        return lowEndIndicators.some(indicator => 
            renderer.includes(indicator) || vendor.includes(indicator)
        );
    }
    
    // Cleanup and garbage collection
    cleanupUnusedTextures() {
        let cleaned = 0;
        
        Object.keys(PIXI.utils.TextureCache).forEach(key => {
            const texture = PIXI.utils.TextureCache[key];
            if (texture.baseTexture._glTextures && 
                Object.keys(texture.baseTexture._glTextures).length === 0) {
                delete PIXI.utils.TextureCache[key];
                cleaned++;
            }
        });
        
        if (this.config.debugMode && cleaned > 0) {
            console.log(`[PerformanceManager] Cleaned up ${cleaned} unused textures`);
        }
        
        return cleaned;
    }
    
    forceGarbageCollection() {
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
            if (this.config.debugMode) {
                console.log('[PerformanceManager] Forced garbage collection');
            }
        }
    }
    
    // Stats and debugging
    logPerformanceStats() {
        console.group('[PerformanceManager] Performance Stats');
        console.log(`FPS: ${this.stats.fps}`);
        console.log(`Frame Time: ${this.stats.frameTime.toFixed(2)}ms`);
        console.log(`Draw Calls: ${this.stats.drawCalls}`);
        console.log(`Texture Memory: ${(this.stats.textureMemory / 1024 / 1024).toFixed(1)}MB`);
        console.log(`Objects Rendered: ${this.stats.objectsRendered}`);
        console.log(`Objects Culled: ${this.stats.objectsCulled}`);
        console.log(`Pool Hits: ${this.stats.poolHits}`);
        console.log(`Pool Misses: ${this.stats.poolMisses}`);
        console.groupEnd();
    }
    
    getStats() {
        return {
            ...this.stats,
            memoryUsage: this.stats.textureMemory,
            poolEfficiency: this.stats.poolHits / Math.max(1, this.stats.poolHits + this.stats.poolMisses),
            cullEfficiency: this.stats.objectsCulled / Math.max(1, this.stats.objectsRendered + this.stats.objectsCulled)
        };
    }
    
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        console.log(`[PerformanceManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    destroy() {
        console.log('[PerformanceManager] Destroying performance manager');
        
        // Clean up pools
        this.pools.forEach((pool, type) => {
            pool.objects.forEach(obj => obj.destroy());
            pool.active.forEach(obj => obj.destroy());
        });
        this.pools.clear();
        
        // Clear texture caches
        this.textureCache.clear();
        this.compressedTextures.clear();
        
        // Clear tracking sets
        this.cullableObjects.clear();
        this.visibleObjects.clear();
    }
}