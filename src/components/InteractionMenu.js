/**
 * InteractionMenu Component - PixiJS v8 Context Menu for Message Interactions
 * Features: Dynamic menu options, smooth animations, auto-positioning, gesture support
 */

import * as PIXI from 'pixi.js';
import VisionMaterial from './VisionMaterial.js';

export class InteractionMenu extends PIXI.Container {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            width: options.width || 200,
            itemHeight: options.itemHeight || 44,
            padding: options.padding || 8,
            borderRadius: options.borderRadius || 12,
            showIcons: options.showIcons !== false,
            autoPosition: options.autoPosition !== false,
            hideOnClickOutside: options.hideOnClickOutside !== false,
            animationDuration: options.animationDuration || 200,
            maxItems: options.maxItems || 8
        };
        
        // Menu state
        this.state = {
            isVisible: false,
            isAnimating: false,
            selectedIndex: -1,
            targetPosition: { x: 0, y: 0 },
            menuItems: []
        };
        
        // Event system
        this.events = new PIXI.EventEmitter();
        
        // Material system for Vision UI
        this.visionMaterial = new VisionMaterial();
        
        // Animation ticker
        this.animationTicker = null;
        
        console.log('[InteractionMenu] Menu component initialized');
        
        this.init();
    }
    
    init() {
        try {
            this.createMenuContainer();
            this.setupEventListeners();
            this.hide(); // Initially hidden
            
            console.log('[InteractionMenu] Menu initialization complete');
        } catch (error) {
            console.error('[InteractionMenu] Failed to initialize menu:', error);
            throw error;
        }
    }
    
    createMenuContainer() {
        // Main menu container
        this.menuContainer = new PIXI.Container();
        
        // Background with Vision Material
        this.menuBackground = null; // Will be created when showing
        
        // Items container
        this.itemsContainer = new PIXI.Container();
        this.itemsContainer.position.set(this.config.padding, this.config.padding);
        
        this.menuContainer.addChild(this.itemsContainer);
        this.addChild(this.menuContainer);
        
        // Mask for items (for smooth scrolling if needed)
        this.itemsMask = new PIXI.Graphics();
        this.itemsContainer.mask = this.itemsMask;
        this.menuContainer.addChild(this.itemsMask);
        
        console.log('[InteractionMenu] Menu container created');
    }
    
    /**
     * Show menu with specified items at target position
     * @param {Array} items - Menu items configuration
     * @param {Object} position - Target position {x, y}
     * @param {Object} context - Context data for menu items
     */
    show(items, position, context = {}) {
        if (this.state.isAnimating) return;
        
        try {
            this.state.menuItems = this.validateMenuItems(items);
            this.state.targetPosition = position;
            this.menuContext = context;
            
            // Clear existing items
            this.itemsContainer.removeChildren();
            
            // Create background
            this.createMenuBackground();
            
            // Create menu items
            this.createMenuItems();
            
            // Position menu
            if (this.config.autoPosition) {
                this.autoPositionMenu(position);
            } else {
                this.position.set(position.x, position.y);
            }
            
            // Show with animation
            this.animateShow();
            
            console.log('[InteractionMenu] Menu shown with items:', this.state.menuItems.length);
            
        } catch (error) {
            console.error('[InteractionMenu] Failed to show menu:', error);
        }
    }
    
    validateMenuItems(items) {
        return items.filter(item => {
            // Validate required properties
            if (!item.id || !item.text) {
                console.warn('[InteractionMenu] Invalid menu item:', item);
                return false;
            }
            
            // Set defaults
            return {
                id: item.id,
                text: item.text,
                icon: item.icon || '',
                color: item.color || 0x333333,
                disabled: item.disabled || false,
                separator: item.separator || false,
                destructive: item.destructive || false,
                callback: item.callback || null,
                ...item
            };
        });
    }
    
    createMenuBackground() {
        if (this.menuBackground) {
            this.menuContainer.removeChild(this.menuBackground);
        }
        
        // Calculate menu height
        const menuHeight = this.state.menuItems.length * this.config.itemHeight + this.config.padding * 2;
        
        // Create background using Vision Material
        this.menuBackground = this.visionMaterial.createGlassMaterial(
            this.visionMaterial.materials.GLASS_SEMI,
            this.config.width,
            menuHeight,
            this.config.borderRadius,
            {
                fillAlpha: 0.95,
                strokeAlpha: 0.3,
                glow: true
            }
        );
        
        // Add to container (behind items)
        this.menuContainer.addChildAt(this.menuBackground, 0);
        
        // Update mask
        this.itemsMask.clear();
        this.itemsMask
            .roundRect(this.config.padding, this.config.padding, 
                      this.config.width - this.config.padding * 2, 
                      menuHeight - this.config.padding * 2, 
                      this.config.borderRadius - 4)
            .fill({ color: 0xFFFFFF });
        
        console.log('[InteractionMenu] Menu background created', { width: this.config.width, height: menuHeight });
    }
    
    createMenuItems() {
        this.state.menuItems.forEach((item, index) => {
            if (item.separator) {
                this.createSeparator(index);
            } else {
                this.createMenuItem(item, index);
            }
        });
        
        console.log('[InteractionMenu] Menu items created:', this.state.menuItems.length);
    }
    
    createMenuItem(item, index) {
        const itemContainer = new PIXI.Container();
        const y = index * this.config.itemHeight;
        itemContainer.position.set(0, y);
        
        // Item background (for hover effects)
        const itemBg = new PIXI.Graphics();
        itemBg
            .roundRect(0, 0, this.config.width - this.config.padding * 2, this.config.itemHeight, 8)
            .fill({ color: 0x000000, alpha: 0 });
        itemContainer.addChild(itemBg);
        
        // Icon
        if (this.config.showIcons && item.icon) {
            const icon = new PIXI.Text({
                text: item.icon,
                style: {
                    fontSize: 16,
                    fill: item.disabled ? 0xCCCCCC : item.color
                }
            });
            icon.anchor.set(0, 0.5);
            icon.position.set(12, this.config.itemHeight / 2);
            itemContainer.addChild(icon);
        }
        
        // Text
        const textX = this.config.showIcons && item.icon ? 40 : 12;
        const text = new PIXI.Text({
            text: item.text,
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI"',
                fontSize: 16,
                fill: item.disabled ? 0xCCCCCC : (item.destructive ? 0xFF3B30 : item.color),
                fontWeight: item.destructive ? 'bold' : 'normal'
            }
        });
        text.anchor.set(0, 0.5);
        text.position.set(textX, this.config.itemHeight / 2);
        itemContainer.addChild(text);
        
        // Keyboard shortcut (if specified)
        if (item.shortcut) {
            const shortcut = new PIXI.Text({
                text: item.shortcut,
                style: {
                    fontSize: 12,
                    fill: 0x999999,
                    fontWeight: 'normal'
                }
            });
            shortcut.anchor.set(1, 0.5);
            shortcut.position.set(this.config.width - this.config.padding * 2 - 12, this.config.itemHeight / 2);
            itemContainer.addChild(shortcut);
        }
        
        // Make interactive (unless disabled)
        if (!item.disabled) {
            itemContainer.eventMode = 'static';
            itemContainer.cursor = 'pointer';
            
            // Store item data
            itemContainer.itemData = item;
            itemContainer.itemIndex = index;
            
            // Event handlers
            itemContainer.on('pointerenter', () => this.onItemHover(itemContainer, itemBg));
            itemContainer.on('pointerleave', () => this.onItemLeave(itemContainer, itemBg));
            itemContainer.on('pointerdown', () => this.onItemClick(item, index));
        }
        
        this.itemsContainer.addChild(itemContainer);
    }
    
    createSeparator(index) {
        const separator = new PIXI.Graphics();
        const y = index * this.config.itemHeight + this.config.itemHeight / 2 - 1;
        
        separator
            .rect(12, y, this.config.width - this.config.padding * 2 - 24, 1)
            .fill({ color: 0xE0E0E0, alpha: 0.8 });
        
        this.itemsContainer.addChild(separator);
    }
    
    // Event handlers
    onItemHover(container, background) {
        this.state.selectedIndex = container.itemIndex;
        
        // Hover background
        background.clear();
        background
            .roundRect(0, 0, this.config.width - this.config.padding * 2, this.config.itemHeight, 8)
            .fill({ color: 0x007AFF, alpha: 0.1 });
        
        // Haptic feedback (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(1);
        }
    }
    
    onItemLeave(container, background) {
        // Clear hover background
        background.clear();
        background
            .roundRect(0, 0, this.config.width - this.config.padding * 2, this.config.itemHeight, 8)
            .fill({ color: 0x000000, alpha: 0 });
    }
    
    onItemClick(item, index) {
        console.log('[InteractionMenu] Item clicked:', item.id);
        
        // Flash effect
        this.flashItem(index);
        
        // Execute callback
        if (item.callback && typeof item.callback === 'function') {
            try {
                item.callback(this.menuContext);
            } catch (error) {
                console.error('[InteractionMenu] Error executing item callback:', error);
            }
        }
        
        // Emit event
        this.events.emit('itemClick', {
            item,
            index,
            context: this.menuContext
        });
        
        // Auto-hide menu after selection
        setTimeout(() => this.hide(), 100);
    }
    
    flashItem(index) {
        const itemContainer = this.itemsContainer.children[index];
        if (!itemContainer) return;
        
        const flashBg = new PIXI.Graphics();
        flashBg
            .roundRect(0, 0, this.config.width - this.config.padding * 2, this.config.itemHeight, 8)
            .fill({ color: 0x007AFF, alpha: 0.3 });
        
        itemContainer.addChildAt(flashBg, 1);
        
        // Fade out flash
        const fadeOut = () => {
            flashBg.alpha -= 0.05;
            if (flashBg.alpha > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                itemContainer.removeChild(flashBg);
                flashBg.destroy();
            }
        };
        
        fadeOut();
    }
    
    autoPositionMenu(targetPosition) {
        // Get screen/container bounds
        const bounds = this.parent ? this.parent.getBounds() : { width: 800, height: 600 };
        const menuHeight = this.state.menuItems.length * this.config.itemHeight + this.config.padding * 2;
        
        let x = targetPosition.x;
        let y = targetPosition.y;
        
        // Adjust X position
        if (x + this.config.width > bounds.width) {
            x = bounds.width - this.config.width - 10;
        }
        if (x < 10) {
            x = 10;
        }
        
        // Adjust Y position
        if (y + menuHeight > bounds.height) {
            y = targetPosition.y - menuHeight - 10;
        }
        if (y < 10) {
            y = 10;
        }
        
        this.position.set(x, y);
        
        console.log('[InteractionMenu] Menu auto-positioned:', { x, y });
    }
    
    // Animation methods
    animateShow() {
        if (this.state.isAnimating) return;
        
        this.state.isAnimating = true;
        this.state.isVisible = true;
        this.visible = true;
        
        // Initial state
        this.scale.set(0.8);
        this.alpha = 0;
        
        // Animation parameters
        const startTime = Date.now();
        const duration = this.config.animationDuration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Update properties
            this.scale.set(0.8 + (0.2 * eased));
            this.alpha = eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scale.set(1);
                this.alpha = 1;
                this.state.isAnimating = false;
                
                // Setup outside click handler
                if (this.config.hideOnClickOutside) {
                    this.setupOutsideClickHandler();
                }
                
                this.events.emit('showComplete');
            }
        };
        
        animate();
        
        console.log('[InteractionMenu] Show animation started');
    }
    
    animateHide(callback) {
        if (this.state.isAnimating) return;
        
        this.state.isAnimating = true;
        
        // Remove outside click handler
        this.removeOutsideClickHandler();
        
        // Animation parameters
        const startTime = Date.now();
        const duration = this.config.animationDuration * 0.7;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in)
            const eased = Math.pow(progress, 2);
            
            // Update properties
            this.scale.set(1 - (0.2 * eased));
            this.alpha = 1 - eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scale.set(0.8);
                this.alpha = 0;
                this.visible = false;
                this.state.isVisible = false;
                this.state.isAnimating = false;
                
                if (callback) callback();
                this.events.emit('hideComplete');
            }
        };
        
        animate();
        
        console.log('[InteractionMenu] Hide animation started');
    }
    
    setupOutsideClickHandler() {
        // Add global pointer event to detect outside clicks
        if (!this.outsideClickHandler) {
            this.outsideClickHandler = (event) => {
                const menuBounds = this.getBounds();
                const global = event.global || event;
                
                // Check if click is outside menu bounds
                if (global.x < menuBounds.x || global.x > menuBounds.x + menuBounds.width ||
                    global.y < menuBounds.y || global.y > menuBounds.y + menuBounds.height) {
                    this.hide();
                }
            };
            
            // Add to stage or app
            if (this.parent && this.parent.interactive) {
                this.parent.on('pointerdown', this.outsideClickHandler);
            }
        }
    }
    
    removeOutsideClickHandler() {
        if (this.outsideClickHandler && this.parent) {
            this.parent.off('pointerdown', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    }
    
    setupEventListeners() {
        // Keyboard support
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        console.log('[InteractionMenu] Event listeners setup');
    }
    
    onKeyDown(event) {
        if (!this.state.isVisible || this.state.isAnimating) return;
        
        switch (event.key) {
            case 'Escape':
                this.hide();
                event.preventDefault();
                break;
            case 'ArrowUp':
                this.navigateUp();
                event.preventDefault();
                break;
            case 'ArrowDown':
                this.navigateDown();
                event.preventDefault();
                break;
            case 'Enter':
                this.selectCurrentItem();
                event.preventDefault();
                break;
        }
    }
    
    navigateUp() {
        if (this.state.selectedIndex > 0) {
            this.state.selectedIndex--;
            this.updateSelection();
        }
    }
    
    navigateDown() {
        if (this.state.selectedIndex < this.state.menuItems.length - 1) {
            this.state.selectedIndex++;
            this.updateSelection();
        }
    }
    
    updateSelection() {
        // Update visual selection
        this.itemsContainer.children.forEach((child, index) => {
            if (child.itemIndex === this.state.selectedIndex) {
                const bg = child.children[0];
                bg.clear();
                bg.roundRect(0, 0, this.config.width - this.config.padding * 2, this.config.itemHeight, 8)
                  .fill({ color: 0x007AFF, alpha: 0.1 });
            } else if (child.itemIndex !== undefined) {
                const bg = child.children[0];
                bg.clear();
                bg.roundRect(0, 0, this.config.width - this.config.padding * 2, this.config.itemHeight, 8)
                  .fill({ color: 0x000000, alpha: 0 });
            }
        });
    }
    
    selectCurrentItem() {
        const selectedItem = this.state.menuItems[this.state.selectedIndex];
        if (selectedItem && !selectedItem.disabled) {
            this.onItemClick(selectedItem, this.state.selectedIndex);
        }
    }
    
    // Public methods
    hide() {
        if (!this.state.isVisible || this.state.isAnimating) return;
        
        this.animateHide(() => {
            console.log('[InteractionMenu] Menu hidden');
        });
    }
    
    isVisible() {
        return this.state.isVisible;
    }
    
    updateItems(items) {
        if (this.state.isVisible) {
            this.state.menuItems = this.validateMenuItems(items);
            this.itemsContainer.removeChildren();
            this.createMenuBackground();
            this.createMenuItems();
            
            console.log('[InteractionMenu] Menu items updated while visible');
        }
    }
    
    destroy() {
        try {
            // Remove event listeners
            document.removeEventListener('keydown', this.onKeyDown.bind(this));
            this.removeOutsideClickHandler();
            this.removeAllListeners();
            this.events.removeAllListeners();
            
            // Destroy vision material
            if (this.visionMaterial) {
                this.visionMaterial.destroy();
            }
            
            // Stop any running animations
            if (this.animationTicker) {
                this.animationTicker.destroy();
            }
            
            // Destroy children
            this.children.forEach(child => {
                if (child.destroy) {
                    child.destroy();
                }
            });
            
            super.destroy();
            
            console.log('[InteractionMenu] Menu destroyed');
        } catch (error) {
            console.error('[InteractionMenu] Error during destruction:', error);
        }
    }
}

// Factory function for common menu types
export const createContextMenu = (items, position, context) => {
    const menu = new InteractionMenu({
        hideOnClickOutside: true,
        autoPosition: true
    });
    menu.show(items, position, context);
    return menu;
};

export const createMessageMenu = (messageData, position) => {
    const items = [
        { id: 'copy', text: 'Copy', icon: '📋', callback: () => console.log('Copy message') },
        { id: 'reply', text: 'Reply', icon: '↩️', callback: () => console.log('Reply to message') },
        { id: 'forward', text: 'Forward', icon: '➡️', callback: () => console.log('Forward message') },
        { id: 'separator', separator: true },
        { id: 'select', text: 'Select', icon: '☑️', callback: () => console.log('Select message') },
        { id: 'info', text: 'Info', icon: 'ℹ️', callback: () => console.log('Message info') },
        { id: 'separator2', separator: true },
        { id: 'delete', text: 'Delete', icon: '🗑️', destructive: true, callback: () => console.log('Delete message') }
    ];
    
    // Filter items based on message data
    const filteredItems = items.filter(item => {
        if (item.id === 'delete' && !messageData.isOwn) return false;
        return true;
    });
    
    return createContextMenu(filteredItems, position, { messageData });
};

export default InteractionMenu;