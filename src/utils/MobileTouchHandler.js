/**
 * 通用移动端触摸处理系统
 * 基于 pixi-connection-fixed.html 的成功实现
 * 支持：触摸滚动、惯性、多区域检测、防冲突
 */

class MobileTouchHandler {
    constructor(app, options = {}) {
        this.app = app;
        this.canvas = app.canvas;
        
        // 配置选项
        this.options = {
            enableLogging: true,
            velocityDecay: 0.95,
            minVelocity: 0.1,
            maxVelocity: 50,
            scrollSensitivity: 1.0,
            bounceEffect: true,
            ...options
        };
        
        // 触摸状态
        this.touchState = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            lastX: 0,
            lastY: 0,
            velocityX: 0,
            velocityY: 0,
            timestamp: 0,
            target: null,
            pointerType: 'unknown'
        };
        
        // 滚动区域配置
        this.scrollAreas = new Map();
        
        // 惯性动画
        this.inertiaAnimation = null;
        
        this.init();
    }
    
    init() {
        this.log('📱 初始化移动端触摸处理器...');
        
        // 设置 CSS 样式
        this.setupMobileCSS();
        
        // 绑定事件
        this.bindEvents();
        
        this.log('✅ 移动端触摸处理器初始化完成');
    }
    
    setupMobileCSS() {
        // 确保 canvas 和容器有正确的移动端样式
        const style = document.createElement('style');
        style.textContent = `
            /* 移动端触摸优化 */
            body {
                touch-action: pan-y;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                overflow: hidden;
            }
            
            canvas {
                touch-action: pan-y;
                -webkit-touch-callout: none;
                user-select: none;
            }
            
            .mobile-touch-active {
                touch-action: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        const canvas = this.canvas;
        
        // 触摸事件
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        
        // 鼠标事件（用于开发测试）
        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: false });
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: false });
        canvas.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: false });
        canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // 防止默认滚动行为
        document.addEventListener('touchmove', (e) => {
            if (this.touchState.active) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 页面离开时清理
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        this.startTouch(touch.clientX, touch.clientY, 'touch');
        
        // 阻止页面滚动
        document.body.classList.add('mobile-touch-active');
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.touchState.active) return;
        
        const touch = e.touches[0];
        this.moveTouch(touch.clientX, touch.clientY);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.endTouch();
        
        // 恢复页面滚动
        document.body.classList.remove('mobile-touch-active');
    }
    
    handleMouseDown(e) {
        e.preventDefault();
        this.startTouch(e.clientX, e.clientY, 'mouse');
    }
    
    handleMouseMove(e) {
        if (!this.touchState.active) return;
        e.preventDefault();
        this.moveTouch(e.clientX, e.clientY);
    }
    
    handleMouseUp(e) {
        e.preventDefault();
        this.endTouch();
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const area = this.detectScrollArea(e.clientX, e.clientY);
        if (area) {
            this.applyScroll(area, -e.deltaY * 0.5, -e.deltaY * 0.1);
        }
    }
    
    startTouch(x, y, type) {
        // 停止当前惯性动画
        if (this.inertiaAnimation) {
            cancelAnimationFrame(this.inertiaAnimation);
            this.inertiaAnimation = null;
        }
        
        const now = Date.now();
        const area = this.detectScrollArea(x, y);
        
        this.touchState = {
            active: true,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
            lastX: x,
            lastY: y,
            velocityX: 0,
            velocityY: 0,
            timestamp: now,
            target: area,
            pointerType: type
        };
        
        this.log('👆 触摸开始', { 
            area: area?.name || 'none', 
            pos: `(${x}, ${y})`, 
            type 
        });
    }
    
    moveTouch(x, y) {
        if (!this.touchState.active) return;
        
        const now = Date.now();
        const deltaTime = now - this.touchState.timestamp;
        
        if (deltaTime > 0) {
            const deltaX = x - this.touchState.lastX;
            const deltaY = y - this.touchState.lastY;
            
            // 计算速度 (pixels per second, converted to 60fps)
            this.touchState.velocityX = (deltaX / deltaTime) * 16.67;
            this.touchState.velocityY = (deltaY / deltaTime) * 16.67;
            
            // 限制速度
            this.touchState.velocityX = Math.max(-this.options.maxVelocity, 
                Math.min(this.options.maxVelocity, this.touchState.velocityX));
            this.touchState.velocityY = Math.max(-this.options.maxVelocity, 
                Math.min(this.options.maxVelocity, this.touchState.velocityY));
            
            // 应用滚动
            if (this.touchState.target && Math.abs(deltaY) > 1) {
                this.applyScroll(this.touchState.target, deltaY, this.touchState.velocityY);
            }
            
            // 更新状态
            this.touchState.currentX = x;
            this.touchState.currentY = y;
            this.touchState.lastX = x;
            this.touchState.lastY = y;
            this.touchState.timestamp = now;
        }
    }
    
    endTouch() {
        if (!this.touchState.active) return;
        
        this.log('👆 触摸结束', { 
            velocity: `(${this.touchState.velocityX.toFixed(2)}, ${this.touchState.velocityY.toFixed(2)})`,
            area: this.touchState.target?.name || 'none'
        });
        
        // 启动惯性滚动
        if (this.touchState.target && Math.abs(this.touchState.velocityY) > this.options.minVelocity) {
            this.startInertia(this.touchState.target, this.touchState.velocityY);
        }
        
        this.touchState.active = false;
    }
    
    startInertia(area, initialVelocity) {
        let velocity = initialVelocity;
        
        const animate = () => {
            if (Math.abs(velocity) < this.options.minVelocity) {
                this.inertiaAnimation = null;
                return;
            }
            
            // 应用惯性滚动
            this.applyScroll(area, velocity, velocity);
            
            // 衰减速度
            velocity *= this.options.velocityDecay;
            
            this.inertiaAnimation = requestAnimationFrame(animate);
        };
        
        this.inertiaAnimation = requestAnimationFrame(animate);
    }
    
    // 注册滚动区域
    registerScrollArea(name, config) {
        this.scrollAreas.set(name, {
            name,
            bounds: config.bounds, // { x, y, width, height }
            container: config.container, // PixiJS Container
            scrollState: { x: 0, y: 0, velocityX: 0, velocityY: 0 },
            bounds: config.scrollBounds || null, // { minY, maxY }
            onScroll: config.onScroll || null,
            ...config
        });
        
        this.log('📍 注册滚动区域', { name, bounds: config.bounds });
    }
    
    // 检测滚动区域
    detectScrollArea(x, y) {
        for (const [name, area] of this.scrollAreas) {
            const bounds = area.bounds;
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return area;
            }
        }
        return null;
    }
    
    // 应用滚动
    applyScroll(area, deltaY, velocity) {
        if (!area || !area.container) return;
        
        const scrollState = area.scrollState;
        const container = area.container;
        
        // 更新滚动位置
        scrollState.y += deltaY * this.options.scrollSensitivity;
        scrollState.velocityY = velocity;
        
        // 边界检查
        if (area.scrollBounds) {
            const { minY, maxY } = area.scrollBounds;
            if (scrollState.y < minY) {
                scrollState.y = this.options.bounceEffect ? minY - (minY - scrollState.y) * 0.3 : minY;
                scrollState.velocityY *= -0.3; // 反弹
            } else if (scrollState.y > maxY) {
                scrollState.y = this.options.bounceEffect ? maxY + (scrollState.y - maxY) * 0.3 : maxY;
                scrollState.velocityY *= -0.3; // 反弹
            }
        }
        
        // 应用到容器
        container.y = scrollState.y;
        
        // 调用回调
        if (area.onScroll) {
            area.onScroll(scrollState, deltaY, velocity);
        }
        
        this.log('📜 滚动', { 
            area: area.name, 
            y: scrollState.y.toFixed(1), 
            velocity: velocity.toFixed(2) 
        });
    }
    
    // 获取滚动状态
    getScrollState(areaName) {
        const area = this.scrollAreas.get(areaName);
        return area ? area.scrollState : null;
    }
    
    // 设置滚动位置
    setScrollPosition(areaName, x, y) {
        const area = this.scrollAreas.get(areaName);
        if (area) {
            area.scrollState.x = x;
            area.scrollState.y = y;
            if (area.container) {
                area.container.x = x;
                area.container.y = y;
            }
        }
    }
    
    // 滚动到指定位置
    scrollTo(areaName, targetY, duration = 300) {
        const area = this.scrollAreas.get(areaName);
        if (!area) return;
        
        const startY = area.scrollState.y;
        const deltaY = targetY - startY;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用 easeOutCubic 缓动
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentY = startY + deltaY * easedProgress;
            
            this.setScrollPosition(areaName, area.scrollState.x, currentY);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // 日志
    log(message, data = null) {
        if (!this.options.enableLogging) return;
        
        const timestamp = new Date().toLocaleTimeString();
        if (data) {
            console.log(`[${timestamp}] 🎮 MobileTouchHandler: ${message}`, data);
        } else {
            console.log(`[${timestamp}] 🎮 MobileTouchHandler: ${message}`);
        }
    }
    
    // 销毁
    destroy() {
        // 取消动画
        if (this.inertiaAnimation) {
            cancelAnimationFrame(this.inertiaAnimation);
        }
        
        // 移除事件监听器
        const canvas = this.canvas;
        canvas.removeEventListener('touchstart', this.handleTouchStart);
        canvas.removeEventListener('touchmove', this.handleTouchMove);
        canvas.removeEventListener('touchend', this.handleTouchEnd);
        canvas.removeEventListener('touchcancel', this.handleTouchEnd);
        canvas.removeEventListener('mousedown', this.handleMouseDown);
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        canvas.removeEventListener('mouseup', this.handleMouseUp);
        canvas.removeEventListener('wheel', this.handleWheel);
        
        // 清理状态
        this.scrollAreas.clear();
        this.touchState.active = false;
        
        this.log('🗑️ 触摸处理器已销毁');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileTouchHandler;
} else {
    window.MobileTouchHandler = MobileTouchHandler;
}