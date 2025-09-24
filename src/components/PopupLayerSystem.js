/**
 * PopupLayerSystem.js - 连线异形弹出层系统
 * 基于PixiJS v8实现，支持多层级气泡弹出、动态布局和连接线系统
 */

class PopupLayerSystem {
    constructor(app, options = {}) {
        this.app = app;
        this.options = {
            enableDebugLogs: true,
            bubbleAnimationDuration: 300,
            connectionLineWidth: 3,
            connectionLineColor: 0x00AAFF,
            maxSubBubbles: 8,
            maxSubSubBubbles: 6,
            bubbleSpacing: 80,
            verticalSpacing: 60,
            ...options
        };
        
        // 系统容器
        this.systemContainer = null;
        this.connectionLayer = null;
        this.bubbleLayer = null;
        
        // 弹出层状态
        this.activePopups = new Map(); // 存储所有活跃的弹出层
        this.triggerElements = new Map(); // 存储触发元素的信息
        this.connections = []; // 存储所有连接线
        
        // 布局计算
        this.layoutConfig = {
            leftSideThreshold: this.app.screen.width / 2,
            topMargin: 50,
            bottomMargin: 50,
            sideMargin: 50
        };
        
        this.init();
        this.log('弹出层系统初始化完成', 'success');
    }
    
    /**
     * 系统初始化
     */
    init() {
        // 创建系统层级结构
        this.systemContainer = new PIXI.Container();
        this.systemContainer.name = 'PopupSystem';
        this.app.stage.addChild(this.systemContainer);
        
        // 创建连接线层（底层）
        this.connectionLayer = new PIXI.Container();
        this.connectionLayer.name = 'ConnectionLayer';
        this.systemContainer.addChild(this.connectionLayer);
        
        // 创建气泡层（顶层）
        this.bubbleLayer = new PIXI.Container();
        this.bubbleLayer.name = 'BubbleLayer';
        this.systemContainer.addChild(this.bubbleLayer);
        
        // 设置全局点击监听
        this.setupGlobalClickHandler();
        
        this.log('系统层级创建完成', 'checkpoint');
    }
    
    /**
     * 注册触发元素
     */
    registerTrigger(element, popupConfig) {
        if (!element || !popupConfig) {
            this.log('注册触发元素失败：缺少必要参数', 'error');
            return;
        }
        
        const triggerId = `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 配置触发元素
        element.interactive = true;
        element.cursor = 'pointer';
        element.popupTriggerId = triggerId;
        
        // 存储触发配置
        this.triggerElements.set(triggerId, {
            element: element,
            config: popupConfig,
            isActive: false
        });
        
        // 绑定点击事件
        element.on('pointerdown', (event) => {
            event.stopPropagation();
            this.handleTriggerClick(triggerId, event);
        });
        
        this.log(`触发元素注册成功: ${triggerId}`, 'normal');
        return triggerId;
    }
    
    /**
     * 处理触发元素点击
     */
    handleTriggerClick(triggerId, event) {
        const triggerInfo = this.triggerElements.get(triggerId);
        if (!triggerInfo) return;
        
        // 如果已经激活，则关闭
        if (triggerInfo.isActive) {
            this.closePopup(triggerId);
            return;
        }
        
        // 关闭其他弹出层
        this.closeAllPopups();
        
        // 创建新的弹出层
        this.createPopup(triggerId);
        
        this.log(`触发弹出层: ${triggerId}`, 'checkpoint');
    }
    
    /**
     * 创建弹出层
     */
    createPopup(triggerId) {
        const triggerInfo = this.triggerElements.get(triggerId);
        if (!triggerInfo) return;
        
        const { element, config } = triggerInfo;
        const triggerPos = element.getGlobalPosition();
        
        // 计算布局方向
        const layoutDirection = this.calculateLayoutDirection(triggerPos);
        
        // 创建主弹出层容器
        const popupContainer = new PIXI.Container();
        popupContainer.name = `popup_${triggerId}`;
        this.bubbleLayer.addChild(popupContainer);
        
        // 创建主气泡
        const mainBubble = this.createMainBubble(config, layoutDirection);
        popupContainer.addChild(mainBubble);
        
        // 计算主气泡位置
        const mainBubblePos = this.calculateMainBubblePosition(triggerPos, layoutDirection, mainBubble);
        popupContainer.x = mainBubblePos.x;
        popupContainer.y = mainBubblePos.y;
        
        // 创建子气泡（水平分布）
        const subBubbles = this.createSubBubbles(config.subBubbles || [], layoutDirection, mainBubble);
        subBubbles.forEach(bubble => popupContainer.addChild(bubble));
        
        // 创建副气泡（垂直分布）
        const sideBubbles = this.createSideBubbles(config.sideBubbles || [], mainBubble);
        sideBubbles.forEach(bubble => popupContainer.addChild(bubble));
        
        // 创建连接线
        this.createMainConnectionLine(triggerPos, mainBubblePos, layoutDirection, triggerId);
        this.createBubbleConnections(popupContainer, triggerId);
        
        // 播放动画
        this.animatePopupOpen(popupContainer);
        
        // 更新状态
        triggerInfo.isActive = true;
        this.activePopups.set(triggerId, {
            container: popupContainer,
            triggerElement: element,
            layoutDirection: layoutDirection
        });
        
        this.log(`弹出层创建完成: ${triggerId}`, 'success');
    }
    
    /**
     * 计算布局方向
     */
    calculateLayoutDirection(triggerPos) {
        const screenWidth = this.app.screen.width;
        const isLeftSide = triggerPos.x < this.layoutConfig.leftSideThreshold;
        
        this.log(`触发位置: (${triggerPos.x}, ${triggerPos.y}), 屏幕宽度: ${screenWidth}`, 'normal');
        this.log(`布局方向: ${isLeftSide ? '右扩展' : '左扩展'}`, 'normal');
        
        return {
            horizontal: isLeftSide ? 'right' : 'left', // 水平扩展方向
            vertical: 'down' // 垂直扩展方向
        };
    }
    
    /**
     * 创建主气泡
     */
    createMainBubble(config, layoutDirection) {
        const bubble = this.createBubbleShape(config.main || {
            text: '主功能',
            color: 0x007AFF,
            size: 'large'
        });
        
        bubble.name = 'mainBubble';
        bubble.bubbleType = 'main';
        
        return bubble;
    }
    
    /**
     * 创建子气泡（水平分布）
     */
    createSubBubbles(subBubbleConfigs, layoutDirection, mainBubble) {
        const subBubbles = [];
        const direction = layoutDirection.horizontal === 'right' ? 1 : -1;
        
        subBubbleConfigs.forEach((config, index) => {
            const bubble = this.createBubbleShape(config);
            bubble.name = `subBubble_${index}`;
            bubble.bubbleType = 'sub';
            
            // 水平排列
            const offsetX = (index + 1) * this.options.bubbleSpacing * direction;
            bubble.x = offsetX;
            bubble.y = 0;
            
            // 为每个子气泡创建副气泡
            if (config.sideBubbles && config.sideBubbles.length > 0) {
                const sideBubbles = this.createSideBubbles(config.sideBubbles, bubble);
                sideBubbles.forEach(sideBubble => {
                    bubble.addChild(sideBubble);
                });
            }
            
            subBubbles.push(bubble);
            
            this.log(`创建子气泡 ${index}: 位置(${offsetX}, 0)`, 'normal');
        });
        
        return subBubbles;
    }
    
    /**
     * 创建副气泡（垂直分布）
     */
    createSideBubbles(sideBubbleConfigs, parentBubble) {
        const sideBubbles = [];
        
        sideBubbleConfigs.forEach((config, index) => {
            const bubble = this.createBubbleShape(config);
            bubble.name = `sideBubble_${index}`;
            bubble.bubbleType = 'side';
            
            // 垂直排列
            const offsetY = (index + 1) * this.options.verticalSpacing;
            bubble.x = 0;
            bubble.y = offsetY;
            
            sideBubbles.push(bubble);
            
            this.log(`创建副气泡 ${index}: 位置(0, ${offsetY})`, 'normal');
        });
        
        return sideBubbles;
    }
    
    /**
     * 创建气泡形状 - 基于bubble-demo.html设计规范
     */
    createBubbleShape(config) {
        const {
            text = '气泡',
            color = 0x007AFF,
            size = 'medium',
            hasAvatar = false,
            showSender = false,
            senderName = '用户'
        } = config;
        
        // 气泡容器
        const container = new PIXI.Container();
        container.interactive = true;
        container.cursor = 'pointer';
        
        // 尺寸配置
        const sizeConfig = {
            small: { width: 80, height: 40, fontSize: 12, padding: 8 },
            medium: { width: 120, height: 50, fontSize: 14, padding: 12 },
            large: { width: 160, height: 60, fontSize: 16, padding: 16 }
        };
        
        const bubbleSize = sizeConfig[size] || sizeConfig.medium;
        
        // 创建气泡背景 - 玻璃材质效果
        const background = new PIXI.Graphics();
        
        // 主背景 - 圆角矩形
        background
            .roundRect(-bubbleSize.width/2, -bubbleSize.height/2, bubbleSize.width, bubbleSize.height, 12)
            .fill({ color: color, alpha: 0.25 });
        
        // 边框
        background
            .roundRect(-bubbleSize.width/2, -bubbleSize.height/2, bubbleSize.width, bubbleSize.height, 12)
            .stroke({ width: 1, color: 0xFFFFFF, alpha: 0.3 });
        
        container.addChild(background);
        
        // 头像（如果需要）
        if (hasAvatar) {
            const avatar = this.createAvatar(senderName.charAt(0).toUpperCase(), color);
            avatar.x = -bubbleSize.width/2 + 20;
            avatar.y = -bubbleSize.height/2 + 15;
            container.addChild(avatar);
        }
        
        // 发送者名字（如果需要）
        if (showSender) {
            const senderLabel = new PIXI.Text({
                text: senderName,
                style: {
                    fontSize: 10,
                    fill: 0xFFFFFF,
                    fontWeight: 'bold',
                    dropShadow: {
                        color: 0x000000,
                        blur: 2,
                        distance: 1
                    }
                }
            });
            senderLabel.anchor.set(0, 0.5);
            senderLabel.x = -bubbleSize.width/2 + bubbleSize.padding;
            senderLabel.y = -bubbleSize.height/2 + 10;
            container.addChild(senderLabel);
        }
        
        // 主要文本
        const textLabel = new PIXI.Text({
            text: text,
            style: {
                fontSize: bubbleSize.fontSize,
                fill: 0xFFFFFF,
                fontWeight: '500',
                align: 'center',
                wordWrap: true,
                wordWrapWidth: bubbleSize.width - bubbleSize.padding * 2,
                dropShadow: {
                    color: 0x000000,
                    blur: 3,
                    distance: 1,
                    alpha: 0.6
                }
            }
        });
        textLabel.anchor.set(0.5);
        textLabel.y = showSender ? 8 : 0;
        container.addChild(textLabel);
        
        // 存储气泡信息
        container.bubbleConfig = config;
        container.bubbleSize = bubbleSize;
        
        // 悬停效果
        container.on('pointerover', () => {
            container.scale.set(1.05);
        });
        
        container.on('pointerout', () => {
            container.scale.set(1.0);
        });
        
        return container;
    }
    
    /**
     * 创建头像
     */
    createAvatar(letter, color) {
        const container = new PIXI.Container();
        
        // 头像背景
        const bg = new PIXI.Graphics()
            .roundRect(-8, -8, 16, 16, 4)
            .fill(color);
        container.addChild(bg);
        
        // 头像文字
        const text = new PIXI.Text({
            text: letter,
            style: {
                fontSize: 10,
                fill: 0xFFFFFF,
                fontWeight: 'bold'
            }
        });
        text.anchor.set(0.5);
        container.addChild(text);
        
        return container;
    }
    
    /**
     * 计算主气泡位置
     */
    calculateMainBubblePosition(triggerPos, layoutDirection, mainBubble) {
        const margin = 60;
        const bubbleWidth = mainBubble.bubbleSize.width;
        const bubbleHeight = mainBubble.bubbleSize.height;
        
        let x, y;
        
        // 水平位置
        if (layoutDirection.horizontal === 'right') {
            x = triggerPos.x + margin + bubbleWidth/2;
        } else {
            x = triggerPos.x - margin - bubbleWidth/2;
        }
        
        // 垂直位置（默认与触发元素对齐）
        y = triggerPos.y;
        
        // 边界检查和调整
        const screenBounds = {
            left: this.layoutConfig.sideMargin,
            right: this.app.screen.width - this.layoutConfig.sideMargin,
            top: this.layoutConfig.topMargin,
            bottom: this.app.screen.height - this.layoutConfig.bottomMargin
        };
        
        // 水平边界检查
        if (x - bubbleWidth/2 < screenBounds.left) {
            x = screenBounds.left + bubbleWidth/2;
        } else if (x + bubbleWidth/2 > screenBounds.right) {
            x = screenBounds.right - bubbleWidth/2;
        }
        
        // 垂直边界检查
        if (y - bubbleHeight/2 < screenBounds.top) {
            y = screenBounds.top + bubbleHeight/2;
        } else if (y + bubbleHeight/2 > screenBounds.bottom) {
            y = screenBounds.bottom - bubbleHeight/2;
        }
        
        this.log(`主气泡位置计算: (${x}, ${y})`, 'normal');
        
        return { x, y };
    }
    
    /**
     * 创建主连接线
     */
    createMainConnectionLine(triggerPos, bubblePos, layoutDirection, triggerId) {
        const line = new PIXI.Graphics();
        line.name = `mainConnection_${triggerId}`;
        this.connectionLayer.addChild(line);
        
        // 绘制L型连接线
        this.drawLShapedLine(line, triggerPos, bubblePos, layoutDirection);
        
        // 存储连接线信息
        this.connections.push({
            id: `main_${triggerId}`,
            line: line,
            from: triggerPos,
            to: bubblePos,
            type: 'main'
        });
        
        this.log(`主连接线创建完成: ${triggerId}`, 'normal');
    }
    
    /**
     * 创建气泡间连接线
     */
    createBubbleConnections(popupContainer, triggerId) {
        const mainBubble = popupContainer.getChildByName('mainBubble');
        if (!mainBubble) return;
        
        const mainPos = mainBubble.getGlobalPosition();
        
        // 连接子气泡
        popupContainer.children.forEach(child => {
            if (child.bubbleType === 'sub') {
                const childPos = child.getGlobalPosition();
                this.createBubbleConnectionLine(mainPos, childPos, 'sub', triggerId);
                
                // 连接副气泡
                child.children.forEach(grandChild => {
                    if (grandChild.bubbleType === 'side') {
                        const grandChildPos = grandChild.getGlobalPosition();
                        this.createBubbleConnectionLine(childPos, grandChildPos, 'side', triggerId);
                    }
                });
            } else if (child.bubbleType === 'side') {
                const childPos = child.getGlobalPosition();
                this.createBubbleConnectionLine(mainPos, childPos, 'side', triggerId);
            }
        });
    }
    
    /**
     * 创建气泡连接线
     */
    createBubbleConnectionLine(fromPos, toPos, type, triggerId) {
        const line = new PIXI.Graphics();
        line.name = `bubbleConnection_${type}_${triggerId}_${Date.now()}`;
        this.connectionLayer.addChild(line);
        
        // 直线连接
        line
            .moveTo(fromPos.x, fromPos.y)
            .lineTo(toPos.x, toPos.y)
            .stroke({
                width: this.options.connectionLineWidth - 1,
                color: this.options.connectionLineColor,
                alpha: 0.6
            });
        
        // 存储连接线信息
        this.connections.push({
            id: `bubble_${type}_${triggerId}_${Date.now()}`,
            line: line,
            from: fromPos,
            to: toPos,
            type: type
        });
    }
    
    /**
     * 绘制L型连接线
     */
    drawLShapedLine(graphics, fromPos, toPos, layoutDirection) {
        graphics.clear();
        
        const horizontalDistance = Math.abs(toPos.x - fromPos.x);
        const midPoint = horizontalDistance * 0.6;
        
        let midX;
        if (layoutDirection.horizontal === 'right') {
            midX = fromPos.x + midPoint;
        } else {
            midX = fromPos.x - midPoint;
        }
        
        // 绘制圆角L型线
        graphics
            .moveTo(fromPos.x, fromPos.y)
            .lineTo(midX, fromPos.y)
            .quadraticCurveTo(midX + 10 * (layoutDirection.horizontal === 'right' ? 1 : -1), fromPos.y, 
                             midX + 10 * (layoutDirection.horizontal === 'right' ? 1 : -1), 
                             fromPos.y + (toPos.y > fromPos.y ? 10 : -10))
            .lineTo(midX + 10 * (layoutDirection.horizontal === 'right' ? 1 : -1), 
                   toPos.y - (toPos.y > fromPos.y ? 10 : -10))
            .quadraticCurveTo(midX + 10 * (layoutDirection.horizontal === 'right' ? 1 : -1), toPos.y,
                             toPos.x - 20 * (layoutDirection.horizontal === 'right' ? 1 : -1), toPos.y)
            .lineTo(toPos.x, toPos.y)
            .stroke({
                width: this.options.connectionLineWidth,
                color: this.options.connectionLineColor,
                alpha: 0.8
            });
    }
    
    /**
     * 弹出动画
     */
    animatePopupOpen(container) {
        // 初始状态
        container.scale.set(0.1);
        container.alpha = 0;
        
        // 动画到最终状态
        const duration = this.options.bubbleAnimationDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const eased = this.easeOutBack(progress);
            
            container.scale.set(eased);
            container.alpha = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 缓动函数
     */
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    /**
     * 关闭弹出层
     */
    closePopup(triggerId) {
        const popupInfo = this.activePopups.get(triggerId);
        const triggerInfo = this.triggerElements.get(triggerId);
        
        if (!popupInfo || !triggerInfo) return;
        
        // 动画关闭
        this.animatePopupClose(popupInfo.container, () => {
            // 清理气泡容器
            this.bubbleLayer.removeChild(popupInfo.container);
            popupInfo.container.destroy();
            
            // 清理连接线
            this.clearConnections(triggerId);
            
            // 更新状态
            triggerInfo.isActive = false;
            this.activePopups.delete(triggerId);
            
            this.log(`弹出层关闭: ${triggerId}`, 'normal');
        });
    }
    
    /**
     * 关闭动画
     */
    animatePopupClose(container, onComplete) {
        const duration = this.options.bubbleAnimationDuration * 0.7;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const scale = 1 - progress;
            const alpha = 1 - progress;
            
            container.scale.set(scale);
            container.alpha = alpha;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 清理连接线
     */
    clearConnections(triggerId) {
        const connectionsToRemove = this.connections.filter(conn => 
            conn.id.includes(triggerId)
        );
        
        connectionsToRemove.forEach(conn => {
            if (conn.line.parent) {
                conn.line.parent.removeChild(conn.line);
            }
            conn.line.destroy();
        });
        
        this.connections = this.connections.filter(conn => 
            !conn.id.includes(triggerId)
        );
        
        this.log(`清理连接线数量: ${connectionsToRemove.length}`, 'normal');
    }
    
    /**
     * 关闭所有弹出层
     */
    closeAllPopups() {
        const activeIds = Array.from(this.activePopups.keys());
        activeIds.forEach(triggerId => {
            this.closePopup(triggerId);
        });
        
        this.log(`关闭所有弹出层数量: ${activeIds.length}`, 'normal');
    }
    
    /**
     * 设置全局点击处理
     */
    setupGlobalClickHandler() {
        this.app.stage.interactive = true;
        this.app.stage.on('pointerdown', (event) => {
            // 检查点击是否在弹出层外部
            const clickPos = event.data.global;
            let clickedInsidePopup = false;
            
            // 检查是否点击在任何弹出层内
            for (const [triggerId, popupInfo] of this.activePopups) {
                if (this.isPointInsideContainer(clickPos, popupInfo.container)) {
                    clickedInsidePopup = true;
                    break;
                }
            }
            
            // 检查是否点击在触发元素上
            for (const [triggerId, triggerInfo] of this.triggerElements) {
                if (this.isPointInsideContainer(clickPos, triggerInfo.element)) {
                    clickedInsidePopup = true;
                    break;
                }
            }
            
            // 如果点击在外部，关闭所有弹出层
            if (!clickedInsidePopup) {
                this.closeAllPopups();
            }
        });
        
        this.log('全局点击处理器设置完成', 'normal');
    }
    
    /**
     * 检查点是否在容器内
     */
    isPointInsideContainer(point, container) {
        if (!container || !container.getBounds) return false;
        
        const bounds = container.getBounds();
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }
    
    /**
     * 更新系统（处理窗口大小变化等）
     */
    updateSystem() {
        // 更新布局配置
        this.layoutConfig.leftSideThreshold = this.app.screen.width / 2;
        
        // 重新计算所有活跃弹出层的位置
        for (const [triggerId, popupInfo] of this.activePopups) {
            const triggerInfo = this.triggerElements.get(triggerId);
            if (triggerInfo) {
                // 关闭并重新创建弹出层
                this.closePopup(triggerId);
                setTimeout(() => {
                    this.createPopup(triggerId);
                }, 100);
            }
        }
        
        this.log('系统更新完成', 'normal');
    }
    
    /**
     * 销毁系统
     */
    destroy() {
        this.closeAllPopups();
        
        if (this.systemContainer) {
            this.app.stage.removeChild(this.systemContainer);
            this.systemContainer.destroy();
        }
        
        this.triggerElements.clear();
        this.activePopups.clear();
        this.connections = [];
        
        this.log('弹出层系统已销毁', 'warning');
    }
    
    /**
     * 调试日志
     */
    log(message, type = 'normal') {
        if (!this.options.enableDebugLogs) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = '[PopupLayerSystem]';
        
        const styles = {
            normal: 'color: #888',
            checkpoint: 'color: #ff9500; font-weight: bold',
            success: 'color: #4CAF50; font-weight: bold',
            error: 'color: #f44336; font-weight: bold',
            warning: 'color: #ff9800; font-weight: bold'
        };
        
        console.log(`%c${prefix} [${timestamp}] ${message}`, styles[type] || styles.normal);
    }
    
    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            activePopups: this.activePopups.size,
            registeredTriggers: this.triggerElements.size,
            activeConnections: this.connections.length,
            systemInitialized: !!this.systemContainer
        };
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopupLayerSystem;
} else if (typeof window !== 'undefined') {
    window.PopupLayerSystem = PopupLayerSystem;
}