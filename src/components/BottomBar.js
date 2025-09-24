/**
 * BottomBar Component - PixiJS v8 Bottom Navigation Bar
 * 
 * Features:
 * 1. 居中输入框
 * 2. 输入框左侧：小尺寸语音ICON、主页ICON  
 * 3. 输入框右侧：小尺寸礼物ICON、+号图标ICON
 * 4. 输入框激活时主页ICON变为表情ICON
 * 5. 输入框上方的可左右滚动按钮组
 * 6. +号展开功能：相册、视频通话、语言通话、定位、红包、礼物、转账、收藏、签约、名片、文件、素材
 * 
 * Technical Requirements:
 * - PixiJS v8
 * - Vision UI半透明材质
 * - 动态图标切换
 * - 滚动按钮组
 * - 展开菜单动画
 * - 详细日志
 */

import * as PIXI from 'pixi.js';

export class BottomBar extends PIXI.Container {
    constructor(width = 375, height = 80) {
        super();
        
        this.barWidth = width;
        this.barHeight = height;
        
        // State management
        this.state = {
            inputActive: false,
            voiceMode: false,
            menuExpanded: false,
            scrollOffset: 0,
            scrollButtonsVisible: false
        };
        
        // Component references
        this.components = {
            background: null,
            inputContainer: null,
            leftIcons: null,
            rightIcons: null,
            scrollContainer: null,
            expandedMenu: null
        };
        
        // Event emitter for component communication
        this.events = new PIXI.EventEmitter();
        
        // Animation properties
        this.animations = {
            menuExpand: null,
            scrollFade: null,
            iconTransition: null
        };
        
        console.log('[BottomBar] 🚀 初始化底部栏组件', { 
            width, 
            height,
            timestamp: new Date().toISOString()
        });
        
        this.init();
    }
    
    async init() {
        try {
            console.log('[BottomBar] 📋 开始创建组件元素...');
            
            await this.createBackground();
            await this.createInputField();
            await this.createLeftIcons();
            await this.createRightIcons();
            await this.createScrollableButtons();
            await this.createExpandedMenu();
            this.setupEventListeners();
            this.setupAnimations();
            
            console.log('[BottomBar] ✅ 组件初始化完成', {
                componentsCreated: Object.keys(this.components).length,
                animationsSetup: Object.keys(this.animations).length
            });
        } catch (error) {
            console.error('[BottomBar] ❌ 初始化失败:', error);
            throw error;
        }
    }
    
    async createBackground() {
        console.log('[BottomBar] 🎨 创建Vision UI半透明背景...');
        
        this.components.background = new PIXI.Graphics();
        
        // Vision UI style background with glassmorphism effect
        this.components.background
            .rect(0, 0, this.barWidth, this.barHeight)
            .fill({
                color: 0xFFFFFF,
                alpha: 0.85  // Semi-transparent for Vision UI effect
            });
        
        // Add subtle border
        this.components.background
            .stroke({
                color: 0xE5E5E7,
                width: 0.5,
                alpha: 0.6
            });
        
        // Apply blur filter for glassmorphism
        const blurFilter = new PIXI.BlurFilter({ 
            strength: 1.5,
            quality: 4 
        });
        this.components.background.filters = [blurFilter];
        
        this.addChild(this.components.background);
        
        console.log('[BottomBar] ✅ 背景创建完成 - Vision UI风格');
    }
    
    async createInputField() {
        console.log('[BottomBar] 💬 创建居中输入框...');
        
        this.components.inputContainer = new PIXI.Container();
        
        // Calculate centered position (留出左右图标空间)
        const iconSpace = 40;
        const inputWidth = this.barWidth - (iconSpace * 4); // 左右各两个图标
        const inputHeight = 40;
        const inputX = iconSpace * 2;
        const inputY = (this.barHeight - inputHeight) / 2;
        
        this.components.inputContainer.position.set(inputX, inputY);
        
        // Input background with rounded corners
        this.inputBg = new PIXI.Graphics();
        this.inputBg
            .roundRect(0, 0, inputWidth, inputHeight, 20)
            .fill({
                color: 0xF7F7F7,
                alpha: 0.9
            })
            .stroke({
                color: 0xE0E0E0,
                width: 1,
                alpha: 0.8
            });
        
        this.components.inputContainer.addChild(this.inputBg);
        
        // Placeholder text
        this.placeholderText = new PIXI.Text({
            text: '说点什么...',
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display"',
                fontSize: 15,
                fill: 0xA0A0A0,
                fontWeight: '400'
            }
        });
        this.placeholderText.position.set(16, (inputHeight - this.placeholderText.height) / 2);
        this.components.inputContainer.addChild(this.placeholderText);
        
        // Actual input text
        this.inputText = new PIXI.Text({
            text: '',
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display"',
                fontSize: 15,
                fill: 0x1C1C1E,
                fontWeight: '400'
            }
        });
        this.inputText.position.set(16, (inputHeight - this.inputText.height) / 2);
        this.components.inputContainer.addChild(this.inputText);
        
        // Make input interactive
        this.inputBg.eventMode = 'static';
        this.inputBg.cursor = 'text';
        this.inputBg.on('pointerdown', this.onInputActivate.bind(this));
        
        this.addChild(this.components.inputContainer);
        
        console.log('[BottomBar] ✅ 输入框创建完成', { 
            width: inputWidth, 
            height: inputHeight,
            position: { x: inputX, y: inputY }
        });
    }
    
    async createLeftIcons() {
        console.log('[BottomBar] 👈 创建左侧小尺寸图标（语音、主页）...');
        
        this.components.leftIcons = new PIXI.Container();
        this.components.leftIcons.position.set(8, (this.barHeight - 32) / 2);
        
        // Voice icon (小尺寸)
        this.voiceIcon = this.createSmallIcon('🎤', 0x007AFF, () => {
            console.log('[BottomBar] 🎤 语音按钮点击');
            this.onVoiceClick();
        });
        this.voiceIcon.position.set(0, 0);
        
        // Home/Emoji icon (主页ICON，激活时变表情)
        this.homeIcon = this.createSmallIcon(
            this.state.inputActive ? '😊' : '🏠', 
            this.state.inputActive ? 0xFF6B6B : 0x34C759, 
            () => {
                console.log('[BottomBar] 🏠 主页按钮点击');
                this.onHomeClick();
            }
        );
        this.homeIcon.position.set(38, 0);
        
        this.components.leftIcons.addChild(this.voiceIcon);
        this.components.leftIcons.addChild(this.homeIcon);
        this.addChild(this.components.leftIcons);
        
        console.log('[BottomBar] ✅ 左侧图标创建完成 - 语音和主页图标');
    }
    
    async createRightIcons() {
        console.log('[BottomBar] 👉 创建右侧小尺寸图标（礼物、+号）...');
        
        this.components.rightIcons = new PIXI.Container();
        this.components.rightIcons.position.set(this.barWidth - 80, (this.barHeight - 32) / 2);
        
        // Gift icon (小尺寸)
        this.giftIcon = this.createSmallIcon('🎁', 0xFF6B6B, () => {
            console.log('[BottomBar] 🎁 礼物按钮点击');
            this.onGiftClick();
        });
        this.giftIcon.position.set(0, 0);
        
        // Plus icon (展开菜单)
        this.plusIcon = this.createSmallIcon('+', 0x34C759, () => {
            console.log('[BottomBar] ➕ 加号按钮点击');
            this.onPlusClick();
        });
        this.plusIcon.position.set(38, 0);
        
        this.components.rightIcons.addChild(this.giftIcon);
        this.components.rightIcons.addChild(this.plusIcon);
        this.addChild(this.components.rightIcons);
        
        console.log('[BottomBar] ✅ 右侧图标创建完成 - 礼物和加号图标');
    }
    
    async createScrollableButtons() {
        console.log('[BottomBar] 📜 创建输入框上方可滚动按钮组...');
        
        this.components.scrollContainer = new PIXI.Container();
        this.components.scrollContainer.position.set(0, -60);
        this.components.scrollContainer.visible = false;
        
        // Scrollable background
        const scrollBg = new PIXI.Graphics();
        scrollBg
            .rect(0, 0, this.barWidth, 50)
            .fill({
                color: 0xFFFFFF,
                alpha: 0.75
            });
        this.components.scrollContainer.addChild(scrollBg);
        
        // Create scrollable content container
        this.scrollContent = new PIXI.Container();
        this.scrollContent.position.set(10, 5);
        
        const quickActions = [
            { text: '相机', icon: '📷', color: 0x4CAF50 },
            { text: '相册', icon: '🖼️', color: 0x2196F3 },
            { text: '视频', icon: '🎥', color: 0xFF5722 },
            { text: '文件', icon: '📎', color: 0xFF9800 },
            { text: '位置', icon: '📍', color: 0xF44336 },
            { text: '联系人', icon: '👤', color: 0x9C27B0 },
            { text: '语音', icon: '🎤', color: 0x607D8B },
            { text: '收藏', icon: '⭐', color: 0xFFEB3B }
        ];
        
        quickActions.forEach((action, index) => {
            const button = this.createScrollButton(action.text, action.icon, action.color);
            button.position.set(index * 75, 0);
            this.scrollContent.addChild(button);
        });
        
        this.components.scrollContainer.addChild(this.scrollContent);
        this.addChild(this.components.scrollContainer);
        
        // Add scroll interaction
        this.setupScrollInteraction();
        
        console.log('[BottomBar] ✅ 滚动按钮组创建完成', { 
            buttonsCount: quickActions.length,
            totalWidth: quickActions.length * 75
        });
    }
    
    async createExpandedMenu() {
        console.log('[BottomBar] 📋 创建+号展开菜单...');
        
        this.components.expandedMenu = new PIXI.Container();
        this.components.expandedMenu.position.set(0, -220);
        this.components.expandedMenu.visible = false;
        this.components.expandedMenu.alpha = 0;
        
        // Menu background
        const menuBg = new PIXI.Graphics();
        menuBg
            .roundRect(10, 0, this.barWidth - 20, 200, 16)
            .fill({
                color: 0xFFFFFF,
                alpha: 0.95
            })
            .stroke({
                color: 0xE5E5E7,
                width: 1,
                alpha: 0.8
            });
        
        // Add glassmorphism effect
        const menuBlur = new PIXI.BlurFilter({ 
            strength: 2,
            quality: 4 
        });
        menuBg.filters = [menuBlur];
        
        this.components.expandedMenu.addChild(menuBg);
        
        // 12个功能选项 (4行3列)
        const menuOptions = [
            { text: '相册', icon: '🖼️', color: 0x007AFF },
            { text: '视频通话', icon: '📹', color: 0x34C759 },
            { text: '语音通话', icon: '☎️', color: 0xFF6B6B },
            { text: '定位', icon: '📍', color: 0xF44336 },
            { text: '红包', icon: '🧧', color: 0xFF3B30 },
            { text: '礼物', icon: '🎁', color: 0xFF6B6B },
            { text: '转账', icon: '💰', color: 0x34C759 },
            { text: '收藏', icon: '⭐', color: 0xFFB800 },
            { text: '签约', icon: '📝', color: 0x5856D6 },
            { text: '名片', icon: '👤', color: 0x8E8E93 },
            { text: '文件', icon: '📎', color: 0xFF9500 },
            { text: '素材', icon: '🎨', color: 0xAF52DE }
        ];
        
        menuOptions.forEach((option, index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = 40 + col * 90;
            const y = 25 + row * 45;
            
            const menuItem = this.createMenuOption(option.text, option.icon, option.color);
            menuItem.position.set(x, y);
            this.components.expandedMenu.addChild(menuItem);
        });
        
        this.addChild(this.components.expandedMenu);
        
        console.log('[BottomBar] ✅ 展开菜单创建完成', { 
            optionsCount: menuOptions.length,
            layout: '4行3列'
        });
    }
    
    createSmallIcon(text, color, callback) {
        const icon = new PIXI.Container();
        
        // Small circular background
        const bg = new PIXI.Graphics();
        bg
            .circle(0, 0, 16)
            .fill({
                color: color,
                alpha: 0.1
            })
            .stroke({
                color: color,
                width: 1,
                alpha: 0.3
            });
        
        // Icon text
        const iconText = new PIXI.Text({
            text,
            style: {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: color,
                fontWeight: 'bold'
            }
        });
        iconText.anchor.set(0.5);
        
        icon.addChild(bg);
        icon.addChild(iconText);
        
        // Interactive behavior
        icon.eventMode = 'static';
        icon.cursor = 'pointer';
        icon.on('pointerdown', callback);
        
        // Hover effects
        icon.on('pointerenter', () => {
            bg.scale.set(1.1);
            bg.alpha = 0.8;
        });
        
        icon.on('pointerleave', () => {
            bg.scale.set(1.0);
            bg.alpha = 1.0;
        });
        
        return icon;
    }
    
    createScrollButton(text, icon, color) {
        const button = new PIXI.Container();
        
        // Button background
        const bg = new PIXI.Graphics();
        bg
            .roundRect(0, 0, 65, 35, 18)
            .fill({
                color: 0xFFFFFF,
                alpha: 0.9
            })
            .stroke({
                color: color,
                width: 1,
                alpha: 0.5
            });
        
        // Icon
        const iconText = new PIXI.Text({
            text: icon,
            style: { fontSize: 12 }
        });
        iconText.position.set(8, 3);
        
        // Label
        const label = new PIXI.Text({
            text,
            style: {
                fontSize: 9,
                fill: color,
                fontWeight: '500'
            }
        });
        label.position.set(8, 18);
        
        button.addChild(bg);
        button.addChild(iconText);
        button.addChild(label);
        
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointerdown', () => {
            console.log(`[BottomBar] 📜 滚动按钮点击: ${text}`);
            this.events.emit('scrollButtonClick', { type: text, icon, color });
        });
        
        return button;
    }
    
    createMenuOption(text, icon, color) {
        const option = new PIXI.Container();
        
        // Background circle
        const bg = new PIXI.Graphics();
        bg
            .circle(0, 0, 22)
            .fill({
                color: color,
                alpha: 0.1
            })
            .stroke({
                color: color,
                width: 1,
                alpha: 0.4
            });
        
        // Icon
        const iconText = new PIXI.Text({
            text: icon,
            style: { fontSize: 16 }
        });
        iconText.anchor.set(0.5);
        
        // Label
        const label = new PIXI.Text({
            text,
            style: {
                fontSize: 11,
                fill: 0x1C1C1E,
                fontWeight: '500'
            }
        });
        label.anchor.set(0.5);
        label.position.set(0, 32);
        
        option.addChild(bg);
        option.addChild(iconText);
        option.addChild(label);
        
        option.eventMode = 'static';
        option.cursor = 'pointer';
        option.on('pointerdown', () => {
            console.log(`[BottomBar] 🎯 菜单选项点击: ${text}`);
            this.events.emit('menuOptionClick', { type: text, icon, color });
            this.toggleExpandedMenu(false); // 选择后自动关闭
        });
        
        // Hover effect
        option.on('pointerenter', () => {
            bg.scale.set(1.1);
            option.scale.set(1.05);
        });
        
        option.on('pointerleave', () => {
            bg.scale.set(1.0);
            option.scale.set(1.0);
        });
        
        return option;
    }
    
    setupScrollInteraction() {
        console.log('[BottomBar] 🔄 设置滚动交互...');
        
        this.components.scrollContainer.eventMode = 'static';
        
        let isDragging = false;
        let startX = 0;
        let startScrollX = 0;
        
        this.components.scrollContainer.on('pointerdown', (event) => {
            isDragging = true;
            startX = event.global.x;
            startScrollX = this.scrollContent.x;
        });
        
        this.components.scrollContainer.on('pointermove', (event) => {
            if (!isDragging) return;
            
            const deltaX = event.global.x - startX;
            const newX = startScrollX + deltaX;
            
            // Constrain scroll bounds
            const maxScroll = 0;
            const minScroll = -(this.scrollContent.width - this.barWidth + 20);
            
            this.scrollContent.x = Math.max(minScroll, Math.min(maxScroll, newX));
        });
        
        this.components.scrollContainer.on('pointerup', () => {
            isDragging = false;
        });
        
        this.components.scrollContainer.on('pointerupoutside', () => {
            isDragging = false;
        });
    }
    
    setupEventListeners() {
        console.log('[BottomBar] 🎧 设置事件监听器...');
        
        this.on('resize', this.handleResize.bind(this));
        
        // Global click to close menu
        globalThis.addEventListener?.('click', (event) => {
            if (this.state.menuExpanded && !this.getBounds().contains(event.clientX, event.clientY)) {
                this.toggleExpandedMenu(false);
            }
        });
    }
    
    setupAnimations() {
        console.log('[BottomBar] 🎬 设置动画系统...');
        
        // Animation ticker for smooth transitions
        this.animationTicker = new PIXI.Ticker();
        this.animationTicker.start();
    }
    
    // Event Handlers
    onInputActivate() {
        console.log('[BottomBar] 📝 输入框激活状态切换');
        
        this.state.inputActive = !this.state.inputActive;
        this.updateInputState();
        this.updateHomeIcon();
        
        // Show/hide scroll buttons
        this.state.scrollButtonsVisible = this.state.inputActive;
        this.animateScrollButtons();
        
        this.events.emit('inputStateChange', { 
            active: this.state.inputActive,
            timestamp: Date.now()
        });
    }
    
    onVoiceClick() {
        this.state.voiceMode = !this.state.voiceMode;
        console.log('[BottomBar] 🎤 语音模式切换:', this.state.voiceMode);
        
        this.events.emit('voiceModeChange', { 
            voiceMode: this.state.voiceMode,
            timestamp: Date.now()
        });
    }
    
    onHomeClick() {
        console.log('[BottomBar] 🏠 主页按钮点击');
        this.events.emit('homeClick', { timestamp: Date.now() });
    }
    
    onGiftClick() {
        console.log('[BottomBar] 🎁 礼物按钮点击');
        this.events.emit('giftClick', { timestamp: Date.now() });
    }
    
    onPlusClick() {
        console.log('[BottomBar] ➕ 加号按钮点击，切换菜单状态');
        this.toggleExpandedMenu();
    }
    
    // State Update Methods
    updateInputState() {
        console.log('[BottomBar] 🔄 更新输入框状态:', this.state.inputActive);
        
        this.inputBg.clear();
        
        if (this.state.inputActive) {
            this.inputBg
                .roundRect(0, 0, this.barWidth - 160, 40, 20)
                .fill({
                    color: 0xFFFFFF,
                    alpha: 1.0
                })
                .stroke({
                    color: 0x007AFF,
                    width: 2,
                    alpha: 0.8
                });
            
            this.placeholderText.visible = false;
        } else {
            this.inputBg
                .roundRect(0, 0, this.barWidth - 160, 40, 20)
                .fill({
                    color: 0xF7F7F7,
                    alpha: 0.9
                })
                .stroke({
                    color: 0xE0E0E0,
                    width: 1,
                    alpha: 0.8
                });
            
            this.placeholderText.visible = this.inputText.text.length === 0;
        }
    }
    
    updateHomeIcon() {
        console.log('[BottomBar] 🔄 更新主页图标 (激活时变表情)');
        
        // Remove old icon
        this.components.leftIcons.removeChild(this.homeIcon);
        
        // Create new icon with appropriate symbol
        this.homeIcon = this.createSmallIcon(
            this.state.inputActive ? '😊' : '🏠',
            this.state.inputActive ? 0xFF6B6B : 0x34C759,
            () => {
                console.log('[BottomBar] 🏠 主页按钮点击');
                this.onHomeClick();
            }
        );
        this.homeIcon.position.set(38, 0);
        
        this.components.leftIcons.addChild(this.homeIcon);
        
        // Smooth transition animation
        this.homeIcon.alpha = 0;
        this.homeIcon.scale.set(0.8);
        
        const ticker = new PIXI.Ticker();
        let progress = 0;
        
        ticker.add(() => {
            progress += 0.1;
            this.homeIcon.alpha = progress;
            this.homeIcon.scale.set(0.8 + (0.2 * progress));
            
            if (progress >= 1) {
                ticker.stop();
                ticker.destroy();
            }
        });
        
        ticker.start();
    }
    
    animateScrollButtons() {
        console.log('[BottomBar] 🎬 动画显示/隐藏滚动按钮');
        
        const targetAlpha = this.state.scrollButtonsVisible ? 1 : 0;
        const targetY = this.state.scrollButtonsVisible ? -60 : -40;
        
        this.components.scrollContainer.visible = true;
        
        const ticker = new PIXI.Ticker();
        let progress = 0;
        const startAlpha = this.components.scrollContainer.alpha;
        const startY = this.components.scrollContainer.y;
        
        ticker.add(() => {
            progress += 0.15;
            
            this.components.scrollContainer.alpha = startAlpha + (targetAlpha - startAlpha) * progress;
            this.components.scrollContainer.y = startY + (targetY - startY) * progress;
            
            if (progress >= 1) {
                this.components.scrollContainer.alpha = targetAlpha;
                this.components.scrollContainer.y = targetY;
                this.components.scrollContainer.visible = targetAlpha > 0;
                ticker.stop();
                ticker.destroy();
            }
        });
        
        ticker.start();
    }
    
    toggleExpandedMenu(force = null) {
        const newState = force !== null ? force : !this.state.menuExpanded;
        
        console.log('[BottomBar] 🎬 切换展开菜单动画:', newState);
        
        this.state.menuExpanded = newState;
        
        // Update plus icon
        const plusIconText = this.plusIcon.children[1];
        plusIconText.text = this.state.menuExpanded ? '×' : '+';
        plusIconText.style.fontSize = this.state.menuExpanded ? 18 : 14;
        
        // Animate menu appearance
        this.components.expandedMenu.visible = true;
        
        const targetAlpha = this.state.menuExpanded ? 1 : 0;
        const targetScale = this.state.menuExpanded ? 1 : 0.9;
        
        const ticker = new PIXI.Ticker();
        let progress = 0;
        const startAlpha = this.components.expandedMenu.alpha;
        const startScale = this.components.expandedMenu.scale.x;
        
        ticker.add(() => {
            progress += 0.12;
            
            this.components.expandedMenu.alpha = startAlpha + (targetAlpha - startAlpha) * progress;
            const scale = startScale + (targetScale - startScale) * progress;
            this.components.expandedMenu.scale.set(scale);
            
            if (progress >= 1) {
                this.components.expandedMenu.alpha = targetAlpha;
                this.components.expandedMenu.scale.set(targetScale);
                this.components.expandedMenu.visible = targetAlpha > 0;
                ticker.stop();
                ticker.destroy();
            }
        });
        
        ticker.start();
        
        this.events.emit('menuExpandedChange', { 
            expanded: this.state.menuExpanded,
            timestamp: Date.now()
        });
    }
    
    // Public API Methods
    setInputText(text) {
        this.inputText.text = text;
        this.placeholderText.visible = text.length === 0 && !this.state.inputActive;
        
        console.log('[BottomBar] 📝 设置输入文本:', text);
    }
    
    getInputText() {
        return this.inputText.text;
    }
    
    setVoiceMode(enabled) {
        if (this.state.voiceMode !== enabled) {
            this.state.voiceMode = enabled;
            console.log('[BottomBar] 🎤 设置语音模式:', enabled);
        }
    }
    
    handleResize(width, height) {
        console.log('[BottomBar] 📐 处理窗口尺寸变化:', { width, height });
        
        this.barWidth = width;
        
        // Update background
        this.components.background.clear();
        this.components.background
            .rect(0, 0, this.barWidth, this.barHeight)
            .fill({
                color: 0xFFFFFF,
                alpha: 0.85
            });
        
        // Update input field width
        const inputWidth = this.barWidth - 160;
        this.inputBg.clear();
        this.inputBg
            .roundRect(0, 0, inputWidth, 40, 20)
            .fill({
                color: this.state.inputActive ? 0xFFFFFF : 0xF7F7F7,
                alpha: this.state.inputActive ? 1.0 : 0.9
            })
            .stroke({
                color: this.state.inputActive ? 0x007AFF : 0xE0E0E0,
                width: this.state.inputActive ? 2 : 1,
                alpha: 0.8
            });
        
        // Update right icons position
        this.components.rightIcons.position.set(this.barWidth - 80, (this.barHeight - 32) / 2);
    }
    
    destroy() {
        try {
            console.log('[BottomBar] 🗑️ 销毁组件...');
            
            // Stop all animations
            if (this.animationTicker) {
                this.animationTicker.stop();
                this.animationTicker.destroy();
            }
            
            // Clean up event listeners
            this.removeAllListeners();
            this.events.removeAllListeners();
            
            // Destroy all child components
            Object.values(this.components).forEach(component => {
                if (component && component.destroy) {
                    component.destroy({ children: true });
                }
            });
            
            super.destroy({ children: true });
            
            console.log('[BottomBar] ✅ 组件销毁完成');
        } catch (error) {
            console.error('[BottomBar] ❌ 销毁过程中出错:', error);
        }
    }
}

export default BottomBar;