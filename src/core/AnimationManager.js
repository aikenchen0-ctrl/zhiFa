class AnimationManager {
    constructor(options = {}) {
        this.options = {
            targetFPS: 120,
            adaptiveFrameRate: true,
            maxFrameTime: 8.33,
            ...options
        };
        
        this.tasks = new Map();
        this.running = false;
        this.frameId = null;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.actualFPS = 0;
        this.frameTimeHistory = [];
        this.taskId = 0;
        
        this.bindMethods();
        this.setupPerformanceMonitoring();
    }

    bindMethods() {
        this.loop = this.loop.bind(this);
        this.throttledRaf = this.createThrottledRaf();
    }

    createThrottledRaf() {
        const targetInterval = 1000 / this.options.targetFPS;
        let lastTime = 0;
        
        return (callback) => {
            const now = performance.now();
            const elapsed = now - lastTime;
            
            if (elapsed >= targetInterval || !this.options.adaptiveFrameRate) {
                lastTime = now;
                return requestAnimationFrame(callback);
            } else {
                return setTimeout(() => {
                    requestAnimationFrame(callback);
                }, targetInterval - elapsed);
            }
        };
    }

    setupPerformanceMonitoring() {
        this.performanceObserver = {
            frameTimeHistory: [],
            maxHistorySize: 60,
            
            recordFrame(frameTime) {
                this.frameTimeHistory.push(frameTime);
                if (this.frameTimeHistory.length > this.maxHistorySize) {
                    this.frameTimeHistory.shift();
                }
            },
            
            getAverageFrameTime() {
                if (this.frameTimeHistory.length === 0) return 0;
                const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
                return sum / this.frameTimeHistory.length;
            },
            
            isPerformanceGood() {
                const avgFrameTime = this.getAverageFrameTime();
                return avgFrameTime < 10;
            }
        };
    }

    add(task, options = {}) {
        const id = ++this.taskId;
        const taskData = {
            id,
            fn: task,
            priority: options.priority || 'normal',
            persistent: options.persistent || false,
            throttle: options.throttle || false,
            lastRun: 0,
            throttleInterval: options.throttleInterval || 16.67,
            ...options
        };
        
        this.tasks.set(id, taskData);
        
        if (!this.running) {
            this.start();
        }
        
        return id;
    }

    remove(id) {
        return this.tasks.delete(id);
    }

    clear() {
        this.tasks.clear();
    }

    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        
        this.loop();
    }

    stop() {
        this.running = false;
        
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    loop() {
        if (!this.running) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        this.frameCount++;
        this.performanceObserver.recordFrame(deltaTime);
        
        if (this.frameCount % 60 === 0) {
            this.actualFPS = Math.round(1000 / this.performanceObserver.getAverageFrameTime());
        }
        
        this.executeTasks(currentTime, deltaTime);
        
        this.lastFrameTime = currentTime;
        
        if (this.tasks.size > 0 || this.hasPersistentTasks()) {
            this.frameId = this.throttledRaf(this.loop);
        } else {
            this.running = false;
        }
    }

    executeTasks(currentTime, deltaTime) {
        const tasksToRemove = [];
        const sortedTasks = this.getSortedTasks();
        
        for (const task of sortedTasks) {
            if (this.shouldSkipTask(task, currentTime)) {
                continue;
            }
            
            try {
                const startTime = performance.now();
                
                const result = task.fn(deltaTime, currentTime);
                
                const executionTime = performance.now() - startTime;
                
                if (executionTime > this.options.maxFrameTime) {
                    console.warn(`Task ${task.id} took ${executionTime.toFixed(2)}ms, consider optimization`);
                }
                
                task.lastRun = currentTime;
                
                if (result === false || (!task.persistent && !task.throttle)) {
                    tasksToRemove.push(task.id);
                }
                
            } catch (error) {
                console.error(`Animation task ${task.id} error:`, error);
                tasksToRemove.push(task.id);
            }
        }
        
        tasksToRemove.forEach(id => this.remove(id));
    }

    getSortedTasks() {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        
        return Array.from(this.tasks.values()).sort((a, b) => {
            return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        });
    }

    shouldSkipTask(task, currentTime) {
        if (task.throttle) {
            return currentTime - task.lastRun < task.throttleInterval;
        }
        return false;
    }

    hasPersistentTasks() {
        return Array.from(this.tasks.values()).some(task => task.persistent);
    }

    animate(element, properties, options = {}) {
        const duration = options.duration || 300;
        const easing = options.easing || this.easing.easeOutCubic;
        const startTime = performance.now();
        const startValues = {};
        
        Object.keys(properties).forEach(prop => {
            startValues[prop] = this.getComputedValue(element, prop);
        });
        
        return new Promise((resolve) => {
            const taskId = this.add((deltaTime, currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easing(progress);
                
                Object.keys(properties).forEach(prop => {
                    const startValue = startValues[prop];
                    const endValue = properties[prop];
                    const currentValue = startValue + (endValue - startValue) * easedProgress;
                    
                    this.setElementProperty(element, prop, currentValue);
                });
                
                if (progress >= 1) {
                    resolve();
                    return false;
                }
                
                return true;
            }, { priority: 'high' });
        });
    }

    getComputedValue(element, property) {
        const style = getComputedStyle(element);
        const value = style.getPropertyValue(property);
        return parseFloat(value) || 0;
    }

    setElementProperty(element, property, value) {
        if (property.includes('transform')) {
            element.style.transform = value;
        } else {
            element.style[property] = typeof value === 'number' ? `${value}px` : value;
        }
    }

    easing = {
        linear: (t) => t,
        easeInQuad: (t) => t * t,
        easeOutQuad: (t) => t * (2 - t),
        easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: (t) => t * t * t,
        easeOutCubic: (t) => (--t) * t * t + 1,
        easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeInQuart: (t) => t * t * t * t,
        easeOutQuart: (t) => 1 - (--t) * t * t * t,
        easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
    };

    getPerformanceStats() {
        return {
            actualFPS: this.actualFPS,
            targetFPS: this.options.targetFPS,
            averageFrameTime: this.performanceObserver.getAverageFrameTime(),
            isPerformanceGood: this.performanceObserver.isPerformanceGood(),
            activeTasks: this.tasks.size,
            frameCount: this.frameCount
        };
    }

    adaptToPerformance() {
        const stats = this.getPerformanceStats();
        
        if (!stats.isPerformanceGood && this.options.adaptiveFrameRate) {
            this.options.targetFPS = Math.max(60, this.options.targetFPS - 10);
            this.throttledRaf = this.createThrottledRaf();
            console.log(`Reduced target FPS to ${this.options.targetFPS} due to performance`);
        } else if (stats.isPerformanceGood && this.options.targetFPS < 120) {
            this.options.targetFPS = Math.min(120, this.options.targetFPS + 10);
            this.throttledRaf = this.createThrottledRaf();
            console.log(`Increased target FPS to ${this.options.targetFPS}`);
        }
    }

    destroy() {
        this.stop();
        this.clear();
        this.tasks = null;
        this.performanceObserver = null;
    }
}

export default AnimationManager;