/**
 * 状态管理系统
 * State Management System
 */

import { EventBus } from './EventSystem'
import { 
  StateManager as IStateManager, 
  StateListener, 
  StateSubscription,
  Logger
} from './types'

/**
 * 状态订阅实现
 */
class StateSubscriptionImpl implements StateSubscription {
  constructor(
    private stateManager: StateManager,
    private listener: StateListener
  ) {}

  unsubscribe(): void {
    this.stateManager.unsubscribe(this.listener)
  }
}

/**
 * 状态管理器实现
 */
export class StateManager<T = any> implements IStateManager<T> {
  private state: T
  private listeners: Set<StateListener<T>> = new Set()
  private middlewares: Array<(state: T, action: any) => T> = []
  private history: T[] = []
  private maxHistorySize = 50
  private isUpdating = false

  constructor(
    private eventBus: EventBus,
    private logger?: Logger,
    initialState?: T
  ) {
    this.state = initialState || ({} as T)
    this.history.push(this.cloneState(this.state))
  }

  getState(): T {
    return this.cloneState(this.state)
  }

  setState(newState: Partial<T>, action?: string): void {
    if (this.isUpdating) {
      this.logger?.warn('Attempting to update state while already updating')
      return
    }

    const prevState = this.cloneState(this.state)
    let nextState: T

    if (typeof newState === 'function') {
      // 支持函数式更新
      const updater = newState as (prevState: T) => T
      nextState = updater(prevState)
    } else {
      // 合并状态
      nextState = { ...prevState, ...newState }
    }

    // 应用中间件
    for (const middleware of this.middlewares) {
      nextState = middleware(nextState, { type: action || 'SET_STATE', payload: newState })
    }

    // 检查状态是否真的发生了变化
    if (this.isEqual(prevState, nextState)) {
      return
    }

    this.isUpdating = true
    this.state = nextState

    // 添加到历史记录
    this.addToHistory(this.cloneState(nextState))

    // 通知监听器
    this.notifyListeners(nextState, prevState)

    // 发出全局事件
    this.eventBus.emit('state:changed', {
      state: nextState,
      prevState,
      action: action || 'SET_STATE'
    })

    this.isUpdating = false

    this.logger?.debug('State updated', {
      action: action || 'SET_STATE',
      prevState,
      nextState
    })
  }

  subscribe(listener: StateListener<T>): StateSubscription {
    this.listeners.add(listener)
    
    // 立即调用一次监听器以提供当前状态
    try {
      listener(this.getState())
    } catch (error) {
      this.logger?.error('Error in state listener during subscription', error)
    }

    return new StateSubscriptionImpl(this, listener)
  }

  unsubscribe(listener: StateListener<T>): void {
    this.listeners.delete(listener)
  }

  // 批量更新
  batchUpdate(updates: Array<() => void>): void {
    const prevState = this.cloneState(this.state)
    
    this.isUpdating = true
    
    for (const update of updates) {
      try {
        update()
      } catch (error) {
        this.logger?.error('Error in batch update', error)
      }
    }
    
    this.isUpdating = false
    
    // 只在最后通知一次
    if (!this.isEqual(prevState, this.state)) {
      this.notifyListeners(this.state, prevState)
      this.eventBus.emit('state:batch-updated', {
        state: this.state,
        prevState,
        updateCount: updates.length
      })
    }
  }

  // 添加中间件
  addMiddleware(middleware: (state: T, action: any) => T): void {
    this.middlewares.push(middleware)
  }

  // 移除中间件
  removeMiddleware(middleware: (state: T, action: any) => T): void {
    const index = this.middlewares.indexOf(middleware)
    if (index > -1) {
      this.middlewares.splice(index, 1)
    }
  }

  // 历史记录管理
  getHistory(): T[] {
    return this.history.map(state => this.cloneState(state))
  }

  canUndo(): boolean {
    return this.history.length > 1
  }

  undo(): boolean {
    if (!this.canUndo()) return false

    this.history.pop() // 移除当前状态
    const prevState = this.history[this.history.length - 1]
    
    if (prevState) {
      const oldState = this.cloneState(this.state)
      this.state = this.cloneState(prevState)
      
      this.notifyListeners(this.state, oldState)
      this.eventBus.emit('state:undo', {
        state: this.state,
        prevState: oldState
      })
      
      this.logger?.debug('State undo performed')
      return true
    }
    
    return false
  }

  clearHistory(): void {
    this.history = [this.cloneState(this.state)]
    this.logger?.debug('State history cleared')
  }

  // 选择器系统
  select<R>(selector: (state: T) => R): R {
    return selector(this.state)
  }

  createSelector<R>(
    selector: (state: T) => R,
    equalityFn?: (a: R, b: R) => boolean
  ): () => R {
    let lastResult: R
    let hasResult = false
    
    return () => {
      const currentResult = selector(this.state)
      
      if (!hasResult) {
        lastResult = currentResult
        hasResult = true
        return currentResult
      }
      
      const isEqual = equalityFn 
        ? equalityFn(lastResult, currentResult)
        : this.isEqual(lastResult, currentResult)
        
      if (!isEqual) {
        lastResult = currentResult
      }
      
      return lastResult
    }
  }

  // 异步状态管理
  async setStateAsync(stateOrUpdater: Partial<T> | ((state: T) => Promise<T>), action?: string): Promise<void> {
    try {
      let newState: T
      
      if (typeof stateOrUpdater === 'function') {
        const updater = stateOrUpdater as (state: T) => Promise<T>
        newState = await updater(this.cloneState(this.state))
      } else {
        newState = { ...this.state, ...stateOrUpdater }
      }
      
      this.setState(newState, action)
    } catch (error) {
      this.logger?.error('Error in async state update', error)
      throw error
    }
  }

  // 状态重置
  reset(initialState?: T): void {
    const newState = initialState || ({} as T)
    const prevState = this.cloneState(this.state)
    
    this.state = this.cloneState(newState)
    this.history = [this.cloneState(newState)]
    
    this.notifyListeners(this.state, prevState)
    this.eventBus.emit('state:reset', {
      state: this.state,
      prevState
    })
    
    this.logger?.info('State reset')
  }

  // 状态持久化
  serialize(): string {
    return JSON.stringify({
      state: this.state,
      timestamp: Date.now()
    })
  }

  deserialize(serializedState: string): boolean {
    try {
      const { state, timestamp } = JSON.parse(serializedState)
      
      const prevState = this.cloneState(this.state)
      this.state = state
      this.addToHistory(this.cloneState(state))
      
      this.notifyListeners(this.state, prevState)
      this.eventBus.emit('state:deserialized', {
        state: this.state,
        prevState,
        timestamp
      })
      
      this.logger?.info('State deserialized', { timestamp })
      return true
      
    } catch (error) {
      this.logger?.error('Failed to deserialize state', error)
      return false
    }
  }

  // 私有方法
  private notifyListeners(state: T, prevState: T): void {
    for (const listener of this.listeners) {
      try {
        listener(state, prevState)
      } catch (error) {
        this.logger?.error('Error in state listener', error)
      }
    }
  }

  private addToHistory(state: T): void {
    this.history.push(state)
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  private cloneState(state: T): T {
    // 深克隆状态以避免意外修改
    return JSON.parse(JSON.stringify(state))
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== typeof b) return false
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      
      if (keysA.length !== keysB.length) return false
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!this.isEqual(a[key], b[key])) return false
      }
      
      return true
    }
    
    return false
  }

  // 调试方法
  getDebugInfo(): any {
    return {
      state: this.cloneState(this.state),
      listenerCount: this.listeners.size,
      middlewareCount: this.middlewares.length,
      historySize: this.history.length,
      maxHistorySize: this.maxHistorySize,
      isUpdating: this.isUpdating
    }
  }

  // 设置最大历史记录大小
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size)
    
    // 如果当前历史记录超过新的大小限制，进行裁剪
    while (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }
}

/**
 * 全局状态管理器
 */
export class GlobalStateManager {
  private stateManagers: Map<string, StateManager> = new Map()

  constructor(
    private eventBus: EventBus,
    private logger?: Logger
  ) {}

  createStateManager<T>(
    namespace: string, 
    initialState?: T
  ): StateManager<T> {
    if (this.stateManagers.has(namespace)) {
      this.logger?.warn(`State manager for namespace '${namespace}' already exists`)
      return this.stateManagers.get(namespace) as StateManager<T>
    }

    const stateManager = new StateManager<T>(this.eventBus, this.logger, initialState)
    this.stateManagers.set(namespace, stateManager)
    
    this.logger?.debug(`Created state manager for namespace '${namespace}'`)
    return stateManager
  }

  getStateManager<T>(namespace: string): StateManager<T> | null {
    return (this.stateManagers.get(namespace) as StateManager<T>) || null
  }

  removeStateManager(namespace: string): boolean {
    const result = this.stateManagers.delete(namespace)
    if (result) {
      this.logger?.debug(`Removed state manager for namespace '${namespace}'`)
    }
    return result
  }

  getAllNamespaces(): string[] {
    return Array.from(this.stateManagers.keys())
  }

  clear(): void {
    this.stateManagers.clear()
    this.logger?.info('All state managers cleared')
  }

  // 获取所有状态管理器的调试信息
  getDebugInfo(): any {
    const info: any = {}
    
    for (const [namespace, manager] of this.stateManagers) {
      info[namespace] = manager.getDebugInfo()
    }
    
    return {
      namespaces: this.getAllNamespaces(),
      managerCount: this.stateManagers.size,
      managers: info
    }
  }
}