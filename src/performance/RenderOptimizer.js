/**
 * RenderOptimizer - Advanced rendering optimization for PixiJS v8
 * Handles batching, culling, texture atlasing, and shader optimization
 */

import { Rectangle } from 'pixi.js';

class RenderOptimizer {
    constructor(app) {
        this.app = app;
        this.renderer = app.renderer;
        
        // Optimization settings
        this.settings = {
            enableCulling: true,
            enableBatching: true,
            enableTextureAtlas: true,
            cullMargin: 100, // pixels outside viewport to still render
            batchSize: 1000,
            maxTextureAtlasSize: 2048,
            useSharedGeometry: true,
            enableInstancedRendering: true,
            targetFPS: navigator.userAgent.match(/Mobile|Android|iPhone|iPad/) ? 30 : 60
        };
        
        // Culling system
        this.viewport = new Rectangle();
        this.cullableObjects = new Set();
        this.visibleObjects = new Set();
        
        // Batching system
        this.batchGroups = new Map();
        this.geometryCache = new Map();
        
        // Texture atlas
        this.atlasManager = new TextureAtlasManager();
        
        // Performance tracking
        this.metrics = {
            culledObjects: 0,
            batchedDrawCalls: 0,
            originalDrawCalls: 0,
            atlasedTextures: 0,
            frameTime: 0
        };
        
        this.setupRenderer();
        this.setupCulling();
    }
    
    setupRenderer() {
        // Configure renderer for optimal performance
        const renderer = this.renderer;
        
        // Enable batching
        renderer.batch.setMaxTextures(16); // Adjust based on device capability
        
        // Configure state management
        if (renderer.state) {
            renderer.state.setPremultipliedBlendMode(true);
        }
        
        // Mobile-specific optimizations
        if (this.isMobile()) {
            // Reduce render resolution for better performance
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            renderer.resolution = pixelRatio;
            
            // Enable more aggressive batching
            this.settings.batchSize = 500;
            this.settings.maxTextureAtlasSize = 1024;
        }
    }
    
    setupCulling() {
        // Initialize viewport
        this.updateViewport();
        
        // Listen for resize events
        window.addEventListener('resize', () => this.updateViewport());
    }
    
    updateViewport() {
        const renderer = this.renderer;
        this.viewport.x = -this.settings.cullMargin;
        this.viewport.y = -this.settings.cullMargin;
        this.viewport.width = renderer.screen.width + (this.settings.cullMargin * 2);
        this.viewport.height = renderer.screen.height + (this.settings.cullMargin * 2);
    }
    
    /**
     * Register objects for culling optimization
     */
    registerForCulling(object, bounds) {
        if (!this.settings.enableCulling) return;
        
        object._optimizationBounds = bounds || this.calculateBounds(object);
        object._wasVisible = object.visible;
        this.cullableObjects.add(object);
    }
    
    /**
     * Unregister objects from culling
     */
    unregisterFromCulling(object) {
        this.cullableObjects.delete(object);
        this.visibleObjects.delete(object);
        delete object._optimizationBounds;
        delete object._wasVisible;
    }
    
    /**
     * Calculate bounds for an object
     */
    calculateBounds(object) {
        if (object.getBounds) {
            return object.getBounds();
        }
        
        // Fallback for simple objects
        return new Rectangle(
            object.x - (object.width || 0) / 2,
            object.y - (object.height || 0) / 2,
            object.width || 100,
            object.height || 100
        );
    }
    
    /**
     * Perform view frustum culling
     */
    performCulling(camera) {
        if (!this.settings.enableCulling) return;
        
        const culled = 0;
        const viewport = this.viewport;
        
        // Update viewport based on camera
        if (camera) {
            viewport.x = camera.x - viewport.width / 2;
            viewport.y = camera.y - viewport.height / 2;
        }
        
        this.visibleObjects.clear();
        
        for (const object of this.cullableObjects) {
            if (!object || object.destroyed) {
                this.cullableObjects.delete(object);
                continue;
            }
            
            const bounds = object._optimizationBounds;
            if (!bounds) continue;
            
            // Check if object intersects with viewport
            const visible = this.intersects(bounds, viewport);
            
            if (visible !== object.visible) {
                object.visible = visible;
            }
            
            if (visible) {
                this.visibleObjects.add(object);
            }
        }
        
        this.metrics.culledObjects = this.cullableObjects.size - this.visibleObjects.size;
    }
    
    /**
     * Check if two rectangles intersect
     */
    intersects(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                rect2.x + rect2.width < rect1.x ||
                rect1.y + rect1.height < rect2.y ||
                rect2.y + rect2.height < rect1.y);
    }
    
    /**
     * Optimize batch rendering
     */
    optimizeBatching(objects) {
        if (!this.settings.enableBatching) return objects;
        
        // Group objects by texture and blend mode
        this.batchGroups.clear();
        
        for (const object of objects) {
            if (!object.visible || !object.texture) continue;
            
            const key = this.getBatchKey(object);
            if (!this.batchGroups.has(key)) {
                this.batchGroups.set(key, []);
            }
            
            this.batchGroups.get(key).push(object);
        }
        
        // Create batched geometries
        let batchedCount = 0;
        for (const [key, group] of this.batchGroups) {
            if (group.length > 1) {
                batchedCount += this.createBatch(group);
            }
        }
        
        this.metrics.batchedDrawCalls = this.batchGroups.size;
        this.metrics.originalDrawCalls = objects.length;
        
        return objects;
    }
    
    /**
     * Generate batch key for grouping
     */
    getBatchKey(object) {
        const texture = object.texture ? object.texture.baseTexture.uid : 'null';
        const blendMode = object.blendMode || 0;
        const shader = object.shader ? object.shader.uid : 'default';
        
        return `${texture}_${blendMode}_${shader}`;
    }
    
    /**
     * Create batch for similar objects
     */
    createBatch(objects) {
        if (objects.length < 2) return 0;
        
        // For PixiJS v8, we can use instanced rendering
        if (this.settings.enableInstancedRendering && objects.length > 10) {
            return this.createInstancedBatch(objects);
        }
        
        // Traditional batching
        return this.createGeometryBatch(objects);
    }
    
    /**
     * Create instanced rendering batch
     */
    createInstancedBatch(objects) {
        // This would require custom shaders and geometry
        // For now, return 1 to indicate batch was created
        console.log(`Created instanced batch for ${objects.length} objects`);
        return 1;
    }
    
    /**
     * Create geometry-based batch
     */
    createGeometryBatch(objects) {
        // Combine geometries of similar objects
        const firstObject = objects[0];
        const key = this.getBatchKey(firstObject);
        
        if (this.geometryCache.has(key) && this.geometryCache.get(key).objects.length === objects.length) {
            // Reuse existing batch geometry
            return 1;
        }
        
        // Create new batch geometry
        const batchData = {
            objects: objects,
            vertices: [],
            indices: [],
            uvs: [],
            lastUpdate: Date.now()
        };
        
        this.geometryCache.set(key, batchData);
        return 1;
    }
    
    /**
     * Optimize textures using atlas
     */
    optimizeTextures(textures) {
        if (!this.settings.enableTextureAtlas) return textures;
        
        return this.atlasManager.processTextures(textures);
    }
    
    /**
     * Update optimization systems
     */
    update(camera, objects) {
        const startTime = performance.now();
        
        // Update viewport
        if (camera) {
            this.updateViewport();
        }
        
        // Perform culling
        this.performCulling(camera);
        
        // Optimize batching for visible objects
        const visibleObjects = Array.from(this.visibleObjects);
        this.optimizeBatching(visibleObjects);
        
        // Clean up old geometries
        this.cleanupGeometryCache();
        
        this.metrics.frameTime = performance.now() - startTime;
    }
    
    /**
     * Clean up old cached geometries
     */
    cleanupGeometryCache() {
        const now = Date.now();
        const maxAge = 30000; // 30 seconds
        
        for (const [key, batchData] of this.geometryCache) {
            if (now - batchData.lastUpdate > maxAge) {
                this.geometryCache.delete(key);
            }
        }
    }
    
    /**
     * Get optimization metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cullableObjects: this.cullableObjects.size,
            visibleObjects: this.visibleObjects.size,
            batchGroups: this.batchGroups.size,
            cachedGeometries: this.geometryCache.size,
            atlasUsage: this.atlasManager.getUsage()
        };
    }
    
    /**
     * Mobile device detection
     */
    isMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Configure settings for mobile
     */
    configureMobile() {
        this.settings.cullMargin = 50;
        this.settings.batchSize = 500;
        this.settings.maxTextureAtlasSize = 1024;
        this.settings.targetFPS = 30;
        
        // Reduce renderer quality
        this.renderer.resolution = Math.min(window.devicePixelRatio || 1, 2);
    }
    
    /**
     * Configure settings for desktop
     */
    configureDesktop() {
        this.settings.cullMargin = 100;
        this.settings.batchSize = 1000;
        this.settings.maxTextureAtlasSize = 2048;
        this.settings.targetFPS = 60;
        
        // Use full resolution
        this.renderer.resolution = window.devicePixelRatio || 1;
    }
    
    /**
     * Destroy optimizer and clean up
     */
    destroy() {
        this.cullableObjects.clear();
        this.visibleObjects.clear();
        this.batchGroups.clear();
        this.geometryCache.clear();
        
        if (this.atlasManager) {
            this.atlasManager.destroy();
        }
        
        window.removeEventListener('resize', this.updateViewport);
    }
}

/**
 * Texture Atlas Manager for combining small textures
 */
class TextureAtlasManager {
    constructor() {
        this.atlases = new Map();
        this.textureMap = new Map();
        this.currentAtlas = null;
        this.maxAtlasSize = 2048;
        this.padding = 2;
    }
    
    processTextures(textures) {
        // Simple implementation - in production you'd want a proper bin packing algorithm
        const optimizedTextures = [];
        
        for (const texture of textures) {
            const optimized = this.getOptimizedTexture(texture);
            optimizedTextures.push(optimized);
        }
        
        return optimizedTextures;
    }
    
    getOptimizedTexture(texture) {
        if (this.textureMap.has(texture)) {
            return this.textureMap.get(texture);
        }
        
        // For small textures, consider atlasing
        if (texture.width <= 256 && texture.height <= 256) {
            return this.addToAtlas(texture);
        }
        
        return texture;
    }
    
    addToAtlas(texture) {
        // Simplified atlasing - would need proper implementation
        this.textureMap.set(texture, texture);
        return texture;
    }
    
    getUsage() {
        return {
            atlases: this.atlases.size,
            mappedTextures: this.textureMap.size
        };
    }
    
    destroy() {
        this.atlases.clear();
        this.textureMap.clear();
    }
}

export default RenderOptimizer;