/**
 * ChatMessageArea.js
 * Chat message area component with pixi.js v8
 * Features: Bubble system, multiple message types, interactions, virtual scrolling
 */

import * as PIXI from 'pixi.js';

class ChatMessageArea {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.app = null;
        this.container = null;
        this.viewport = null;
        this.messageContainer = null;
        
        // Virtual scrolling properties
        this.virtualScroll = {
            itemHeight: 80,
            buffer: 5,
            visibleStart: 0,
            visibleEnd: 0,
            scrollY: 0,
            totalHeight: 0
        };
        
        // Message data
        this.messages = [];
        this.renderedMessages = new Map();
        this.selectedMessages = new Set();
        this.multiSelectMode = false;
        
        // UI elements
        this.bottomActionBar = null;
        this.actionButtons = null;
        this.currentSelectedMessage = null;
        
        // Interaction state
        this.isDragging = false;
        this.dragStartY = 0;
        this.velocity = 0;
        this.lastFrameTime = 0;
        
        this.init();
    }
    
    async init() {
        console.log('Initializing ChatMessageArea...');
        
        // Create PIXI application
        this.app = new PIXI.Application({
            width: this.width,
            height: this.height,
            backgroundColor: 0x000000,
            transparent: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });
        
        // Main container
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);
        
        // Message container with mask for scrolling
        this.messageContainer = new PIXI.Container();
        this.container.addChild(this.messageContainer);
        
        // Create viewport mask
        this.createViewportMask();
        
        // Setup interactions
        this.setupInteractions();
        
        // Create UI elements
        this.createActionButtons();
        this.createBottomActionBar();
        
        // Start render loop
        this.app.ticker.add(this.update.bind(this));
        
        console.log('ChatMessageArea initialized successfully');
    }
    
    createViewportMask() {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(0, 0, this.width, this.height);
        mask.endFill();
        this.messageContainer.mask = mask;
        this.container.addChild(mask);
    }
    
    setupInteractions() {
        this.container.eventMode = 'static';
        this.container.cursor = 'pointer';
        
        // Touch and mouse events
        this.container.on('pointerdown', this.onPointerDown.bind(this));
        this.container.on('pointermove', this.onPointerMove.bind(this));
        this.container.on('pointerup', this.onPointerUp.bind(this));
        this.container.on('pointerupoutside', this.onPointerUp.bind(this));
        
        // Wheel scrolling
        this.app.view.addEventListener('wheel', this.onWheel.bind(this));
    }
    
    onPointerDown(event) {
        this.isDragging = true;
        this.dragStartY = event.global.y;
        this.velocity = 0;
        this.lastFrameTime = Date.now();
        console.log('Pointer down, starting drag');
    }
    
    onPointerMove(event) {
        if (!this.isDragging) return;
        
        const deltaY = event.global.y - this.dragStartY;
        this.scroll(deltaY);
        this.dragStartY = event.global.y;
        
        // Calculate velocity for momentum
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        if (deltaTime > 0) {
            this.velocity = deltaY / deltaTime;
        }
        this.lastFrameTime = currentTime;
    }
    
    onPointerUp(event) {
        this.isDragging = false;
        console.log('Pointer up, ending drag');
    }
    
    onWheel(event) {
        event.preventDefault();
        this.scroll(-event.deltaY * 0.5);
    }
    
    scroll(deltaY) {
        this.virtualScroll.scrollY = Math.max(0, 
            Math.min(this.virtualScroll.totalHeight - this.height, 
                this.virtualScroll.scrollY - deltaY));
        this.updateVirtualScroll();
    }
    
    update(deltaTime) {
        // Apply momentum scrolling
        if (!this.isDragging && Math.abs(this.velocity) > 0.01) {
            this.scroll(this.velocity * deltaTime * 60);
            this.velocity *= 0.95; // Friction
        }
    }
    
    updateVirtualScroll() {
        const scrollY = this.virtualScroll.scrollY;
        const itemHeight = this.virtualScroll.itemHeight;
        const buffer = this.virtualScroll.buffer;
        
        // Calculate visible range
        this.virtualScroll.visibleStart = Math.max(0, 
            Math.floor(scrollY / itemHeight) - buffer);
        this.virtualScroll.visibleEnd = Math.min(this.messages.length - 1,
            Math.ceil((scrollY + this.height) / itemHeight) + buffer);
        
        // Update message positions
        this.renderVisibleMessages();
        
        console.log(`Virtual scroll: ${this.virtualScroll.visibleStart}-${this.virtualScroll.visibleEnd}`);
    }
    
    renderVisibleMessages() {
        // Remove messages outside visible range
        for (const [index, messageView] of this.renderedMessages) {
            if (index < this.virtualScroll.visibleStart || 
                index > this.virtualScroll.visibleEnd) {
                this.messageContainer.removeChild(messageView);
                this.renderedMessages.delete(index);
            }
        }
        
        // Add messages in visible range
        for (let i = this.virtualScroll.visibleStart; i <= this.virtualScroll.visibleEnd; i++) {
            if (i >= 0 && i < this.messages.length && !this.renderedMessages.has(i)) {
                const messageView = this.createMessageView(this.messages[i], i);
                this.renderedMessages.set(i, messageView);
                this.messageContainer.addChild(messageView);
            }
        }
        
        // Update positions
        for (const [index, messageView] of this.renderedMessages) {
            const y = index * this.virtualScroll.itemHeight - this.virtualScroll.scrollY;
            messageView.y = y;
        }
    }
    
    createMessageView(message, index) {
        console.log(`Creating message view for index ${index}, type: ${message.type}`);
        
        const messageView = new PIXI.Container();
        messageView.messageData = message;
        messageView.messageIndex = index;
        
        // Create message bubble based on type
        switch (message.type) {
            case 'system':
                this.createSystemMessage(messageView, message);
                break;
            case 'text':
            case 'image':
            case 'voice':
            case 'video':
            case 'link':
                this.createBubbleMessage(messageView, message);
                break;
            default:
                this.createBubbleMessage(messageView, message);
        }
        
        // Add interaction
        this.addMessageInteraction(messageView);
        
        return messageView;
    }
    
    createSystemMessage(container, message) {
        // System message: no bubble, centered text
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: '#888888',
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1
        });
        
        const text = new PIXI.Text(message.content, textStyle);
        text.anchor.set(0.5, 0.5);
        text.x = this.width / 2;
        text.y = this.virtualScroll.itemHeight / 2;
        
        container.addChild(text);
        console.log('Created system message');
    }
    
    createBubbleMessage(container, message) {
        const isOwn = message.sender === 'self';
        const bubbleWidth = Math.min(this.width * 0.7, 300);
        const bubbleHeight = this.virtualScroll.itemHeight - 10;
        
        // Create bubble graphics
        const bubble = this.createMessageBubble(bubbleWidth, bubbleHeight, isOwn, message.bubbleType);
        
        // Position bubble
        if (isOwn) {
            bubble.x = this.width - bubbleWidth - 20;
        } else {
            bubble.x = 20;
        }
        bubble.y = 5;
        
        container.addChild(bubble);
        
        // Add sender name for detailed bubbles
        if (message.bubbleType === 'detailed' && !isOwn) {
            this.addSenderName(container, message.senderName, bubble.x, bubble.y);
        }
        
        // Add message content
        this.addMessageContent(container, message, bubble.x, bubble.y, bubbleWidth, bubbleHeight);
        
        // Add selection checkbox for multi-select mode
        if (this.multiSelectMode) {
            this.addSelectionCheckbox(container, message, bubble.x - 30, bubble.y + 10);
        }
        
        console.log(`Created ${message.bubbleType} bubble for ${isOwn ? 'own' : 'other'} message`);
    }
    
    createMessageBubble(width, height, isOwn, bubbleType) {
        const bubble = new PIXI.Graphics();
        const radius = 12;
        
        // Bubble colors and materials
        if (isOwn) {
            // Self message: semi-transparent white glass
            bubble.beginFill(0xffffff, 0.3);
            bubble.lineStyle(1, 0xffffff, 0.5);
        } else {
            // Other message: fully transparent glass
            bubble.beginFill(0xffffff, 0.1);
            bubble.lineStyle(1, 0xffffff, 0.3);
        }
        
        // Draw rounded rectangle
        bubble.drawRoundedRect(0, 0, width, height, radius);
        bubble.endFill();
        
        // Add Vision UI glass effect
        this.addGlassEffect(bubble, width, height, isOwn);
        
        return bubble;
    }
    
    addGlassEffect(bubble, width, height, isOwn) {
        // Add gradient overlay for glass effect
        const gradient = new PIXI.Graphics();
        
        if (isOwn) {
            gradient.beginFill(0xffffff, 0.2);
        } else {
            gradient.beginFill(0xffffff, 0.1);
        }
        
        gradient.drawRoundedRect(0, 0, width, height / 2, 12);
        gradient.endFill();
        
        bubble.addChild(gradient);
    }
    
    addSenderName(container, senderName, bubbleX, bubbleY) {
        const nameStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10,
            fill: '#cccccc',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 1,
            dropShadowDistance: 1
        });
        
        const nameText = new PIXI.Text(senderName, nameStyle);
        nameText.x = bubbleX + 10;
        nameText.y = bubbleY - 15;
        
        container.addChild(nameText);
    }
    
    addMessageContent(container, message, bubbleX, bubbleY, bubbleWidth, bubbleHeight) {
        const contentStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: bubbleWidth - 20,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1
        });
        
        let content;
        
        switch (message.type) {
            case 'text':
                content = new PIXI.Text(message.content, contentStyle);
                break;
            case 'image':
                content = this.createImageContent(message, bubbleWidth - 20);
                break;
            case 'voice':
                content = this.createVoiceContent(message, bubbleWidth - 20);
                break;
            case 'video':
                content = this.createVideoContent(message, bubbleWidth - 20);
                break;
            case 'link':
                content = this.createLinkContent(message, bubbleWidth - 20);
                break;
            default:
                content = new PIXI.Text(message.content || 'Unknown message type', contentStyle);
        }
        
        content.x = bubbleX + 10;
        content.y = bubbleY + (message.bubbleType === 'detailed' ? 20 : 10);
        
        container.addChild(content);
    }
    
    createImageContent(message, maxWidth) {
        const container = new PIXI.Container();
        
        // Image placeholder
        const imageBg = new PIXI.Graphics();
        imageBg.beginFill(0x333333);
        imageBg.drawRoundedRect(0, 0, maxWidth, 100, 8);
        imageBg.endFill();
        
        // Image icon
        const imageText = new PIXI.Text('📷 Image', {
            fontSize: 12,
            fill: '#ffffff'
        });
        imageText.anchor.set(0.5);
        imageText.x = maxWidth / 2;
        imageText.y = 50;
        
        container.addChild(imageBg);
        container.addChild(imageText);
        
        return container;
    }
    
    createVoiceContent(message, maxWidth) {
        const container = new PIXI.Container();
        
        // Voice waveform background
        const voiceBg = new PIXI.Graphics();
        voiceBg.beginFill(0x1a73e8, 0.3);
        voiceBg.drawRoundedRect(0, 0, maxWidth, 40, 20);
        voiceBg.endFill();
        
        // Play button
        const playButton = new PIXI.Graphics();
        playButton.beginFill(0x1a73e8);
        playButton.drawPolygon([15, 10, 15, 30, 35, 20]);
        playButton.endFill();
        
        // Duration text
        const durationText = new PIXI.Text(message.duration || '0:30', {
            fontSize: 12,
            fill: '#ffffff'
        });
        durationText.x = 50;
        durationText.y = 15;
        
        container.addChild(voiceBg);
        container.addChild(playButton);
        container.addChild(durationText);
        
        return container;
    }
    
    createVideoContent(message, maxWidth) {
        const container = new PIXI.Container();
        
        // Video thumbnail
        const videoBg = new PIXI.Graphics();
        videoBg.beginFill(0x000000);
        videoBg.drawRoundedRect(0, 0, maxWidth, 120, 8);
        videoBg.endFill();
        
        // Play button overlay
        const playOverlay = new PIXI.Graphics();
        playOverlay.beginFill(0xffffff, 0.8);
        playOverlay.drawCircle(maxWidth / 2, 60, 20);
        playOverlay.endFill();
        
        const playTriangle = new PIXI.Graphics();
        playTriangle.beginFill(0x000000);
        playTriangle.drawPolygon([
            maxWidth / 2 - 8, 60 - 10,
            maxWidth / 2 - 8, 60 + 10,
            maxWidth / 2 + 8, 60
        ]);
        playTriangle.endFill();
        
        container.addChild(videoBg);
        container.addChild(playOverlay);
        container.addChild(playTriangle);
        
        return container;
    }
    
    createLinkContent(message, maxWidth) {
        const container = new PIXI.Container();
        
        // Link preview background
        const linkBg = new PIXI.Graphics();
        linkBg.beginFill(0x2c2c2c);
        linkBg.lineStyle(1, 0x404040);
        linkBg.drawRoundedRect(0, 0, maxWidth, 80, 8);
        linkBg.endFill();
        
        // Link title
        const titleText = new PIXI.Text(message.title || 'Link Title', {
            fontSize: 13,
            fill: '#ffffff',
            fontWeight: 'bold'
        });
        titleText.x = 10;
        titleText.y = 10;
        
        // Link URL
        const urlText = new PIXI.Text(message.url || 'https://example.com', {
            fontSize: 11,
            fill: '#1a73e8'
        });
        urlText.x = 10;
        urlText.y = 35;
        
        // Link description
        const descText = new PIXI.Text(message.description || 'Link description...', {
            fontSize: 10,
            fill: '#cccccc'
        });
        descText.x = 10;
        descText.y = 55;
        
        container.addChild(linkBg);
        container.addChild(titleText);
        container.addChild(urlText);
        container.addChild(descText);
        
        return container;
    }
    
    addSelectionCheckbox(container, message, x, y) {
        const checkbox = new PIXI.Graphics();
        const isSelected = this.selectedMessages.has(message.id);
        
        // Checkbox circle
        checkbox.lineStyle(2, 0xffffff, 0.8);
        checkbox.beginFill(isSelected ? 0x1a73e8 : 0x000000, isSelected ? 1 : 0.3);
        checkbox.drawCircle(0, 0, 10);
        checkbox.endFill();
        
        if (isSelected) {
            // Checkmark
            checkbox.lineStyle(2, 0xffffff);
            checkbox.moveTo(-4, 0);
            checkbox.lineTo(-1, 3);
            checkbox.lineTo(4, -3);
        }
        
        checkbox.x = x;
        checkbox.y = y;
        checkbox.eventMode = 'static';
        checkbox.cursor = 'pointer';
        
        checkbox.on('pointertap', () => {
            this.toggleMessageSelection(message);
        });
        
        container.addChild(checkbox);
    }
    
    addMessageInteraction(messageView) {
        messageView.eventMode = 'static';
        messageView.cursor = 'pointer';
        
        messageView.on('pointertap', (event) => {
            event.stopPropagation();
            
            if (this.multiSelectMode) {
                this.toggleMessageSelection(messageView.messageData);
            } else {
                this.showMessageActions(messageView);
            }
        });
        
        // Long press for multi-select
        let pressTimer;
        messageView.on('pointerdown', (event) => {
            pressTimer = setTimeout(() => {
                if (!this.multiSelectMode) {
                    this.enterMultiSelectMode();
                    this.toggleMessageSelection(messageView.messageData);
                }
            }, 500);
        });
        
        messageView.on('pointerup', () => {
            clearTimeout(pressTimer);
        });
        
        messageView.on('pointerupoutside', () => {
            clearTimeout(pressTimer);
        });
    }
    
    showMessageActions(messageView) {
        console.log('Showing message actions');
        
        this.hideActionButtons();
        this.currentSelectedMessage = messageView;
        
        const actions = [
            { label: 'Voice Over', icon: '🎭', action: 'voiceOver' },
            { label: 'Copy', icon: '📋', action: 'copy' },
            { label: 'Forward', icon: '↗️', action: 'forward' },
            { label: 'Favorite', icon: '⭐', action: 'favorite' },
            { label: 'Multi-Select', icon: '☑️', action: 'multiSelect' },
            { label: 'Quote', icon: '💬', action: 'quote' },
            { label: 'Enlarge', icon: '🔍', action: 'enlarge' },
            { label: 'Delete', icon: '🗑️', action: 'delete' }
        ];
        
        this.actionButtons = this.createActionButtonGroup(actions, messageView);
        this.container.addChild(this.actionButtons);
    }
    
    createActionButtonGroup(actions, messageView) {
        const group = new PIXI.Container();
        const buttonWidth = 60;
        const buttonHeight = 50;
        const spacing = 5;
        const totalWidth = actions.length * (buttonWidth + spacing) - spacing;
        
        // Position below message
        group.x = Math.max(10, Math.min(this.width - totalWidth - 10, messageView.x));
        group.y = messageView.y + this.virtualScroll.itemHeight + 10;
        
        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.8);
        bg.drawRoundedRect(-10, -5, totalWidth + 20, buttonHeight + 10, 8);
        bg.endFill();
        group.addChild(bg);
        
        actions.forEach((action, index) => {
            const button = this.createActionButton(action, index * (buttonWidth + spacing));
            group.addChild(button);
        });
        
        return group;
    }
    
    createActionButton(action, x) {
        const button = new PIXI.Container();
        button.x = x;
        
        // Button background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x333333, 0.8);
        bg.drawRoundedRect(0, 0, 60, 50, 6);
        bg.endFill();
        
        // Button icon
        const icon = new PIXI.Text(action.icon, {
            fontSize: 16,
            align: 'center'
        });
        icon.anchor.set(0.5);
        icon.x = 30;
        icon.y = 15;
        
        // Button label
        const label = new PIXI.Text(action.label, {
            fontSize: 8,
            fill: '#ffffff',
            align: 'center'
        });
        label.anchor.set(0.5);
        label.x = 30;
        label.y = 35;
        
        button.addChild(bg);
        button.addChild(icon);
        button.addChild(label);
        
        // Interaction
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointertap', () => {
            this.executeMessageAction(action.action);
        });
        
        return button;
    }
    
    executeMessageAction(action) {
        console.log(`Executing action: ${action}`);
        
        switch (action) {
            case 'voiceOver':
                this.showVoiceOverOptions();
                break;
            case 'copy':
                this.copyMessage();
                break;
            case 'forward':
                this.forwardMessage();
                break;
            case 'favorite':
                this.favoriteMessage();
                break;
            case 'multiSelect':
                this.enterMultiSelectMode();
                break;
            case 'quote':
                this.quoteMessage();
                break;
            case 'enlarge':
                this.enlargeMessage();
                break;
            case 'delete':
                this.deleteMessage();
                break;
        }
        
        this.hideActionButtons();
    }
    
    enterMultiSelectMode() {
        console.log('Entering multi-select mode');
        this.multiSelectMode = true;
        this.selectedMessages.clear();
        
        // Show bottom action bar
        this.showBottomActionBar();
        
        // Re-render all messages to show checkboxes
        this.rerenderAllMessages();
    }
    
    exitMultiSelectMode() {
        console.log('Exiting multi-select mode');
        this.multiSelectMode = false;
        this.selectedMessages.clear();
        
        // Hide bottom action bar
        this.hideBottomActionBar();
        
        // Re-render all messages to hide checkboxes
        this.rerenderAllMessages();
    }
    
    toggleMessageSelection(message) {
        if (this.selectedMessages.has(message.id)) {
            this.selectedMessages.delete(message.id);
        } else {
            this.selectedMessages.add(message.id);
        }
        
        this.updateBottomActionBar();
        this.rerenderAllMessages();
        
        console.log(`Selected messages: ${this.selectedMessages.size}`);
    }
    
    rerenderAllMessages() {
        // Clear rendered messages and re-render visible ones
        for (const messageView of this.renderedMessages.values()) {
            this.messageContainer.removeChild(messageView);
        }
        this.renderedMessages.clear();
        this.renderVisibleMessages();
    }
    
    createActionButtons() {
        // Action buttons will be created dynamically when needed
        this.actionButtons = null;
    }
    
    createBottomActionBar() {
        this.bottomActionBar = new PIXI.Container();
        this.bottomActionBar.y = this.height - 60;
        this.bottomActionBar.visible = false;
        
        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.9);
        bg.drawRect(0, 0, this.width, 60);
        bg.endFill();
        
        this.bottomActionBar.addChild(bg);
        
        // Action buttons
        const actions = [
            { label: 'Forward', icon: '↗️', action: 'forwardSelected' },
            { label: 'Delete', icon: '🗑️', action: 'deleteSelected' },
            { label: 'Copy', icon: '📋', action: 'copySelected' },
            { label: 'Cancel', icon: '❌', action: 'cancelSelection' }
        ];
        
        const buttonWidth = this.width / actions.length;
        actions.forEach((action, index) => {
            const button = this.createBottomActionButton(action, index * buttonWidth, buttonWidth);
            this.bottomActionBar.addChild(button);
        });
        
        this.container.addChild(this.bottomActionBar);
    }
    
    createBottomActionButton(action, x, width) {
        const button = new PIXI.Container();
        button.x = x;
        
        // Button text
        const text = new PIXI.Text(`${action.icon} ${action.label}`, {
            fontSize: 14,
            fill: '#ffffff',
            align: 'center'
        });
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = 30;
        
        button.addChild(text);
        
        // Interaction
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.on('pointertap', () => {
            this.executeBottomAction(action.action);
        });
        
        return button;
    }
    
    executeBottomAction(action) {
        console.log(`Executing bottom action: ${action}`);
        
        switch (action) {
            case 'forwardSelected':
                this.forwardSelectedMessages();
                break;
            case 'deleteSelected':
                this.deleteSelectedMessages();
                break;
            case 'copySelected':
                this.copySelectedMessages();
                break;
            case 'cancelSelection':
                this.exitMultiSelectMode();
                break;
        }
    }
    
    showBottomActionBar() {
        if (this.bottomActionBar) {
            this.bottomActionBar.visible = true;
        }
    }
    
    hideBottomActionBar() {
        if (this.bottomActionBar) {
            this.bottomActionBar.visible = false;
        }
    }
    
    updateBottomActionBar() {
        // Update selected count or other indicators
        const count = this.selectedMessages.size;
        console.log(`Bottom action bar updated: ${count} selected`);
    }
    
    hideActionButtons() {
        if (this.actionButtons) {
            this.container.removeChild(this.actionButtons);
            this.actionButtons = null;
        }
    }
    
    // Message action implementations
    showVoiceOverOptions() {
        console.log('Showing voice over options');
        // Implementation for voice over functionality
    }
    
    copyMessage() {
        console.log('Copying message');
        if (this.currentSelectedMessage) {
            const content = this.currentSelectedMessage.messageData.content;
            // Copy to clipboard implementation
        }
    }
    
    forwardMessage() {
        console.log('Forwarding message');
        // Implementation for forwarding single message
    }
    
    favoriteMessage() {
        console.log('Adding message to favorites');
        // Implementation for favoriting message
    }
    
    quoteMessage() {
        console.log('Quoting message');
        // Implementation for quoting message
    }
    
    enlargeMessage() {
        console.log('Enlarging message');
        // Implementation for enlarging message view
    }
    
    deleteMessage() {
        console.log('Deleting message');
        if (this.currentSelectedMessage) {
            const index = this.currentSelectedMessage.messageIndex;
            this.messages.splice(index, 1);
            this.updateVirtualScroll();
        }
    }
    
    forwardSelectedMessages() {
        console.log(`Forwarding ${this.selectedMessages.size} messages`);
        // Implementation for forwarding multiple messages
    }
    
    deleteSelectedMessages() {
        console.log(`Deleting ${this.selectedMessages.size} messages`);
        // Remove selected messages
        this.messages = this.messages.filter(msg => !this.selectedMessages.has(msg.id));
        this.exitMultiSelectMode();
        this.updateVirtualScroll();
    }
    
    copySelectedMessages() {
        console.log(`Copying ${this.selectedMessages.size} messages`);
        // Implementation for copying multiple messages
    }
    
    // Public API methods
    addMessage(message) {
        console.log(`Adding message: ${message.type}`);
        this.messages.push({
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            ...message
        });
        
        this.virtualScroll.totalHeight = this.messages.length * this.virtualScroll.itemHeight;
        this.updateVirtualScroll();
        
        // Auto-scroll to bottom for new messages
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.virtualScroll.scrollY = Math.max(0, this.virtualScroll.totalHeight - this.height);
        this.updateVirtualScroll();
    }
    
    getView() {
        return this.app.view;
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.app.renderer.resize(width, height);
        
        // Update viewport mask
        if (this.messageContainer.mask) {
            this.messageContainer.mask.clear();
            this.messageContainer.mask.beginFill(0xffffff);
            this.messageContainer.mask.drawRect(0, 0, width, height);
            this.messageContainer.mask.endFill();
        }
        
        // Update bottom action bar
        if (this.bottomActionBar) {
            this.bottomActionBar.y = height - 60;
            // Re-create bottom action bar with new width
            this.container.removeChild(this.bottomActionBar);
            this.createBottomActionBar();
        }
        
        this.updateVirtualScroll();
        console.log(`Resized to ${width}x${height}`);
    }
    
    destroy() {
        console.log('Destroying ChatMessageArea');
        this.app.destroy(true);
    }
}

export default ChatMessageArea;