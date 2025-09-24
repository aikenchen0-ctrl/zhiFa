# ChatMessageArea Component

基于 PIXI.js v8 的高性能聊天消息区组件，支持多种消息类型、交互功能和虚拟滚动优化。

## 功能特性

### 🎨 消息气泡系统
- **详细气泡**: 圆角边框 + 发送者名字（左上角，字体尺寸为消息内容的1/2）
- **简单气泡**: 圆角边框
- **自身消息**: 半透明白色玻璃材质，右对齐
- **别人消息**: 全透明玻璃材质，左对齐
- **文本阴影**: 所有文本都有阴影增加对比度

### 📱 消息类型支持
- ✅ 文本消息
- 📷 图片消息
- 🎵 语音消息（支持时长显示）
- 📹 视频消息
- 🔗 链接消息（支持预览）
- 📢 系统消息（无气泡，纯文本居中显示）

### 🎯 交互功能
- **点击气泡**: 显示操作按钮组
  - 🎭 话外音
  - 📋 复制
  - ↗️ 转发
  - ⭐ 收藏
  - ☑️ 多选
  - 💬 引用
  - 🔍 放大
  - 🗑️ 删除

- **消息多选模式**:
  - 圆形勾选框
  - 底部操作栏
  - 批量操作支持

### ⚡ 高性能特性
- **虚拟滚动**: 支持大量消息的流畅滚动
- **智能渲染**: 只渲染可见区域的消息
- **内存优化**: 自动清理非可见消息的渲染对象
- **动量滚动**: 带惯性的触摸滚动体验

## 快速开始

### 基本使用

```javascript
import ChatMessageArea from './components/ChatMessageArea.js';

// 创建聊天区域
const chatArea = new ChatMessageArea(400, 600);
await chatArea.init();

// 添加到页面
document.body.appendChild(chatArea.getView());

// 添加消息
chatArea.addMessage({
    type: 'text',
    content: 'Hello World!',
    sender: 'self',
    bubbleType: 'simple'
});
```

### 消息类型示例

#### 文本消息
```javascript
chatArea.addMessage({
    type: 'text',
    content: 'This is a text message',
    sender: 'other',
    senderName: 'Alice',
    bubbleType: 'detailed'
});
```

#### 图片消息
```javascript
chatArea.addMessage({
    type: 'image',
    content: 'shared an image',
    sender: 'self',
    bubbleType: 'simple'
});
```

#### 语音消息
```javascript
chatArea.addMessage({
    type: 'voice',
    content: 'voice message',
    sender: 'other',
    senderName: 'Bob',
    bubbleType: 'detailed',
    duration: '0:30'
});
```

#### 视频消息
```javascript
chatArea.addMessage({
    type: 'video',
    content: 'shared a video',
    sender: 'self',
    bubbleType: 'simple'
});
```

#### 链接消息
```javascript
chatArea.addMessage({
    type: 'link',
    content: 'Check this out',
    sender: 'other',
    senderName: 'Charlie',
    bubbleType: 'detailed',
    title: 'Amazing Website',
    url: 'https://example.com',
    description: 'This is an amazing website with lots of features!'
});
```

#### 系统消息
```javascript
chatArea.addMessage({
    type: 'system',
    content: 'User joined the chat'
});
```

## API 文档

### 构造函数
```javascript
new ChatMessageArea(width, height)
```

### 主要方法

#### `addMessage(message)`
添加新消息到聊天区域。

**参数**:
- `message.type`: 消息类型 ('text', 'image', 'voice', 'video', 'link', 'system')
- `message.content`: 消息内容
- `message.sender`: 发送者 ('self' 或 'other')
- `message.senderName`: 发送者名字（仅对 'other' 有效）
- `message.bubbleType`: 气泡类型 ('simple' 或 'detailed')

#### `scrollToBottom()`
滚动到最新消息。

#### `resize(width, height)`
调整组件尺寸。

#### `destroy()`
销毁组件，释放资源。

### 事件处理

#### 消息交互
- 点击消息气泡显示操作菜单
- 长按进入多选模式
- 在多选模式下点击切换选择状态

#### 滚动交互
- 鼠标滚轮滚动
- 触摸拖拽滚动
- 带惯性的动量滚动

## 演示页面

访问 `src/chat-message-demo.html` 查看完整的功能演示。

演示包含：
- 多种消息类型展示
- 实时性能监控
- 交互功能测试
- 响应式布局

## 性能优化

### 虚拟滚动
- 只渲染可见区域的消息（约10-15条）
- 动态添加/移除消息视图
- 支持数千条消息流畅滚动

### 内存管理
- 自动清理非可见消息的渲染对象
- 复用消息组件
- 垃圾回收优化

### 渲染优化
- PIXI.js GPU 加速渲染
- 批量更新操作
- 智能重绘机制

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 依赖

- PIXI.js v8.0.0+
- ES6 模块支持

## 测试

运行测试套件：
```bash
npm test
```

测试包含：
- 单元测试（100+ 测试用例）
- 性能基准测试
- 内存泄漏检测
- 交互功能验证

## 故障排除

### 常见问题

1. **消息不显示**
   - 检查 PIXI.js 是否正确加载
   - 确认消息数据格式正确

2. **滚动卡顿**
   - 检查设备性能
   - 减少同时渲染的消息数量

3. **内存使用过高**
   - 定期清理旧消息
   - 检查事件监听器是否正确移除

### 调试模式

启用详细日志：
```javascript
// 在创建组件前设置
window.DEBUG_CHAT = true;
```

## 许可证

MIT License