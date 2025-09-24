/**
 * 基础组件类
 * Base Component Class
 */

import { Container, DisplayObject } from 'pixi.js'
import { EventBus } from '../../core/EventSystem'
import { 
  Component, 
  ComponentProps, 
  ComponentState, 
  ComponentLifecycle,
  Point,
  Size
} from '../../core/types'

/**
 * 基础组件抽象类
 */
export abstract class BaseComponent implements Component {
  protected static nextId = 0

  public readonly id: string
  public readonly type: string
  public readonly container: Container
  public props: ComponentProps = {}
  public state: ComponentState = {}
  public parent?: Component
  public children: Component[] = []

  protected eventBus: EventBus
  protected isCreated = false
  protected isMounted = false
  protected isDestroyed = false

  constructor(type: string, eventBus: EventBus, props: ComponentProps = {}) {
    this.id = `${type}_${BaseComponent.nextId++}`
    this.type = type
    this.container = new Container()
    this.eventBus = eventBus
    this.props = { ...props }
    
    // 设置容器标识
    this.container.name = this.id
    this.container.label = this.type
  }

  // 生命周期方法
  onCreate(props: ComponentProps): void {
    if (this.isCreated) return
    
    this.props = { ...this.props, ...props }
    this.isCreated = true
    
    // 发出创建事件
    this.eventBus.emit(`component:${this.id}:created`, { component: this })
    this.eventBus.emit('component:created', { component: this })
  }

  onMount(): void {
    if (this.isMounted || !this.isCreated) return
    
    this.isMounted = true
    
    // 挂载子组件
    for (const child of this.children) {
      if (!child.container.parent) {
        this.container.addChild(child.container)
      }
      if ('onMount' in child) {
        child.onMount()
      }
    }
    
    // 发出挂载事件
    this.eventBus.emit(`component:${this.id}:mounted`, { component: this })
    this.eventBus.emit('component:mounted', { component: this })
  }

  onUpdate(props: ComponentProps, prevProps?: ComponentProps): void {
    if (!this.isCreated || this.isDestroyed) return
    
    const oldProps = { ...this.props }
    this.props = { ...this.props, ...props }
    
    // 更新子组件
    for (const child of this.children) {
      if ('onUpdate' in child) {
        child.onUpdate({}, {})
      }
    }
    
    // 发出更新事件
    this.eventBus.emit(`component:${this.id}:updated`, { 
      component: this, 
      props: this.props, 
      prevProps: oldProps 
    })
    this.eventBus.emit('component:updated', { 
      component: this, 
      props: this.props, 
      prevProps: oldProps 
    })
  }

  onUnmount(): void {
    if (!this.isMounted) return
    
    // 卸载子组件
    for (const child of this.children) {
      if ('onUnmount' in child) {
        child.onUnmount()
      }
    }
    
    // 从父容器中移除
    if (this.container.parent) {
      this.container.parent.removeChild(this.container)
    }
    
    this.isMounted = false
    
    // 发出卸载事件
    this.eventBus.emit(`component:${this.id}:unmounted`, { component: this })
    this.eventBus.emit('component:unmounted', { component: this })
  }

  onDestroy(): void {
    if (this.isDestroyed) return
    
    // 先卸载
    if (this.isMounted) {
      this.onUnmount()
    }
    
    // 销毁所有子组件
    const childrenToDestroy = [...this.children]
    for (const child of childrenToDestroy) {
      this.removeChild(child)
      if ('onDestroy' in child) {
        child.onDestroy()
      }
    }
    
    // 清理容器
    this.container.removeAllListeners()
    this.container.destroy({ children: true })
    
    this.isDestroyed = true
    
    // 发出销毁事件
    this.eventBus.emit(`component:${this.id}:destroyed`, { component: this })
    this.eventBus.emit('component:destroyed', { component: this })
  }

  // 子组件管理
  addChild(child: Component): void {
    if (this.children.includes(child)) return
    
    // 从原父组件中移除
    if (child.parent) {
      child.parent.removeChild(child)
    }
    
    // 添加到当前组件
    this.children.push(child)
    child.parent = this
    
    // 如果当前组件已挂载，则挂载子组件
    if (this.isMounted) {
      this.container.addChild(child.container)
      if ('onMount' in child) {
        child.onMount()
      }
    }
    
    this.eventBus.emit(`component:${this.id}:child-added`, { 
      parent: this, 
      child 
    })
  }

  removeChild(child: Component): void {
    const index = this.children.indexOf(child)
    if (index === -1) return
    
    // 卸载子组件
    if ('onUnmount' in child && child.isMounted) {
      child.onUnmount()
    }
    
    // 从容器中移除
    if (child.container.parent === this.container) {
      this.container.removeChild(child.container)
    }
    
    // 从子组件列表中移除
    this.children.splice(index, 1)
    child.parent = undefined
    
    this.eventBus.emit(`component:${this.id}:child-removed`, { 
      parent: this, 
      child 
    })
  }

  removeAllChildren(): void {
    const childrenToRemove = [...this.children]
    for (const child of childrenToRemove) {
      this.removeChild(child)
    }
  }

  // 查找方法
  findChild(predicate: (child: Component) => boolean): Component | null {
    for (const child of this.children) {
      if (predicate(child)) {
        return child
      }
      
      // 递归查找
      const found = child.findChild?.(predicate)
      if (found) {
        return found
      }
    }
    return null
  }

  findChildById(id: string): Component | null {
    return this.findChild(child => child.id === id)
  }

  findChildByType(type: string): Component | null {
    return this.findChild(child => child.type === type)
  }

  findChildrenByType(type: string): Component[] {
    const results: Component[] = []
    
    for (const child of this.children) {
      if (child.type === type) {
        results.push(child)
      }
      
      // 递归查找
      if ('findChildrenByType' in child) {
        results.push(...child.findChildrenByType(type))
      }
    }
    
    return results
  }

  // 位置和尺寸管理
  setPosition(x: number, y: number): void {
    this.container.position.set(x, y)
    this.eventBus.emit(`component:${this.id}:position-changed`, {
      component: this,
      position: { x, y }
    })
  }

  getPosition(): Point {
    return {
      x: this.container.position.x,
      y: this.container.position.y
    }
  }

  setScale(scaleX: number, scaleY?: number): void {
    this.container.scale.set(scaleX, scaleY ?? scaleX)
    this.eventBus.emit(`component:${this.id}:scale-changed`, {
      component: this,
      scale: { x: scaleX, y: scaleY ?? scaleX }
    })
  }

  getScale(): Point {
    return {
      x: this.container.scale.x,
      y: this.container.scale.y
    }
  }

  setRotation(rotation: number): void {
    this.container.rotation = rotation
    this.eventBus.emit(`component:${this.id}:rotation-changed`, {
      component: this,
      rotation
    })
  }

  getRotation(): number {
    return this.container.rotation
  }

  setAlpha(alpha: number): void {
    this.container.alpha = Math.max(0, Math.min(1, alpha))
    this.eventBus.emit(`component:${this.id}:alpha-changed`, {
      component: this,
      alpha: this.container.alpha
    })
  }

  getAlpha(): number {
    return this.container.alpha
  }

  setVisible(visible: boolean): void {
    this.container.visible = visible
    this.eventBus.emit(`component:${this.id}:visibility-changed`, {
      component: this,
      visible
    })
  }

  getVisible(): boolean {
    return this.container.visible
  }

  // 边界计算
  getBounds(): { x: number; y: number; width: number; height: number } {
    const bounds = this.container.getBounds()
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    }
  }

  getLocalBounds(): { x: number; y: number; width: number; height: number } {
    const bounds = this.container.getLocalBounds()
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    }
  }

  // 状态管理
  setState(newState: Partial<ComponentState>): void {
    const prevState = { ...this.state }
    this.state = { ...this.state, ...newState }
    
    this.onStateChanged(this.state, prevState)
    this.eventBus.emit(`component:${this.id}:state-changed`, {
      component: this,
      state: this.state,
      prevState
    })
  }

  getState<T = ComponentState>(): T {
    return this.state as T
  }

  protected onStateChanged(newState: ComponentState, prevState: ComponentState): void {
    // 子类可以重写此方法来响应状态变化
  }

  // 属性管理
  setProps(newProps: Partial<ComponentProps>): void {
    const prevProps = { ...this.props }
    this.props = { ...this.props, ...newProps }
    
    this.onUpdate(this.props, prevProps)
  }

  getProp<T = any>(key: string, defaultValue?: T): T {
    return this.props[key] ?? defaultValue
  }

  // 事件发射器
  emit(event: string, data?: any): void {
    this.eventBus.emit(`component:${this.id}:${event}`, data)
  }

  on(event: string, handler: (data?: any) => void): () => void {
    const subscription = this.eventBus.on(`component:${this.id}:${event}`, handler)
    return () => subscription.unsubscribe()
  }

  // 工具方法
  toString(): string {
    return `${this.type}(${this.id})`
  }

  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      props: this.props,
      state: this.state,
      position: this.getPosition(),
      scale: this.getScale(),
      rotation: this.getRotation(),
      alpha: this.getAlpha(),
      visible: this.getVisible(),
      children: this.children.map(child => child.toJSON?.() || child.id)
    }
  }

  // Getters
  get isMounted(): boolean {
    return this.isMounted
  }

  get isCreated(): boolean {
    return this.isCreated
  }

  get isDestroyed(): boolean {
    return this.isDestroyed
  }
}