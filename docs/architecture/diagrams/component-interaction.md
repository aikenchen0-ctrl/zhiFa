# 组件交互设计图

## 1. 微前端组件交互图

```mermaid
graph TB
    subgraph "浏览器运行时环境"
        subgraph "主框架 (Shell App)"
            Router[路由管理器]
            StateManager[全局状态管理<br/>Redux Store]
            EventBus[事件总线<br/>CustomEvent + PostMessage]
            qiankun[qiankun运行时]
            ModuleFed[Module Federation<br/>共享依赖管理]
        end
        
        subgraph "IM聊天模块"
            ChatRouter[聊天路由]
            ChatState[本地状态<br/>Zustand Store]
            ChatUI[聊天组件树]
            ChatWS[WebSocket客户端]
            ChatHooks[自定义Hooks]
        end
        
        subgraph "会议模块"
            MeetingRouter[会议路由]
            MeetingState[本地状态<br/>Vuex Store]
            MeetingUI[会议组件树]
            WebRTCManager[WebRTC管理器]
            MediaDevices[媒体设备管理]
        end
        
        subgraph "文件模块"
            FileRouter[文件路由]
            FileState[本地状态<br/>Zustand Store]
            FileUI[文件组件树]
            FileUpload[文件上传组件]
            FilePreview[文件预览组件]
        end
    end
    
    subgraph "后端服务层"
        Gateway[API网关]
        MessageService[消息服务]
        MeetingService[会议服务]
        FileService[文件服务]
        UserService[用户服务]
        NotificationService[通知服务]
    end
    
    subgraph "数据存储层"
        PostgreSQL[(PostgreSQL)]
        MongoDB[(MongoDB)]
        Redis[(Redis)]
        S3[(对象存储)]
    end
    
    %% 主框架内部交互
    Router --> qiankun
    qiankun --> StateManager
    StateManager --> EventBus
    EventBus --> ModuleFed
    
    %% 子应用内部交互
    ChatRouter --> ChatState
    ChatState --> ChatUI
    ChatUI --> ChatWS
    ChatWS --> ChatHooks
    
    MeetingRouter --> MeetingState
    MeetingState --> MeetingUI
    MeetingUI --> WebRTCManager
    WebRTCManager --> MediaDevices
    
    FileRouter --> FileState
    FileState --> FileUI
    FileUI --> FileUpload
    FileUpload --> FilePreview
    
    %% 跨应用交互
    qiankun -.-> ChatRouter
    qiankun -.-> MeetingRouter
    qiankun -.-> FileRouter
    
    StateManager <--> ChatState
    StateManager <--> MeetingState
    StateManager <--> FileState
    
    EventBus <--> ChatHooks
    EventBus <--> MeetingUI
    EventBus <--> FileUI
    
    %% 与后端交互
    ChatWS --> Gateway
    WebRTCManager --> Gateway
    FileUpload --> Gateway
    
    Gateway --> MessageService
    Gateway --> MeetingService
    Gateway --> FileService
    Gateway --> UserService
    Gateway --> NotificationService
    
    %% 数据存储交互
    MessageService --> MongoDB
    MessageService --> Redis
    MeetingService --> PostgreSQL
    FileService --> S3
    UserService --> PostgreSQL
    NotificationService --> Redis
```

## 2. 状态流转交互图

```mermaid
sequenceDiagram
    participant User as 用户
    participant ShellApp as 主框架
    participant ChatApp as 聊天模块
    participant EventBus as 事件总线
    participant GlobalState as 全局状态
    participant LocalState as 本地状态
    participant Backend as 后端服务
    
    User->>ShellApp: 打开聊天模块
    ShellApp->>GlobalState: 获取用户信息
    ShellApp->>ChatApp: 加载聊天应用
    
    ChatApp->>LocalState: 初始化本地状态
    ChatApp->>EventBus: 注册事件监听器
    ChatApp->>Backend: 请求聊天列表
    Backend-->>ChatApp: 返回聊天数据
    ChatApp->>LocalState: 更新本地聊天数据
    
    User->>ChatApp: 发送消息
    ChatApp->>LocalState: 乐观更新本地状态
    ChatApp->>Backend: 发送消息请求
    ChatApp->>EventBus: 发布消息发送事件
    
    EventBus->>GlobalState: 更新未读消息计数
    EventBus->>ShellApp: 通知其他模块
    
    Backend-->>ChatApp: 确认消息发送
    ChatApp->>LocalState: 确认本地状态更新
    ChatApp->>EventBus: 发布消息确认事件
```

## 3. 实时通信交互图

```mermaid
sequenceDiagram
    participant ClientA as 用户A客户端
    participant ClientB as 用户B客户端
    participant WSGateway as WebSocket网关
    participant MessageService as 消息服务
    participant EventStore as 事件存储
    participant MessageQueue as 消息队列
    participant NotificationService as 通知服务
    
    ClientA->>WSGateway: 建立WebSocket连接
    ClientB->>WSGateway: 建立WebSocket连接
    
    ClientA->>WSGateway: 发送消息
    WSGateway->>MessageService: 转发消息请求
    
    MessageService->>EventStore: 存储MessageSent事件
    MessageService->>MessageQueue: 发布消息事件
    
    MessageQueue->>WSGateway: 消息广播事件
    MessageQueue->>NotificationService: 触发通知
    
    WSGateway->>ClientB: 推送新消息
    WSGateway->>ClientA: 确认消息发送
    
    NotificationService->>ClientB: 发送推送通知
    
    ClientB->>WSGateway: 消息已读状态
    WSGateway->>MessageService: 更新已读状态
    MessageService->>MessageQueue: 发布已读事件
    MessageQueue->>WSGateway: 广播已读状态
    WSGateway->>ClientA: 通知已读状态
```

## 4. 文件上传交互图

```mermaid
sequenceDiagram
    participant User as 用户
    participant FileUI as 文件UI组件
    participant FileUpload as 上传组件
    participant FileService as 文件服务
    participant S3 as 对象存储
    participant MessageService as 消息服务
    participant EventBus as 事件总线
    
    User->>FileUI: 选择文件
    FileUI->>FileUpload: 创建上传任务
    
    FileUpload->>FileService: 请求上传Token
    FileService-->>FileUpload: 返回上传凭证
    
    FileUpload->>S3: 直接上传文件
    S3-->>FileUpload: 上传进度回调
    FileUpload->>FileUI: 更新进度条
    
    S3-->>FileUpload: 上传完成
    FileUpload->>FileService: 确认上传完成
    
    FileService->>MessageService: 创建文件消息
    MessageService->>EventBus: 发布文件消息事件
    
    EventBus->>FileUI: 通知上传成功
    FileUI->>User: 显示上传完成
```

## 5. 跨应用通信机制

### 5.1 事件总线实现

```typescript
// 全局事件总线
class GlobalEventBus {
  private eventTarget: EventTarget = new EventTarget()
  
  // 发布事件
  emit<T = any>(eventType: string, data: T) {
    const event = new CustomEvent(eventType, { 
      detail: { data, timestamp: Date.now() }
    })
    this.eventTarget.dispatchEvent(event)
  }
  
  // 订阅事件
  on<T = any>(eventType: string, handler: (data: T) => void) {
    const listener = (event: CustomEvent) => {
      handler(event.detail.data)
    }
    this.eventTarget.addEventListener(eventType, listener)
    
    // 返回取消订阅函数
    return () => {
      this.eventTarget.removeEventListener(eventType, listener)
    }
  }
}

// 使用示例
const eventBus = new GlobalEventBus()

// 聊天模块发布消息事件
eventBus.emit('message:sent', {
  id: 'msg_123',
  content: 'Hello World',
  conversationId: 'conv_456'
})

// 主框架订阅消息事件更新未读数
eventBus.on('message:sent', (data) => {
  updateUnreadCount(data.conversationId)
})
```

### 5.2 共享状态管理

```typescript
// 跨应用共享状态
interface SharedState {
  user: UserInfo
  unreadCounts: Record<string, number>
  onlineUsers: string[]
  systemNotifications: Notification[]
}

class SharedStateManager {
  private store: SharedState
  private subscribers: Set<(state: SharedState) => void> = new Set()
  
  // 获取状态
  getState(): SharedState {
    return { ...this.store }
  }
  
  // 更新状态
  setState(updater: (state: SharedState) => SharedState) {
    this.store = updater(this.store)
    this.notifySubscribers()
  }
  
  // 订阅状态变化
  subscribe(callback: (state: SharedState) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  
  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.store))
  }
}
```

### 5.3 PostMessage 通信

```typescript
// 跨iframe通信 (如果使用iframe隔离)
class PostMessageBridge {
  private targetWindow: Window
  private messageHandlers: Map<string, Function[]> = new Map()
  
  constructor(targetWindow: Window) {
    this.targetWindow = targetWindow
    window.addEventListener('message', this.handleMessage.bind(this))
  }
  
  // 发送消息
  send(type: string, data: any) {
    this.targetWindow.postMessage({
      type,
      data,
      source: window.location.origin,
      timestamp: Date.now()
    }, '*')
  }
  
  // 接收消息
  on(type: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(type) || []
    handlers.push(handler)
    this.messageHandlers.set(type, handlers)
  }
  
  private handleMessage(event: MessageEvent) {
    const { type, data } = event.data
    const handlers = this.messageHandlers.get(type) || []
    handlers.forEach(handler => handler(data))
  }
}
```

## 6. 组件生命周期管理

```mermaid
stateDiagram-v2
    [*] --> Loading: 应用启动
    Loading --> Loaded: 资源加载完成
    Loaded --> Mounted: 组件挂载
    Mounted --> Active: 激活状态
    Active --> Inactive: 切换到其他模块
    Inactive --> Active: 重新激活
    Active --> Unmounting: 卸载中
    Inactive --> Unmounting: 卸载中
    Unmounting --> [*]: 卸载完成
    
    Active --> Error: 运行错误
    Error --> Active: 错误恢复
    Error --> Unmounting: 无法恢复
```

## 7. 错误处理和降级策略

```typescript
// 错误边界组件
class MicroAppErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    // 上报错误
    this.reportError(error, errorInfo)
    
    // 尝试重新加载应用
    this.attemptRecovery()
  }
  
  private async attemptRecovery() {
    try {
      // 清除缓存
      await this.clearCache()
      
      // 重新加载微应用
      await qiankun.loadMicroApp({
        name: this.props.appName,
        entry: this.props.entry,
        container: this.props.container
      })
      
      this.setState({ hasError: false, error: null })
    } catch (error) {
      // 降级到备用UI
      this.setState({ hasError: true, error })
    }
  }
}
```

这个组件交互设计图详细展示了蒙层系统中各个组件之间的交互关系，包括：

1. **微前端架构下的组件层次结构**
2. **跨应用的状态管理和事件通信**
3. **实时通信的完整流程**
4. **文件上传的交互序列**
5. **跨应用通信的具体实现机制**
6. **组件生命周期管理**
7. **错误处理和降级策略**

这些设计确保了系统的可维护性、可扩展性和用户体验。