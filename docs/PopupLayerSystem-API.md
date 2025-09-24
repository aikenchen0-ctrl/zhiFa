# PopupLayerSystem API 文档

## 概述

PopupLayerSystem 是一个基于 PixiJS v8 的多层级弹出层系统，支持异形气泡、连接线、动态布局和移动端适配。

## 特性

- 🎨 **多层级气泡系统** - 支持主气泡、子气泡、副气泡的多层级结构
- 🔗 **智能连接线** - 自动绘制L型圆角连接线，支持多层级连接
- 📱 **响应式布局** - 智能判断触发位置，自动选择最佳布局方向
- ⚡ **流畅动画** - 支持弹性动画效果和缓动函数
- 🎯 **精确交互** - 支持点击触发、点击关闭、全局点击关闭
- 🎪 **样式丰富** - 基于 bubble-demo.html 设计规范，支持玻璃材质效果

## 安装使用

```html
<script src="https://pixijs.download/release/pixi.js"></script>
<script src="components/PopupLayerSystem.js"></script>
```

## 快速开始

```javascript
// 1. 创建 PixiJS 应用
const app = new PIXI.Application();
await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a237e
});

// 2. 创建弹出层系统
const popupSystem = new PopupLayerSystem(app, {
    enableDebugLogs: true,
    bubbleAnimationDuration: 300,
    connectionLineColor: 0x00AAFF
});

// 3. 创建触发元素
const triggerElement = new PIXI.Graphics()
    .circle(0, 0, 30)
    .fill(0xFF6B35);
triggerElement.x = 200;
triggerElement.y = 200;
app.stage.addChild(triggerElement);

// 4. 配置弹出层结构
const popupConfig = {
    main: {
        text: '主功能',
        color: 0x007AFF,
        size: 'large',
        hasAvatar: true,
        showSender: true,
        senderName: '系统'
    },
    subBubbles: [
        {
            text: '子功能1',
            color: 0x4CAF50,
            size: 'medium',
            sideBubbles: [
                { text: '子子功能1', color: 0xFF9800, size: 'small' },
                { text: '子子功能2', color: 0xE91E63, size: 'small' }
            ]
        },
        {
            text: '子功能2',
            color: 0x9C27B0,
            size: 'medium'
        }
    ],
    sideBubbles: [
        { text: '副功能1', color: 0x607D8B, size: 'small' },
        { text: '副功能2', color: 0x795548, size: 'small' }
    ]
};

// 5. 注册触发器
const triggerId = popupSystem.registerTrigger(triggerElement, popupConfig);
```

## API 参考

### 构造函数

#### `new PopupLayerSystem(app, options)`

创建新的弹出层系统实例。

**参数：**
- `app` (PIXI.Application) - PixiJS 应用实例
- `options` (Object, 可选) - 配置选项

**选项：**
```javascript
{
    enableDebugLogs: true,           // 启用调试日志
    bubbleAnimationDuration: 300,    // 动画持续时间(ms)
    connectionLineWidth: 3,          // 连接线宽度
    connectionLineColor: 0x00AAFF,   // 连接线颜色
    maxSubBubbles: 8,               // 最大子气泡数量
    maxSubSubBubbles: 6,            // 最大副气泡数量
    bubbleSpacing: 80,              // 气泡间距
    verticalSpacing: 60             // 垂直间距
}
```

### 主要方法

#### `registerTrigger(element, config)`

注册触发元素和弹出层配置。

**参数：**
- `element` (PIXI.DisplayObject) - 触发元素
- `config` (Object) - 弹出层配置

**返回：**
- `string` - 触发器唯一ID

**示例：**
```javascript
const triggerId = popupSystem.registerTrigger(element, {
    main: { /* 主气泡配置 */ },
    subBubbles: [ /* 子气泡配置数组 */ ],
    sideBubbles: [ /* 副气泡配置数组 */ ]
});
```

#### `closePopup(triggerId)`

关闭指定的弹出层。

**参数：**
- `triggerId` (string) - 触发器ID

#### `closeAllPopups()`

关闭所有活跃的弹出层。

#### `updateSystem()`

更新系统配置（如窗口大小变化时调用）。

#### `destroy()`

销毁系统并清理所有资源。

#### `getSystemStatus()`

获取系统当前状态。

**返回：**
```javascript
{
    activePopups: number,      // 活跃弹出层数量
    registeredTriggers: number, // 注册的触发器数量
    activeConnections: number,  // 活跃连接线数量
    systemInitialized: boolean // 系统是否已初始化
}
```

## 配置选项

### 气泡配置 (BubbleConfig)

```javascript
{
    text: string,           // 气泡文本
    color: number,          // 气泡颜色 (hex)
    size: 'small' | 'medium' | 'large', // 气泡尺寸
    hasAvatar: boolean,     // 是否显示头像
    showSender: boolean,    // 是否显示发送者名字
    senderName: string,     // 发送者名字
    sideBubbles: BubbleConfig[] // 副气泡配置数组
}
```

### 弹出层配置 (PopupConfig)

```javascript
{
    main: BubbleConfig,        // 主气泡配置
    subBubbles: BubbleConfig[], // 子气泡配置数组
    sideBubbles: BubbleConfig[] // 副气泡配置数组
}
```

### 尺寸配置

```javascript
// 'small'
{ width: 80, height: 40, fontSize: 12, padding: 8 }

// 'medium' 
{ width: 120, height: 50, fontSize: 14, padding: 12 }

// 'large'
{ width: 160, height: 60, fontSize: 16, padding: 16 }
```

## 布局算法

### 水平布局规则

- **触发元素在左半屏** → 子气泡向右分布
- **触发元素在右半屏** → 子气泡向左分布

### 垂直布局规则

- **副气泡始终向下分布**
- **支持边界检测和自动调整**

### 连接线系统

- **主连接线**: L型圆角连接，从触发元素到主气泡
- **子连接线**: 直线连接，从主气泡到子气泡
- **副连接线**: 直线连接，从父气泡到副气泡

## 事件系统

### 自动事件绑定

系统自动为注册的触发元素绑定以下事件：
- `pointerdown` - 触发弹出层显示/隐藏
- `pointerover/pointerout` - 悬停效果

### 全局事件处理

- **点击空白区域** - 关闭所有弹出层
- **点击触发元素** - 切换弹出层状态
- **窗口大小变化** - 自动重新布局

## 性能优化

### 内存管理
- 自动清理已关闭的弹出层
- 连接线对象池化
- 及时销毁不需要的图形对象

### 渲染优化
- 虚拟滚动支持
- 动画帧率控制
- 批量操作优化

### 移动端优化
- 触摸事件支持
- 响应式布局
- 边界检测

## 高级用法

### 自定义气泡样式

```javascript
// 重写气泡创建方法
const originalCreateBubble = popupSystem.createBubbleShape;
popupSystem.createBubbleShape = function(config) {
    const bubble = originalCreateBubble.call(this, config);
    
    // 添加自定义样式
    bubble.filters = [new PIXI.BlurFilter(2)];
    
    return bubble;
};
```

### 自定义连接线样式

```javascript
// 重写连接线绘制方法
const originalDrawLine = popupSystem.drawLShapedLine;
popupSystem.drawLShapedLine = function(graphics, fromPos, toPos, layoutDirection) {
    graphics.clear();
    
    // 自定义连接线样式
    graphics
        .moveTo(fromPos.x, fromPos.y)
        .lineTo(toPos.x, toPos.y)
        .stroke({
            width: 5,
            color: 0xFF6B35,
            alpha: 0.8,
            cap: 'round'
        });
};
```

### 动态更新弹出层

```javascript
// 监听触发器状态变化
popupSystem.on('popupCreated', (triggerId, popupInfo) => {
    console.log(`弹出层已创建: ${triggerId}`);
});

popupSystem.on('popupClosed', (triggerId) => {
    console.log(`弹出层已关闭: ${triggerId}`);
});
```

## 调试工具

### 启用调试模式

```javascript
const popupSystem = new PopupLayerSystem(app, {
    enableDebugLogs: true
});
```

### 调试信息

启用调试模式后，系统会输出详细的执行信息：
- 触发器注册状态
- 弹出层创建过程
- 布局计算结果
- 连接线绘制信息
- 性能指标

### 状态监控

```javascript
// 获取系统状态
const status = popupSystem.getSystemStatus();
console.log('系统状态:', status);

// 监控性能
setInterval(() => {
    const status = popupSystem.getSystemStatus();
    if (status.activePopups > 10) {
        console.warn('弹出层数量过多，可能影响性能');
    }
}, 1000);
```

## 常见问题

### Q: 弹出层超出屏幕边界怎么办？
A: 系统内置边界检测，会自动调整弹出层位置确保完全显示在屏幕内。

### Q: 如何自定义气泡的外观？
A: 通过 `BubbleConfig` 配置颜色、尺寸等，或重写 `createBubbleShape` 方法实现完全自定义。

### Q: 性能优化建议？
A: 
- 限制同时显示的弹出层数量
- 避免创建过深的气泡层级
- 及时调用 `closeAllPopups()` 清理不需要的弹出层
- 在不需要时调用 `destroy()` 方法

### Q: 移动端适配注意事项？
A: 
- 确保触发元素足够大（建议最小 44px）
- 测试各种屏幕尺寸和方向
- 考虑触摸事件的特殊性

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始发布
- 支持多层级气泡系统
- 实现智能布局算法
- 添加连接线系统
- 移动端适配
- 完整的 API 文档和示例