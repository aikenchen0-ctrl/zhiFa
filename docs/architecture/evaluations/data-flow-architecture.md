# 数据流架构设计报告

## 1. IM消息数据流转路径设计

### 消息流转架构图
```
用户输入 → 客户端验证 → WebSocket发送 → 消息网关 → 业务处理 → 数据存储
    ↓           ↓            ↓          ↓         ↓         ↓
乐观更新 → UI即时更新 → 连接管理 → 路由分发 → 状态更新 → 持久化
    ↓           ↓            ↓          ↓         ↓         ↓
错误回滚 ← 状态同步 ← 推送通知 ← 广播分发 ← 事件触发 ← 索引更新
```

### 关键节点设计

#### 1. 消息网关层
```typescript
interface MessageGateway {
  // 消息接收处理
  onMessageReceive(message: IncomingMessage): Promise<void>
  
  // 消息路由分发
  routeMessage(message: ProcessedMessage): Promise<void>
  
  // 连接管理
  manageConnections(action: ConnectionAction): Promise<void>
}

class WebSocketGateway implements MessageGateway {
  private connectionPool: Map<string, WebSocket>
  private messageQueue: Queue<Message>
  private rateLimiter: RateLimiter
  
  async onMessageReceive(message: IncomingMessage) {
    // 1. 速率限制检查
    await this.rateLimiter.checkLimit(message.userId)
    
    // 2. 消息验证和清理
    const cleanMessage = await this.sanitize(message)
    
    // 3. 加入处理队列
    await this.messageQueue.enqueue(cleanMessage)
    
    // 4. 触发处理流程
    this.processMessage(cleanMessage)
  }
}
```

#### 2. 事件驱动处理引擎
```typescript
interface EventDrivenEngine {
  // 事件发布
  publish(event: DomainEvent): Promise<void>
  
  // 事件订阅
  subscribe(eventType: string, handler: EventHandler): void
  
  // 事件重放
  replay(fromTimestamp: number): Promise<void>
}

class MessageEventEngine implements EventDrivenEngine {
  private eventStore: EventStore
  private subscribers: Map<string, EventHandler[]>
  private eventBus: EventBus
  
  async publish(event: DomainEvent) {
    // 1. 事件持久化
    await this.eventStore.append(event)
    
    // 2. 触发订阅者
    const handlers = this.subscribers.get(event.type) || []
    await Promise.all(
      handlers.map(handler => handler.handle(event))
    )
    
    // 3. 广播到其他实例
    this.eventBus.broadcast(event)
  }
}
```

## 2. 事件驱动架构模式

### Domain Event 设计
```typescript
// 基础事件接口
interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  version: number
  timestamp: number
  payload: any
  metadata: EventMetadata
}

// 消息相关事件
interface MessageEvents {
  MessageSent: DomainEvent<{
    messageId: string
    conversationId: string
    senderId: string
    content: string
    timestamp: number
  }>
  
  MessageReceived: DomainEvent<{
    messageId: string
    recipientId: string
    readStatus: boolean
  }>
  
  MessageDeleted: DomainEvent<{
    messageId: string
    deletedBy: string
    reason: string
  }>
}
```

### Event Sourcing 实现
```typescript
class MessageAggregate {
  private id: string
  private version: number
  private uncommittedEvents: DomainEvent[]
  
  // 命令处理
  sendMessage(content: string, recipientId: string) {
    const event = new MessageSentEvent({
      messageId: this.generateId(),
      content,
      recipientId,
      timestamp: Date.now()
    })
    
    this.applyEvent(event)
    this.uncommittedEvents.push(event)
  }
  
  // 事件应用
  private applyEvent(event: DomainEvent) {
    switch (event.type) {
      case 'MessageSent':
        this.handleMessageSent(event.payload)
        break
      case 'MessageReceived':
        this.handleMessageReceived(event.payload)
        break
    }
    this.version++
  }
  
  // 获取未提交事件
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents]
  }
}
```

## 3. CQRS架构实现

### 命令查询职责分离
```typescript
// 命令侧：写操作
interface CommandSide {
  sendMessage(command: SendMessageCommand): Promise<void>
  deleteMessage(command: DeleteMessageCommand): Promise<void>
  updateMessage(command: UpdateMessageCommand): Promise<void>
}

// 查询侧：读操作
interface QuerySide {
  getMessages(query: GetMessagesQuery): Promise<MessageView[]>
  searchMessages(query: SearchMessagesQuery): Promise<SearchResult>
  getConversations(query: GetConversationsQuery): Promise<ConversationView[]>
}

class MessageCommandHandler implements CommandSide {
  constructor(
    private eventStore: EventStore,
    private repository: MessageRepository
  ) {}
  
  async sendMessage(command: SendMessageCommand) {
    // 1. 加载聚合
    const aggregate = await this.repository.getById(command.conversationId)
    
    // 2. 执行业务逻辑
    aggregate.sendMessage(command.content, command.recipientId)
    
    // 3. 保存事件
    const events = aggregate.getUncommittedEvents()
    await this.eventStore.saveEvents(command.conversationId, events)
    
    // 4. 发布事件
    events.forEach(event => this.eventBus.publish(event))
  }
}

class MessageQueryHandler implements QuerySide {
  constructor(
    private readModel: MessageReadModel,
    private searchEngine: SearchEngine
  ) {}
  
  async getMessages(query: GetMessagesQuery): Promise<MessageView[]> {
    return this.readModel.getMessages({
      conversationId: query.conversationId,
      limit: query.limit,
      offset: query.offset
    })
  }
}
```

### 读模型更新
```typescript
class MessageProjection {
  constructor(
    private database: Database,
    private cacheManager: CacheManager
  ) {}
  
  // 事件处理器
  @EventHandler('MessageSent')
  async onMessageSent(event: MessageSentEvent) {
    // 1. 更新数据库
    await this.database.messages.insert({
      id: event.payload.messageId,
      conversationId: event.payload.conversationId,
      senderId: event.payload.senderId,
      content: event.payload.content,
      timestamp: event.payload.timestamp,
      status: 'sent'
    })
    
    // 2. 更新缓存
    await this.cacheManager.invalidate(`conversation:${event.payload.conversationId}`)
    
    // 3. 更新搜索索引
    await this.searchEngine.index({
      id: event.payload.messageId,
      content: event.payload.content,
      conversationId: event.payload.conversationId
    })
  }
}
```

## 4. 实时更新机制

### WebSocket + 事件流
```typescript
class RealTimeUpdateManager {
  private wsConnections: Map<string, WebSocket[]>
  private eventStream: EventStream
  
  constructor() {
    // 订阅相关事件
    this.eventStream.subscribe('MessageSent', this.handleMessageSent.bind(this))
    this.eventStream.subscribe('MessageReceived', this.handleMessageReceived.bind(this))
  }
  
  // 处理消息发送事件
  async handleMessageSent(event: MessageSentEvent) {
    const { conversationId, recipientId } = event.payload
    
    // 获取相关连接
    const connections = [
      ...this.wsConnections.get(recipientId) || [],
      ...this.wsConnections.get('conversation:' + conversationId) || []
    ]
    
    // 推送更新
    const update = {
      type: 'MESSAGE_SENT',
      payload: event.payload
    }
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(update))
      }
    })
  }
}
```

## 5. 架构决策总结

### 选择的架构模式
1. **Event Sourcing + CQRS**: 保证数据一致性和可追溯性
2. **Domain-Driven Design**: 清晰的业务边界和聚合设计
3. **微服务架构**: 服务独立部署和扩展
4. **最终一致性**: 通过事件保证跨服务数据一致性

### 关键技术组件
- **消息队列**: Apache Kafka / RabbitMQ
- **事件存储**: EventStore / Apache Pulsar
- **缓存层**: Redis Cluster
- **搜索引擎**: Elasticsearch
- **数据库**: PostgreSQL (写) + MongoDB (读)
- **WebSocket**: Socket.io / ws