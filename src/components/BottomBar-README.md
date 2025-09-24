# BottomBar 组件使用说明

## 概述

基于 PixiJS v8 开发的高性能底部导航栏组件，采用 Vision UI 设计风格，提供流畅的动画效果和丰富的交互功能。

## 功能特性

### ✨ 核心功能
- 🎯 **居中输入框** - 自适应宽度的输入区域
- 👈 **左侧小图标** - 语音按钮 + 主页/表情动态切换
- 👉 **右侧小图标** - 礼物按钮 + 功能展开按钮
- 📜 **滚动按钮组** - 输入框激活时显示的快捷操作
- 📋 **展开菜单** - 12个功能选项的网格布局

### 🎨 设计特色
- **Vision UI 风格** - 半透明毛玻璃效果
- **流畅动画** - 基于 PIXI.Ticker 的平滑过渡
- **响应式布局** - 自动适应不同屏幕尺寸
- **详细日志** - 完整的事件追踪和调试信息

## 快速开始

### 基础用法

```javascript
import { BottomBar } from './components/BottomBar.js';

// 创建 PIXI 应用
const app = new PIXI.Application();
await app.init({
    width: 375,
    height: 812,
    backgroundColor: 0x1e1e1e
});

// 创建底部栏实例
const bottomBar = new BottomBar(app.screen.width, 80);
bottomBar.position.set(0, app.screen.height - 80);
app.stage.addChild(bottomBar);
```

### 事件监听

```javascript
// 输入框状态变化
bottomBar.events.on('inputStateChange', (data) => {
    console.log('输入框激活状态:', data.active);
});

// 语音模式切换
bottomBar.events.on('voiceModeChange', (data) => {
    console.log('语音模式:', data.voiceMode);
});

// 菜单展开/收起
bottomBar.events.on('menuExpandedChange', (data) => {
    console.log('菜单状态:', data.expanded);
});

// 滚动按钮点击
bottomBar.events.on('scrollButtonClick', (data) => {
    console.log('滚动按钮:', data.type);
});

// 菜单选项点击
bottomBar.events.on('menuOptionClick', (data) => {
    console.log('菜单选项:', data.type);
});
```

## API 参考

### 构造函数

```javascript
new BottomBar(width = 375, height = 80)
```

**参数:**
- `width` - 底部栏宽度
- `height` - 底部栏高度

### 公共方法

#### `setInputText(text: string)`
设置输入框文本内容

```javascript
bottomBar.setInputText('Hello World!');
```

#### `getInputText(): string`
获取当前输入框文本

```javascript
const text = bottomBar.getInputText();
```

#### `setVoiceMode(enabled: boolean)`
设置语音模式状态

```javascript
bottomBar.setVoiceMode(true);
```

#### `handleResize(width: number, height: number)`
处理窗口尺寸变化

```javascript
window.addEventListener('resize', () => {
    bottomBar.handleResize(window.innerWidth, window.innerHeight);
});
```

### 事件系统

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `inputStateChange` | `{ active: boolean, timestamp: number }` | 输入框激活状态变化 |
| `voiceModeChange` | `{ voiceMode: boolean, timestamp: number }` | 语音模式切换 |
| `homeClick` | `{ timestamp: number }` | 主页按钮点击 |
| `giftClick` | `{ timestamp: number }` | 礼物按钮点击 |
| `menuExpandedChange` | `{ expanded: boolean, timestamp: number }` | 菜单展开状态变化 |
| `scrollButtonClick` | `{ type: string, icon: string, color: number }` | 滚动按钮点击 |
| `menuOptionClick` | `{ type: string, icon: string, color: number }` | 菜单选项点击 |

## 组件结构

### 状态管理
```javascript
this.state = {
    inputActive: false,        // 输入框激活状态
    voiceMode: false,          // 语音模式
    menuExpanded: false,       // 菜单展开状态
    scrollOffset: 0,           // 滚动偏移量
    scrollButtonsVisible: false // 滚动按钮可见性
}
```

### 子组件
- `background` - 半透明背景
- `inputContainer` - 输入框容器
- `leftIcons` - 左侧图标容器
- `rightIcons` - 右侧图标容器
- `scrollContainer` - 滚动按钮容器
- `expandedMenu` - 展开菜单容器

## 技术细节

### 动画系统
组件使用 PIXI.Ticker 实现流畅的动画效果：

```javascript
// 图标切换动画
this.homeIcon.alpha = 0;
this.homeIcon.scale.set(0.8);

const ticker = new PIXI.Ticker();
ticker.add(() => {
    progress += 0.1;
    this.homeIcon.alpha = progress;
    this.homeIcon.scale.set(0.8 + (0.2 * progress));
});
```

### Vision UI 效果
通过 BlurFilter 和半透明材质实现毛玻璃效果：

```javascript
const blurFilter = new PIXI.BlurFilter({ 
    strength: 1.5,
    quality: 4 
});
this.background.filters = [blurFilter];
```

### 滚动交互
支持触摸和鼠标拖拽滚动：

```javascript
this.components.scrollContainer.on('pointermove', (event) => {
    if (!isDragging) return;
    const deltaX = event.global.x - startX;
    const newX = startScrollX + deltaX;
    this.scrollContent.x = Math.max(minScroll, Math.min(maxScroll, newX));
});
```

## 演示

### 在线演示
访问：`http://localhost:3000/src/bottom-bar-demo.html`

### 演示功能
- ✅ 实时事件日志
- ✅ 交互控制面板
- ✅ 响应式布局测试
- ✅ 动画效果展示

## 自定义配置

### 颜色主题
```javascript
// 修改主题色
const customColors = {
    primary: 0x007AFF,
    secondary: 0x34C759,
    accent: 0xFF6B6B,
    background: 0xFFFFFF
};
```

### 菜单选项
```javascript
// 自定义菜单选项
const menuOptions = [
    { text: '自定义', icon: '⚙️', color: 0x5856D6 },
    // ... 更多选项
];
```

## 最佳实践

1. **性能优化**
   - 合理使用动画，避免过度渲染
   - 及时清理不用的 Ticker 实例
   - 使用对象池管理大量图标

2. **交互设计**
   - 保持一致的视觉反馈
   - 提供清晰的状态指示
   - 确保触摸目标足够大

3. **可访问性**
   - 提供键盘导航支持
   - 添加屏幕阅读器支持
   - 保持合适的颜色对比度

## 故障排除

### 常见问题

**Q: 组件不显示？**
A: 检查 PIXI 应用是否正确初始化，确保组件位置设置正确。

**Q: 动画卡顿？**
A: 检查是否有内存泄漏，确保及时清理 Ticker 实例。

**Q: 触摸不响应？**
A: 确保设置了正确的 `eventMode: 'static'`。

### 调试模式
```javascript
// 启用详细日志
bottomBar.debug = true;

// 访问内部状态
console.log(bottomBar.state);
console.log(bottomBar.components);
```

## 版本兼容性

- **PixiJS**: v8.0+
- **浏览器**: Chrome 80+, Safari 14+, Firefox 75+
- **移动端**: iOS 13+, Android 8+

## 许可证

MIT License - 详见项目根目录 LICENSE 文件。