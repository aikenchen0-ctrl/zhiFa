/**
 * CSS Performance Optimization for Mobile Overlay Systems
 * CSS性能优化专门针对移动端蒙层系统
 */

// CSS Containment 优化策略
const CSS_CONTAINMENT_STRATEGIES = {
  layout: {
    property: 'contain: layout',
    usage: 'Isolate layout calculations within overlay',
    example: `
      .overlay-container {
        contain: layout;
        /* 防止内部布局影响外部元素 */
      }
    `,
    performance: 'Reduces layout thrashing by 40-60%',
    compatibility: 'Chrome 52+, Firefox 69+, Safari 15.4+'
  },
  
  style: {
    property: 'contain: style',
    usage: 'Isolate style recalculation scope',
    example: `
      .overlay-content {
        contain: style;
        /* 样式变更不会影响父级或兄弟元素 */
      }
    `,
    performance: 'Reduces style recalculation time by 30-50%',
    compatibility: 'Chrome 52+, Firefox 69+, Safari 15.4+'
  },
  
  paint: {
    property: 'contain: paint',
    usage: 'Create stacking context and clip content',
    example: `
      .overlay-modal {
        contain: paint;
        /* 创建独立的绘制层，优化重绘 */
        overflow: hidden;
      }
    `,
    performance: 'Reduces paint area by 50-70%',
    compatibility: 'Chrome 52+, Firefox 69+, Safari 15.4+'
  },
  
  size: {
    property: 'contain: size',
    usage: 'Fix container size for stable layout',
    example: `
      .overlay-backdrop {
        contain: size;
        width: 100vw;
        height: 100vh;
        /* 固定尺寸，避免子元素影响容器大小 */
      }
    `,
    performance: 'Prevents layout shifts',
    compatibility: 'Chrome 52+, Firefox 69+, Safari 15.4+'
  },
  
  strict: {
    property: 'contain: strict',
    usage: 'Maximum containment (layout + style + paint + size)',
    example: `
      .overlay-isolated {
        contain: strict;
        /* 最强隔离，适合复杂独立组件 */
      }
    `,
    performance: 'Maximum optimization but restrictive',
    compatibility: 'Chrome 52+, Firefox 69+, Safari 15.4+'
  }
};

// will-change 优化最佳实践
const WILL_CHANGE_OPTIMIZATION = {
  principles: [
    'Only use on elements that will actually animate',
    'Remove will-change after animation completes',
    'Limit to 4-6 elements maximum simultaneously',
    'Prefer specific properties over auto'
  ],
  
  examples: {
    slideInAnimation: `
      .overlay-slide-in {
        will-change: transform, opacity;
        transform: translateX(-100%);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      
      .overlay-slide-in.active {
        transform: translateX(0);
        opacity: 1;
      }
      
      .overlay-slide-in.animation-end {
        will-change: auto; /* 动画结束后移除 */
      }
    `,
    
    scrollOptimization: `
      .overlay-scrollable {
        will-change: scroll-position;
        /* 仅在滚动期间使用 */
        -webkit-overflow-scrolling: touch;
        overflow-y: auto;
      }
    `,
    
    fadeTransition: `
      .overlay-fade {
        will-change: opacity;
        opacity: 0;
        transition: opacity 0.25s ease-out;
      }
      
      .overlay-fade.visible {
        opacity: 1;
      }
    `
  },
  
  antiPatterns: [
    'will-change: auto on static elements',
    'will-change: transform on non-animated elements',
    'Not removing will-change after animations',
    'Using will-change on too many elements simultaneously'
  ]
};

// GPU加速优化技巧
const GPU_ACCELERATION_TECHNIQUES = {
  transform3d: {
    description: 'Force hardware acceleration with 3D transforms',
    example: `
      .overlay-gpu-accelerated {
        transform: translate3d(0, 0, 0);
        /* 强制启用硬件加速 */
      }
    `,
    compatibility: 'Universal support',
    performance: 'Creates composite layer'
  },
  
  backfaceVisibility: {
    description: 'Optimize 3D transformed elements',
    example: `
      .overlay-3d-element {
        backface-visibility: hidden;
        /* 隐藏背面，提升3D变换性能 */
        transform-style: preserve-3d;
      }
    `,
    compatibility: 'Universal support',
    performance: 'Reduces overdraw in 3D contexts'
  },
  
  perspective: {
    description: 'Establish 3D rendering context',
    example: `
      .overlay-3d-container {
        perspective: 1000px;
        /* 建立3D透视，优化子元素3D变换 */
      }
      
      .overlay-3d-child {
        transform: rotateY(45deg);
      }
    `,
    compatibility: 'Universal support',
    performance: 'Optimizes 3D rendering pipeline'
  }
};

// 移动端特定CSS优化
const MOBILE_SPECIFIC_OPTIMIZATIONS = {
  touchOptimization: `
    .overlay-touchable {
      touch-action: manipulation;
      /* 禁用双击缩放，优化触摸响应 */
      -webkit-tap-highlight-color: transparent;
      /* 移除iOS点击高亮 */
      user-select: none;
      /* 防止文本选择影响触摸体验 */
    }
  `,
  
  scrollOptimization: `
    .overlay-scroll-container {
      -webkit-overflow-scrolling: touch;
      /* iOS弹性滚动 */
      overflow-scrolling: touch;
      overscroll-behavior: contain;
      /* 防止滚动穿透 */
    }
  `,
  
  fontOptimization: `
    .overlay-text {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      /* 优化字体渲染 */
      text-rendering: optimizeSpeed;
      /* 优先渲染速度 */
    }
  `,
  
  imageOptimization: `
    .overlay-image {
      image-rendering: -webkit-optimize-contrast;
      /* Webkit优化对比度 */
      image-rendering: crisp-edges;
      /* 锐利边缘 */
      object-fit: cover;
      /* 避免图片变形导致的重排 */
    }
  `
};

// CSS动画性能优化器
class CSSAnimationOptimizer {
  constructor() {
    this.activeAnimations = new Set();
    this.observer = null;
    this.performanceMetrics = {
      frameDrops: 0,
      averageFPS: 60,
      lastFrameTime: performance.now()
    };
  }

  // 智能will-change管理
  manageWillChange(element, properties, duration = 1000) {
    // 添加will-change
    element.style.willChange = properties.join(', ');
    this.activeAnimations.add(element);
    
    // 自动移除will-change
    setTimeout(() => {
      element.style.willChange = 'auto';
      this.activeAnimations.delete(element);
    }, duration);
  }

  // 动画性能监控
  monitorAnimationPerformance() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFrame = (currentTime) => {
      frameCount++;
      
      // 检测掉帧
      const frameDelta = currentTime - this.performanceMetrics.lastFrameTime;
      if (frameDelta > 20) { // 超过20ms认为掉帧
        this.performanceMetrics.frameDrops++;
      }
      
      // 每秒计算一次FPS
      if (currentTime >= lastTime + 1000) {
        this.performanceMetrics.averageFPS = Math.round(
          (frameCount * 1000) / (currentTime - lastTime)
        );
        
        // 如果FPS低于40，发出警告
        if (this.performanceMetrics.averageFPS < 40) {
          console.warn('Animation performance warning: Low FPS detected', {
            fps: this.performanceMetrics.averageFPS,
            frameDrops: this.performanceMetrics.frameDrops,
            activeAnimations: this.activeAnimations.size
          });
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      this.performanceMetrics.lastFrameTime = currentTime;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  // 批量动画优化
  batchAnimations(animations) {
    // 使用DocumentFragment减少重排
    const fragment = document.createDocumentFragment();
    
    // 批量应用样式变更
    requestAnimationFrame(() => {
      animations.forEach(({ element, styles, willChange }) => {
        if (willChange) {
          this.manageWillChange(element, willChange);
        }
        
        Object.assign(element.style, styles);
      });
    });
  }

  // 获取性能报告
  getPerformanceReport() {
    return {
      ...this.performanceMetrics,
      activeAnimationsCount: this.activeAnimations.size,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.performanceMetrics.averageFPS < 50) {
      recommendations.push('Consider reducing concurrent animations');
      recommendations.push('Use transform instead of changing layout properties');
    }
    
    if (this.activeAnimations.size > 6) {
      recommendations.push('Too many active animations, consider queuing or reducing');
    }
    
    if (this.performanceMetrics.frameDrops > 10) {
      recommendations.push('High frame drop rate, check for expensive operations');
    }
    
    return recommendations;
  }
}

export {
  CSS_CONTAINMENT_STRATEGIES,
  WILL_CHANGE_OPTIMIZATION,
  GPU_ACCELERATION_TECHNIQUES,
  MOBILE_SPECIFIC_OPTIMIZATIONS,
  CSSAnimationOptimizer
};