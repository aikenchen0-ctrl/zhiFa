/**
 * PIXI.js v8 UI Component Library with Vision UI Glass Material Effects
 * 
 * Features:
 * - Vision UI半透明玻璃材质效果
 * - 触摸事件支持
 * - 响应式尺寸
 * - 详细日志输出
 * - 可配置样式
 */

import * as PIXI from 'pixi.js';

// 日志系统
class Logger {
    static log(component, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${component}]`, message, data || '');
    }

    static warn(component, message, data = null) {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [${component}] WARNING:`, message, data || '');
    }

    static error(component, message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [${component}] ERROR:`, message, error || '');
    }
}

// Vision UI 玻璃材质效果配置
const GlassEffects = {
    // 默认玻璃材质配置
    default: {
        alpha: 0.85,
        backdropBlur: 20,
        borderColor: 0xFFFFFF,
        borderAlpha: 0.3,
        borderWidth: 1,
        shadowColor: 0x000000,
        shadowAlpha: 0.1,
        shadowOffset: { x: 0, y: 4 },
        shadowBlur: 8,
        gradient: {
            colors: [0xFFFFFF, 0xF0F0F0],
            alphas: [0.2, 0.1],
            stops: [0, 1]
        }
    },
    
    // 按钮玻璃材质
    button: {
        alpha: 0.9,
        backdropBlur: 15,
        borderColor: 0xFFFFFF,
        borderAlpha: 0.4,
        borderWidth: 1.5,
        shadowColor: 0x000000,
        shadowAlpha: 0.15,
        shadowOffset: { x: 0, y: 2 },
        shadowBlur: 6,
        gradient: {
            colors: [0xFFFFFF, 0xE8E8E8],
            alphas: [0.3, 0.15],
            stops: [0, 1]
        }
    },

    // 消息气泡玻璃材质
    bubble: {
        alpha: 0.88,
        backdropBlur: 25,
        borderColor: 0xFFFFFF,
        borderAlpha: 0.25,
        borderWidth: 1,
        shadowColor: 0x000000,
        shadowAlpha: 0.12,
        shadowOffset: { x: 0, y: 6 },
        shadowBlur: 12,
        gradient: {
            colors: [0xFFFFFF, 0xF5F5F5],
            alphas: [0.25, 0.08],
            stops: [0, 1]
        }
    }
};

// UI组件基类
class BaseUIComponent extends PIXI.Container {
    constructor(options = {}) {
        super();
        
        this.componentName = this.constructor.name;
        this.componentId = `${this.componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 默认配置
        this.config = {
            width: 100,
            height: 40,
            glassStyle: 'default',
            interactive: true,
            responsive: true,
            debug: false,
            ...options
        };

        // 响应式配置
        this.responsiveConfig = {
            enabled: this.config.responsive,
            minWidth: 60,
            maxWidth: 800,
            scaleFactor: 1,
            breakpoints: {
                mobile: 480,
                tablet: 768,
                desktop: 1024
            }
        };

        // 事件监听器存储
        this.eventListeners = new Map();
        
        // 组件状态
        this.state = {
            isActive: false,
            isHovered: false,
            isPressed: false,
            isDisabled: false
        };

        Logger.log(this.componentName, `Component created with ID: ${this.componentId}`, this.config);
        
        this._initializeComponent();
    }

    _initializeComponent() {
        Logger.log(this.componentName, 'Initializing component');
        
        // 创建基础容器
        this._createBaseContainer();
        
        // 应用玻璃材质效果
        this._applyGlassEffect();
        
        // 设置交互
        if (this.config.interactive) {
            this._setupInteractivity();
        }
        
        // 设置响应式
        if (this.responsiveConfig.enabled) {
            this._setupResponsive();
        }
        
        Logger.log(this.componentName, 'Component initialization complete');
    }

    _createBaseContainer() {
        // 创建背景图形
        this.background = new PIXI.Graphics();
        this.addChild(this.background);
        
        // 创建边框
        this.border = new PIXI.Graphics();
        this.addChild(this.border);
        
        // 创建阴影
        this.shadow = new PIXI.Graphics();
        this.addChildAt(this.shadow, 0); // 阴影在最底层
        
        this._drawBackground();
    }

    _applyGlassEffect() {
        const glassStyle = GlassEffects[this.config.glassStyle] || GlassEffects.default;
        Logger.log(this.componentName, `Applying glass effect: ${this.config.glassStyle}`, glassStyle);
        
        this.glassStyle = glassStyle;
        this._updateGlassEffect();
    }

    _updateGlassEffect() {
        const { width, height } = this.config;
        const style = this.glassStyle;
        
        // 清除之前的绘制
        this.shadow.clear();
        this.background.clear();
        this.border.clear();
        
        // 绘制阴影
        this.shadow.beginFill(style.shadowColor, style.shadowAlpha);
        this.shadow.drawRoundedRect(
            style.shadowOffset.x,
            style.shadowOffset.y,
            width,
            height,
            8
        );
        this.shadow.endFill();
        
        // 应用模糊滤镜到阴影
        if (style.shadowBlur > 0) {
            const blurFilter = new PIXI.BlurFilter(style.shadowBlur / 4);
            this.shadow.filters = [blurFilter];
        }
        
        // 绘制渐变背景
        const gradient = this._createGradient(style.gradient);
        this.background.beginTextureFill({
            texture: gradient,
            alpha: style.alpha
        });
        this.background.drawRoundedRect(0, 0, width, height, 8);
        this.background.endFill();
        
        // 绘制边框
        this.border.lineStyle(style.borderWidth, style.borderColor, style.borderAlpha);
        this.border.drawRoundedRect(0, 0, width, height, 8);
        
        // 应用背景模糊效果（模拟毛玻璃）
        if (style.backdropBlur > 0) {
            // 注意：真正的背景模糊需要特殊处理，这里使用透明度模拟
            this.background.alpha = style.alpha;
        }
    }

    _createGradient(gradientConfig) {
        // 创建渐变纹理
        const canvas = document.createElement('canvas');
        canvas.width = this.config.width;
        canvas.height = this.config.height;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        
        gradientConfig.colors.forEach((color, index) => {
            const stop = gradientConfig.stops[index];
            const alpha = gradientConfig.alphas[index];
            const hexColor = `#${color.toString(16).padStart(6, '0')}`;
            
            // 转换为 rgba
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            
            gradient.addColorStop(stop, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        });
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        return PIXI.Texture.from(canvas);
    }

    _drawBackground() {
        this._updateGlassEffect();
    }

    _setupInteractivity() {
        Logger.log(this.componentName, 'Setting up interactivity');
        
        this.eventMode = 'static';
        this.cursor = 'pointer';
        
        // 触摸和鼠标事件
        this.on('pointerdown', this._onPointerDown.bind(this));
        this.on('pointerup', this._onPointerUp.bind(this));
        this.on('pointerover', this._onPointerOver.bind(this));
        this.on('pointerout', this._onPointerOut.bind(this));
        this.on('pointertap', this._onPointerTap.bind(this));
        
        // 触摸特定事件
        this.on('touchstart', this._onTouchStart.bind(this));
        this.on('touchend', this._onTouchEnd.bind(this));
        this.on('touchmove', this._onTouchMove.bind(this));
    }

    _setupResponsive() {
        Logger.log(this.componentName, 'Setting up responsive behavior');
        
        // 监听窗口大小变化
        if (typeof window !== 'undefined') {
            const resizeHandler = () => this._handleResize();
            window.addEventListener('resize', resizeHandler);
            this.eventListeners.set('window-resize', resizeHandler);
        }
        
        this._handleResize();
    }

    _handleResize() {
        if (!this.responsiveConfig.enabled) return;
        
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        let scaleFactor = 1;
        
        const { breakpoints } = this.responsiveConfig;
        
        if (screenWidth < breakpoints.mobile) {
            scaleFactor = 0.8;
        } else if (screenWidth < breakpoints.tablet) {
            scaleFactor = 0.9;
        } else if (screenWidth > breakpoints.desktop) {
            scaleFactor = 1.1;
        }
        
        this.responsiveConfig.scaleFactor = scaleFactor;
        this.scale.set(scaleFactor);
        
        Logger.log(this.componentName, `Responsive scale updated: ${scaleFactor}`, { screenWidth });
    }

    // 事件处理方法
    _onPointerDown(event) {
        if (this.state.isDisabled) return;
        
        this.state.isPressed = true;
        this._updateVisualState();
        this._emit('press', event);
        
        Logger.log(this.componentName, 'Pointer down', { x: event.global.x, y: event.global.y });
    }

    _onPointerUp(event) {
        if (this.state.isDisabled) return;
        
        this.state.isPressed = false;
        this._updateVisualState();
        this._emit('release', event);
        
        Logger.log(this.componentName, 'Pointer up');
    }

    _onPointerOver(event) {
        if (this.state.isDisabled) return;
        
        this.state.isHovered = true;
        this._updateVisualState();
        this._emit('hover', event);
        
        Logger.log(this.componentName, 'Pointer over');
    }

    _onPointerOut(event) {
        if (this.state.isDisabled) return;
        
        this.state.isHovered = false;
        this.state.isPressed = false;
        this._updateVisualState();
        this._emit('hoverOut', event);
        
        Logger.log(this.componentName, 'Pointer out');
    }

    _onPointerTap(event) {
        if (this.state.isDisabled) return;
        
        this._emit('tap', event);
        Logger.log(this.componentName, 'Pointer tap');
    }

    _onTouchStart(event) {
        if (this.state.isDisabled) return;
        
        this._emit('touchStart', event);
        Logger.log(this.componentName, 'Touch start', { touches: event.data.touches?.length || 1 });
    }

    _onTouchEnd(event) {
        if (this.state.isDisabled) return;
        
        this._emit('touchEnd', event);
        Logger.log(this.componentName, 'Touch end');
    }

    _onTouchMove(event) {
        if (this.state.isDisabled) return;
        
        this._emit('touchMove', event);
    }

    _updateVisualState() {
        // 根据状态更新视觉效果
        let alpha = this.glassStyle.alpha;
        
        if (this.state.isPressed) {
            alpha *= 0.8;
        } else if (this.state.isHovered) {
            alpha *= 1.1;
        }
        
        if (this.state.isDisabled) {
            alpha *= 0.5;
        }
        
        this.background.alpha = Math.min(alpha, 1);
        
        // 添加按压动画
        if (this.state.isPressed) {
            this.scale.set(this.responsiveConfig.scaleFactor * 0.95);
        } else {
            this.scale.set(this.responsiveConfig.scaleFactor);
        }
    }

    // 公共方法
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
        
        Logger.log(this.componentName, `Event listener added: ${eventType}`);
    }

    removeEventListener(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
                Logger.log(this.componentName, `Event listener removed: ${eventType}`);
            }
        }
    }

    _emit(eventType, event = null) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(callback => {
                try {
                    callback.call(this, event);
                } catch (error) {
                    Logger.error(this.componentName, `Error in event callback: ${eventType}`, error);
                }
            });
        }
    }

    setDisabled(disabled) {
        this.state.isDisabled = disabled;
        this.eventMode = disabled ? 'none' : 'static';
        this.cursor = disabled ? 'default' : 'pointer';
        this._updateVisualState();
        
        Logger.log(this.componentName, `Component ${disabled ? 'disabled' : 'enabled'}`);
    }

    resize(width, height) {
        this.config.width = width;
        this.config.height = height;
        this._drawBackground();
        
        Logger.log(this.componentName, `Component resized to ${width}x${height}`);
    }

    setGlassStyle(styleName) {
        if (GlassEffects[styleName]) {
            this.config.glassStyle = styleName;
            this._applyGlassEffect();
            Logger.log(this.componentName, `Glass style changed to: ${styleName}`);
        } else {
            Logger.warn(this.componentName, `Unknown glass style: ${styleName}`);
        }
    }

    destroy() {
        Logger.log(this.componentName, 'Destroying component');
        
        // 清理事件监听器
        if (this.eventListeners.has('window-resize')) {
            const handler = this.eventListeners.get('window-resize');
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handler);
            }
        }
        
        this.eventListeners.clear();
        
        super.destroy({ children: true });
    }
}

// Button 按钮组件
class Button extends BaseUIComponent {
    constructor(options = {}) {
        const buttonOptions = {
            width: 120,
            height: 44,
            glassStyle: 'button',
            text: 'Button',
            fontSize: 14,
            fontColor: 0x333333,
            fontWeight: 'normal',
            ...options
        };
        
        super(buttonOptions);
        
        this._createText();
    }

    _createText() {
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.config.fontSize,
            fill: this.config.fontColor,
            fontWeight: this.config.fontWeight,
            align: 'center'
        });
        
        this.textElement = new PIXI.Text(this.config.text, textStyle);
        this.textElement.anchor.set(0.5);
        this.textElement.x = this.config.width / 2;
        this.textElement.y = this.config.height / 2;
        
        this.addChild(this.textElement);
        
        Logger.log(this.componentName, `Button text created: "${this.config.text}"`);
    }

    setText(text) {
        this.config.text = text;
        this.textElement.text = text;
        Logger.log(this.componentName, `Button text updated: "${text}"`);
    }

    setTextColor(color) {
        this.config.fontColor = color;
        this.textElement.style.fill = color;
        Logger.log(this.componentName, `Button text color updated: ${color}`);
    }
}

// MessageBubble 消息气泡组件
class MessageBubble extends BaseUIComponent {
    constructor(options = {}) {
        const bubbleOptions = {
            width: 200,
            height: 60,
            glassStyle: 'bubble',
            text: 'Hello!',
            fontSize: 12,
            fontColor: 0x333333,
            padding: 12,
            alignment: 'left', // 'left', 'right', 'center'
            ...options
        };
        
        super(bubbleOptions);
        
        this._createBubbleShape();
        this._createText();
    }

    _createBubbleShape() {
        // 重写背景绘制以创建气泡形状
        this.background.clear();
        
        const { width, height } = this.config;
        const cornerRadius = Math.min(height * 0.4, 16);
        
        // 创建气泡形状（带小尾巴）
        this.background.beginFill(0xFFFFFF, this.glassStyle.alpha);
        
        // 主体圆角矩形
        this.background.drawRoundedRect(0, 0, width - 8, height, cornerRadius);
        
        // 小尾巴（三角形）
        if (this.config.alignment === 'left') {
            this.background.moveTo(width - 8, height * 0.7);
            this.background.lineTo(width, height * 0.6);
            this.background.lineTo(width - 8, height * 0.5);
        } else if (this.config.alignment === 'right') {
            this.background.moveTo(8, height * 0.7);
            this.background.lineTo(0, height * 0.6);
            this.background.lineTo(8, height * 0.5);
        }
        
        this.background.endFill();
        
        Logger.log(this.componentName, `Bubble shape created with alignment: ${this.config.alignment}`);
    }

    _createText() {
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.config.fontSize,
            fill: this.config.fontColor,
            wordWrap: true,
            wordWrapWidth: this.config.width - this.config.padding * 2 - 8,
            align: 'left'
        });
        
        this.textElement = new PIXI.Text(this.config.text, textStyle);
        this.textElement.x = this.config.padding;
        this.textElement.y = this.config.padding;
        
        this.addChild(this.textElement);
        
        Logger.log(this.componentName, `Bubble text created: "${this.config.text}"`);
    }

    setText(text) {
        this.config.text = text;
        this.textElement.text = text;
        
        // 自动调整高度
        const newHeight = this.textElement.height + this.config.padding * 2;
        if (newHeight !== this.config.height) {
            this.resize(this.config.width, newHeight);
        }
        
        Logger.log(this.componentName, `Bubble text updated: "${text}"`);
    }

    setAlignment(alignment) {
        this.config.alignment = alignment;
        this._createBubbleShape();
        Logger.log(this.componentName, `Bubble alignment changed to: ${alignment}`);
    }
}

// Avatar 头像组件
class Avatar extends BaseUIComponent {
    constructor(options = {}) {
        const avatarOptions = {
            width: 48,
            height: 48,
            glassStyle: 'default',
            imageUrl: null,
            fallbackText: 'A',
            borderWidth: 2,
            borderColor: 0xFFFFFF,
            shape: 'circle', // 'circle', 'square', 'rounded'
            ...options
        };
        
        super(avatarOptions);
        
        this._createAvatar();
    }

    _createAvatar() {
        const { width, height, shape } = this.config;
        
        // 创建头像容器
        this.avatarContainer = new PIXI.Container();
        this.addChild(this.avatarContainer);
        
        // 创建遮罩
        this.avatarMask = new PIXI.Graphics();
        this.avatarContainer.addChild(this.avatarMask);
        
        this._drawAvatarMask();
        
        if (this.config.imageUrl) {
            this._loadImage();
        } else {
            this._createFallback();
        }
        
        Logger.log(this.componentName, `Avatar created with shape: ${shape}`);
    }

    _drawAvatarMask() {
        const { width, height, shape } = this.config;
        
        this.avatarMask.clear();
        this.avatarMask.beginFill(0xFFFFFF);
        
        switch (shape) {
            case 'circle':
                this.avatarMask.drawCircle(width / 2, height / 2, Math.min(width, height) / 2);
                break;
            case 'square':
                this.avatarMask.drawRect(0, 0, width, height);
                break;
            case 'rounded':
                this.avatarMask.drawRoundedRect(0, 0, width, height, Math.min(width, height) * 0.15);
                break;
        }
        
        this.avatarMask.endFill();
        this.avatarContainer.mask = this.avatarMask;
    }

    async _loadImage() {
        try {
            Logger.log(this.componentName, `Loading avatar image: ${this.config.imageUrl}`);
            
            const texture = await PIXI.Assets.load(this.config.imageUrl);
            const sprite = new PIXI.Sprite(texture);
            
            // 调整图片大小以适应头像
            const scale = Math.max(
                this.config.width / sprite.width,
                this.config.height / sprite.height
            );
            
            sprite.scale.set(scale);
            sprite.x = (this.config.width - sprite.width) / 2;
            sprite.y = (this.config.height - sprite.height) / 2;
            
            this.avatarContainer.addChild(sprite);
            
            Logger.log(this.componentName, 'Avatar image loaded successfully');
            
        } catch (error) {
            Logger.error(this.componentName, 'Failed to load avatar image', error);
            this._createFallback();
        }
    }

    _createFallback() {
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.config.width * 0.4,
            fill: 0x666666,
            fontWeight: 'bold',
            align: 'center'
        });
        
        this.fallbackText = new PIXI.Text(this.config.fallbackText, textStyle);
        this.fallbackText.anchor.set(0.5);
        this.fallbackText.x = this.config.width / 2;
        this.fallbackText.y = this.config.height / 2;
        
        this.avatarContainer.addChild(this.fallbackText);
        
        Logger.log(this.componentName, `Avatar fallback created: "${this.config.fallbackText}"`);
    }

    setImage(imageUrl) {
        this.config.imageUrl = imageUrl;
        
        // 清除现有内容
        this.avatarContainer.removeChildren();
        this.avatarContainer.addChild(this.avatarMask);
        
        this._loadImage();
    }

    setFallbackText(text) {
        this.config.fallbackText = text;
        if (this.fallbackText) {
            this.fallbackText.text = text;
        }
    }
}

// Icon 图标组件
class Icon extends BaseUIComponent {
    constructor(options = {}) {
        const iconOptions = {
            width: 24,
            height: 24,
            glassStyle: 'default',
            iconName: 'star',
            iconColor: 0x333333,
            iconSize: 20,
            ...options
        };
        
        super(iconOptions);
        
        this._createIcon();
    }

    _createIcon() {
        this.iconGraphics = new PIXI.Graphics();
        this.addChild(this.iconGraphics);
        
        this._drawIcon();
        
        Logger.log(this.componentName, `Icon created: ${this.config.iconName}`);
    }

    _drawIcon() {
        const { width, height, iconColor, iconSize } = this.config;
        const centerX = width / 2;
        const centerY = height / 2;
        const size = iconSize / 2;
        
        this.iconGraphics.clear();
        this.iconGraphics.lineStyle(2, iconColor, 1);
        this.iconGraphics.beginFill(iconColor, 0.1);
        
        switch (this.config.iconName) {
            case 'star':
                this._drawStar(centerX, centerY, size);
                break;
            case 'heart':
                this._drawHeart(centerX, centerY, size);
                break;
            case 'check':
                this._drawCheck(centerX, centerY, size);
                break;
            case 'close':
                this._drawClose(centerX, centerY, size);
                break;
            case 'arrow':
                this._drawArrow(centerX, centerY, size);
                break;
            default:
                this._drawCircle(centerX, centerY, size);
        }
        
        this.iconGraphics.endFill();
    }

    _drawStar(x, y, size) {
        const points = [];
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const outerX = x + Math.cos(angle) * size;
            const outerY = y + Math.sin(angle) * size;
            points.push(outerX, outerY);
            
            const innerAngle = angle + Math.PI / 5;
            const innerX = x + Math.cos(innerAngle) * size * 0.5;
            const innerY = y + Math.sin(innerAngle) * size * 0.5;
            points.push(innerX, innerY);
        }
        
        this.iconGraphics.drawPolygon(points);
    }

    _drawHeart(x, y, size) {
        this.iconGraphics.moveTo(x, y + size * 0.3);
        this.iconGraphics.bezierCurveTo(
            x - size, y - size * 0.3,
            x - size, y - size * 0.8,
            x, y - size * 0.2
        );
        this.iconGraphics.bezierCurveTo(
            x + size, y - size * 0.8,
            x + size, y - size * 0.3,
            x, y + size * 0.3
        );
    }

    _drawCheck(x, y, size) {
        this.iconGraphics.moveTo(x - size * 0.5, y);
        this.iconGraphics.lineTo(x - size * 0.1, y + size * 0.4);
        this.iconGraphics.lineTo(x + size * 0.5, y - size * 0.4);
    }

    _drawClose(x, y, size) {
        this.iconGraphics.moveTo(x - size * 0.5, y - size * 0.5);
        this.iconGraphics.lineTo(x + size * 0.5, y + size * 0.5);
        this.iconGraphics.moveTo(x + size * 0.5, y - size * 0.5);
        this.iconGraphics.lineTo(x - size * 0.5, y + size * 0.5);
    }

    _drawArrow(x, y, size) {
        this.iconGraphics.moveTo(x - size * 0.5, y);
        this.iconGraphics.lineTo(x + size * 0.3, y);
        this.iconGraphics.lineTo(x, y - size * 0.4);
        this.iconGraphics.moveTo(x + size * 0.3, y);
        this.iconGraphics.lineTo(x, y + size * 0.4);
    }

    _drawCircle(x, y, size) {
        this.iconGraphics.drawCircle(x, y, size);
    }

    setIcon(iconName) {
        this.config.iconName = iconName;
        this._drawIcon();
        Logger.log(this.componentName, `Icon changed to: ${iconName}`);
    }

    setColor(color) {
        this.config.iconColor = color;
        this._drawIcon();
        Logger.log(this.componentName, `Icon color changed to: ${color}`);
    }
}

// TextInput 输入框组件
class TextInput extends BaseUIComponent {
    constructor(options = {}) {
        const inputOptions = {
            width: 200,
            height: 36,
            glassStyle: 'default',
            placeholder: 'Enter text...',
            text: '',
            fontSize: 14,
            fontColor: 0x333333,
            placeholderColor: 0x999999,
            padding: 8,
            multiline: false,
            maxLength: 100,
            ...options
        };
        
        super(inputOptions);
        
        this._createInput();
        this._setupInputEvents();
    }

    _createInput() {
        // 创建文本显示
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.config.fontSize,
            fill: this.config.fontColor,
            align: 'left'
        });
        
        this.textDisplay = new PIXI.Text('', textStyle);
        this.textDisplay.x = this.config.padding;
        this.textDisplay.y = this.config.padding;
        this.addChild(this.textDisplay);
        
        // 创建占位符文本
        const placeholderStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: this.config.fontSize,
            fill: this.config.placeholderColor,
            align: 'left'
        });
        
        this.placeholderDisplay = new PIXI.Text(this.config.placeholder, placeholderStyle);
        this.placeholderDisplay.x = this.config.padding;
        this.placeholderDisplay.y = this.config.padding;
        this.addChild(this.placeholderDisplay);
        
        // 创建光标
        this.cursor = new PIXI.Graphics();
        this.cursor.lineStyle(1, this.config.fontColor);
        this.cursor.moveTo(0, 0);
        this.cursor.lineTo(0, this.config.fontSize);
        this.cursor.x = this.config.padding;
        this.cursor.y = this.config.padding;
        this.cursor.visible = false;
        this.addChild(this.cursor);
        
        // 创建隐藏的HTML输入框用于实际输入
        if (typeof document !== 'undefined') {
            this.hiddenInput = document.createElement(this.config.multiline ? 'textarea' : 'input');
            this.hiddenInput.style.position = 'absolute';
            this.hiddenInput.style.left = '-9999px';
            this.hiddenInput.style.opacity = '0';
            document.body.appendChild(this.hiddenInput);
        }
        
        this._updateDisplay();
        
        Logger.log(this.componentName, 'Text input created');
    }

    _setupInputEvents() {
        this.isFocused = false;
        
        this.addEventListener('tap', () => {
            this._focus();
        });
        
        if (this.hiddenInput) {
            this.hiddenInput.addEventListener('input', (e) => {
                this._handleInput(e.target.value);
            });
            
            this.hiddenInput.addEventListener('blur', () => {
                this._blur();
            });
            
            this.hiddenInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.config.multiline) {
                    this._emit('submit', { text: this.config.text });
                    this._blur();
                }
            });
        }
    }

    _focus() {
        if (this.isFocused) return;
        
        this.isFocused = true;
        this.cursor.visible = true;
        
        if (this.hiddenInput) {
            this.hiddenInput.value = this.config.text;
            this.hiddenInput.focus();
        }
        
        // 光标闪烁动画
        this._startCursorBlink();
        
        this._emit('focus');
        Logger.log(this.componentName, 'Input focused');
    }

    _blur() {
        if (!this.isFocused) return;
        
        this.isFocused = false;
        this.cursor.visible = false;
        
        this._stopCursorBlink();
        
        this._emit('blur');
        Logger.log(this.componentName, 'Input blurred');
    }

    _handleInput(value) {
        if (this.config.maxLength && value.length > this.config.maxLength) {
            value = value.substring(0, this.config.maxLength);
            if (this.hiddenInput) {
                this.hiddenInput.value = value;
            }
        }
        
        this.config.text = value;
        this._updateDisplay();
        this._updateCursorPosition();
        
        this._emit('input', { text: value });
        Logger.log(this.componentName, `Input text changed: "${value}"`);
    }

    _updateDisplay() {
        if (this.config.text) {
            this.textDisplay.text = this.config.text;
            this.textDisplay.visible = true;
            this.placeholderDisplay.visible = false;
        } else {
            this.textDisplay.visible = false;
            this.placeholderDisplay.visible = true;
        }
    }

    _updateCursorPosition() {
        if (this.textDisplay.visible) {
            this.cursor.x = this.config.padding + this.textDisplay.width;
        } else {
            this.cursor.x = this.config.padding;
        }
    }

    _startCursorBlink() {
        this._stopCursorBlink();
        this.cursorBlinkInterval = setInterval(() => {
            this.cursor.visible = !this.cursor.visible;
        }, 500);
    }

    _stopCursorBlink() {
        if (this.cursorBlinkInterval) {
            clearInterval(this.cursorBlinkInterval);
            this.cursorBlinkInterval = null;
        }
    }

    getText() {
        return this.config.text;
    }

    setText(text) {
        this.config.text = text;
        if (this.hiddenInput) {
            this.hiddenInput.value = text;
        }
        this._updateDisplay();
        this._updateCursorPosition();
    }

    setPlaceholder(placeholder) {
        this.config.placeholder = placeholder;
        this.placeholderDisplay.text = placeholder;
    }

    destroy() {
        this._stopCursorBlink();
        
        if (this.hiddenInput && this.hiddenInput.parentNode) {
            this.hiddenInput.parentNode.removeChild(this.hiddenInput);
        }
        
        super.destroy();
    }
}

// ScrollContainer 滚动容器组件
class ScrollContainer extends BaseUIComponent {
    constructor(options = {}) {
        const scrollOptions = {
            width: 300,
            height: 200,
            glassStyle: 'default',
            contentWidth: 300,
            contentHeight: 400,
            scrollbarWidth: 8,
            scrollbarColor: 0x888888,
            scrollbarAlpha: 0.7,
            scrollSpeed: 20,
            enableVerticalScroll: true,
            enableHorizontalScroll: false,
            ...options
        };
        
        super(scrollOptions);
        
        this._createScrollContainer();
        this._setupScrolling();
    }

    _createScrollContainer() {
        // 创建内容容器
        this.contentContainer = new PIXI.Container();
        this.addChild(this.contentContainer);
        
        // 创建遮罩以裁剪内容
        this.contentMask = new PIXI.Graphics();
        this.contentMask.beginFill(0xFFFFFF);
        this.contentMask.drawRect(0, 0, this.config.width, this.config.height);
        this.contentMask.endFill();
        this.addChild(this.contentMask);
        this.contentContainer.mask = this.contentMask;
        
        // 创建滚动条
        if (this.config.enableVerticalScroll) {
            this._createVerticalScrollbar();
        }
        
        if (this.config.enableHorizontalScroll) {
            this._createHorizontalScrollbar();
        }
        
        // 滚动状态
        this.scrollState = {
            x: 0,
            y: 0,
            maxScrollX: Math.max(0, this.config.contentWidth - this.config.width),
            maxScrollY: Math.max(0, this.config.contentHeight - this.config.height),
            isDragging: false,
            lastPointerPosition: { x: 0, y: 0 }
        };
        
        Logger.log(this.componentName, 'Scroll container created', {
            contentSize: `${this.config.contentWidth}x${this.config.contentHeight}`,
            viewSize: `${this.config.width}x${this.config.height}`,
            maxScroll: `${this.scrollState.maxScrollX}x${this.scrollState.maxScrollY}`
        });
    }

    _createVerticalScrollbar() {
        const scrollbarX = this.config.width - this.config.scrollbarWidth;
        const scrollbarHeight = this.config.height;
        const thumbHeight = Math.max(20, (this.config.height / this.config.contentHeight) * scrollbarHeight);
        
        // 滚动条轨道
        this.vScrollTrack = new PIXI.Graphics();
        this.vScrollTrack.beginFill(0x000000, 0.1);
        this.vScrollTrack.drawRect(scrollbarX, 0, this.config.scrollbarWidth, scrollbarHeight);
        this.vScrollTrack.endFill();
        this.addChild(this.vScrollTrack);
        
        // 滚动条滑块
        this.vScrollThumb = new PIXI.Graphics();
        this.vScrollThumb.beginFill(this.config.scrollbarColor, this.config.scrollbarAlpha);
        this.vScrollThumb.drawRoundedRect(scrollbarX + 1, 0, this.config.scrollbarWidth - 2, thumbHeight, 3);
        this.vScrollThumb.endFill();
        this.vScrollThumb.eventMode = 'static';
        this.vScrollThumb.cursor = 'pointer';
        this.addChild(this.vScrollThumb);
        
        this.vScrollbarConfig = {
            trackHeight: scrollbarHeight,
            thumbHeight: thumbHeight,
            x: scrollbarX
        };
    }

    _createHorizontalScrollbar() {
        const scrollbarY = this.config.height - this.config.scrollbarWidth;
        const scrollbarWidth = this.config.width;
        const thumbWidth = Math.max(20, (this.config.width / this.config.contentWidth) * scrollbarWidth);
        
        // 滚动条轨道
        this.hScrollTrack = new PIXI.Graphics();
        this.hScrollTrack.beginFill(0x000000, 0.1);
        this.hScrollTrack.drawRect(0, scrollbarY, scrollbarWidth, this.config.scrollbarWidth);
        this.hScrollTrack.endFill();
        this.addChild(this.hScrollTrack);
        
        // 滚动条滑块
        this.hScrollThumb = new PIXI.Graphics();
        this.hScrollThumb.beginFill(this.config.scrollbarColor, this.config.scrollbarAlpha);
        this.hScrollThumb.drawRoundedRect(0, scrollbarY + 1, thumbWidth, this.config.scrollbarWidth - 2, 3);
        this.hScrollThumb.endFill();
        this.hScrollThumb.eventMode = 'static';
        this.hScrollThumb.cursor = 'pointer';
        this.addChild(this.hScrollThumb);
        
        this.hScrollbarConfig = {
            trackWidth: scrollbarWidth,
            thumbWidth: thumbWidth,
            y: scrollbarY
        };
    }

    _setupScrolling() {
        // 内容区域滚动事件
        this.contentContainer.eventMode = 'static';
        this.contentContainer.on('wheel', this._onWheel.bind(this));
        this.contentContainer.on('pointerdown', this._onScrollStart.bind(this));
        this.contentContainer.on('pointermove', this._onScrollMove.bind(this));
        this.contentContainer.on('pointerup', this._onScrollEnd.bind(this));
        this.contentContainer.on('pointerupoutside', this._onScrollEnd.bind(this));
        
        // 滚动条事件
        if (this.vScrollThumb) {
            this.vScrollThumb.on('pointerdown', this._onVScrollStart.bind(this));
        }
        
        if (this.hScrollThumb) {
            this.hScrollThumb.on('pointerdown', this._onHScrollStart.bind(this));
        }
    }

    _onWheel(event) {
        if (!this.config.enableVerticalScroll && !this.config.enableHorizontalScroll) return;
        
        const delta = event.deltaY || event.detail || (-event.wheelDelta);
        
        if (this.config.enableVerticalScroll) {
            this._scrollBy(0, delta);
        } else if (this.config.enableHorizontalScroll) {
            this._scrollBy(delta, 0);
        }
        
        event.preventDefault();
    }

    _onScrollStart(event) {
        this.scrollState.isDragging = true;
        this.scrollState.lastPointerPosition = {
            x: event.global.x,
            y: event.global.y
        };
        
        Logger.log(this.componentName, 'Scroll drag started');
    }

    _onScrollMove(event) {
        if (!this.scrollState.isDragging) return;
        
        const deltaX = this.scrollState.lastPointerPosition.x - event.global.x;
        const deltaY = this.scrollState.lastPointerPosition.y - event.global.y;
        
        this._scrollBy(deltaX, deltaY);
        
        this.scrollState.lastPointerPosition = {
            x: event.global.x,
            y: event.global.y
        };
    }

    _onScrollEnd(event) {
        this.scrollState.isDragging = false;
        Logger.log(this.componentName, 'Scroll drag ended');
    }

    _onVScrollStart(event) {
        // 垂直滚动条拖拽逻辑
        this.vScrollState = {
            isDragging: true,
            startY: event.global.y,
            startScrollY: this.scrollState.y
        };
    }

    _onHScrollStart(event) {
        // 水平滚动条拖拽逻辑
        this.hScrollState = {
            isDragging: true,
            startX: event.global.x,
            startScrollX: this.scrollState.x
        };
    }

    _scrollBy(deltaX, deltaY) {
        let newScrollX = this.scrollState.x;
        let newScrollY = this.scrollState.y;
        
        if (this.config.enableHorizontalScroll) {
            newScrollX = Math.max(0, Math.min(this.scrollState.maxScrollX, this.scrollState.x + deltaX));
        }
        
        if (this.config.enableVerticalScroll) {
            newScrollY = Math.max(0, Math.min(this.scrollState.maxScrollY, this.scrollState.y + deltaY));
        }
        
        this._scrollTo(newScrollX, newScrollY);
    }

    _scrollTo(x, y) {
        this.scrollState.x = x;
        this.scrollState.y = y;
        
        // 更新内容位置
        this.contentContainer.x = -x;
        this.contentContainer.y = -y;
        
        // 更新滚动条位置
        this._updateScrollbars();
        
        this._emit('scroll', { x, y });
        
        // Logger.log(this.componentName, `Scrolled to: ${x}, ${y}`);
    }

    _updateScrollbars() {
        // 更新垂直滚动条
        if (this.vScrollThumb && this.vScrollbarConfig) {
            const progress = this.scrollState.y / this.scrollState.maxScrollY;
            const maxThumbY = this.vScrollbarConfig.trackHeight - this.vScrollbarConfig.thumbHeight;
            this.vScrollThumb.y = progress * maxThumbY;
        }
        
        // 更新水平滚动条
        if (this.hScrollThumb && this.hScrollbarConfig) {
            const progress = this.scrollState.x / this.scrollState.maxScrollX;
            const maxThumbX = this.hScrollbarConfig.trackWidth - this.hScrollbarConfig.thumbWidth;
            this.hScrollThumb.x = progress * maxThumbX;
        }
    }

    // 公共方法
    addContent(child) {
        this.contentContainer.addChild(child);
        Logger.log(this.componentName, 'Content added to scroll container');
    }

    removeContent(child) {
        this.contentContainer.removeChild(child);
        Logger.log(this.componentName, 'Content removed from scroll container');
    }

    scrollToTop() {
        this._scrollTo(this.scrollState.x, 0);
    }

    scrollToBottom() {
        this._scrollTo(this.scrollState.x, this.scrollState.maxScrollY);
    }

    scrollToLeft() {
        this._scrollTo(0, this.scrollState.y);
    }

    scrollToRight() {
        this._scrollTo(this.scrollState.maxScrollX, this.scrollState.y);
    }

    setContentSize(width, height) {
        this.config.contentWidth = width;
        this.config.contentHeight = height;
        
        this.scrollState.maxScrollX = Math.max(0, width - this.config.width);
        this.scrollState.maxScrollY = Math.max(0, height - this.config.height);
        
        // 重新创建滚动条
        if (this.vScrollThumb) {
            this.removeChild(this.vScrollThumb);
            this.removeChild(this.vScrollTrack);
        }
        
        if (this.hScrollThumb) {
            this.removeChild(this.hScrollThumb);
            this.removeChild(this.hScrollTrack);
        }
        
        if (this.config.enableVerticalScroll) {
            this._createVerticalScrollbar();
        }
        
        if (this.config.enableHorizontalScroll) {
            this._createHorizontalScrollbar();
        }
        
        Logger.log(this.componentName, `Content size updated: ${width}x${height}`);
    }
}

// 导出所有组件
export {
    Logger,
    GlassEffects,
    BaseUIComponent,
    Button,
    MessageBubble,
    Avatar,
    Icon,
    TextInput,
    ScrollContainer
};

// 组件工厂函数
export const createUIComponent = (type, options = {}) => {
    const componentMap = {
        'button': Button,
        'messageBubble': MessageBubble,
        'avatar': Avatar,
        'icon': Icon,
        'textInput': TextInput,
        'scrollContainer': ScrollContainer
    };
    
    const ComponentClass = componentMap[type];
    if (!ComponentClass) {
        Logger.error('ComponentFactory', `Unknown component type: ${type}`);
        return null;
    }
    
    Logger.log('ComponentFactory', `Creating component: ${type}`, options);
    return new ComponentClass(options);
};

// 组件库版本信息
export const VERSION = '1.0.0';
export const LIBRARY_NAME = 'PIXI.js v8 Vision UI Components';

Logger.log('UIComponents', `${LIBRARY_NAME} v${VERSION} loaded successfully`);