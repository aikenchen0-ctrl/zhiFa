# 消息气泡系统

一个功能完整的聊天消息气泡组件系统，支持多种消息类型、两种气泡样式和丰富的交互功能。

## 🚀 特性

### 气泡样式
- **详细气泡**: 带发送者名字、强背景模糊效果，适合群聊场景
- **简单气泡**: 纯气泡样式，适合一对一聊天场景

### 视觉效果
- **材质区分**: 
  - 自己的消息：半透明白色背景
  - 别人的消息：全透明背景
- **强背景模糊效果**: 使用 backdrop-blur 实现现代化毛玻璃效果
- **自适应尺寸**: 气泡宽度自适应内容，最大宽度限制

### 消息类型支持

#### 基础消息
- 📝 **文本消息**: 支持链接自动识别、表情符号放大显示
- 🖼️ **图片消息**: 支持缩略图、点击放大预览
- 🎵 **语音消息**: 波形显示、播放控制、时长显示
- 🎬 **视频消息**: 缩略图预览、播放控制、时长标识
- 📎 **文件消息**: 文件图标、大小显示、下载功能

#### 特殊消息
- 🔗 **链接消息**: 自动解析标题、描述、缩略图
- 🔗 **扩展链接**: 丰富的元数据显示（作者、发布时间等）
- 👤 **联系人消息**: 头像、姓名、职位、电话信息
- 📍 **位置消息**: 地图缩略图、地址信息、坐标显示
- 🧧 **红包消息**: 金额显示、状态管理、动画效果
- 💰 **转账消息**: 转账状态、确认功能、安全提示
- 📱 **小程序消息**: 应用信息、缩略图、跳转功能
- 😊 **动画表情**: GIF支持、播放控制、特效

#### 系统消息
- 🔔 **系统通知**: 群管理、通话记录、服务通知等
- 💬 **引用消息**: 显示被引用的原始消息内容

### 交互功能

#### 操作菜单
- 💬 **话外音**: 添加消息备注
- 📋 **复制**: 复制消息内容到剪贴板
- ↗️ **转发**: 转发消息到其他聊天
- ⭐ **收藏**: 收藏重要消息
- ✅ **多选**: 进入批量操作模式
- 📖 **引用**: 引用消息进行回复
- 🔍 **放大**: 放大查看图片/视频
- 🗑️ **删除**: 删除消息（仅自己发送的）

#### 多选模式
- 圆形复选框选择
- 批量操作工具栏
- 全选/取消全选
- 批量转发/收藏/删除

## 📁 文件结构

```
src/components/chat/
├── index.ts                    # 组件统一导出
├── MessageBubble.tsx          # 主气泡组件
├── DetailedBubble.tsx         # 详细气泡
├── SimpleBubble.tsx           # 简单气泡
├── ActionMenu.tsx             # 操作菜单
├── MultiSelectMode.tsx        # 多选模式
├── ChatExample.tsx            # 使用示例
└── MessageTypes/              # 消息类型组件
    ├── MessageContent.tsx     # 消息内容分发器
    ├── TextMessage.tsx        # 文本消息
    ├── ImageMessage.tsx       # 图片消息
    ├── VoiceMessage.tsx       # 语音消息
    ├── VideoMessage.tsx       # 视频消息
    ├── FileMessage.tsx        # 文件消息
    ├── LinkMessage.tsx        # 链接消息
    ├── ExtendedLinkMessage.tsx # 扩展链接消息
    ├── ContactMessage.tsx     # 联系人消息
    ├── LocationMessage.tsx    # 位置消息
    ├── RedEnvelopeMessage.tsx # 红包消息
    ├── TransferMessage.tsx    # 转账消息
    ├── MiniProgramMessage.tsx # 小程序消息
    ├── AnimatedEmojiMessage.tsx # 动画表情
    └── SystemMessage.tsx      # 系统消息
```

## 🔧 基本使用

### 1. 导入组件

```tsx
import { 
  MessageBubble, 
  MultiSelectProvider,
  Message,
  ActionType,
  BubbleStyle 
} from '@/components/chat';
```

### 2. 定义消息数据

```tsx
const message: Message = {
  id: '1',
  type: 'text',
  sender: 'other',
  senderName: '张三',
  senderAvatar: 'https://example.com/avatar.jpg',
  timestamp: Date.now(),
  content: { text: '你好！' }
};
```

### 3. 渲染气泡组件

```tsx
function ChatInterface() {
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>('detailed');

  const handleActionClick = (action: ActionType) => {
    console.log('操作:', action);
  };

  return (
    <MultiSelectProvider>
      <MessageBubble
        message={message}
        style={bubbleStyle}
        onActionClick={handleActionClick}
        onBubbleClick={() => console.log('点击气泡')}
        onBubbleLongPress={() => console.log('长按气泡')}
      />
    </MultiSelectProvider>
  );
}
```

## 📋 消息类型示例

### 文本消息
```tsx
const textMessage: Message = {
  id: '1',
  type: 'text',
  sender: 'self',
  timestamp: Date.now(),
  content: { 
    text: '这是一条文本消息 😊\nhttps://example.com' 
  }
};
```

### 图片消息
```tsx
const imageMessage: Message = {
  id: '2',
  type: 'image',
  sender: 'other',
  senderName: '张三',
  timestamp: Date.now(),
  content: {
    url: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    width: 800,
    height: 600,
    caption: '美丽的风景'
  }
};
```

### 语音消息
```tsx
const voiceMessage: Message = {
  id: '3',
  type: 'voice',
  sender: 'self',
  timestamp: Date.now(),
  content: {
    url: 'https://example.com/voice.mp3',
    duration: 15,
    waveform: [0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4]
  }
};
```

### 红包消息
```tsx
const redEnvelopeMessage: Message = {
  id: '4',
  type: 'red-envelope',
  sender: 'other',
  senderName: '张三',
  timestamp: Date.now(),
  content: {
    amount: 88.88,
    message: '恭喜发财！',
    isOpened: false,
    isExpired: false
  }
};
```

### 引用消息
```tsx
const quotedMessage: Message = {
  id: '5',
  type: 'text',
  sender: 'self',
  timestamp: Date.now(),
  content: { text: '好的，收到！' },
  quotedMessage: {
    id: '4',
    type: 'text',
    sender: 'other',
    senderName: '张三',
    timestamp: Date.now() - 1000,
    content: { text: '请帮我确认一下订单' }
  }
};
```

## 🎨 样式定制

### CSS变量
```css
:root {
  --chat-bubble-radius: 1rem;
  --chat-bubble-blur: 12px;
  --chat-bubble-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --chat-animation-duration: 200ms;
}
```

### 主题支持
组件支持深色模式，会自动根据 `dark:` 类名切换颜色方案。

## 🔄 状态管理

### 多选模式
```tsx
function ChatWithMultiSelect() {
  const handleBatchAction = (action: ActionType, messageIds: string[]) => {
    switch (action) {
      case 'delete':
        // 批量删除逻辑
        break;
      case 'forward':
        // 批量转发逻辑
        break;
      case 'collect':
        // 批量收藏逻辑
        break;
    }
  };

  return (
    <MultiSelectProvider onBatchAction={handleBatchAction}>
      {/* 消息列表 */}
    </MultiSelectProvider>
  );
}
```

### 使用多选状态
```tsx
function MessageList() {
  const multiSelect = useMultiSelect();

  return (
    <div>
      {multiSelect.isActive && (
        <div>多选模式已激活，已选择 {multiSelect.selectedMessages.size} 条消息</div>
      )}
    </div>
  );
}
```

## 📱 响应式设计

- 移动端优化的触控交互
- 自适应屏幕尺寸
- 支持触摸长按手势
- 键盘友好的导航

## 🚀 高级功能

### 自定义消息类型
可以通过扩展 `Message` 接口来支持新的消息类型：

```tsx
interface CustomMessage extends BaseMessage {
  type: 'custom';
  content: {
    customData: any;
  };
}
```

### 自定义操作
可以通过 `ActionMenu` 组件添加自定义操作按钮。

### 性能优化
- 虚拟滚动支持（需要外部实现）
- 图片懒加载
- 音频/视频按需加载

## 🎯 最佳实践

1. **消息ID管理**: 确保每条消息都有唯一的ID
2. **时间戳处理**: 使用统一的时间戳格式
3. **错误处理**: 为媒体文件提供加载失败的fallback
4. **无障碍性**: 使用语义化的HTML和ARIA标签
5. **性能考虑**: 对长消息列表使用虚拟滚动

## 🐛 已知限制

- 地图组件需要配置Google Maps API密钥
- 语音播放需要浏览器支持Web Audio API
- 某些动画效果在低端设备上可能性能不佳

## 🔮 未来规划

- [ ] 语音转文字功能
- [ ] 消息翻译
- [ ] 更多动画效果
- [ ] 主题编辑器
- [ ] 插件系统

---

这个消息气泡系统为现代聊天应用提供了完整的UI解决方案，具有良好的扩展性和定制性。