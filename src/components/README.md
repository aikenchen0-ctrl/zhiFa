# PixiJS UI Components

基于 PixiJS v8 的现代UI组件库，专为移动端聊天应用设计，具备Vision UI材质系统和完整的状态管理。

## 🚀 特性

- **Vision UI 材质系统** - 半透明玻璃效果和背景模糊
- **响应式组件** - 适配不同屏幕尺寸和方向
- **状态管理** - 集中化状态管理和组件通信
- **交互菜单** - 动态上下文菜单和手势支持
- **消息气泡** - 支持多种消息类型和动态大小
- **性能优化** - 组件缓存和智能渲染
- **错误处理** - 完整的日志系统和错误恢复
- **TypeScript 友好** - 完整的类型定义支持

## 📦 组件清单

### 核心组件

1. **BottomBar** - 底部导航栏
   - 输入框（带激活状态）
   - 语音/主页切换按钮
   - 可滚动功能按钮
   - 12个扩展功能选项

2. **TopBar** - 顶部状态栏
   - 状态指示器（小红点）
   - 会话名称按钮
   - 编辑/搜索图标
   - 用户头像和加人按钮

3. **MessageBubble** - 消息气泡
   - 文本、图片、文件、音频、视频消息
   - 自适应大小和方向
   - 时间戳和状态指示器
   - 点击交互支持

4. **VisionMaterial** - Vision UI材质系统
   - 半透明玻璃材质（自己发送）
   - 全透明玻璃材质（别人发送）
   - 背景模糊和文字阴影
   - 材质缓存和性能优化

5. **InteractionMenu** - 交互菜单
   - 动态菜单项
   - 自动定位和边界检测
   - 键盘导航支持
   - 平滑动画效果

6. **StateManager** - 状态管理器
   - 全局状态管理
   - 组件生命周期跟踪
   - 错误处理和日志记录
   - 性能监控

## 🛠️ 快速开始

### 安装依赖

```bash
npm install pixi.js@8.0.0
```

### 基础使用

```javascript
import { createUIFactory } from './components/index.js';
import * as PIXI from 'pixi.js';

// 创建 PIXI 应用
const app = new PIXI.Application({
    width: 375,
    height: 812,
    backgroundColor: 0xF5F5F5,
    antialias: true
});

// 添加到 DOM
document.body.appendChild(app.view);

// 创建 UI 工厂
const uiFactory = createUIFactory(app, {
    theme: 'light',
    enableStateManagement: true,
    enableErrorHandling: true
});

// 创建组件
const topBar = uiFactory.createTopBar();
const bottomBar = uiFactory.createBottomBar();

// 添加消息
uiFactory.addMessageBubble({
    id: '1',
    text: 'Hello World!',
    isOwn: false,
    timestamp: new Date(),
    type: 'text'
});
```

### 高级用法

```javascript
import { 
    BottomBar, 
    TopBar, 
    MessageBubble, 
    VisionMaterial, 
    InteractionMenu,
    getStateManager 
} from './components/index.js';

// 获取状态管理器
const stateManager = getStateManager();

// 监听状态变化
stateManager.on('stateChange', (event) => {
    console.log('State changed:', event);
});

// 创建自定义消息气泡
const messageData = {
    id: 'msg-001',
    text: 'This is a custom message',
    type: 'text',
    isOwn: true,
    timestamp: new Date(),
    sender: 'user',
    status: 'sent'
};

const bubble = new MessageBubble(messageData, {
    maxWidth: 300,
    bubbleStyle: 'detailed',
    showTimestamp: true,
    animateIn: true
});

// 创建 Vision 材质
const visionMaterial = new VisionMaterial();
const glassBackground = visionMaterial.createGlassMaterial(
    visionMaterial.materials.GLASS_SEMI,
    200, 100, 12
);

// 显示交互菜单
const menuItems = [
    { id: 'copy', text: 'Copy', icon: '📋' },
    { id: 'reply', text: 'Reply', icon: '↩️' },
    { id: 'delete', text: 'Delete', icon: '🗑️', destructive: true }
];

const menu = new InteractionMenu();
menu.show(menuItems, { x: 100, y: 100 }, { messageId: 'msg-001' });
```

## 🎨 Vision UI 材质系统

### 材质类型

```javascript
import { VisionMaterial } from './components/index.js';

const materials = new VisionMaterial();

// 半透明玻璃（自己发送的消息）
const semiGlass = materials.createGlassMaterial(
    materials.materials.GLASS_SEMI,
    280, 60, 18
);

// 全透明玻璃（接收的消息）
const fullGlass = materials.createGlassMaterial(
    materials.materials.GLASS_FULL,
    280, 60, 18
);

// 背景模糊
const blurBg = materials.createBlurredBackground(
    375, 200, 'heavy'
);

// 霜化玻璃效果
const frosted = materials.createFrostedGlass(
    200, 100, 12
);
```

### 文字阴影

```javascript
// 应用文字阴影
const textWithShadow = materials.applyTextShadow(textObject, {
    color: 0x000000,
    alpha: 0.3,
    blur: 4,
    distance: 2,
    angle: Math.PI / 4
});
```

## 📱 响应式设计

### 屏幕适配

```javascript
// 监听屏幕尺寸变化
stateManager.on('resize', (event) => {
    const { width, height } = event;
    
    // 更新组件尺寸
    topBar.handleResize(width, 60);
    bottomBar.handleResize(width, 80);
});

// 方向变化
stateManager.on('orientationChange', (event) => {
    console.log('Orientation:', event.orientation);
});
```

### 自适应布局

```javascript
// 根据屏幕尺寸调整组件
const isLargeScreen = window.innerWidth > 768;
const bubbleMaxWidth = isLargeScreen ? 400 : 280;

const bubble = new MessageBubble(messageData, {
    maxWidth: bubbleMaxWidth,
    padding: isLargeScreen ? 20 : 16
});
```

## 🎯 事件系统

### 组件事件

```javascript
// 底部栏事件
bottomBar.events.on('inputStateChange', (data) => {
    console.log('Input active:', data.active);
});

bottomBar.events.on('voiceModeChange', (data) => {
    console.log('Voice mode:', data.voiceMode);
});

bottomBar.events.on('menuOptionClick', (data) => {
    console.log('Menu option:', data.type);
});

// 顶部栏事件
topBar.events.on('sessionClick', (data) => {
    console.log('Session clicked:', data.sessionName);
});

topBar.events.on('userClick', (data) => {
    console.log('User clicked:', data.userName);
});

// 消息气泡事件
bubble.events.on('bubbleClick', (data) => {
    console.log('Bubble clicked:', data.messageId);
});

bubble.events.on('bubbleRightClick', (data) => {
    // 显示上下文菜单
    showContextMenu(data.position, data.messageData);
});

// 交互菜单事件
menu.events.on('itemClick', (data) => {
    console.log('Menu item clicked:', data.item.id);
});
```

### 状态管理事件

```javascript
// 状态变化监听
stateManager.on('stateChange', (event) => {
    console.log(`State ${event.path} changed:`, event.newValue);
});

// 组件注册/注销
stateManager.on('componentRegistered', (event) => {
    console.log('Component registered:', event.id);
});

stateManager.on('componentUnregistered', (event) => {
    console.log('Component unregistered:', event.id);
});

// 错误处理
stateManager.on('error', (error) => {
    console.error('System error:', error);
});
```

## 🔧 配置选项

### 全局配置

```javascript
const uiFactory = createUIFactory(app, {
    theme: 'light',                    // 主题：light/dark
    width: 375,                        // 屏幕宽度
    height: 812,                       // 屏幕高度
    enableStateManagement: true,       // 启用状态管理
    enableErrorHandling: true,         // 启用错误处理
    enableLogging: true                // 启用日志记录
});
```

### 组件配置

```javascript
// TopBar 配置
const topBar = new TopBar(375, 60);
topBar.setSessionName('My Chat Room');
topBar.setUserName('John Doe');
topBar.setUnreadStatus(true);

// BottomBar 配置
const bottomBar = new BottomBar(375, 80);
bottomBar.setInputText('Type here...');
bottomBar.setVoiceMode(false);

// MessageBubble 配置
const bubble = new MessageBubble(messageData, {
    maxWidth: 280,              // 最大宽度
    minWidth: 80,               // 最小宽度
    borderRadius: 18,           // 圆角半径
    bubbleStyle: 'detailed',    // 样式：simple/detailed
    showTail: true,             // 显示尾巴
    showTimestamp: true,        // 显示时间戳
    animateIn: true             // 入场动画
});

// InteractionMenu 配置
const menu = new InteractionMenu({
    width: 200,                 // 菜单宽度
    itemHeight: 44,             // 项目高度
    borderRadius: 12,           // 圆角半径
    autoPosition: true,         // 自动定位
    hideOnClickOutside: true,   // 点击外部隐藏
    animationDuration: 200      // 动画时长
});
```

## 📊 性能优化

### 材质缓存

```javascript
// VisionMaterial 自动缓存材质
const materials = new VisionMaterial();

// 首次创建
const glass1 = materials.createGlassMaterial('GLASS_SEMI', 200, 100, 12);

// 相同参数会使用缓存
const glass2 = materials.createGlassMaterial('GLASS_SEMI', 200, 100, 12);

// 清除缓存
materials.clearMaterialCache();

// 获取缓存统计
const stats = materials.getCacheStats();
console.log('Cache size:', stats.size);
```

### 组件生命周期

```javascript
// 注册组件
stateManager.registerComponent('my-component', component, {
    autoCleanup: true,          // 自动清理
    trackPerformance: true,     // 性能跟踪
    handleErrors: true          // 错误处理
});

// 获取组件生命周期信息
const lifecycle = stateManager.getComponentLifecycle('my-component');
console.log('Component lifecycle:', lifecycle);

// 获取性能指标
const metrics = stateManager.getMetrics();
console.log('Performance metrics:', metrics);
```

### 内存管理

```javascript
// 正确销毁组件
component.destroy();

// 批量清理
stateManager.getAllComponents().forEach(comp => {
    if (comp.destroy) {
        comp.destroy();
    }
});

// 清理状态管理器
stateManager.destroy();
```

## 🐛 调试和日志

### 日志配置

```javascript
// 设置日志级别
stateManager.logger.level = 'debug'; // debug, info, warn, error
stateManager.logger.enableConsole = true;
stateManager.logger.enableStorage = true;

// 获取日志
const logs = stateManager.getLogs('error', 10);
console.log('Recent errors:', logs);

// 清除日志
stateManager.clearLogs();
```

### 错误处理

```javascript
// 监听错误
stateManager.on('error', (error) => {
    console.error('System error:', error);
    
    // 自定义错误处理
    if (error.context?.componentId) {
        console.log('Component error in:', error.context.componentId);
    }
});

// 手动报告错误
stateManager.handleError('Custom error', new Error('Something went wrong'), {
    customData: 'additional context'
});
```

## 🎮 示例和演示

查看 `src/pixi-ui-components-demo.html` 获取完整的交互式演示。

### 运行演示

1. 启动本地服务器：
   ```bash
   npx serve src/
   ```

2. 在浏览器中打开：
   ```
   http://localhost:3000/pixi-ui-components-demo.html
   ```

3. 交互功能：
   - 点击 "Add Message" 添加消息
   - 点击 "Toggle Theme" 切换主题
   - 点击 "Show Metrics" 查看性能指标
   - 点击消息气泡显示上下文菜单
   - 使用键盘快捷键：
     - `Enter` - 添加消息
     - `Escape` - 清除消息
     - `Cmd/Ctrl + T` - 切换主题

## 🔗 相关链接

- [PixiJS 官方文档](https://pixijs.download/dev/docs/index.html)
- [Vision UI 设计规范](https://developer.apple.com/design/human-interface-guidelines/materials)
- [移动端UI最佳实践](https://material.io/design/platform-guidance/android-chat.html)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**版本**: 1.0.0  
**PixiJS 版本要求**: 8.0.0+  
**最后更新**: 2025-09-14