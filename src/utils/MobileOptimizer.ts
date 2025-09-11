/**
 * 移动端性能优化器
 * 专门针对移动设备的性能优化策略
 */

import { IPerformanceMonitor } from '../core/interfaces';
import { RenderQuality } from '../core/types';

export interface MobileOptimizationConfig {
  enableAdaptiveQuality: boolean;
  enableTouchOptimization: boolean;
  maxConnectionsOnMobile: number;
  batteryAwareMode: boolean;
  lowPowerModeDetection: boolean;
}

export class MobileOptimizer {
  private performanceMonitor: IPerformanceMonitor;
  private config: MobileOptimizationConfig;
  private currentQuality: RenderQuality = 'high';
  private isMobile = false;
  private isLowPowerMode = false;
  private batteryLevel = 1;
  private onQualityChange?: (quality: RenderQuality) => void;

  constructor(
    performanceMonitor: IPerformanceMonitor,
    config: MobileOptimizationConfig
  ) {
    this.performanceMonitor = performanceMonitor;
    this.config = config;
    
    this.detectMobileDevice();
    this.setupBatteryMonitoring();
    this.setupPerformanceMonitoring();
  }

  /**
   * 设置质量变化回调
   */
  setQualityChangeCallback(callback: (quality: RenderQuality) => void): void {
    this.onQualityChange = callback;
  }

  /**
   * 获取当前渲染质量
   */
  getCurrentQuality(): RenderQuality {
    return this.currentQuality;
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    return {
      isMobile: this.isMobile,
      isLowPowerMode: this.isLowPowerMode,
      batteryLevel: this.batteryLevel,
      devicePixelRatio: window.devicePixelRatio || 1,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
  }

  /**
   * 获取推荐的连接线数量限制
   */
  getRecommendedConnectionLimit(): number {
    if (!this.isMobile) return 10000;
    
    if (this.isLowPowerMode || this.batteryLevel < 0.2) {
      return 50;
    }
    
    if (this.batteryLevel < 0.5) {
      return 200;
    }
    
    return this.config.maxConnectionsOnMobile;
  }

  /**
   * 获取触摸优化设置
   */
  getTouchOptimization() {
    if (!this.config.enableTouchOptimization || !this.isMobile) {
      return {
        enabled: false,
        debounceTime: 0,
        tapThreshold: 10,
        longPressTime: 500
      };
    }

    return {
      enabled: true,
      debounceTime: this.isLowPowerMode ? 50 : 16, // 约60fps或20fps
      tapThreshold: 10,
      longPressTime: 500,
      preventDefaultOnTouch: true,
      enablePassiveListeners: true
    };
  }

  // 私有方法

  private detectMobileDevice(): void {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 更精确的检测
    if (!this.isMobile) {
      this.isMobile = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    }
  }

  private setupBatteryMonitoring(): void {
    if (!this.config.batteryAwareMode) return;

    // @ts-ignore - Battery API may not be available in all browsers
    if ('getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((battery: any) => {
        this.batteryLevel = battery.level;
        this.isLowPowerMode = battery.level < 0.2;

        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.adaptToPerformanceConditions();
        });

        battery.addEventListener('chargingchange', () => {
          this.adaptToPerformanceConditions();
        });
      });
    }

    // 检测低电量模式的其他方法
    this.detectLowPowerMode();
  }

  private detectLowPowerMode(): void {
    // 通过性能API检测可能的低电量模式
    if ('connection' in navigator) {
      // @ts-ignore
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection && connection.saveData) {
        this.isLowPowerMode = true;
      }
    }

    // 检测 prefers-reduced-motion
    if (window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (prefersReducedMotion.matches) {
        this.isLowPowerMode = true;
      }

      prefersReducedMotion.addListener((e) => {
        this.isLowPowerMode = e.matches;
        this.adaptToPerformanceConditions();
      });
    }
  }

  private setupPerformanceMonitoring(): void {
    if (!this.config.enableAdaptiveQuality) return;

    // 定期检查性能并调整质量
    setInterval(() => {
      this.adaptToPerformanceConditions();
    }, 2000); // 每2秒检查一次
  }

  private adaptToPerformanceConditions(): void {
    if (!this.config.enableAdaptiveQuality) return;

    const fps = this.performanceMonitor.getAverageFPS();
    const frameTime = this.performanceMonitor.getFrameTime();
    const memoryUsage = this.performanceMonitor.getMemoryUsage();

    let newQuality: RenderQuality = this.currentQuality;

    // 基于帧率调整质量
    if (fps < 20) {
      newQuality = 'low';
    } else if (fps < 40) {
      newQuality = 'medium';
    } else if (fps > 55) {
      newQuality = 'high';
    }

    // 基于电池状态调整
    if (this.isLowPowerMode || this.batteryLevel < 0.2) {
      newQuality = 'low';
    } else if (this.batteryLevel < 0.5) {
      if (newQuality === 'high') {
        newQuality = 'medium';
      }
    }

    // 基于内存使用调整
    if (memoryUsage > 200) { // 200MB+
      if (newQuality === 'high') {
        newQuality = 'medium';
      }
    }
    if (memoryUsage > 400) { // 400MB+
      newQuality = 'low';
    }

    // 移动设备特殊处理
    if (this.isMobile) {
      // 移动设备默认不使用高质量
      if (newQuality === 'high' && (frameTime > 20 || memoryUsage > 100)) {
        newQuality = 'medium';
      }
    }

    if (newQuality !== this.currentQuality) {
      this.currentQuality = newQuality;
      this.onQualityChange?.(newQuality);
      
      console.log(`Quality adapted to: ${newQuality}`, {
        fps,
        frameTime,
        memoryUsage,
        batteryLevel: this.batteryLevel,
        isLowPowerMode: this.isLowPowerMode
      });
    }
  }

  /**
   * 获取移动端优化的Canvas设置
   */
  getOptimizedCanvasSettings() {
    const settings = {
      antialias: true,
      alpha: false,
      desynchronized: true,
      powerPreference: 'default' as WebGLPowerPreference
    };

    if (this.isMobile) {
      settings.antialias = this.currentQuality === 'high';
      settings.powerPreference = this.isLowPowerMode ? 'low-power' : 'default';
    }

    return settings;
  }

  /**
   * 获取推荐的动画设置
   */
  getAnimationSettings() {
    const baseSettings = {
      enableAnimations: true,
      animationSpeed: 1,
      particleCount: 5,
      enableGradients: true,
      enableShadows: false
    };

    if (this.isLowPowerMode) {
      return {
        ...baseSettings,
        enableAnimations: false,
        animationSpeed: 0.5,
        particleCount: 1,
        enableGradients: false,
        enableShadows: false
      };
    }

    if (this.isMobile && this.currentQuality === 'low') {
      return {
        ...baseSettings,
        enableAnimations: true,
        animationSpeed: 0.7,
        particleCount: 2,
        enableGradients: false,
        enableShadows: false
      };
    }

    return baseSettings;
  }

  /**
   * 创建触摸事件处理器
   */
  createTouchHandler(element: HTMLElement) {
    const touchConfig = this.getTouchOptimization();
    
    if (!touchConfig.enabled) {
      return null;
    }

    let lastTouchTime = 0;
    let touchStartPos: { x: number; y: number } | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchTime < touchConfig.debounceTime) {
        return;
      }
      
      if (touchConfig.preventDefaultOnTouch) {
        e.preventDefault();
      }
      
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      lastTouchTime = now;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchTime < touchConfig.debounceTime) {
        return;
      }

      if (touchConfig.preventDefaultOnTouch) {
        e.preventDefault();
      }

      lastTouchTime = now;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchConfig.preventDefaultOnTouch) {
        e.preventDefault();
      }
    };

    // 添加事件监听器
    const options = touchConfig.enablePassiveListeners ? { passive: false } : false;
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    // 返回清理函数
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }
}