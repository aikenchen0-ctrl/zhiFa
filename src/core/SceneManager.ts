/**
 * 场景管理器
 * Scene Manager
 */

import { Container } from 'pixi.js'
import { EventBus } from './EventSystem'
import { 
  Scene, 
  SceneTransition,
  Logger 
} from './types'

/**
 * 基础场景实现
 */
export abstract class BaseScene implements Scene {
  public readonly name: string
  public readonly container: Container
  private _isActive = false

  constructor(name: string) {
    this.name = name
    this.container = new Container()
    this.container.name = name
  }

  get isActive(): boolean {
    return this._isActive
  }

  async activate(): Promise<void> {
    if (this._isActive) return
    
    this._isActive = true
    this.container.visible = true
    await this.onActivate()
  }

  async deactivate(): Promise<void> {
    if (!this._isActive) return
    
    this._isActive = false
    this.container.visible = false
    await this.onDeactivate()
  }

  // 抽象方法，子类必须实现
  abstract onCreate(props: any): void
  abstract onMount(): void
  abstract onUpdate(props: any, prevProps?: any): void
  abstract onUnmount(): void
  abstract onDestroy(): void
  abstract update(deltaTime: number): void
  abstract render(): void

  // 生命周期钩子，子类可以重写
  protected async onActivate(): Promise<void> {
    // 子类可以重写
  }

  protected async onDeactivate(): Promise<void> {
    // 子类可以重写
  }
}

/**
 * 场景过渡实现
 */
export class FadeTransition implements SceneTransition {
  public readonly name = 'fade'
  public duration = 300

  async execute(fromScene: Scene | null, toScene: Scene): Promise<void> {
    const promises: Promise<void>[] = []

    // 淡出当前场景
    if (fromScene) {
      promises.push(this.fadeOut(fromScene.container))
    }

    // 淡入新场景
    promises.push(this.fadeIn(toScene.container))

    await Promise.all(promises)
  }

  private async fadeOut(container: Container): Promise<void> {
    return new Promise(resolve => {
      const startAlpha = container.alpha
      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / this.duration, 1)
        
        container.alpha = startAlpha * (1 - progress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          container.visible = false
          resolve()
        }
      }

      animate()
    })
  }

  private async fadeIn(container: Container): Promise<void> {
    return new Promise(resolve => {
      container.alpha = 0
      container.visible = true
      
      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / this.duration, 1)
        
        container.alpha = progress
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      animate()
    })
  }
}

/**
 * 滑动过渡实现
 */
export class SlideTransition implements SceneTransition {
  public readonly name = 'slide'
  public duration = 400
  
  constructor(private direction: 'left' | 'right' | 'up' | 'down' = 'left') {}

  async execute(fromScene: Scene | null, toScene: Scene): Promise<void> {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    let fromOffset = { x: 0, y: 0 }
    let toStartOffset = { x: 0, y: 0 }
    
    switch (this.direction) {
      case 'left':
        fromOffset = { x: -screenWidth, y: 0 }
        toStartOffset = { x: screenWidth, y: 0 }
        break
      case 'right':
        fromOffset = { x: screenWidth, y: 0 }
        toStartOffset = { x: -screenWidth, y: 0 }
        break
      case 'up':
        fromOffset = { x: 0, y: -screenHeight }
        toStartOffset = { x: 0, y: screenHeight }
        break
      case 'down':
        fromOffset = { x: 0, y: screenHeight }
        toStartOffset = { x: 0, y: -screenHeight }
        break
    }

    const promises: Promise<void>[] = []

    // 滑出当前场景
    if (fromScene) {
      promises.push(this.slideOut(fromScene.container, fromOffset))
    }

    // 滑入新场景
    promises.push(this.slideIn(toScene.container, toStartOffset))

    await Promise.all(promises)
  }

  private async slideOut(container: Container, offset: { x: number, y: number }): Promise<void> {
    return new Promise(resolve => {
      const startX = container.x
      const startY = container.y
      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / this.duration, 1)
        const eased = this.easeInOutCubic(progress)
        
        container.x = startX + offset.x * eased
        container.y = startY + offset.y * eased
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          container.visible = false
          resolve()
        }
      }

      animate()
    })
  }

  private async slideIn(container: Container, startOffset: { x: number, y: number }): Promise<void> {
    return new Promise(resolve => {
      container.x = startOffset.x
      container.y = startOffset.y
      container.visible = true
      
      const targetX = 0
      const targetY = 0
      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / this.duration, 1)
        const eased = this.easeInOutCubic(progress)
        
        container.x = startOffset.x + (targetX - startOffset.x) * eased
        container.y = startOffset.y + (targetY - startOffset.y) * eased
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      animate()
    })
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}

/**
 * 场景管理器
 */
export class SceneManager {
  private scenes: Map<string, Scene> = new Map()
  private transitions: Map<string, SceneTransition> = new Map()
  private currentScene: Scene | null = null
  private isTransitioning = false
  private defaultTransition: SceneTransition

  constructor(
    private rootContainer: Container,
    private eventBus: EventBus,
    private logger?: Logger
  ) {
    // 注册默认过渡效果
    this.defaultTransition = new FadeTransition()
    this.registerTransition(this.defaultTransition)
    this.registerTransition(new SlideTransition('left'))
    this.registerTransition(new SlideTransition('right'))
    this.registerTransition(new SlideTransition('up'))
    this.registerTransition(new SlideTransition('down'))
  }

  async init(): Promise<void> {
    this.logger?.info('Scene manager initialized')
  }

  // 注册场景
  registerScene(scene: Scene): void {
    if (this.scenes.has(scene.name)) {
      this.logger?.warn(`Scene ${scene.name} already registered`)
      return
    }

    this.scenes.set(scene.name, scene)
    this.rootContainer.addChild(scene.container)
    
    // 初始化场景但不激活
    scene.container.visible = false
    scene.onCreate({})
    scene.onMount()

    this.logger?.debug(`Scene registered: ${scene.name}`)
    this.eventBus.emit('scene:registered', { scene })
  }

  // 注销场景
  unregisterScene(sceneName: string): void {
    const scene = this.scenes.get(sceneName)
    if (!scene) {
      this.logger?.warn(`Scene ${sceneName} not found`)
      return
    }

    // 如果是当前场景，需要先切换到其他场景
    if (this.currentScene === scene) {
      this.logger?.warn(`Cannot unregister active scene ${sceneName}`)
      return
    }

    // 清理场景
    scene.onUnmount()
    scene.onDestroy()
    this.rootContainer.removeChild(scene.container)
    this.scenes.delete(sceneName)

    this.logger?.debug(`Scene unregistered: ${sceneName}`)
    this.eventBus.emit('scene:unregistered', { sceneName })
  }

  // 注册过渡效果
  registerTransition(transition: SceneTransition): void {
    this.transitions.set(transition.name, transition)
    this.logger?.debug(`Transition registered: ${transition.name}`)
  }

  // 切换场景
  async switchToScene(
    sceneName: string, 
    transitionName?: string,
    sceneProps?: any
  ): Promise<boolean> {
    if (this.isTransitioning) {
      this.logger?.warn('Scene transition already in progress')
      return false
    }

    const newScene = this.scenes.get(sceneName)
    if (!newScene) {
      this.logger?.error(`Scene ${sceneName} not found`)
      return false
    }

    if (this.currentScene === newScene) {
      this.logger?.debug(`Already in scene ${sceneName}`)
      return true
    }

    this.isTransitioning = true
    this.logger?.info(`Switching to scene: ${sceneName}`)

    try {
      // 获取过渡效果
      const transition = transitionName 
        ? this.transitions.get(transitionName) || this.defaultTransition
        : this.defaultTransition

      // 发出切换开始事件
      this.eventBus.emit('scene:switch-start', {
        fromScene: this.currentScene?.name,
        toScene: sceneName,
        transition: transition.name
      })

      // 更新新场景的属性
      if (sceneProps) {
        newScene.onUpdate(sceneProps)
      }

      // 执行过渡
      await transition.execute(this.currentScene, newScene)

      // 停用当前场景
      if (this.currentScene) {
        await this.currentScene.deactivate()
      }

      // 激活新场景
      await newScene.activate()
      
      const previousScene = this.currentScene
      this.currentScene = newScene

      // 发出切换完成事件
      this.eventBus.emit('scene:switch-complete', {
        fromScene: previousScene?.name,
        toScene: sceneName,
        transition: transition.name
      })

      this.logger?.info(`Scene switched successfully: ${sceneName}`)
      return true

    } catch (error) {
      this.logger?.error(`Scene switch failed: ${sceneName}`, error)
      
      // 发出切换失败事件
      this.eventBus.emit('scene:switch-error', {
        fromScene: this.currentScene?.name,
        toScene: sceneName,
        error
      })
      
      return false

    } finally {
      this.isTransitioning = false
    }
  }

  // 更新当前场景
  update(deltaTime: number): void {
    if (this.currentScene && this.currentScene.isActive) {
      this.currentScene.update(deltaTime)
    }
  }

  // 渲染当前场景
  render(): void {
    if (this.currentScene && this.currentScene.isActive) {
      this.currentScene.render()
    }
  }

  // 获取当前场景
  getCurrentScene(): Scene | null {
    return this.currentScene
  }

  // 获取场景
  getScene(name: string): Scene | null {
    return this.scenes.get(name) || null
  }

  // 获取所有场景名称
  getSceneNames(): string[] {
    return Array.from(this.scenes.keys())
  }

  // 检查场景是否存在
  hasScene(name: string): boolean {
    return this.scenes.has(name)
  }

  // 获取场景统计信息
  getSceneStats(): SceneStats {
    const stats: SceneStats = {
      totalScenes: this.scenes.size,
      currentScene: this.currentScene?.name || null,
      isTransitioning: this.isTransitioning,
      sceneList: this.getSceneNames(),
      registeredTransitions: Array.from(this.transitions.keys())
    }

    return stats
  }

  // 预加载场景资源
  async preloadScene(sceneName: string): Promise<boolean> {
    const scene = this.scenes.get(sceneName)
    if (!scene) {
      this.logger?.error(`Scene ${sceneName} not found for preloading`)
      return false
    }

    try {
      // 如果场景有预加载方法，调用它
      if ('preload' in scene && typeof scene.preload === 'function') {
        await scene.preload()
      }

      this.logger?.debug(`Scene preloaded: ${sceneName}`)
      this.eventBus.emit('scene:preloaded', { sceneName })
      return true

    } catch (error) {
      this.logger?.error(`Scene preload failed: ${sceneName}`, error)
      return false
    }
  }

  // 批量预加载场景
  async preloadScenes(sceneNames: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = await Promise.allSettled(
      sceneNames.map(name => this.preloadScene(name))
    )

    const success: string[] = []
    const failed: string[] = []

    results.forEach((result, index) => {
      const sceneName = sceneNames[index]
      if (result.status === 'fulfilled' && result.value) {
        success.push(sceneName)
      } else {
        failed.push(sceneName)
      }
    })

    return { success, failed }
  }

  // 设置默认过渡效果
  setDefaultTransition(transitionName: string): boolean {
    const transition = this.transitions.get(transitionName)
    if (!transition) {
      this.logger?.warn(`Transition ${transitionName} not found`)
      return false
    }

    this.defaultTransition = transition
    this.logger?.debug(`Default transition set: ${transitionName}`)
    return true
  }

  // 创建场景快照（用于调试）
  createSnapshot(): SceneSnapshot {
    const scenes: { [name: string]: any } = {}
    
    for (const [name, scene] of this.scenes) {
      scenes[name] = {
        name: scene.name,
        isActive: scene.isActive,
        visible: scene.container.visible,
        childrenCount: scene.container.children.length
      }
    }

    return {
      timestamp: Date.now(),
      currentScene: this.currentScene?.name || null,
      isTransitioning: this.isTransitioning,
      scenes
    }
  }

  // 销毁场景管理器
  destroy(): void {
    this.isTransitioning = false

    // 停用当前场景
    if (this.currentScene) {
      this.currentScene.deactivate()
    }

    // 销毁所有场景
    for (const [name, scene] of this.scenes) {
      scene.onUnmount()
      scene.onDestroy()
      this.rootContainer.removeChild(scene.container)
    }

    this.scenes.clear()
    this.transitions.clear()
    this.currentScene = null

    this.logger?.info('Scene manager destroyed')
  }
}

// 类型定义
export interface SceneStats {
  totalScenes: number
  currentScene: string | null
  isTransitioning: boolean
  sceneList: string[]
  registeredTransitions: string[]
}

export interface SceneSnapshot {
  timestamp: number
  currentScene: string | null
  isTransitioning: boolean
  scenes: { [name: string]: any }
}