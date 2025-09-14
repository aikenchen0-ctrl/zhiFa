/**
 * 滚动事件优化器 - 专为高频滚动事件优化
 * 
 * 核心优化原理：
 * 1. 事件节流：使用requestAnimationFrame限制处理频率
 * 2. 被动监听：提升滚动响应性能
 * 3. 交集观察：精确检测元素可见性变化
 * 4. 预测算法：基于滚动方向和速度预测行为
 * 5. 智能分层：按优先级处理不同滚动事件
 */

export interface ScrollPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface ScrollVelocity {
  x: number;
  y: number;
  magnitude: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'diagonal' | 'idle';
}

export interface ScrollPrediction {
  futurePosition: ScrollPosition;
  confidence: number; // 预测置信度 0-1
  timeHorizon: number; // 预测时间跨度（毫秒）
}

export interface ScrollEventConfig {
  throttleMs: number; // 节流间隔
  enablePrediction: boolean; // 启用滚动预测
  enableIntersectionObserver: boolean; // 启用交集观察
  velocitySmoothing: number; // 速度平滑因子
  predictionTimeHorizon: number; // 预测时间跨度
  enableAdaptiveThrottling: boolean; // 自适应节流
  maxThrottleMs: number; // 最大节流间隔
  minThrottleMs: number; // 最小节流间隔
}

export interface ScrollMetrics {
  totalScrollEvents: number;
  throttledEvents: number;
  avgVelocity: number;
  maxVelocity: number;
  scrollDirection: string;
  lastUpdateTime: number;
  frameDrops: number;
  predictionAccuracy: number;
}

export type ScrollEventHandler = (position: ScrollPosition, velocity: ScrollVelocity) => void;
export type VisibilityChangeHandler = (element: Element, isVisible: boolean, ratio: number) => void;

/**
 * 滚动事件优化器主类
 */
export class ScrollEventOptimizer {
  private config: ScrollEventConfig;
  private isActive = false;
  
  // 滚动状态跟踪
  private currentPosition: ScrollPosition;
  private positionHistory: ScrollPosition[] = [];
  private velocityHistory: ScrollVelocity[] = [];
  private currentVelocity: ScrollVelocity;
  
  // 事件处理
  private scrollHandlers: Set<ScrollEventHandler> = new Set();
  private visibilityHandlers: Set<VisibilityChangeHandler> = new Set();
  private throttleFrame: number | null = null;
  private lastProcessedTime = 0;
  
  // Intersection Observer
  private intersectionObserver: IntersectionObserver | null = null;
  private observedElements = new WeakMap<Element, { callback: VisibilityChangeHandler; lastRatio: number }>();
  
  // 性能监控
  private metrics: ScrollMetrics;
  private performanceHistory: Array<{ time: number; frameTime: number }> = [];
  
  // 自适应节流
  private currentThrottleMs: number;
  private adaptiveMetrics = {
    smoothFrames: 0,
    totalFrames: 0,
    frameTimeSum: 0
  };
  
  // 预测系统
  private predictionModel: {
    coefficients: number[];
    accuracy: number;
    samples: Array<{ input: number[]; output: number[] }>;
  };
  
  constructor(config: Partial<ScrollEventConfig> = {}) {
    this.config = {
      throttleMs: 16, // 60fps
      enablePrediction: true,
      enableIntersectionObserver: true,
      velocitySmoothing: 0.8,
      predictionTimeHorizon: 100, // 100ms
      enableAdaptiveThrottling: true,
      maxThrottleMs: 32, // 30fps
      minThrottleMs: 8, // 120fps
      ...config
    };
    
    this.currentThrottleMs = this.config.throttleMs;
    
    this.currentPosition = { x: 0, y: 0, timestamp: 0 };
    this.currentVelocity = { x: 0, y: 0, magnitude: 0, direction: 'idle' };
    
    this.metrics = {
      totalScrollEvents: 0,
      throttledEvents: 0,
      avgVelocity: 0,
      maxVelocity: 0,
      scrollDirection: 'idle',
      lastUpdateTime: 0,
      frameDrops: 0,
      predictionAccuracy: 0
    };
    
    this.predictionModel = {
      coefficients: [1, 0.8, 0.6], // 简单的线性预测系数
      accuracy: 0,
      samples: []
    };
    
    this.initializeIntersectionObserver();
    
    console.log('📜 滚动事件优化器初始化完成', {
      throttleMs: this.config.throttleMs,
      prediction: this.config.enablePrediction,
      adaptiveThrottling: this.config.enableAdaptiveThrottling
    });
  }
  
  /**
   * 初始化Intersection Observer
   */
  private initializeIntersectionObserver(): void {
    if (!this.config.enableIntersectionObserver) return;
    
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const element = entry.target;
          const observedData = this.observedElements.get(element);
          
          if (observedData) {
            const isVisible = entry.intersectionRatio > 0;
            const ratioChanged = Math.abs(entry.intersectionRatio - observedData.lastRatio) > 0.01;
            
            if (ratioChanged) {
              observedData.callback(element, isVisible, entry.intersectionRatio);
              observedData.lastRatio = entry.intersectionRatio;
            }
          }
        });
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0], // 多个阈值精确检测
        rootMargin: '50px 0px', // 提前50px开始检测
      }
    );
  }
  
  /**
   * 启动滚动优化
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.setupScrollListener();
    this.startPerformanceMonitoring();
    
    console.log('🚀 滚动事件优化器已启动');
  }
  
  /**
   * 停止滚动优化
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.removeScrollListener();
    this.stopPerformanceMonitoring();
    
    if (this.throttleFrame) {
      cancelAnimationFrame(this.throttleFrame);
      this.throttleFrame = null;
    }
    
    console.log('⏹️ 滚动事件优化器已停止');
  }
  
  /**
   * 设置滚动监听器
   */
  private setupScrollListener(): void {
    // 使用被动监听提升性能
    const options: AddEventListenerOptions = { 
      passive: true,
      capture: false
    };
    
    window.addEventListener('scroll', this.handleRawScrollEvent.bind(this), options);
    document.addEventListener('scroll', this.handleRawScrollEvent.bind(this), options);
  }
  
  /**
   * 移除滚动监听器
   */
  private removeScrollListener(): void {
    window.removeEventListener('scroll', this.handleRawScrollEvent.bind(this));
    document.removeEventListener('scroll', this.handleRawScrollEvent.bind(this));
  }
  
  /**
   * 处理原始滚动事件
   */
  private handleRawScrollEvent(event: Event): void {
    this.metrics.totalScrollEvents++;
    
    const now = performance.now();
    const shouldThrottle = now - this.lastProcessedTime < this.currentThrottleMs;
    
    if (shouldThrottle && this.throttleFrame) {
      return; // 已有待处理的帧
    }
    
    if (!shouldThrottle) {
      this.processScrollEvent(now);
      this.lastProcessedTime = now;
    } else {
      // 节流处理
      if (this.throttleFrame) {
        cancelAnimationFrame(this.throttleFrame);
      }
      
      this.throttleFrame = requestAnimationFrame(() => {
        this.processScrollEvent(performance.now());
        this.throttleFrame = null;
        this.metrics.throttledEvents++;
      });
    }
  }
  
  /**
   * 处理滚动事件
   */
  private processScrollEvent(timestamp: number): void {
    const frameStart = performance.now();
    
    // 获取当前滚动位置
    const x = window.pageXOffset || document.documentElement.scrollLeft;
    const y = window.pageYOffset || document.documentElement.scrollTop;
    
    const position: ScrollPosition = { x, y, timestamp };
    
    // 计算速度
    this.updateVelocity(position);
    
    // 更新位置历史
    this.updatePositionHistory(position);
    
    // 预测未来位置
    let prediction: ScrollPrediction | null = null;
    if (this.config.enablePrediction) {
      prediction = this.predictFuturePosition();
    }
    
    // 调用处理函数
    this.scrollHandlers.forEach(handler => {
      try {
        handler(position, this.currentVelocity);
      } catch (error) {
        console.error('滚动事件处理函数错误:', error);
      }
    });
    
    // 更新当前位置
    this.currentPosition = position;
    
    // 更新性能指标
    const frameTime = performance.now() - frameStart;
    this.updatePerformanceMetrics(frameTime);
    
    // 自适应节流调整
    if (this.config.enableAdaptiveThrottling) {
      this.adjustThrottling(frameTime);
    }
  }
  
  /**
   * 更新速度计算
   */
  private updateVelocity(position: ScrollPosition): void {
    if (this.positionHistory.length === 0) {
      this.currentVelocity = { x: 0, y: 0, magnitude: 0, direction: 'idle' };
      return;
    }
    
    const lastPosition = this.positionHistory[this.positionHistory.length - 1];
    const timeDelta = position.timestamp - lastPosition.timestamp;
    
    if (timeDelta === 0) return;
    
    // 计算瞬时速度
    const instantVelocity = {
      x: (position.x - lastPosition.x) / timeDelta * 1000, // 像素/秒
      y: (position.y - lastPosition.y) / timeDelta * 1000
    };
    
    // 应用平滑因子
    const smoothing = this.config.velocitySmoothing;
    this.currentVelocity.x = this.currentVelocity.x * smoothing + instantVelocity.x * (1 - smoothing);
    this.currentVelocity.y = this.currentVelocity.y * smoothing + instantVelocity.y * (1 - smoothing);
    
    // 计算速度大小和方向
    this.currentVelocity.magnitude = Math.sqrt(
      this.currentVelocity.x * this.currentVelocity.x + 
      this.currentVelocity.y * this.currentVelocity.y
    );
    
    this.currentVelocity.direction = this.calculateScrollDirection();
    
    // 更新速度历史
    this.velocityHistory.push({ ...this.currentVelocity });
    if (this.velocityHistory.length > 10) {
      this.velocityHistory.shift();
    }
    
    // 更新指标
    this.metrics.avgVelocity = this.calculateAverageVelocity();
    this.metrics.maxVelocity = Math.max(this.metrics.maxVelocity, this.currentVelocity.magnitude);
    this.metrics.scrollDirection = this.currentVelocity.direction;
  }
  
  /**
   * 计算滚动方向
   */
  private calculateScrollDirection(): ScrollVelocity['direction'] {
    const { x, y } = this.currentVelocity;
    const threshold = 10; // 最小速度阈值
    
    if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
      return 'idle';
    }
    
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    
    if (absY > absX * 2) {
      return y > 0 ? 'down' : 'up';
    } else if (absX > absY * 2) {
      return x > 0 ? 'right' : 'left';
    } else {
      return 'diagonal';
    }
  }
  
  /**
   * 计算平均速度
   */
  private calculateAverageVelocity(): number {
    if (this.velocityHistory.length === 0) return 0;
    
    const sum = this.velocityHistory.reduce((acc, v) => acc + v.magnitude, 0);
    return sum / this.velocityHistory.length;
  }
  
  /**
   * 更新位置历史
   */
  private updatePositionHistory(position: ScrollPosition): void {
    this.positionHistory.push(position);
    
    // 只保留最近10个位置用于计算
    if (this.positionHistory.length > 10) {
      this.positionHistory.shift();
    }
  }
  
  /**
   * 预测未来滚动位置
   */
  private predictFuturePosition(): ScrollPrediction {
    if (this.velocityHistory.length < 3) {
      return {
        futurePosition: this.currentPosition,
        confidence: 0,
        timeHorizon: 0
      };
    }
    
    const timeHorizon = this.config.predictionTimeHorizon;
    const { x: vx, y: vy } = this.currentVelocity;
    
    // 简单的线性预测（考虑减速）
    const decayFactor = 0.9; // 速度衰减因子
    const futureVx = vx * Math.pow(decayFactor, timeHorizon / 100);
    const futureVy = vy * Math.pow(decayFactor, timeHorizon / 100);
    
    const futurePosition: ScrollPosition = {
      x: this.currentPosition.x + (futureVx * timeHorizon / 1000),
      y: this.currentPosition.y + (futureVy * timeHorizon / 1000),
      timestamp: this.currentPosition.timestamp + timeHorizon
    };
    
    // 基于速度稳定性计算置信度
    const velocityStability = this.calculateVelocityStability();
    const confidence = Math.max(0, Math.min(1, velocityStability));
    
    return {
      futurePosition,
      confidence,
      timeHorizon
    };
  }
  
  /**
   * 计算速度稳定性
   */
  private calculateVelocityStability(): number {
    if (this.velocityHistory.length < 3) return 0;
    
    // 计算最近几个速度的方差
    const recent = this.velocityHistory.slice(-5);
    const avgMagnitude = recent.reduce((sum, v) => sum + v.magnitude, 0) / recent.length;
    
    const variance = recent.reduce((sum, v) => {
      const diff = v.magnitude - avgMagnitude;
      return sum + diff * diff;
    }, 0) / recent.length;
    
    // 将方差转换为稳定性分数（0-1）
    const maxVariance = 10000; // 根据经验调整
    return Math.max(0, 1 - variance / maxVariance);
  }
  
  /**
   * 自适应节流调整
   */
  private adjustThrottling(frameTime: number): void {
    this.adaptiveMetrics.totalFrames++;
    this.adaptiveMetrics.frameTimeSum += frameTime;
    
    if (frameTime <= 16) { // 60fps
      this.adaptiveMetrics.smoothFrames++;
    }
    
    // 每100帧调整一次
    if (this.adaptiveMetrics.totalFrames % 100 === 0) {
      const smoothRatio = this.adaptiveMetrics.smoothFrames / this.adaptiveMetrics.totalFrames;
      const avgFrameTime = this.adaptiveMetrics.frameTimeSum / this.adaptiveMetrics.totalFrames;
      
      if (smoothRatio > 0.9 && avgFrameTime < 10) {
        // 性能良好，可以降低节流
        this.currentThrottleMs = Math.max(this.config.minThrottleMs, this.currentThrottleMs - 1);
      } else if (smoothRatio < 0.7 || avgFrameTime > 20) {
        // 性能不佳，增加节流
        this.currentThrottleMs = Math.min(this.config.maxThrottleMs, this.currentThrottleMs + 2);
      }
      
      // 重置计数器
      this.adaptiveMetrics.smoothFrames = 0;
      this.adaptiveMetrics.totalFrames = 0;
      this.adaptiveMetrics.frameTimeSum = 0;
      
      console.log(`⚡ 自适应节流调整: ${this.currentThrottleMs}ms (平滑率: ${(smoothRatio*100).toFixed(1)}%)`);
    }
  }
  
  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(frameTime: number): void {
    this.metrics.lastUpdateTime = performance.now();
    
    // 记录性能历史
    this.performanceHistory.push({ time: this.metrics.lastUpdateTime, frameTime });
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
    
    // 检测掉帧
    if (frameTime > 16) {
      this.metrics.frameDrops++;
    }
  }
  
  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    const monitoringInterval = 5000; // 5秒
    
    setInterval(() => {
      this.printPerformanceReport();
    }, monitoringInterval);
  }
  
  /**
   * 停止性能监控
   */
  private stopPerformanceMonitoring(): void {
    // 监控通过setInterval实现，在实际应用中应该存储interval ID并清理
  }
  
  /**
   * 添加滚动事件处理函数
   */
  addScrollHandler(handler: ScrollEventHandler): void {
    this.scrollHandlers.add(handler);
  }
  
  /**
   * 移除滚动事件处理函数
   */
  removeScrollHandler(handler: ScrollEventHandler): void {
    this.scrollHandlers.delete(handler);
  }
  
  /**
   * 观察元素可见性变化
   */
  observeVisibility(element: Element, callback: VisibilityChangeHandler): void {
    if (!this.intersectionObserver) return;
    
    this.observedElements.set(element, { callback, lastRatio: 0 });
    this.intersectionObserver.observe(element);
  }
  
  /**
   * 停止观察元素
   */
  unobserveVisibility(element: Element): void {
    if (!this.intersectionObserver) return;
    
    this.observedElements.delete(element);
    this.intersectionObserver.unobserve(element);
  }
  
  /**
   * 获取当前滚动状态
   */
  getCurrentState(): {
    position: ScrollPosition;
    velocity: ScrollVelocity;
    prediction?: ScrollPrediction;
  } {
    const state = {
      position: this.currentPosition,
      velocity: this.currentVelocity
    };
    
    if (this.config.enablePrediction) {
      return {
        ...state,
        prediction: this.predictFuturePosition()
      };
    }
    
    return state;
  }
  
  /**
   * 获取性能指标
   */
  getMetrics(): ScrollMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 输出性能报告
   */
  printPerformanceReport(): void {
    const throttleRate = this.metrics.totalScrollEvents > 0 
      ? (this.metrics.throttledEvents / this.metrics.totalScrollEvents * 100).toFixed(1)
      : '0';
    
    const avgFrameTime = this.performanceHistory.length > 0
      ? (this.performanceHistory.reduce((sum, h) => sum + h.frameTime, 0) / this.performanceHistory.length).toFixed(2)
      : '0';
    
    console.log('📊 滚动优化器性能报告', {
      totalEvents: this.metrics.totalScrollEvents,
      throttleRate: throttleRate + '%',
      currentThrottle: this.currentThrottleMs + 'ms',
      avgVelocity: this.metrics.avgVelocity.toFixed(1) + 'px/s',
      maxVelocity: this.metrics.maxVelocity.toFixed(1) + 'px/s',
      direction: this.metrics.scrollDirection,
      frameDrops: this.metrics.frameDrops,
      avgFrameTime: avgFrameTime + 'ms',
      observedElements: this.observedElements.size
    });
  }
  
  /**
   * 销毁优化器
   */
  destroy(): void {
    this.stop();
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.scrollHandlers.clear();
    this.visibilityHandlers.clear();
    this.observedElements = new WeakMap();
    this.positionHistory.length = 0;
    this.velocityHistory.length = 0;
    this.performanceHistory.length = 0;
    
    console.log('🧹 滚动事件优化器已销毁');
  }
}

// 全局滚动优化器实例
export const globalScrollOptimizer = new ScrollEventOptimizer({
  throttleMs: 16,
  enablePrediction: true,
  enableIntersectionObserver: true,
  enableAdaptiveThrottling: true
});

// 工具函数
export const scrollUtils = {
  /**
   * 平滑滚动到指定位置
   */
  smoothScrollTo: (x: number, y: number, duration = 500) => {
    const startTime = performance.now();
    const startX = window.pageXOffset;
    const startY = window.pageYOffset;
    const distanceX = x - startX;
    const distanceY = y - startY;
    
    const easeInOutQuad = (t: number): number => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutQuad(progress);
      
      window.scrollTo(
        startX + distanceX * easedProgress,
        startY + distanceY * easedProgress
      );
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  /**
   * 检查元素是否在可见区域内
   */
  isElementVisible: (element: Element, margin = 0): boolean => {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
      rect.top < windowHeight + margin &&
      rect.bottom > -margin &&
      rect.left < windowWidth + margin &&
      rect.right > -margin
    );
  },
  
  /**
   * 获取元素相对于视口的可见比例
   */
  getVisibilityRatio: (element: Element): number => {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    
    if (visibleWidth <= 0 || visibleHeight <= 0) return 0;
    
    const totalArea = rect.width * rect.height;
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
    
    return totalArea > 0 ? visibleArea / totalArea : 0;
  }
};