/**
 * Three Container Connection System - Naming Conventions
 * 三容器连接线系统命名规范
 * 
 * 统一的命名规范确保CSS Anchor Positioning和JavaScript的协调工作
 */

export class NamingConventions {
    /**
     * CSS Anchor命名规范
     * 格式: --{container}-{type}-{id}
     */
    static anchor = {
        // 会话头像: --conv-avatar-{userId}
        conversationAvatar: (userId) => `--conv-avatar-${userId}`,
        
        // 消息气泡: --message-{messageId} 
        messageBubble: (messageId) => `--message-${messageId}`,
        
        // 账号头像: --acc-avatar-{userId}
        accountAvatar: (userId) => `--acc-avatar-${userId}`,
        
        // 验证anchor名称格式
        validate: (anchorName) => {
            const pattern = /^--(?:conv-avatar|message|acc-avatar)-[\w-]+$/;
            return pattern.test(anchorName);
        },
        
        // 从anchor名称提取信息
        parseAnchor: (anchorName) => {
            const match = anchorName.match(/^--(conv-avatar|message|acc-avatar)-([\w-]+)$/);
            if (!match) return null;
            
            return {
                type: match[1],
                id: match[2],
                container: {
                    'conv-avatar': 'conversation',
                    'message': 'messages', 
                    'acc-avatar': 'accounts'
                }[match[1]]
            };
        }
    };
    
    /**
     * HTML元素ID命名规范
     */
    static elementId = {
        // 容器ID
        containers: {
            conversation: 'conversationAvatars',
            messages: 'messageBubbles', 
            accounts: 'accountAvatars',
            connectionOverlay: 'connectionOverlay',
            connectionSvg: 'connectionSvg'
        },
        
        // 头像元素ID: {type}-avatar-{userId}
        avatar: (type, userId) => `${type}-avatar-${userId}`,
        
        // 消息元素ID: message-{messageId}
        message: (messageId) => `message-${messageId}`,
        
        // 连接线元素ID: connection-{fromId}-to-{toId}
        connection: (fromId, toId) => `connection-${fromId}-to-${toId}`,
        
        // SVG路径ID: path-{connectionId}
        svgPath: (connectionId) => `path-${connectionId}`,
        
        // 验证元素ID格式
        validate: (elementId, type) => {
            const patterns = {
                avatar: /^(?:conv|acc)-avatar-[\w-]+$/,
                message: /^message-[\w-]+$/,
                connection: /^connection-[\w-]+-to-[\w-]+$/,
                svgPath: /^path-connection-[\w-]+-to-[\w-]+$/
            };
            
            return patterns[type]?.test(elementId) || false;
        }
    };
    
    /**
     * CSS类命名规范
     */
    static cssClass = {
        // 基础容器类
        containers: {
            conversation: 'conversation-avatars-container',
            messages: 'message-bubbles-container',
            accounts: 'account-avatars-container',
            overlay: 'connection-overlay'
        },
        
        // 头像相关类
        avatar: {
            base: 'avatar-base',
            conversation: 'conversation-avatar',
            account: 'account-avatar',
            active: 'avatar-active',
            connected: 'avatar-connected'
        },
        
        // 消息相关类
        message: {
            base: 'message-bubble',
            self: 'self-message',
            other: 'other-message',
            active: 'message-active',
            connected: 'message-connected'
        },
        
        // 连接线相关类
        connection: {
            base: 'connection-line',
            self: 'self-connection',
            other: 'other-connection',
            animated: 'connection-animated',
            visible: 'connection-visible',
            hidden: 'connection-hidden'
        },
        
        // 性能优化类
        optimization: {
            memoryPressure: 'memory-pressure-high',
            highRefreshRate: 'high-refresh-rate',
            reducedMotion: 'reduced-motion',
            lowQuality: 'low-quality-mode'
        }
    };
    
    /**
     * 数据属性命名规范
     */
    static dataAttribute = {
        // 头像数据属性
        avatar: {
            id: 'data-avatar-id',           // 头像唯一ID
            userId: 'data-user-id',         // 用户ID
            type: 'data-avatar-type',       // 头像类型: conversation | account
            container: 'data-container'     // 所属容器
        },
        
        // 消息数据属性
        message: {
            id: 'data-message-id',          // 消息唯一ID
            senderId: 'data-sender-id',     // 发送者ID
            type: 'data-message-type',      // 消息类型: self | other
            timestamp: 'data-timestamp',    // 时间戳
            container: 'data-container'     // 所属容器
        },
        
        // 连接线数据属性
        connection: {
            id: 'data-connection-id',       // 连接线唯一ID
            fromId: 'data-from-id',         // 起点元素ID
            toId: 'data-to-id',             // 终点元素ID
            type: 'data-connection-type',   // 连接类型: self | other
            visible: 'data-visible',        // 是否可见
            animated: 'data-animated'       // 是否有动画
        }
    };
    
    /**
     * 性能优化标识符
     */
    static performance = {
        // 可见性检查用的class
        viewport: {
            visible: 'in-viewport',
            hidden: 'out-viewport',
            nearViewport: 'near-viewport'
        },
        
        // 连接线池管理
        pool: {
            available: 'pool-available',
            inUse: 'pool-in-use',
            recycled: 'pool-recycled'
        },
        
        // 渲染质量等级
        quality: {
            high: 'quality-high',      // 全质量渲染
            medium: 'quality-medium',  // 中等质量
            low: 'quality-low',        // 低质量模式
            minimal: 'quality-minimal' // 最简模式
        }
    };
    
    /**
     * 实用工具方法
     */
    static utils = {
        // 生成唯一ID
        generateId: (prefix = 'id') => {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 5);
            return `${prefix}-${timestamp}-${random}`;
        },
        
        // 清理无效字符
        sanitizeId: (id) => {
            return id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        },
        
        // 解析连接关系
        parseConnection: (fromElement, toElement) => {
            const fromData = {
                id: fromElement.dataset.messageId || fromElement.dataset.avatarId,
                type: fromElement.dataset.messageType || fromElement.dataset.avatarType,
                container: fromElement.dataset.container
            };
            
            const toData = {
                id: toElement.dataset.avatarId,
                type: toElement.dataset.avatarType,
                container: toElement.dataset.container
            };
            
            return {
                connectionId: this.elementId.connection(fromData.id, toData.id),
                connectionType: fromData.type === 'self' ? 'self' : 'other',
                from: fromData,
                to: toData
            };
        },
        
        // 验证连接的有效性
        validateConnection: (messageElement, avatarElement) => {
            const messageType = messageElement.dataset.messageType;
            const senderId = messageElement.dataset.senderId;
            const avatarUserId = avatarElement.dataset.userId;
            const avatarContainer = avatarElement.dataset.container;
            
            // 验证连接逻辑
            if (messageType === 'self') {
                // 自己的消息应该连接到右侧账号头像
                return avatarContainer === 'accounts' && avatarUserId === senderId;
            } else {
                // 他人的消息应该连接到左侧会话头像
                return avatarContainer === 'conversation' && avatarUserId === senderId;
            }
        },
        
        // 获取元素的anchor名称
        getAnchorName: (element) => {
            const computedStyle = getComputedStyle(element);
            return computedStyle.anchorName || element.style.anchorName;
        },
        
        // 设置元素的anchor名称
        setAnchorName: (element, anchorName) => {
            if (!this.anchor.validate(anchorName)) {
                console.warn(`Invalid anchor name: ${anchorName}`);
                return false;
            }
            
            element.style.anchorName = anchorName;
            return true;
        }
    };
    
    /**
     * 调试和验证工具
     */
    static debug = {
        // 验证整个系统的命名一致性
        validateSystem: () => {
            const results = {
                valid: true,
                errors: [],
                warnings: []
            };
            
            // 检查所有头像元素
            document.querySelectorAll('[data-avatar-id]').forEach(avatar => {
                const anchorName = this.utils.getAnchorName(avatar);
                if (!anchorName) {
                    results.errors.push(`Avatar ${avatar.dataset.avatarId} missing anchor name`);
                    results.valid = false;
                }
            });
            
            // 检查所有消息元素
            document.querySelectorAll('[data-message-id]').forEach(message => {
                const anchorName = this.utils.getAnchorName(message);
                if (!anchorName) {
                    results.errors.push(`Message ${message.dataset.messageId} missing anchor name`);
                    results.valid = false;
                }
            });
            
            // 检查连接线元素
            document.querySelectorAll('[data-connection-id]').forEach(connection => {
                const fromId = connection.dataset.fromId;
                const toId = connection.dataset.toId;
                const fromElement = document.querySelector(`[data-message-id="${fromId}"], [data-avatar-id="${fromId}"]`);
                const toElement = document.querySelector(`[data-avatar-id="${toId}"]`);
                
                if (!fromElement || !toElement) {
                    results.errors.push(`Connection ${connection.dataset.connectionId} has invalid endpoints`);
                    results.valid = false;
                }
            });
            
            return results;
        },
        
        // 打印当前系统状态
        logSystemState: () => {
            const state = {
                avatars: {
                    conversation: document.querySelectorAll('[data-container="conversation"]').length,
                    accounts: document.querySelectorAll('[data-container="accounts"]').length
                },
                messages: document.querySelectorAll('[data-message-id]').length,
                connections: document.querySelectorAll('[data-connection-id]').length,
                anchors: Array.from(document.querySelectorAll('[style*="anchor-name"]')).map(el => this.utils.getAnchorName(el))
            };
            
            console.group('Three Container System State');
            console.table(state);
            console.groupEnd();
            
            return state;
        }
    };
}

// 导出默认实例
export default NamingConventions;