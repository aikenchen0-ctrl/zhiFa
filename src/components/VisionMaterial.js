/**
 * VisionMaterial Component - PixiJS v8 Vision UI Material System
 * Features: Semi-transparent glass (self-sent), fully transparent glass (others), blur effects, text shadows
 */

import * as PIXI from 'pixi.js';

export class VisionMaterial extends PIXI.Container {
    constructor() {
        super();
        
        // Material presets
        this.materials = {
            GLASS_SEMI: 'glass_semi',
            GLASS_FULL: 'glass_full', 
            BLUR_LIGHT: 'blur_light',
            BLUR_HEAVY: 'blur_heavy',
            SHADOW_TEXT: 'shadow_text',
            SHADOW_CONTAINER: 'shadow_container'
        };
        
        // Cache for created materials
        this.materialCache = new Map();
        
        console.log('[VisionMaterial] Vision UI material system initialized');
        
        this.init();
    }
    
    init() {
        try {
            this.setupFilters();
            this.createMaterialPresets();
            
            console.log('[VisionMaterial] Material system setup complete');
        } catch (error) {
            console.error('[VisionMaterial] Failed to initialize material system:', error);
            throw error;
        }
    }
    
    setupFilters() {
        // Create commonly used filters
        this.filters = {
            blur: {
                light: new PIXI.BlurFilter({ strength: 2, quality: 4 }),
                medium: new PIXI.BlurFilter({ strength: 4, quality: 4 }),
                heavy: new PIXI.BlurFilter({ strength: 8, quality: 4 })
            },
            glow: {
                subtle: new PIXI.GlowFilter({ distance: 5, outerStrength: 0.5, color: 0xFFFFFF }),
                normal: new PIXI.GlowFilter({ distance: 10, outerStrength: 1, color: 0xFFFFFF }),
                strong: new PIXI.GlowFilter({ distance: 15, outerStrength: 2, color: 0xFFFFFF })
            }
        };
        
        console.log('[VisionMaterial] Filters initialized');
    }
    
    createMaterialPresets() {
        // Define material configurations
        this.presets = {
            [this.materials.GLASS_SEMI]: {
                fill: { color: 0xFFFFFF, alpha: 0.7 },
                stroke: { color: 0xFFFFFF, width: 1, alpha: 0.3 },
                blur: this.filters.blur.light,
                shadow: true,
                description: 'Semi-transparent glass for self-sent messages'
            },
            [this.materials.GLASS_FULL]: {
                fill: { color: 0xFFFFFF, alpha: 0.15 },
                stroke: { color: 0xFFFFFF, width: 1, alpha: 0.2 },
                blur: this.filters.blur.medium,
                shadow: false,
                description: 'Fully transparent glass for received messages'
            },
            [this.materials.BLUR_LIGHT]: {
                fill: { color: 0x000000, alpha: 0.05 },
                stroke: null,
                blur: this.filters.blur.light,
                shadow: false,
                description: 'Light background blur effect'
            },
            [this.materials.BLUR_HEAVY]: {
                fill: { color: 0x000000, alpha: 0.1 },
                stroke: null,
                blur: this.filters.blur.heavy,
                shadow: false,
                description: 'Heavy background blur effect'
            },
            [this.materials.SHADOW_TEXT]: {
                shadow: {
                    color: 0x000000,
                    alpha: 0.3,
                    blur: 4,
                    distance: 2,
                    angle: Math.PI / 4
                },
                description: 'Text shadow configuration'
            },
            [this.materials.SHADOW_CONTAINER]: {
                shadow: {
                    color: 0x000000,
                    alpha: 0.2,
                    blur: 8,
                    distance: 4,
                    angle: Math.PI / 4
                },
                description: 'Container shadow configuration'
            }
        };
        
        console.log('[VisionMaterial] Material presets created:', Object.keys(this.presets).length);
    }
    
    /**
     * Create a glass material container
     * @param {string} type - Material type (GLASS_SEMI or GLASS_FULL)
     * @param {number} width - Container width
     * @param {number} height - Container height
     * @param {number} radius - Border radius
     * @param {Object} options - Additional options
     */
    createGlassMaterial(type, width, height, radius = 12, options = {}) {
        const cacheKey = `${type}_${width}_${height}_${radius}_${JSON.stringify(options)}`;
        
        if (this.materialCache.has(cacheKey)) {
            console.log('[VisionMaterial] Using cached glass material:', type);
            return this.materialCache.get(cacheKey).clone();
        }
        
        try {
            const container = new PIXI.Container();
            const preset = this.presets[type];
            
            if (!preset) {
                throw new Error(`Unknown material type: ${type}`);
            }
            
            // Main glass background
            const background = new PIXI.Graphics();
            
            // Apply rounded rectangle shape
            background.roundRect(0, 0, width, height, radius);
            
            // Apply fill
            if (preset.fill) {
                background.fill({
                    color: options.fillColor || preset.fill.color,
                    alpha: options.fillAlpha !== undefined ? options.fillAlpha : preset.fill.alpha
                });
            }
            
            // Apply stroke
            if (preset.stroke) {
                background.stroke({
                    color: options.strokeColor || preset.stroke.color,
                    width: options.strokeWidth || preset.stroke.width,
                    alpha: options.strokeAlpha !== undefined ? options.strokeAlpha : preset.stroke.alpha
                });
            }
            
            container.addChild(background);
            
            // Apply blur filter
            if (preset.blur && options.blur !== false) {
                const blurFilter = options.blurStrength 
                    ? new PIXI.BlurFilter({ strength: options.blurStrength, quality: 4 })
                    : preset.blur;
                container.filters = [blurFilter];
            }
            
            // Add subtle glow for glass effect
            if (options.glow) {
                const glowFilter = this.filters.glow.subtle;
                container.filters = container.filters ? [...container.filters, glowFilter] : [glowFilter];
            }
            
            // Apply shadow
            if (preset.shadow && options.shadow !== false) {
                this.applyShadow(container, this.presets[this.materials.SHADOW_CONTAINER].shadow);
            }
            
            // Cache the material
            this.materialCache.set(cacheKey, container);
            
            console.log(`[VisionMaterial] Created glass material: ${type}`, { width, height, radius });
            
            return container.clone();
        } catch (error) {
            console.error(`[VisionMaterial] Failed to create glass material ${type}:`, error);
            throw error;
        }
    }
    
    /**
     * Apply text shadow styling
     * @param {PIXI.Text} textObject - Text object to apply shadow to
     * @param {Object} shadowOptions - Shadow configuration
     */
    applyTextShadow(textObject, shadowOptions = {}) {
        try {
            const shadowConfig = {
                ...this.presets[this.materials.SHADOW_TEXT].shadow,
                ...shadowOptions
            };
            
            // Create shadow text
            const shadowText = new PIXI.Text({
                text: textObject.text,
                style: {
                    ...textObject.style,
                    fill: shadowConfig.color,
                    alpha: shadowConfig.alpha
                }
            });
            
            // Position shadow
            const offsetX = Math.cos(shadowConfig.angle) * shadowConfig.distance;
            const offsetY = Math.sin(shadowConfig.angle) * shadowConfig.distance;
            
            shadowText.position.set(
                textObject.x + offsetX,
                textObject.y + offsetY
            );
            
            // Apply blur to shadow
            if (shadowConfig.blur > 0) {
                shadowText.filters = [new PIXI.BlurFilter({ strength: shadowConfig.blur })];
            }
            
            // Return container with shadow and text
            const container = new PIXI.Container();
            container.addChild(shadowText);
            container.addChild(textObject);
            
            console.log('[VisionMaterial] Applied text shadow');
            
            return container;
        } catch (error) {
            console.error('[VisionMaterial] Failed to apply text shadow:', error);
            throw error;
        }
    }
    
    /**
     * Apply container shadow
     * @param {PIXI.Container} container - Container to apply shadow to
     * @param {Object} shadowOptions - Shadow configuration
     */
    applyShadow(container, shadowOptions = {}) {
        try {
            const shadowConfig = {
                ...this.presets[this.materials.SHADOW_CONTAINER].shadow,
                ...shadowOptions
            };
            
            // Create drop shadow filter
            const dropShadowFilter = new PIXI.DropShadowFilter({
                color: shadowConfig.color,
                alpha: shadowConfig.alpha,
                blur: shadowConfig.blur,
                distance: shadowConfig.distance,
                angle: shadowConfig.angle
            });
            
            // Apply filter
            container.filters = container.filters 
                ? [...container.filters, dropShadowFilter]
                : [dropShadowFilter];
            
            console.log('[VisionMaterial] Applied container shadow');
        } catch (error) {
            console.error('[VisionMaterial] Failed to apply container shadow:', error);
            throw error;
        }
    }
    
    /**
     * Create a blurred background overlay
     * @param {number} width - Overlay width
     * @param {number} height - Overlay height
     * @param {string} intensity - Blur intensity (light/heavy)
     * @param {Object} options - Additional options
     */
    createBlurredBackground(width, height, intensity = 'light', options = {}) {
        const materialType = intensity === 'heavy' ? this.materials.BLUR_HEAVY : this.materials.BLUR_LIGHT;
        const cacheKey = `blur_${intensity}_${width}_${height}_${JSON.stringify(options)}`;
        
        if (this.materialCache.has(cacheKey)) {
            console.log('[VisionMaterial] Using cached blur background:', intensity);
            return this.materialCache.get(cacheKey).clone();
        }
        
        try {
            const container = new PIXI.Container();
            const preset = this.presets[materialType];
            
            // Background overlay
            const overlay = new PIXI.Graphics();
            overlay.rect(0, 0, width, height);
            overlay.fill({
                color: options.color || preset.fill.color,
                alpha: options.alpha !== undefined ? options.alpha : preset.fill.alpha
            });
            
            container.addChild(overlay);
            
            // Apply blur filter
            if (preset.blur) {
                container.filters = [preset.blur];
            }
            
            // Cache the background
            this.materialCache.set(cacheKey, container);
            
            console.log(`[VisionMaterial] Created blurred background: ${intensity}`, { width, height });
            
            return container.clone();
        } catch (error) {
            console.error(`[VisionMaterial] Failed to create blurred background ${intensity}:`, error);
            throw error;
        }
    }
    
    /**
     * Create a frosted glass effect
     * @param {number} width - Glass width
     * @param {number} height - Glass height
     * @param {number} radius - Border radius
     * @param {Object} options - Customization options
     */
    createFrostedGlass(width, height, radius = 12, options = {}) {
        try {
            const container = new PIXI.Container();
            
            // Base glass layer
            const baseGlass = this.createGlassMaterial(
                this.materials.GLASS_SEMI, 
                width, 
                height, 
                radius,
                {
                    fillAlpha: 0.3,
                    ...options
                }
            );
            
            // Frost texture overlay
            const frostOverlay = new PIXI.Graphics();
            frostOverlay.roundRect(0, 0, width, height, radius);
            frostOverlay.fill({ color: 0xFFFFFF, alpha: 0.1 });
            
            // Add noise pattern for frosted effect
            const noiseTexture = this.createNoiseTexture(width, height);
            const noiseSprite = new PIXI.Sprite(noiseTexture);
            noiseSprite.alpha = 0.05;
            noiseSprite.blendMode = PIXI.BLEND_MODES.OVERLAY;
            
            // Create mask for rounded corners
            const mask = new PIXI.Graphics();
            mask.roundRect(0, 0, width, height, radius);
            mask.fill({ color: 0xFFFFFF });
            noiseSprite.mask = mask;
            
            container.addChild(baseGlass);
            container.addChild(frostOverlay);
            container.addChild(noiseSprite);
            container.addChild(mask);
            
            // Apply frosted glass filters
            const frostedFilters = [
                new PIXI.BlurFilter({ strength: 1 }),
                this.filters.glow.subtle
            ];
            container.filters = frostedFilters;
            
            console.log('[VisionMaterial] Created frosted glass effect', { width, height, radius });
            
            return container;
        } catch (error) {
            console.error('[VisionMaterial] Failed to create frosted glass:', error);
            throw error;
        }
    }
    
    /**
     * Create noise texture for frosted effect
     * @param {number} width - Texture width
     * @param {number} height - Texture height
     */
    createNoiseTexture(width, height) {
        try {
            // Create canvas for noise
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Generate noise pattern
            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const noise = Math.random() * 255;
                data[i] = noise;     // R
                data[i + 1] = noise; // G
                data[i + 2] = noise; // B
                data[i + 3] = 25;    // A (low alpha)
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to PIXI texture
            const texture = PIXI.Texture.from(canvas);
            
            console.log('[VisionMaterial] Created noise texture', { width, height });
            
            return texture;
        } catch (error) {
            console.error('[VisionMaterial] Failed to create noise texture:', error);
            return PIXI.Texture.EMPTY;
        }
    }
    
    /**
     * Get material preset configuration
     * @param {string} materialType - Material type
     */
    getMaterialConfig(materialType) {
        return this.presets[materialType] || null;
    }
    
    /**
     * Update material preset
     * @param {string} materialType - Material type to update
     * @param {Object} config - New configuration
     */
    updateMaterialPreset(materialType, config) {
        if (this.presets[materialType]) {
            this.presets[materialType] = { ...this.presets[materialType], ...config };
            
            // Clear cache for this material type
            this.clearMaterialCache(materialType);
            
            console.log(`[VisionMaterial] Updated material preset: ${materialType}`);
        } else {
            console.warn(`[VisionMaterial] Unknown material type: ${materialType}`);
        }
    }
    
    /**
     * Clear material cache for specific type or all
     * @param {string} materialType - Optional material type to clear
     */
    clearMaterialCache(materialType = null) {
        if (materialType) {
            // Clear specific material type from cache
            for (const [key] of this.materialCache) {
                if (key.startsWith(materialType)) {
                    this.materialCache.delete(key);
                }
            }
            console.log(`[VisionMaterial] Cleared cache for material type: ${materialType}`);
        } else {
            // Clear all cache
            this.materialCache.clear();
            console.log('[VisionMaterial] Cleared all material cache');
        }
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.materialCache.size,
            keys: Array.from(this.materialCache.keys()),
            memoryUsage: this.materialCache.size * 1024 // Rough estimate
        };
    }
    
    destroy() {
        try {
            // Clear cache
            this.clearMaterialCache();
            
            // Destroy filters
            Object.values(this.filters).forEach(filterGroup => {
                Object.values(filterGroup).forEach(filter => {
                    if (filter.destroy) {
                        filter.destroy();
                    }
                });
            });
            
            super.destroy();
            
            console.log('[VisionMaterial] Material system destroyed');
        } catch (error) {
            console.error('[VisionMaterial] Error during destruction:', error);
        }
    }
}

// Static helper methods
export const MaterialHelpers = {
    /**
     * Create a simple glass container with preset
     * @param {string} type - Material type
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} radius - Border radius
     */
    createQuickGlass(type, width, height, radius = 12) {
        const material = new VisionMaterial();
        return material.createGlassMaterial(type, width, height, radius);
    },
    
    /**
     * Apply Vision UI styling to existing container
     * @param {PIXI.Container} container - Container to style
     * @param {string} materialType - Material type to apply
     */
    applyVisionStyling(container, materialType) {
        const material = new VisionMaterial();
        const config = material.getMaterialConfig(materialType);
        
        if (config && config.shadow) {
            material.applyShadow(container, config.shadow);
        }
        
        if (config && config.blur) {
            container.filters = container.filters 
                ? [...container.filters, config.blur]
                : [config.blur];
        }
        
        return container;
    }
};

export default VisionMaterial;