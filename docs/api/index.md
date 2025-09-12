# API Reference

这里提供了Mobile IM Floating Components的完整API参考文档。所有组件都提供完整的TypeScript类型定义。

## 核心类型定义

### Message接口

```typescript
interface Message {
  id: string
  content: string
  timestamp: Date
  userId: string
  type: MessageType
  replyTo?: string
  status?: MessageStatus
  metadata?: MessageMetadata
}

type MessageType = 
  | 'text'
  | 'image' 
  | 'voice'
  | 'video'
  | 'file'
  | 'link'
  | 'location'
  | 'contact'
  | 'system'

type MessageStatus = 
  | 'sending'
  | 'sent' 
  | 'delivered'
  | 'read'
  | 'failed'

interface MessageMetadata {
  edited?: boolean
  pinned?: boolean
  reactions?: Reaction[]
  mentions?: string[]
  attachments?: Attachment[]
}
```

### User接口

```typescript
interface User {
  id: string
  name: string
  avatar?: string
  status?: UserStatus
  profile?: UserProfile
}

type UserStatus = 
  | 'online'
  | 'offline' 
  | 'away'
  | 'busy'
  | 'invisible'

interface UserProfile {
  displayName?: string
  email?: string
  phone?: string
  department?: string
  title?: string
}
```

### 主题配置

```typescript
interface ThemeConfig {
  name: string
  colors: ThemeColors
  effects: ThemeEffects
  animations: AnimationConfig
}

interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: {
    primary: string
    secondary: string
    disabled: string
  }
  border: string
  shadow: string
}

interface ThemeEffects {
  blur: number
  opacity: number
  borderRadius: number
  glassMorphism: boolean
}
```

## 组件API

### MessageBubble

消息气泡组件，支持多种消息类型和丰富的交互功能。

```typescript
interface MessageBubbleProps {
  message: Message
  user: User
  position: 'left' | 'right'
  theme?: ThemeName
  showAvatar?: boolean
  showTimestamp?: boolean
  showStatus?: boolean
  enableAnimations?: boolean
  enableActions?: boolean
  maxWidth?: number
  onPress?: (message: Message) => void
  onLongPress?: (message: Message) => void
  onDoublePress?: (message: Message) => void
  onSwipeLeft?: (message: Message) => void
  onSwipeRight?: (message: Message) => void
  onReply?: (message: Message) => void
  onForward?: (message: Message) => void
  onDelete?: (message: Message) => void
  onEdit?: (message: Message) => void
  renderCustomContent?: (message: Message) => React.ReactNode
  style?: MessageBubbleStyle
}

interface MessageBubbleStyle {
  container?: React.CSSProperties
  bubble?: React.CSSProperties
  content?: React.CSSProperties
  avatar?: React.CSSProperties
  timestamp?: React.CSSProperties
  status?: React.CSSProperties
}
```

#### 使用示例

```tsx
<MessageBubble
  message={{
    id: '1',
    content: 'Hello World!',
    timestamp: new Date(),
    userId: 'user1',
    type: 'text'
  }}
  user={{
    id: 'user1',
    name: 'Alice',
    avatar: '/avatar.jpg'
  }}
  position="right"
  theme="liquid-glass"
  showAvatar={true}
  showTimestamp={true}
  enableAnimations={true}
  onPress={(message) => console.log('Pressed:', message)}
  onLongPress={(message) => console.log('Long pressed:', message)}
/>
```

### OverlayContainer

悬浮容器组件，提供层级管理和主题支持。

```typescript
interface OverlayContainerProps {
  children: React.ReactNode
  theme?: ThemeName
  enableAnimations?: boolean
  mobileOptimized?: boolean
  performanceMode?: PerformanceMode
  zIndexBase?: number
  style?: React.CSSProperties
  onLayout?: (dimensions: ContainerDimensions) => void
  onPerformanceWarning?: (warning: PerformanceWarning) => void
}

type PerformanceMode = 'high' | 'balanced' | 'battery'
type ThemeName = 'liquid-glass' | 'dark' | 'light' | 'custom'

interface ContainerDimensions {
  width: number
  height: number
  safeAreaInsets: {
    top: number
    bottom: number
    left: number
    right: number
  }
}
```

#### 使用示例

```tsx
<OverlayContainer
  theme="liquid-glass"
  enableAnimations={true}
  mobileOptimized={true}
  performanceMode="balanced"
  onLayout={(dimensions) => {
    console.log('Container size:', dimensions)
  }}
>
  {/* 子组件 */}
</OverlayContainer>
```

### ChatArea

聊天区域组件，管理消息列表和虚拟滚动。

```typescript
interface ChatAreaProps {
  messages: Message[]
  users: Record<string, User>
  currentUserId: string
  loading?: boolean
  hasMoreMessages?: boolean
  enableVirtualScrolling?: boolean
  itemHeight?: number | 'dynamic'
  overscan?: number
  onSendMessage?: (content: string) => void
  onLoadMore?: () => void
  onScroll?: (scrollInfo: ScrollInfo) => void
  renderMessage?: (message: Message, user: User, position: 'left' | 'right') => React.ReactNode
  renderLoadingIndicator?: () => React.ReactNode
  renderEmptyState?: () => React.ReactNode
  style?: ChatAreaStyle
}

interface ScrollInfo {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  isAtTop: boolean
  isAtBottom: boolean
}

interface ChatAreaStyle {
  container?: React.CSSProperties
  messageList?: React.CSSProperties
  inputArea?: React.CSSProperties
}
```

### GestureHandler

手势处理组件，支持多种触摸手势。

```typescript
interface GestureHandlerProps {
  children: React.ReactNode
  enableLongPress?: boolean
  enableSwipeActions?: boolean
  enablePinchZoom?: boolean
  enableRotation?: boolean
  longPressDuration?: number
  swipeThreshold?: number
  swipeVelocityThreshold?: number
  onTap?: (event: GestureEvent) => void
  onDoubleTap?: (event: GestureEvent) => void
  onLongPress?: (event: GestureEvent) => void
  onSwipeLeft?: (event: SwipeEvent) => void
  onSwipeRight?: (event: SwipeEvent) => void
  onSwipeUp?: (event: SwipeEvent) => void
  onSwipeDown?: (event: SwipeEvent) => void
  onPinch?: (event: PinchEvent) => void
  onRotate?: (event: RotationEvent) => void
  onPanStart?: (event: PanEvent) => void
  onPanMove?: (event: PanEvent) => void
  onPanEnd?: (event: PanEvent) => void
}

interface GestureEvent {
  target: Element
  point: Point
  timestamp: number
}

interface SwipeEvent extends GestureEvent {
  direction: 'left' | 'right' | 'up' | 'down'
  velocity: number
  distance: number
}

interface Point {
  x: number
  y: number
}
```

### ConnectionLine

连接线组件，支持WebGL硬件加速渲染。

```typescript
interface ConnectionLineProps {
  from: string | Element | Point
  to: string | Element | Point
  type?: ConnectionType
  style?: ConnectionStyle
  animated?: boolean
  renderer?: RendererType
  onHover?: (connection: Connection) => void
  onClick?: (connection: Connection) => void
}

type ConnectionType = 
  | 'straight'
  | 'curved'
  | 'bezier'
  | 'step'

type RendererType = 
  | 'webgl'
  | 'canvas'
  | 'svg'

interface ConnectionStyle {
  color?: string
  width?: number
  dashArray?: number[]
  opacity?: number
  gradient?: Gradient
  shadow?: Shadow
}

interface Connection {
  id: string
  from: Point
  to: Point
  type: ConnectionType
  style: ConnectionStyle
}
```

## Store APIs

### useMessageStore

消息状态管理的Zustand store。

```typescript
interface MessageStore {
  // 状态
  messages: Message[]
  users: Record<string, User>
  conversations: Conversation[]
  currentConversationId: string | null
  loading: boolean
  error: string | null
  
  // 操作
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  markAsRead: (id: string) => void
  
  // 用户操作
  addUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  
  // 会话操作
  setCurrentConversation: (id: string) => void
  loadConversation: (id: string) => Promise<void>
  
  // 批量操作
  batchAddMessages: (messages: Message[]) => void
  clearMessages: () => void
  
  // 搜索和筛选
  searchMessages: (query: string) => Message[]
  filterMessagesByType: (type: MessageType) => Message[]
  filterMessagesByUser: (userId: string) => Message[]
}

// 使用示例
const messageStore = useMessageStore()

// 发送消息
const sendMessage = (content: string) => {
  messageStore.addMessage({
    id: generateId(),
    content,
    timestamp: new Date(),
    userId: currentUserId,
    type: 'text'
  })
}
```

### useOverlayStore

悬浮层状态管理。

```typescript
interface OverlayStore {
  // 状态
  overlays: OverlayItem[]
  zIndexCounter: number
  
  // 操作
  showOverlay: (overlay: OverlayConfig) => string
  hideOverlay: (id: string) => void
  updateOverlay: (id: string, updates: Partial<OverlayItem>) => void
  bringToFront: (id: string) => void
  
  // 批量操作
  hideAllOverlays: () => void
  hideOverlaysByType: (type: string) => void
}

interface OverlayItem {
  id: string
  type: string
  content: React.ReactNode
  position: OverlayPosition
  zIndex: number
  visible: boolean
  config: OverlayConfig
}

interface OverlayConfig {
  type: string
  content: React.ReactNode
  position?: OverlayPosition
  backdrop?: boolean
  dismissible?: boolean
  animation?: AnimationType
}
```

## Service APIs

### MessageService

消息服务接口。

```typescript
interface MessageService {
  // 消息操作
  sendMessage(conversationId: string, content: string, type: MessageType): Promise<Message>
  editMessage(messageId: string, content: string): Promise<Message>
  deleteMessage(messageId: string): Promise<void>
  forwardMessage(messageId: string, conversationId: string): Promise<Message>
  
  // 消息查询
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<Message[]>
  searchMessages(query: string, conversationId?: string): Promise<Message[]>
  getMessageById(messageId: string): Promise<Message | null>
  
  // 实时更新
  subscribeToMessages(conversationId: string, callback: (message: Message) => void): () => void
  subscribeToMessageUpdates(messageId: string, callback: (message: Message) => void): () => void
  
  // 文件处理
  uploadFile(file: File, type: 'image' | 'voice' | 'video' | 'file'): Promise<string>
  downloadFile(url: string): Promise<Blob>
}
```

### PerformanceService

性能监控服务。

```typescript
interface PerformanceService {
  // 性能监控
  startMonitoring(): void
  stopMonitoring(): void
  getMetrics(): PerformanceMetrics
  
  // 内存管理
  getMemoryUsage(): MemoryUsage
  forceGarbageCollection(): void
  optimizeMemory(): void
  
  // 渲染性能
  measureRenderTime(componentName: string): (cleanup?: boolean) => void
  getFPS(): number
  getFrameDrops(): number
  
  // 网络性能
  measureNetworkLatency(): Promise<number>
  getNetworkUsage(): NetworkUsage
  
  // 电池优化
  enableBatteryOptimization(): void
  disableBatteryOptimization(): void
  getBatteryImpact(): BatteryImpact
}

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: MemoryUsage
  fps: number
  frameDrops: number
  networkLatency: number
  batteryImpact: BatteryImpact
}
```

## 工具函数

### 几何计算

```typescript
// 点运算
function distance(p1: Point, p2: Point): number
function midpoint(p1: Point, p2: Point): Point
function angle(p1: Point, p2: Point): number

// 矩形运算
function rectContains(rect: Rect, point: Point): boolean
function rectIntersects(rect1: Rect, rect2: Rect): boolean
function rectCenter(rect: Rect): Point

// 路径计算
function calculateBezierPath(start: Point, end: Point, control1?: Point, control2?: Point): Point[]
function calculateSmoothPath(points: Point[], tension?: number): Point[]
```

### 动画工具

```typescript
// 缓动函数
type EasingFunction = (t: number) => number

const Easing = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  bounce: (t: number) => /* 实现弹跳效果 */
}

// 动画控制器
interface AnimationController {
  start(): void
  stop(): void
  pause(): void
  resume(): void
  reset(): void
  setProgress(progress: number): void
}

function createAnimation(config: AnimationConfig): AnimationController
```

## 错误处理

### 错误类型

```typescript
class ComponentError extends Error {
  code: string
  component: string
  props?: any
}

class RenderError extends ComponentError {
  renderPhase: 'mount' | 'update' | 'unmount'
}

class PerformanceError extends Error {
  metric: string
  threshold: number
  actual: number
}
```

### 错误边界

```typescript
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  children: React.ReactNode
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}
```

## 下一步

- **[组件详细文档](../components/)** - 查看每个组件的详细说明
- **[TypeScript类型](./types)** - 完整的类型定义参考  
- **[Store API](./stores)** - 状态管理详细说明
- **[Service API](./services)** - 服务接口文档