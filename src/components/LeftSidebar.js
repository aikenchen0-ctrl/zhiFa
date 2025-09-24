import * as PIXI from 'pixi.js';
import { ConversationAvatar } from './ConversationAvatar.js';

export class LeftSidebar extends PIXI.Container {
    constructor(options = {}) {
        super();
        
        this.options = {
            width: 100,
            height: 800,
            itemHeight: 60,
            itemSpacing: 5,
            maxItems: 10000,
            ...options
        };
        
        this.conversations = [];
        this.visibleAvatars = new Map();
        this.currentConversationIndex = 0;
        this.hoverTimeout = null;
        this.hoverTarget = null;
        this.insertedButtons = null;
        this.scrollY = 0;
        this.maxScrollY = 0;
        this.isDragging = false;
        this.lastPointerY = 0;
        
        console.log('LeftSidebar: Initializing with options', this.options);
        
        this.setupContainer();
        this.generateMockData();
        this.setupScrolling();
        this.setupEvents();
        this.render();
    }
    
    setupContainer() {
        // Create background
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x2c3e50);
        this.background.drawRect(0, 0, this.options.width, this.options.height);
        this.background.endFill();
        this.addChild(this.background);
        
        // Create scrollable container
        this.scrollContainer = new PIXI.Container();
        this.addChild(this.scrollContainer);
        
        // Create mask for scrolling area
        this.scrollMask = new PIXI.Graphics();
        this.scrollMask.beginFill(0xffffff);
        this.scrollMask.drawRect(0, 0, this.options.width, this.options.height);
        this.scrollMask.endFill();
        this.addChild(this.scrollMask);
        this.scrollContainer.mask = this.scrollMask;
        
        console.log('LeftSidebar: Container setup complete');
    }
    
    generateMockData() {
        console.log('LeftSidebar: Generating mock data for', this.options.maxItems, 'conversations');
        
        const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
        const locations = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Nanjing'];
        const tags = ['Work', 'Friend', 'Family', 'Business', 'School', 'Hobby'];
        const messages = [
            'Hello there!',
            'How are you doing?',
            'See you tomorrow',
            'Thanks for the help',
            'Good morning!',
            'Have a nice day'
        ];
        
        for (let i = 0; i < this.options.maxItems; i++) {
            this.conversations.push({
                id: i,
                name: `${names[i % names.length]}_${i}`,
                location: locations[i % locations.length],
                tags: [tags[i % tags.length], tags[(i + 1) % tags.length]],
                lastMessage: messages[i % messages.length],
                timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
                avatar: `avatar_${i % 10}.png`,
                isOnline: Math.random() > 0.3
            });
        }
        
        this.maxScrollY = Math.max(0, (this.conversations.length * (this.options.itemHeight + this.options.itemSpacing)) - this.options.height);
        console.log('LeftSidebar: Mock data generated, maxScrollY:', this.maxScrollY);
    }
    
    setupScrolling() {
        // Mouse wheel scrolling
        this.interactive = true;
        this.on('wheel', this.onWheel.bind(this));
        
        // Touch/drag scrolling
        this.on('pointerdown', this.onPointerDown.bind(this));
        this.on('pointermove', this.onPointerMove.bind(this));
        this.on('pointerup', this.onPointerUp.bind(this));
        this.on('pointerupoutside', this.onPointerUp.bind(this));
        
        console.log('LeftSidebar: Scrolling events setup complete');
    }
    
    setupEvents() {
        // Hover detection for 5-second trigger
        this.on('pointermove', this.onHover.bind(this));
        this.on('pointerout', this.onHoverOut.bind(this));
        
        console.log('LeftSidebar: Event listeners setup complete');
    }
    
    onWheel(event) {
        const delta = event.deltaY;
        this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + delta));
        this.render();
        
        console.log('LeftSidebar: Wheel scroll, scrollY:', this.scrollY);
    }
    
    onPointerDown(event) {
        this.isDragging = true;
        this.lastPointerY = event.data.global.y;
        console.log('LeftSidebar: Pointer down at', this.lastPointerY);
    }
    
    onPointerMove(event) {
        if (this.isDragging) {
            const deltaY = event.data.global.y - this.lastPointerY;
            this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY - deltaY));
            this.lastPointerY = event.data.global.y;
            this.render();
        }
    }
    
    onPointerUp() {
        this.isDragging = false;
        console.log('LeftSidebar: Pointer up, dragging stopped');
    }
    
    onHover(event) {
        const localY = event.data.getLocalPosition(this.scrollContainer).y + this.scrollY;
        const itemIndex = Math.floor(localY / (this.options.itemHeight + this.options.itemSpacing));
        
        if (itemIndex >= 0 && itemIndex < this.conversations.length && itemIndex !== this.currentConversationIndex) {
            if (this.hoverTarget !== itemIndex) {
                this.clearHoverTimeout();
                this.hoverTarget = itemIndex;
                
                this.hoverTimeout = setTimeout(() => {
                    this.showHoverButtons(itemIndex);
                    console.log('LeftSidebar: 5-second hover triggered for item', itemIndex);
                }, 5000);
            }
        } else {
            this.clearHoverTimeout();
        }
    }
    
    onHoverOut() {
        this.clearHoverTimeout();
    }
    
    clearHoverTimeout() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
            this.hoverTarget = null;
        }
        
        if (this.insertedButtons) {
            this.hideHoverButtons();
        }
    }
    
    showHoverButtons(itemIndex) {
        console.log('LeftSidebar: Showing hover buttons for item', itemIndex);
        
        const y = itemIndex * (this.options.itemHeight + this.options.itemSpacing) - this.scrollY;
        
        // Create forward button (above)
        const forwardButton = new PIXI.Graphics();
        forwardButton.beginFill(0x3498db);
        forwardButton.drawRoundedRect(10, y - 25, 80, 20, 5);
        forwardButton.endFill();
        
        const forwardText = new PIXI.Text('Forward', { fontSize: 12, fill: 0xffffff });
        forwardText.x = 50 - forwardText.width / 2;
        forwardText.y = y - 22;
        
        // Create moments button (below)
        const momentsButton = new PIXI.Graphics();
        momentsButton.beginFill(0x27ae60);
        momentsButton.drawRoundedRect(10, y + this.options.itemHeight + 5, 80, 20, 5);
        momentsButton.endFill();
        
        const momentsText = new PIXI.Text('Moments', { fontSize: 12, fill: 0xffffff });
        momentsText.x = 50 - momentsText.width / 2;
        momentsText.y = y + this.options.itemHeight + 8;
        
        this.insertedButtons = new PIXI.Container();
        this.insertedButtons.addChild(forwardButton);
        this.insertedButtons.addChild(forwardText);
        this.insertedButtons.addChild(momentsButton);
        this.insertedButtons.addChild(momentsText);
        
        this.scrollContainer.addChild(this.insertedButtons);
        
        // Add squashing effect to other avatars
        this.applySquashEffect(itemIndex);
    }
    
    hideHoverButtons() {
        if (this.insertedButtons) {
            this.scrollContainer.removeChild(this.insertedButtons);
            this.insertedButtons.destroy();
            this.insertedButtons = null;
        }
        
        // Remove squashing effect
        this.removeSquashEffect();
        
        console.log('LeftSidebar: Hover buttons hidden');
    }
    
    applySquashEffect(targetIndex) {
        this.visibleAvatars.forEach((avatar, index) => {
            if (Math.abs(index - targetIndex) <= 2 && index !== targetIndex) {
                const distance = Math.abs(index - targetIndex);
                const squashFactor = 1 - (0.3 / distance);
                avatar.scale.y = squashFactor;
                
                console.log('LeftSidebar: Applied squash effect to avatar', index, 'factor:', squashFactor);
            }
        });
    }
    
    removeSquashEffect() {
        this.visibleAvatars.forEach((avatar) => {
            avatar.scale.y = 1;
        });
        
        console.log('LeftSidebar: Squash effect removed from all avatars');
    }
    
    render() {
        // Clear existing avatars
        this.visibleAvatars.forEach(avatar => {
            this.scrollContainer.removeChild(avatar);
            avatar.destroy();
        });
        this.visibleAvatars.clear();
        
        // Calculate visible range (virtualized scrolling)
        const itemTotalHeight = this.options.itemHeight + this.options.itemSpacing;
        const startIndex = Math.max(0, Math.floor(this.scrollY / itemTotalHeight) - 2);
        const endIndex = Math.min(this.conversations.length, startIndex + Math.ceil(this.options.height / itemTotalHeight) + 4);
        
        console.log('LeftSidebar: Rendering items from', startIndex, 'to', endIndex, 'scrollY:', this.scrollY);
        
        // Render visible avatars
        for (let i = startIndex; i < endIndex; i++) {
            const conversation = this.conversations[i];
            const y = i * itemTotalHeight - this.scrollY;
            
            const avatar = new ConversationAvatar(conversation, {
                width: this.options.width,
                height: this.options.itemHeight,
                isCurrentConversation: i === this.currentConversationIndex
            });
            
            avatar.y = y;
            this.scrollContainer.addChild(avatar);
            this.visibleAvatars.set(i, avatar);
            
            // Handle boundary fixing for current conversation
            if (i === this.currentConversationIndex) {
                this.handleBoundaryFixing(avatar, y, i);
            }
        }
        
        console.log('LeftSidebar: Rendered', this.visibleAvatars.size, 'visible avatars');
    }
    
    handleBoundaryFixing(avatar, originalY, index) {
        const itemTotalHeight = this.options.itemHeight + this.options.itemSpacing;
        
        // Fix at top boundary
        if (originalY < 0 && this.scrollY > index * itemTotalHeight) {
            avatar.y = 0;
            console.log('LeftSidebar: Fixed current conversation at top boundary');
        }
        
        // Fix at bottom boundary
        if (originalY + this.options.itemHeight > this.options.height && 
            this.scrollY < (index + 1) * itemTotalHeight - this.options.height) {
            avatar.y = this.options.height - this.options.itemHeight;
            console.log('LeftSidebar: Fixed current conversation at bottom boundary');
        }
    }
    
    setCurrentConversation(index) {
        if (index >= 0 && index < this.conversations.length) {
            console.log('LeftSidebar: Setting current conversation to', index);
            this.currentConversationIndex = index;
            this.render();
        }
    }
    
    scrollToConversation(index) {
        if (index >= 0 && index < this.conversations.length) {
            const targetY = index * (this.options.itemHeight + this.options.itemSpacing);
            this.scrollY = Math.max(0, Math.min(this.maxScrollY, targetY - this.options.height / 2));
            this.render();
            
            console.log('LeftSidebar: Scrolled to conversation', index, 'scrollY:', this.scrollY);
        }
    }
    
    getConversationAt(globalY) {
        const localY = globalY + this.scrollY;
        const itemIndex = Math.floor(localY / (this.options.itemHeight + this.options.itemSpacing));
        
        if (itemIndex >= 0 && itemIndex < this.conversations.length) {
            return {
                index: itemIndex,
                conversation: this.conversations[itemIndex]
            };
        }
        
        return null;
    }
    
    destroy() {
        this.clearHoverTimeout();
        super.destroy();
        console.log('LeftSidebar: Destroyed');
    }
}