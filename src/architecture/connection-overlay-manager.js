/**
 * Connection Overlay Manager - 连接线覆盖层管理器
 * 统一管理跨三个容器的连接线渲染和覆盖层策略
 * 
 * 核心策略：
 * 1. 独立的SVG覆盖层，绝对定位在最顶层
 * 2. CSS Anchor Positioning实时跟踪元素位置
 * 3. 视窗内连接线的动态渲染和回收
 * 4. 性能优化和内存管理
 */

import { systemState, ConnectionModel } from './data-structures.js';
import NamingConventions from './naming-conventions.js';

export class ConnectionOverlayManager {
    constructor() {
        // DOM元素引用
        this.overlayContainer = null;
        this.svgElement = null;
        this.defsElement = null;
        
        // 连接线管理
        this.activeConnections = new Map(); // connectionId -> SVG path element
        this.connectionPool = []; // 复用连接线元素池
        this.renderQueue = new Set(); // 待渲染的连接线ID
        
        // 视窗和滚动管理
        this.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: 0,
            scrollY: 0
        };
        
        // 性能优化配置
        this.config = {
            maxConnections: 1000,           // 最大连接线数量
            poolSize: 200,                  // 连接线池大小
            renderBatchSize: 20,            // 批量渲染大小
            updateThrottle: 16,             // 更新节流时间(ms)
            cullingMargin: 100,             // 视窗裁剪边距(px)
            qualityAdaptive: true,          // 自适应质量
            memoryThreshold: 0.8            // 内存压力阈值
        };
        
        // 状态追踪
        this.isInitialized = false;
        this.isDestroyed = false;
        this.renderLoopId = null;
        this.lastUpdateTime = 0;
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 绑定方法上下文
        this.handleResize = this.handleResize.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleMutation = this.handleMutation.bind(this);
        this.renderLoop = this.renderLoop.bind(this);
    }

    /**
     * 初始化覆盖层管理器
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // 创建覆盖层DOM结构
            this.createOverlayStructure();
            
            // 初始化CSS Anchor Positioning
            await this.initializeAnchorPositioning();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 启动渲染循环
            this.startRenderLoop();
            
            this.isInitialized = true;
            this.emit('initialized', this);
            
            console.log('Connection Overlay Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Connection Overlay Manager:', error);
            throw error;
        }
    }

    /**
     * 创建覆盖层DOM结构
     */
    createOverlayStructure() {
        // 查找或创建覆盖层容器
        this.overlayContainer = document.getElementById(NamingConventions.elementId.containers.connectionOverlay);
        
        if (!this.overlayContainer) {
            this.overlayContainer = document.createElement('div');
            this.overlayContainer.id = NamingConventions.elementId.containers.connectionOverlay;
            this.overlayContainer.className = NamingConventions.cssClass.containers.overlay;
            
            // 添加到聊天界面
            const chatInterface = document.querySelector('.chat-interface');
            if (chatInterface) {
                chatInterface.appendChild(this.overlayContainer);
            } else {
                document.body.appendChild(this.overlayContainer);
            }
        }

        // 创建SVG元素
        this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgElement.id = NamingConventions.elementId.containers.connectionSvg;
        this.svgElement.className = 'connection-svg';
        this.svgElement.setAttribute('viewBox', `0 0 ${this.viewport.width} ${this.viewport.height}`);
        this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // 设置SVG样式
        this.svgElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            overflow: visible;
        `;

        // 创建defs元素（渐变、滤镜等）
        this.createSvgDefinitions();
        
        // 添加到容器
        this.overlayContainer.appendChild(this.svgElement);
    }

    /**
     * 创建SVG定义元素
     */
    createSvgDefinitions() {
        this.defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // 他人消息连接线渐变
        const otherGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        otherGradient.id = 'connectionGradientOther';
        otherGradient.innerHTML = `
            <stop offset="0%" stop-color="rgba(59,130,246,0.2)" />
            <stop offset="50%" stop-color="rgba(59,130,246,0.8)" />
            <stop offset="100%" stop-color="rgba(59,130,246,0.2)" />
        `;

        // 自己消息连接线渐变
        const selfGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        selfGradient.id = 'connectionGradientSelf';
        selfGradient.innerHTML = `
            <stop offset="0%" stop-color="rgba(34,197,94,0.2)" />
            <stop offset="50%" stop-color="rgba(34,197,94,0.8)" />
            <stop offset="100%" stop-color="rgba(34,197,94,0.2)" />
        `;

        // 动画定义
        const animation = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        animation.textContent = `
            .connection-path-animated {
                stroke-dasharray: 1000;
                stroke-dashoffset: 1000;
                animation: connectionDraw 0.8s ease-out forwards;
            }
            
            @keyframes connectionDraw {
                to { stroke-dashoffset: 0; }
            }
        `;

        this.defsElement.appendChild(otherGradient);
        this.defsElement.appendChild(selfGradient);
        this.defsElement.appendChild(animation);
        this.svgElement.appendChild(this.defsElement);
    }

    /**
     * 初始化CSS Anchor Positioning
     */
    async initializeAnchorPositioning() {
        try {
            // 检查原生支持
            if (!CSS.supports('anchor-name: --test')) {
                const { polyfill } = await import('@oddbird/css-anchor-positioning');
                polyfill();
                console.log('CSS Anchor Positioning polyfill loaded');
            } else {
                console.log('Native CSS Anchor Positioning support detected');
            }
        } catch (error) {
            console.warn('CSS Anchor Positioning polyfill failed to load:', error);
            // 继续使用JavaScript计算位置作为fallback
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 窗口大小变化
        window.addEventListener('resize', this.handleResize, { passive: true });
        
        // 滚动事件（需要监听三个容器）
        const containers = [
            document.getElementById(NamingConventions.elementId.containers.conversation),
            document.getElementById(NamingConventions.elementId.containers.messages),
            document.getElementById(NamingConventions.elementId.containers.accounts)
        ];
        
        containers.forEach(container => {
            if (container) {
                container.addEventListener('scroll', this.handleScroll, { passive: true });
            }
        });

        // DOM变化监听
        this.mutationObserver = new MutationObserver(this.handleMutation);
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-message-id', 'data-avatar-id', 'style']
        });

        // 系统状态变化监听
        systemState.on('connectionAdded', (connection) => {
            this.queueConnectionRender(connection.id);
        });
        
        systemState.on('connectionRemoved', (connection) => {
            this.removeConnectionFromRender(connection.id);
        });
        
        systemState.on('performanceUpdated', (performance) => {
            this.adaptRenderingQuality(performance);
        });
    }

    /**
     * 窗口大小变化处理
     */
    handleResize() {
        this.viewport.width = window.innerWidth;
        this.viewport.height = window.innerHeight;
        
        // 更新SVG viewBox
        this.svgElement.setAttribute('viewBox', `0 0 ${this.viewport.width} ${this.viewport.height}`);
        
        // 重新计算所有连接线
        this.queueAllConnectionsRender();
    }

    /**
     * 滚动事件处理
     */
    handleScroll(event) {
        // 节流处理
        const now = Date.now();
        if (now - this.lastUpdateTime < this.config.updateThrottle) {
            return;
        }
        
        this.lastUpdateTime = now;
        
        // 更新视窗信息
        this.updateViewportInfo();
        
        // 执行视窗裁剪
        this.performViewportCulling();
        
        // 队列化可见连接线的重新渲染
        this.queueVisibleConnectionsRender();
    }

    /**
     * DOM变化处理
     */
    handleMutation(mutations) {
        let shouldUpdate = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // 检查是否有新的消息或头像元素
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.dataset?.messageId || node.dataset?.avatarId) {
                            shouldUpdate = true;
                        }
                    }
                });
            } else if (mutation.type === 'attributes') {
                // 检查样式变化（位置变化）
                if (mutation.attributeName === 'style' && 
                    (mutation.target.dataset?.messageId || mutation.target.dataset?.avatarId)) {
                    shouldUpdate = true;
                }
            }
        });
        
        if (shouldUpdate) {
            // 延迟更新，避免频繁重新渲染
            setTimeout(() => {
                this.queueVisibleConnectionsRender();
            }, 50);
        }
    }

    /**
     * 启动渲染循环
     */
    startRenderLoop() {
        if (this.renderLoopId) {
            cancelAnimationFrame(this.renderLoopId);
        }
        
        this.renderLoopId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * 渲染循环
     */
    renderLoop() {
        if (this.isDestroyed) return;
        
        // 批量处理渲染队列
        if (this.renderQueue.size > 0) {
            this.processBatchRender();
        }
        
        // 更新性能统计
        this.updatePerformanceStats();
        
        // 继续下一帧
        this.renderLoopId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * 批量处理渲染
     */
    processBatchRender() {
        const batch = Array.from(this.renderQueue).slice(0, this.config.renderBatchSize);
        batch.forEach(connectionId => {
            this.renderConnection(connectionId);
            this.renderQueue.delete(connectionId);
        });
    }

    /**
     * 渲染单个连接线
     */
    renderConnection(connectionId) {
        const connection = systemState.connections.get(connectionId);
        if (!connection) return;

        // 获取起点和终点元素
        const fromElement = this.findElementById(connection.fromId);
        const toElement = this.findElementById(connection.toId);
        
        if (!fromElement || !toElement) {
            console.warn(`Connection ${connectionId} missing elements:`, {
                from: !!fromElement,
                to: !!toElement
            });
            return;
        }

        // 计算连接路径
        const path = this.calculateConnectionPath(fromElement, toElement, connection.type);
        connection.updatePath(path);

        // 获取或创建SVG路径元素
        let pathElement = this.activeConnections.get(connectionId);
        if (!pathElement) {
            pathElement = this.createOrReusePathElement(connection);
            this.activeConnections.set(connectionId, pathElement);
        }

        // 更新路径元素
        this.updatePathElement(pathElement, connection);
    }

    /**
     * 计算连接线路径
     */
    calculateConnectionPath(fromElement, toElement, connectionType) {
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // 计算连接点
        let startPoint, endPoint;
        
        if (connectionType === 'other') {
            // 他人消息：从消息左侧到头像右侧
            startPoint = {
                x: fromRect.left,
                y: fromRect.top + fromRect.height / 2
            };
            endPoint = {
                x: toRect.right,
                y: toRect.top + toRect.height / 2
            };
        } else {
            // 自己消息：从消息右侧到头像左侧
            startPoint = {
                x: fromRect.right,
                y: fromRect.top + fromRect.height / 2
            };
            endPoint = {
                x: toRect.left,
                y: toRect.top + toRect.height / 2
            };
        }

        // 生成L型路径with圆角
        return this.generateLShapedPath(startPoint, endPoint, connectionType);
    }

    /**
     * 生成L型连接路径
     */
    generateLShapedPath(start, end, connectionType) {
        const cornerRadius = 8;
        const offsetDistance = connectionType === 'other' ? -12 : 12;
        
        // 计算拐点
        const cornerX = start.x + offsetDistance;
        const cornerY = end.y;
        
        // 构建SVG路径
        let path = `M ${start.x} ${start.y}`;
        
        // 水平线到拐点
        if (Math.abs(offsetDistance) > cornerRadius) {
            const horizontalEnd = cornerX + (offsetDistance > 0 ? -cornerRadius : cornerRadius);
            path += ` L ${horizontalEnd} ${start.y}`;
            
            // 第一个圆角
            const verticalStart = start.y + (cornerY > start.y ? cornerRadius : -cornerRadius);
            path += ` Q ${cornerX} ${start.y} ${cornerX} ${verticalStart}`;
            
            // 垂直线
            if (Math.abs(cornerY - start.y) > 2 * cornerRadius) {
                const verticalEnd = cornerY + (cornerY > start.y ? -cornerRadius : cornerRadius);
                path += ` L ${cornerX} ${verticalEnd}`;
            }
            
            // 第二个圆角
            const horizontalStart = cornerX + (end.x > cornerX ? cornerRadius : -cornerRadius);
            path += ` Q ${cornerX} ${cornerY} ${horizontalStart} ${cornerY}`;
            
            // 最终水平线
            path += ` L ${end.x} ${end.y}`;
        } else {
            // 距离太近，直接连线
            path += ` L ${end.x} ${end.y}`;
        }
        
        return path;
    }

    /**
     * 创建或复用路径元素
     */
    createOrReusePathElement(connection) {
        // 尝试从池中复用
        let pathElement = this.connectionPool.pop();
        
        if (!pathElement) {
            // 创建新元素
            pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke-linecap', 'round');
            pathElement.setAttribute('stroke-linejoin', 'round');
        }
        
        // 添加到SVG
        this.svgElement.appendChild(pathElement);
        
        // 绑定到连接模型
        connection.bindElement(pathElement);
        
        return pathElement;
    }

    /**
     * 更新路径元素
     */
    updatePathElement(pathElement, connection) {
        // 基本属性
        pathElement.setAttribute('d', connection.path);
        pathElement.setAttribute('id', connection.getPathElementId());
        pathElement.setAttribute('class', connection.cssClass);
        
        // 样式属性
        const gradientId = connection.type === 'self' ? 'connectionGradientSelf' : 'connectionGradientOther';
        pathElement.setAttribute('stroke', `url(#${gradientId})`);
        pathElement.setAttribute('stroke-width', '2');
        pathElement.setAttribute('opacity', connection.isVisible ? '0.8' : '0');
        
        // 动画
        if (connection.isAnimated) {
            pathElement.classList.add('connection-path-animated');
        }
        
        // 数据属性
        Object.entries(NamingConventions.dataAttribute.connection).forEach(([key, attr]) => {
            const value = connection[key] || connection.id;
            pathElement.setAttribute(attr, value);
        });
    }

    /**
     * 队列化连接线渲染
     */
    queueConnectionRender(connectionId) {
        this.renderQueue.add(connectionId);
    }

    /**
     * 队列化所有连接线渲染
     */
    queueAllConnectionsRender() {
        systemState.connections.forEach((_, connectionId) => {
            this.renderQueue.add(connectionId);
        });
    }

    /**
     * 队列化可见连接线渲染
     */
    queueVisibleConnectionsRender() {
        systemState.connections.forEach((connection, connectionId) => {
            if (connection.isVisible && connection.isInViewport) {
                this.renderQueue.add(connectionId);
            }
        });
    }

    /**
     * 移除连接线渲染
     */
    removeConnectionFromRender(connectionId) {
        const pathElement = this.activeConnections.get(connectionId);
        if (pathElement) {
            // 移回池中复用
            if (this.connectionPool.length < this.config.poolSize) {
                pathElement.remove();
                this.connectionPool.push(pathElement);
            } else {
                pathElement.remove();
            }
            
            this.activeConnections.delete(connectionId);
        }
        
        // 从渲染队列移除
        this.renderQueue.delete(connectionId);
    }

    /**
     * 更新视窗信息
     */
    updateViewportInfo() {
        this.viewport.scrollX = window.pageXOffset;
        this.viewport.scrollY = window.pageYOffset;
    }

    /**
     * 执行视窗裁剪
     */
    performViewportCulling() {
        const margin = this.config.cullingMargin;
        const viewportRect = {
            left: this.viewport.scrollX - margin,
            top: this.viewport.scrollY - margin,
            right: this.viewport.scrollX + this.viewport.width + margin,
            bottom: this.viewport.scrollY + this.viewport.height + margin
        };

        systemState.connections.forEach((connection, connectionId) => {
            const fromElement = this.findElementById(connection.fromId);
            const toElement = this.findElementById(connection.toId);
            
            if (!fromElement || !toElement) {
                connection.isInViewport = false;
                return;
            }

            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            
            // 检查是否与视窗相交
            const isVisible = (
                fromRect.right >= viewportRect.left &&
                fromRect.left <= viewportRect.right &&
                fromRect.bottom >= viewportRect.top &&
                fromRect.top <= viewportRect.bottom
            ) || (
                toRect.right >= viewportRect.left &&
                toRect.left <= viewportRect.right &&
                toRect.bottom >= viewportRect.top &&
                toRect.top <= viewportRect.bottom
            );

            connection.isInViewport = isVisible;
            
            // 更新可见性
            const pathElement = this.activeConnections.get(connectionId);
            if (pathElement) {
                pathElement.style.display = isVisible ? 'block' : 'none';
            }
        });
    }

    /**
     * 根据性能调整渲染质量
     */
    adaptRenderingQuality(performance) {
        let quality = 'high';
        
        if (performance.fps < 30 || performance.memoryUsage > this.config.memoryThreshold) {
            quality = 'low';
        } else if (performance.fps < 45) {
            quality = 'medium';
        }
        
        // 应用质量设置
        systemState.connections.forEach(connection => {
            connection.setRenderQuality(quality);
        });
        
        // 更新配置
        if (quality === 'low') {
            this.config.renderBatchSize = Math.max(5, this.config.renderBatchSize / 2);
            this.config.updateThrottle = Math.min(50, this.config.updateThrottle * 2);
        } else {
            this.config.renderBatchSize = Math.min(20, this.config.renderBatchSize * 1.5);
            this.config.updateThrottle = Math.max(16, this.config.updateThrottle / 1.5);
        }
    }

    /**
     * 更新性能统计
     */
    updatePerformanceStats() {
        const stats = {
            connectionCount: systemState.connections.size,
            visibleConnections: Array.from(systemState.connections.values()).filter(c => c.isInViewport).length,
            renderQueueSize: this.renderQueue.size,
            poolSize: this.connectionPool.length,
            activeElements: this.activeConnections.size
        };

        systemState.updatePerformance(stats);
    }

    /**
     * 查找元素
     */
    findElementById(id) {
        // 尝试消息元素
        let element = document.querySelector(`[data-message-id="${id}"]`);
        if (element) return element;
        
        // 尝试头像元素
        element = document.querySelector(`[data-avatar-id="${id}"]`);
        if (element) return element;
        
        // 尝试用户ID查找头像
        element = document.querySelector(`[data-user-id="${id}"]`);
        return element;
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
        if (this.isDestroyed) return;
        
        // 停止渲染循环
        if (this.renderLoopId) {
            cancelAnimationFrame(this.renderLoopId);
        }
        
        // 移除事件监听
        window.removeEventListener('resize', this.handleResize);
        
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        // 清理DOM元素
        if (this.overlayContainer && this.overlayContainer.parentNode) {
            this.overlayContainer.parentNode.removeChild(this.overlayContainer);
        }
        
        // 清理引用
        this.activeConnections.clear();
        this.connectionPool.length = 0;
        this.renderQueue.clear();
        this.eventListeners.clear();
        
        this.isDestroyed = true;
        console.log('Connection Overlay Manager destroyed');
    }
}

// 创建全局实例
export const connectionOverlayManager = new ConnectionOverlayManager();