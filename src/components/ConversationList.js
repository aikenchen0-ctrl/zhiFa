/**
 * ConversationList.js - 高性能会话列表组件
 * 使用 PixiJS v8 实现支持1万个头像的流畅滚动和动态UI交互
 */

class ConversationList {
    constructor(options = {}) {
        this.app = null;
        this.container = null;
        this.avatarContainer = null;
        this.currentSessionFixedContainer = null;
        this.sessionInfoContainer = null;
        
        // 配置参数
        this.config = {
            avatarSize: options.avatarSize || 60,
            avatarSpacing: options.avatarSpacing || 80,
            maxAvatars: options.maxAvatars || 10000,
            viewportHeight: options.viewportHeight || 800,
            hoverTimeout: options.hoverTimeout || 5000,
            animationDuration: options.animationDuration || 300,
            scrollThreshold: options.scrollThreshold || 50,
            ...options
        };

        // 运行时状态
        this.state = {
            currentSessionIndex: 0,
            scrollPosition: 0,
            isScrolling: false,
            hoveredAvatar: null,
            hoverTimer: null,
            buttonsInserted: false,
            viewportStart: 0,
            viewportEnd: 0,
            sessionFixed: false
        };

        // 性能统计
        this.performance = {
            renderTime: 0,
            visibleAvatars: 0,
            totalFrames: 0,
            averageFPS: 0
        };

        // 数据存储
        this.avatars = [];
        this.avatarPool = [];
        this.visibleAvatars = new Map();
        
        this.logger = this.createLogger();
        this.initializeData();
    }

    /**
     * 创建详细日志系统
     */
    createLogger() {
        return {
            debug: (message, data = {}) => {
                console.log(`[ConversationList] ${message}`, data);
            },
            info: (message, data = {}) => {
                console.info(`[ConversationList] ${message}`, data);
            },
            warn: (message, data = {}) => {
                console.warn(`[ConversationList] ${message}`, data);
            },
            error: (message, error = {}) => {
                console.error(`[ConversationList] ${message}`, error);
            },
            performance: (operation, duration, additionalData = {}) => {
                console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`, additionalData);
            }
        };
    }

    /**
     * 初始化会话数据
     */
    initializeData() {
        this.logger.info('初始化会话数据', { maxAvatars: this.config.maxAvatars });
        
        const startTime = performance.now();
        
        // 生成测试数据
        const regions = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京'];
        const tags = ['工作', '朋友', '同事', '家人', '同学', '客户', '合作伙伴'];
        const avatarColors = [
            0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 
            0xFECA57, 0xFF9FF3, 0x54A0FF, 0x5F27CD
        ];

        for (let i = 0; i < this.config.maxAvatars; i++) {
            this.avatars.push({
                id: i,
                name: `用户${i + 1}`,
                region: regions[i % regions.length],
                tags: [tags[i % tags.length], tags[(i + 1) % tags.length]],
                lastMessage: `这是第${i + 1}条消息的预览内容...`,
                lastTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                avatarColor: avatarColors[i % avatarColors.length],
                isOnline: Math.random() > 0.3,
                unreadCount: Math.floor(Math.random() * 10)
            });
        }

        const initTime = performance.now() - startTime;
        this.logger.performance('数据初始化', initTime, { 
            avatarCount: this.avatars.length 
        });
    }

    /**
     * 初始化 PixiJS 应用
     */
    async init(parentElement) {
        try {
            this.logger.info('初始化 PixiJS 应用');
            
            // 创建 PixiJS 应用
            this.app = new PIXI.Application();
            await this.app.init({
                width: 100,
                height: this.config.viewportHeight,
                backgroundColor: 0xF5F5F5,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true
            });

            // 添加到DOM
            parentElement.appendChild(this.app.canvas);
            this.app.canvas.style.display = 'block';

            // 创建容器结构
            this.setupContainers();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 初始渲染
            this.updateViewport();
            
            // 启动性能监控
            this.startPerformanceMonitoring();
            
            this.logger.info('PixiJS 应用初始化完成');
            
        } catch (error) {
            this.logger.error('初始化失败', error);
            throw error;
        }
    }

    /**
     * 设置容器结构
     */
    setupContainers() {
        this.logger.debug('设置容器结构');

        // 主容器
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);

        // 头像滚动容器
        this.avatarContainer = new PIXI.Container();
        this.container.addChild(this.avatarContainer);

        // 当前会话固定容器
        this.currentSessionFixedContainer = new PIXI.Container();
        this.container.addChild(this.currentSessionFixedContainer);

        // 会话信息显示容器
        this.sessionInfoContainer = new PIXI.Container();
        this.sessionInfoContainer.visible = false;
        this.container.addChild(this.sessionInfoContainer);

        // 创建遮罩
        const mask = new PIXI.Graphics();
        mask.rect(0, 0, this.app.screen.width, this.app.screen.height);
        mask.fill(0xFFFFFF);
        this.avatarContainer.mask = mask;
        this.container.addChild(mask);
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        this.logger.debug('设置事件监听');

        // 滚动事件
        this.app.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleScroll(e.deltaY);
        }, { passive: false });

        // 鼠标事件
        this.app.canvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        this.app.canvas.addEventListener('mouseleave', () => {
            this.handleMouseLeave();
        });

        // 窗口调整事件
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * 创建圆角正方形头像
     */
    createAvatar(avatarData, index) {
        const avatar = new PIXI.Container();
        avatar.userData = { ...avatarData, index };

        const size = this.config.avatarSize;
        
        // 创建圆角背景
        const background = new PIXI.Graphics();
        background.roundRect(0, 0, size, size, 12);
        background.fill(avatarData.avatarColor);
        avatar.addChild(background);

        // 添加文字 (简化显示用户名首字符)
        const nameText = new PIXI.Text({
            text: avatarData.name.charAt(avatarData.name.length - 1),
            style: {
                fontSize: size * 0.4,
                fill: 0xFFFFFF,
                fontWeight: 'bold',
                fontFamily: 'Arial'
            }
        });
        nameText.anchor.set(0.5);
        nameText.x = size / 2;
        nameText.y = size / 2;
        avatar.addChild(nameText);

        // 在线状态指示器
        if (avatarData.isOnline) {
            const onlineIndicator = new PIXI.Graphics();
            onlineIndicator.circle(size - 8, size - 8, 4);
            onlineIndicator.fill(0x00FF00);
            avatar.addChild(onlineIndicator);
        }

        // 未读消息计数
        if (avatarData.unreadCount > 0) {
            const unreadBg = new PIXI.Graphics();
            unreadBg.circle(size - 8, 8, 8);
            unreadBg.fill(0xFF0000);
            avatar.addChild(unreadBg);

            const unreadText = new PIXI.Text({
                text: avatarData.unreadCount.toString(),
                style: {
                    fontSize: 10,
                    fill: 0xFFFFFF,
                    fontWeight: 'bold'
                }
            });
            unreadText.anchor.set(0.5);
            unreadText.x = size - 8;
            unreadText.y = 8;
            avatar.addChild(unreadText);
        }

        // 设置交互
        avatar.eventMode = 'static';
        avatar.cursor = 'pointer';

        // 鼠标事件
        avatar.on('pointerenter', () => this.handleAvatarHover(avatar, true));
        avatar.on('pointerleave', () => this.handleAvatarHover(avatar, false));
        avatar.on('pointerdown', () => this.handleAvatarClick(avatar));

        return avatar;
    }

    /**
     * 为当前会话添加特殊标识
     */
    addCurrentSessionIndicators(avatar) {
        if (!avatar.userData || avatar.userData.index !== this.state.currentSessionIndex) {
            return;
        }

        const size = this.config.avatarSize;

        // 下边缘三个点红色图标 (会话详细设置)
        const settingsIcon = new PIXI.Container();
        
        for (let i = 0; i < 3; i++) {
            const dot = new PIXI.Graphics();
            dot.circle(size / 2 - 8 + i * 8, size + 8, 2);
            dot.fill(0xFF0000);
            settingsIcon.addChild(dot);
        }
        
        settingsIcon.eventMode = 'static';
        settingsIcon.cursor = 'pointer';
        settingsIcon.on('pointerdown', () => this.handleSettingsClick(avatar));
        avatar.addChild(settingsIcon);

        // 上边缘眼睛图标 (用户画像)
        const profileIcon = new PIXI.Graphics();
        
        // 绘制简化的眼睛图标
        profileIcon.roundRect(size / 2 - 8, -12, 16, 8, 4);
        profileIcon.fill(0x333333);
        
        // 眼球
        profileIcon.circle(size / 2 - 3, -8, 2);
        profileIcon.fill(0xFFFFFF);
        profileIcon.circle(size / 2 + 3, -8, 2);
        profileIcon.fill(0xFFFFFF);
        
        profileIcon.eventMode = 'static';
        profileIcon.cursor = 'pointer';
        profileIcon.on('pointerdown', () => this.handleProfileClick(avatar));
        avatar.addChild(profileIcon);

        this.logger.debug('添加当前会话特殊标识', { 
            sessionIndex: this.state.currentSessionIndex 
        });
    }

    /**
     * 创建悬停按钮
     */
    createHoverButtons() {
        const buttonContainer = new PIXI.Container();
        const size = this.config.avatarSize;

        // 转发按钮
        const forwardButton = this.createButton('转发', 0x4CAF50, size);
        forwardButton.y = -80;
        forwardButton.on('pointerdown', () => this.handleForwardClick());
        buttonContainer.addChild(forwardButton);

        // 朋友圈按钮
        const momentButton = this.createButton('朋友圈', 0x2196F3, size);
        momentButton.y = size + 20;
        momentButton.on('pointerdown', () => this.handleMomentClick());
        buttonContainer.addChild(momentButton);

        return buttonContainer;
    }

    /**
     * 创建单个按钮
     */
    createButton(text, color, avatarSize) {
        const button = new PIXI.Container();
        
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, avatarSize, 30, 15);
        bg.fill(color);
        button.addChild(bg);

        const buttonText = new PIXI.Text({
            text: text,
            style: {
                fontSize: 12,
                fill: 0xFFFFFF,
                fontWeight: 'bold'
            }
        });
        buttonText.anchor.set(0.5);
        buttonText.x = avatarSize / 2;
        buttonText.y = 15;
        button.addChild(buttonText);

        button.eventMode = 'static';
        button.cursor = 'pointer';

        return button;
    }

    /**
     * 更新视口显示
     */
    updateViewport() {
        const startTime = performance.now();
        
        const itemHeight = this.config.avatarSpacing;
        const viewportHeight = this.config.viewportHeight;
        
        // 计算可见范围
        this.state.viewportStart = Math.floor(Math.max(0, this.state.scrollPosition - viewportHeight) / itemHeight);
        this.state.viewportEnd = Math.ceil((this.state.scrollPosition + viewportHeight * 2) / itemHeight);
        this.state.viewportEnd = Math.min(this.state.viewportEnd, this.avatars.length);

        // 清除不可见的头像
        this.clearInvisibleAvatars();

        // 渲染可见头像
        this.renderVisibleAvatars();

        // 更新当前会话固定位置
        this.updateCurrentSessionFixed();

        const renderTime = performance.now() - startTime;
        this.performance.renderTime = renderTime;
        this.performance.visibleAvatars = this.visibleAvatars.size;

        this.logger.debug('视口更新完成', {
            scrollPosition: this.state.scrollPosition,
            viewportStart: this.state.viewportStart,
            viewportEnd: this.state.viewportEnd,
            visibleCount: this.performance.visibleAvatars,
            renderTime: renderTime.toFixed(2)
        });
    }

    /**
     * 清除不可见的头像
     */
    clearInvisibleAvatars() {
        for (const [index, avatar] of this.visibleAvatars) {
            if (index < this.state.viewportStart || index >= this.state.viewportEnd) {
                this.avatarContainer.removeChild(avatar);
                this.avatarPool.push(avatar);
                this.visibleAvatars.delete(index);
            }
        }
    }

    /**
     * 渲染可见头像
     */
    renderVisibleAvatars() {
        for (let i = this.state.viewportStart; i < this.state.viewportEnd; i++) {
            if (!this.visibleAvatars.has(i) && this.avatars[i]) {
                const avatar = this.createAvatar(this.avatars[i], i);
                
                // 设置位置
                avatar.y = i * this.config.avatarSpacing - this.state.scrollPosition;
                
                // 添加当前会话特殊标识
                if (i === this.state.currentSessionIndex) {
                    this.addCurrentSessionIndicators(avatar);
                }
                
                this.avatarContainer.addChild(avatar);
                this.visibleAvatars.set(i, avatar);
            } else if (this.visibleAvatars.has(i)) {
                // 更新现有头像位置
                const avatar = this.visibleAvatars.get(i);
                avatar.y = i * this.config.avatarSpacing - this.state.scrollPosition;
            }
        }
    }

    /**
     * 更新当前会话固定位置
     */
    updateCurrentSessionFixed() {
        if (this.state.sessionFixed) {
            // 当前会话需要固定时的逻辑
            const currentAvatar = this.visibleAvatars.get(this.state.currentSessionIndex);
            if (currentAvatar) {
                // 将当前会话头像移动到固定容器
                // 这里实现固定逻辑
            }
        }
    }

    /**
     * 处理滚动事件
     */
    handleScroll(delta) {
        const oldPosition = this.state.scrollPosition;
        this.state.scrollPosition += delta;
        
        // 边界检查
        const maxScroll = Math.max(0, this.avatars.length * this.config.avatarSpacing - this.config.viewportHeight);
        this.state.scrollPosition = Math.max(0, Math.min(this.state.scrollPosition, maxScroll));

        // 检查是否需要固定当前会话
        this.checkSessionFixing();

        // 更新滚动状态
        this.state.isScrolling = true;
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.state.isScrolling = false;
            this.hideSessionInfo();
        }, 150);

        // 显示会话信息
        this.showSessionInfo();

        // 更新视口
        if (Math.abs(this.state.scrollPosition - oldPosition) > this.config.scrollThreshold) {
            this.updateViewport();
        }

        this.logger.debug('滚动事件处理', {
            delta,
            oldPosition,
            newPosition: this.state.scrollPosition,
            isScrolling: this.state.isScrolling
        });
    }

    /**
     * 检查会话固定逻辑
     */
    checkSessionFixing() {
        const currentAvatarY = this.state.currentSessionIndex * this.config.avatarSpacing - this.state.scrollPosition;
        const shouldFix = currentAvatarY < -this.config.avatarSize || currentAvatarY > this.config.viewportHeight;
        
        if (shouldFix !== this.state.sessionFixed) {
            this.state.sessionFixed = shouldFix;
            this.logger.debug('会话固定状态变化', { 
                sessionFixed: this.state.sessionFixed,
                currentAvatarY 
            });
        }
    }

    /**
     * 处理头像悬停
     */
    handleAvatarHover(avatar, isEntering) {
        if (isEntering) {
            this.state.hoveredAvatar = avatar;
            
            // 启动悬停计时器
            clearTimeout(this.state.hoverTimer);
            this.state.hoverTimer = setTimeout(() => {
                this.insertHoverButtons(avatar);
            }, this.config.hoverTimeout);
            
            this.logger.debug('开始悬停', { 
                avatarIndex: avatar.userData.index,
                timeout: this.config.hoverTimeout 
            });
            
        } else {
            // 清除悬停状态
            clearTimeout(this.state.hoverTimer);
            if (this.state.hoveredAvatar === avatar) {
                this.state.hoveredAvatar = null;
            }
            
            // 移除按钮
            this.removeHoverButtons();
            
            this.logger.debug('结束悬停', { 
                avatarIndex: avatar.userData.index 
            });
        }
    }

    /**
     * 插入悬停按钮
     */
    insertHoverButtons(avatar) {
        if (this.state.buttonsInserted) {
            return;
        }

        this.logger.info('插入悬停按钮', { 
            avatarIndex: avatar.userData.index 
        });

        const buttons = this.createHoverButtons();
        buttons.x = avatar.x;
        buttons.y = avatar.y;
        
        // 添加按钮插入动画
        buttons.alpha = 0;
        buttons.scale.set(0.8);
        
        this.avatarContainer.addChild(buttons);
        
        // 执行插入动画
        this.animateButtonInsertion(buttons, avatar);
        
        this.state.buttonsInserted = true;
    }

    /**
     * 按钮插入动画
     */
    animateButtonInsertion(buttons, targetAvatar) {
        const startTime = performance.now();
        
        // 挤开其他头像的动画
        this.animateAvatarDisplacement(targetAvatar);
        
        // 按钮淡入动画
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / this.config.animationDuration, 1);
            
            buttons.alpha = progress;
            buttons.scale.set(0.8 + 0.2 * progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * 头像挤开动画
     */
    animateAvatarDisplacement(targetAvatar) {
        const targetIndex = targetAvatar.userData.index;
        
        for (const [index, avatar] of this.visibleAvatars) {
            if (index === targetIndex) continue;
            
            let displacement = 0;
            if (index === targetIndex - 1) {
                displacement = -40; // 上方头像向上挤
            } else if (index === targetIndex + 1) {
                displacement = 40;  // 下方头像向下挤
            }
            
            if (displacement !== 0) {
                // 简化的挤开效果
                avatar.y += displacement;
            }
        }
    }

    /**
     * 移除悬停按钮
     */
    removeHoverButtons() {
        if (!this.state.buttonsInserted) {
            return;
        }

        // 恢复头像位置
        this.updateViewport();
        
        this.state.buttonsInserted = false;
        this.logger.debug('移除悬停按钮');
    }

    /**
     * 显示会话信息
     */
    showSessionInfo() {
        if (this.state.isScrolling) {
            const currentIndex = Math.floor((this.state.scrollPosition + this.config.viewportHeight / 2) / this.config.avatarSpacing);
            const sessionData = this.avatars[currentIndex];
            
            if (sessionData) {
                this.renderSessionInfo(sessionData);
                this.sessionInfoContainer.visible = true;
            }
        }
    }

    /**
     * 渲染会话信息
     */
    renderSessionInfo(sessionData) {
        this.sessionInfoContainer.removeChildren();
        
        const bg = new PIXI.Graphics();
        bg.roundRect(10, this.config.viewportHeight - 150, this.app.screen.width - 20, 140, 10);
        bg.fill(0x000000, 0.8);
        this.sessionInfoContainer.addChild(bg);

        const infoText = new PIXI.Text({
            text: `${sessionData.name}\n${sessionData.region} | ${sessionData.tags.join(', ')}\n${sessionData.lastTime.toLocaleString()}\n${sessionData.lastMessage}`,
            style: {
                fontSize: 14,
                fill: 0xFFFFFF,
                wordWrap: true,
                wordWrapWidth: this.app.screen.width - 40,
                leading: 4
            }
        });
        infoText.x = 20;
        infoText.y = this.config.viewportHeight - 140;
        this.sessionInfoContainer.addChild(infoText);
    }

    /**
     * 隐藏会话信息
     */
    hideSessionInfo() {
        this.sessionInfoContainer.visible = false;
    }

    /**
     * 事件处理函数
     */
    handleAvatarClick(avatar) {
        this.state.currentSessionIndex = avatar.userData.index;
        this.updateViewport();
        this.logger.info('切换当前会话', { 
            newSessionIndex: this.state.currentSessionIndex,
            sessionName: avatar.userData.name 
        });
    }

    handleSettingsClick(avatar) {
        this.logger.info('打开会话设置', { 
            sessionIndex: avatar.userData.index 
        });
    }

    handleProfileClick(avatar) {
        this.logger.info('查看用户画像', { 
            sessionIndex: avatar.userData.index 
        });
    }

    handleForwardClick() {
        this.logger.info('转发操作');
    }

    handleMomentClick() {
        this.logger.info('朋友圈操作');
    }

    handleMouseMove(e) {
        // 更新鼠标位置用于其他交互
    }

    handleMouseLeave() {
        this.removeHoverButtons();
    }

    handleResize() {
        this.app.renderer.resize(this.app.canvas.clientWidth, this.config.viewportHeight);
        this.updateViewport();
    }

    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();

        const updatePerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.performance.averageFPS = frameCount;
                this.performance.totalFrames += frameCount;
                
                this.logger.performance('FPS监控', this.performance.averageFPS, {
                    visibleAvatars: this.performance.visibleAvatars,
                    renderTime: this.performance.renderTime,
                    scrollPosition: this.state.scrollPosition
                });
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(updatePerformance);
        };
        
        requestAnimationFrame(updatePerformance);
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        return {
            ...this.performance,
            memoryUsage: {
                visibleAvatars: this.visibleAvatars.size,
                pooledAvatars: this.avatarPool.length,
                totalAvatars: this.avatars.length
            }
        };
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.logger.info('销毁ConversationList组件');
        
        // 清理计时器
        clearTimeout(this.state.hoverTimer);
        clearTimeout(this.scrollTimeout);
        
        // 清理容器
        if (this.container) {
            this.container.destroy({ children: true });
        }
        
        // 销毁应用
        if (this.app) {
            this.app.destroy(true);
        }
        
        // 清理数据
        this.avatars = [];
        this.avatarPool = [];
        this.visibleAvatars.clear();
    }

    /**
     * 设置当前会话
     */
    setCurrentSession(index) {
        if (index >= 0 && index < this.avatars.length) {
            this.state.currentSessionIndex = index;
            this.updateViewport();
            this.logger.info('设置当前会话', { sessionIndex: index });
        }
    }

    /**
     * 滚动到指定会话
     */
    scrollToSession(index) {
        if (index >= 0 && index < this.avatars.length) {
            this.state.scrollPosition = index * this.config.avatarSpacing;
            this.updateViewport();
            this.logger.info('滚动到指定会话', { sessionIndex: index });
        }
    }
}

// 导出组件
window.ConversationList = ConversationList;

// 使用示例
/*
const conversationList = new ConversationList({
    avatarSize: 60,
    avatarSpacing: 80,
    maxAvatars: 10000,
    viewportHeight: 800,
    hoverTimeout: 5000
});

conversationList.init(document.getElementById('conversation-container'));
*/