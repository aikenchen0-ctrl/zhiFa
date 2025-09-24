/**
 * TopBar Component - Vision UI Style Top Bar with PIXI.js v8
 * 
 * Features:
 * - Unread message indicator with red dot
 * - Clickable session name button (pure text)
 * - Edit icon next to session name
 * - Search icon (rightmost)
 * - Current user account name (left of search)
 * - Add person icon (left of account name)
 * - Vision UI semi-transparent material
 * - Mobile touch support
 * - Responsive layout
 * - Detailed logging
 */

import * as PIXI from 'pixi.js';

export class TopBar extends PIXI.Container {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            height: 60,
            padding: 16,
            iconSize: 24,
            fontSize: 14,
            accountFontSize: 13,
            backgroundColor: 0x000000,
            backgroundAlpha: 0.15,
            borderColor: 0xffffff,
            borderAlpha: 0.1,
            textColor: 0xffffff,
            iconColor: 0xffffff,
            redDotColor: 0xff3b30,
            hoverAlpha: 0.8,
            sessionName: options.sessionName || 'Current Session',
            accountName: options.accountName || 'User Account',
            unreadCount: options.unreadCount || 3,
            ...options
        };

        // Event handlers
        this.onSessionNameClick = options.onSessionNameClick || (() => {});
        this.onEditClick = options.onEditClick || (() => {});
        this.onSearchClick = options.onSearchClick || (() => {});
        this.onAddPersonClick = options.onAddPersonClick || (() => {});

        // Container dimensions
        this.containerWidth = 0;
        this.containerHeight = this.config.height;

        // UI elements
        this.background = null;
        this.unreadIcon = null;
        this.redDot = null;
        this.sessionNameButton = null;
        this.sessionNameText = null;
        this.editIcon = null;
        this.searchIcon = null;
        this.accountNameText = null;
        this.addPersonIcon = null;

        // Touch/mouse tracking
        this.touchStartTime = 0;
        this.touchThreshold = 200; // ms for tap vs long press

        this.init();
        this.log('TopBar component initialized', this.config);
    }

    /**
     * Initialize the top bar component
     */
    init() {
        this.createBackground();
        this.createUnreadIndicator();
        this.createSessionNameButton();
        this.createEditIcon();
        this.createSearchIcon();
        this.createAccountName();
        this.createAddPersonIcon();
        
        this.setupInteractivity();
        this.log('TopBar UI elements created');
    }

    /**
     * Create semi-transparent background with Vision UI style
     */
    createBackground() {
        this.background = new PIXI.Graphics();
        this.background.name = 'topbar-background';
        this.addChild(this.background);
        
        this.log('Background created');
    }

    /**
     * Create unread message indicator with red dot
     */
    createUnreadIndicator() {
        // Message icon container
        this.unreadIcon = new PIXI.Container();
        this.unreadIcon.name = 'unread-indicator';
        
        // Message icon (envelope shape)
        const messageIcon = new PIXI.Graphics();
        messageIcon.lineStyle(1.5, this.config.iconColor, 1);
        messageIcon.drawRoundedRect(0, 0, 20, 14, 2);
        messageIcon.moveTo(0, 2);
        messageIcon.lineTo(10, 8);
        messageIcon.lineTo(20, 2);
        messageIcon.stroke();
        
        // Center the icon
        messageIcon.x = (this.config.iconSize - 20) / 2;
        messageIcon.y = (this.config.iconSize - 14) / 2;
        
        this.unreadIcon.addChild(messageIcon);

        // Red notification dot
        if (this.config.unreadCount > 0) {
            this.redDot = new PIXI.Graphics();
            this.redDot.beginFill(this.config.redDotColor);
            this.redDot.drawCircle(0, 0, 6);
            this.redDot.endFill();
            
            // Position at top-right of icon
            this.redDot.x = this.config.iconSize - 2;
            this.redDot.y = 2;
            
            // Add count text if more than 1
            if (this.config.unreadCount > 1) {
                const countText = new PIXI.Text(
                    this.config.unreadCount > 99 ? '99+' : this.config.unreadCount.toString(),
                    {
                        fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: 10,
                        fill: 0xffffff,
                        fontWeight: '600'
                    }
                );
                countText.anchor.set(0.5);
                this.redDot.addChild(countText);
            }
            
            this.unreadIcon.addChild(this.redDot);
        }

        this.addChild(this.unreadIcon);
        this.log('Unread indicator created', { unreadCount: this.config.unreadCount });
    }

    /**
     * Create clickable session name button (pure text)
     */
    createSessionNameButton() {
        this.sessionNameButton = new PIXI.Container();
        this.sessionNameButton.name = 'session-name-button';
        this.sessionNameButton.interactive = true;
        this.sessionNameButton.buttonMode = true;
        this.sessionNameButton.cursor = 'pointer';

        // Session name text (pure text button)
        this.sessionNameText = new PIXI.Text(this.config.sessionName, {
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: this.config.fontSize,
            fill: this.config.textColor,
            fontWeight: '500'
        });
        this.sessionNameText.anchor.set(0, 0.5);

        // Hover background (invisible by default)
        const hoverBg = new PIXI.Graphics();
        hoverBg.beginFill(0xffffff, 0.1);
        hoverBg.drawRoundedRect(-8, -16, 0, 32, 8);
        hoverBg.endFill();
        hoverBg.visible = false;
        hoverBg.name = 'hover-background';

        this.sessionNameButton.addChild(hoverBg);
        this.sessionNameButton.addChild(this.sessionNameText);

        this.addChild(this.sessionNameButton);
        this.log('Session name button created', { sessionName: this.config.sessionName });
    }

    /**
     * Create edit icon next to session name
     */
    createEditIcon() {
        this.editIcon = new PIXI.Container();
        this.editIcon.name = 'edit-icon';
        this.editIcon.interactive = true;
        this.editIcon.buttonMode = true;
        this.editIcon.cursor = 'pointer';

        // Edit pencil icon
        const pencilIcon = new PIXI.Graphics();
        pencilIcon.lineStyle(1.5, this.config.iconColor, 1);
        
        // Pencil body
        pencilIcon.moveTo(4, 16);
        pencilIcon.lineTo(16, 4);
        pencilIcon.moveTo(2, 18);
        pencilIcon.lineTo(4, 16);
        pencilIcon.moveTo(16, 4);
        pencilIcon.lineTo(18, 2);
        
        // Edit lines
        pencilIcon.moveTo(6, 14);
        pencilIcon.lineTo(14, 6);
        pencilIcon.moveTo(8, 16);
        pencilIcon.lineTo(16, 8);
        
        pencilIcon.stroke();

        // Center the icon
        pencilIcon.x = (this.config.iconSize - 20) / 2;
        pencilIcon.y = (this.config.iconSize - 20) / 2;

        this.editIcon.addChild(pencilIcon);
        this.addChild(this.editIcon);
        this.log('Edit icon created');
    }

    /**
     * Create search icon (rightmost)
     */
    createSearchIcon() {
        this.searchIcon = new PIXI.Container();
        this.searchIcon.name = 'search-icon';
        this.searchIcon.interactive = true;
        this.searchIcon.buttonMode = true;
        this.searchIcon.cursor = 'pointer';

        // Search magnifying glass
        const searchGraphics = new PIXI.Graphics();
        searchGraphics.lineStyle(1.5, this.config.iconColor, 1);
        searchGraphics.drawCircle(8, 8, 6);
        searchGraphics.moveTo(12.5, 12.5);
        searchGraphics.lineTo(18, 18);
        searchGraphics.stroke();

        // Center the icon
        searchGraphics.x = (this.config.iconSize - 20) / 2;
        searchGraphics.y = (this.config.iconSize - 20) / 2;

        this.searchIcon.addChild(searchGraphics);
        this.addChild(this.searchIcon);
        this.log('Search icon created');
    }

    /**
     * Create account name text
     */
    createAccountName() {
        this.accountNameText = new PIXI.Text(this.config.accountName, {
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: this.config.accountFontSize,
            fill: this.config.textColor,
            fontWeight: '400'
        });
        this.accountNameText.anchor.set(1, 0.5);
        this.accountNameText.name = 'account-name';

        this.addChild(this.accountNameText);
        this.log('Account name created', { accountName: this.config.accountName });
    }

    /**
     * Create add person icon
     */
    createAddPersonIcon() {
        this.addPersonIcon = new PIXI.Container();
        this.addPersonIcon.name = 'add-person-icon';
        this.addPersonIcon.interactive = true;
        this.addPersonIcon.buttonMode = true;
        this.addPersonIcon.cursor = 'pointer';

        // Person icon with plus
        const personIcon = new PIXI.Graphics();
        personIcon.lineStyle(1.5, this.config.iconColor, 1);
        
        // Head
        personIcon.drawCircle(10, 6, 3);
        
        // Body
        personIcon.moveTo(5, 18);
        personIcon.quadraticCurveTo(10, 12, 15, 18);
        
        // Plus sign
        personIcon.moveTo(16, 10);
        personIcon.lineTo(20, 10);
        personIcon.moveTo(18, 8);
        personIcon.lineTo(18, 12);
        
        personIcon.stroke();

        // Center the icon
        personIcon.x = (this.config.iconSize - 22) / 2;
        personIcon.y = (this.config.iconSize - 20) / 2;

        this.addPersonIcon.addChild(personIcon);
        this.addChild(this.addPersonIcon);
        this.log('Add person icon created');
    }

    /**
     * Setup interactivity for all clickable elements
     */
    setupInteractivity() {
        // Session name button interactions
        this.sessionNameButton.on('pointerover', () => {
            const hoverBg = this.sessionNameButton.getChildByName('hover-background');
            if (hoverBg) {
                hoverBg.visible = true;
                const textWidth = this.sessionNameText.width;
                hoverBg.clear();
                hoverBg.beginFill(0xffffff, 0.1);
                hoverBg.drawRoundedRect(-8, -16, textWidth + 16, 32, 8);
                hoverBg.endFill();
            }
            this.sessionNameText.alpha = this.config.hoverAlpha;
            this.log('Session name button hover');
        });

        this.sessionNameButton.on('pointerout', () => {
            const hoverBg = this.sessionNameButton.getChildByName('hover-background');
            if (hoverBg) hoverBg.visible = false;
            this.sessionNameText.alpha = 1;
        });

        this.sessionNameButton.on('pointerdown', (event) => {
            this.touchStartTime = Date.now();
            this.sessionNameText.alpha = 0.6;
            this.log('Session name button pressed');
        });

        this.sessionNameButton.on('pointerup', (event) => {
            this.sessionNameText.alpha = 1;
            const touchDuration = Date.now() - this.touchStartTime;
            if (touchDuration < this.touchThreshold) {
                this.onSessionNameClick(event);
                this.log('Session name button clicked', { touchDuration });
            }
        });

        // Edit icon interactions
        this.editIcon.on('pointerover', () => {
            this.editIcon.alpha = this.config.hoverAlpha;
        });

        this.editIcon.on('pointerout', () => {
            this.editIcon.alpha = 1;
        });

        this.editIcon.on('pointerdown', () => {
            this.editIcon.alpha = 0.6;
        });

        this.editIcon.on('pointerup', (event) => {
            this.editIcon.alpha = 1;
            this.onEditClick(event);
            this.log('Edit icon clicked');
        });

        // Search icon interactions
        this.searchIcon.on('pointerover', () => {
            this.searchIcon.alpha = this.config.hoverAlpha;
        });

        this.searchIcon.on('pointerout', () => {
            this.searchIcon.alpha = 1;
        });

        this.searchIcon.on('pointerdown', () => {
            this.searchIcon.alpha = 0.6;
        });

        this.searchIcon.on('pointerup', (event) => {
            this.searchIcon.alpha = 1;
            this.onSearchClick(event);
            this.log('Search icon clicked');
        });

        // Add person icon interactions
        this.addPersonIcon.on('pointerover', () => {
            this.addPersonIcon.alpha = this.config.hoverAlpha;
        });

        this.addPersonIcon.on('pointerout', () => {
            this.addPersonIcon.alpha = 1;
        });

        this.addPersonIcon.on('pointerdown', () => {
            this.addPersonIcon.alpha = 0.6;
        });

        this.addPersonIcon.on('pointerup', (event) => {
            this.addPersonIcon.alpha = 1;
            this.onAddPersonClick(event);
            this.log('Add person icon clicked');
        });

        this.log('Interactivity setup completed');
    }

    /**
     * Resize and layout the top bar
     * @param {number} width - Container width
     */
    resize(width) {
        this.containerWidth = width;
        this.layout();
        this.log('TopBar resized', { width, height: this.containerHeight });
    }

    /**
     * Layout all elements with responsive positioning
     */
    layout() {
        if (!this.containerWidth) return;

        // Update background
        this.background.clear();
        this.background.beginFill(this.config.backgroundColor, this.config.backgroundAlpha);
        this.background.drawRect(0, 0, this.containerWidth, this.containerHeight);
        this.background.endFill();
        
        // Add border
        this.background.lineStyle(1, this.config.borderColor, this.config.borderAlpha);
        this.background.moveTo(0, this.containerHeight - 1);
        this.background.lineTo(this.containerWidth, this.containerHeight - 1);

        // Position elements
        const centerY = this.containerHeight / 2;
        let currentX = this.config.padding;

        // 1. Unread message indicator (leftmost)
        this.unreadIcon.x = currentX;
        this.unreadIcon.y = centerY - this.config.iconSize / 2;
        currentX += this.config.iconSize + 16;

        // 2. Session name button
        this.sessionNameButton.x = currentX;
        this.sessionNameButton.y = centerY;
        currentX += this.sessionNameText.width + 12;

        // 3. Edit icon (next to session name)
        this.editIcon.x = currentX;
        this.editIcon.y = centerY - this.config.iconSize / 2;

        // Right side elements (positioned from right to left)
        let rightX = this.containerWidth - this.config.padding;

        // 4. Search icon (rightmost)
        this.searchIcon.x = rightX - this.config.iconSize;
        this.searchIcon.y = centerY - this.config.iconSize / 2;
        rightX -= this.config.iconSize + 16;

        // 5. Account name (left of search)
        this.accountNameText.x = rightX;
        this.accountNameText.y = centerY;
        rightX -= 16;

        // 6. Add person icon (left of account name)
        this.addPersonIcon.x = rightX - this.config.iconSize;
        this.addPersonIcon.y = centerY - this.config.iconSize / 2;

        this.log('Layout completed', {
            unreadIconX: this.unreadIcon.x,
            sessionNameX: this.sessionNameButton.x,
            editIconX: this.editIcon.x,
            searchIconX: this.searchIcon.x,
            accountNameX: this.accountNameText.x,
            addPersonIconX: this.addPersonIcon.x
        });
    }

    /**
     * Update session name
     * @param {string} name - New session name
     */
    updateSessionName(name) {
        this.config.sessionName = name;
        this.sessionNameText.text = name;
        this.layout(); // Re-layout to adjust positioning
        this.log('Session name updated', { sessionName: name });
    }

    /**
     * Update account name
     * @param {string} name - New account name
     */
    updateAccountName(name) {
        this.config.accountName = name;
        this.accountNameText.text = name;
        this.layout(); // Re-layout to adjust positioning
        this.log('Account name updated', { accountName: name });
    }

    /**
     * Update unread count
     * @param {number} count - New unread count
     */
    updateUnreadCount(count) {
        this.config.unreadCount = count;
        
        // Remove existing red dot
        if (this.redDot) {
            this.unreadIcon.removeChild(this.redDot);
            this.redDot = null;
        }

        // Add new red dot if count > 0
        if (count > 0) {
            this.redDot = new PIXI.Graphics();
            this.redDot.beginFill(this.config.redDotColor);
            this.redDot.drawCircle(0, 0, 6);
            this.redDot.endFill();
            
            this.redDot.x = this.config.iconSize - 2;
            this.redDot.y = 2;
            
            if (count > 1) {
                const countText = new PIXI.Text(
                    count > 99 ? '99+' : count.toString(),
                    {
                        fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: 10,
                        fill: 0xffffff,
                        fontWeight: '600'
                    }
                );
                countText.anchor.set(0.5);
                this.redDot.addChild(countText);
            }
            
            this.unreadIcon.addChild(this.redDot);
        }

        this.log('Unread count updated', { unreadCount: count });
    }

    /**
     * Set theme colors
     * @param {Object} theme - Theme configuration
     */
    setTheme(theme) {
        Object.assign(this.config, theme);
        
        // Update text colors
        this.sessionNameText.style.fill = this.config.textColor;
        this.accountNameText.style.fill = this.config.textColor;
        
        // Recreate icons with new colors (simplified approach)
        this.removeChild(this.unreadIcon, this.editIcon, this.searchIcon, this.addPersonIcon);
        this.createUnreadIndicator();
        this.createEditIcon();
        this.createSearchIcon();
        this.createAddPersonIcon();
        this.setupInteractivity();
        this.layout();
        
        this.log('Theme updated', theme);
    }

    /**
     * Get current layout metrics
     * @returns {Object} Layout information
     */
    getMetrics() {
        return {
            width: this.containerWidth,
            height: this.containerHeight,
            elementPositions: {
                unreadIcon: { x: this.unreadIcon.x, y: this.unreadIcon.y },
                sessionName: { x: this.sessionNameButton.x, y: this.sessionNameButton.y },
                editIcon: { x: this.editIcon.x, y: this.editIcon.y },
                searchIcon: { x: this.searchIcon.x, y: this.searchIcon.y },
                accountName: { x: this.accountNameText.x, y: this.accountNameText.y },
                addPersonIcon: { x: this.addPersonIcon.x, y: this.addPersonIcon.y }
            },
            config: { ...this.config }
        };
    }

    /**
     * Logging utility
     * @param {string} message - Log message
     * @param {*} data - Additional data to log
     */
    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            component: 'TopBar',
            message,
            ...(data && { data })
        };
        
        console.log(`[${timestamp}] TopBar: ${message}`, data || '');
        
        // Store in performance metrics if available
        if (window.performanceMetrics) {
            window.performanceMetrics.topBarLogs = window.performanceMetrics.topBarLogs || [];
            window.performanceMetrics.topBarLogs.push(logEntry);
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        // Remove all event listeners
        if (this.sessionNameButton) {
            this.sessionNameButton.removeAllListeners();
        }
        if (this.editIcon) {
            this.editIcon.removeAllListeners();
        }
        if (this.searchIcon) {
            this.searchIcon.removeAllListeners();
        }
        if (this.addPersonIcon) {
            this.addPersonIcon.removeAllListeners();
        }

        this.log('TopBar component destroyed');
        super.destroy();
    }
}

// Export for module usage
export default TopBar;