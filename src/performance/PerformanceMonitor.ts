/**
 * 性能监控和自适应降级系统 - 实时监控并自动优化性能
 * 
 * 核心功能：
 * 1. 实时性能监控：FPS、内存、CPU使用率等关键指标
 * 2. 自适应降级：根据性能表现自动调整质量等级
 * 3. 瓶颈检测：识别性能瓶颈并提供优化建议
 * 4. 预警系统：性能问题提前预警和处理
 * 5. 性能报告：详细的性能分析和优化建议
 */

export interface PerformanceMetrics {
  // 帧率相关
  fps: number;
  frameTime: number; // 平均帧时间（毫秒）
  frameDrops: number; // 掉帧次数
  
  // 内存相关
  memoryUsage: {
    used: number; // 已使用内存（MB）
    total: number; // 总内存（MB）
    limit: number; // 内存限制（MB）
    pressure: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // CPU相关
  cpuUsage: number; // CPU使用率估算
  taskExecutionTime: number; // 任务执行时间
  
  // 网络相关
  networkLatency: number; // 网络延迟
  downloadSpeed: number; // 下载速度
  
  // 用户体验指标
  inputLatency: number; // 输入延迟
  scrollLatency: number; // 滚动延迟
  
  // 系统状态
  batteryLevel: number; // 电池电量
  thermalState: 'normal' | 'warm' | 'hot';
  
  // 自定义指标
  customMetrics: Record<string, number>;
}

export interface PerformanceProfile {
  name: 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
  description: string;
  thresholds: {
    minFPS: number;
    maxFrameTime: number;
    maxMemoryUsage: number;
    maxCPUUsage: number;
  };
  optimizations: {
    virtualScrollBuffer: number;
    connectionDetail: 'high' | 'medium' | 'low';
    animationQuality: 'high' | 'medium' | 'low' | 'disabled';
    effectsEnabled: boolean;
    memoryPoolSize: number;
    renderFrequency: number; // 渲染频率倍数
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  category: 'fps' | 'memory' | 'cpu' | 'network' | 'thermal';
  message: string;
  value: number;
  threshold: number;
  suggestion: string;
  timestamp: number;
}

export interface AdaptiveSettings {
  enableAutoDowngrade: boolean; // 启用自动降级
  enableAutoUpgrade: boolean; // 启用自动升级
  downgradeThreshold: number; // 降级阈值（连续不达标次数）
  upgradeThreshold: number; // 升级阈值（连续达标次数）
  monitoringInterval: number; // 监控间隔（毫秒）
  alertThresholds: Record<string, number>;
}

/**
 * 性能监控器主类
 */
export class PerformanceMonitor {
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private metrics: PerformanceMetrics;
  private currentProfile: PerformanceProfile;
  private settings: AdaptiveSettings;
  
  // 性能历史记录
  private metricsHistory: PerformanceMetrics[] = [];
  private profileHistory: Array<{ profile: string; timestamp: number }> = [];
  
  // 监控状态
  private frameCount = 0;
  private lastFrameTime = 0;
  private performanceEntries: PerformanceEntry[] = [];
  
  // 自适应逻辑
  private consecutiveUnderperforming = 0;
  private consecutivePerforming = 0;
  private lastProfileChange = 0;
  private profileChangeDebounce = 5000; // 5秒防抖
  
  // 预警系统
  private activeAlerts = new Map<string, PerformanceAlert>();
  private alertHandlers: Set<(alert: PerformanceAlert) => void> = new Set();
  
  // 外部优化器引用
  private optimizers: Record<string, any> = {};
  
  // 性能配置文件
  private profiles: Record<string, PerformanceProfile> = {
    ultra: {
      name: 'ultra',
      description: '极致性能模式',
      thresholds: {
        minFPS: 55,
        maxFrameTime: 18,
        maxMemoryUsage: 200,
        maxCPUUsage: 0.8
      },
      optimizations: {
        virtualScrollBuffer: 15,
        connectionDetail: 'high',
        animationQuality: 'high',
        effectsEnabled: true,
        memoryPoolSize: 1.2,
        renderFrequency: 1
      }
    },
    high: {
      name: 'high',
      description: '高性能模式',
      thresholds: {
        minFPS: 45,
        maxFrameTime: 22,
        maxMemoryUsage: 150,
        maxCPUUsage: 0.7
      },
      optimizations: {
        virtualScrollBuffer: 10,
        connectionDetail: 'high',
        animationQuality: 'high',
        effectsEnabled: true,
        memoryPoolSize: 1.0,
        renderFrequency: 1
      }
    },
    medium: {
      name: 'medium',
      description: '平衡性能模式',
      thresholds: {
        minFPS: 30,
        maxFrameTime: 33,
        maxMemoryUsage: 100,
        maxCPUUsage: 0.6
      },
      optimizations: {
        virtualScrollBuffer: 8,
        connectionDetail: 'medium',
        animationQuality: 'medium',
        effectsEnabled: true,
        memoryPoolSize: 0.8,
        renderFrequency: 1.5
      }
    },
    low: {
      name: 'low',
      description: '低性能模式',
      thresholds: {
        minFPS: 20,
        maxFrameTime: 50,
        maxMemoryUsage: 80,
        maxCPUUsage: 0.5
      },
      optimizations: {
        virtualScrollBuffer: 5,
        connectionDetail: 'low',
        animationQuality: 'low',
        effectsEnabled: false,
        memoryPoolSize: 0.6,
        renderFrequency: 2
      }
    },
    minimal: {
      name: 'minimal',
      description: '最小性能模式',
      thresholds: {
        minFPS: 15,
        maxFrameTime: 66,
        maxMemoryUsage: 60,
        maxCPUUsage: 0.4
      },
      optimizations: {
        virtualScrollBuffer: 3,
        connectionDetail: 'low',
        animationQuality: 'disabled',
        effectsEnabled: false,
        memoryPoolSize: 0.4,
        renderFrequency: 3
      }
    }
  };
  
  constructor() {
    this.currentProfile = this.profiles.medium;
    
    this.settings = {
      enableAutoDowngrade: true,
      enableAutoUpgrade: true,
      downgradeThreshold: 3,
      upgradeThreshold: 5,
      monitoringInterval: 1000,
      alertThresholds: {
        fps: 25,
        memory: 120,
        cpu: 0.75,
        frameTime: 40
      }
    };
    
    this.metrics = this.initializeMetrics();
    
    this.setupPerformanceObservers();
    
    console.log('📊 性能监控器初始化完成', {
      profile: this.currentProfile.name,
      autoAdaptive: this.settings.enableAutoDowngrade || this.settings.enableAutoUpgrade
    });
  }
  
  /**
   * 初始化指标
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16,
      frameDrops: 0,
      memoryUsage: {
        used: 0,
        total: 0,
        limit: 0,
        pressure: 'low'
      },
      cpuUsage: 0,
      taskExecutionTime: 0,
      networkLatency: 0,
      downloadSpeed: 0,
      inputLatency: 0,
      scrollLatency: 0,
      batteryLevel: 1,
      thermalState: 'normal',
      customMetrics: {}
    };
  }
  
  /**
   * 设置性能观察器
   */
  private setupPerformanceObservers(): void {
    // Performance Observer for frame timing
    if ('PerformanceObserver' in window) {
      try {
        // 监控渲染性能
        const renderObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          this.performanceEntries.push(...entries);
          
          // 保持条目数量在合理范围内
          if (this.performanceEntries.length > 100) {
            this.performanceEntries = this.performanceEntries.slice(-50);
          }
        });
        
        renderObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        
        // 监控长任务
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.duration > 50) { // 长于50ms的任务
              console.warn(`⏰ 检测到长任务: ${entry.duration.toFixed(2)}ms`);
              this.metrics.taskExecutionTime = Math.max(this.metrics.taskExecutionTime, entry.duration);
              
              this.createAlert('warning', 'cpu', 
                `检测到长任务执行: ${entry.duration.toFixed(2)}ms`,
                entry.duration, 50,
                '考虑将长任务分解为较小的块或使用Web Worker'
              );
            }
          });
        });
        
        if ('longtask' in PerformanceObserver.supportedEntryTypes) {
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        }
        
      } catch (error) {
        console.warn('⚠️ Performance Observer setup failed:', error);
      }
    }
    
    // 监控页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });
  }
  
  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    // 开始帧率监控
    this.startFrameRateMonitoring();
    
    // 定期监控其他指标
    this.monitoringInterval = window.setInterval(() => {
      this.updatePerformanceMetrics();
      this.evaluatePerformance();
      this.checkForAlerts();
    }, this.settings.monitoringInterval);
    
    console.log('🚀 性能监控已启动');
  }
  
  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('⏹️ 性能监控已停止');
  }
  
  /**
   * 暂停监控
   */
  private pauseMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('⏸️ 性能监控已暂停（页面隐藏）');
  }
  
  /**
   * 恢复监控
   */
  private resumeMonitoring(): void {
    if (this.isMonitoring && !this.monitoringInterval) {
      this.monitoringInterval = window.setInterval(() => {
        this.updatePerformanceMetrics();
        this.evaluatePerformance();
        this.checkForAlerts();
      }, this.settings.monitoringInterval);
      console.log('▶️ 性能监控已恢复');
    }
  }
  
  /**
   * 开始帧率监控
   */
  private startFrameRateMonitoring(): void {
    let frames = 0;
    let startTime = performance.now();
    
    const measureFrameRate = () => {
      if (!this.isMonitoring) return;
      
      frames++;
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      
      // 每秒计算一次帧率
      if (elapsed >= 1000) {
        this.metrics.fps = Math.round((frames * 1000) / elapsed);
        this.metrics.frameTime = elapsed / frames;
        
        if (this.metrics.fps < this.currentProfile.thresholds.minFPS) {
          this.metrics.frameDrops++;
        }
        
        frames = 0;
        startTime = currentTime;
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }
  
  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(): void {
    // 内存使用情况
    if (performance.memory) {
      const memory = performance.memory;
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024,
        limit: memory.jsHeapSizeLimit / 1024 / 1024,
        pressure: this.calculateMemoryPressure(memory)
      };
    }
    
    // CPU使用率估算（基于任务执行时间）
    this.metrics.cpuUsage = this.estimateCPUUsage();
    
    // 网络延迟（基于资源加载时间）
    this.updateNetworkMetrics();
    
    // 输入延迟（基于事件处理时间）
    this.updateInputLatency();
    
    // 记录历史
    this.recordMetricsHistory();
  }
  
  /**
   * 计算内存压力
   */
  private calculateMemoryPressure(memory: any): 'low' | 'medium' | 'high' | 'critical' {
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (usageRatio > 0.9) return 'critical';
    if (usageRatio > 0.7) return 'high';
    if (usageRatio > 0.5) return 'medium';
    return 'low';
  }
  
  /**
   * 估算CPU使用率
   */
  private estimateCPUUsage(): number {
    const recentTasks = this.performanceEntries
      .filter(entry => entry.entryType === 'measure')
      .slice(-10);
    
    if (recentTasks.length === 0) return this.metrics.cpuUsage * 0.9; // 衰减
    
    const avgTaskTime = recentTasks.reduce((sum, entry) => sum + entry.duration, 0) / recentTasks.length;
    
    // 基于任务执行时间估算CPU使用率
    const cpuUsage = Math.min(1, avgTaskTime / 16); // 16ms为60fps基准
    
    // 应用平滑滤波
    return this.metrics.cpuUsage * 0.7 + cpuUsage * 0.3;
  }
  
  /**
   * 更新网络指标
   */
  private updateNetworkMetrics(): void {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      this.metrics.networkLatency = navigationEntry.responseStart - navigationEntry.requestStart;
    }
    
    // 基于最近的资源加载计算下载速度
    const recentResources = performance.getEntriesByType('resource').slice(-5);
    if (recentResources.length > 0) {
      const totalSize = recentResources.reduce((sum, entry: any) => {
        return sum + (entry.transferSize || 0);
      }, 0);
      
      const totalTime = recentResources.reduce((sum, entry) => {
        return sum + (entry.responseEnd - entry.responseStart);
      }, 0);
      
      if (totalTime > 0) {
        this.metrics.downloadSpeed = totalSize / totalTime; // bytes/ms
      }
    }
  }
  
  /**
   * 更新输入延迟
   */
  private updateInputLatency(): void {
    // 这里可以通过测量事件处理时间来估算输入延迟
    // 实际实现需要在事件处理器中记录时间戳
    
    // 基于帧时间估算输入延迟
    this.metrics.inputLatency = this.metrics.frameTime;
    this.metrics.scrollLatency = Math.max(16, this.metrics.frameTime);
  }
  
  /**
   * 记录指标历史
   */
  private recordMetricsHistory(): void {
    const metricsSnapshot = JSON.parse(JSON.stringify(this.metrics));
    metricsSnapshot.timestamp = Date.now();
    
    this.metricsHistory.push(metricsSnapshot);
    
    // 只保留最近100条记录
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }
  
  /**
   * 评估性能并执行自适应调整
   */
  private evaluatePerformance(): void {
    const profile = this.currentProfile;
    const metrics = this.metrics;
    
    // 检查是否满足当前配置的性能要求
    const meetsFPSRequirement = metrics.fps >= profile.thresholds.minFPS;
    const meetsFrameTimeRequirement = metrics.frameTime <= profile.thresholds.maxFrameTime;
    const meetsMemoryRequirement = metrics.memoryUsage.used <= profile.thresholds.maxMemoryUsage;
    const meetsCPURequirement = metrics.cpuUsage <= profile.thresholds.maxCPUUsage;
    
    const meetsRequirements = meetsFPSRequirement && 
                            meetsFrameTimeRequirement && 
                            meetsMemoryRequirement && 
                            meetsCPURequirement;
    
    if (meetsRequirements) {
      this.consecutivePerforming++;
      this.consecutiveUnderperforming = 0;
      
      // 检查是否可以升级性能等级
      if (this.settings.enableAutoUpgrade && 
          this.consecutivePerforming >= this.settings.upgradeThreshold) {
        this.attemptUpgrade();
      }
    } else {
      this.consecutiveUnderperforming++;
      this.consecutivePerforming = 0;
      
      // 检查是否需要降级性能等级
      if (this.settings.enableAutoDowngrade && 
          this.consecutiveUnderperforming >= this.settings.downgradeThreshold) {
        this.attemptDowngrade();
      }
    }
  }
  
  /**
   * 尝试升级性能等级
   */
  private attemptUpgrade(): void {
    const profileNames = Object.keys(this.profiles);
    const currentIndex = profileNames.indexOf(this.currentProfile.name);
    
    if (currentIndex < profileNames.length - 1) {
      const nextProfile = profileNames[currentIndex + 1];
      this.switchProfile(nextProfile, 'auto-upgrade');
    }
    
    this.consecutivePerforming = 0;
  }
  
  /**
   * 尝试降级性能等级
   */
  private attemptDowngrade(): void {
    const profileNames = Object.keys(this.profiles);
    const currentIndex = profileNames.indexOf(this.currentProfile.name);
    
    if (currentIndex > 0) {
      const prevProfile = profileNames[currentIndex - 1];
      this.switchProfile(prevProfile, 'auto-downgrade');
    }
    
    this.consecutiveUnderperforming = 0;
  }
  
  /**
   * 切换性能配置
   */
  switchProfile(profileName: string, reason = 'manual'): boolean {
    const newProfile = this.profiles[profileName];
    if (!newProfile || newProfile.name === this.currentProfile.name) {
      return false;
    }
    
    const now = Date.now();
    if (now - this.lastProfileChange < this.profileChangeDebounce) {
      console.log(`⏰ 性能配置切换被防抖限制，等待${this.profileChangeDebounce}ms`);
      return false;
    }
    
    const oldProfile = this.currentProfile;
    this.currentProfile = newProfile;
    this.lastProfileChange = now;
    
    // 记录配置切换历史
    this.profileHistory.push({
      profile: newProfile.name,
      timestamp: now
    });
    
    // 应用新的优化设置
    this.applyProfileOptimizations();
    
    console.log(`🎛️ 性能配置切换: ${oldProfile.name} → ${newProfile.name} (${reason})`);
    
    // 触发配置切换事件
    this.emitProfileChangeEvent(oldProfile, newProfile, reason);
    
    return true;
  }
  
  /**
   * 应用配置优化
   */
  private applyProfileOptimizations(): void {
    const optimizations = this.currentProfile.optimizations;
    
    // 更新各个优化器的配置
    if (this.optimizers.virtualScroll) {
      this.optimizers.virtualScroll.updateConfig({
        bufferSize: optimizations.virtualScrollBuffer
      });
    }
    
    if (this.optimizers.connectionRenderer) {
      this.optimizers.connectionRenderer.updateConfig({
        detail: optimizations.connectionDetail,
        maxFPS: 60 / optimizations.renderFrequency
      });
    }
    
    if (this.optimizers.memoryManager) {
      this.optimizers.memoryManager.adjustPoolSizes(optimizations.memoryPoolSize);
    }
    
    // 应用CSS类
    this.applyCSSOptimizations();
  }
  
  /**
   * 应用CSS优化
   */
  private applyCSSOptimizations(): void {
    const body = document.body;
    const profile = this.currentProfile;
    
    // 移除旧的性能类
    body.classList.remove('perf-ultra', 'perf-high', 'perf-medium', 'perf-low', 'perf-minimal');
    
    // 添加新的性能类
    body.classList.add(`perf-${profile.name}`);
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--animation-quality', profile.optimizations.animationQuality);
    document.documentElement.style.setProperty('--effects-enabled', profile.optimizations.effectsEnabled ? '1' : '0');
  }
  
  /**
   * 检查预警
   */
  private checkForAlerts(): void {
    const metrics = this.metrics;
    const thresholds = this.settings.alertThresholds;
    
    // FPS预警
    if (metrics.fps < thresholds.fps) {
      this.createAlert('warning', 'fps', 
        `帧率过低: ${metrics.fps}fps`,
        metrics.fps, thresholds.fps,
        '考虑降低渲染质量或减少同时显示的元素数量'
      );
    }
    
    // 内存预警
    if (metrics.memoryUsage.used > thresholds.memory) {
      this.createAlert('warning', 'memory',
        `内存使用过高: ${metrics.memoryUsage.used.toFixed(1)}MB`,
        metrics.memoryUsage.used, thresholds.memory,
        '执行垃圾回收或清理缓存'
      );
    }
    
    // CPU预警
    if (metrics.cpuUsage > thresholds.cpu) {
      this.createAlert('warning', 'cpu',
        `CPU使用率过高: ${(metrics.cpuUsage * 100).toFixed(1)}%`,
        metrics.cpuUsage, thresholds.cpu,
        '减少计算密集型操作或使用Web Worker'
      );
    }
    
    // 帧时间预警
    if (metrics.frameTime > thresholds.frameTime) {
      this.createAlert('warning', 'fps',
        `帧时间过长: ${metrics.frameTime.toFixed(2)}ms`,
        metrics.frameTime, thresholds.frameTime,
        '优化渲染逻辑或减少DOM操作'
      );
    }
    
    // 清理过期预警
    this.cleanupExpiredAlerts();
  }
  
  /**
   * 创建预警
   */
  private createAlert(
    type: 'warning' | 'critical',
    category: string,
    message: string,
    value: number,
    threshold: number,
    suggestion: string
  ): void {
    const alertId = `${category}-${Date.now()}`;
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      category: category as any,
      message,
      value,
      threshold,
      suggestion,
      timestamp: Date.now()
    };
    
    // 避免重复预警
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      a => a.category === category && a.type === type
    );
    
    if (!existingAlert || Date.now() - existingAlert.timestamp > 10000) {
      this.activeAlerts.set(alertId, alert);
      
      // 通知预警处理器
      this.alertHandlers.forEach(handler => {
        try {
          handler(alert);
        } catch (error) {
          console.error('预警处理器错误:', error);
        }
      });
      
      console.warn(`⚠️ 性能预警: ${message} (建议: ${suggestion})`);
    }
  }
  
  /**
   * 清理过期预警
   */
  private cleanupExpiredAlerts(): void {
    const expireTime = 30000; // 30秒
    const now = Date.now();
    
    this.activeAlerts.forEach((alert, id) => {
      if (now - alert.timestamp > expireTime) {
        this.activeAlerts.delete(id);
      }
    });
  }
  
  /**
   * 触发配置切换事件
   */
  private emitProfileChangeEvent(
    oldProfile: PerformanceProfile,
    newProfile: PerformanceProfile,
    reason: string
  ): void {
    const event = new CustomEvent('performance-profile-change', {
      detail: {
        oldProfile: oldProfile.name,
        newProfile: newProfile.name,
        reason,
        optimizations: newProfile.optimizations,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }
  
  /**
   * 注册优化器
   */
  registerOptimizer(name: string, optimizer: any): void {
    this.optimizers[name] = optimizer;
    console.log(`🔗 注册优化器: ${name}`);
  }
  
  /**
   * 添加预警处理器
   */
  onAlert(handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.add(handler);
  }
  
  /**
   * 移除预警处理器
   */
  offAlert(handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.delete(handler);
  }
  
  /**
   * 添加自定义指标
   */
  addCustomMetric(name: string, value: number): void {
    this.metrics.customMetrics[name] = value;
  }
  
  /**
   * 获取当前指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }
  
  /**
   * 获取当前配置
   */
  getCurrentProfile(): PerformanceProfile {
    return JSON.parse(JSON.stringify(this.currentProfile));
  }
  
  /**
   * 获取性能历史
   */
  getMetricsHistory(count = 50): PerformanceMetrics[] {
    return this.metricsHistory.slice(-count);
  }
  
  /**
   * 获取活跃预警
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }
  
  /**
   * 生成性能报告
   */
  generatePerformanceReport(): string {
    const metrics = this.metrics;
    const profile = this.currentProfile;
    const history = this.metricsHistory.slice(-10);
    
    const avgFPS = history.length > 0 
      ? history.reduce((sum, m) => sum + m.fps, 0) / history.length 
      : metrics.fps;
    
    const avgFrameTime = history.length > 0
      ? history.reduce((sum, m) => sum + m.frameTime, 0) / history.length
      : metrics.frameTime;
    
    return `
📊 性能监控报告
================================
当前配置: ${profile.name} (${profile.description})
监控时间: ${new Date().toLocaleString()}

## 核心指标
帧率: ${metrics.fps}fps (平均: ${avgFPS.toFixed(1)}fps)
帧时间: ${metrics.frameTime.toFixed(2)}ms (平均: ${avgFrameTime.toFixed(2)}ms)
掉帧次数: ${metrics.frameDrops}

## 资源使用
内存: ${metrics.memoryUsage.used.toFixed(1)}MB / ${metrics.memoryUsage.limit.toFixed(1)}MB
内存压力: ${metrics.memoryUsage.pressure}
CPU使用率: ${(metrics.cpuUsage * 100).toFixed(1)}%

## 用户体验
输入延迟: ${metrics.inputLatency.toFixed(2)}ms
滚动延迟: ${metrics.scrollLatency.toFixed(2)}ms
网络延迟: ${metrics.networkLatency.toFixed(2)}ms

## 系统状态
电池电量: ${(metrics.batteryLevel * 100).toFixed(1)}%
热状态: ${metrics.thermalState}

## 活跃预警
${this.getActiveAlerts().map(alert => `- ${alert.message}`).join('\n') || '无'}

## 配置历史
${this.profileHistory.slice(-5).map(h => 
  `${new Date(h.timestamp).toLocaleTimeString()}: ${h.profile}`
).join('\n')}

## 优化建议
${this.generateOptimizationSuggestions()}
`;
  }
  
  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(): string {
    const suggestions: string[] = [];
    const metrics = this.metrics;
    
    if (metrics.fps < 30) {
      suggestions.push('- 帧率过低，建议降低渲染质量或减少动画效果');
    }
    
    if (metrics.memoryUsage.pressure === 'high' || metrics.memoryUsage.pressure === 'critical') {
      suggestions.push('- 内存压力较高，建议清理缓存或减少内存使用');
    }
    
    if (metrics.cpuUsage > 0.7) {
      suggestions.push('- CPU使用率较高，建议优化算法或使用Web Worker');
    }
    
    if (metrics.frameDrops > 10) {
      suggestions.push('- 频繁掉帧，建议优化渲染流程或启用性能降级');
    }
    
    if (metrics.inputLatency > 50) {
      suggestions.push('- 输入延迟较高，建议优化事件处理逻辑');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('- 当前性能表现良好，无需特别优化');
    }
    
    return suggestions.join('\n');
  }
  
  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMonitoring();
    this.alertHandlers.clear();
    this.activeAlerts.clear();
    this.optimizers = {};
    this.metricsHistory.length = 0;
    this.profileHistory.length = 0;
    this.performanceEntries.length = 0;
    
    console.log('🧹 性能监控器已销毁');
  }
}

// 全局性能监控器实例
export const globalPerformanceMonitor = new PerformanceMonitor();

// 自动启动监控
if (typeof window !== 'undefined') {
  globalPerformanceMonitor.startMonitoring();
}

// 导出性能优化CSS
export const performanceOptimizationCSS = `
  /* 极致性能模式 */
  .perf-ultra {
    --render-quality: high;
    --animation-duration: 300ms;
    --effects-opacity: 1;
    --blur-radius: 8px;
  }

  /* 高性能模式 */
  .perf-high {
    --render-quality: high;
    --animation-duration: 250ms;
    --effects-opacity: 0.9;
    --blur-radius: 6px;
  }

  /* 平衡模式 */
  .perf-medium {
    --render-quality: medium;
    --animation-duration: 200ms;
    --effects-opacity: 0.7;
    --blur-radius: 4px;
  }

  /* 低性能模式 */
  .perf-low {
    --render-quality: low;
    --animation-duration: 100ms;
    --effects-opacity: 0.5;
    --blur-radius: 2px;
  }
  
  .perf-low * {
    transform: translateZ(0) !important;
    will-change: auto !important;
  }

  /* 最小性能模式 */
  .perf-minimal {
    --render-quality: minimal;
    --animation-duration: 0ms;
    --effects-opacity: 0;
    --blur-radius: 0px;
  }
  
  .perf-minimal * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    filter: none !important;
    backdrop-filter: none !important;
  }
`;

// 自动注入性能优化CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = performanceOptimizationCSS;
  document.head.appendChild(style);
}