import * as PIXI from 'pixi.js';

/**
 * Right Sidebar Component with Avatar Area, Brain Trust Icon, and Workflow Icons
 * Features:
 * - Upper area: Scrollable square avatars with expansion animation
 * - Center: Brain Trust icon
 * - Lower area: 17 workflow icons with expansion animation
 * - Special Aiff process icon with scrolling text
 */
export class RightSidebar extends PIXI.Container {
    constructor(app, options = {}) {
        super();
        
        this.app = app;
        this.options = {
            width: 120,
            height: 800,
            avatarSize: 48,
            iconSize: 48,
            padding: 8,
            ...options
        };
        
        // State management for expansion animation
        this.isExpanded = false;
        this.originalWidth = this.options.width;
        this.expandedWidth = this.options.width * 3; // Expand to 3x width
        this.animationDuration = 0.3; // 0.3s expand, 2s wait, 0.3s restore
        this.waitDuration = 2.0;
        this.restoreTimeout = null;
        
        // Area dimensions
        this.avatarAreaHeight = this.options.height * 0.35;
        this.brainIconHeight = this.options.height * 0.1;
        this.workflowAreaHeight = this.options.height * 0.55;
        
        // Scrolling state
        this.avatarScrollY = 0;
        this.workflowScrollY = 0;
        this.isDragging = false;
        this.dragSection = null;
        this.lastPointerY = 0;
        
        // Aiff process text animation
        this.aiffProcessWords = [
            "分析用户画像", "识别关键需求", "匹配最佳策略", 
            "优化沟通方式", "建立信任关系", "深化合作机会",
            "扩展影响范围", "提升转化效果"
        ];
        this.currentAiffIndex = 0;
        this.aiffScrollSpeed = 30; // pixels per second
        this.aiffTextStartTime = Date.now();
        
        console.log('[RightSidebar] Initializing with dimensions:', {
            width: this.options.width, 
            height: this.options.height,
            avatarAreaHeight: this.avatarAreaHeight,
            brainIconHeight: this.brainIconHeight,
            workflowAreaHeight: this.workflowAreaHeight
        });
        
        this.init();
    }
    
    init() {
        this.createBackground();
        this.createAvatarArea();
        this.createBrainTrustIcon();
        this.createWorkflowArea();
        this.setupInteractions();
        this.startAnimations();
        
        console.log('[RightSidebar] Component initialized successfully');
    }
    
    createBackground() {
        this.background = new PIXI.Graphics();
        this.background.fill({ color: 0x2A2A2A, alpha: 0.95 });
        this.background.roundRect(0, 0, this.options.width, this.options.height, 12);
        this.background.stroke({ color: 0x404040, width: 1 });
        this.addChild(this.background);
        
        console.log('[RightSidebar] Background created');
    }
    
    createAvatarArea() {
        // Avatar container positioned at top
        this.avatarContainer = new PIXI.Container();
        this.avatarContainer.y = 0;
        
        // Scrollable content container
        this.avatarScrollContainer = new PIXI.Container();
        this.avatarScrollContainer.x = this.options.padding;
        this.avatarScrollContainer.y = this.options.padding;
        
        // Avatar data with square avatars
        const avatarData = [
            { type: 'self', name: '自身账号', color: 0x4A90E2 },
            { type: 'possessed', name: '附身账号1', color: 0xE94B3C },
            { type: 'possessed', name: '附身账号2', color: 0x50C878 },
            { type: 'possessed', name: '附身账号3', color: 0xF5A623 },
            { type: 'possessed', name: '附身账号4', color: 0x9013FE },
            { type: 'promotion', name: '附身推广', color: 0xFF6B35, isSpecial: true }
        ];
        
        const avatarSize = this.options.avatarSize;
        const spacing = 8;
        let currentY = 0;
        
        this.avatarItems = [];
        
        avatarData.forEach((avatar, index) => {
            const avatarItem = this.createSquareAvatar(avatar, avatarSize);
            avatarItem.x = (this.options.width - avatarSize) / 2 - this.options.padding; // Center horizontally
            avatarItem.y = currentY;
            
            // Add interaction for expansion
            avatarItem.eventMode = 'static';
            avatarItem.cursor = 'pointer';
            avatarItem.on('pointerdown', () => this.handleAreaExpansion('avatar'));
            
            this.avatarScrollContainer.addChild(avatarItem);
            this.avatarItems.push(avatarItem);
            currentY += avatarSize + spacing;
            
            console.log(`[RightSidebar] Avatar ${index + 1} created:`, avatar.name);
        });
        
        // Create mask for scrolling
        this.avatarMask = new PIXI.Graphics();
        this.updateAvatarMask();
        
        this.avatarContainer.addChild(this.avatarScrollContainer);
        this.avatarContainer.addChild(this.avatarMask);
        this.avatarScrollContainer.mask = this.avatarMask;
        
        // Add scroll functionality
        this.setupScrolling(this.avatarScrollContainer, this.avatarAreaHeight, 'avatar');
        
        this.addChild(this.avatarContainer);
        console.log('[RightSidebar] Avatar area created with', avatarData.length, 'avatars');
    }
    
    updateAvatarMask() {
        this.avatarMask.clear();
        this.avatarMask.fill({ color: 0xFFFFFF });
        this.avatarMask.rect(0, 0, this.options.width, this.avatarAreaHeight);
    }
    
    createSquareAvatar(avatarData, size) {
        const container = new PIXI.Container();
        
        // Square avatar background with rounded corners
        const bg = new PIXI.Graphics();
        bg.fill({ color: avatarData.color, alpha: 0.8 });
        bg.roundRect(0, 0, size, size, 8);
        bg.stroke({ color: avatarData.isSpecial ? 0xFFD700 : 0x666666, width: 2 });
        container.addChild(bg);
        
        // Avatar text/icon
        const text = new PIXI.Text({
            text: avatarData.name.slice(0, 2), // First 2 characters
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 14,
                fill: 0xFFFFFF,
                fontWeight: 'bold',
                align: 'center'
            }
        });
        text.anchor.set(0.5);
        text.x = size / 2;
        text.y = size / 2;
        container.addChild(text);
        
        // Special indicator for promotion avatar
        if (avatarData.isSpecial) {
            const indicator = new PIXI.Graphics();
            indicator.fill({ color: 0xFFD700 });
            indicator.circle(size - 8, 8, 4);
            container.addChild(indicator);
        }
        
        return container;
    }
    
    createBrainTrustIcon() {
        this.brainContainer = new PIXI.Container();
        this.brainContainer.y = this.avatarAreaHeight;
        
        // Background
        const bg = new PIXI.Graphics();
        bg.fill({ color: 0x3A3A3A, alpha: 0.8 });
        bg.rect(0, 0, this.options.width, this.brainIconHeight);
        this.brainContainer.addChild(bg);
        
        // Brain trust icon
        const brainIcon = new PIXI.Graphics();
        const centerX = this.options.width / 2;
        const centerY = this.brainIconHeight / 2;
        const radius = Math.min(this.options.width, this.brainIconHeight) * 0.3;
        
        // Brain shape
        brainIcon.fill({ color: 0x9C27B0, alpha: 0.9 });
        brainIcon.circle(centerX, centerY, radius);
        brainIcon.fill({ color: 0xE1BEE7, alpha: 0.6 });
        brainIcon.circle(centerX - radius * 0.3, centerY - radius * 0.2, radius * 0.4);
        brainIcon.circle(centerX + radius * 0.3, centerY - radius * 0.2, radius * 0.4);
        
        this.brainContainer.addChild(brainIcon);
        
        // Label
        const label = new PIXI.Text({
            text: '智囊团',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 10,
                fill: 0xFFFFFF,
                align: 'center'
            }
        });
        label.anchor.set(0.5);
        label.x = centerX;
        label.y = centerY + radius + 8;
        this.brainContainer.addChild(label);
        
        this.addChild(this.brainContainer);
        console.log('[RightSidebar] Brain trust icon created');
    }
    
    createWorkflowArea() {
        this.workflowContainer = new PIXI.Container();
        this.workflowContainer.y = this.avatarAreaHeight + this.brainIconHeight;
        
        // Create scrollable content
        this.workflowScrollContainer = new PIXI.Container();
        this.workflowScrollContainer.x = 4;
        this.workflowScrollContainer.y = 4;
        
        // 17 Workflow icons data as specified
        const workflowIcons = [
            { name: 'aiff流程', color: 0x4CAF50, isSpecial: true },
            { name: '筛选KOL', color: 0x2196F3 },
            { name: '沟通策略', color: 0xFF9800 },
            { name: '人脉画像', color: 0x9C27B0 },
            { name: '人设策略', color: 0xF44336 },
            { name: '择机熟络', color: 0x00BCD4 },
            { name: '请身帮腔', color: 0x795548 },
            { name: '人脉管理', color: 0x607D8B },
            { name: '快捷回复', color: 0x8BC34A },
            { name: '群发计划', color: 0xFFEB3B },
            { name: '记忆编辑', color: 0xE91E63 },
            { name: '知识编辑', color: 0x3F51B5 },
            { name: '抢单换量', color: 0xFF5722 },
            { name: '标价', color: 0x4CAF50 },
            { name: '投流', color: 0x673AB7 },
            { name: '钱包', color: 0xFFC107 },
            { name: '设置', color: 0x9E9E9E }
        ];
        
        const iconSize = (this.options.width - 16) / 2 - 4; // 2 columns with spacing
        const spacing = 4;
        let currentX = 0;
        let currentY = 0;
        
        this.workflowItems = [];
        
        workflowIcons.forEach((iconData, index) => {
            const icon = this.createWorkflowIcon(iconData, iconSize, index);
            icon.x = currentX;
            icon.y = currentY;
            
            // Add interaction for expansion
            icon.eventMode = 'static';
            icon.cursor = 'pointer';
            icon.on('pointerdown', () => this.handleAreaExpansion('workflow'));
            
            this.workflowScrollContainer.addChild(icon);
            this.workflowItems.push(icon);
            
            // Position calculation for 2-column layout
            currentX += iconSize + spacing;
            if ((index + 1) % 2 === 0) {
                currentX = 0;
                currentY += iconSize + spacing;
            }
            
            console.log(`[RightSidebar] Workflow icon ${index + 1} created:`, iconData.name);
        });
        
        // Create mask for scrolling
        this.workflowMask = new PIXI.Graphics();
        this.updateWorkflowMask();
        
        this.workflowContainer.addChild(this.workflowScrollContainer);
        this.workflowContainer.addChild(this.workflowMask);
        this.workflowScrollContainer.mask = this.workflowMask;
        
        // Add scroll functionality
        this.setupScrolling(this.workflowScrollContainer, this.workflowAreaHeight, 'workflow');
        
        this.addChild(this.workflowContainer);
        console.log('[RightSidebar] Workflow area created with', workflowIcons.length, 'icons');
    }
    
    updateWorkflowMask() {
        this.workflowMask.clear();
        this.workflowMask.fill({ color: 0xFFFFFF });
        this.workflowMask.rect(0, 0, this.options.width, this.workflowAreaHeight);
    }
    
    createWorkflowIcon(iconData, size, index) {
        const container = new PIXI.Container();
        
        // Icon background (rounded square)
        const bg = new PIXI.Graphics();
        bg.fill({ color: iconData.color, alpha: 0.8 });
        bg.roundRect(0, 0, size, size, 8);
        bg.stroke({ color: 0x666666, width: 1 });
        container.addChild(bg);
        
        if (iconData.isSpecial && iconData.name === 'aiff流程') {
            // Special Aiff process icon with scrolling text
            this.createAiffProcessIcon(container, size);
        } else {
            // Regular text icon
            const text = new PIXI.Text({
                text: iconData.name,
                style: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: iconData.name.length > 4 ? 9 : 11,
                    fill: 0xFFFFFF,
                    fontWeight: 'bold',
                    align: 'center',
                    wordWrap: true,
                    wordWrapWidth: size - 8
                }
            });
            text.anchor.set(0.5);
            text.x = size / 2;
            text.y = size / 2;
            container.addChild(text);
        }
        
        return container;
    }
    
    createAiffProcessIcon(container, size) {
        // Fixed first line
        const fixedText = new PIXI.Text({
            text: 'Aiff在',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 10,
                fill: 0xFFFFFF,
                fontWeight: 'bold',
                align: 'center'
            }
        });
        fixedText.anchor.set(0.5);
        fixedText.x = size / 2;
        fixedText.y = size * 0.3;
        container.addChild(fixedText);
        
        // Scrolling second line container
        const scrollContainer = new PIXI.Container();
        scrollContainer.x = 4;
        scrollContainer.y = size * 0.5;
        
        // Create mask for scrolling text
        const textMask = new PIXI.Graphics();
        textMask.fill({ color: 0xFFFFFF });
        textMask.rect(0, 0, size - 8, size * 0.4);
        container.addChild(textMask);
        scrollContainer.mask = textMask;
        
        // Scrolling text
        this.aiffScrollText = new PIXI.Text({
            text: `洞悉中[${this.aiffProcessWords[this.currentAiffIndex]}]`,
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 8,
                fill: 0xFFD700,
                align: 'center'
            }
        });
        this.aiffScrollText.anchor.set(0, 0.5);
        this.aiffScrollText.x = size - 8; // Start from right
        this.aiffScrollText.y = size * 0.2;
        scrollContainer.addChild(this.aiffScrollText);
        
        container.addChild(scrollContainer);
        this.aiffScrollContainer = scrollContainer;
        
        console.log('[RightSidebar] Aiff process icon created with scrolling text');
    }
    
    setupScrolling(scrollContainer, areaHeight, sectionType) {
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let scrollStart = { x: 0, y: 0 };
        
        scrollContainer.eventMode = 'static';
        
        scrollContainer.on('pointerdown', (event) => {
            isDragging = true;
            dragStart.x = event.global.x;
            dragStart.y = event.global.y;
            scrollStart.y = scrollContainer.y;
            scrollContainer.cursor = 'grabbing';
        });
        
        scrollContainer.on('pointermove', (event) => {
            if (!isDragging) return;
            
            const deltaY = event.global.y - dragStart.y;
            const newY = scrollStart.y + deltaY;
            
            // Constrain scrolling
            const maxScroll = -(scrollContainer.height - areaHeight + 16);
            scrollContainer.y = Math.max(maxScroll, Math.min(8, newY));
        });
        
        scrollContainer.on('pointerup', () => {
            isDragging = false;
            scrollContainer.cursor = 'grab';
        });
        
        scrollContainer.on('pointerupoutside', () => {
            isDragging = false;
            scrollContainer.cursor = 'grab';
        });
    }
    
    setupInteractions() {
        // Global interaction for sidebar
        this.eventMode = 'static';
        this.cursor = 'pointer';
        
        console.log('[RightSidebar] Interactions setup completed');
    }
    
    handleAreaExpansion(areaType) {
        if (this.isExpanded) return;
        
        console.log(`[RightSidebar] Expanding ${areaType} area`);
        this.isExpanded = true;
        
        // Create expansion animation using PIXI's built-in ticker
        const startWidth = this.options.width;
        const targetWidth = this.expandedWidth;
        const startTime = Date.now();
        
        const expandTicker = (delta) => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            
            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentWidth = startWidth + (targetWidth - startWidth) * easeProgress;
            
            // Update width
            this.options.width = currentWidth;
            this.updateComponentWidths();
            
            if (progress >= 1) {
                this.app.ticker.remove(expandTicker);
                
                // Start wait timer
                this.restoreTimeout = setTimeout(() => {
                    this.restoreSize();
                }, this.waitDuration * 1000);
            }
        };
        
        this.app.ticker.add(expandTicker);
    }
    
    restoreSize() {
        console.log('[RightSidebar] Restoring original size');
        
        const startWidth = this.options.width;
        const targetWidth = this.originalWidth;
        const startTime = Date.now();
        
        const restoreTicker = (delta) => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            
            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentWidth = startWidth + (targetWidth - startWidth) * easeProgress;
            
            // Update width
            this.options.width = currentWidth;
            this.updateComponentWidths();
            
            if (progress >= 1) {
                this.app.ticker.remove(restoreTicker);
                this.isExpanded = false;
            }
        };
        
        this.app.ticker.add(restoreTicker);
    }
    
    updateComponentWidths() {
        // Update background
        this.background.clear();
        this.background.fill({ color: 0x2A2A2A, alpha: 0.95 });
        this.background.roundRect(0, 0, this.options.width, this.options.height, 12);
        this.background.stroke({ color: 0x404040, width: 1 });
        
        // Update masks
        this.updateAvatarMask();
        this.updateWorkflowMask();
    }
    
    startAnimations() {
        // Start Aiff text scrolling animation
        if (this.aiffScrollText && this.aiffScrollContainer) {
            const scrollTicker = (delta) => {
                const deltaTime = delta / 60; // Convert to seconds
                this.aiffScrollText.x -= this.aiffScrollSpeed * deltaTime;
                
                // Reset when text is completely off screen
                if (this.aiffScrollText.x + this.aiffScrollText.width < 0) {
                    this.currentAiffIndex = (this.currentAiffIndex + 1) % this.aiffProcessWords.length;
                    this.aiffScrollText.text = `洞悉中[${this.aiffProcessWords[this.currentAiffIndex]}]`;
                    this.aiffScrollText.x = (this.options.width - 16) / 2 - 4; // Reset to icon width
                }
            };
            
            this.app.ticker.add(scrollTicker);
            console.log('[RightSidebar] Aiff text scrolling animation started');
        }
        
        console.log('[RightSidebar] All animations started');
    }
    
    // Public API methods
    getContainer() {
        return this;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    resize(width, height) {
        if (this.restoreTimeout) {
            clearTimeout(this.restoreTimeout);
            this.restoreTimeout = null;
        }
        
        this.originalWidth = width;
        this.options.width = width;
        this.options.height = height;
        this.expandedWidth = width * 3;
        
        // Recalculate area heights
        this.avatarAreaHeight = height * 0.35;
        this.brainIconHeight = height * 0.1;
        this.workflowAreaHeight = height * 0.55;
        
        // Update container positions
        if (this.brainContainer) {
            this.brainContainer.y = this.avatarAreaHeight;
        }
        if (this.workflowContainer) {
            this.workflowContainer.y = this.avatarAreaHeight + this.brainIconHeight;
        }
        
        // Update component dimensions
        this.updateComponentWidths();
        
        console.log('[RightSidebar] Component resized to:', { width, height });
    }
    
    destroy() {
        if (this.restoreTimeout) {
            clearTimeout(this.restoreTimeout);
        }
        
        if (this.app && this.app.ticker) {
            this.app.ticker.removeAllListeners();
        }
        
        super.destroy({ children: true });
        console.log('[RightSidebar] Component destroyed');
    }
}

export default RightSidebar;