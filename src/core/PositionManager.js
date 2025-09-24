class PositionManager {
    constructor(animationManager, options = {}) {
        this.animationManager = animationManager;
        this.options = {
            updateFrequency: 120,
            throttleAccountUpdates: true,
            throttleSessionUpdates: false,
            debounceSessionDelay: 150,
            ...options
        };
        
        this.positions = {
            accounts: new Map(),
            sessions: new Map(),
            messages: new Map()
        };
        
        this.listeners = new Set();
        this.isSessionScrolling = false;
        this.isAccountScrolling = false;
        this.sessionScrollTimer = null;
        this.lastUpdateTime = 0;
        
        this.bindMethods();
    }

    bindMethods() {
        this.handleAccountPositions = this.handleAccountPositions.bind(this);
        this.handleSessionPositions = this.handleSessionPositions.bind(this);
        this.handleMessagePositions = this.handleMessagePositions.bind(this);
        this.updateConnections = this.updateConnections.bind(this);
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    handleAccountPositions(positions, type) {
        if (type !== 'account') return;
        
        this.positions.accounts = positions;
        
        if (this.isAccountScrolling && this.options.throttleAccountUpdates) {
            this.scheduleUpdate();
        } else {
            this.updateConnections();
        }
    }

    handleSessionPositions(positions, type) {
        if (type !== 'session') return;
        
        this.positions.sessions = positions;
        
        if (!this.options.throttleSessionUpdates) {
            clearTimeout(this.sessionScrollTimer);
            this.sessionScrollTimer = setTimeout(() => {
                this.updateConnections();
            }, this.options.debounceSessionDelay);
        } else {
            this.updateConnections();
        }
    }

    handleMessagePositions(positions, type) {
        if (type !== 'message') return;
        
        this.positions.messages = positions;
        this.updateConnections();
    }

    setScrollState(listType, isScrolling) {
        switch (listType) {
            case 'account':
                this.isAccountScrolling = isScrolling;
                break;
            case 'session':
                this.isSessionScrolling = isScrolling;
                if (!isScrolling) {
                    this.updateConnections();
                }
                break;
        }
    }

    scheduleUpdate() {
        const now = performance.now();
        const updateInterval = 1000 / this.options.updateFrequency;
        
        if (now - this.lastUpdateTime >= updateInterval) {
            this.updateConnections();
        } else {
            this.animationManager.add(() => {
                this.updateConnections();
                return false;
            }, { priority: 'high' });
        }
    }

    updateConnections() {
        const now = performance.now();
        this.lastUpdateTime = now;
        
        const connectionData = this.calculateConnections();
        
        this.listeners.forEach(listener => {
            try {
                listener(connectionData, now);
            } catch (error) {
                console.error('Position listener error:', error);
            }
        });
    }

    calculateConnections() {
        const connections = [];
        
        this.positions.messages.forEach((messagePos, messageId) => {
            const message = messagePos.data;
            const senderId = message.senderId;
            const isOwnMessage = message.isOwnMessage;
            
            let targetPosition = null;
            let connectionType = null;
            
            if (isOwnMessage) {
                targetPosition = this.findAccountPosition(senderId);
                connectionType = 'message-to-account';
            } else {
                targetPosition = this.findSessionPosition(senderId);
                connectionType = 'message-to-session';
            }
            
            if (targetPosition && this.shouldShowConnection(messagePos, targetPosition)) {
                connections.push({
                    id: `${messageId}-${senderId}`,
                    messageId,
                    senderId,
                    type: connectionType,
                    startPoint: {
                        x: messagePos.x,
                        y: messagePos.y
                    },
                    endPoint: {
                        x: targetPosition.x,
                        y: targetPosition.y
                    },
                    isOwnMessage,
                    visible: this.isConnectionVisible(messagePos, targetPosition)
                });
            }
        });
        
        return connections;
    }

    findAccountPosition(accountId) {
        const position = this.positions.accounts.get(accountId);
        if (!position) return null;
        
        // 使用头像的左侧边缘中点 (自己发送的消息连接到账号头像的左侧)
        return {
            x: position.avatarLeft || position.left,
            y: position.avatarCenterY || position.centerY
        };
    }

    findSessionPosition(sessionId) {
        const position = this.positions.sessions.get(sessionId);
        if (!position) return null;
        
        // 使用头像的右侧边缘中点 (会话发送的消息连接到会话头像的右侧)
        return {
            x: position.avatarRight || position.right,
            y: position.avatarCenterY || position.centerY
        };
    }

    shouldShowConnection(messagePos, targetPos) {
        if (this.isSessionScrolling && !messagePos.isOwnMessage) {
            return false;
        }
        
        return true;
    }

    isConnectionVisible(messagePos, targetPos) {
        const maxDistance = 1000;
        const distance = Math.sqrt(
            Math.pow(targetPos.x - messagePos.x, 2) + 
            Math.pow(targetPos.y - messagePos.y, 2)
        );
        
        return distance <= maxDistance;
    }

    getPositionById(type, id) {
        switch (type) {
            case 'account':
                return this.positions.accounts.get(id);
            case 'session':
                return this.positions.sessions.get(id);
            case 'message':
                return this.positions.messages.get(id);
            default:
                return null;
        }
    }

    getAllPositions() {
        return {
            accounts: Array.from(this.positions.accounts.entries()),
            sessions: Array.from(this.positions.sessions.entries()),
            messages: Array.from(this.positions.messages.entries())
        };
    }

    clearPositions(type) {
        if (type) {
            this.positions[type]?.clear();
        } else {
            Object.values(this.positions).forEach(map => map.clear());
        }
    }

    getConnectionCount() {
        return this.positions.messages.size;
    }

    getPerformanceStats() {
        return {
            totalPositions: {
                accounts: this.positions.accounts.size,
                sessions: this.positions.sessions.size,
                messages: this.positions.messages.size
            },
            updateFrequency: this.options.updateFrequency,
            lastUpdateTime: this.lastUpdateTime,
            isSessionScrolling: this.isSessionScrolling,
            isAccountScrolling: this.isAccountScrolling,
            activeListeners: this.listeners.size
        };
    }

    optimizePerformance() {
        const stats = this.getPerformanceStats();
        const totalPositions = Object.values(stats.totalPositions).reduce((a, b) => a + b, 0);
        
        if (totalPositions > 200 && this.options.updateFrequency > 60) {
            this.options.updateFrequency = 60;
            console.log('Reduced update frequency due to high position count');
        } else if (totalPositions < 50 && this.options.updateFrequency < 120) {
            this.options.updateFrequency = 120;
            console.log('Increased update frequency due to low position count');
        }
    }

    destroy() {
        clearTimeout(this.sessionScrollTimer);
        this.listeners.clear();
        this.clearPositions();
    }
}

export default PositionManager;