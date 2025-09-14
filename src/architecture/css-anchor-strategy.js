/**
 * CSS Anchor Strategy Manager - CSS Anchor定位策略管理器
 * 管理CSS Anchor Positioning在三容器连接线系统中的应用
 * 
 * 核心策略：
 * 1. Anchor命名规范和管理
 * 2. 跨容器anchor引用机制
 * 3. Polyfill兼容性处理
 * 4. 动态anchor更新和同步
 * 5. 性能优化和fallback机制
 */

import NamingConventions from './naming-conventions.js';
import { systemState } from './data-structures.js';

export class CSSAnchorStrategyManager {
    constructor() {
        // CSS Anchor支持状态
        this.support = {
            native: false,           // 原生CSS Anchor支持
            polyfill: false,         // Polyfill加载状态
            fallback: false          // 是否使用JavaScript fallback
        };
        
        // Anchor注册表
        this.anchorRegistry = new Map(); // anchorName -> element
        this.elementAnchorMap = new Map(); // element -> anchorName
        
        // 连接关系映射
        this.connectionAnchors = new Map(); // connectionId -> {from: anchorName, to: anchorName}
        
        // 动态更新队列
        this.updateQueue = new Set();
        
        // 性能配置
        this.config = {
            updateThrottle: 16,          // 更新节流时间(ms)
            batchUpdateSize: 20,         // 批量更新大小
            enableAutoPolyfill: true,    // 自动加载polyfill
            fallbackMode: 'javascript',  // fallback模式: 'javascript' | 'none'
            debugMode: false             // 调试模式
        };
        
        // 状态追踪
        this.isInitialized = false;
        this.lastUpdateTime = 0;
        this.updateLoopId = null;
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 绑定方法上下文
        this.updateLoop = this.updateLoop.bind(this);
        this.handleElementMutation = this.handleElementMutation.bind(this);
    }

    /**
     * 初始化CSS Anchor策略管理器
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // 检测CSS Anchor支持
            await this.detectAnchorSupport();
            
            // 初始化anchor系统
            this.initializeAnchorSystem();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 启动更新循环
            this.startUpdateLoop();
            
            this.isInitialized = true;
            this.emit('initialized', this.support);
            
            console.log('CSS Anchor Strategy Manager initialized:', this.support);
        } catch (error) {
            console.error('Failed to initialize CSS Anchor Strategy Manager:', error);
            
            // 启用fallback模式
            this.enableFallbackMode();
        }
    }

    /**
     * 检测CSS Anchor Positioning支持
     */
    async detectAnchorSupport() {
        // 检测原生支持
        this.support.native = CSS.supports('anchor-name: --test') && 
                             CSS.supports('position-anchor: --test');
        
        if (this.support.native) {
            console.log('Native CSS Anchor Positioning support detected');
            return;
        }
        
        // 加载polyfill
        if (this.config.enableAutoPolyfill) {
            try {
                const { polyfill } = await import('@oddbird/css-anchor-positioning');
                
                // 应用polyfill
                polyfill();
                
                this.support.polyfill = true;
                console.log('CSS Anchor Positioning polyfill loaded successfully');
                
                // 验证polyfill是否工作
                await this.verifyPolyfillWorking();
                
            } catch (error) {
                console.warn('Failed to load CSS Anchor Positioning polyfill:', error);
                this.enableFallbackMode();
            }
        } else {
            this.enableFallbackMode();
        }
    }

    /**
     * 验证polyfill是否正常工作
     */
    async verifyPolyfillWorking() {
        return new Promise((resolve) => {
            // 创建测试元素
            const testAnchor = document.createElement('div');
            testAnchor.style.anchorName = '--test-anchor';
            testAnchor.style.position = 'absolute';
            testAnchor.style.left = '100px';
            testAnchor.style.top = '100px';
            testAnchor.style.width = '10px';
            testAnchor.style.height = '10px';
            
            const testTarget = document.createElement('div');
            testTarget.style.positionAnchor = '--test-anchor';
            testTarget.style.position = 'absolute';
            testTarget.style.left = 'anchor(right)';
            testTarget.style.top = 'anchor(center)';
            testTarget.style.width = '10px';
            testTarget.style.height = '10px';
            
            document.body.appendChild(testAnchor);
            document.body.appendChild(testTarget);
            
            // 延迟检查位置
            setTimeout(() => {
                const anchorRect = testAnchor.getBoundingClientRect();
                const targetRect = testTarget.getBoundingClientRect();
                
                const isWorking = Math.abs(targetRect.left - (anchorRect.right)) < 5;
                
                // 清理测试元素
                document.body.removeChild(testAnchor);
                document.body.removeChild(testTarget);
                
                if (!isWorking) {
                    console.warn('CSS Anchor Positioning polyfill verification failed');
                    this.enableFallbackMode();
                }
                
                resolve(isWorking);
            }, 100);
        });
    }

    /**
     * 启用fallback模式
     */
    enableFallbackMode() {
        this.support.fallback = true;
        console.log('CSS Anchor fallback mode enabled');
        
        if (this.config.fallbackMode === 'javascript') {
            this.initializeJavaScriptFallback();
        }
    }

    /**
     * 初始化JavaScript fallback
     */
    initializeJavaScriptFallback() {
        console.log('Initializing JavaScript anchor positioning fallback');
        
        // 创建fallback样式表
        this.createFallbackStyleSheet();
        
        // 设置位置计算器
        this.setupPositionCalculator();
    }

    /**
     * 创建fallback样式表
     */
    createFallbackStyleSheet() {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'css-anchor-fallback';
        styleSheet.textContent = `
            /* CSS Anchor Positioning Fallback */
            .anchor-fallback-positioned {
                position: absolute !important;
                transition: transform 0.1s ease-out;
            }
            
            .anchor-fallback-hidden {
                visibility: hidden;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    /**
     * 设置位置计算器
     */
    setupPositionCalculator() {
        // 监听窗口变化和滚动
        window.addEventListener('resize', () => {
            this.queueAllAnchorsUpdate();
        }, { passive: true });
        
        window.addEventListener('scroll', () => {
            this.queueAllAnchorsUpdate();
        }, { passive: true });
    }

    /**
     * 初始化anchor系统
     */
    initializeAnchorSystem() {
        // 扫描现有元素
        this.scanExistingElements();
        
        // 设置MutationObserver监听新元素
        this.setupMutationObserver();
        
        console.log(`Anchor system initialized with ${this.anchorRegistry.size} anchors`);
    }

    /**
     * 扫描现有元素
     */
    scanExistingElements() {
        // 扫描所有具有anchor-name的元素
        const elementsWithAnchor = document.querySelectorAll('[style*="anchor-name"]');
        elementsWithAnchor.forEach(element => {
            const anchorName = this.extractAnchorName(element);
            if (anchorName) {
                this.registerAnchor(element, anchorName);
            }
        });
        
        // 扫描数据属性中的anchor信息
        const messagesAndAvatars = document.querySelectorAll('[data-message-id], [data-avatar-id]');
        messagesAndAvatars.forEach(element => {
            this.registerElementWithAutoAnchor(element);
        });
    }

    /**
     * 提取anchor-name值
     */
    extractAnchorName(element) {
        const style = element.style.anchorName || getComputedStyle(element).anchorName;
        return style && style !== 'none' ? style : null;
    }

    /**
     * 注册anchor
     */
    registerAnchor(element, anchorName) {
        // 验证anchor名称格式
        if (!NamingConventions.anchor.validate(anchorName)) {
            console.warn(`Invalid anchor name: ${anchorName}`);
            return false;
        }
        
        // 存储映射关系
        this.anchorRegistry.set(anchorName, element);
        this.elementAnchorMap.set(element, anchorName);
        
        // 设置元素属性
        element.dataset.anchorName = anchorName;
        
        // 在fallback模式下设置位置跟踪
        if (this.support.fallback) {
            this.setupFallbackTracking(element, anchorName);
        }
        
        this.emit('anchorRegistered', { element, anchorName });
        return true;
    }

    /**
     * 自动注册元素anchor
     */
    registerElementWithAutoAnchor(element) {
        let anchorName = null;
        
        // 根据元素类型生成anchor名称
        if (element.dataset.messageId) {
            anchorName = NamingConventions.anchor.messageBubble(element.dataset.messageId);
        } else if (element.dataset.avatarId) {
            const userId = element.dataset.userId;
            const container = element.dataset.container;
            
            if (container === 'conversation') {
                anchorName = NamingConventions.anchor.conversationAvatar(userId);
            } else if (container === 'accounts') {
                anchorName = NamingConventions.anchor.accountAvatar(userId);
            }
        }
        
        if (anchorName) {
            // 设置anchor-name CSS属性
            element.style.anchorName = anchorName;
            
            // 注册anchor
            this.registerAnchor(element, anchorName);
        }
    }

    /**
     * 设置fallback模式下的位置跟踪
     */
    setupFallbackTracking(element, anchorName) {
        element.classList.add('anchor-fallback-positioned');
        
        // 添加到更新队列
        this.queueAnchorUpdate(anchorName);
    }

    /**
     * 设置MutationObserver
     */
    setupMutationObserver() {
        this.mutationObserver = new MutationObserver(this.handleElementMutation);
        
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'data-message-id', 'data-avatar-id', 'data-user-id']
        });
    }

    /**
     * 处理元素变化
     */
    handleElementMutation(mutations) {
        let needsUpdate = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // 处理新增元素
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.handleNewElement(node);
                        needsUpdate = true;
                    }
                });
                
                // 处理删除元素
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.handleRemovedElement(node);
                    }
                });
            } else if (mutation.type === 'attributes') {
                // 处理属性变化
                const element = mutation.target;
                
                if (mutation.attributeName === 'style') {
                    const anchorName = this.extractAnchorName(element);
                    if (anchorName) {
                        this.registerAnchor(element, anchorName);
                        needsUpdate = true;
                    }
                } else if (mutation.attributeName.startsWith('data-')) {
                    this.registerElementWithAutoAnchor(element);
                    needsUpdate = true;
                }
            }
        });
        
        if (needsUpdate) {
            // 延迟更新，避免频繁计算
            setTimeout(() => {
                this.queueVisibleAnchorsUpdate();
            }, 50);
        }
    }

    /**
     * 处理新元素
     */
    handleNewElement(element) {
        // 检查是否需要anchor
        if (element.dataset?.messageId || element.dataset?.avatarId) {
            this.registerElementWithAutoAnchor(element);
        }
        
        // 检查子元素
        const childrenWithData = element.querySelectorAll('[data-message-id], [data-avatar-id]');
        childrenWithData.forEach(child => {
            this.registerElementWithAutoAnchor(child);
        });
    }

    /**
     * 处理删除元素
     */
    handleRemovedElement(element) {
        const anchorName = this.elementAnchorMap.get(element);
        if (anchorName) {
            this.unregisterAnchor(anchorName);
        }
        
        // 处理子元素
        const childrenAnchors = Array.from(this.elementAnchorMap.keys()).filter(el => 
            element.contains(el)
        );
        
        childrenAnchors.forEach(child => {
            const childAnchorName = this.elementAnchorMap.get(child);
            if (childAnchorName) {
                this.unregisterAnchor(childAnchorName);
            }
        });
    }

    /**
     * 注销anchor
     */
    unregisterAnchor(anchorName) {
        const element = this.anchorRegistry.get(anchorName);
        if (element) {
            this.anchorRegistry.delete(anchorName);
            this.elementAnchorMap.delete(element);
            
            // 移除fallback类
            if (this.support.fallback) {
                element.classList.remove('anchor-fallback-positioned');
            }
            
            this.emit('anchorUnregistered', { element, anchorName });
        }
    }

    /**
     * 创建anchor连接关系
     */
    createAnchorConnection(connectionId, fromAnchor, toAnchor) {
        this.connectionAnchors.set(connectionId, {
            from: fromAnchor,
            to: toAnchor
        });
        
        // 在fallback模式下建立位置关系
        if (this.support.fallback) {
            this.setupFallbackConnection(connectionId, fromAnchor, toAnchor);
        }
        
        this.emit('connectionCreated', { connectionId, fromAnchor, toAnchor });
    }

    /**
     * 设置fallback连接
     */
    setupFallbackConnection(connectionId, fromAnchor, toAnchor) {
        const fromElement = this.anchorRegistry.get(fromAnchor);
        const toElement = this.anchorRegistry.get(toAnchor);
        
        if (fromElement && toElement) {
            // 将连接线元素标记为需要位置计算
            const connectionElement = document.querySelector(`[data-connection-id="${connectionId}"]`);
            if (connectionElement) {
                connectionElement.dataset.fromAnchor = fromAnchor;
                connectionElement.dataset.toAnchor = toAnchor;
                connectionElement.classList.add('anchor-fallback-positioned');
                
                // 队列更新
                this.queueAnchorUpdate(fromAnchor);
                this.queueAnchorUpdate(toAnchor);
            }
        }
    }

    /**
     * 移除anchor连接关系
     */
    removeAnchorConnection(connectionId) {
        this.connectionAnchors.delete(connectionId);
        
        // 清理fallback连接
        if (this.support.fallback) {
            const connectionElement = document.querySelector(`[data-connection-id="${connectionId}"]`);
            if (connectionElement) {
                connectionElement.classList.remove('anchor-fallback-positioned');
                delete connectionElement.dataset.fromAnchor;
                delete connectionElement.dataset.toAnchor;
            }
        }
        
        this.emit('connectionRemoved', { connectionId });
    }

    /**
     * 队列anchor更新
     */
    queueAnchorUpdate(anchorName) {
        this.updateQueue.add(anchorName);
    }

    /**
     * 队列所有anchor更新
     */
    queueAllAnchorsUpdate() {
        this.anchorRegistry.forEach((_, anchorName) => {
            this.updateQueue.add(anchorName);
        });
    }

    /**
     * 队列可见anchor更新
     */
    queueVisibleAnchorsUpdate() {
        this.anchorRegistry.forEach((element, anchorName) => {
            if (this.isElementVisible(element)) {
                this.updateQueue.add(anchorName);
            }
        });
    }

    /**
     * 检查元素是否可见
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               rect.bottom >= 0 && rect.right >= 0 &&
               rect.top <= window.innerHeight && rect.left <= window.innerWidth;
    }

    /**
     * 启动更新循环
     */
    startUpdateLoop() {
        if (this.updateLoopId) {
            cancelAnimationFrame(this.updateLoopId);
        }
        
        this.updateLoopId = requestAnimationFrame(this.updateLoop);
    }

    /**
     * 更新循环
     */
    updateLoop() {
        if (!this.isInitialized) return;
        
        // 节流更新
        const now = Date.now();
        if (now - this.lastUpdateTime < this.config.updateThrottle) {
            this.updateLoopId = requestAnimationFrame(this.updateLoop);
            return;
        }
        
        this.lastUpdateTime = now;
        
        // 处理更新队列
        if (this.updateQueue.size > 0) {
            this.processBatchUpdate();
        }
        
        // 继续下一帧
        this.updateLoopId = requestAnimationFrame(this.updateLoop);
    }

    /**
     * 批量处理更新
     */
    processBatchUpdate() {
        const batch = Array.from(this.updateQueue).slice(0, this.config.batchUpdateSize);
        
        batch.forEach(anchorName => {
            this.updateAnchorPosition(anchorName);
            this.updateQueue.delete(anchorName);
        });
    }

    /**
     * 更新anchor位置（fallback模式）
     */
    updateAnchorPosition(anchorName) {
        if (!this.support.fallback) return;
        
        const anchorElement = this.anchorRegistry.get(anchorName);
        if (!anchorElement) return;
        
        // 更新依赖此anchor的连接线
        this.connectionAnchors.forEach((connection, connectionId) => {
            if (connection.from === anchorName || connection.to === anchorName) {
                this.updateConnectionPosition(connectionId);
            }
        });
        
        // 更新依赖此anchor的其他元素
        this.updateAnchorDependents(anchorName);
    }

    /**
     * 更新连接线位置（fallback模式）
     */
    updateConnectionPosition(connectionId) {
        const connection = this.connectionAnchors.get(connectionId);
        if (!connection) return;
        
        const fromElement = this.anchorRegistry.get(connection.from);
        const toElement = this.anchorRegistry.get(connection.to);
        const connectionElement = document.querySelector(`[data-connection-id="${connectionId}"]`);
        
        if (!fromElement || !toElement || !connectionElement) return;
        
        // 计算位置
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // 更新SVG路径（这里简化处理）
        if (connectionElement.tagName === 'path') {
            const path = this.calculateFallbackPath(fromRect, toRect);
            connectionElement.setAttribute('d', path);
        }
    }

    /**
     * 计算fallback路径
     */
    calculateFallbackPath(fromRect, toRect) {
        const startX = fromRect.left + fromRect.width / 2;
        const startY = fromRect.top + fromRect.height / 2;
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + toRect.height / 2;
        
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    /**
     * 更新anchor依赖元素
     */
    updateAnchorDependents(anchorName) {
        // 查找所有引用此anchor的元素
        const dependents = document.querySelectorAll(`[style*="position-anchor: ${anchorName}"]`);
        
        dependents.forEach(element => {
            this.updateElementAnchorPosition(element, anchorName);
        });
    }

    /**
     * 更新元素anchor位置
     */
    updateElementAnchorPosition(element, anchorName) {
        const anchorElement = this.anchorRegistry.get(anchorName);
        if (!anchorElement) return;
        
        const anchorRect = anchorElement.getBoundingClientRect();
        
        // 解析position值（简化处理）
        const style = getComputedStyle(element);
        const left = style.left;
        const top = style.top;
        
        // 这里需要完整的CSS anchor positioning解析逻辑
        // 简化实现
        if (left.includes('anchor(')) {
            element.style.left = `${anchorRect.right}px`;
        }
        
        if (top.includes('anchor(')) {
            element.style.top = `${anchorRect.top}px`;
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听系统状态变化
        systemState.on('messageAdded', (message) => {
            // 延迟注册，确保DOM已更新
            setTimeout(() => {
                const element = document.querySelector(`[data-message-id="${message.id}"]`);
                if (element) {
                    this.registerElementWithAutoAnchor(element);
                }
            }, 50);
        });
        
        systemState.on('avatarAdded', (avatar) => {
            setTimeout(() => {
                const element = document.querySelector(`[data-avatar-id="${avatar.id}"]`);
                if (element) {
                    this.registerElementWithAutoAnchor(element);
                }
            }, 50);
        });
        
        systemState.on('connectionAdded', (connection) => {
            const fromAnchor = this.getConnectionFromAnchor(connection);
            const toAnchor = this.getConnectionToAnchor(connection);
            
            if (fromAnchor && toAnchor) {
                this.createAnchorConnection(connection.id, fromAnchor, toAnchor);
            }
        });
        
        systemState.on('connectionRemoved', (connection) => {
            this.removeAnchorConnection(connection.id);
        });
    }

    /**
     * 获取连接的起始anchor
     */
    getConnectionFromAnchor(connection) {
        if (connection.fromId.startsWith('msg-')) {
            return NamingConventions.anchor.messageBubble(connection.fromId);
        }
        // 其他类型的处理
        return null;
    }

    /**
     * 获取连接的目标anchor
     */
    getConnectionToAnchor(connection) {
        const avatar = systemState.avatars.get(connection.toId);
        if (!avatar) return null;
        
        return avatar.container === 'conversation'
            ? NamingConventions.anchor.conversationAvatar(avatar.userId)
            : NamingConventions.anchor.accountAvatar(avatar.userId);
    }

    /**
     * 获取anchor位置信息
     */
    getAnchorPosition(anchorName) {
        const element = this.anchorRegistry.get(anchorName);
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * 调试方法：显示所有anchor
     */
    debugShowAnchors() {
        if (!this.config.debugMode) return;
        
        // 移除现有调试元素
        document.querySelectorAll('.anchor-debug-marker').forEach(marker => {
            marker.remove();
        });
        
        // 为每个anchor创建调试标记
        this.anchorRegistry.forEach((element, anchorName) => {
            const marker = document.createElement('div');
            marker.className = 'anchor-debug-marker';
            marker.style.cssText = `
                position: fixed;
                background: rgba(255, 0, 0, 0.5);
                color: white;
                font-size: 10px;
                padding: 2px 4px;
                border-radius: 2px;
                pointer-events: none;
                z-index: 9999;
                white-space: nowrap;
            `;
            marker.textContent = anchorName;
            
            const rect = element.getBoundingClientRect();
            marker.style.left = rect.left + 'px';
            marker.style.top = (rect.top - 20) + 'px';
            
            document.body.appendChild(marker);
        });
        
        // 5秒后自动移除
        setTimeout(() => {
            document.querySelectorAll('.anchor-debug-marker').forEach(marker => {
                marker.remove();
            });
        }, 5000);
    }

    /**
     * 获取系统统计信息
     */
    getStats() {
        return {
            support: this.support,
            totalAnchors: this.anchorRegistry.size,
            totalConnections: this.connectionAnchors.size,
            pendingUpdates: this.updateQueue.size,
            config: this.config
        };
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
     * 销毁管理器
     */
    destroy() {
        // 停止更新循环
        if (this.updateLoopId) {
            cancelAnimationFrame(this.updateLoopId);
        }
        
        // 断开MutationObserver
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        // 清理注册表
        this.anchorRegistry.clear();
        this.elementAnchorMap.clear();
        this.connectionAnchors.clear();
        this.updateQueue.clear();
        this.eventListeners.clear();
        
        // 移除调试元素
        document.querySelectorAll('.anchor-debug-marker').forEach(marker => {
            marker.remove();
        });
        
        // 移除fallback样式
        const fallbackStyle = document.getElementById('css-anchor-fallback');
        if (fallbackStyle) {
            fallbackStyle.remove();
        }
        
        console.log('CSS Anchor Strategy Manager destroyed');
    }
}

// 创建全局实例
export const cssAnchorStrategyManager = new CSSAnchorStrategyManager();