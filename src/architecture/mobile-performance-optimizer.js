/**
 * Mobile Performance Optimizer - 移动端性能优化器
 * 专门针对移动设备的三容器连接线系统性能优化
 * 
 * 核心优化策略：
 * 1. 120Hz高刷新率设备适配
 * 2. 触摸滚动性能优化
 * 3. 内存压力管理
 * 4. 电池优化和CPU节能
 * 5. 网络和资源优化
 * 6. 设备特征检测和自适应
 */

import { systemState } from './data-structures.js';

export class MobilePerformanceOptimizer {
    constructor() {
        // 设备特征检测
        this.deviceCapabilities = {
            isMobile: false,
            isTablet: false,
            refreshRate: 60,             // 显示刷新率
            supportedFrameRate: 60,      // 支持的帧率
            memoryLimit: 1024,           // 内存限制(MB)
            cpuCores: 1,                 // CPU核心数
            supportsTouch: false,        // 触摸支持
            supportsHardwareAcceleration: false, // 硬件加速
            batteryAPI: false,           // 电池API支持
            connectionType: 'unknown'     // 网络类型
        };
        
        // 性能配置
        this.performanceConfig = {
            targetFPS: 60,               // 目标帧率
            adaptiveQuality: true,       // 自适应质量
            enableThrottling: true,      // 启用节流
            memoryThreshold: 0.7,        // 内存压力阈值
            batteryThreshold: 0.2,       // 电池电量阈值
            connectionAware: true,       // 网络感知
            backgroundOptimization: true  // 后台优化
        };
        
        // 质量等级配置
        this.qualityLevels = {
            ultra: {
                connectionLimit: 1000,
                animationDuration: 800,
                strokeWidth: 2,
                shadowBlur: 4,
                updateInterval: 8,     // 120fps
                visualEffects: true
            },
            high: {
                connectionLimit: 500,
                animationDuration: 600,
                strokeWidth: 2,
                shadowBlur: 2,
                updateInterval: 16,    // 60fps
                visualEffects: true
            },
            medium: {
                connectionLimit: 200,
                animationDuration: 400,
                strokeWidth: 1.5,
                shadowBlur: 0,
                updateInterval: 33,    // 30fps
                visualEffects: false
            },
            low: {
                connectionLimit: 50,
                animationDuration: 200,
                strokeWidth: 1,
                shadowBlur: 0,
                updateInterval: 50,    // 20fps
                visualEffects: false
            },
            minimal: {
                connectionLimit: 20,
                animationDuration: 0,
                strokeWidth: 0.5,
                shadowBlur: 0,
                updateInterval: 100,   // 10fps
                visualEffects: false
            }
        };
        
        // 当前状态
        this.currentQuality = 'high';
        this.currentFPS = 0;
        this.memoryPressure = 0;
        this.batteryLevel = 1;
        this.isBackgroundActive = true;
        
        // 性能监控
        this.performanceMetrics = {
            frameTime: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            batteryLevel: 1,
            connectionCount: 0,
            visibleElements: 0,
            touchLatency: 0
        };
        
        // 优化器状态
        this.isInitialized = false;
        this.isDestroyed = false;
        this.monitoringLoopId = null;
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 绑定方法上下文
        this.monitoringLoop = this.monitoringLoop.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBatteryChange = this.handleBatteryChange.bind(this);
        this.handleConnectionChange = this.handleConnectionChange.bind(this);
        this.handleMemoryPressure = this.handleMemoryPressure.bind(this);
    }

    /**
     * 初始化移动端性能优化器
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // 检测设备特征
            await this.detectDeviceCapabilities();
            
            // 配置性能参数
            this.configurePerformanceSettings();
            
            // 设置优化策略
            this.setupOptimizationStrategies();
            
            // 启动监控
            this.startPerformanceMonitoring();
            
            // 设置事件监听
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.emit('initialized', this.deviceCapabilities);
            
            console.log('Mobile Performance Optimizer initialized:', this.deviceCapabilities);
        } catch (error) {
            console.error('Failed to initialize Mobile Performance Optimizer:', error);
            throw error;
        }
    }

    /**
     * 检测设备特征
     */
    async detectDeviceCapabilities() {
        // 检测移动设备
        const userAgent = navigator.userAgent.toLowerCase();
        this.deviceCapabilities.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        this.deviceCapabilities.isTablet = /ipad|android(?=.*tablet)|tablet/i.test(userAgent);
        
        // 检测触摸支持
        this.deviceCapabilities.supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // 检测刷新率
        await this.detectRefreshRate();
        
        // 检测内存限制
        this.detectMemoryCapability();
        
        // 检测CPU核心数
        this.deviceCapabilities.cpuCores = navigator.hardwareConcurrency || 1;
        
        // 检测硬件加速
        this.deviceCapabilities.supportsHardwareAcceleration = this.detectHardwareAcceleration();
        
        // 检测电池API
        this.deviceCapabilities.batteryAPI = 'getBattery' in navigator;
        
        // 检测网络连接
        this.detectConnectionType();
        
        console.log('Device capabilities detected:', this.deviceCapabilities);
    }

    /**
     * 检测显示刷新率
     */
    async detectRefreshRate() {
        return new Promise((resolve) => {
            let frameCount = 0;
            let startTime = performance.now();
            
            const countFrames = () => {
                frameCount++;
                const elapsed = performance.now() - startTime;
                
                if (elapsed >= 1000) {
                    this.deviceCapabilities.refreshRate = Math.round(frameCount * (1000 / elapsed));
                    this.deviceCapabilities.supportedFrameRate = Math.min(this.deviceCapabilities.refreshRate, 120);
                    
                    console.log(`Detected refresh rate: ${this.deviceCapabilities.refreshRate}Hz`);
                    resolve();
                } else {
                    requestAnimationFrame(countFrames);
                }
            };
            
            requestAnimationFrame(countFrames);
        });
    }

    /**
     * 检测内存容量
     */
    detectMemoryCapability() {
        if ('memory' in performance) {
            // Chrome提供的内存信息
            const memInfo = performance.memory;
            this.deviceCapabilities.memoryLimit = Math.round(memInfo.jsHeapSizeLimit / (1024 * 1024));
        } else {
            // 根据设备类型估算
            if (this.deviceCapabilities.isMobile && !this.deviceCapabilities.isTablet) {
                this.deviceCapabilities.memoryLimit = 512; // 手机通常较少
            } else if (this.deviceCapabilities.isTablet) {
                this.deviceCapabilities.memoryLimit = 1024; // 平板中等
            } else {
                this.deviceCapabilities.memoryLimit = 2048; // 桌面较多
            }
        }
    }

    /**
     * 检测硬件加速
     */
    detectHardwareAcceleration() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    }

    /**
     * 检测网络连接类型
     */
    detectConnectionType() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.deviceCapabilities.connectionType = connection.effectiveType || connection.type || 'unknown';
        }
    }

    /**
     * 配置性能参数
     */
    configurePerformanceSettings() {
        // 根据设备特征调整目标帧率
        if (this.deviceCapabilities.supportedFrameRate >= 120) {
            this.performanceConfig.targetFPS = 120;
            this.currentQuality = 'ultra';
        } else if (this.deviceCapabilities.supportedFrameRate >= 90) {
            this.performanceConfig.targetFPS = 90;
            this.currentQuality = 'high';
        } else {
            this.performanceConfig.targetFPS = 60;
            this.currentQuality = this.deviceCapabilities.isMobile ? 'medium' : 'high';
        }
        
        // 根据内存限制调整
        if (this.deviceCapabilities.memoryLimit < 512) {
            this.currentQuality = 'low';
            this.performanceConfig.memoryThreshold = 0.5;
        } else if (this.deviceCapabilities.memoryLimit < 1024) {
            this.currentQuality = Math.min(this.currentQuality, 'medium');
            this.performanceConfig.memoryThreshold = 0.6;
        }
        
        // 根据网络连接调整
        if (this.deviceCapabilities.connectionType === 'slow-2g' || this.deviceCapabilities.connectionType === '2g') {
            this.currentQuality = 'minimal';
            this.performanceConfig.connectionAware = false;
        }
        
        console.log(`Performance configured for ${this.currentQuality} quality, target ${this.performanceConfig.targetFPS}fps`);
    }

    /**
     * 设置优化策略
     */
    setupOptimizationStrategies() {
        // CSS优化
        this.applyCSSOptimizations();
        
        // 触摸滚动优化
        this.setupTouchScrollOptimization();
        
        // 内存管理优化
        this.setupMemoryManagement();
        
        // 电池优化
        this.setupBatteryOptimization();
        
        // 网络优化
        this.setupNetworkOptimization();
    }

    /**
     * 应用CSS优化
     */
    applyCSSOptimizations() {
        const optimizationStyles = document.createElement('style');
        optimizationStyles.id = 'mobile-performance-optimizations';
        
        const quality = this.qualityLevels[this.currentQuality];
        
        optimizationStyles.textContent = `
            /* 移动端性能优化CSS */
            
            /* 硬件加速 */
            .chat-interface,
            .connection-overlay,
            .connection-svg,
            .message-bubble,
            .conversation-avatar,
            .account-avatar {
                will-change: transform;
                transform: translateZ(0);
                backface-visibility: hidden;
            }
            
            /* 高刷新率优化 */
            @media (min-resolution: 120dpi) {
                .connection-line {
                    stroke-width: ${quality.strokeWidth * 0.8}px;
                }
                
                .message-bubble,
                .conversation-avatar,
                .account-avatar {
                    transition-duration: ${quality.animationDuration * 0.8}ms;
                }
            }
            
            /* 内存压力优化 */
            .memory-pressure-high .connection-line {
                animation: none !important;
                transition: none !important;
                filter: none !important;
                ${quality.shadowBlur === 0 ? 'box-shadow: none !important;' : ''}
            }
            
            /* 低电量优化 */
            .battery-low .connection-animated {
                animation-duration: ${quality.animationDuration * 2}ms;
                animation-fill-mode: forwards;
            }
            
            .battery-low .connection-line {
                opacity: 0.6;
            }
            
            /* 触摸优化 */
            .touch-device .scroll-wrapper {
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
                overscroll-behavior: contain;
            }
            
            /* 连接数限制 */
            .connection-line:nth-child(n+${quality.connectionLimit + 1}) {
                display: none;
            }
            
            /* 低质量模式 */
            ${this.currentQuality === 'low' || this.currentQuality === 'minimal' ? `
                .connection-line {
                    stroke-dasharray: none !important;
                    animation: none !important;
                    filter: none !important;
                }
                
                .message-bubble,
                .conversation-avatar,
                .account-avatar {
                    transition: none !important;
                    animation: none !important;
                }
            ` : ''}
            
            /* 减少动画模式 */
            @media (prefers-reduced-motion: reduce) {
                .connection-line,
                .message-bubble,
                .conversation-avatar,
                .account-avatar {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;
        
        document.head.appendChild(optimizationStyles);
    }

    /**
     * 设置触摸滚动优化
     */
    setupTouchScrollOptimization() {
        if (!this.deviceCapabilities.supportsTouch) return;
        
        document.body.classList.add('touch-device');
        
        // 优化滚动容器
        const scrollContainers = document.querySelectorAll('.scroll-wrapper');
        scrollContainers.forEach(container => {
            // 启用硬件加速滚动
            container.style.webkitOverflowScrolling = 'touch';
            container.style.overscrollBehavior = 'contain';
            
            // 防止滚动链
            container.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: true });
            
            // 监听滚动性能
            let touchStartTime = 0;
            container.addEventListener('touchstart', () => {
                touchStartTime = performance.now();
            }, { passive: true });
            
            container.addEventListener('touchend', () => {
                const touchEndTime = performance.now();
                this.performanceMetrics.touchLatency = touchEndTime - touchStartTime;
            }, { passive: true });
        });
    }

    /**
     * 设置内存管理
     */
    setupMemoryManagement() {
        // 定期检查内存使用
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
                
                this.memoryPressure = usageRatio;
                this.performanceMetrics.memoryUsage = Math.round(usageRatio * 100);
                
                if (usageRatio > this.performanceConfig.memoryThreshold) {
                    this.handleMemoryPressure(usageRatio);
                }
            }, 2000);
        }
    }

    /**
     * 处理内存压力
     */
    handleMemoryPressure(usageRatio) {
        console.log(`Memory pressure detected: ${Math.round(usageRatio * 100)}%`);
        
        document.body.classList.add('memory-pressure-high');
        
        // 降低质量等级
        if (usageRatio > 0.9) {
            this.setQualityLevel('minimal');
        } else if (usageRatio > 0.8) {
            this.setQualityLevel('low');
        }
        
        // 触发垃圾回收
        this.performGarbageCollection();
        
        this.emit('memoryPressure', { usageRatio, quality: this.currentQuality });
    }

    /**
     * 执行垃圾回收
     */
    performGarbageCollection() {
        // 清理不需要的连接线
        const connections = document.querySelectorAll('.connection-line');
        connections.forEach((connection, index) => {
            if (index > this.qualityLevels[this.currentQuality].connectionLimit) {
                connection.remove();
            }
        });
        
        // 清理池化元素
        systemState.emit('performGarbageCollection');
        
        // 强制垃圾回收（如果支持）
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * 设置电池优化
     */
    async setupBatteryOptimization() {
        if (!this.deviceCapabilities.batteryAPI) return;
        
        try {
            const battery = await navigator.getBattery();
            
            this.batteryLevel = battery.level;
            this.performanceMetrics.batteryLevel = Math.round(battery.level * 100);
            
            // 监听电池变化
            battery.addEventListener('levelchange', this.handleBatteryChange);
            battery.addEventListener('chargingchange', this.handleBatteryChange);
            
            // 初始电池状态检查
            this.handleBatteryChange({ target: battery });
            
        } catch (error) {
            console.warn('Battery API access failed:', error);
        }
    }

    /**
     * 处理电池变化
     */
    handleBatteryChange(event) {
        const battery = event.target;
        this.batteryLevel = battery.level;
        this.performanceMetrics.batteryLevel = Math.round(battery.level * 100);
        
        if (battery.level < this.performanceConfig.batteryThreshold) {
            console.log(`Low battery detected: ${Math.round(battery.level * 100)}%`);
            
            document.body.classList.add('battery-low');
            
            // 启用省电模式
            this.enablePowerSaveMode();
        } else {
            document.body.classList.remove('battery-low');
            
            // 如果正在充电，可以提高性能
            if (battery.charging && this.currentQuality === 'low') {
                this.setQualityLevel('medium');
            }
        }
        
        this.emit('batteryChange', { 
            level: battery.level, 
            charging: battery.charging,
            quality: this.currentQuality 
        });
    }

    /**
     * 启用省电模式
     */
    enablePowerSaveMode() {
        // 降低帧率
        this.performanceConfig.targetFPS = Math.min(this.performanceConfig.targetFPS, 30);
        
        // 降低质量
        if (this.currentQuality !== 'minimal') {
            const qualityOrder = ['ultra', 'high', 'medium', 'low', 'minimal'];
            const currentIndex = qualityOrder.indexOf(this.currentQuality);
            const newQuality = qualityOrder[Math.min(currentIndex + 1, qualityOrder.length - 1)];
            this.setQualityLevel(newQuality);
        }
        
        // 减少更新频率
        this.applyUpdateThrottling(2);
        
        console.log('Power save mode enabled');
    }

    /**
     * 设置网络优化
     */
    setupNetworkOptimization() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            // 监听网络变化
            connection.addEventListener('change', this.handleConnectionChange);
            
            // 初始网络状态检查
            this.handleConnectionChange({ target: connection });
        }
    }

    /**
     * 处理网络连接变化
     */
    handleConnectionChange(event) {
        const connection = event.target;
        this.deviceCapabilities.connectionType = connection.effectiveType || connection.type || 'unknown';
        
        // 根据网络类型调整策略
        switch (this.deviceCapabilities.connectionType) {
            case 'slow-2g':
            case '2g':
                this.setQualityLevel('minimal');
                this.performanceConfig.connectionAware = false;
                break;
            case '3g':
                this.setQualityLevel('low');
                break;
            case '4g':
                if (this.currentQuality === 'minimal' || this.currentQuality === 'low') {
                    this.setQualityLevel('medium');
                }
                break;
            case '5g':
                if (this.batteryLevel > this.performanceConfig.batteryThreshold) {
                    this.setQualityLevel('high');
                }
                break;
        }
        
        this.emit('connectionChange', { 
            type: this.deviceCapabilities.connectionType,
            quality: this.currentQuality 
        });
    }

    /**
     * 设置质量等级
     */
    setQualityLevel(quality) {
        if (this.currentQuality === quality) return;
        
        const oldQuality = this.currentQuality;
        this.currentQuality = quality;
        
        // 重新应用CSS优化
        const existingStyles = document.getElementById('mobile-performance-optimizations');
        if (existingStyles) {
            existingStyles.remove();
        }
        this.applyCSSOptimizations();
        
        // 更新系统配置
        const config = this.qualityLevels[quality];
        systemState.updatePerformance({
            targetFPS: this.performanceConfig.targetFPS,
            updateInterval: config.updateInterval,
            connectionLimit: config.connectionLimit,
            quality: quality
        });
        
        console.log(`Quality changed: ${oldQuality} -> ${quality}`);
        this.emit('qualityChanged', { from: oldQuality, to: quality, config });
    }

    /**
     * 应用更新节流
     */
    applyUpdateThrottling(factor = 1.5) {
        const currentConfig = this.qualityLevels[this.currentQuality];
        const newInterval = currentConfig.updateInterval * factor;
        
        systemState.updatePerformance({
            updateInterval: newInterval,
            throttled: true
        });
    }

    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        let lastFrameTime = performance.now();
        let frameCount = 0;
        
        this.monitoringLoopId = requestAnimationFrame(this.monitoringLoop);
        
        function calculateFPS() {
            const now = performance.now();
            frameCount++;
            
            if (now - lastFrameTime >= 1000) {
                this.currentFPS = Math.round(frameCount * (1000 / (now - lastFrameTime)));
                this.performanceMetrics.frameTime = (now - lastFrameTime) / frameCount;
                
                frameCount = 0;
                lastFrameTime = now;
            }
        }
        
        this.calculateFPS = calculateFPS.bind(this);
    }

    /**
     * 性能监控循环
     */
    monitoringLoop() {
        if (!this.isInitialized) return;
        
        // 计算FPS
        this.calculateFPS();
        
        // 更新性能指标
        this.performanceMetrics.connectionCount = document.querySelectorAll('.connection-line').length;
        this.performanceMetrics.visibleElements = document.querySelectorAll('[data-pooled="false"]').length;
        
        // 检查性能并自适应调整
        if (this.performanceConfig.adaptiveQuality) {
            this.adaptiveQualityAdjustment();
        }
        
        // 继续监控
        this.monitoringLoopId = requestAnimationFrame(this.monitoringLoop);
    }

    /**
     * 自适应质量调整
     */
    adaptiveQualityAdjustment() {
        const targetFPS = this.performanceConfig.targetFPS;
        const fpsRatio = this.currentFPS / targetFPS;
        
        // 根据帧率自动调整质量
        if (fpsRatio < 0.7) {
            // 性能不足，降低质量
            const qualityOrder = ['ultra', 'high', 'medium', 'low', 'minimal'];
            const currentIndex = qualityOrder.indexOf(this.currentQuality);
            if (currentIndex < qualityOrder.length - 1) {
                this.setQualityLevel(qualityOrder[currentIndex + 1]);
            }
        } else if (fpsRatio > 0.95 && this.batteryLevel > this.performanceConfig.batteryThreshold) {
            // 性能充足且电量充足，可以提高质量
            const qualityOrder = ['ultra', 'high', 'medium', 'low', 'minimal'];
            const currentIndex = qualityOrder.indexOf(this.currentQuality);
            if (currentIndex > 0) {
                this.setQualityLevel(qualityOrder[currentIndex - 1]);
            }
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 页面可见性变化
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // 窗口焦点变化
        window.addEventListener('blur', () => {
            this.isBackgroundActive = false;
            this.handleBackgroundChange();
        });
        
        window.addEventListener('focus', () => {
            this.isBackgroundActive = true;
            this.handleBackgroundChange();
        });
        
        // 方向变化
        window.addEventListener('orientationchange', () => {
            // 延迟处理，等待布局完成
            setTimeout(() => {
                this.handleOrientationChange();
            }, 300);
        });
        
        // 系统状态监听
        systemState.on('connectionAdded', () => {
            const connectionCount = systemState.connections.size;
            const limit = this.qualityLevels[this.currentQuality].connectionLimit;
            
            if (connectionCount > limit) {
                this.performConnectionCulling();
            }
        });
    }

    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面不可见，降低性能消耗
            this.performanceConfig.targetFPS = Math.min(this.performanceConfig.targetFPS, 15);
            this.applyUpdateThrottling(4);
            
            console.log('Page hidden, reducing performance');
        } else {
            // 页面可见，恢复性能
            this.configurePerformanceSettings();
            
            console.log('Page visible, restoring performance');
        }
    }

    /**
     * 处理后台/前台变化
     */
    handleBackgroundChange() {
        if (!this.isBackgroundActive) {
            // 后台运行，最小化资源使用
            this.setQualityLevel('minimal');
            this.performanceConfig.targetFPS = 10;
        } else {
            // 前台恢复，根据设备能力恢复
            this.configurePerformanceSettings();
        }
    }

    /**
     * 处理设备方向变化
     */
    handleOrientationChange() {
        // 重新检测设备特征
        this.detectDeviceCapabilities();
        
        // 重新配置性能
        this.configurePerformanceSettings();
        
        // 触发重新布局
        this.emit('orientationChanged', {
            orientation: screen.orientation?.angle || window.orientation,
            quality: this.currentQuality
        });
    }

    /**
     * 执行连接线剔除
     */
    performConnectionCulling() {
        const connections = document.querySelectorAll('.connection-line');
        const limit = this.qualityLevels[this.currentQuality].connectionLimit;
        
        // 按距离视窗中心的距离排序，保留最重要的连接线
        const connectionArray = Array.from(connections).map(connection => {
            const rect = connection.getBoundingClientRect();
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const distance = Math.sqrt(
                Math.pow(rect.left + rect.width / 2 - centerX, 2) +
                Math.pow(rect.top + rect.height / 2 - centerY, 2)
            );
            
            return { element: connection, distance };
        });
        
        connectionArray
            .sort((a, b) => a.distance - b.distance)
            .slice(limit)
            .forEach(({ element }) => {
                element.style.display = 'none';
            });
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            deviceCapabilities: this.deviceCapabilities,
            currentQuality: this.currentQuality,
            performanceMetrics: this.performanceMetrics,
            performanceConfig: this.performanceConfig,
            optimizationStatus: {
                memoryPressure: this.memoryPressure,
                batteryLevel: this.batteryLevel,
                isBackgroundActive: this.isBackgroundActive,
                currentFPS: this.currentFPS
            }
        };
    }

    /**
     * 手动设置优化模式
     */
    setOptimizationMode(mode) {
        switch (mode) {
            case 'performance':
                this.setQualityLevel('ultra');
                this.performanceConfig.adaptiveQuality = false;
                break;
            case 'balanced':
                this.performanceConfig.adaptiveQuality = true;
                this.configurePerformanceSettings();
                break;
            case 'battery':
                this.setQualityLevel('low');
                this.enablePowerSaveMode();
                break;
            case 'minimal':
                this.setQualityLevel('minimal');
                this.performanceConfig.adaptiveQuality = false;
                break;
        }
        
        this.emit('optimizationModeChanged', mode);
    }

    /**
     * 事件系统
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * 销毁优化器
     */
    destroy() {
        // 停止性能监控
        if (this.monitoringLoopId) {
            cancelAnimationFrame(this.monitoringLoopId);
        }
        
        // 移除事件监听
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        // 清理电池API监听
        if (this.deviceCapabilities.batteryAPI) {
            navigator.getBattery().then(battery => {
                battery.removeEventListener('levelchange', this.handleBatteryChange);
                battery.removeEventListener('chargingchange', this.handleBatteryChange);
            });
        }
        
        // 清理网络监听
        if ('connection' in navigator) {
            navigator.connection.removeEventListener('change', this.handleConnectionChange);
        }
        
        // 移除优化样式
        const optimizationStyles = document.getElementById('mobile-performance-optimizations');
        if (optimizationStyles) {
            optimizationStyles.remove();
        }
        
        // 清理CSS类
        document.body.classList.remove('touch-device', 'memory-pressure-high', 'battery-low');
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        this.isDestroyed = true;
        console.log('Mobile Performance Optimizer destroyed');
    }
}

// 创建全局实例
export const mobilePerformanceOptimizer = new MobilePerformanceOptimizer();