/**
 * ObjectPool - Advanced object pooling system for PixiJS v8
 * Reduces garbage collection by reusing sprites, graphics, and containers
 */

class ObjectPool {
    constructor() {
        this.pools = new Map();
        this.activeObjects = new Map();
        this.stats = {
            created: 0,
            reused: 0,
            destroyed: 0,
            maxPoolSize: 100,
            cleanupThreshold: 200
        };
        
        // Auto-cleanup timer
        this.cleanupInterval = setInterval(() => this.cleanup(), 30000); // 30 seconds
    }
    
    /**
     * Register a new pool for a specific object type
     */
    registerPool(type, factory, resetFunction, maxSize = 100) {
        this.pools.set(type, {
            objects: [],
            factory: factory,
            reset: resetFunction,
            maxSize: maxSize,
            created: 0,
            reused: 0
        });
    }
    
    /**
     * Get an object from the pool or create a new one
     */
    get(type) {
        const pool = this.pools.get(type);
        if (!pool) {
            console.warn(`Object pool type '${type}' not registered`);
            return null;
        }
        
        let obj;
        
        if (pool.objects.length > 0) {
            // Reuse from pool
            obj = pool.objects.pop();
            pool.reused++;
            this.stats.reused++;
        } else {
            // Create new object
            obj = pool.factory();
            pool.created++;
            this.stats.created++;
        }
        
        // Track active object
        this.activeObjects.set(obj, type);
        
        // Reset object state
        if (pool.reset) {
            pool.reset(obj);
        }
        
        return obj;
    }
    
    /**
     * Return an object to the pool
     */
    release(obj) {
        const type = this.activeObjects.get(obj);
        if (!type) {
            console.warn('Attempting to release object not from pool');
            return false;
        }
        
        const pool = this.pools.get(type);
        if (!pool) return false;
        
        // Remove from active tracking
        this.activeObjects.delete(obj);
        
        // Return to pool if not full
        if (pool.objects.length < pool.maxSize) {
            // Clean up object state
            this.cleanupObject(obj, type);
            pool.objects.push(obj);
        } else {
            // Destroy if pool is full
            this.destroyObject(obj, type);
            this.stats.destroyed++;
        }
        
        return true;
    }
    
    /**
     * Clean up object state before returning to pool
     */
    cleanupObject(obj, type) {
        // Common cleanup for PixiJS objects
        if (obj.parent) {
            obj.parent.removeChild(obj);
        }
        
        // Reset common properties
        if (obj.position) {
            obj.position.set(0, 0);
        }
        if (obj.scale) {
            obj.scale.set(1, 1);
        }
        if (obj.rotation !== undefined) {
            obj.rotation = 0;
        }
        if (obj.alpha !== undefined) {
            obj.alpha = 1;
        }
        if (obj.visible !== undefined) {
            obj.visible = true;
        }
        if (obj.tint !== undefined) {
            obj.tint = 0xFFFFFF;
        }
        
        // Type-specific cleanup
        switch (type) {
            case 'sprite':
                if (obj.texture) {
                    obj.texture = null;
                }
                break;
            case 'graphics':
                if (obj.clear) {
                    obj.clear();
                }
                break;
            case 'container':
                if (obj.removeChildren) {
                    obj.removeChildren();
                }
                break;
            case 'text':
                if (obj.text !== undefined) {
                    obj.text = '';
                }
                break;
        }
        
        // Remove event listeners
        if (obj.removeAllListeners) {
            obj.removeAllListeners();
        }
    }
    
    /**
     * Destroy object completely
     */
    destroyObject(obj, type) {
        this.cleanupObject(obj, type);
        
        if (obj.destroy) {
            obj.destroy({ children: true, texture: false, baseTexture: false });
        }
    }
    
    /**
     * Periodic cleanup of oversized pools
     */
    cleanup() {
        for (const [type, pool] of this.pools) {
            if (pool.objects.length > this.stats.cleanupThreshold) {
                const excess = pool.objects.length - pool.maxSize;
                const toDestroy = pool.objects.splice(0, excess);
                
                for (const obj of toDestroy) {
                    this.destroyObject(obj, type);
                    this.stats.destroyed++;
                }
                
                console.log(`Cleaned up ${excess} objects from ${type} pool`);
            }
        }
    }
    
    /**
     * Get pool statistics
     */
    getStats() {
        const poolStats = {};
        for (const [type, pool] of this.pools) {
            poolStats[type] = {
                pooled: pool.objects.length,
                created: pool.created,
                reused: pool.reused,
                efficiency: pool.reused / (pool.created + pool.reused) || 0
            };
        }
        
        return {
            global: { ...this.stats },
            pools: poolStats,
            active: this.activeObjects.size
        };
    }
    
    /**
     * Get total objects in all pools
     */
    getTotalPooled() {
        let total = 0;
        for (const [_, pool] of this.pools) {
            total += pool.objects.length;
        }
        return total;
    }
    
    /**
     * Get total active objects
     */
    getTotalActive() {
        return this.activeObjects.size;
    }
    
    /**
     * Clear all pools
     */
    clear() {
        for (const [type, pool] of this.pools) {
            for (const obj of pool.objects) {
                this.destroyObject(obj, type);
            }
            pool.objects.length = 0;
        }
        
        // Clear active objects
        for (const [obj, type] of this.activeObjects) {
            this.destroyObject(obj, type);
        }
        this.activeObjects.clear();
    }
    
    /**
     * Destroy the object pool
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.clear();
        this.pools.clear();
    }
}

/**
 * Pre-configured object pools for common PixiJS objects
 */
class PixiObjectPool extends ObjectPool {
    constructor() {
        super();
        this.setupDefaultPools();
    }
    
    setupDefaultPools() {
        const { Sprite, Graphics, Container, Text } = globalThis.PIXI || {};
        
        if (!Sprite) {
            console.warn('PIXI not available, object pools will not be initialized');
            return;
        }
        
        // Sprite pool
        this.registerPool('sprite', 
            () => new Sprite(),
            (sprite) => {
                sprite.anchor.set(0.5);
                sprite.texture = Sprite.EMPTY.texture;
            },
            200
        );
        
        // Graphics pool
        this.registerPool('graphics',
            () => new Graphics(),
            (graphics) => {
                graphics.clear();
            },
            50
        );
        
        // Container pool
        this.registerPool('container',
            () => new Container(),
            (container) => {
                container.removeChildren();
            },
            100
        );
        
        // Text pool
        this.registerPool('text',
            () => new Text(''),
            (text) => {
                text.text = '';
                text.style = {};
            },
            50
        );
        
        // Avatar-specific pool (specialized sprite)
        this.registerPool('avatar',
            () => {
                const sprite = new Sprite();
                sprite.anchor.set(0.5);
                sprite.interactive = true;
                sprite.buttonMode = true;
                return sprite;
            },
            (avatar) => {
                avatar.texture = Sprite.EMPTY.texture;
                avatar.scale.set(1);
                avatar.removeAllListeners();
            },
            1000 // Large pool for avatars
        );
        
        // Bubble-specific pool (container with graphics)
        this.registerPool('bubble',
            () => {
                const container = new Container();
                const background = new Graphics();
                const text = new Text('');
                
                container.addChild(background);
                container.addChild(text);
                container._background = background;
                container._text = text;
                
                return container;
            },
            (bubble) => {
                bubble._background.clear();
                bubble._text.text = '';
                bubble.removeAllListeners();
            },
            500 // Large pool for bubbles
        );
        
        // Connection line pool (graphics)
        this.registerPool('connection',
            () => new Graphics(),
            (line) => {
                line.clear();
                line.alpha = 1;
            },
            200
        );
    }
    
    /**
     * Convenience methods for common objects
     */
    getAvatar(texture) {
        const avatar = this.get('avatar');
        if (texture && avatar) {
            avatar.texture = texture;
        }
        return avatar;
    }
    
    getBubble(text, style) {
        const bubble = this.get('bubble');
        if (bubble && text) {
            bubble._text.text = text;
            if (style) {
                bubble._text.style = style;
            }
        }
        return bubble;
    }
    
    getConnection() {
        return this.get('connection');
    }
    
    /**
     * Batch operations for performance
     */
    releaseBatch(objects) {
        for (const obj of objects) {
            this.release(obj);
        }
    }
    
    /**
     * Pre-warm pools with a certain number of objects
     */
    preWarm(type, count) {
        const objects = [];
        for (let i = 0; i < count; i++) {
            objects.push(this.get(type));
        }
        
        // Return all to pool
        for (const obj of objects) {
            this.release(obj);
        }
    }
    
    /**
     * Pre-warm all pools for mobile optimization
     */
    preWarmForMobile() {
        this.preWarm('sprite', 50);
        this.preWarm('avatar', 100);
        this.preWarm('bubble', 50);
        this.preWarm('connection', 20);
        this.preWarm('graphics', 20);
        this.preWarm('container', 30);
        
        console.log('Object pools pre-warmed for mobile');
    }
}

export default ObjectPool;
export { PixiObjectPool };