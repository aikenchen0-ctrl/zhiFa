/**
 * PixiJS UI Components - Main Entry Point
 * Exports all UI components and utilities for easy importing
 */

// Core components
export { default as BottomBar } from './BottomBar.js';
export { default as TopBar } from './TopBar.js';
export { default as MessageBubble, createMessageBubble } from './MessageBubble.js';
export { default as VisionMaterial, MaterialHelpers } from './VisionMaterial.js';
export { default as InteractionMenu, createContextMenu, createMessageMenu } from './InteractionMenu.js';
export { default as StateManager, getStateManager } from './StateManager.js';

// Component versions and info
export const COMPONENT_VERSION = '1.0.0';
export const PIXI_VERSION_REQUIRED = '8.0.0';

/**
 * UI Component Factory - Creates and manages UI components
 */
export class UIComponentFactory {
    constructor(app, options = {}) {
        this.app = app;
        this.stateManager = getStateManager();
        
        // Default configuration
        this.config = {
            theme: options.theme || 'light',
            width: options.width || 375,
            height: options.height || 812,
            enableStateManagement: options.enableStateManagement !== false,
            enableErrorHandling: options.enableErrorHandling !== false,
            enableLogging: options.enableLogging !== false,
            ...options
        };
        
        // Component instances
        this.components = {
            topBar: null,
            bottomBar: null,
            messageContainer: null,
            currentMenu: null
        };
        
        // Layout configuration
        this.layout = {
            topBarHeight: 60,
            bottomBarHeight: 80,
            messagePadding: 16,
            bubbleSpacing: 8
        };
        
        console.log('[UIComponentFactory] Factory initialized', this.config);
        
        this.init();
    }
    
    init() {
        try {
            // Setup state management
            if (this.config.enableStateManagement) {
                this.setupStateManagement();
            }
            
            // Setup error handling
            if (this.config.enableErrorHandling) {
                this.setupErrorHandling();
            }
            
            // Initialize UI state
            this.initializeState();
            
            console.log('[UIComponentFactory] Factory initialization complete');
        } catch (error) {
            console.error('[UIComponentFactory] Failed to initialize factory:', error);
            throw error;
        }
    }
    
    setupStateManagement() {
        // Register factory with state manager
        this.stateManager.registerComponent('ui-factory', this, {
            autoCleanup: true,
            trackPerformance: true,
            handleErrors: true
        });
        
        // Listen for state changes
        this.stateManager.on('stateChange', this.onStateChange.bind(this));
        this.stateManager.on('resize', this.onResize.bind(this));
        this.stateManager.on('orientationChange', this.onOrientationChange.bind(this));
    }
    
    setupErrorHandling() {
        this.stateManager.on('componentError', (event) => {
            console.error('[UIComponentFactory] Component error:', event);
        });
    }
    
    initializeState() {
        // Set initial UI state
        this.stateManager.setState('ui.screenWidth', this.config.width, { source: 'factory' });
        this.stateManager.setState('ui.screenHeight', this.config.height, { source: 'factory' });
        this.stateManager.setState('ui.theme', this.config.theme, { source: 'factory' });
        this.stateManager.setState('ui.scale', 1.0, { source: 'factory' });
    }
    
    /**
     * Create top bar component
     * @param {Object} options - TopBar options
     */
    createTopBar(options = {}) {
        try {
            if (this.components.topBar) {
                this.destroyTopBar();
            }
            
            const topBarOptions = {
                width: this.config.width,
                height: this.layout.topBarHeight,
                ...options
            };
            
            this.components.topBar = new TopBar(topBarOptions.width, topBarOptions.height);
            this.components.topBar.position.set(0, 0);
            
            // Register with state manager
            this.stateManager.registerComponent('top-bar', this.components.topBar);
            
            // Setup event handlers
            this.components.topBar.events.on('sessionClick', (data) => {
                this.stateManager.setState('session.currentSessionId', data.sessionName, { source: 'topbar' });
            });
            
            this.components.topBar.events.on('searchClick', (data) => {
                this.stateManager.setState('ui.searchActive', data.searchActive, { source: 'topbar' });
            });
            
            this.components.topBar.events.on('userClick', (data) => {
                this.showUserMenu(data);
            });
            
            this.app.stage.addChild(this.components.topBar);
            
            console.log('[UIComponentFactory] TopBar created');
            return this.components.topBar;
        } catch (error) {
            this.stateManager.handleError('Failed to create TopBar', error);
            return null;
        }
    }
    
    /**
     * Create bottom bar component
     * @param {Object} options - BottomBar options
     */
    createBottomBar(options = {}) {
        try {
            if (this.components.bottomBar) {
                this.destroyBottomBar();
            }
            
            const bottomBarOptions = {
                width: this.config.width,
                height: this.layout.bottomBarHeight,
                ...options
            };
            
            this.components.bottomBar = new BottomBar(bottomBarOptions.width, bottomBarOptions.height);
            this.components.bottomBar.position.set(0, this.config.height - this.layout.bottomBarHeight);
            
            // Register with state manager
            this.stateManager.registerComponent('bottom-bar', this.components.bottomBar);
            
            // Setup event handlers
            this.components.bottomBar.events.on('inputStateChange', (data) => {
                this.stateManager.setState('input.isActive', data.active, { source: 'bottombar' });
            });
            
            this.components.bottomBar.events.on('voiceModeChange', (data) => {
                this.stateManager.setState('input.voiceMode', data.voiceMode, { source: 'bottombar' });
            });
            
            this.components.bottomBar.events.on('menuExpandedChange', (data) => {
                this.stateManager.setState('menu.isExpanded', data.expanded, { source: 'bottombar' });
            });
            
            this.components.bottomBar.events.on('scrollButtonClick', this.onBottomBarAction.bind(this));
            this.components.bottomBar.events.on('menuOptionClick', this.onBottomBarAction.bind(this));
            
            this.app.stage.addChild(this.components.bottomBar);
            
            console.log('[UIComponentFactory] BottomBar created');
            return this.components.bottomBar;
        } catch (error) {
            this.stateManager.handleError('Failed to create BottomBar', error);
            return null;
        }
    }
    
    /**
     * Create message container for bubbles
     */
    createMessageContainer() {
        try {
            if (this.components.messageContainer) {
                this.app.stage.removeChild(this.components.messageContainer);
                this.components.messageContainer.destroy();
            }
            
            this.components.messageContainer = new PIXI.Container();
            this.components.messageContainer.position.set(0, this.layout.topBarHeight);
            
            // Create scrollable area mask
            const messageArea = new PIXI.Graphics();
            const messageHeight = this.config.height - this.layout.topBarHeight - this.layout.bottomBarHeight;
            messageArea.rect(0, 0, this.config.width, messageHeight);
            messageArea.fill({ color: 0xFFFFFF });
            
            this.components.messageContainer.mask = messageArea;
            this.app.stage.addChild(messageArea);
            this.app.stage.addChild(this.components.messageContainer);
            
            console.log('[UIComponentFactory] Message container created');
            return this.components.messageContainer;
        } catch (error) {
            this.stateManager.handleError('Failed to create message container', error);
            return null;
        }
    }
    
    /**
     * Add message bubble to container
     * @param {Object} messageData - Message data
     * @param {Object} options - Bubble options
     */
    addMessageBubble(messageData, options = {}) {
        try {
            if (!this.components.messageContainer) {
                this.createMessageContainer();
            }
            
            const bubble = createMessageBubble(messageData, options);
            
            // Position bubble
            const messages = this.stateManager.getState('messages.messages') || [];
            const yPosition = messages.length * (60 + this.layout.bubbleSpacing) + this.layout.messagePadding;
            
            if (messageData.isOwn) {
                bubble.position.set(this.config.width - bubble.getBounds().width - this.layout.messagePadding, yPosition);
            } else {
                bubble.position.set(this.layout.messagePadding, yPosition);
            }
            
            // Register with state manager
            this.stateManager.registerComponent(`message-${messageData.id}`, bubble);
            
            // Setup event handlers
            bubble.events.on('bubbleClick', this.onBubbleClick.bind(this));
            bubble.events.on('bubbleRightClick', this.onBubbleRightClick.bind(this));
            
            this.components.messageContainer.addChild(bubble);
            
            // Update state
            messages.push(messageData);
            this.stateManager.setState('messages.messages', messages, { source: 'factory' });
            this.stateManager.setState('messages.lastMessageId', messageData.id, { source: 'factory' });
            
            console.log('[UIComponentFactory] Message bubble added:', messageData.id);
            return bubble;
        } catch (error) {
            this.stateManager.handleError('Failed to add message bubble', error);
            return null;
        }
    }
    
    /**
     * Show context menu
     * @param {Array} items - Menu items
     * @param {Object} position - Menu position
     * @param {Object} context - Menu context
     */
    showContextMenu(items, position, context = {}) {
        try {
            // Hide existing menu
            if (this.components.currentMenu) {
                this.hideContextMenu();
            }
            
            this.components.currentMenu = createContextMenu(items, position, context);
            this.stateManager.registerComponent('context-menu', this.components.currentMenu);
            
            this.components.currentMenu.events.on('itemClick', (event) => {
                this.stateManager.setState('menu.selectedItem', event.item.id, { source: 'menu' });
                console.log('[UIComponentFactory] Menu item selected:', event.item.id);
            });
            
            this.components.currentMenu.events.on('hideComplete', () => {
                this.hideContextMenu();
            });
            
            this.app.stage.addChild(this.components.currentMenu);
            
            console.log('[UIComponentFactory] Context menu shown');
            return this.components.currentMenu;
        } catch (error) {
            this.stateManager.handleError('Failed to show context menu', error);
            return null;
        }
    }
    
    /**
     * Hide current context menu
     */
    hideContextMenu() {
        if (this.components.currentMenu) {
            this.stateManager.unregisterComponent('context-menu');
            this.app.stage.removeChild(this.components.currentMenu);
            this.components.currentMenu.destroy();
            this.components.currentMenu = null;
        }
    }
    
    // Event handlers
    onStateChange(event) {
        const { path, newValue, source } = event;
        
        // Handle UI state changes
        if (path.startsWith('ui.')) {
            this.handleUIStateChange(path, newValue);
        }
        
        // Update component activity
        if (source && typeof source === 'string') {
            this.stateManager.updateComponentActivity(source);
        }
    }
    
    onResize(event) {
        const { width, height } = event;
        
        // Update configuration
        this.config.width = width;
        this.config.height = height;
        
        // Resize components
        if (this.components.topBar) {
            this.components.topBar.handleResize(width, this.layout.topBarHeight);
        }
        
        if (this.components.bottomBar) {
            this.components.bottomBar.handleResize(width, this.layout.bottomBarHeight);
            this.components.bottomBar.position.set(0, height - this.layout.bottomBarHeight);
        }
        
        if (this.components.messageContainer) {
            // Update message container mask
            const mask = this.components.messageContainer.mask;
            if (mask) {
                mask.clear();
                mask.rect(0, 0, width, height - this.layout.topBarHeight - this.layout.bottomBarHeight);
                mask.fill({ color: 0xFFFFFF });
            }
        }
        
        console.log('[UIComponentFactory] Components resized:', { width, height });
    }
    
    onOrientationChange(event) {
        console.log('[UIComponentFactory] Orientation changed:', event.orientation);
        // Handle orientation-specific layout changes here
    }
    
    onBubbleClick(event) {
        console.log('[UIComponentFactory] Bubble clicked:', event.messageId);
        this.stateManager.setState('messages.selectedMessage', event.messageId, { source: 'bubble' });
    }
    
    onBubbleRightClick(event) {
        const menuItems = createMessageMenu(event.messageData, event.position);
        this.showContextMenu(menuItems, event.position, { messageData: event.messageData });
    }
    
    onBottomBarAction(event) {
        console.log('[UIComponentFactory] Bottom bar action:', event.type);
        
        // Handle different action types
        switch (event.type) {
            case 'photo':
                this.handleMediaAction('photo');
                break;
            case 'video':
                this.handleMediaAction('video');
                break;
            case 'file':
                this.handleFileAction();
                break;
            default:
                console.log('[UIComponentFactory] Unhandled action:', event.type);
        }
    }
    
    showUserMenu(data) {
        const userMenuItems = [
            { id: 'profile', text: 'Profile', icon: '👤' },
            { id: 'settings', text: 'Settings', icon: '⚙️' },
            { id: 'separator', separator: true },
            { id: 'logout', text: 'Sign Out', icon: '🚪', destructive: true }
        ];
        
        const menuPosition = { x: this.config.width - 150, y: 60 };
        this.showContextMenu(userMenuItems, menuPosition, { user: data });
    }
    
    handleUIStateChange(path, newValue) {
        switch (path) {
            case 'ui.theme':
                this.updateTheme(newValue);
                break;
            case 'ui.scale':
                this.updateScale(newValue);
                break;
        }
    }
    
    handleMediaAction(type) {
        console.log(`[UIComponentFactory] Media action: ${type}`);
        // Implement media handling logic
    }
    
    handleFileAction() {
        console.log('[UIComponentFactory] File action triggered');
        // Implement file handling logic
    }
    
    updateTheme(theme) {
        console.log('[UIComponentFactory] Theme updated:', theme);
        // Update component themes
    }
    
    updateScale(scale) {
        console.log('[UIComponentFactory] Scale updated:', scale);
        // Update component scaling
        if (this.app.stage) {
            this.app.stage.scale.set(scale);
        }
    }
    
    // Cleanup methods
    destroyTopBar() {
        if (this.components.topBar) {
            this.stateManager.unregisterComponent('top-bar');
            this.app.stage.removeChild(this.components.topBar);
            this.components.topBar.destroy();
            this.components.topBar = null;
        }
    }
    
    destroyBottomBar() {
        if (this.components.bottomBar) {
            this.stateManager.unregisterComponent('bottom-bar');
            this.app.stage.removeChild(this.components.bottomBar);
            this.components.bottomBar.destroy();
            this.components.bottomBar = null;
        }
    }
    
    // Public API methods
    getComponent(name) {
        return this.components[name] || null;
    }
    
    getAllComponents() {
        return { ...this.components };
    }
    
    getState() {
        return this.stateManager.getAllState();
    }
    
    setState(path, value, options) {
        return this.stateManager.setState(path, value, { ...options, source: 'factory' });
    }
    
    getMetrics() {
        return this.stateManager.getMetrics();
    }
    
    destroy() {
        try {
            // Hide any open menus
            this.hideContextMenu();
            
            // Destroy all components
            this.destroyTopBar();
            this.destroyBottomBar();
            
            if (this.components.messageContainer) {
                this.app.stage.removeChild(this.components.messageContainer);
                this.components.messageContainer.destroy();
                this.components.messageContainer = null;
            }
            
            // Unregister from state manager
            this.stateManager.unregisterComponent('ui-factory');
            
            console.log('[UIComponentFactory] Factory destroyed');
        } catch (error) {
            console.error('[UIComponentFactory] Error during destruction:', error);
        }
    }
}

// Utility functions
export const createUIFactory = (app, options) => {
    return new UIComponentFactory(app, options);
};

export const getComponentInfo = () => {
    return {
        version: COMPONENT_VERSION,
        pixiVersionRequired: PIXI_VERSION_REQUIRED,
        components: [
            'BottomBar',
            'TopBar', 
            'MessageBubble',
            'VisionMaterial',
            'InteractionMenu',
            'StateManager'
        ]
    };
};

console.log(`[PixiUI] Components loaded - Version ${COMPONENT_VERSION}`);