/**
 * AnimationPerformanceMonitor - Performance monitoring and optimization for AnimationSystem
 * Provides detailed metrics, memory tracking, and performance suggestions
 */

export class AnimationPerformanceMonitor {
    constructor(animationSystem, options = {}) {
        this.animationSystem = animationSystem;
        this.config = {
            monitoringInterval: 1000,
            maxHistoryLength: 60,
            alertThresholds: {
                fps: 45,
                frameTime: 20,
                memoryUsage: 100,
                animationCount: 200
            },
            enableAlerts: true,
            enableProfiling: false,
            ...options
        };

        this.metrics = {
            performance: {
                fps: [],
                frameTime: [],
                renderTime: [],
                updateTime: []
            },
            memory: {
                heapUsed: [],
                heapTotal: [],
                objectsPooled: [],
                animationsActive: []
            },
            animations: {
                totalCreated: 0,
                totalCompleted: 0,
                averageDuration: 0,
                typeBreakdown: new Map()
            },
            system: {
                devicePixelRatio: window.devicePixelRatio || 1,
                userAgent: navigator.userAgent,
                hardwareConcurrency: navigator.hardwareConcurrency || 1,
                startTime: performance.now()
            }
        };

        this.alerts = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        this.logger = this.createLogger();
    }

    /**
     * Start performance monitoring
     */
    start() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.logger.info('Starting performance monitoring...');

        // Setup monitoring interval
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.analyzePerformance();
            this.cleanupHistory();
        }, this.config.monitoringInterval);

        // Setup frame-level monitoring
        this.setupFrameMonitoring();
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.logger.info('Performance monitoring stopped');
    }

    /**
     * Setup frame-level performance monitoring
     */
    setupFrameMonitoring() {
        if (!this.animationSystem.app.ticker) return;

        let lastFrameTime = performance.now();
        let frameCount = 0;
        let totalFrameTime = 0;

        this.animationSystem.app.ticker.add(() => {
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            
            frameCount++;
            totalFrameTime += frameTime;

            // Sample every 60 frames for performance
            if (frameCount >= 60) {
                const avgFrameTime = totalFrameTime / frameCount;
                this.addMetric('performance.frameTime', avgFrameTime);
                
                frameCount = 0;
                totalFrameTime = 0;
            }

            lastFrameTime = currentTime;
        });
    }

    /**
     * Collect performance metrics
     */
    collectMetrics() {
        try {
            // FPS calculation
            const animationMetrics = this.animationSystem.getPerformanceMetrics();
            this.addMetric('performance.fps', animationMetrics.fps);

            // Memory metrics
            if (performance.memory) {
                this.addMetric('memory.heapUsed', performance.memory.usedJSHeapSize / 1024 / 1024);
                this.addMetric('memory.heapTotal', performance.memory.totalJSHeapSize / 1024 / 1024);
            }

            // Animation metrics
            this.addMetric('memory.animationsActive', animationMetrics.animationsActive);
            
            if (this.animationSystem.objectPool) {
                const poolStats = this.animationSystem.objectPool.getStats();
                this.addMetric('memory.objectsPooled', poolStats.global.created - poolStats.global.destroyed);
            }

            // PIXI renderer metrics
            if (this.animationSystem.app.renderer.gl) {
                const gl = this.animationSystem.app.renderer.gl;
                // GPU memory usage (approximation)
                this.metrics.system.gpuMemoryUsage = this.estimateGPUMemoryUsage();
            }

        } catch (error) {
            this.logger.error('Error collecting metrics', error);
        }
    }

    /**
     * Add metric to history
     */
    addMetric(path, value) {
        const keys = path.split('.');
        let current = this.metrics;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        if (!Array.isArray(current[lastKey])) {
            current[lastKey] = [];
        }
        
        current[lastKey].push({
            value,
            timestamp: performance.now()
        });
    }

    /**
     * Analyze performance and generate alerts
     */
    analyzePerformance() {
        if (!this.config.enableAlerts) return;

        // FPS analysis
        const recentFPS = this.getRecentValues('performance.fps', 5);
        if (recentFPS.length > 0) {
            const avgFPS = recentFPS.reduce((sum, val) => sum + val, 0) / recentFPS.length;
            if (avgFPS < this.config.alertThresholds.fps) {
                this.addAlert('LOW_FPS', `Average FPS (${avgFPS.toFixed(1)}) below threshold (${this.config.alertThresholds.fps})`, 'warning');
            }
        }

        // Frame time analysis
        const recentFrameTime = this.getRecentValues('performance.frameTime', 5);
        if (recentFrameTime.length > 0) {
            const avgFrameTime = recentFrameTime.reduce((sum, val) => sum + val, 0) / recentFrameTime.length;
            if (avgFrameTime > this.config.alertThresholds.frameTime) {
                this.addAlert('HIGH_FRAME_TIME', `Average frame time (${avgFrameTime.toFixed(1)}ms) above threshold (${this.config.alertThresholds.frameTime}ms)`, 'warning');
            }
        }

        // Memory usage analysis
        const recentMemory = this.getRecentValues('memory.heapUsed', 3);
        if (recentMemory.length > 0) {
            const avgMemory = recentMemory.reduce((sum, val) => sum + val, 0) / recentMemory.length;
            if (avgMemory > this.config.alertThresholds.memoryUsage) {
                this.addAlert('HIGH_MEMORY', `Memory usage (${avgMemory.toFixed(1)}MB) above threshold (${this.config.alertThresholds.memoryUsage}MB)`, 'error');
            }
        }

        // Animation count analysis
        const recentAnimations = this.getRecentValues('memory.animationsActive', 3);
        if (recentAnimations.length > 0) {
            const avgAnimations = recentAnimations.reduce((sum, val) => sum + val, 0) / recentAnimations.length;
            if (avgAnimations > this.config.alertThresholds.animationCount) {
                this.addAlert('HIGH_ANIMATION_COUNT', `Active animations (${avgAnimations.toFixed(0)}) above threshold (${this.config.alertThresholds.animationCount})`, 'warning');
            }
        }
    }

    /**
     * Get recent metric values
     */
    getRecentValues(path, count = 5) {
        const keys = path.split('.');
        let current = this.metrics;
        
        for (const key of keys) {
            if (!current[key]) return [];
            current = current[key];
        }
        
        if (!Array.isArray(current)) return [];
        
        return current
            .slice(-count)
            .map(item => item.value);
    }

    /**
     * Add performance alert
     */
    addAlert(type, message, severity = 'info') {
        const alert = {
            type,
            message,
            severity,
            timestamp: performance.now(),
            id: Date.now() + Math.random()
        };

        this.alerts.push(alert);
        
        // Limit alert history
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(-25);
        }

        this.logger[severity](`Performance Alert: ${message}`);
        
        // Trigger automatic optimizations for critical alerts
        if (severity === 'error') {
            this.triggerAutoOptimization(type);
        }
    }

    /**
     * Trigger automatic performance optimizations
     */
    triggerAutoOptimization(alertType) {
        this.logger.info(`Triggering auto-optimization for ${alertType}`);

        switch (alertType) {
            case 'HIGH_MEMORY':
                // Force memory cleanup
                if (this.animationSystem.performanceOptimizer) {
                    this.animationSystem.performanceOptimizer.performMemoryCleanup();
                }
                
                // Reduce object pool sizes
                if (this.animationSystem.objectPool) {
                    this.animationSystem.objectPool.cleanup();
                }
                break;

            case 'LOW_FPS':
                // Reduce rendering quality
                if (this.animationSystem.app.renderer.resolution > 0.5) {
                    this.animationSystem.app.renderer.resolution *= 0.9;
                    this.logger.info('Reduced rendering resolution for performance');
                }
                
                // Enable frame skipping
                this.animationSystem.config.performanceConfig.frameSkipping = true;
                break;

            case 'HIGH_ANIMATION_COUNT':
                // Cancel low-priority animations
                this.cancelLowPriorityAnimations();
                break;
        }
    }

    /**
     * Cancel low-priority animations to improve performance
     */
    cancelLowPriorityAnimations() {
        let cancelCount = 0;
        
        for (const [id, animation] of this.animationSystem.animations) {
            if (animation.priority === 'low' && cancelCount < 10) {
                this.animationSystem.cancelAnimation(id);
                cancelCount++;
            }
        }
        
        if (cancelCount > 0) {
            this.logger.info(`Cancelled ${cancelCount} low-priority animations for performance`);
        }
    }

    /**
     * Estimate GPU memory usage
     */
    estimateGPUMemoryUsage() {
        // This is an approximation based on textures and render targets
        let estimatedUsage = 0;
        
        // Count PIXI textures in cache
        if (PIXI.utils && PIXI.utils.TextureCache) {
            const textureCache = PIXI.utils.TextureCache;
            for (const key in textureCache) {
                const texture = textureCache[key];
                if (texture && texture.baseTexture) {
                    const width = texture.baseTexture.width || 1;
                    const height = texture.baseTexture.height || 1;
                    const bpp = 4; // Assume RGBA
                    estimatedUsage += width * height * bpp;
                }
            }
        }
        
        return Math.round(estimatedUsage / 1024 / 1024); // Convert to MB
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: performance.now() - this.metrics.system.startTime,
            summary: this.generateSummary(),
            metrics: this.getMetricsSummary(),
            alerts: this.getRecentAlerts(10),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * Generate performance summary
     */
    generateSummary() {
        const recentFPS = this.getRecentValues('performance.fps', 10);
        const recentMemory = this.getRecentValues('memory.heapUsed', 10);
        const recentAnimations = this.getRecentValues('memory.animationsActive', 10);

        return {
            averageFPS: recentFPS.length > 0 ? 
                recentFPS.reduce((sum, val) => sum + val, 0) / recentFPS.length : 0,
            averageMemoryUsage: recentMemory.length > 0 ? 
                recentMemory.reduce((sum, val) => sum + val, 0) / recentMemory.length : 0,
            averageAnimationCount: recentAnimations.length > 0 ? 
                recentAnimations.reduce((sum, val) => sum + val, 0) / recentAnimations.length : 0,
            totalAlerts: this.alerts.length,
            criticalAlerts: this.alerts.filter(alert => alert.severity === 'error').length
        };
    }

    /**
     * Get metrics summary
     */
    getMetricsSummary() {
        return {
            performance: {
                fps: this.summarizeMetric(this.metrics.performance.fps),
                frameTime: this.summarizeMetric(this.metrics.performance.frameTime)
            },
            memory: {
                heapUsed: this.summarizeMetric(this.metrics.memory.heapUsed),
                animationsActive: this.summarizeMetric(this.metrics.memory.animationsActive)
            }
        };
    }

    /**
     * Summarize a metric array
     */
    summarizeMetric(metricArray) {
        if (!metricArray || metricArray.length === 0) {
            return { min: 0, max: 0, avg: 0, current: 0 };
        }

        const values = metricArray.map(item => item.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const current = values[values.length - 1];

        return { min, max, avg, current };
    }

    /**
     * Get recent alerts
     */
    getRecentAlerts(count = 10) {
        return this.alerts
            .slice(-count)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const summary = this.generateSummary();

        if (summary.averageFPS < 50) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Consider reducing animation complexity or enabling frame skipping',
                action: 'enableFrameSkipping'
            });
        }

        if (summary.averageMemoryUsage > 80) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: 'Memory usage is high, consider more frequent cleanup',
                action: 'increaseCleanupFrequency'
            });
        }

        if (summary.averageAnimationCount > 100) {
            recommendations.push({
                type: 'optimization',
                priority: 'medium',
                message: 'High animation count detected, consider animation batching',
                action: 'enableAnimationBatching'
            });
        }

        return recommendations;
    }

    /**
     * Clean up old metric history
     */
    cleanupHistory() {
        const maxLength = this.config.maxHistoryLength;
        
        // Clean up performance metrics
        Object.values(this.metrics.performance).forEach(metricArray => {
            if (Array.isArray(metricArray) && metricArray.length > maxLength) {
                metricArray.splice(0, metricArray.length - maxLength);
            }
        });

        // Clean up memory metrics
        Object.values(this.metrics.memory).forEach(metricArray => {
            if (Array.isArray(metricArray) && metricArray.length > maxLength) {
                metricArray.splice(0, metricArray.length - maxLength);
            }
        });
    }

    /**
     * Export metrics to JSON
     */
    exportMetrics() {
        return JSON.stringify(this.generateReport(), null, 2);
    }

    /**
     * Create logger
     */
    createLogger() {
        const prefix = '[AnimationPerformanceMonitor]';
        return {
            debug: (msg, data) => console.debug(`${prefix} ${msg}`, data || ''),
            info: (msg, data) => console.info(`${prefix} ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`${prefix} ${msg}`, data || ''),
            error: (msg, error) => console.error(`${prefix} ${msg}`, error)
        };
    }

    /**
     * Destroy the monitor
     */
    destroy() {
        this.stop();
        this.alerts = [];
        this.metrics = null;
        this.logger.info('Performance monitor destroyed');
    }
}

export default AnimationPerformanceMonitor;