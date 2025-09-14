/**
 * HTML Element Builder - Batch DOM Element Creation System
 * 
 * Handles efficient batch creation and rendering of test elements:
 * - Session avatars with rounded square design
 * - Message bubbles with proper alignment
 * - Account avatars with mapping relationships
 * - CSS anchor-name application and styling
 */

class HTMLElementBuilder {
    constructor() {
        this.batchSize = 100;
        this.renderStats = {
            totalElements: 0,
            renderTime: 0,
            lastRender: null
        };
    }

    /**
     * Create session avatar HTML element
     */
    createSessionAvatar(avatarData) {
        const element = document.createElement('div');
        element.className = 'session-avatar';
        element.id = avatarData.id;
        
        // Set anchor name for CSS positioning
        element.style.anchorName = `--${avatarData.anchorName}`;
        
        // Apply styling
        element.style.cssText = `
            anchor-name: --${avatarData.anchorName};
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background-color: ${avatarData.color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: white;
            font-size: 14px;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;
        
        // Add user initial or online indicator
        const initial = document.createElement('span');
        initial.textContent = avatarData.userName.charAt(0).toUpperCase();
        element.appendChild(initial);
        
        // Online status indicator
        if (avatarData.isOnline) {
            const onlineIndicator = document.createElement('div');
            onlineIndicator.className = 'online-indicator';
            onlineIndicator.style.cssText = `
                position: absolute;
                bottom: 2px;
                right: 2px;
                width: 12px;
                height: 12px;
                background-color: #00D851;
                border: 2px solid white;
                border-radius: 50%;
            `;
            element.appendChild(onlineIndicator);
        }
        
        // Add hover effects
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.05)';
            element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'scale(1)';
            element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        });
        
        return element;
    }

    /**
     * Create message bubble HTML element
     */
    createMessageBubble(bubbleData) {
        const element = document.createElement('div');
        element.className = `message-bubble ${bubbleData.type}`;
        element.id = bubbleData.id;
        
        // Set anchor name for CSS positioning
        element.style.anchorName = `--${bubbleData.anchorName}`;
        
        // Base styling for all bubbles
        const baseStyles = `
            anchor-name: --${bubbleData.anchorName};
            max-width: 280px;
            padding: 12px 16px;
            border-radius: 18px;
            margin: 4px 0;
            word-wrap: break-word;
            position: relative;
            display: inline-block;
            font-size: 14px;
            line-height: 1.4;
        `;
        
        // Type-specific styling
        if (bubbleData.type === 'self') {
            element.style.cssText = baseStyles + `
                background-color: #007AFF;
                color: white;
                margin-left: auto;
                margin-right: 12px;
                align-self: flex-end;
            `;
        } else {
            element.style.cssText = baseStyles + `
                background-color: #E5E5EA;
                color: #000000;
                margin-left: 12px;
                margin-right: auto;
                align-self: flex-start;
            `;
        }
        
        // Add message content
        const contentSpan = document.createElement('span');
        contentSpan.textContent = bubbleData.content;
        element.appendChild(contentSpan);
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.style.cssText = `
            font-size: 11px;
            opacity: 0.7;
            margin-top: 4px;
            text-align: ${bubbleData.type === 'self' ? 'right' : 'left'};
        `;
        const date = new Date(bubbleData.timestamp);
        timestamp.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        element.appendChild(timestamp);
        
        // Add read status for self messages
        if (bubbleData.type === 'self' && bubbleData.isRead) {
            const readIndicator = document.createElement('div');
            readIndicator.className = 'read-indicator';
            readIndicator.style.cssText = `
                font-size: 10px;
                opacity: 0.6;
                margin-top: 2px;
                text-align: right;
            `;
            readIndicator.textContent = 'Read';
            element.appendChild(readIndicator);
        }
        
        // Add reactions if present
        if (bubbleData.reactions) {
            const reactionElement = document.createElement('div');
            reactionElement.className = 'message-reaction';
            reactionElement.style.cssText = `
                position: absolute;
                bottom: -8px;
                ${bubbleData.type === 'self' ? 'left: 8px;' : 'right: 8px;'}
                background-color: white;
                border-radius: 12px;
                padding: 2px 6px;
                font-size: 12px;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            `;
            reactionElement.textContent = bubbleData.reactions;
            element.appendChild(reactionElement);
        }
        
        return element;
    }

    /**
     * Create account avatar HTML element
     */
    createAccountAvatar(avatarData) {
        const element = document.createElement('div');
        element.className = 'account-avatar';
        element.id = avatarData.id;
        
        // Set anchor name for CSS positioning
        element.style.anchorName = `--${avatarData.anchorName}`;
        
        // Apply styling
        element.style.cssText = `
            anchor-name: --${avatarData.anchorName};
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background-color: ${avatarData.color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: white;
            font-size: 12px;
            position: relative;
            cursor: pointer;
            margin: 4px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        `;
        
        // Add user initial
        const initial = document.createElement('span');
        initial.textContent = avatarData.userName === 'You' ? 'Y' : avatarData.userName.charAt(0).toUpperCase();
        element.appendChild(initial);
        
        // Status indicator
        const statusColors = {
            online: '#00D851',
            away: '#FFD60A',
            busy: '#FF3B30',
            offline: '#8E8E93'
        };
        
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        statusIndicator.style.cssText = `
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background-color: ${statusColors[avatarData.status] || statusColors.offline};
            border: 1px solid white;
            border-radius: 50%;
        `;
        element.appendChild(statusIndicator);
        
        // Verified badge for verified accounts
        if (avatarData.isVerified) {
            const verifiedBadge = document.createElement('div');
            verifiedBadge.className = 'verified-badge';
            verifiedBadge.style.cssText = `
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 12px;
                height: 12px;
                background-color: #007AFF;
                border: 1px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
            `;
            verifiedBadge.innerHTML = '✓';
            element.appendChild(verifiedBadge);
        }
        
        return element;
    }

    /**
     * Batch create elements with performance optimization
     */
    batchCreateElements(data, container, options = {}) {
        const startTime = performance.now();
        const {
            elementType = 'all',
            maxElements = Infinity,
            onProgress = null,
            useDocumentFragment = true
        } = options;
        
        let createdCount = 0;
        const fragment = useDocumentFragment ? document.createDocumentFragment() : container;
        
        // Create session avatars
        if (elementType === 'all' || elementType === 'sessionAvatars') {
            const avatars = data.sessionAvatars.slice(0, Math.min(maxElements, data.sessionAvatars.length));
            avatars.forEach((avatar, index) => {
                const element = this.createSessionAvatar(avatar);
                fragment.appendChild(element);
                createdCount++;
                
                if (onProgress && index % this.batchSize === 0) {
                    onProgress({ type: 'sessionAvatar', progress: index, total: avatars.length });
                }
            });
        }
        
        // Create message bubbles
        if (elementType === 'all' || elementType === 'messageBubbles') {
            const bubbles = data.messageBubbles.slice(0, Math.min(maxElements, data.messageBubbles.length));
            bubbles.forEach((bubble, index) => {
                const element = this.createMessageBubble(bubble);
                fragment.appendChild(element);
                createdCount++;
                
                if (onProgress && index % this.batchSize === 0) {
                    onProgress({ type: 'messageBubble', progress: index, total: bubbles.length });
                }
            });
        }
        
        // Create account avatars
        if (elementType === 'all' || elementType === 'accountAvatars') {
            const avatars = data.accountAvatars.slice(0, Math.min(maxElements, data.accountAvatars.length));
            avatars.forEach((avatar, index) => {
                const element = this.createAccountAvatar(avatar);
                fragment.appendChild(element);
                createdCount++;
                
                if (onProgress && index % this.batchSize === 0) {
                    onProgress({ type: 'accountAvatar', progress: index, total: avatars.length });
                }
            });
        }
        
        // Append fragment to container if using DocumentFragment
        if (useDocumentFragment && fragment !== container) {
            container.appendChild(fragment);
        }
        
        const endTime = performance.now();
        this.renderStats = {
            totalElements: createdCount,
            renderTime: endTime - startTime,
            lastRender: new Date().toISOString()
        };
        
        console.log(`Batch created ${createdCount} elements in ${this.renderStats.renderTime.toFixed(2)}ms`);
        return this.renderStats;
    }

    /**
     * Create organized layout containers
     */
    createLayoutContainers() {
        const containers = {
            main: document.createElement('div'),
            sessionList: document.createElement('div'),
            messageContainer: document.createElement('div'),
            avatarContainer: document.createElement('div')
        };
        
        // Main container styling
        containers.main.className = 'test-layout-main';
        containers.main.style.cssText = `
            display: flex;
            width: 100vw;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        `;
        
        // Session list styling
        containers.sessionList.className = 'session-list';
        containers.sessionList.style.cssText = `
            width: 280px;
            background-color: #F2F2F7;
            border-right: 1px solid #C6C6C8;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            padding: 8px;
            gap: 4px;
        `;
        
        // Message container styling
        containers.messageContainer.className = 'message-container';
        containers.messageContainer.style.cssText = `
            flex: 1;
            background-color: white;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding: 16px;
            gap: 8px;
        `;
        
        // Avatar container styling
        containers.avatarContainer.className = 'avatar-container';
        containers.avatarContainer.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Assemble layout
        containers.main.appendChild(containers.sessionList);
        containers.main.appendChild(containers.messageContainer);
        containers.main.appendChild(containers.avatarContainer);
        
        return containers;
    }

    /**
     * Apply responsive CSS for different screen sizes
     */
    applyResponsiveStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .session-list {
                    width: 100% !important;
                    height: 40vh !important;
                }
                
                .message-container {
                    height: 60vh !important;
                }
                
                .test-layout-main {
                    flex-direction: column !important;
                }
                
                .message-bubble {
                    max-width: 90% !important;
                }
            }
            
            @media (max-width: 480px) {
                .message-bubble {
                    max-width: 95% !important;
                    font-size: 13px !important;
                }
                
                .session-avatar {
                    width: 40px !important;
                    height: 40px !important;
                    font-size: 12px !important;
                }
                
                .account-avatar {
                    width: 28px !important;
                    height: 28px !important;
                    font-size: 10px !important;
                }
            }
            
            /* Hover effects and animations */
            .message-bubble {
                transition: transform 0.1s ease, box-shadow 0.1s ease;
            }
            
            .message-bubble:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            /* Anchor positioning fallback */
            @supports not (anchor-name: --test) {
                .session-avatar, .message-bubble, .account-avatar {
                    position: relative !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get rendering statistics
     */
    getRenderStats() {
        return this.renderStats;
    }

    /**
     * Clear all elements from container
     */
    clearContainer(container) {
        const startTime = performance.now();
        container.innerHTML = '';
        const clearTime = performance.now() - startTime;
        console.log(`Container cleared in ${clearTime.toFixed(2)}ms`);
        return clearTime;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HTMLElementBuilder;
}

// Global access for browser environment
if (typeof window !== 'undefined') {
    window.HTMLElementBuilder = HTMLElementBuilder;
}