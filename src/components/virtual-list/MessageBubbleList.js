import BaseVirtualList from './BaseVirtualList.js';

class MessageBubbleList extends BaseVirtualList {
    constructor(container, options = {}) {
        super(container, {
            estimatedItemHeight: 60,
            overscanCount: 5,
            threshold: 200,
            ...options
        });
        
        this.messageHeights = new Map();
        this.positionUpdateCallback = null;
        this.connectionLines = new Map();
    }

    setPositionUpdateCallback(callback) {
        this.positionUpdateCallback = callback;
    }

    getItemHeight(index) {
        const message = this.data[index];
        if (!message) return this.options.estimatedItemHeight;
        
        if (this.messageHeights.has(message.id)) {
            return this.messageHeights.get(message.id);
        }
        
        let height = 60;
        
        if (message.type === 'image') {
            height = 200;
        } else if (message.text) {
            const textLength = message.text.length;
            const lines = Math.max(1, Math.ceil(textLength / 40));
            height = Math.max(60, 40 + lines * 20);
        }
        
        if (message.reactions && message.reactions.length > 0) {
            height += 30;
        }
        
        this.messageHeights.set(message.id, height);
        return height;
    }

    createItem(messageData, index) {
        const item = document.createElement('div');
        item.className = 'message-bubble-item';
        item.dataset.messageId = messageData.id;
        item.dataset.senderId = messageData.senderId;
        item.dataset.index = index;
        
        const isOwnMessage = messageData.senderId === 'current-user';
        item.classList.add(isOwnMessage ? 'own-message' : 'other-message');
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        if (messageData.type === 'text') {
            content.textContent = messageData.text || `Message ${index}`;
        } else if (messageData.type === 'image') {
            const img = document.createElement('img');
            img.src = messageData.imageUrl || `/api/placeholder/200/150`;
            img.alt = 'Image message';
            img.className = 'message-image';
            img.loading = 'lazy';
            content.appendChild(img);
        }
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = messageData.time || new Date().toLocaleTimeString();
        
        bubble.appendChild(content);
        bubble.appendChild(time);
        
        if (messageData.reactions && messageData.reactions.length > 0) {
            const reactions = document.createElement('div');
            reactions.className = 'message-reactions';
            messageData.reactions.forEach(reaction => {
                const reactionEl = document.createElement('span');
                reactionEl.className = 'reaction';
                reactionEl.textContent = `${reaction.emoji} ${reaction.count}`;
                reactions.appendChild(reactionEl);
            });
            bubble.appendChild(reactions);
        }
        
        const connectionPoint = document.createElement('div');
        connectionPoint.className = 'connection-point';
        connectionPoint.classList.add(isOwnMessage ? 'right-point' : 'left-point');
        
        item.appendChild(bubble);
        item.appendChild(connectionPoint);
        
        return item;
    }

    render() {
        super.render();
        
        requestAnimationFrame(() => {
            this.updateConnectionPoints();
        });
    }

    updateConnectionPoints() {
        if (!this.positionUpdateCallback) return;
        
        const connections = new Map();
        
        for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
            const message = this.data[i];
            if (!message) continue;
            
            // 获取列表项位置
            const itemPosition = this.getItemPosition(i);
            if (!itemPosition) continue;
            
            // 获取实际的bubble元素位置
            const itemElement = this.getItemElement(i);
            if (!itemElement) continue;
            
            const bubbleElement = itemElement.querySelector('.message-bubble');
            if (!bubbleElement) continue;
            
            const containerRect = this.container.getBoundingClientRect();
            const bubbleRect = bubbleElement.getBoundingClientRect();
            
            const isOwnMessage = message.senderId === 'current-user';
            
            // 计算气泡边缘的连接点
            const connectionX = isOwnMessage 
                ? bubbleRect.right - containerRect.left    // 右侧边框中点
                : bubbleRect.left - containerRect.left;    // 左侧边框中点
            const connectionY = (bubbleRect.top + bubbleRect.bottom) / 2 - containerRect.top; // 垂直中点
            
            connections.set(message.id, {
                x: connectionX,
                y: connectionY,
                messageId: message.id,
                senderId: message.senderId,
                isOwnMessage,
                index: i,
                data: message
            });
        }
        
        this.positionUpdateCallback(connections, 'message');
    }

    getMessagePosition(messageId) {
        const index = this.data.findIndex(item => item.id === messageId);
        if (index === -1) return null;
        
        return this.getItemPosition(index);
    }

    getMessageConnectionPoint(messageId) {
        const index = this.data.findIndex(item => item.id === messageId);
        if (index === -1) return null;
        
        const message = this.data[index];
        const position = this.getItemPosition(index);
        if (!position) return null;
        
        const isOwnMessage = message.senderId === 'current-user';
        const connectionX = isOwnMessage ? position.right : position.left;
        const connectionY = position.centerY;
        
        return {
            x: connectionX,
            y: connectionY,
            messageId,
            senderId: message.senderId,
            isOwnMessage
        };
    }

    scrollToMessage(messageId) {
        const index = this.data.findIndex(item => item.id === messageId);
        if (index === -1) return;
        
        const offset = this.getItemOffset(index);
        this.container.scrollTo({
            top: offset - this.containerHeight / 2,
            behavior: 'smooth'
        });
    }
}

export default MessageBubbleList;