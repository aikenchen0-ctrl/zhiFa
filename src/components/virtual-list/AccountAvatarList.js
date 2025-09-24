import BaseVirtualList from './BaseVirtualList.js';

class AccountAvatarList extends BaseVirtualList {
    constructor(container, options = {}) {
        super(container, {
            itemHeight: 80,
            overscanCount: 2,
            ...options
        });
        
        this.positionUpdateCallback = null;
        this.isScrolling = false;
    }

    setPositionUpdateCallback(callback) {
        this.positionUpdateCallback = callback;
    }

    createItem(avatarData, index) {
        const item = document.createElement('div');
        item.className = 'account-avatar-item';
        item.dataset.avatarId = avatarData.id;
        item.dataset.index = index;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar-container';
        
        const img = document.createElement('img');
        img.src = avatarData.avatar || `/api/placeholder/60/60`;
        img.alt = avatarData.name || `Avatar ${index}`;
        img.className = 'avatar-image';
        img.loading = 'lazy';
        
        const name = document.createElement('div');
        name.className = 'avatar-name';
        name.textContent = avatarData.name || `User ${index}`;
        
        avatar.appendChild(img);
        item.appendChild(avatar);
        item.appendChild(name);
        
        return item;
    }

    onScrollStart() {
        super.onScrollStart();
        this.isScrolling = true;
        this.container.classList.add('account-scrolling');
    }

    onScrollEnd() {
        super.onScrollEnd();
        this.isScrolling = false;
        this.container.classList.remove('account-scrolling');
        
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
            
            const avatarElement = itemElement.querySelector('.avatar-image');
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
        
        this.positionUpdateCallback(positions, 'account');
    }

    render() {
        super.render();
        
        if (this.positionUpdateCallback) {
            requestAnimationFrame(() => {
                this.updateVisiblePositions();
            });
        }
    }

    getAvatarPosition(avatarId) {
        const index = this.data.findIndex(item => item.id === avatarId);
        if (index === -1) return null;
        
        return this.getItemPosition(index);
    }

    getAvatarConnectionPoint(avatarId, side = 'left') {
        const position = this.getAvatarPosition(avatarId);
        if (!position) return null;
        
        const connectionY = position.centerY;
        const connectionX = side === 'left' ? position.left : position.right;
        
        return {
            x: connectionX,
            y: connectionY,
            avatarId
        };
    }
}

export default AccountAvatarList;