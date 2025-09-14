/**
 * Three Container Connection System - Data Structures
 * 三容器连接线系统数据结构设计
 * 
 * 核心数据模型：用户、消息、头像、连接线的关联关系
 */

import NamingConventions from './naming-conventions.js';

/**
 * 用户数据模型
 */
export class UserModel {
    constructor({
        id,
        name,
        avatar,
        type = 'user', // 'user' | 'self' | 'bot'
        status = 'online', // 'online' | 'offline' | 'away'
        metadata = {}
    }) {
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.type = type;
        this.status = status;
        this.metadata = metadata;
        this.createdAt = new Date();
        this.lastActive = new Date();
    }

    // 获取用户的显示名称
    getDisplayName() {
        return this.name || `User ${this.id}`;
    }

    // 检查是否是当前用户
    isSelf() {
        return this.type === 'self';
    }

    // 更新用户状态
    updateStatus(status) {
        this.status = status;
        this.lastActive = new Date();
    }

    // 序列化为存储格式
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            avatar: this.avatar,
            type: this.type,
            status: this.status,
            metadata: this.metadata,
            createdAt: this.createdAt.toISOString(),
            lastActive: this.lastActive.toISOString()
        };
    }
}

/**
 * 消息数据模型
 */
export class MessageModel {
    constructor({
        id,
        senderId,
        content,
        type = 'text', // 'text' | 'image' | 'file' | 'system'
        timestamp = new Date(),
        metadata = {}
    }) {
        this.id = id;
        this.senderId = senderId;
        this.content = content;
        this.type = type;
        this.timestamp = timestamp;
        this.metadata = metadata;
        
        // 连接线相关属性
        this.connectionId = null;
        this.isVisible = true;
        this.hasConnection = false;
    }

    // 检查是否是自己发送的消息
    isSelfMessage(currentUserId) {
        return this.senderId === currentUserId;
    }

    // 获取消息类型（用于连接线渲染）
    getMessageType(currentUserId) {
        return this.isSelfMessage(currentUserId) ? 'self' : 'other';
    }

    // 获取目标头像容器
    getTargetContainer(currentUserId) {
        return this.isSelfMessage(currentUserId) ? 'accounts' : 'conversation';
    }

    // 设置连接信息
    setConnection(connectionId) {
        this.connectionId = connectionId;
        this.hasConnection = true;
    }

    // 清除连接信息
    clearConnection() {
        this.connectionId = null;
        this.hasConnection = false;
    }

    // 序列化为存储格式
    toJSON() {
        return {
            id: this.id,
            senderId: this.senderId,
            content: this.content,
            type: this.type,
            timestamp: this.timestamp.toISOString(),
            metadata: this.metadata,
            connectionId: this.connectionId,
            isVisible: this.isVisible,
            hasConnection: this.hasConnection
        };
    }
}

/**
 * 头像数据模型
 */
export class AvatarModel {
    constructor({
        id,
        userId,
        container, // 'conversation' | 'accounts'
        position = { x: 0, y: 0 },
        isVisible = true,
        metadata = {}
    }) {
        this.id = id;
        this.userId = userId;
        this.container = container;
        this.position = position;
        this.isVisible = isVisible;
        this.metadata = metadata;
        
        // DOM元素引用
        this.element = null;
        this.anchorName = this.generateAnchorName();
        
        // 连接线相关
        this.connections = new Set(); // 关联的连接线ID集合
        this.isActive = false;
    }

    // 生成CSS anchor名称
    generateAnchorName() {
        return this.container === 'conversation' 
            ? NamingConventions.anchor.conversationAvatar(this.userId)
            : NamingConventions.anchor.accountAvatar(this.userId);
    }

    // 获取元素ID
    getElementId() {
        const type = this.container === 'conversation' ? 'conv' : 'acc';
        return NamingConventions.elementId.avatar(type, this.userId);
    }

    // 添加连接线关联
    addConnection(connectionId) {
        this.connections.add(connectionId);
        this.isActive = this.connections.size > 0;
    }

    // 移除连接线关联
    removeConnection(connectionId) {
        this.connections.delete(connectionId);
        this.isActive = this.connections.size > 0;
    }

    // 更新位置信息
    updatePosition(position) {
        this.position = { ...this.position, ...position };
    }

    // 绑定DOM元素
    bindElement(element) {
        this.element = element;
        if (element) {
            // 设置必要的数据属性
            element.dataset.avatarId = this.id;
            element.dataset.userId = this.userId;
            element.dataset.avatarType = this.container;
            element.dataset.container = this.container;
            
            // 设置CSS anchor
            element.style.anchorName = this.anchorName;
        }
    }

    // 序列化为存储格式
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            container: this.container,
            position: this.position,
            isVisible: this.isVisible,
            metadata: this.metadata,
            anchorName: this.anchorName,
            connections: Array.from(this.connections),
            isActive: this.isActive
        };
    }
}

/**
 * 连接线数据模型
 */
export class ConnectionModel {
    constructor({
        id,
        fromId, // 消息ID或头像ID
        toId,   // 头像ID
        type,   // 'self' | 'other'
        path = '',
        isVisible = true,
        isAnimated = true,
        metadata = {}
    }) {
        this.id = id;
        this.fromId = fromId;
        this.toId = toId;
        this.type = type;
        this.path = path;
        this.isVisible = isVisible;
        this.isAnimated = isAnimated;
        this.metadata = metadata;
        
        // DOM和样式相关
        this.element = null; // SVG path元素
        this.cssClass = this.generateCssClass();
        this.strokeColor = this.getStrokeColor();
        
        // 性能和渲染相关
        this.isInViewport = true;
        this.renderQuality = 'high'; // 'high' | 'medium' | 'low' | 'minimal'
        this.lastUpdate = Date.now();
    }

    // 生成CSS类名
    generateCssClass() {
        const baseClass = NamingConventions.cssClass.connection.base;
        const typeClass = this.type === 'self' 
            ? NamingConventions.cssClass.connection.self
            : NamingConventions.cssClass.connection.other;
        
        return `${baseClass} ${typeClass}`;
    }

    // 获取笔画颜色
    getStrokeColor() {
        return this.type === 'self' 
            ? 'var(--connection-color-self)'
            : 'var(--connection-color-other)';
    }

    // 获取SVG路径元素ID
    getPathElementId() {
        return NamingConventions.elementId.svgPath(this.id);
    }

    // 更新路径数据
    updatePath(newPath) {
        this.path = newPath;
        this.lastUpdate = Date.now();
        
        if (this.element) {
            this.element.setAttribute('d', newPath);
        }
    }

    // 设置可见性
    setVisibility(visible) {
        this.isVisible = visible;
        
        if (this.element) {
            this.element.style.opacity = visible ? '0.8' : '0';
            this.element.style.pointerEvents = visible ? 'none' : 'none';
        }
    }

    // 设置动画状态
    setAnimation(animated) {
        this.isAnimated = animated;
        
        if (this.element) {
            if (animated) {
                this.element.classList.add(NamingConventions.cssClass.connection.animated);
            } else {
                this.element.classList.remove(NamingConventions.cssClass.connection.animated);
            }
        }
    }

    // 设置渲染质量
    setRenderQuality(quality) {
        this.renderQuality = quality;
        
        // 根据质量调整渲染参数
        const qualitySettings = {
            high: { strokeWidth: 2, opacity: 0.8, animation: true },
            medium: { strokeWidth: 1.5, opacity: 0.6, animation: true },
            low: { strokeWidth: 1, opacity: 0.4, animation: false },
            minimal: { strokeWidth: 0.5, opacity: 0.2, animation: false }
        };
        
        const settings = qualitySettings[quality] || qualitySettings.high;
        
        if (this.element) {
            this.element.setAttribute('stroke-width', settings.strokeWidth);
            this.element.style.opacity = settings.opacity;
            this.setAnimation(settings.animation);
        }
    }

    // 绑定SVG path元素
    bindElement(pathElement) {
        this.element = pathElement;
        
        if (pathElement) {
            // 设置基本属性
            pathElement.id = this.getPathElementId();
            pathElement.setAttribute('d', this.path);
            pathElement.setAttribute('class', this.cssClass);
            pathElement.setAttribute('stroke', this.strokeColor);
            pathElement.setAttribute('fill', 'none');
            
            // 设置数据属性
            pathElement.dataset.connectionId = this.id;
            pathElement.dataset.fromId = this.fromId;
            pathElement.dataset.toId = this.toId;
            pathElement.dataset.connectionType = this.type;
            pathElement.dataset.visible = this.isVisible;
            pathElement.dataset.animated = this.isAnimated;
        }
    }

    // 序列化为存储格式
    toJSON() {
        return {
            id: this.id,
            fromId: this.fromId,
            toId: this.toId,
            type: this.type,
            path: this.path,
            isVisible: this.isVisible,
            isAnimated: this.isAnimated,
            metadata: this.metadata,
            cssClass: this.cssClass,
            strokeColor: this.strokeColor,
            isInViewport: this.isInViewport,
            renderQuality: this.renderQuality,
            lastUpdate: this.lastUpdate
        };
    }
}

/**
 * 系统状态数据模型
 */
export class SystemStateModel {
    constructor() {
        this.users = new Map();           // userId -> UserModel
        this.messages = new Map();        // messageId -> MessageModel
        this.avatars = new Map();         // avatarId -> AvatarModel
        this.connections = new Map();     // connectionId -> ConnectionModel
        
        // 容器状态
        this.containers = {
            conversation: { scrollTop: 0, scrollLeft: 0, visible: true },
            messages: { scrollTop: 0, scrollLeft: 0, visible: true },
            accounts: { scrollTop: 0, scrollLeft: 0, visible: true }
        };
        
        // 性能监控
        this.performance = {
            connectionCount: 0,
            visibleConnections: 0,
            renderQuality: 'high',
            fps: 0,
            memoryUsage: 0
        };
        
        // 当前用户ID
        this.currentUserId = null;
        
        // 事件监听器
        this.eventListeners = new Map();
    }

    // 设置当前用户
    setCurrentUser(userId) {
        this.currentUserId = userId;
        this.emit('currentUserChanged', userId);
    }

    // 添加用户
    addUser(userData) {
        const user = userData instanceof UserModel ? userData : new UserModel(userData);
        this.users.set(user.id, user);
        this.emit('userAdded', user);
        return user;
    }

    // 添加消息
    addMessage(messageData) {
        const message = messageData instanceof MessageModel ? messageData : new MessageModel(messageData);
        this.messages.set(message.id, message);
        this.emit('messageAdded', message);
        return message;
    }

    // 添加头像
    addAvatar(avatarData) {
        const avatar = avatarData instanceof AvatarModel ? avatarData : new AvatarModel(avatarData);
        this.avatars.set(avatar.id, avatar);
        this.emit('avatarAdded', avatar);
        return avatar;
    }

    // 添加连接线
    addConnection(connectionData) {
        const connection = connectionData instanceof ConnectionModel ? connectionData : new ConnectionModel(connectionData);
        this.connections.set(connection.id, connection);
        
        // 更新关联的头像连接数
        const fromAvatar = this.findAvatarByUserId(connection.fromId);
        const toAvatar = this.avatars.get(connection.toId) || this.findAvatarByUserId(connection.toId);
        
        if (fromAvatar) fromAvatar.addConnection(connection.id);
        if (toAvatar) toAvatar.addConnection(connection.id);
        
        this.performance.connectionCount = this.connections.size;
        this.emit('connectionAdded', connection);
        return connection;
    }

    // 移除连接线
    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;
        
        // 更新关联的头像连接数
        const fromAvatar = this.findAvatarByUserId(connection.fromId);
        const toAvatar = this.avatars.get(connection.toId) || this.findAvatarByUserId(connection.toId);
        
        if (fromAvatar) fromAvatar.removeConnection(connectionId);
        if (toAvatar) toAvatar.removeConnection(connectionId);
        
        this.connections.delete(connectionId);
        this.performance.connectionCount = this.connections.size;
        this.emit('connectionRemoved', connection);
        return true;
    }

    // 根据用户ID查找头像
    findAvatarByUserId(userId) {
        for (const avatar of this.avatars.values()) {
            if (avatar.userId === userId) {
                return avatar;
            }
        }
        return null;
    }

    // 查找消息的目标头像
    findTargetAvatar(messageId) {
        const message = this.messages.get(messageId);
        if (!message) return null;
        
        const messageType = message.getMessageType(this.currentUserId);
        const container = message.getTargetContainer(this.currentUserId);
        
        for (const avatar of this.avatars.values()) {
            if (avatar.userId === message.senderId && avatar.container === container) {
                return avatar;
            }
        }
        
        return null;
    }

    // 更新性能指标
    updatePerformance(metrics) {
        this.performance = { ...this.performance, ...metrics };
        this.emit('performanceUpdated', this.performance);
    }

    // 事件系统
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // 获取系统统计信息
    getStats() {
        return {
            users: this.users.size,
            messages: this.messages.size,
            avatars: this.avatars.size,
            connections: this.connections.size,
            visibleConnections: Array.from(this.connections.values()).filter(c => c.isVisible).length,
            performance: this.performance
        };
    }

    // 序列化整个系统状态
    toJSON() {
        return {
            users: Array.from(this.users.values()).map(u => u.toJSON()),
            messages: Array.from(this.messages.values()).map(m => m.toJSON()),
            avatars: Array.from(this.avatars.values()).map(a => a.toJSON()),
            connections: Array.from(this.connections.values()).map(c => c.toJSON()),
            containers: this.containers,
            performance: this.performance,
            currentUserId: this.currentUserId
        };
    }

    // 从JSON恢复状态
    fromJSON(data) {
        // 恢复用户
        data.users?.forEach(userData => {
            this.addUser(userData);
        });
        
        // 恢复消息
        data.messages?.forEach(messageData => {
            this.addMessage(messageData);
        });
        
        // 恢复头像
        data.avatars?.forEach(avatarData => {
            this.addAvatar(avatarData);
        });
        
        // 恢复连接线
        data.connections?.forEach(connectionData => {
            this.addConnection(connectionData);
        });
        
        // 恢复其他状态
        this.containers = data.containers || this.containers;
        this.performance = data.performance || this.performance;
        this.currentUserId = data.currentUserId;
    }
}

// 创建全局状态实例
export const systemState = new SystemStateModel();

// 导出所有模型类
export {
    UserModel,
    MessageModel,
    AvatarModel,
    ConnectionModel,
    SystemStateModel
};