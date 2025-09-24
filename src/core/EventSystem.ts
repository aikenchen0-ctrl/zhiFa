/**
 * 事件管理系统
 * Event Management System
 */

import { EventHandler, EventSubscription, EventBus as IEventBus, Logger } from './types'

/**
 * 事件订阅实现
 */
class EventSubscriptionImpl implements EventSubscription {
  constructor(
    private eventBus: EventBus,
    private eventName: string,
    private handler: EventHandler
  ) {}

  unsubscribe(): void {
    this.eventBus.off(this.eventName, this.handler)
  }
}

/**
 * 事件总线实现
 */
export class EventBus implements IEventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map()
  private onceListeners: Map<string, Set<EventHandler>> = new Map()
  private eventQueue: Array<{ event: string; data?: any }> = []
  private isProcessingQueue = false

  constructor(private logger?: Logger) {}

  on<T>(event: string, handler: EventHandler<T>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(handler)
    this.logger?.debug(`Event listener added for '${event}'`)
    
    return new EventSubscriptionImpl(this, event, handler)
  }

  once<T>(event: string, handler: EventHandler<T>): EventSubscription {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set())
    }
    
    this.onceListeners.get(event)!.add(handler)
    this.logger?.debug(`One-time event listener added for '${event}'`)
    
    return new EventSubscriptionImpl(this, event, handler)
  }

  off(event: string, handler?: EventHandler): void {
    if (handler) {
      // 移除特定处理器
      this.listeners.get(event)?.delete(handler)
      this.onceListeners.get(event)?.delete(handler)
    } else {
      // 移除所有处理器
      this.listeners.delete(event)
      this.onceListeners.delete(event)
    }
    
    this.logger?.debug(`Event listener removed for '${event}'`)
  }

  emit<T>(event: string, data?: T): void {
    // 如果正在处理队列，则将事件加入队列
    if (this.isProcessingQueue) {
      this.eventQueue.push({ event, data })
      return
    }

    this.processEvent(event, data)
    
    // 处理队列中的事件
    this.processEventQueue()
  }

  private processEvent<T>(event: string, data?: T): void {
    this.logger?.debug(`Emitting event '${event}'`, data)

    // 处理普通监听器
    const listeners = this.listeners.get(event)
    if (listeners) {
      for (const handler of listeners) {
        try {
          handler(data)
        } catch (error) {
          this.logger?.error(`Error in event handler for '${event}'`, error)
        }
      }
    }

    // 处理一次性监听器
    const onceListeners = this.onceListeners.get(event)
    if (onceListeners) {
      for (const handler of onceListeners) {
        try {
          handler(data)
        } catch (error) {
          this.logger?.error(`Error in once event handler for '${event}'`, error)
        }
      }
      // 清除一次性监听器
      this.onceListeners.delete(event)
    }
  }

  private processEventQueue(): void {
    if (this.eventQueue.length === 0) return

    this.isProcessingQueue = true
    
    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift()!
      this.processEvent(event, data)
    }
    
    this.isProcessingQueue = false
  }

  clear(): void {
    this.listeners.clear()
    this.onceListeners.clear()
    this.eventQueue.length = 0
    this.logger?.info('Event bus cleared')
  }

  getListenerCount(event?: string): number {
    if (event) {
      const regular = this.listeners.get(event)?.size || 0
      const once = this.onceListeners.get(event)?.size || 0
      return regular + once
    }
    
    let total = 0
    for (const listeners of this.listeners.values()) {
      total += listeners.size
    }
    for (const listeners of this.onceListeners.values()) {
      total += listeners.size
    }
    return total
  }

  getEventNames(): string[] {
    const names = new Set<string>()
    for (const name of this.listeners.keys()) {
      names.add(name)
    }
    for (const name of this.onceListeners.keys()) {
      names.add(name)
    }
    return Array.from(names)
  }
}

/**
 * 组件事件管理器
 */
export class ComponentEventManager {
  private eventBuses: Map<string, EventBus> = new Map()

  constructor(private logger?: Logger) {}

  getEventBus(componentId: string): EventBus {
    if (!this.eventBuses.has(componentId)) {
      this.eventBuses.set(componentId, new EventBus(this.logger))
    }
    return this.eventBuses.get(componentId)!
  }

  removeEventBus(componentId: string): void {
    const eventBus = this.eventBuses.get(componentId)
    if (eventBus) {
      eventBus.clear()
      this.eventBuses.delete(componentId)
    }
  }

  clear(): void {
    for (const eventBus of this.eventBuses.values()) {
      eventBus.clear()
    }
    this.eventBuses.clear()
  }
}

/**
 * 交互事件管理器
 */
export class InteractionManager {
  private globalEventBus: EventBus
  private isEnabled = true

  constructor(globalEventBus: EventBus, private logger?: Logger) {
    this.globalEventBus = globalEventBus
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // 触摸事件
    document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false })
    document.addEventListener('touchcancel', this.onTouchCancel.bind(this))

    // 鼠标事件（用于调试）
    document.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))

    // 指针事件（现代浏览器）
    if ('PointerEvent' in window) {
      document.addEventListener('pointerdown', this.onPointerDown.bind(this))
      document.addEventListener('pointermove', this.onPointerMove.bind(this))
      document.addEventListener('pointerup', this.onPointerUp.bind(this))
      document.addEventListener('pointercancel', this.onPointerCancel.bind(this))
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.isEnabled) return
    
    event.preventDefault()
    this.globalEventBus.emit('interaction:touchstart', {
      touches: Array.from(event.touches).map(this.touchToPoint),
      changedTouches: Array.from(event.changedTouches).map(this.touchToPoint),
      originalEvent: event
    })
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isEnabled) return
    
    event.preventDefault()
    this.globalEventBus.emit('interaction:touchmove', {
      touches: Array.from(event.touches).map(this.touchToPoint),
      changedTouches: Array.from(event.changedTouches).map(this.touchToPoint),
      originalEvent: event
    })
  }

  private onTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled) return
    
    event.preventDefault()
    this.globalEventBus.emit('interaction:touchend', {
      touches: Array.from(event.touches).map(this.touchToPoint),
      changedTouches: Array.from(event.changedTouches).map(this.touchToPoint),
      originalEvent: event
    })
  }

  private onTouchCancel(event: TouchEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:touchcancel', {
      touches: Array.from(event.touches).map(this.touchToPoint),
      changedTouches: Array.from(event.changedTouches).map(this.touchToPoint),
      originalEvent: event
    })
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:mousedown', {
      position: { x: event.clientX, y: event.clientY },
      button: event.button,
      originalEvent: event
    })
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:mousemove', {
      position: { x: event.clientX, y: event.clientY },
      originalEvent: event
    })
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:mouseup', {
      position: { x: event.clientX, y: event.clientY },
      button: event.button,
      originalEvent: event
    })
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:pointerdown', {
      pointerId: event.pointerId,
      position: { x: event.clientX, y: event.clientY },
      pointerType: event.pointerType,
      pressure: event.pressure,
      originalEvent: event
    })
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:pointermove', {
      pointerId: event.pointerId,
      position: { x: event.clientX, y: event.clientY },
      pointerType: event.pointerType,
      pressure: event.pressure,
      originalEvent: event
    })
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:pointerup', {
      pointerId: event.pointerId,
      position: { x: event.clientX, y: event.clientY },
      pointerType: event.pointerType,
      originalEvent: event
    })
  }

  private onPointerCancel(event: PointerEvent): void {
    if (!this.isEnabled) return
    
    this.globalEventBus.emit('interaction:pointercancel', {
      pointerId: event.pointerId,
      position: { x: event.clientX, y: event.clientY },
      pointerType: event.pointerType,
      originalEvent: event
    })
  }

  private touchToPoint(touch: Touch) {
    return {
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      radiusX: touch.radiusX,
      radiusY: touch.radiusY,
      rotationAngle: touch.rotationAngle,
      force: touch.force
    }
  }

  enable(): void {
    this.isEnabled = true
  }

  disable(): void {
    this.isEnabled = false
  }
}

/**
 * 手势识别器
 */
export interface GestureConfig {
  tapThreshold: number
  longPressThreshold: number
  swipeThreshold: number
  pinchThreshold: number
  rotationThreshold: number
}

export class GestureRecognizer {
  private config: GestureConfig = {
    tapThreshold: 10,
    longPressThreshold: 500,
    swipeThreshold: 50,
    pinchThreshold: 0.1,
    rotationThreshold: 5
  }

  private touches: Map<number, any> = new Map()
  private gestureState: any = null

  constructor(
    private eventBus: EventBus,
    config?: Partial<GestureConfig>
  ) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    
    this.setupGestureListeners()
  }

  private setupGestureListeners(): void {
    this.eventBus.on('interaction:touchstart', this.onTouchStart.bind(this))
    this.eventBus.on('interaction:touchmove', this.onTouchMove.bind(this))
    this.eventBus.on('interaction:touchend', this.onTouchEnd.bind(this))
    this.eventBus.on('interaction:touchcancel', this.onTouchCancel.bind(this))
  }

  private onTouchStart(data: any): void {
    for (const touch of data.changedTouches) {
      this.touches.set(touch.identifier, {
        ...touch,
        startTime: performance.now(),
        startX: touch.x,
        startY: touch.y
      })
    }

    this.updateGestureState()
  }

  private onTouchMove(data: any): void {
    for (const touch of data.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const startTouch = this.touches.get(touch.identifier)
        this.touches.set(touch.identifier, {
          ...startTouch,
          ...touch
        })
      }
    }

    this.updateGestureState()
    this.recognizeGestures()
  }

  private onTouchEnd(data: any): void {
    for (const touch of data.changedTouches) {
      if (this.touches.has(touch.identifier)) {
        const startTouch = this.touches.get(touch.identifier)
        const duration = performance.now() - startTouch.startTime
        const distance = Math.sqrt(
          Math.pow(touch.x - startTouch.startX, 2) + 
          Math.pow(touch.y - startTouch.startY, 2)
        )

        // 识别点击手势
        if (duration < this.config.longPressThreshold && distance < this.config.tapThreshold) {
          this.eventBus.emit('gesture:tap', {
            position: { x: touch.x, y: touch.y },
            duration
          })
        }

        // 识别滑动手势
        if (distance > this.config.swipeThreshold) {
          const deltaX = touch.x - startTouch.startX
          const deltaY = touch.y - startTouch.startY
          const direction = this.getSwipeDirection(deltaX, deltaY)
          
          this.eventBus.emit('gesture:swipe', {
            direction,
            distance,
            deltaX,
            deltaY,
            duration
          })
        }

        this.touches.delete(touch.identifier)
      }
    }

    this.updateGestureState()
  }

  private onTouchCancel(data: any): void {
    for (const touch of data.changedTouches) {
      this.touches.delete(touch.identifier)
    }
    
    this.gestureState = null
  }

  private updateGestureState(): void {
    const touchArray = Array.from(this.touches.values())
    
    if (touchArray.length === 0) {
      this.gestureState = null
    } else if (touchArray.length === 1) {
      this.gestureState = { type: 'single', touch: touchArray[0] }
    } else if (touchArray.length === 2) {
      this.gestureState = { type: 'multi', touches: touchArray }
    }
  }

  private recognizeGestures(): void {
    if (!this.gestureState) return

    if (this.gestureState.type === 'multi' && this.gestureState.touches.length === 2) {
      this.recognizePinchAndRotation()
    }
  }

  private recognizePinchAndRotation(): void {
    const [touch1, touch2] = this.gestureState.touches
    
    // 计算当前距离和角度
    const currentDistance = Math.sqrt(
      Math.pow(touch2.x - touch1.x, 2) + 
      Math.pow(touch2.y - touch1.y, 2)
    )
    
    const currentAngle = Math.atan2(
      touch2.y - touch1.y,
      touch2.x - touch1.x
    ) * 180 / Math.PI
    
    // 计算初始距离和角度
    const initialDistance = Math.sqrt(
      Math.pow(touch2.startX - touch1.startX, 2) + 
      Math.pow(touch2.startY - touch1.startY, 2)
    )
    
    const initialAngle = Math.atan2(
      touch2.startY - touch1.startY,
      touch2.startX - touch1.startX
    ) * 180 / Math.PI
    
    // 计算缩放比例
    const scale = currentDistance / initialDistance
    if (Math.abs(scale - 1) > this.config.pinchThreshold) {
      this.eventBus.emit('gesture:pinch', {
        scale,
        center: {
          x: (touch1.x + touch2.x) / 2,
          y: (touch1.y + touch2.y) / 2
        }
      })
    }
    
    // 计算旋转角度
    const rotation = currentAngle - initialAngle
    if (Math.abs(rotation) > this.config.rotationThreshold) {
      this.eventBus.emit('gesture:rotation', {
        rotation,
        center: {
          x: (touch1.x + touch2.x) / 2,
          y: (touch1.y + touch2.y) / 2
        }
      })
    }
  }

  private getSwipeDirection(deltaX: number, deltaY: number): string {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }
}