/**
 * 应用程序主类
 * Main Application Class
 */

import { Application as PixiApplication, IApplicationOptions } from 'pixi.js'
import { EventBus } from './EventSystem'
import { StateManager } from './StateManager'
import { SceneManager } from './SceneManager'
import { PerformanceManager } from './PerformanceManager'
import { MemoryManager } from './MemoryManager'
import { Logger } from './Logger'
import { 
  ApplicationConfig, 
  ApplicationLifecycle, 
  SystemConfig,
  Plugin 
} from './types'

export class Application implements ApplicationLifecycle {
  private static _instance: Application | null = null
  
  private _pixiApp: PixiApplication
  private _config: SystemConfig
  private _eventBus: EventBus
  private _stateManager: StateManager
  private _sceneManager: SceneManager
  private _performanceManager: PerformanceManager
  private _memoryManager: MemoryManager
  private _logger: Logger
  private _plugins: Map<string, Plugin> = new Map()
  
  private _isInitialized = false
  private _isRunning = false
  private _lastFrameTime = 0

  constructor(config: SystemConfig) {
    if (Application._instance) {
      throw new Error('Application is a singleton. Use Application.getInstance() instead.')
    }
    
    this._config = config
    this._logger = new Logger(config.logging)
    this._eventBus = new EventBus(this._logger)
    this._stateManager = new StateManager(this._eventBus, this._logger)
    this._memoryManager = new MemoryManager(config.memory, this._logger)
    this._performanceManager = new PerformanceManager(config.performance, this._logger)
    
    // 创建PixiJS应用实例
    this._pixiApp = new PixiApplication()
    
    this._sceneManager = new SceneManager(
      this._pixiApp.stage, 
      this._eventBus, 
      this._logger
    )
    
    Application._instance = this
  }

  static getInstance(): Application {
    if (!Application._instance) {
      throw new Error('Application not initialized. Create an instance first.')
    }
    return Application._instance
  }

  static create(config: SystemConfig): Application {
    return new Application(config)
  }

  // 应用程序生命周期
  async onInit(): Promise<void> {
    if (this._isInitialized) {
      this._logger.warn('Application already initialized')
      return
    }

    try {
      this._logger.info('Initializing application...')
      
      // 初始化PixiJS应用
      const pixiOptions: Partial<IApplicationOptions> = {
        width: this._config.application.width,
        height: this._config.application.height,
        backgroundColor: this._config.application.backgroundColor,
        resolution: this._config.application.resolution,
        antialias: this._config.application.antialias,
        powerPreference: this._config.application.powerPreference
      }
      
      await this._pixiApp.init(pixiOptions)
      
      // 设置画布样式
      this.setupCanvas()
      
      // 初始化各个管理器
      await this._memoryManager.init()
      await this._performanceManager.init()
      await this._sceneManager.init()
      
      // 安装插件
      await this.installPlugins()
      
      // 设置事件监听
      this.setupEventListeners()
      
      // 启动渲染循环
      this._pixiApp.ticker.add(this.gameLoop, this)
      
      this._isInitialized = true
      this._eventBus.emit('application:initialized')
      this._logger.info('Application initialized successfully')
      
    } catch (error) {
      this._logger.error('Failed to initialize application', error)
      throw error
    }
  }

  onStart(): void {
    if (!this._isInitialized) {
      throw new Error('Application must be initialized before starting')
    }
    
    if (this._isRunning) {
      this._logger.warn('Application already running')
      return
    }

    this._logger.info('Starting application...')
    this._pixiApp.ticker.start()
    this._isRunning = true
    this._eventBus.emit('application:started')
  }

  onPause(): void {
    if (!this._isRunning) return
    
    this._logger.info('Pausing application...')
    this._pixiApp.ticker.stop()
    this._isRunning = false
    this._eventBus.emit('application:paused')
  }

  onResume(): void {
    if (this._isRunning) return
    
    this._logger.info('Resuming application...')
    this._pixiApp.ticker.start()
    this._isRunning = true
    this._eventBus.emit('application:resumed')
  }

  onDestroy(): void {
    this._logger.info('Destroying application...')
    
    // 停止渲染循环
    this._pixiApp.ticker.remove(this.gameLoop, this)
    
    // 卸载插件
    this.uninstallPlugins()
    
    // 销毁各个管理器
    this._sceneManager.destroy()
    this._performanceManager.destroy()
    this._memoryManager.destroy()
    
    // 销毁PixiJS应用
    this._pixiApp.destroy(true, { children: true, texture: true })
    
    // 清理事件总线
    this._eventBus.clear()
    
    this._isInitialized = false
    this._isRunning = false
    
    Application._instance = null
    this._eventBus.emit('application:destroyed')
  }

  // 游戏主循环
  private gameLoop(): void {
    const currentTime = performance.now()
    const deltaTime = currentTime - this._lastFrameTime
    this._lastFrameTime = currentTime

    try {
      // 更新性能监控
      this._performanceManager.update(deltaTime)
      
      // 更新场景管理器
      this._sceneManager.update(deltaTime)
      
      // 更新内存管理器
      this._memoryManager.update()
      
      // 发出帧更新事件
      this._eventBus.emit('application:frame', { deltaTime, currentTime })
      
    } catch (error) {
      this._logger.error('Error in game loop', error)
      // 在生产环境中，可能需要实现错误恢复策略
    }
  }

  // 设置画布
  private setupCanvas(): void {
    const canvas = this._pixiApp.canvas
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.touchAction = 'none'
    
    // 添加到DOM
    document.body.appendChild(canvas)
  }

  // 设置事件监听
  private setupEventListeners(): void {
    // 窗口调整大小
    window.addEventListener('resize', this.onResize.bind(this))
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this))
    
    // 内存压力警告
    if ('memory' in performance) {
      this.setupMemoryPressureHandler()
    }
  }

  // 窗口调整大小处理
  private onResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    
    this._pixiApp.renderer.resize(width, height)
    this._eventBus.emit('application:resize', { width, height })
  }

  // 页面可见性变化处理
  private onVisibilityChange(): void {
    if (document.hidden) {
      this.onPause()
    } else {
      this.onResume()
    }
  }

  // 内存压力处理
  private setupMemoryPressureHandler(): void {
    // 现代浏览器的内存压力API
    if ('memory' in performance && 'addEventListener' in performance.memory) {
      // @ts-ignore - 实验性API
      performance.memory.addEventListener('memorywarning', () => {
        this._logger.warn('Memory pressure detected')
        this._memoryManager.performEmergencyCleanup()
        this._eventBus.emit('application:memory-pressure')
      })
    }
  }

  // 插件管理
  async installPlugin(plugin: Plugin): Promise<void> {
    try {
      if (this._plugins.has(plugin.name)) {
        throw new Error(`Plugin ${plugin.name} already installed`)
      }
      
      plugin.install(this._pixiApp)
      this._plugins.set(plugin.name, plugin)
      this._logger.info(`Plugin ${plugin.name} installed successfully`)
      
    } catch (error) {
      this._logger.error(`Failed to install plugin ${plugin.name}`, error)
      throw error
    }
  }

  private async installPlugins(): Promise<void> {
    // 根据配置安装插件
    for (const [pluginName, pluginConfig] of Object.entries(this._config.plugins)) {
      try {
        // 这里应该根据插件名称动态加载插件
        // const plugin = await import(`./plugins/${pluginName}`)
        // await this.installPlugin(new plugin.default(pluginConfig))
      } catch (error) {
        this._logger.error(`Failed to load plugin ${pluginName}`, error)
      }
    }
  }

  private uninstallPlugins(): void {
    for (const [name, plugin] of this._plugins) {
      try {
        plugin.uninstall()
        this._logger.info(`Plugin ${name} uninstalled`)
      } catch (error) {
        this._logger.error(`Failed to uninstall plugin ${name}`, error)
      }
    }
    this._plugins.clear()
  }

  // Getters
  get pixiApp(): PixiApplication {
    return this._pixiApp
  }

  get config(): SystemConfig {
    return this._config
  }

  get eventBus(): EventBus {
    return this._eventBus
  }

  get stateManager(): StateManager {
    return this._stateManager
  }

  get sceneManager(): SceneManager {
    return this._sceneManager
  }

  get performanceManager(): PerformanceManager {
    return this._performanceManager
  }

  get memoryManager(): MemoryManager {
    return this._memoryManager
  }

  get logger(): Logger {
    return this._logger
  }

  get isInitialized(): boolean {
    return this._isInitialized
  }

  get isRunning(): boolean {
    return this._isRunning
  }
}