/**
 * 移动端电池优化器 - 智能电池管理和性能降级
 * 
 * 核心优化原理：
 * 1. 电池状态监测：实时监控电池电量和充电状态
 * 2. 性能分级降级：基于电量自动调整性能等级
 * 3. 后台节能：页面不可见时降低活动频率
 * 4. 自适应帧率：根据电量动态调整渲染帧率
 * 5. CPU节流：在低电量时减少计算密集型操作
 */

export interface BatteryInfo {
  level: number; // 电量百分比 0-1
  charging: boolean; // 是否充电中
  chargingTime: number; // 充满电时间（秒）
  dischargingTime: number; // 剩余使用时间（秒）
  lastUpdated: number;
}

export interface PowerMode {
  name: 'high-performance' | 'balanced' | 'power-saver' | 'ultra-saver';
  frameRate: number; // 目标帧率
  throttleMultiplier: number; // 节流倍数
  enableAnimations: boolean; // 是否启用动画
  enableParallax: boolean; // 是否启用视差效果
  enableBlur: boolean; // 是否启用模糊效果
  connectionLineDetail: 'high' | 'medium' | 'low'; // 连接线细节等级
  virtualScrollBuffer: number; // 虚拟滚动缓冲区大小
  memoryPoolSize: number; // 内存池大小倍数
  enablePrediction: boolean; // 是否启用预测算法
}

export interface BatteryOptimizationConfig {
  enableBatteryAPI: boolean; // 是否启用Battery API
  enableVisibilityAPI: boolean; // 是否启用Visibility API
  batteryThresholds: {
    critical: number; // 临界电量阈值
    low: number; // 低电量阈值
    medium: number; // 中等电量阈值
  };
  powerModes: Record<string, PowerMode>;
  backgroundThrottleFactor: number; // 后台节流因子
  thermalThrottleEnabled: boolean; // 热节流
  adaptiveQuality: boolean; // 自适应质量
}

export interface OptimizationMetrics {
  currentMode: string;
  batteryLevel: number;
  isCharging: boolean;
  isVisible: boolean;
  frameRate: number;
  cpuUsage: number;
  memoryPressure: 'low' | 'medium' | 'high';
  thermalState: 'normal' | 'warm' | 'hot';
  optimizationsSaved: number; // 节省的操作次数
  estimatedBatterySavings: number; // 估计节省的电池使用量（分钟）
}

/**
 * 移动端电池优化器主类
 */
export class MobileBatteryOptimizer {
  private config: BatteryOptimizationConfig;
  private batteryInfo: BatteryInfo | null = null;
  private currentPowerMode: PowerMode;
  private isPageVisible = true;
  private isOptimizationActive = false;
  
  // API支持检测
  private batteryAPI: any = null;
  private supportsNavigatorBattery = false;
  private supportsVisibilityAPI = false;
  
  // 性能监控
  private metrics: OptimizationMetrics;
  private frameRateHistory: number[] = [];
  private cpuUsageHistory: number[] = [];
  
  // 事件处理
  private visibilityChangeHandler: (() => void) | null = null;
  private batteryChangeHandlers: (() => void)[] = [];
  
  // 优化器实例引用
  private externalOptimizers: {
    virtualScroll?: any;
    connectionRenderer?: any;
    memoryManager?: any;
    scrollOptimizer?: any;
  } = {};
  
  // 性能降级定时器
  private optimizationTimers: Map<string, number> = new Map();
  
  constructor(config: Partial<BatteryOptimizationConfig> = {}) {
    this.config = {
      enableBatteryAPI: true,
      enableVisibilityAPI: true,
      batteryThresholds: {
        critical: 0.05, // 5%
        low: 0.15, // 15%
        medium: 0.30 // 30%
      },
      backgroundThrottleFactor: 0.1, // 后台时降低到10%活动
      thermalThrottleEnabled: true,
      adaptiveQuality: true,
      powerModes: {
        'high-performance': {
          name: 'high-performance',
          frameRate: 60,
          throttleMultiplier: 1.0,
          enableAnimations: true,
          enableParallax: true,
          enableBlur: true,
          connectionLineDetail: 'high',
          virtualScrollBuffer: 10,
          memoryPoolSize: 1.0,
          enablePrediction: true
        },
        'balanced': {
          name: 'balanced',
          frameRate: 30,
          throttleMultiplier: 1.5,
          enableAnimations: true,
          enableParallax: false,
          enableBlur: true,
          connectionLineDetail: 'medium',
          virtualScrollBuffer: 5,
          memoryPoolSize: 0.8,
          enablePrediction: true
        },
        'power-saver': {
          name: 'power-saver',
          frameRate: 20,
          throttleMultiplier: 2.0,
          enableAnimations: false,
          enableParallax: false,
          enableBlur: false,
          connectionLineDetail: 'low',
          virtualScrollBuffer: 3,
          memoryPoolSize: 0.6,
          enablePrediction: false
        },
        'ultra-saver': {
          name: 'ultra-saver',
          frameRate: 10,
          throttleMultiplier: 4.0,
          enableAnimations: false,
          enableParallax: false,
          enableBlur: false,
          connectionLineDetail: 'low',
          virtualScrollBuffer: 1,
          memoryPoolSize: 0.4,
          enablePrediction: false
        }
      },
      ...config
    };
    
    this.currentPowerMode = this.config.powerModes['balanced'];
    
    this.metrics = {
      currentMode: 'balanced',
      batteryLevel: 1.0,
      isCharging: false,
      isVisible: true,
      frameRate: 60,
      cpuUsage: 0,
      memoryPressure: 'low',
      thermalState: 'normal',
      optimizationsSaved: 0,
      estimatedBatterySavings: 0
    };
    
    this.detectAPISupport();
    this.initializeBatteryMonitoring();
    this.initializeVisibilityMonitoring();
    this.startPerformanceMonitoring();
    
    console.log('🔋 移动端电池优化器初始化完成', {
      batteryAPI: this.supportsNavigatorBattery,
      visibilityAPI: this.supportsVisibilityAPI,
      initialMode: this.currentPowerMode.name
    });
  }
  
  /**
   * 检测API支持
   */
  private detectAPISupport(): void {
    // Battery API检测
    this.supportsNavigatorBattery = !!(
      'getBattery' in navigator ||
      'battery' in navigator ||
      'mozBattery' in navigator ||
      'webkitBattery' in navigator
    );
    
    // Visibility API检测
    this.supportsVisibilityAPI = !!(
      'visibilityState' in document ||
      'webkitVisibilityState' in document ||
      'mozVisibilityState' in document
    );
  }
  
  /**
   * 初始化电池监控
   */
  private async initializeBatteryMonitoring(): Promise<void> {
    if (!this.config.enableBatteryAPI || !this.supportsNavigatorBattery) {
      console.warn('⚠️ Battery API不支持或已禁用');
      return;
    }
    
    try {
      // 尝试获取电池信息
      let battery: any = null;
      
      if ('getBattery' in navigator) {
        battery = await (navigator as any).getBattery();
      } else if ('battery' in navigator) {
        battery = (navigator as any).battery;
      } else if ('mozBattery' in navigator) {
        battery = (navigator as any).mozBattery;
      } else if ('webkitBattery' in navigator) {
        battery = (navigator as any).webkitBattery;
      }
      
      if (battery) {
        this.batteryAPI = battery;
        this.updateBatteryInfo();
        this.setupBatteryEventListeners();
        
        console.log('🔋 电池监控已启动', {
          level: (battery.level * 100).toFixed(1) + '%',
          charging: battery.charging
        });
      }
    } catch (error) {
      console.warn('⚠️ 无法获取电池信息:', error);
    }
  }
  
  /**
   * 设置电池事件监听器
   */
  private setupBatteryEventListeners(): void {
    if (!this.batteryAPI) return;
    
    const handlers = [
      'levelchange',
      'chargingchange',
      'chargingtimechange',
      'dischargingtimechange'
    ];
    
    const updateHandler = () => {
      this.updateBatteryInfo();
      this.optimizePowerMode();
    };
    
    handlers.forEach(eventName => {
      this.batteryAPI.addEventListener(eventName, updateHandler);
      this.batteryChangeHandlers.push(() => {
        this.batteryAPI.removeEventListener(eventName, updateHandler);
      });
    });
  }
  
  /**
   * 更新电池信息
   */
  private updateBatteryInfo(): void {
    if (!this.batteryAPI) return;
    
    this.batteryInfo = {
      level: this.batteryAPI.level,
      charging: this.batteryAPI.charging,
      chargingTime: this.batteryAPI.chargingTime,
      dischargingTime: this.batteryAPI.dischargingTime,
      lastUpdated: Date.now()
    };
    
    this.metrics.batteryLevel = this.batteryInfo.level;
    this.metrics.isCharging = this.batteryInfo.charging;
  }
  
  /**
   * 初始化页面可见性监控
   */
  private initializeVisibilityMonitoring(): void {
    if (!this.config.enableVisibilityAPI || !this.supportsVisibilityAPI) {
      console.warn('⚠️ Visibility API不支持或已禁用');
      return;
    }
    
    this.visibilityChangeHandler = () => {
      const isVisible = !document.hidden &&
                       document.visibilityState === 'visible';
      
      if (isVisible !== this.isPageVisible) {
        this.isPageVisible = isVisible;
        this.metrics.isVisible = isVisible;
        
        console.log(`👁️ 页面可见性变化: ${isVisible ? '可见' : '隐藏'}`);
        
        // 根据可见性调整优化策略
        this.adjustBackgroundOptimizations();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  
  /**
   * 根据电池状态优化电源模式
   */
  private optimizePowerMode(): void {
    if (!this.batteryInfo) return;
    
    const { level, charging } = this.batteryInfo;
    let targetMode: string;
    
    if (charging) {
      // 充电时使用平衡或高性能模式
      targetMode = level > 0.5 ? 'high-performance' : 'balanced';
    } else {
      // 未充电时根据电量选择模式
      if (level <= this.config.batteryThresholds.critical) {
        targetMode = 'ultra-saver';
      } else if (level <= this.config.batteryThresholds.low) {
        targetMode = 'power-saver';
      } else if (level <= this.config.batteryThresholds.medium) {
        targetMode = 'balanced';
      } else {
        targetMode = 'high-performance';
      }
    }
    
    this.switchPowerMode(targetMode);
  }
  
  /**
   * 切换电源模式
   */
  switchPowerMode(modeName: string): void {
    const newMode = this.config.powerModes[modeName];
    if (!newMode || newMode.name === this.currentPowerMode.name) {
      return;
    }
    
    const oldMode = this.currentPowerMode;
    this.currentPowerMode = newMode;
    this.metrics.currentMode = newMode.name;
    
    console.log(`⚡ 电源模式切换: ${oldMode.name} → ${newMode.name}`);
    
    // 应用新的优化设置
    this.applyPowerModeOptimizations();
    
    // 触发模式切换事件
    this.emitPowerModeChangeEvent(oldMode, newMode);
  }
  
  /**
   * 应用电源模式优化
   */
  private applyPowerModeOptimizations(): void {
    const mode = this.currentPowerMode;
    
    // 调整虚拟滚动缓冲区
    if (this.externalOptimizers.virtualScroll) {
      this.externalOptimizers.virtualScroll.updateConfig({
        bufferSize: mode.virtualScrollBuffer
      });
    }
    
    // 调整连接线渲染质量
    if (this.externalOptimizers.connectionRenderer) {
      const lodConfig = this.getLODConfigForDetail(mode.connectionLineDetail);
      this.externalOptimizers.connectionRenderer.updateConfig(lodConfig);
    }
    
    // 调整内存池大小
    if (this.externalOptimizers.memoryManager) {
      const poolSizes = this.calculatePoolSizes(mode.memoryPoolSize);
      Object.entries(poolSizes).forEach(([poolName, size]) => {
        this.externalOptimizers.memoryManager.adjustPoolSize(poolName, size);
      });
    }
    
    // 调整滚动事件处理
    if (this.externalOptimizers.scrollOptimizer) {
      this.externalOptimizers.scrollOptimizer.updateConfig({
        throttleMs: 16 * mode.throttleMultiplier,
        enablePrediction: mode.enablePrediction
      });
    }
    
    // 应用CSS优化
    this.applyCSSOptimizations();
    
    // 调整定时器和动画
    this.adjustTimersAndAnimations();
  }
  
  /**
   * 获取连接线LOD配置
   */
  private getLODConfigForDetail(detail: 'high' | 'medium' | 'low'): any {
    switch (detail) {
      case 'high':
        return {
          enableLOD: false,
          enablePathCaching: true,
          maxFPS: 60
        };
      case 'medium':
        return {
          enableLOD: true,
          lodThresholds: [1.0, 2.0],
          enablePathCaching: true,
          maxFPS: 30
        };
      case 'low':
        return {
          enableLOD: true,
          lodThresholds: [0.5, 1.0],
          enablePathCaching: true,
          maxFPS: 15
        };
    }
  }
  
  /**
   * 计算池大小
   */
  private calculatePoolSizes(multiplier: number): Record<string, number> {
    const baseSizes = {
      avatar: 20,
      message: 30,
      connection: 25,
      point: 50,
      rect: 20,
      array: 100
    };
    
    const adjustedSizes: Record<string, number> = {};
    Object.entries(baseSizes).forEach(([pool, size]) => {
      adjustedSizes[pool] = Math.max(5, Math.floor(size * multiplier));
    });
    
    return adjustedSizes;
  }
  
  /**
   * 应用CSS优化
   */
  private applyCSSOptimizations(): void {
    const mode = this.currentPowerMode;
    
    // 动态添加/移除性能优化CSS类
    const body = document.body;
    
    // 移除旧的优化类
    body.classList.remove(
      'battery-high-performance',
      'battery-balanced', 
      'battery-power-saver',
      'battery-ultra-saver'
    );
    
    // 添加新的优化类
    body.classList.add(`battery-${mode.name.replace('_', '-')}`);
    
    // 动态调整CSS变量
    document.documentElement.style.setProperty('--battery-animation-duration', 
      mode.enableAnimations ? '300ms' : '0ms');
    document.documentElement.style.setProperty('--battery-backdrop-filter',
      mode.enableBlur ? 'blur(8px)' : 'none');
    document.documentElement.style.setProperty('--battery-transform-style',
      mode.enableParallax ? 'preserve-3d' : 'flat');
  }
  
  /**
   * 调整定时器和动画
   */
  private adjustTimersAndAnimations(): void {
    const mode = this.currentPowerMode;
    
    // 清除之前的优化定时器
    this.optimizationTimers.forEach((timerId, key) => {
      clearTimeout(timerId);
    });
    this.optimizationTimers.clear();
    
    // 如果是节能模式，设置延迟优化
    if (mode.name === 'power-saver' || mode.name === 'ultra-saver') {
      // 延迟执行非关键更新
      const delayMs = mode.name === 'ultra-saver' ? 1000 : 500;
      
      const timerId = window.setTimeout(() => {
        this.performDeferredOptimizations();
      }, delayMs);
      
      this.optimizationTimers.set('deferred-optimizations', timerId);
    }
  }
  
  /**
   * 执行延迟优化
   */
  private performDeferredOptimizations(): void {
    console.log('🔧 执行延迟电池优化');
    
    // 强制垃圾回收
    if (this.externalOptimizers.memoryManager) {
      this.externalOptimizers.memoryManager.performGlobalGC();
    }
    
    // 清理未使用的缓存
    if (this.externalOptimizers.connectionRenderer) {
      this.externalOptimizers.connectionRenderer.clearUnusedCache();
    }
    
    this.metrics.optimizationsSaved++;
  }
  
  /**
   * 调整后台优化
   */
  private adjustBackgroundOptimizations(): void {
    const throttleFactor = this.isPageVisible ? 1.0 : this.config.backgroundThrottleFactor;
    
    // 调整所有优化器的后台模式
    Object.values(this.externalOptimizers).forEach(optimizer => {
      if (optimizer && typeof optimizer.setBackgroundMode === 'function') {
        optimizer.setBackgroundMode(!this.isPageVisible, throttleFactor);
      }
    });
    
    // 页面隐藏时暂停非必要的定时器
    if (!this.isPageVisible) {
      console.log('😴 页面进入后台，启用节能模式');
      this.pauseNonEssentialTimers();
    } else {
      console.log('👀 页面回到前台，恢复正常模式');
      this.resumeNonEssentialTimers();
    }
  }
  
  /**
   * 暂停非必要定时器
   */
  private pauseNonEssentialTimers(): void {
    // 这里可以暂停一些非必要的定时更新
    // 具体实现根据应用需求调整
  }
  
  /**
   * 恢复非必要定时器
   */
  private resumeNonEssentialTimers(): void {
    // 恢复暂停的定时器
    // 具体实现根据应用需求调整
  }
  
  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    const monitoringInterval = 2000; // 2秒
    
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.detectThermalThrottling();
      this.calculateBatterySavings();
    }, monitoringInterval);
  }
  
  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(): void {
    // 估算帧率（通过requestAnimationFrame测量）
    let frameCount = 0;
    const startTime = performance.now();
    
    const measureFrameRate = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;
      
      if (elapsed < 1000) {
        requestAnimationFrame(measureFrameRate);
      } else {
        this.metrics.frameRate = Math.round(frameCount * 1000 / elapsed);
        this.frameRateHistory.push(this.metrics.frameRate);
        
        if (this.frameRateHistory.length > 30) {
          this.frameRateHistory.shift();
        }
      }
    };
    
    requestAnimationFrame(measureFrameRate);
    
    // 估算内存压力
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usageRatio = usedMB / limitMB;
      
      if (usageRatio > 0.8) {
        this.metrics.memoryPressure = 'high';
      } else if (usageRatio > 0.6) {
        this.metrics.memoryPressure = 'medium';
      } else {
        this.metrics.memoryPressure = 'low';
      }
    }
  }
  
  /**
   * 检测热节流
   */
  private detectThermalThrottling(): void {
    if (!this.config.thermalThrottleEnabled) return;
    
    // 基于帧率下降检测热节流
    if (this.frameRateHistory.length >= 10) {
      const recentFrames = this.frameRateHistory.slice(-5);
      const avgRecentFrameRate = recentFrames.reduce((sum, fps) => sum + fps, 0) / recentFrames.length;
      const targetFrameRate = this.currentPowerMode.frameRate;
      
      if (avgRecentFrameRate < targetFrameRate * 0.7) {
        if (this.metrics.thermalState !== 'hot') {
          this.metrics.thermalState = 'hot';
          console.warn('🔥 检测到热节流，应用额外优化');
          this.applyThermalOptimizations();
        }
      } else if (avgRecentFrameRate < targetFrameRate * 0.85) {
        this.metrics.thermalState = 'warm';
      } else {
        this.metrics.thermalState = 'normal';
      }
    }
  }
  
  /**
   * 应用热优化
   */
  private applyThermalOptimizations(): void {
    // 临时降级到更节能的模式
    const currentModeIndex = Object.keys(this.config.powerModes).indexOf(this.currentPowerMode.name);
    const powerModeKeys = Object.keys(this.config.powerModes);
    
    if (currentModeIndex < powerModeKeys.length - 1) {
      const nextMode = powerModeKeys[currentModeIndex + 1];
      console.log(`🌡️ 热节流优化：临时切换到 ${nextMode}`);
      this.switchPowerMode(nextMode);
      
      // 5分钟后恢复
      setTimeout(() => {
        if (this.metrics.thermalState !== 'hot') {
          this.optimizePowerMode(); // 重新评估电源模式
        }
      }, 5 * 60 * 1000);
    }
  }
  
  /**
   * 计算电池节省
   */
  private calculateBatterySavings(): void {
    if (!this.batteryInfo) return;
    
    // 基于当前模式估算节省的电池使用时间
    const modeEfficiencyFactors = {
      'high-performance': 1.0,
      'balanced': 1.3,
      'power-saver': 1.8,
      'ultra-saver': 2.5
    };
    
    const currentFactor = modeEfficiencyFactors[this.currentPowerMode.name] || 1.0;
    const baseFactor = modeEfficiencyFactors['high-performance'];
    const savingsMultiplier = currentFactor / baseFactor;
    
    // 估算节省的时间（分钟）
    const baseBatteryLife = this.batteryInfo.dischargingTime / 60; // 转换为分钟
    this.metrics.estimatedBatterySavings = baseBatteryLife * (savingsMultiplier - 1);
  }
  
  /**
   * 注册外部优化器
   */
  registerOptimizer(type: string, optimizer: any): void {
    this.externalOptimizers[type] = optimizer;
    console.log(`🔗 注册外部优化器: ${type}`);
  }
  
  /**
   * 触发电源模式切换事件
   */
  private emitPowerModeChangeEvent(oldMode: PowerMode, newMode: PowerMode): void {
    const event = new CustomEvent('power-mode-change', {
      detail: {
        oldMode: oldMode.name,
        newMode: newMode.name,
        batteryLevel: this.metrics.batteryLevel,
        isCharging: this.metrics.isCharging,
        optimizations: {
          frameRate: newMode.frameRate,
          animations: newMode.enableAnimations,
          details: newMode.connectionLineDetail
        }
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * 手动切换电源模式
   */
  setManualPowerMode(modeName: string): void {
    if (this.config.powerModes[modeName]) {
      console.log(`🎛️ 手动切换电源模式: ${modeName}`);
      this.switchPowerMode(modeName);
    } else {
      console.error(`❌ 未知的电源模式: ${modeName}`);
    }
  }
  
  /**
   * 获取优化指标
   */
  getOptimizationMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 获取电池信息
   */
  getBatteryInfo(): BatteryInfo | null {
    return this.batteryInfo;
  }
  
  /**
   * 获取当前电源模式
   */
  getCurrentPowerMode(): PowerMode {
    return { ...this.currentPowerMode };
  }
  
  /**
   * 输出优化报告
   */
  printOptimizationReport(): void {
    const battery = this.batteryInfo;
    const savings = this.metrics.estimatedBatterySavings;
    
    console.log('🔋 电池优化器性能报告');
    console.log('================================');
    console.log(`当前模式: ${this.metrics.currentMode}`);
    console.log(`电池电量: ${battery ? (battery.level * 100).toFixed(1) + '%' : '未知'}`);
    console.log(`充电状态: ${this.metrics.isCharging ? '充电中' : '未充电'}`);
    console.log(`页面状态: ${this.metrics.isVisible ? '可见' : '后台'}`);
    console.log(`帧率: ${this.metrics.frameRate}fps (目标: ${this.currentPowerMode.frameRate}fps)`);
    console.log(`内存压力: ${this.metrics.memoryPressure}`);
    console.log(`热状态: ${this.metrics.thermalState}`);
    console.log(`优化次数: ${this.metrics.optimizationsSaved}`);
    
    if (savings > 0) {
      console.log(`估计节省电池: ${savings.toFixed(1)}分钟`);
    }
    
    console.log('');
    
    // API支持状态
    console.log('API支持状态:');
    console.log(`  Battery API: ${this.supportsNavigatorBattery ? '✅' : '❌'}`);
    console.log(`  Visibility API: ${this.supportsVisibilityAPI ? '✅' : '❌'}`);
  }
  
  /**
   * 销毁优化器
   */
  destroy(): void {
    // 移除电池事件监听器
    this.batteryChangeHandlers.forEach(handler => handler());
    this.batteryChangeHandlers.length = 0;
    
    // 移除可见性监听器
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    
    // 清理定时器
    this.optimizationTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.optimizationTimers.clear();
    
    // 清理数据
    this.externalOptimizers = {};
    this.frameRateHistory.length = 0;
    this.cpuUsageHistory.length = 0;
    
    console.log('🧹 移动端电池优化器已销毁');
  }
}

// 全局电池优化器实例
export const globalBatteryOptimizer = new MobileBatteryOptimizer({
  enableBatteryAPI: true,
  enableVisibilityAPI: true,
  adaptiveQuality: true,
  thermalThrottleEnabled: true
});

// 导出用于CSS的电池优化样式
export const batteryOptimizationCSS = `
  /* 高性能模式 */
  .battery-high-performance {
    --animation-duration: 300ms;
    --backdrop-filter: blur(8px);
    --transform-style: preserve-3d;
    --box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  }

  /* 平衡模式 */
  .battery-balanced {
    --animation-duration: 200ms;
    --backdrop-filter: blur(4px);
    --transform-style: flat;
    --box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  /* 节能模式 */
  .battery-power-saver {
    --animation-duration: 0ms;
    --backdrop-filter: none;
    --transform-style: flat;
    --box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  
  .battery-power-saver * {
    transition: none !important;
    animation: none !important;
  }

  /* 超级节能模式 */
  .battery-ultra-saver {
    --animation-duration: 0ms;
    --backdrop-filter: none;
    --transform-style: flat;
    --box-shadow: none;
  }
  
  .battery-ultra-saver * {
    transition: none !important;
    animation: none !important;
    transform: none !important;
    filter: none !important;
  }
`;

// 自动注入优化CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = batteryOptimizationCSS;
  document.head.appendChild(style);
}