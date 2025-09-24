import BaseVirtualList from './BaseVirtualList.js';

class SessionAvatarList extends BaseVirtualList {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 72,
            overscanCount: 3,
            ...options
        });
        
        this.positionUpdateCallback = null;
        this.showingPreview = false;
    }

    setPositionUpdateCallback(callback) {
        this.positionUpdateCallback = callback;
    }

    createItem(sessionData, index) {
        const item = document.createElement('div');
        item.className = 'session-avatar-item';
        item.dataset.sessionId = sessionData.id;
        item.dataset.index = index;
        
        const avatar = document.createElement('div');
        avatar.className = 'session-avatar';
        
        const img = document.createElement('img');
        img.src = sessionData.avatar || `/api/placeholder/50/50`;
        img.alt = sessionData.name || `Session ${index}`;
        img.className = 'session-image';
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'session-info';
        
        const name = document.createElement('div');
        name.className = 'session-name';
        name.textContent = sessionData.name || `Session ${index}`;
        
        const preview = document.createElement('div');
        preview.className = 'session-preview';
        preview.textContent = sessionData.lastMessage || 'No messages yet';
        
        const time = document.createElement('div');
        time.className = 'session-time';
        time.textContent = sessionData.time || 'now';
        
        info.appendChild(name);
        info.appendChild(preview);
        
        avatar.appendChild(img);
        item.appendChild(avatar);
        item.appendChild(info);
        item.appendChild(time);
        
        return item;
    }

    onScrollStart() {
        super.onScrollStart();
        this.showingPreview = true;
        this.container.classList.add('session-scrolling');
        
        this.container.querySelectorAll('.session-info').forEach(info => {
            info.style.opacity = '1';
            info.style.visibility = 'visible';
        });
    }

    onScrollEnd() {
        super.onScrollEnd();
        this.showingPreview = false;
        this.container.classList.remove('session-scrolling');
        
        setTimeout(() => {
            this.container.querySelectorAll('.session-info').forEach(info => {
                info.style.opacity = '0';
                info.style.visibility = 'hidden';
            });
        }, 200);
        
        if (this.positionUpdateCallback) {
            this.updateVisiblePositions();
        }
    }

    updateVisiblePositions() {
        const positions = new Map();
        
        for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
            const itemPosition = this.getItemPosition(i);
            if (!itemPosition || !this.data[i]) continue;
            
            // 获取实际的头像元素位置
            const itemElement = this.getItemElement(i);
            if (!itemElement) continue;
            
            const avatarElement = itemElement.querySelector('.session-image');
            if (!avatarElement) continue;
            
            const containerRect = this.container.getBoundingClientRect();
            const avatarRect = avatarElement.getBoundingClientRect();
            
            // 计算头像的实际边缘位置
            positions.set(this.data[i].id, {
                // 保留原有的位置信息用于兼容
                ...itemPosition,
                // 添加头像的精确边缘位置
                avatarLeft: avatarRect.left - containerRect.left,
                avatarRight: avatarRect.right - containerRect.left,
                avatarTop: avatarRect.top - containerRect.top,
                avatarBottom: avatarRect.bottom - containerRect.top,
                avatarCenterY: (avatarRect.top + avatarRect.bottom) / 2 - containerRect.top,
                index: i,
                data: this.data[i]
            });
        }
        
        this.positionUpdateCallback(positions, 'session');
    }

    render() {
        super.render();
        
        if (this.positionUpdateCallback) {
            requestAnimationFrame(() => {
                this.updateVisiblePositions();
            });
        }
    }

    getSessionPosition(sessionId) {
        const index = this.data.findIndex(item => item.id === sessionId);
        if (index === -1) return null;
        
        return this.getItemPosition(index);
    }

    getSessionConnectionPoint(sessionId) {
        const position = this.getSessionPosition(sessionId);
        if (!position) return null;
        
        const connectionY = position.centerY;
        const connectionX = position.right;
        
        return {
            x: connectionX,
            y: connectionY,
            sessionId
        };
    }

    isShowingPreview() {
        return this.showingPreview;
    }
}

export default SessionAvatarList;