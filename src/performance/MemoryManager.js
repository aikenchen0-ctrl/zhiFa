/**
 * MemoryManager - Advanced memory management for PixiJS v8
 * Handles texture cleanup, object destruction, and garbage collection optimization
 */

class MemoryManager {
    constructor() {
        this.textureCache = new Map();
        this.objectRegistry = new WeakMap();
        this.disposalQueue = [];
        
        this.settings = {
            maxTextureCache: 50,
            maxUnusedTime: 60000, // 1 minute
            gcInterval: 30000, // 30 seconds
            maxMemoryMB: navigator.userAgent.match(/Mobile/) ? 100 : 200,
            aggressiveCleanup: false
        };
        
        this.stats = {
            texturesCreated: 0,
            texturesDestroyed: 0,
            objectsTracked: 0,
            memoryCleared: 0,
            gcRuns: 0
        };
        
        this.memoryUsage = {
            textures: 0,
            objects: 0,
            estimated: 0
        };
        
        // Start garbage collection timer
        this.gcTimer = setInterval(() => this.performGC(), this.settings.gcInterval);
        
        // Monitor memory pressure
        this.setupMemoryMonitoring();
    }
    
    setupMemoryMonitoring() {
        // Use performance.memory if available (Chrome)
        this.memoryAPI = performance.memory;
        
        if (this.memoryAPI) {
            // Monitor memory pressure
            setInterval(() => this.checkMemoryPressure(), 5000);
        }
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.performEmergencyCleanup();
            }
        });
        
        // Listen for low memory warnings on mobile
        if ('onmemorywarning' in window) {
            window.addEventListener('memorywarning', () => {
                this.handleMemoryWarning();
            });
        }
    }
    
    checkMemoryPressure() {
        if (!this.memoryAPI) return;
        
        const usedMB = this.memoryAPI.usedJSHeapSize / 1024 / 1024;
        const limitMB = this.memoryAPI.jsHeapSizeLimit / 1024 / 1024;
        
        // If using more than 80% of available memory, start aggressive cleanup
        if (usedMB > limitMB * 0.8 || usedMB > this.settings.maxMemoryMB) {
            this.settings.aggressiveCleanup = true;
            this.performEmergencyCleanup();
        } else if (usedMB < limitMB * 0.6) {
            this.settings.aggressiveCleanup = false;
        }
        
        this.memoryUsage.estimated = usedMB;
    }
    
    /**
     * Track a PixiJS object for memory management
     */
    trackObject(object, metadata = {}) {
        if (!object || typeof object !== 'object') return;
        
        const trackingData = {
            created: Date.now(),
            lastUsed: Date.now(),
            type: metadata.type || 'unknown',
            size: metadata.size || 0,
            ...metadata
        };
        
        this.objectRegistry.set(object, trackingData);
        this.stats.objectsTracked++;
        
        // Estimate memory usage
        this.memoryUsage.objects += trackingData.size || 1;
    }
    
    /**
     * Update last used time for an object
     */
    touchObject(object) {
        const trackingData = this.objectRegistry.get(object);
        if (trackingData) {
            trackingData.lastUsed = Date.now();
        }
    }
    
    /**
     * Untrack an object
     */
    untrackObject(object) {
        const trackingData = this.objectRegistry.get(object);
        if (trackingData) {
            this.memoryUsage.objects -= trackingData.size || 1;
            this.objectRegistry.delete(object);
        }
    }
    
    /**
     * Register texture for smart caching
     */
    registerTexture(texture, url, size) {
        if (!texture || !url) return;
        
        const textureData = {
            texture: texture,
            url: url,
            created: Date.now(),
            lastUsed: Date.now(),
            size: size || this.estimateTextureSize(texture),
            refCount: 1
        };
        
        this.textureCache.set(url, textureData);
        this.stats.texturesCreated++;
        this.memoryUsage.textures += textureData.size;
    }
    
    /**
     * Get cached texture
     */
    getTexture(url) {
        const textureData = this.textureCache.get(url);
        if (textureData) {
            textureData.lastUsed = Date.now();
            textureData.refCount++;
            return textureData.texture;
        }
        return null;
    }
    
    /**
     * Release texture reference
     */
    releaseTexture(url) {
        const textureData = this.textureCache.get(url);
        if (textureData) {
            textureData.refCount--;
            if (textureData.refCount <= 0) {
                this.queueTextureDisposal(url);
            }
        }
    }
    
    /**
     * Queue texture for disposal
     */
    queueTextureDisposal(url) {
        this.disposalQueue.push({
            type: 'texture',
            url: url,
            queuedAt: Date.now()
        });
    }
    
    /**
     * Estimate texture memory size
     */
    estimateTextureSize(texture) {
        if (!texture || !texture.baseTexture) return 0;
        
        const width = texture.baseTexture.width || 1;
        const height = texture.baseTexture.height || 1;
        const format = texture.baseTexture.format || 'RGBA';
        
        // Estimate bytes per pixel based on format
        let bytesPerPixel = 4; // RGBA default
        switch (format) {
            case 'RGB': bytesPerPixel = 3; break;
            case 'ALPHA': bytesPerPixel = 1; break;
            case 'LUMINANCE': bytesPerPixel = 1; break;
            case 'LUMINANCE_ALPHA': bytesPerPixel = 2; break;
        }
        
        return width * height * bytesPerPixel;
    }
    
    /**
     * Perform garbage collection
     */
    performGC() {
        const now = Date.now();
        const maxAge = this.settings.maxUnusedTime;
        
        this.stats.gcRuns++;
        
        // Clean up old textures
        this.cleanupTextures(now, maxAge);
        
        // Process disposal queue
        this.processDisposalQueue(now);
        
        // Trigger native GC if available
        if (window.gc && this.settings.aggressiveCleanup) {
            window.gc();
        }
    }
    
    /**
     * Clean up unused textures
     */
    cleanupTextures(now, maxAge) {
        const toRemove = [];
        
        for (const [url, textureData] of this.textureCache) {
            const age = now - textureData.lastUsed;
            const shouldRemove = age > maxAge || 
                                (this.settings.aggressiveCleanup && textureData.refCount <= 0);
            
            if (shouldRemove) {
                toRemove.push(url);
            }
        }
        
        // Remove old textures
        for (const url of toRemove) {
            this.destroyTexture(url);
        }
        
        // Limit cache size
        if (this.textureCache.size > this.settings.maxTextureCache) {
            const excess = this.textureCache.size - this.settings.maxTextureCache;
            const sortedByAge = Array.from(this.textureCache.entries())
                .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
                .slice(0, excess);
            
            for (const [url] of sortedByAge) {
                this.destroyTexture(url);
            }
        }
    }
    
    /**
     * Process disposal queue
     */
    processDisposalQueue(now) {
        const delay = 5000; // 5 second delay before disposal
        const toProcess = [];
        
        for (let i = this.disposalQueue.length - 1; i >= 0; i--) {
            const item = this.disposalQueue[i];
            if (now - item.queuedAt > delay) {
                toProcess.push(item);
                this.disposalQueue.splice(i, 1);
            }
        }
        
        // Process disposals
        for (const item of toProcess) {
            if (item.type === 'texture') {
                this.destroyTexture(item.url);
            }
        }
    }
    
    /**
     * Destroy a texture completely
     */
    destroyTexture(url) {
        const textureData = this.textureCache.get(url);
        if (!textureData) return;
        
        try {
            if (textureData.texture && textureData.texture.destroy) {
                textureData.texture.destroy(true); // Destroy base texture too
            }
            
            this.memoryUsage.textures -= textureData.size;
            this.textureCache.delete(url);
            this.stats.texturesDestroyed++;
            this.stats.memoryCleared += textureData.size;
            
        } catch (error) {
            console.warn(`Error destroying texture ${url}:`, error);
        }
    }
    
    /**
     * Handle memory warning (mobile)
     */
    handleMemoryWarning() {
        console.warn('Memory warning received, performing emergency cleanup');
        this.performEmergencyCleanup();
    }
    
    /**
     * Perform emergency memory cleanup
     */
    performEmergencyCleanup() {
        // Aggressively clean up textures
        const oldAggressiveState = this.settings.aggressiveCleanup;
        this.settings.aggressiveCleanup = true;
        
        // Clean up all unused textures immediately
        const now = Date.now();
        this.cleanupTextures(now, 0); // No age threshold
        
        // Process all disposal queue items immediately
        for (const item of this.disposalQueue) {
            if (item.type === 'texture') {
                this.destroyTexture(item.url);
            }
        }
        this.disposalQueue = [];
        
        // Force native GC
        if (window.gc) {
            window.gc();
        }
        
        // Restore aggressive state after a delay
        setTimeout(() => {
            this.settings.aggressiveCleanup = oldAggressiveState;
        }, 10000);
        
        console.log('Emergency cleanup completed');
    }
    
    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        return {
            usage: { ...this.memoryUsage },
            stats: { ...this.stats },
            cache: {
                textures: this.textureCache.size,
                disposalQueue: this.disposalQueue.length
            },
            settings: { ...this.settings }
        };
    }
    
    /**
     * Optimize for mobile devices
     */
    optimizeForMobile() {
        this.settings.maxTextureCache = 20;
        this.settings.maxUnusedTime = 30000; // 30 seconds
        this.settings.gcInterval = 15000; // 15 seconds
        this.settings.maxMemoryMB = 50;
        this.settings.aggressiveCleanup = true;
        
        // Restart timer with new interval
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
        }
        this.gcTimer = setInterval(() => this.performGC(), this.settings.gcInterval);
        
        console.log('Memory manager optimized for mobile');
    }
    
    /**
     * Create memory pressure simulation for testing
     */
    simulateMemoryPressure() {
        this.settings.aggressiveCleanup = true;
        this.handleMemoryWarning();
    }
    
    /**
     * Export memory report
     */
    generateReport() {
        const stats = this.getMemoryStats();
        const report = {
            timestamp: new Date().toISOString(),
            memoryUsage: stats.usage,
            statistics: stats.stats,
            cache: stats.cache,
            textureDetails: [],
            recommendations: []
        };
        
        // Add texture details
        for (const [url, data] of this.textureCache) {
            report.textureDetails.push({
                url: url.substring(url.lastIndexOf('/') + 1), // filename only
                size: data.size,
                age: Date.now() - data.created,
                lastUsed: Date.now() - data.lastUsed,
                refCount: data.refCount
            });
        }
        
        // Generate recommendations
        if (stats.usage.textures > stats.settings.maxMemoryMB * 0.5) {
            report.recommendations.push('Consider reducing texture cache size or quality');
        }
        
        if (stats.cache.textures > stats.settings.maxTextureCache * 0.8) {
            report.recommendations.push('Texture cache is nearly full, consider cleanup');
        }
        
        if (stats.stats.gcRuns > 0 && stats.stats.texturesDestroyed / stats.stats.texturesCreated < 0.5) {
            report.recommendations.push('Low texture cleanup ratio, memory may be leaking');
        }
        
        return report;
    }
    
    /**
     * Destroy memory manager
     */
    destroy() {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
        }
        
        // Clean up all textures
        for (const [url] of this.textureCache) {
            this.destroyTexture(url);
        }
        
        this.textureCache.clear();
        this.disposalQueue = [];
        
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}

export default MemoryManager;