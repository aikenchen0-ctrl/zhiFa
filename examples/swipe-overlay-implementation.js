/**
 * 移动端滑动蒙层组件 - 完整实现示例
 * 支持多种手势库和动画方案的适配器模式
 */

// 基础配置常量
const DEFAULT_CONFIG = {
  threshold: 50,        // 触发阈值(px)
  velocity: 0.3,        // 最小速度要求
  duration: 300,        // 动画持续时间(ms)
  elastic: true,        // 是否启用弹性效果
  dampening: 0.8,       // 阻尼系数
  maxOffset: 320        // 最大偏移量
};

// 手势状态枚举
const GESTURE_STATE = {
  IDLE: 'idle',
  TRACKING: 'tracking',
  ANIMATING: 'animating'
};

// 蒙层状态枚举
const OVERLAY_STATE = {
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded',
  TRANSITIONING: 'transitioning'
};

/**
 * 滑动蒙层核心类
 */
class SwipeOverlay {
  constructor(element, options = {}) {
    this.element = element;
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    // 状态管理
    this.gestureState = GESTURE_STATE.IDLE;
    this.overlayState = OVERLAY_STATE.COLLAPSED;
    
    // 手势追踪数据
    this.startX = 0;
    this.currentX = 0;
    this.startTime = 0;
    this.lastMoveTime = 0;
    
    // 性能优化
    this.rafId = null;
    this.isSupportsPassive = this.detectPassiveSupport();
    
    this.initialize();
  }
  
  /**
   * 检测浏览器是否支持passive events
   */
  detectPassiveSupport() {
    let supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() { supportsPassive = true; }
      });
      window.addEventListener('testPassive', null, opts);
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {}
    return supportsPassive;
  }
  
  /**
   * 初始化组件
   */
  initialize() {
    this.setupStyles();
    this.bindEvents();
    this.initializeHammer(); // 可选：使用Hammer.js
  }
  
  /**
   * 设置基础CSS样式
   */
  setupStyles() {
    const styles = {
      transform: 'translateZ(0)', // 强制GPU加速
      transition: 'none',
      willChange: 'transform',
      touchAction: 'pan-y' // 允许垂直滚动，阻止水平滚动
    };
    
    Object.assign(this.element.style, styles);
  }
  
  /**
   * 绑定原生Touch Events
   */
  bindEvents() {
    const passiveOption = this.isSupportsPassive ? { passive: false } : false;
    const passiveMoveOption = this.isSupportsPassive ? { passive: true } : false;
    
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), passiveOption);
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), passiveMoveOption);
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), passiveMoveOption);
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), passiveMoveOption);
  }
  
  /**
   * 初始化Hammer.js (可选)
   */
  initializeHammer() {
    if (typeof Hammer === 'undefined') return;
    
    this.hammer = new Hammer(this.element, {
      touchAction: 'pan-y',
      recognizers: [
        [Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL }]
      ]
    });
    
    this.hammer.on('panstart', this.handlePanStart.bind(this));
    this.hammer.on('panmove', this.handlePanMove.bind(this));
    this.hammer.on('panend', this.handlePanEnd.bind(this));
  }
  
  /**
   * Touch Events处理器
   */
  handleTouchStart(event) {
    if (this.gestureState === GESTURE_STATE.ANIMATING) return;
    
    this.gestureState = GESTURE_STATE.TRACKING;
    this.startX = event.touches[0].clientX;
    this.currentX = this.startX;
    this.startTime = Date.now();
    
    // 停止当前动画
    this.element.style.transition = 'none';
  }
  
  handleTouchMove(event) {
    if (this.gestureState !== GESTURE_STATE.TRACKING) return;
    
    this.currentX = event.touches[0].clientX;
    this.lastMoveTime = Date.now();
    
    // 使用RAF优化性能
    if (this.rafId) return;
    
    this.rafId = requestAnimationFrame(() => {
      this.updatePosition();
      this.rafId = null;
    });
  }
  
  handleTouchEnd(event) {
    if (this.gestureState !== GESTURE_STATE.TRACKING) return;
    
    this.gestureState = GESTURE_STATE.IDLE;
    
    const deltaX = this.currentX - this.startX;
    const duration = this.lastMoveTime - this.startTime;
    const velocity = Math.abs(deltaX) / duration;
    
    this.decideAction(deltaX, velocity);
  }
  
  handleTouchCancel(event) {
    this.gestureState = GESTURE_STATE.IDLE;
    this.resetPosition();
  }
  
  /**
   * Hammer.js处理器
   */
  handlePanStart(event) {
    this.handleTouchStart({
      touches: [{ clientX: event.center.x }]
    });
  }
  
  handlePanMove(event) {
    this.currentX = event.center.x;
    this.updatePosition();
  }
  
  handlePanEnd(event) {
    const deltaX = event.deltaX;
    const velocity = Math.abs(event.velocityX);
    this.decideAction(deltaX, velocity);
  }
  
  /**
   * 更新位置 - 实时跟手效果
   */
  updatePosition() {
    const deltaX = this.currentX - this.startX;
    let offset = deltaX;
    
    // 应用弹性效果
    if (this.config.elastic) {
      const resistance = 0.6;
      
      if (this.overlayState === OVERLAY_STATE.COLLAPSED && deltaX < 0) {
        offset = deltaX * resistance;
      } else if (this.overlayState === OVERLAY_STATE.EXPANDED && deltaX > 0) {
        offset = deltaX * resistance;
      }
    }
    
    // 限制最大偏移
    const maxOffset = this.config.maxOffset;
    offset = Math.max(-maxOffset, Math.min(maxOffset, offset));
    
    // 应用变换
    const currentTransform = this.overlayState === OVERLAY_STATE.EXPANDED ? 0 : -this.config.maxOffset;
    const newTransform = currentTransform + offset;
    
    this.element.style.transform = `translateX(${newTransform}px) translateZ(0)`;
  }
  
  /**
   * 决定展开/收缩操作
   */
  decideAction(deltaX, velocity) {
    const threshold = this.config.threshold;
    const minVelocity = this.config.velocity;
    
    let shouldExpand = false;
    
    if (this.overlayState === OVERLAY_STATE.COLLAPSED) {
      // 当前收缩状态，判断是否展开
      shouldExpand = deltaX > threshold || velocity > minVelocity;
    } else if (this.overlayState === OVERLAY_STATE.EXPANDED) {
      // 当前展开状态，判断是否收缩
      shouldExpand = !(deltaX < -threshold || velocity > minVelocity);
    }
    
    if (shouldExpand && this.overlayState !== OVERLAY_STATE.EXPANDED) {
      this.expand();
    } else if (!shouldExpand && this.overlayState !== OVERLAY_STATE.COLLAPSED) {
      this.collapse();
    } else {
      this.resetPosition();
    }
  }
  
  /**
   * 展开蒙层
   */
  expand() {
    if (this.overlayState === OVERLAY_STATE.EXPANDED) return;
    
    this.overlayState = OVERLAY_STATE.TRANSITIONING;
    this.gestureState = GESTURE_STATE.ANIMATING;
    
    // CSS过渡动画
    this.element.style.transition = `transform ${this.config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    this.element.style.transform = 'translateX(0) translateZ(0)';
    
    // 动画完成回调
    setTimeout(() => {
      this.overlayState = OVERLAY_STATE.EXPANDED;
      this.gestureState = GESTURE_STATE.IDLE;
      this.onExpanded();
    }, this.config.duration);
  }
  
  /**
   * 收缩蒙层
   */
  collapse() {
    if (this.overlayState === OVERLAY_STATE.COLLAPSED) return;
    
    this.overlayState = OVERLAY_STATE.TRANSITIONING;
    this.gestureState = GESTURE_STATE.ANIMATING;
    
    // CSS过渡动画
    this.element.style.transition = `transform ${this.config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    this.element.style.transform = `translateX(-${this.config.maxOffset}px) translateZ(0)`;
    
    // 动画完成回调
    setTimeout(() => {
      this.overlayState = OVERLAY_STATE.COLLAPSED;
      this.gestureState = GESTURE_STATE.IDLE;
      this.onCollapsed();
    }, this.config.duration);
  }
  
  /**
   * 重置到当前状态位置
   */
  resetPosition() {
    const targetX = this.overlayState === OVERLAY_STATE.EXPANDED ? 0 : -this.config.maxOffset;
    
    this.element.style.transition = `transform 200ms cubic-bezier(0.4, 0, 0.2, 1)`;
    this.element.style.transform = `translateX(${targetX}px) translateZ(0)`;
  }
  
  /**
   * 事件回调
   */
  onExpanded() {
    this.dispatchEvent('expanded');
  }
  
  onCollapsed() {
    this.dispatchEvent('collapsed');
  }
  
  /**
   * 分发自定义事件
   */
  dispatchEvent(type, detail = {}) {
    const event = new CustomEvent(`swipeoverlay:${type}`, {
      detail: { overlay: this, ...detail }
    });
    this.element.dispatchEvent(event);
  }
  
  /**
   * 销毁实例
   */
  destroy() {
    // 清理事件监听器
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    
    // 清理Hammer.js
    if (this.hammer) {
      this.hammer.destroy();
    }
    
    // 清理RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

/**
 * React Hook版本实现
 */
function useSwipeOverlay(ref, options = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const overlayRef = useRef(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const overlay = new SwipeOverlay(ref.current, options);
    overlayRef.current = overlay;
    
    // 监听状态变化
    const handleExpanded = () => setIsExpanded(true);
    const handleCollapsed = () => setIsExpanded(false);
    
    ref.current.addEventListener('swipeoverlay:expanded', handleExpanded);
    ref.current.addEventListener('swipeoverlay:collapsed', handleCollapsed);
    
    return () => {
      ref.current?.removeEventListener('swipeoverlay:expanded', handleExpanded);
      ref.current?.removeEventListener('swipeoverlay:collapsed', handleCollapsed);
      overlay.destroy();
    };
  }, []);
  
  const expand = useCallback(() => {
    overlayRef.current?.expand();
  }, []);
  
  const collapse = useCallback(() => {
    overlayRef.current?.collapse();
  }, []);
  
  return { isExpanded, expand, collapse };
}

/**
 * React组件示例
 */
function SwipeOverlayComponent({ children, ...options }) {
  const ref = useRef(null);
  const { isExpanded, expand, collapse } = useSwipeOverlay(ref, options);
  
  return (
    <div
      ref={ref}
      className={`swipe-overlay ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '320px',
        height: '100vh',
        backgroundColor: 'white',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}
    >
      {children}
    </div>
  );
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SwipeOverlay, useSwipeOverlay, SwipeOverlayComponent };
} else if (typeof window !== 'undefined') {
  window.SwipeOverlay = SwipeOverlay;
  window.useSwipeOverlay = useSwipeOverlay;
  window.SwipeOverlayComponent = SwipeOverlayComponent;
}