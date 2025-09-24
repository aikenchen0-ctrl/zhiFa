import * as PIXI from 'pixi.js';

export class ConversationAvatar extends PIXI.Container {
    constructor(conversation, options = {}) {
        super();
        
        this.conversation = conversation;
        this.options = {
            width: 100,
            height: 60,
            avatarSize: 50,
            isCurrentConversation: false,
            showDetailedInfo: false,
            ...options
        };
        
        this.isHovered = false;
        this.detailContainer = null;
        
        console.log('ConversationAvatar: Creating avatar for', conversation.name, 'current:', this.options.isCurrentConversation);
        
        this.setupContainer();
        this.createAvatar();
        this.createIndicators();
        this.setupEvents();
        
        if (this.options.showDetailedInfo) {
            this.showDetailedInfo();
        }
    }
    
    setupContainer() {
        // Main background
        this.background = new PIXI.Graphics();
        this.updateBackground();
        this.addChild(this.background);
        
        // Interactive area
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width, this.options.height);
        this.interactive = true;
        this.buttonMode = true;
    }
    
    updateBackground() {
        this.background.clear();
        
        if (this.options.isCurrentConversation) {
            // Highlighted background for current conversation
            this.background.beginFill(0x3498db, 0.3);
            this.background.drawRoundedRect(2, 2, this.options.width - 4, this.options.height - 4, 8);
            this.background.endFill();
        } else if (this.isHovered) {
            // Hover background
            this.background.beginFill(0x34495e, 0.5);
            this.background.drawRoundedRect(2, 2, this.options.width - 4, this.options.height - 4, 8);
            this.background.endFill();
        }
    }
    
    createAvatar() {
        // Avatar circle background
        this.avatarBg = new PIXI.Graphics();
        this.avatarBg.beginFill(0x95a5a6);
        this.avatarBg.drawCircle(0, 0, this.options.avatarSize / 2);
        this.avatarBg.endFill();
        
        // Position avatar
        this.avatarBg.x = this.options.width / 2;
        this.avatarBg.y = this.options.height / 2;
        this.addChild(this.avatarBg);
        
        // Avatar initials
        const initials = this.conversation.name.split('_')[0].substring(0, 2).toUpperCase();
        this.avatarText = new PIXI.Text(initials, {
            fontSize: 16,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        this.avatarText.anchor.set(0.5);
        this.avatarText.x = this.options.width / 2;
        this.avatarText.y = this.options.height / 2;
        this.addChild(this.avatarText);
        
        // Online status indicator
        if (this.conversation.isOnline) {
            this.onlineIndicator = new PIXI.Graphics();
            this.onlineIndicator.beginFill(0x27ae60);
            this.onlineIndicator.drawCircle(0, 0, 5);
            this.onlineIndicator.endFill();
            this.onlineIndicator.x = this.options.width / 2 + this.options.avatarSize / 2 - 5;
            this.onlineIndicator.y = this.options.height / 2 + this.options.avatarSize / 2 - 5;
            this.addChild(this.onlineIndicator);
        }
        
        console.log('ConversationAvatar: Avatar created for', this.conversation.name);
    }
    
    createIndicators() {
        if (!this.options.isCurrentConversation) return;
        
        console.log('ConversationAvatar: Creating indicators for current conversation');
        
        // Top indicator - Eye icon (User Profile)
        this.topIndicator = new PIXI.Container();
        
        // Eye icon background
        const eyeBg = new PIXI.Graphics();
        eyeBg.beginFill(0x2c3e50);
        eyeBg.drawCircle(0, 0, 8);
        eyeBg.endFill();
        
        // Simple eye shape
        const eyeShape = new PIXI.Graphics();
        eyeShape.beginFill(0xffffff);
        eyeShape.drawEllipse(0, 0, 6, 3);
        eyeShape.endFill();
        
        eyeShape.beginFill(0x2c3e50);
        eyeShape.drawCircle(0, 0, 2);
        eyeShape.endFill();
        
        this.topIndicator.addChild(eyeBg);
        this.topIndicator.addChild(eyeShape);
        this.topIndicator.x = this.options.width / 2;
        this.topIndicator.y = 8;
        this.topIndicator.interactive = true;
        this.topIndicator.buttonMode = true;
        
        this.topIndicator.on('pointerdown', () => {
            console.log('ConversationAvatar: User profile clicked for', this.conversation.name);
            this.emit('profileClicked', this.conversation);
        });
        
        this.addChild(this.topIndicator);
        
        // Bottom indicator - Three red dots (Detailed Settings)
        this.bottomIndicator = new PIXI.Container();
        
        for (let i = 0; i < 3; i++) {
            const dot = new PIXI.Graphics();
            dot.beginFill(0xe74c3c);
            dot.drawCircle(0, 0, 2);
            dot.endFill();
            dot.x = (i - 1) * 6;
            this.bottomIndicator.addChild(dot);
        }
        
        this.bottomIndicator.x = this.options.width / 2;
        this.bottomIndicator.y = this.options.height - 8;
        this.bottomIndicator.interactive = true;
        this.bottomIndicator.buttonMode = true;
        
        this.bottomIndicator.on('pointerdown', () => {
            console.log('ConversationAvatar: Settings clicked for', this.conversation.name);
            this.emit('settingsClicked', this.conversation);
        });
        
        this.addChild(this.bottomIndicator);
    }
    
    setupEvents() {
        this.on('pointerover', this.onHover.bind(this));
        this.on('pointerout', this.onHoverOut.bind(this));
        this.on('pointerdown', this.onClick.bind(this));
        
        console.log('ConversationAvatar: Events setup for', this.conversation.name);
    }
    
    onHover() {
        this.isHovered = true;
        this.updateBackground();
        
        // Show detailed info after a short delay
        if (!this.options.showDetailedInfo) {
            setTimeout(() => {
                if (this.isHovered) {
                    this.showDetailedInfo();
                }
            }, 500);
        }
        
        console.log('ConversationAvatar: Hovered over', this.conversation.name);
    }
    
    onHoverOut() {
        this.isHovered = false;
        this.updateBackground();
        this.hideDetailedInfo();
        
        console.log('ConversationAvatar: Hover out', this.conversation.name);
    }
    
    onClick() {
        console.log('ConversationAvatar: Clicked', this.conversation.name);
        this.emit('conversationSelected', this.conversation);
    }
    
    showDetailedInfo() {
        if (this.detailContainer) return;
        
        console.log('ConversationAvatar: Showing detailed info for', this.conversation.name);
        
        this.detailContainer = new PIXI.Container();
        
        // Detail background
        const detailBg = new PIXI.Graphics();
        detailBg.beginFill(0x2c3e50, 0.9);
        detailBg.drawRoundedRect(0, 0, 200, 120, 8);
        detailBg.endFill();
        
        detailBg.beginFill(0x34495e);
        detailBg.drawRoundedRect(2, 2, 196, 116, 6);
        detailBg.endFill();
        
        this.detailContainer.addChild(detailBg);
        
        // Name
        const nameText = new PIXI.Text(this.conversation.name, {
            fontSize: 14,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        nameText.x = 10;
        nameText.y = 10;
        this.detailContainer.addChild(nameText);
        
        // Location
        const locationText = new PIXI.Text(`📍 ${this.conversation.location}`, {
            fontSize: 12,
            fill: 0x95a5a6
        });
        locationText.x = 10;
        locationText.y = 30;
        this.detailContainer.addChild(locationText);
        
        // Tags
        const tagsText = new PIXI.Text(`🏷️ ${this.conversation.tags.join(', ')}`, {
            fontSize: 12,
            fill: 0x3498db
        });
        tagsText.x = 10;
        tagsText.y = 50;
        this.detailContainer.addChild(tagsText);
        
        // Timestamp
        const time = new Date(this.conversation.timestamp).toLocaleTimeString();
        const timeText = new PIXI.Text(`⏰ ${time}`, {
            fontSize: 11,
            fill: 0x95a5a6
        });
        timeText.x = 10;
        timeText.y = 70;
        this.detailContainer.addChild(timeText);
        
        // Last message
        const messageText = new PIXI.Text(`💬 ${this.conversation.lastMessage}`, {
            fontSize: 11,
            fill: 0xecf0f1,
            wordWrap: true,
            wordWrapWidth: 180
        });
        messageText.x = 10;
        messageText.y = 90;
        this.detailContainer.addChild(messageText);
        
        // Position detail container
        this.detailContainer.x = this.options.width + 5;
        this.detailContainer.y = -20;
        
        this.addChild(this.detailContainer);
    }
    
    hideDetailedInfo() {
        if (this.detailContainer) {
            this.removeChild(this.detailContainer);
            this.detailContainer.destroy();
            this.detailContainer = null;
            
            console.log('ConversationAvatar: Hidden detailed info for', this.conversation.name);
        }
    }
    
    setCurrentConversation(isCurrent) {
        if (this.options.isCurrentConversation !== isCurrent) {
            this.options.isCurrentConversation = isCurrent;
            this.updateBackground();
            
            // Remove existing indicators
            if (this.topIndicator) {
                this.removeChild(this.topIndicator);
                this.topIndicator.destroy();
                this.topIndicator = null;
            }
            
            if (this.bottomIndicator) {
                this.removeChild(this.bottomIndicator);
                this.bottomIndicator.destroy();
                this.bottomIndicator = null;
            }
            
            // Create new indicators if needed
            this.createIndicators();
            
            console.log('ConversationAvatar: Updated current conversation status to', isCurrent, 'for', this.conversation.name);
        }
    }
    
    updateConversation(newConversation) {
        this.conversation = { ...this.conversation, ...newConversation };
        
        // Update avatar text
        const initials = this.conversation.name.split('_')[0].substring(0, 2).toUpperCase();
        this.avatarText.text = initials;
        
        // Update online status
        if (this.onlineIndicator) {
            this.removeChild(this.onlineIndicator);
            this.onlineIndicator.destroy();
            this.onlineIndicator = null;
        }
        
        if (this.conversation.isOnline) {
            this.onlineIndicator = new PIXI.Graphics();
            this.onlineIndicator.beginFill(0x27ae60);
            this.onlineIndicator.drawCircle(0, 0, 5);
            this.onlineIndicator.endFill();
            this.onlineIndicator.x = this.options.width / 2 + this.options.avatarSize / 2 - 5;
            this.onlineIndicator.y = this.options.height / 2 + this.options.avatarSize / 2 - 5;
            this.addChild(this.onlineIndicator);
        }
        
        // Refresh detailed info if showing
        if (this.detailContainer) {
            this.hideDetailedInfo();
            this.showDetailedInfo();
        }
        
        console.log('ConversationAvatar: Updated conversation data for', this.conversation.name);
    }
    
    destroy() {
        this.hideDetailedInfo();
        super.destroy();
        console.log('ConversationAvatar: Destroyed avatar for', this.conversation.name);
    }
}