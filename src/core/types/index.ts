/**
 * 核心系统类型定义
 * Core System Type Definitions
 */

import { Application, Container, Graphics, Text } from 'pixi.js'

// 基础类型
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface Transform {
  position: Point
  scale: Point
  rotation: number
}

// 应用程序接口
export interface ApplicationConfig {
  width: number
  height: number
  backgroundColor: number
  resolution: number
  antialias: boolean
  powerPreference: 'high-performance' | 'low-power' | 'default'
}

export interface ApplicationLifecycle {
  onInit(): Promise<void>
  onStart(): void
  onPause(): void
  onResume(): void
  onDestroy(): void
}

// 组件系统接口
export interface ComponentProps {
  [key: string]: any
}

export interface ComponentState {
  [key: string]: any
}

export interface ComponentLifecycle {
  onCreate(props: ComponentProps): void
  onMount(): void
  onUpdate(props: ComponentProps, prevProps?: ComponentProps): void
  onUnmount(): void
  onDestroy(): void
}

export interface Component extends ComponentLifecycle {
  readonly id: string
  readonly type: string
  readonly container: Container
  props: ComponentProps
  state: ComponentState
  parent?: Component
  children: Component[]
}

// 事件系统接口
export interface EventHandler<T = any> {
  (event: T): void
}

export interface EventSubscription {
  unsubscribe(): void
}

export interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): EventSubscription
  once<T>(event: string, handler: EventHandler<T>): EventSubscription
  off(event: string, handler?: EventHandler): void
  emit<T>(event: string, data?: T): void
  clear(): void
}

// 状态管理接口
export interface StateListener<T = any> {
  (state: T, prevState?: T): void
}

export interface StateSubscription {
  unsubscribe(): void
}

export interface StateManager<T = any> {
  getState(): T
  setState(state: Partial<T>): void
  subscribe(listener: StateListener<T>): StateSubscription
  unsubscribe(listener: StateListener<T>): void
}

// 性能监控接口
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  textureBindings: number
  geometries: number
  textures: number
  memoryUsage: number
}

export interface PerformanceConfig {
  targetFPS: number
  enableProfiling: boolean
  enableMetrics: boolean
  metricsUpdateInterval: number
}

// 内存管理接口
export interface ObjectPool<T> {
  get(): T
  release(obj: T): void
  clear(): void
  size: number
  activeCount: number
}

export interface MemoryMetrics {
  totalMemory: number
  usedMemory: number
  freeMemory: number
  pooledObjects: number
  activeObjects: number
}

// 日志系统接口
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  category?: string
  data?: any
}

export interface Logger {
  debug(message: string, data?: any): void
  info(message: string, data?: any): void
  warn(message: string, data?: any): void
  error(message: string, data?: any): void
  fatal(message: string, data?: any): void
}

// 场景管理接口
export interface Scene extends ComponentLifecycle {
  readonly name: string
  readonly container: Container
  readonly isActive: boolean
  
  activate(): Promise<void>
  deactivate(): Promise<void>
  update(deltaTime: number): void
  render(): void
}

export interface SceneTransition {
  readonly name: string
  duration: number
  execute(fromScene: Scene | null, toScene: Scene): Promise<void>
}

// 布局系统接口
export interface LayoutConstraints {
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  aspectRatio?: number
}

export interface LayoutProps {
  width?: number | string
  height?: number | string
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number }
  position?: 'absolute' | 'relative'
  top?: number | string
  right?: number | string
  bottom?: number | string
  left?: number | string
}

// 交互系统接口
export interface InteractionEvent {
  type: string
  target: Component
  currentTarget: Component
  position: Point
  globalPosition: Point
  originalEvent: any
  timestamp: number
  preventDefault(): void
  stopPropagation(): void
}

export interface GestureEvent extends InteractionEvent {
  deltaX: number
  deltaY: number
  scale: number
  rotation: number
  velocity: Point
}

// 连接线系统接口
export interface ConnectionPoint {
  component: Component
  anchor: Point
  offset?: Point
}

export interface ConnectionLine {
  readonly id: string
  from: ConnectionPoint
  to: ConnectionPoint
  style: ConnectionLineStyle
  graphics: Graphics
  
  update(): void
  destroy(): void
}

export interface ConnectionLineStyle {
  color: number
  width: number
  alpha: number
  dashPattern?: number[]
  cornerRadius?: number
  arrowStyle?: 'none' | 'simple' | 'filled'
}

// 滚动系统接口
export interface ScrollConfig {
  horizontal: boolean
  vertical: boolean
  bounceEffect: boolean
  scrollSpeed: number
  friction: number
  snapToGrid: boolean
  gridSize?: Size
}

export interface ScrollMetrics {
  contentSize: Size
  viewportSize: Size
  scrollPosition: Point
  maxScroll: Point
  isScrolling: boolean
  velocity: Point
}

// 动画系统接口
export interface AnimationConfig {
  duration: number
  easing: string | ((t: number) => number)
  loop: boolean
  yoyo: boolean
  delay: number
}

export interface Animation {
  readonly id: string
  readonly isPlaying: boolean
  readonly progress: number
  
  play(): void
  pause(): void
  stop(): void
  reverse(): void
  seek(progress: number): void
}

// 资源管理接口
export interface ResourceLoader {
  load(url: string): Promise<any>
  loadBatch(urls: string[]): Promise<any[]>
  getLoadProgress(): number
  cancel(): void
}

export interface AssetManifest {
  textures: { [key: string]: string }
  fonts: { [key: string]: string }
  sounds: { [key: string]: string }
  data: { [key: string]: string }
}

// 插件系统接口
export interface Plugin {
  readonly name: string
  readonly version: string
  
  install(app: Application): void
  uninstall(): void
}

export interface PluginConfig {
  [pluginName: string]: any
}

// 错误处理接口
export interface ErrorHandler {
  (error: Error, context?: string): void
}

export interface ErrorRecovery {
  canRecover(error: Error): boolean
  recover(error: Error): Promise<boolean>
}

// 配置接口
export interface SystemConfig {
  application: ApplicationConfig
  performance: PerformanceConfig
  logging: {
    level: LogLevel
    categories: string[]
    outputs: string[]
  }
  memory: {
    gcThreshold: number
    maxObjects: number
    poolSizes: { [type: string]: number }
  }
  plugins: PluginConfig
}