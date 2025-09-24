/**
 * MessageBubble Component - PixiJS v8 Message Bubble System
 * Features: Simple/detailed bubbles, multiple message types, dynamic sizing, click interactions
 */

import * as PIXI from 'pixi.js';
import VisionMaterial from './VisionMaterial.js';

export class MessageBubble extends PIXI.Container {
    constructor(messageData, options = {}) {
        super();
        
        // Message data
        this.messageData = {
            id: messageData.id || Date.now().toString(),
            text: messageData.text || '',
            type: messageData.type || 'text', // text, image, file, audio, video, system
            sender: messageData.sender || 'user',
            timestamp: messageData.timestamp || new Date(),
            isOwn: messageData.isOwn || false,
            status: messageData.status || 'sent', // sending, sent, delivered, read
            metadata: messageData.metadata || {}
        };
        
        // Configuration options
        this.config = {
            maxWidth: options.maxWidth || 280,
            minWidth: options.minWidth || 80,
            padding: options.padding || { top: 12, right: 16, bottom: 12, left: 16 },
            borderRadius: options.borderRadius || 18,
            bubbleStyle: options.bubbleStyle || 'detailed', // simple, detailed
            showTail: options.showTail !== false,
            showTimestamp: options.showTimestamp !== false,
            showAvatar: options.showAvatar && !this.messageData.isOwn,
            animateIn: options.animateIn !== false
        };
        
        // Visual state
        this.state = {
            isSelected: false,
            isHovered: false,
            isPressed: false,
            showMenu: false
        };
        
        // Event emitter
        this.events = new PIXI.EventEmitter();
        
        // Material system
        this.visionMaterial = new VisionMaterial();
        
        console.log('[MessageBubble] Creating message bubble:', {
            id: this.messageData.id,
            type: this.messageData.type,
            isOwn: this.messageData.isOwn,
            style: this.config.bubbleStyle
        });
        
        this.init();
    }
    
    init() {
        try {
            this.createBubbleContainer();
            this.createContent();
            this.createMetadata();
            this.setupInteractivity();
            
            if (this.config.animateIn) {
                this.animateIn();
            }
            
            console.log('[MessageBubble] Bubble initialized successfully');
        } catch (error) {
            console.error('[MessageBubble] Failed to initialize bubble:', error);
            throw error;
        }
    }
    
    createBubbleContainer() {
        // Main bubble container
        this.bubbleContainer = new PIXI.Container();
        
        // Calculate content dimensions
        const contentMetrics = this.calculateContentSize();
        this.bubbleWidth = Math.max(
            this.config.minWidth,
            Math.min(this.config.maxWidth, contentMetrics.width + this.config.padding.left + this.config.padding.right)
        );
        this.bubbleHeight = contentMetrics.height + this.config.padding.top + this.config.padding.bottom;
        
        // Create bubble background using Vision Material
        const materialType = this.messageData.isOwn 
            ? this.visionMaterial.materials.GLASS_SEMI 
            : this.visionMaterial.materials.GLASS_FULL;
        
        this.bubbleBackground = this.visionMaterial.createGlassMaterial(
            materialType,
            this.bubbleWidth,
            this.bubbleHeight,
            this.config.borderRadius,
            {
                fillColor: this.messageData.isOwn ? 0x007AFF : 0xF0F0F0,
                fillAlpha: this.messageData.isOwn ? 0.8 : 0.9,
                glow: this.messageData.isOwn
            }
        );
        
        // Add bubble tail if enabled
        if (this.config.showTail) {
            this.createBubbleTail();
        }
        
        this.bubbleContainer.addChild(this.bubbleBackground);
        this.addChild(this.bubbleContainer);
        
        console.log('[MessageBubble] Bubble container created', {
            width: this.bubbleWidth,
            height: this.bubbleHeight,
            materialType
        });
    }
    
    createBubbleTail() {
        const tail = new PIXI.Graphics();
        const tailSize = 8;
        
        if (this.messageData.isOwn) {
            // Right-side tail for own messages
            tail.poly([
                this.bubbleWidth, this.bubbleHeight - 20,
                this.bubbleWidth + tailSize, this.bubbleHeight - 15,
                this.bubbleWidth, this.bubbleHeight - 10
            ]);
        } else {
            // Left-side tail for received messages
            tail.poly([
                0, this.bubbleHeight - 20,
                -tailSize, this.bubbleHeight - 15,
                0, this.bubbleHeight - 10
            ]);
        }
        
        tail.fill({ 
            color: this.messageData.isOwn ? 0x007AFF : 0xF0F0F0, 
            alpha: this.messageData.isOwn ? 0.8 : 0.9 
        });
        
        this.bubbleContainer.addChild(tail);
        
        console.log('[MessageBubble] Bubble tail created');
    }
    
    calculateContentSize() {
        // Temporary text for measurements
        const tempText = new PIXI.Text({
            text: this.messageData.text,
            style: this.getTextStyle()
        });
        
        let width = tempText.width;
        let height = tempText.height;
        
        // Adjust for different message types
        switch (this.messageData.type) {
            case 'image':
                width = Math.min(200, this.config.maxWidth - 32);
                height = width * 0.75; // Aspect ratio
                break;
            case 'file':
                height += 20; // Extra space for file icon
                break;
            case 'audio':
                width = Math.max(width, 150);
                height += 30; // Extra space for audio controls
                break;
            case 'video':
                width = Math.min(250, this.config.maxWidth - 32);
                height = width * 0.56; // 16:9 aspect ratio
                break;
        }
        
        tempText.destroy();
        
        return { width, height };
    }
    
    createContent() {
        this.contentContainer = new PIXI.Container();
        this.contentContainer.position.set(this.config.padding.left, this.config.padding.top);
        
        switch (this.messageData.type) {
            case 'text':
                this.createTextContent();
                break;
            case 'image':
                this.createImageContent();
                break;
            case 'file':
                this.createFileContent();
                break;
            case 'audio':
                this.createAudioContent();
                break;
            case 'video':
                this.createVideoContent();
                break;
            case 'system':
                this.createSystemContent();
                break;
            default:
                this.createTextContent();
        }
        
        this.bubbleContainer.addChild(this.contentContainer);
        
        console.log('[MessageBubble] Content created for type:', this.messageData.type);
    }
    
    createTextContent() {
        const textStyle = this.getTextStyle();
        
        // Main text
        this.messageText = new PIXI.Text({
            text: this.messageData.text,
            style: textStyle
        });
        
        // Apply text shadow using Vision Material
        if (this.messageData.isOwn) {
            const textWithShadow = this.visionMaterial.applyTextShadow(this.messageText, {
                color: 0x000000,
                alpha: 0.2,
                blur: 2,
                distance: 1
            });
            this.contentContainer.addChild(textWithShadow);
        } else {
            this.contentContainer.addChild(this.messageText);
        }
    }
    
    createImageContent() {
        // Placeholder for image content
        const imagePlaceholder = new PIXI.Graphics();
        const imageWidth = Math.min(200, this.config.maxWidth - 32);
        const imageHeight = imageWidth * 0.75;
        
        imagePlaceholder
            .roundRect(0, 0, imageWidth, imageHeight, 8)
            .fill({ color: 0xE0E0E0, alpha: 0.8 })
            .stroke({ color: 0xCCCCCC, width: 1 });
        
        // Image icon
        const imageIcon = new PIXI.Text({
            text: '🖼️',
            style: {
                fontSize: 32,
                align: 'center'
            }
        });
        imageIcon.anchor.set(0.5);
        imageIcon.position.set(imageWidth / 2, imageHeight / 2);
        
        // Image metadata
        if (this.messageData.metadata.filename) {
            const filename = new PIXI.Text({
                text: this.messageData.metadata.filename,
                style: {
                    fontSize: 10,
                    fill: 0x666666,
                    wordWrap: true,
                    wordWrapWidth: imageWidth
                }
            });
            filename.position.set(0, imageHeight + 5);
            this.contentContainer.addChild(filename);
        }
        
        this.contentContainer.addChild(imagePlaceholder);
        this.contentContainer.addChild(imageIcon);
    }
    
    createFileContent() {
        const fileContainer = new PIXI.Container();
        
        // File icon
        const fileIcon = new PIXI.Text({
            text: '📄',
            style: { fontSize: 24 }
        });
        fileIcon.position.set(0, 0);
        
        // File name
        const fileName = new PIXI.Text({
            text: this.messageData.metadata.filename || 'Document',
            style: {
                fontSize: 14,
                fill: this.messageData.isOwn ? 0xFFFFFF : 0x333333,
                fontWeight: 'bold'
            }
        });
        fileName.position.set(35, 0);
        
        // File size
        const fileSize = new PIXI.Text({
            text: this.messageData.metadata.filesize || '0 KB',
            style: {
                fontSize: 11,
                fill: this.messageData.isOwn ? 0xCCCCCC : 0x666666
            }
        });
        fileSize.position.set(35, 18);
        
        fileContainer.addChild(fileIcon);
        fileContainer.addChild(fileName);
        fileContainer.addChild(fileSize);
        
        this.contentContainer.addChild(fileContainer);
    }
    
    createAudioContent() {
        const audioContainer = new PIXI.Container();
        
        // Audio icon
        const audioIcon = new PIXI.Text({
            text: '🎵',
            style: { fontSize: 20 }
        });
        audioIcon.position.set(0, 0);
        
        // Play/pause button
        const playButton = new PIXI.Graphics();
        playButton.circle(0, 0, 15)
                  .fill({ color: this.messageData.isOwn ? 0xFFFFFF : 0x007AFF, alpha: 0.8 });
        
        const playIcon = new PIXI.Text({
            text: '▶️',
            style: { fontSize: 12 }
        });
        playIcon.anchor.set(0.5);
        playButton.addChild(playIcon);
        playButton.position.set(25, 15);
        
        // Audio duration
        const duration = new PIXI.Text({
            text: this.messageData.metadata.duration || '0:00',
            style: {
                fontSize: 12,
                fill: this.messageData.isOwn ? 0xCCCCCC : 0x666666
            }
        });
        duration.position.set(50, 10);
        
        // Waveform placeholder
        const waveform = new PIXI.Graphics();
        for (let i = 0; i < 10; i++) {
            const height = Math.random() * 15 + 5;
            waveform.rect(50 + i * 8, 25 - height/2, 4, height)
                    .fill({ color: this.messageData.isOwn ? 0xFFFFFF : 0x007AFF, alpha: 0.6 });
        }
        
        audioContainer.addChild(audioIcon);
        audioContainer.addChild(playButton);
        audioContainer.addChild(duration);
        audioContainer.addChild(waveform);
        
        // Make play button interactive
        playButton.eventMode = 'static';
        playButton.cursor = 'pointer';
        playButton.on('pointerdown', () => {
            console.log('[MessageBubble] Audio play button clicked');
            this.events.emit('audioPlay', { messageId: this.messageData.id });
        });
        
        this.contentContainer.addChild(audioContainer);
    }
    
    createVideoContent() {
        const videoContainer = new PIXI.Container();
        const videoWidth = Math.min(250, this.config.maxWidth - 32);
        const videoHeight = videoWidth * 0.56;
        
        // Video thumbnail
        const thumbnail = new PIXI.Graphics();
        thumbnail.roundRect(0, 0, videoWidth, videoHeight, 8)
                 .fill({ color: 0x333333, alpha: 0.8 });
        
        // Play button overlay
        const playOverlay = new PIXI.Graphics();
        playOverlay.circle(videoWidth/2, videoHeight/2, 25)
                   .fill({ color: 0x000000, alpha: 0.6 });
        
        const playIcon = new PIXI.Text({
            text: '▶️',
            style: { fontSize: 24 }
        });
        playIcon.anchor.set(0.5);
        playIcon.position.set(videoWidth/2, videoHeight/2);
        
        // Video duration badge
        const durationBadge = new PIXI.Graphics();
        durationBadge.roundRect(videoWidth - 50, videoHeight - 25, 45, 20, 10)
                     .fill({ color: 0x000000, alpha: 0.7 });
        
        const durationText = new PIXI.Text({
            text: this.messageData.metadata.duration || '0:00',
            style: {
                fontSize: 10,
                fill: 0xFFFFFF,
                fontWeight: 'bold'
            }
        });
        durationText.anchor.set(0.5);
        durationText.position.set(videoWidth - 27.5, videoHeight - 15);
        
        videoContainer.addChild(thumbnail);
        videoContainer.addChild(playOverlay);
        videoContainer.addChild(playIcon);
        videoContainer.addChild(durationBadge);
        videoContainer.addChild(durationText);
        
        // Make video interactive
        videoContainer.eventMode = 'static';
        videoContainer.cursor = 'pointer';
        videoContainer.on('pointerdown', () => {
            console.log('[MessageBubble] Video play clicked');
            this.events.emit('videoPlay', { messageId: this.messageData.id });
        });
        
        this.contentContainer.addChild(videoContainer);
    }
    
    createSystemContent() {
        const systemText = new PIXI.Text({
            text: this.messageData.text,
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI"',
                fontSize: 12,
                fill: 0x999999,
                fontStyle: 'italic',
                align: 'center',
                wordWrap: true,
                wordWrapWidth: this.config.maxWidth - 32
            }
        });
        systemText.anchor.set(0.5, 0);
        systemText.position.set((this.bubbleWidth - this.config.padding.left - this.config.padding.right) / 2, 0);
        
        this.contentContainer.addChild(systemText);
    }
    
    createMetadata() {
        if (this.config.bubbleStyle === 'simple') return;
        
        this.metadataContainer = new PIXI.Container();
        
        const metadataY = this.bubbleHeight + 5;
        let metadataX = this.messageData.isOwn ? this.bubbleWidth - 10 : 10;
        
        // Timestamp
        if (this.config.showTimestamp) {
            const timeText = this.formatTimestamp(this.messageData.timestamp);
            const timestamp = new PIXI.Text({
                text: timeText,
                style: {
                    fontSize: 10,
                    fill: 0x999999,
                    fontWeight: '400'
                }
            });
            
            if (this.messageData.isOwn) {
                timestamp.anchor.set(1, 0);
            }
            timestamp.position.set(metadataX, metadataY);
            
            this.metadataContainer.addChild(timestamp);
            
            if (this.messageData.isOwn) {
                metadataX -= timestamp.width + 10;
            } else {
                metadataX += timestamp.width + 10;
            }
        }
        
        // Message status (for own messages)
        if (this.messageData.isOwn) {
            const statusIcon = this.getStatusIcon(this.messageData.status);
            if (statusIcon) {
                const status = new PIXI.Text({
                    text: statusIcon,
                    style: { fontSize: 10, fill: 0x007AFF }
                });
                status.anchor.set(1, 0);
                status.position.set(metadataX, metadataY);
                
                this.metadataContainer.addChild(status);
            }
        }
        
        this.addChild(this.metadataContainer);
        
        console.log('[MessageBubble] Metadata created');
    }
    
    setupInteractivity() {
        // Make bubble interactive
        this.bubbleContainer.eventMode = 'static';
        this.bubbleContainer.cursor = 'pointer';
        
        // Event handlers
        this.bubbleContainer.on('pointerenter', this.onBubbleHover.bind(this));
        this.bubbleContainer.on('pointerleave', this.onBubbleLeave.bind(this));
        this.bubbleContainer.on('pointerdown', this.onBubblePress.bind(this));
        this.bubbleContainer.on('pointerup', this.onBubbleRelease.bind(this));
        this.bubbleContainer.on('pointertap', this.onBubbleClick.bind(this));
        this.bubbleContainer.on('rightclick', this.onBubbleRightClick.bind(this));
        
        console.log('[MessageBubble] Interactivity setup complete');
    }
    
    // Event handlers
    onBubbleHover() {
        this.state.isHovered = true;
        this.updateVisualState();
    }
    
    onBubbleLeave() {
        this.state.isHovered = false;
        this.state.isPressed = false;
        this.updateVisualState();
    }
    
    onBubblePress() {
        this.state.isPressed = true;
        this.updateVisualState();
    }
    
    onBubbleRelease() {
        this.state.isPressed = false;
        this.updateVisualState();
    }
    
    onBubbleClick() {
        console.log('[MessageBubble] Bubble clicked:', this.messageData.id);
        this.events.emit('bubbleClick', {
            messageId: this.messageData.id,
            messageData: this.messageData,
            position: { x: this.x, y: this.y }
        });
    }
    
    onBubbleRightClick(event) {
        console.log('[MessageBubble] Bubble right-clicked:', this.messageData.id);
        this.events.emit('bubbleRightClick', {
            messageId: this.messageData.id,
            messageData: this.messageData,
            position: { x: event.global.x, y: event.global.y }
        });
    }
    
    updateVisualState() {
        let tint = 0xFFFFFF;
        let alpha = 1.0;
        
        if (this.state.isPressed) {
            alpha = 0.8;
        } else if (this.state.isHovered) {
            tint = 0xF0F0F0;
        }
        
        if (this.state.isSelected) {
            tint = 0xE3F2FD;
        }
        
        this.bubbleBackground.tint = tint;
        this.bubbleBackground.alpha = alpha;
    }
    
    // Helper methods
    getTextStyle() {
        return {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI"',
            fontSize: 16,
            fill: this.messageData.isOwn ? 0xFFFFFF : 0x333333,
            fontWeight: '400',
            wordWrap: true,
            wordWrapWidth: this.config.maxWidth - this.config.padding.left - this.config.padding.right,
            lineHeight: 20
        };
    }
    
    formatTimestamp(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) {
            return 'now';
        } else if (diffMins < 60) {
            return `${diffMins}m`;
        } else if (diffHours < 24) {
            return `${diffHours}h`;
        } else if (diffDays < 7) {
            return `${diffDays}d`;
        } else {
            return messageTime.toLocaleDateString();
        }
    }
    
    getStatusIcon(status) {
        const icons = {
            sending: '⏳',
            sent: '✓',
            delivered: '✓✓',
            read: '✓✓'
        };
        return icons[status] || '';
    }
    
    // Animation methods
    animateIn() {
        // Start from small scale and fade in
        this.scale.set(0.7);
        this.alpha = 0;
        
        const animate = () => {
            const targetScale = 1.0;
            const targetAlpha = 1.0;
            const speed = 0.15;
            
            this.scale.x += (targetScale - this.scale.x) * speed;
            this.scale.y += (targetScale - this.scale.y) * speed;
            this.alpha += (targetAlpha - this.alpha) * speed;
            
            if (Math.abs(this.scale.x - targetScale) > 0.01 || Math.abs(this.alpha - targetAlpha) > 0.01) {
                requestAnimationFrame(animate);
            } else {
                this.scale.set(targetScale);
                this.alpha = targetAlpha;
            }
        };
        
        animate();
        
        console.log('[MessageBubble] Animate in started');
    }
    
    animateOut(callback) {
        const animate = () => {
            const targetScale = 0.7;
            const targetAlpha = 0.0;
            const speed = 0.2;
            
            this.scale.x += (targetScale - this.scale.x) * speed;
            this.scale.y += (targetScale - this.scale.y) * speed;
            this.alpha += (targetAlpha - this.alpha) * speed;
            
            if (Math.abs(this.scale.x - targetScale) > 0.01 || Math.abs(this.alpha - targetAlpha) > 0.01) {
                requestAnimationFrame(animate);
            } else {
                this.scale.set(targetScale);
                this.alpha = targetAlpha;
                if (callback) callback();
            }
        };
        
        animate();
        
        console.log('[MessageBubble] Animate out started');
    }
    
    // Public methods
    updateMessage(newMessageData) {
        const oldData = { ...this.messageData };
        this.messageData = { ...this.messageData, ...newMessageData };
        
        // Update content if text changed
        if (oldData.text !== this.messageData.text) {
            this.contentContainer.removeChildren();
            this.createContent();
        }
        
        // Update metadata if needed
        if (oldData.status !== this.messageData.status || oldData.timestamp !== this.messageData.timestamp) {
            if (this.metadataContainer) {
                this.removeChild(this.metadataContainer);
                this.metadataContainer.destroy();
            }
            this.createMetadata();
        }
        
        console.log('[MessageBubble] Message updated:', {
            id: this.messageData.id,
            changes: Object.keys(newMessageData)
        });
    }
    
    setSelected(selected) {
        this.state.isSelected = selected;
        this.updateVisualState();
        
        console.log('[MessageBubble] Selection state changed:', selected);
    }
    
    getBounds() {
        return {
            width: this.bubbleWidth,
            height: this.bubbleHeight + (this.metadataContainer ? 20 : 0),
            contentBounds: {
                width: this.bubbleWidth - this.config.padding.left - this.config.padding.right,
                height: this.bubbleHeight - this.config.padding.top - this.config.padding.bottom
            }
        };
    }
    
    destroy() {
        try {
            // Clean up event listeners
            this.removeAllListeners();
            this.events.removeAllListeners();
            
            // Destroy vision material
            if (this.visionMaterial) {
                this.visionMaterial.destroy();
            }
            
            // Destroy children
            this.children.forEach(child => {
                if (child.destroy) {
                    child.destroy();
                }
            });
            
            super.destroy();
            
            console.log('[MessageBubble] Bubble destroyed:', this.messageData.id);
        } catch (error) {
            console.error('[MessageBubble] Error during destruction:', error);
        }
    }
}

// Helper factory function
export const createMessageBubble = (messageData, options = {}) => {
    return new MessageBubble(messageData, options);
};

export default MessageBubble;