/**
 * 系统配置
 * System Configuration
 */

import { 
  SystemConfig, 
  ApplicationConfig, 
  PerformanceConfig,
  LogLevel 
} from '../types'

/**
 * 默认应用配置
 */
export const defaultApplicationConfig: ApplicationConfig = {
  width: window.innerWidth || 1920,
  height: window.innerHeight || 1080,
  backgroundColor: 0x1a1a1a,
  resolution: window.devicePixelRatio || 1,
  antialias: true,
  powerPreference: 'high-performance'
}

/**
 * 默认性能配置
 */
export const defaultPerformanceConfig: PerformanceConfig = {
  targetFPS: 60,
  enableProfiling: process.env.NODE_ENV === 'development',
  enableMetrics: true,
  metricsUpdateInterval: 1000
}

/**
 * 默认系统配置
 */
export const defaultSystemConfig: SystemConfig = {
  application: defaultApplicationConfig,
  performance: defaultPerformanceConfig,
  logging: {
    level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
    categories: ['*'], // 所有分类
    outputs: process.env.NODE_ENV === 'development' 
      ? ['console', 'memory'] 
      : ['console', 'localStorage', 'remote']
  },
  memory: {
    gcThreshold: 0.8, // 80%内存使用率时触发GC
    maxObjects: 10000,
    poolSizes: {
      graphics: 50,
      container: 100,
      text: 30,
      point: 200,
      rectangle: 50
    }
  },
  plugins: {}
}

/**
 * 移动端配置覆盖
 */
export const mobileConfigOverrides: Partial<SystemConfig> = {
  application: {
    ...defaultApplicationConfig,
    resolution: Math.min(window.devicePixelRatio || 1, 2), // 限制移动端分辨率
    powerPreference: 'low-power' // 移动端优先节能
  },
  performance: {
    ...defaultPerformanceConfig,
    targetFPS: 30, // 移动端降低目标帧率
    metricsUpdateInterval: 2000 // 减少监控频率
  },
  memory: {
    gcThreshold: 0.7, // 移动端更早触发GC
    maxObjects: 5000, // 减少最大对象数
    poolSizes: {
      graphics: 25,
      container: 50,
      text: 15,
      point: 100,
      rectangle: 25
    }
  }
}

/**
 * 高性能配置
 */
export const highPerformanceConfig: Partial<SystemConfig> = {
  application: {
    ...defaultApplicationConfig,
    resolution: window.devicePixelRatio || 1,
    powerPreference: 'high-performance'
  },
  performance: {
    ...defaultPerformanceConfig,
    targetFPS: 120,
    metricsUpdateInterval: 500
  },
  memory: {
    gcThreshold: 0.9,
    maxObjects: 20000,
    poolSizes: {
      graphics: 100,
      container: 200,
      text: 60,
      point: 400,
      rectangle: 100
    }
  }
}

/**
 * 调试配置
 */
export const debugConfig: Partial<SystemConfig> = {
  logging: {
    level: LogLevel.DEBUG,
    categories: ['*'],
    outputs: ['console', 'memory', 'localStorage']
  },
  performance: {
    ...defaultPerformanceConfig,
    enableProfiling: true,
    enableMetrics: true,
    metricsUpdateInterval: 500
  }
}

/**
 * 生产环境配置
 */
export const productionConfig: Partial<SystemConfig> = {
  logging: {
    level: LogLevel.WARN,
    categories: ['error', 'performance'],
    outputs: ['remote']
  },
  performance: {
    ...defaultPerformanceConfig,
    enableProfiling: false,
    enableMetrics: true,
    metricsUpdateInterval: 5000
  }
}

/**
 * 配置工厂类
 */
export class ConfigFactory {
  /**
   * 创建系统配置
   */
  static createConfig(
    environment: 'development' | 'production' | 'test' = 'development',
    platform: 'desktop' | 'mobile' | 'tablet' = 'desktop',
    customOverrides: Partial<SystemConfig> = {}
  ): SystemConfig {
    let config = { ...defaultSystemConfig }

    // 应用环境配置
    switch (environment) {
      case 'development':
        config = this.mergeConfig(config, debugConfig)
        break
      case 'production':
        config = this.mergeConfig(config, productionConfig)
        break
      case 'test':
        config = this.mergeConfig(config, {
          logging: { level: LogLevel.ERROR, categories: [], outputs: [] }
        })
        break
    }

    // 应用平台配置
    if (platform === 'mobile') {
      config = this.mergeConfig(config, mobileConfigOverrides)
    }

    // 应用自定义覆盖
    config = this.mergeConfig(config, customOverrides)

    return config
  }

  /**
   * 根据设备能力创建配置
   */
  static createAdaptiveConfig(customOverrides: Partial<SystemConfig> = {}): SystemConfig {
    const platform = this.detectPlatform()
    const performance = this.detectPerformanceLevel()
    
    let baseConfig = defaultSystemConfig

    // 根据平台调整
    if (platform === 'mobile') {
      baseConfig = this.mergeConfig(baseConfig, mobileConfigOverrides)
    }

    // 根据性能调整
    if (performance === 'high') {
      baseConfig = this.mergeConfig(baseConfig, highPerformanceConfig)
    } else if (performance === 'low') {
      baseConfig = this.mergeConfig(baseConfig, {
        performance: { targetFPS: 30 },
        memory: { poolSizes: { graphics: 20, container: 30, text: 10, point: 50, rectangle: 20 } }
      })
    }

    return this.mergeConfig(baseConfig, customOverrides)
  }

  /**
   * 检测平台类型
   */
  private static detectPlatform(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof navigator === 'undefined') return 'desktop'

    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent)

    if (isTablet) return 'tablet'
    if (isMobile) return 'mobile'
    return 'desktop'
  }

  /**
   * 检测设备性能级别
   */
  private static detectPerformanceLevel(): 'low' | 'medium' | 'high' {
    if (typeof navigator === 'undefined') return 'medium'

    // 检查硬件并发数
    const cores = navigator.hardwareConcurrency || 4
    
    // 检查内存（如果可用）
    const memory = (navigator as any).deviceMemory || 4

    // 检查连接类型
    const connection = (navigator as any).connection
    const connectionType = connection?.effectiveType || '4g'

    // 简单的性能评估
    let score = 0
    
    if (cores >= 8) score += 3
    else if (cores >= 4) score += 2
    else score += 1

    if (memory >= 8) score += 3
    else if (memory >= 4) score += 2
    else score += 1

    if (connectionType === '4g') score += 2
    else if (connectionType === '3g') score += 1

    if (score >= 7) return 'high'
    if (score >= 4) return 'medium'
    return 'low'
  }

  /**
   * 深度合并配置对象
   */
  private static mergeConfig(base: SystemConfig, override: Partial<SystemConfig>): SystemConfig {
    const result = { ...base }

    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        const overrideValue = override[key as keyof SystemConfig]
        const baseValue = base[key as keyof SystemConfig]

        if (typeof overrideValue === 'object' && overrideValue !== null && !Array.isArray(overrideValue) &&
            typeof baseValue === 'object' && baseValue !== null && !Array.isArray(baseValue)) {
          // 递归合并对象
          (result as any)[key] = { ...baseValue, ...overrideValue }
        } else {
          // 直接覆盖
          (result as any)[key] = overrideValue
        }
      }
    }

    return result
  }

  /**
   * 验证配置有效性
   */
  static validateConfig(config: SystemConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证应用配置
    if (config.application.width <= 0) {
      errors.push('Application width must be greater than 0')
    }
    if (config.application.height <= 0) {
      errors.push('Application height must be greater than 0')
    }
    if (config.application.resolution <= 0) {
      errors.push('Application resolution must be greater than 0')
    }

    // 验证性能配置
    if (config.performance.targetFPS <= 0) {
      errors.push('Target FPS must be greater than 0')
    }
    if (config.performance.metricsUpdateInterval <= 0) {
      errors.push('Metrics update interval must be greater than 0')
    }

    // 验证内存配置
    if (config.memory.gcThreshold <= 0 || config.memory.gcThreshold > 1) {
      errors.push('GC threshold must be between 0 and 1')
    }
    if (config.memory.maxObjects <= 0) {
      errors.push('Max objects must be greater than 0')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 导出配置为JSON
   */
  static exportConfig(config: SystemConfig): string {
    return JSON.stringify(config, null, 2)
  }

  /**
   * 从JSON导入配置
   */
  static importConfig(json: string): SystemConfig {
    try {
      const config = JSON.parse(json)
      return this.mergeConfig(defaultSystemConfig, config)
    } catch (error) {
      throw new Error(`Failed to import config: ${error}`)
    }
  }
}

/**
 * 预设配置
 */
export const presetConfigs = {
  default: defaultSystemConfig,
  mobile: ConfigFactory.createConfig('production', 'mobile'),
  desktop: ConfigFactory.createConfig('production', 'desktop'),
  development: ConfigFactory.createConfig('development'),
  production: ConfigFactory.createConfig('production'),
  highPerformance: ConfigFactory.createConfig('production', 'desktop', highPerformanceConfig),
  adaptive: ConfigFactory.createAdaptiveConfig()
}

/**
 * 获取预设配置
 */
export function getPresetConfig(preset: keyof typeof presetConfigs): SystemConfig {
  return presetConfigs[preset]
}

/**
 * 创建自定义配置
 */
export function createCustomConfig(overrides: Partial<SystemConfig>): SystemConfig {
  return ConfigFactory.createConfig('development', 'desktop', overrides)
}