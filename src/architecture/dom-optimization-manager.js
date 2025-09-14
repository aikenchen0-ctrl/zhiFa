/**
 * DOM Optimization Manager - DOM结构优化管理器
 * 专门优化大量元素的DOM渲染性能，支持1000+元素的流畅显示
 * 
 * 核心优化策略：
 * 1. 虚拟滚动 - 只渲染可见区域的元素
 * 2. 元素池化 - 复用DOM元素减少创建销毁开销
 * 3. 批量操作 - 减少DOM操作次数
 * 4. 懒加载 - 按需加载非关键内容
 * 5. 内存管理 - 及时回收不需要的资源
 */

import { systemState } from './data-structures.js';
import NamingConventions from './naming-conventions.js';

export class DOMOptimizationManager {
    constructor() {
        // 虚拟滚动配置
        this.virtualScrollConfig = {
            itemHeight: 60,              // 头像元素高度
            messageHeight: 80,           // 消息元素高度  
            visibleItems: 20,            // 可见元素数量
            bufferItems: 5,              // 缓冲元素数量
            scrollThreshold: 100         // 滚动更新阈值(px)
        };
        
        // 元素池配置
        this.poolConfig = {
            avatarPoolSize: 50,          // 头像元素池大小
            messagePoolSize: 100,        // 消息元素池大小
            connectionPoolSize: 200,     // 连接线元素池大小
            poolGrowthRate: 0.5          // 池扩容比例
        };
        
        // 元素池
        this.elementPools = {
            avatars: [],
            messages: [],
            connections: []
        };
        
        // 虚拟滚动状态
        this.scrollStates = {
            conversation: {
                scrollTop: 0,
                startIndex: 0,
                endIndex: 0,
                items: []
            },
            messages: {
                scrollTop: 0,
                startIndex: 0,
                endIndex: 0,
                items: []
            },
            accounts: {
                scrollTop: 0,
                startIndex: 0,
                endIndex: 0,
                items: []
            }
        };
        
        // 渲染队列
        this.renderQueue = {
            avatars: new Set(),
            messages: new Set(),
            connections: new Set()
        };
        
        // DOM容器引用
        this.containers = {
            conversation: null,
            messages: null,
            accounts: null
        };
        
        // 性能监控
        this.performanceStats = {
            totalElements: 0,
            renderedElements: 0,
            pooledElements: 0,
            renderTime: 0,
            memoryUsage: 0
        };
        
        // 状态标志
        this.isInitialized = false;
        this.isDestroyed = false;
        this.renderLoopId = null;
        
        // 绑定方法上下文
        this.handleScroll = this.handleScroll.bind(this);
        this.renderLoop = this.renderLoop.bind(this);
    }

    /**
     * 初始化DOM优化管理器
     */
    initialize() {
        if (this.isInitialized) return;
        
        try {
            // 获取容器引用
            this.initializeContainers();
            
            // 初始化元素池
            this.initializeElementPools();
            
            // 设置虚拟滚动
            this.setupVirtualScrolling();
            
            // 启动渲染循环
            this.startRenderLoop();
            
            // 设置事件监听
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('DOM Optimization Manager initialized');
        } catch (error) {
            console.error('Failed to initialize DOM Optimization Manager:', error);
            throw error;
        }
    }

    /**
     * 初始化容器引用
     */
    initializeContainers() {
        this.containers.conversation = document.getElementById(NamingConventions.elementId.containers.conversation);
        this.containers.messages = document.getElementById(NamingConventions.elementId.containers.messages);
        this.containers.accounts = document.getElementById(NamingConventions.elementId.containers.accounts);
        
        // 确保容器存在
        Object.entries(this.containers).forEach(([name, container]) => {
            if (!container) {
                console.warn(`Container ${name} not found, virtual scrolling disabled for this container`);
            }
        });
    }

    /**
     * 初始化元素池
     */
    initializeElementPools() {
        // 预创建头像元素
        this.elementPools.avatars = this.createElementPool(
            this.poolConfig.avatarPoolSize,
            () => this.createAvatarElement()
        );
        
        // 预创建消息元素
        this.elementPools.messages = this.createElementPool(
            this.poolConfig.messagePoolSize,
            () => this.createMessageElement()
        );
        
        console.log('Element pools initialized:', {
            avatars: this.elementPools.avatars.length,
            messages: this.elementPools.messages.length
        });
    }

    /**
     * 创建元素池
     */
    createElementPool(size, createElement) {
        const pool = [];
        for (let i = 0; i < size; i++) {
            const element = createElement();
            element.style.display = 'none';
            element.dataset.pooled = 'true';
            pool.push(element);
        }
        return pool;
    }

    /**
     * 创建头像元素模板
     */
    createAvatarElement() {
        const avatar = document.createElement('div');
        avatar.className = NamingConventions.cssClass.avatar.base;
        
        const img = document.createElement('img');
        img.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.2);
        `;
        
        avatar.appendChild(img);
        
        // 性能优化属性
        avatar.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            position: relative;
            flex-shrink: 0;
            will-change: transform;
            contain: layout style paint;
        `;
        
        return avatar;
    }

    /**
     * 创建消息元素模板
     */
    createMessageElement() {
        const message = document.createElement('div');
        message.className = NamingConventions.cssClass.message.base;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.style.cssText = `
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        `;
        
        message.appendChild(content);
        
        // 性能优化属性
        message.style.cssText = `
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            position: relative;
            margin: 4px 0;
            will-change: transform;
            contain: layout style paint;
        `;
        
        return message;
    }

    /**
     * 设置虚拟滚动
     */
    setupVirtualScrolling() {
        Object.entries(this.containers).forEach(([containerName, container]) => {
            if (!container) return;
            
            // 创建虚拟滚动区域
            const scrollArea = this.createVirtualScrollArea(containerName);
            container.appendChild(scrollArea);
            
            // 设置滚动监听
            container.addEventListener('scroll', (e) => this.handleScroll(e, containerName), {
                passive: true
            });
        });
    }

    /**
     * 创建虚拟滚动区域
     */
    createVirtualScrollArea(containerName) {
        const scrollArea = document.createElement('div');
        scrollArea.className = `virtual-scroll-${containerName}`;
        scrollArea.style.cssText = `
            height: 100%;
            width: 100%;
            overflow: visible;
            position: relative;
        `;
        
        // 创建可见区域容器
        const visibleArea = document.createElement('div');
        visibleArea.className = `visible-area-${containerName}`;
        visibleArea.style.cssText = `
            position: relative;
            will-change: transform;
        `;
        
        scrollArea.appendChild(visibleArea);
        
        return scrollArea;
    }

    /**
     * 处理滚动事件
     */
    handleScroll(event, containerName) {
        const container = event.target;
        const scrollState = this.scrollStates[containerName];
        
        // 更新滚动位置
        scrollState.scrollTop = container.scrollTop;
        
        // 计算可见范围
        const itemHeight = containerName === 'messages' 
            ? this.virtualScrollConfig.messageHeight 
            : this.virtualScrollConfig.itemHeight;
            
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const bufferCount = this.virtualScrollConfig.bufferItems;
        
        const startIndex = Math.max(0, Math.floor(scrollState.scrollTop / itemHeight) - bufferCount);
        const endIndex = Math.min(scrollState.items.length - 1, startIndex + visibleCount + 2 * bufferCount);
        
        // 检查是否需要更新渲染
        if (startIndex !== scrollState.startIndex || endIndex !== scrollState.endIndex) {
            scrollState.startIndex = startIndex;
            scrollState.endIndex = endIndex;
            
            // 队列化重新渲染
            this.queueVirtualScrollUpdate(containerName);
        }
    }

    /**
     * 队列化虚拟滚动更新
     */
    queueVirtualScrollUpdate(containerName) {
        if (containerName === 'messages') {
            // 消息容器
            const messageIds = Array.from(systemState.messages.keys());
            const scrollState = this.scrollStates.messages;
            
            for (let i = scrollState.startIndex; i <= scrollState.endIndex; i++) {
                if (messageIds[i]) {
                    this.renderQueue.messages.add(messageIds[i]);
                }
            }
        } else {
            // 头像容器
            const avatarIds = Array.from(systemState.avatars.values())
                .filter(avatar => avatar.container === containerName)
                .map(avatar => avatar.id);
            
            const scrollState = this.scrollStates[containerName];
            
            for (let i = scrollState.startIndex; i <= scrollState.endIndex; i++) {
                if (avatarIds[i]) {
                    this.renderQueue.avatars.add(avatarIds[i]);
                }
            }
        }
    }

    /**
     * 从池中获取元素
     */
    getElementFromPool(type) {
        const pool = this.elementPools[type];
        if (pool.length > 0) {
            return pool.pop();
        }
        
        // 池已空，创建新元素或扩展池
        return this.expandPool(type);
    }

    /**
     * 扩展元素池
     */
    expandPool(type) {
        const createFunctions = {
            avatars: () => this.createAvatarElement(),
            messages: () => this.createMessageElement()
        };
        
        const createFunction = createFunctions[type];
        if (!createFunction) return null;
        
        // 扩展池大小
        const currentSize = this.elementPools[type].length;
        const growthSize = Math.ceil(currentSize * this.poolConfig.poolGrowthRate);
        
        for (let i = 0; i < growthSize; i++) {
            const element = createFunction();
            this.elementPools[type].push(element);
        }
        
        console.log(`Expanded ${type} pool by ${growthSize} elements`);
        return this.elementPools[type].pop();
    }

    /**
     * 将元素返回池中
     */
    returnElementToPool(element, type) {
        if (!element) return;
        
        // 清理元素状态
        element.style.display = 'none';
        element.dataset.pooled = 'true';
        element.removeAttribute('id');
        element.className = type === 'avatars' 
            ? NamingConventions.cssClass.avatar.base
            : NamingConventions.cssClass.message.base;
        
        // 清理数据属性
        Object.keys(element.dataset).forEach(key => {
            if (key !== 'pooled') {
                delete element.dataset[key];
            }
        });
        
        // 清理样式
        element.style.anchorName = '';
        element.removeAttribute('style');
        
        // 移除父节点
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        
        // 返回池中
        this.elementPools[type].push(element);
    }

    /**
     * 批量渲染元素
     */
    batchRenderElements(type, ids) {
        const fragment = document.createDocumentFragment();
        const renderedElements = [];
        
        ids.forEach(id => {
            const element = this.renderSingleElement(type, id);
            if (element) {
                fragment.appendChild(element);
                renderedElements.push(element);
            }
        });
        
        // 批量插入DOM
        if (renderedElements.length > 0) {
            const targetContainer = this.getTargetContainer(type);
            if (targetContainer) {
                targetContainer.appendChild(fragment);
            }
        }
        
        return renderedElements;
    }

    /**
     * 渲染单个元素
     */
    renderSingleElement(type, id) {
        if (type === 'avatars') {
            return this.renderAvatar(id);
        } else if (type === 'messages') {
            return this.renderMessage(id);
        }
        return null;
    }

    /**
     * 渲染头像元素
     */
    renderAvatar(avatarId) {
        const avatar = systemState.avatars.get(avatarId);
        const user = systemState.users.get(avatar?.userId);
        
        if (!avatar || !user) return null;
        
        // 从池中获取元素
        const element = this.getElementFromPool('avatars');
        if (!element) return null;
        
        // 设置元素内容
        const img = element.querySelector('img');
        if (img) {
            img.src = user.avatar || '/default-avatar.png';
            img.alt = user.getDisplayName();
        }
        
        // 设置数据属性
        element.dataset.avatarId = avatar.id;
        element.dataset.userId = avatar.userId;
        element.dataset.avatarType = avatar.container;
        element.dataset.container = avatar.container;
        element.dataset.pooled = 'false';
        
        // 设置样式
        element.id = avatar.getElementId();
        element.style.anchorName = avatar.anchorName;
        element.style.display = 'block';
        
        // 设置CSS类
        element.className = `${NamingConventions.cssClass.avatar.base} ${avatar.container === 'conversation' 
            ? NamingConventions.cssClass.avatar.conversation 
            : NamingConventions.cssClass.avatar.account}`;
        
        // 绑定到数据模型
        avatar.bindElement(element);
        
        return element;
    }

    /**
     * 渲染消息元素
     */
    renderMessage(messageId) {
        const message = systemState.messages.get(messageId);
        const user = systemState.users.get(message?.senderId);
        
        if (!message || !user) return null;
        
        // 从池中获取元素
        const element = this.getElementFromPool('messages');
        if (!element) return null;
        
        // 设置元素内容
        const contentDiv = element.querySelector('.message-content');
        if (contentDiv) {
            contentDiv.textContent = message.content;
        }
        
        // 设置数据属性
        element.dataset.messageId = message.id;
        element.dataset.senderId = message.senderId;
        element.dataset.messageType = message.getMessageType(systemState.currentUserId);
        element.dataset.timestamp = message.timestamp.toISOString();
        element.dataset.container = 'messages';
        element.dataset.pooled = 'false';
        
        // 设置样式
        element.id = NamingConventions.elementId.message(message.id);
        element.style.anchorName = NamingConventions.anchor.messageBubble(message.id);
        element.style.display = 'block';
        
        // 设置CSS类
        const messageType = message.getMessageType(systemState.currentUserId);
        element.className = `${NamingConventions.cssClass.message.base} ${messageType === 'self' 
            ? NamingConventions.cssClass.message.self 
            : NamingConventions.cssClass.message.other}`;
        
        return element;
    }

    /**
     * 获取目标容器
     */
    getTargetContainer(type) {
        if (type === 'messages') {
            return this.containers.messages?.querySelector('.visible-area-messages');
        }
        
        // 头像容器需要根据具体类型确定
        return null;
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
        
        const startTime = performance.now();
        
        // 处理头像渲染队列
        if (this.renderQueue.avatars.size > 0) {
            const avatarIds = Array.from(this.renderQueue.avatars).slice(0, 10);
            this.batchRenderElements('avatars', avatarIds);
            avatarIds.forEach(id => this.renderQueue.avatars.delete(id));
        }
        
        // 处理消息渲染队列
        if (this.renderQueue.messages.size > 0) {
            const messageIds = Array.from(this.renderQueue.messages).slice(0, 10);
            this.batchRenderElements('messages', messageIds);
            messageIds.forEach(id => this.renderQueue.messages.delete(id));
        }
        
        // 更新性能统计
        this.performanceStats.renderTime = performance.now() - startTime;
        this.performanceStats.totalElements = systemState.messages.size + systemState.avatars.size;
        this.performanceStats.renderedElements = document.querySelectorAll('[data-pooled="false"]').length;
        this.performanceStats.pooledElements = Object.values(this.elementPools).reduce((sum, pool) => sum + pool.length, 0);
        
        // 继续下一帧
        this.renderLoopId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听系统状态变化
        systemState.on('messageAdded', (message) => {
            this.renderQueue.messages.add(message.id);
        });
        
        systemState.on('avatarAdded', (avatar) => {
            this.renderQueue.avatars.add(avatar.id);
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            // 重新计算虚拟滚动参数
            this.recalculateVirtualScrolling();
        }, { passive: true });
        
        // 监听内存压力
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                const memoryPressure = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
                
                if (memoryPressure > 0.8) {
                    this.performMemoryCleanup();
                }
            }, 5000);
        }
    }

    /**
     * 重新计算虚拟滚动参数
     */
    recalculateVirtualScrolling() {
        Object.entries(this.containers).forEach(([containerName, container]) => {
            if (!container) return;
            
            const scrollState = this.scrollStates[containerName];
            const itemHeight = containerName === 'messages' 
                ? this.virtualScrollConfig.messageHeight 
                : this.virtualScrollConfig.itemHeight;
            
            const containerHeight = container.clientHeight;
            const visibleCount = Math.ceil(containerHeight / itemHeight);
            
            // 更新可见元素数量
            this.virtualScrollConfig.visibleItems = visibleCount;
            
            // 触发重新渲染
            this.queueVirtualScrollUpdate(containerName);
        });
    }

    /**
     * 执行内存清理
     */
    performMemoryCleanup() {
        console.log('Performing memory cleanup...');
        
        // 清理未使用的池元素
        Object.entries(this.elementPools).forEach(([type, pool]) => {
            const targetSize = Math.floor(pool.length * 0.7);
            while (pool.length > targetSize) {
                const element = pool.pop();
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        });
        
        // 强制垃圾回收（如果支持）
        if (window.gc) {
            window.gc();
        }
        
        console.log('Memory cleanup completed');
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * 销毁DOM优化管理器
     */
    destroy() {
        if (this.isDestroyed) return;
        
        // 停止渲染循环
        if (this.renderLoopId) {
            cancelAnimationFrame(this.renderLoopId);
        }
        
        // 清理元素池
        Object.values(this.elementPools).forEach(pool => {
            pool.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            pool.length = 0;
        });
        
        // 清理渲染队列
        Object.values(this.renderQueue).forEach(queue => queue.clear());
        
        this.isDestroyed = true;
        console.log('DOM Optimization Manager destroyed');
    }
}

// 创建全局实例
export const domOptimizationManager = new DOMOptimizationManager();