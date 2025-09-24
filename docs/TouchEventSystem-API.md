# TouchEventSystem API 文档

## 概述

TouchEventSystem 是一个为 PIXI.js v8 设计的完整移动端触摸事件和手势处理系统，提供高性能的多点触控支持和丰富的手势识别功能。

## 主要特性

### 🚀 核心功能
- **多点触控支持**: 完整的多点触控事件处理
- **手势识别**: 点击、长按、滑动、拖拽、缩放等手势
- **高性能**: 使用节流和防抖优化
- **详细日志**: 可配置的触摸事件日志系统

### 📱 移动端优化
- **惯性滚动**: 平滑的惯性滚动效果
- **边界回弹**: 超出边界时的回弹动画
- **嵌套滚动**: 支持复杂的滚动场景
- **5秒停留检测**: 特殊的悬停交互检测

## 快速开始

### 基础使用

```javascript
import { TouchEventSystem } from './systems/TouchEventSystem.js';

// 创建 PIXI 应用
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight
});

// 初始化触摸系统
const touchSystem = new TouchEventSystem(app, {
    logLevel: 'info',
    tapMaxDuration: 300,
    longPressMinDuration: 500
});

// 监听事件
touchSystem.on('tap', (data) => {
    console.log('点击事件:', data.position);
});

touchSystem.on('swipe', (data) => {
    console.log('滑动手势:', data.direction, data.distance);
});
```

### 高级配置

```javascript
const touchSystem = new TouchEventSystem(app, {
    // 手势阈值
    tapMaxDuration: 300,        // 点击最大持续时间 (ms)
    tapMaxDistance: 10,         // 点击最大移动距离 (px)
    longPressMinDuration: 500,  // 长按最小持续时间 (ms)
    swipeMinDistance: 50,       // 滑动最小距离 (px)
    swipeMaxDuration: 500,      // 滑动最大持续时间 (ms)
    
    // 滚动设置
    scrollDecceleration: 0.95,      // 滚动减速率
    scrollBounceStiffness: 0.1,     // 边界回弹强度
    scrollBoundaryThreshold: 50,    // 边界阈值
    
    // 缩放设置
    pinchMinDistance: 10,       // 缩放最小距离
    pinchMaxScale: 3,          // 最大缩放比例
    pinchMinScale: 0.5,        // 最小缩放比例
    
    // 特殊交互
    hoverDetectionTime: 5000,   // 悬停检测时间 (ms)
    multiSelectDelay: 200,      // 多选延迟 (ms)
    
    // 性能优化
    throttleDelay: 16,          // 节流延迟 (~60fps)
    logLevel: 'info'            // 日志级别: debug, info, warn, error
});
```

## API 参考

### 构造函数

```javascript
new TouchEventSystem(pixiApp, options)
```

**参数:**
- `pixiApp`: PIXI.Application 实例
- `options`: 配置选项对象

### 方法

#### 事件监听

```javascript
// 添加事件监听器
const unsubscribe = touchSystem.on(eventName, callback);

// 移除事件监听器
touchSystem.off(eventName, callback);

// 或使用返回的取消订阅函数
unsubscribe();
```

#### 状态查询

```javascript
// 获取当前活跃的触摸点
const touches = touchSystem.getActiveTouches();

// 获取触摸点数量
const count = touchSystem.getTouchCount();

// 检查手势是否激活
const isActive = touchSystem.isGestureActive('drag');

// 获取滚动位置
const position = touchSystem.getScrollPosition();
```

#### 滚动控制

```javascript
// 设置滚动位置
touchSystem.setScrollPosition(x, y);

// 停止滚动
touchSystem.stopScroll();

// 自定义滚动边界
touchSystem.getScrollBounds = () => ({
    left: -1000,
    right: 1000,
    top: -500,
    bottom: 500
});
```

#### 配置更新

```javascript
// 动态更新配置
touchSystem.updateConfig({
    tapMaxDuration: 400,
    logLevel: 'debug'
});
```

#### 销毁

```javascript
// 清理资源
touchSystem.destroy();
```

## 事件系统

### 基础触摸事件

#### touchstart
触摸开始事件

```javascript
touchSystem.on('touchstart', (data) => {
    console.log('触摸开始:', {
        touch: data.touch,           // 触摸数据
        touches: data.touches,       // 所有触摸点
        originalEvent: data.originalEvent
    });
});
```

#### touchmove
触摸移动事件

```javascript
touchSystem.on('touchmove', (data) => {
    console.log('触摸移动:', {
        touch: data.touch,
        touches: data.touches,
        originalEvent: data.originalEvent
    });
});
```

#### touchend
触摸结束事件

```javascript
touchSystem.on('touchend', (data) => {
    console.log('触摸结束:', data);
});
```

#### touchcancel
触摸取消事件

```javascript
touchSystem.on('touchcancel', (data) => {
    console.log('触摸被取消:', data);
});
```

### 手势事件

#### tap
点击手势

```javascript
touchSystem.on('tap', (data) => {
    console.log('点击:', {
        position: data.position,     // 点击位置
        count: data.count,          // 点击次数 (多击检测)
        target: data.target,        // 点击目标
        touch: data.touch          // 触摸数据
    });
});
```

#### longpress
长按手势

```javascript
touchSystem.on('longpress', (data) => {
    console.log('长按:', {
        position: data.position,
        target: data.target,
        touch: data.touch
    });
});
```

#### swipe
滑动手势

```javascript
touchSystem.on('swipe', (data) => {
    console.log('滑动:', {
        direction: data.direction,      // 'left', 'right', 'up', 'down'
        distance: data.distance,        // 滑动距离
        velocity: data.velocity,        // 滑动速度
        startPosition: data.startPosition,
        endPosition: data.endPosition,
        target: data.target,
        touch: data.touch
    });
});
```

#### 拖拽事件

```javascript
// 拖拽开始
touchSystem.on('dragstart', (data) => {
    console.log('拖拽开始:', {
        position: data.position,
        startPosition: data.startPosition,
        target: data.target,
        touch: data.touch
    });
});

// 拖拽移动
touchSystem.on('dragmove', (data) => {
    console.log('拖拽移动:', {
        position: data.position,
        startPosition: data.startPosition,
        deltaPosition: data.deltaPosition,  // 移动增量
        target: data.target,
        touch: data.touch
    });
});

// 拖拽结束
touchSystem.on('dragend', (data) => {
    console.log('拖拽结束:', data);
});
```

#### pinch
缩放手势

```javascript
touchSystem.on('pinch', (data) => {
    console.log('缩放:', {
        scale: data.scale,              // 缩放比例
        center: data.center,            // 缩放中心点
        touches: data.touches           // 两个触摸点
    });
});

touchSystem.on('pinchend', (data) => {
    console.log('缩放结束:', {
        finalScale: data.finalScale
    });
});
```

### 滚动事件

#### scroll
滚动事件

```javascript
touchSystem.on('scroll', (data) => {
    console.log('滚动:', {
        position: data.position,        // 当前滚动位置
        delta: data.delta,             // 滚动增量 (可选)
        velocity: data.velocity        // 滚动速度 (可选)
    });
});
```

#### scrollend
滚动结束事件

```javascript
touchSystem.on('scrollend', (data) => {
    console.log('滚动结束:', {
        position: data.position
    });
});
```

### 特殊交互事件

#### multiselect
多选模式

```javascript
touchSystem.on('multiselect', (data) => {
    console.log('多选模式激活:', {
        position: data.position,
        target: data.target,
        touch: data.touch
    });
});
```

#### swipetoreveal
滑动显示更多

```javascript
touchSystem.on('swipetoreveal', (data) => {
    console.log('滑动显示更多:', {
        direction: data.direction,      // 滑动方向
        target: data.target,
        touch: data.touch
    });
});
```

#### hoverdetection
5秒停留检测

```javascript
touchSystem.on('hoverdetection', (data) => {
    console.log('检测到长时间停留:', {
        position: data.position,
        target: data.target,
        duration: data.duration,        // 停留时间
        touch: data.touch
    });
});
```

## 触摸数据结构

### Touch 对象

```javascript
{
    id: number,                    // 触摸点唯一标识
    startPosition: {x, y},         // 开始位置
    position: {x, y},              // 当前位置
    previousPosition: {x, y},      // 上一个位置
    deltaPosition: {x, y},         // 位置增量
    startTime: number,             // 开始时间戳
    previousTime: number,          // 上一次时间戳
    deltaTime: number,             // 时间增量
    velocity: {x, y},              // 速度向量
    target: PIXI.DisplayObject,    // 触摸目标
    endTime: number,               // 结束时间 (仅在 touchend 时)
    totalDuration: number          // 总持续时间 (仅在 touchend 时)
}
```

## 使用示例

### 基础点击处理

```javascript
touchSystem.on('tap', (data) => {
    if (data.target.userData?.type === 'button') {
        // 处理按钮点击
        data.target.tint = 0xFF0000;
        setTimeout(() => {
            data.target.tint = 0xFFFFFF;
        }, 200);
    }
});
```

### 对象拖拽

```javascript
let dragTarget = null;

touchSystem.on('dragstart', (data) => {
    if (data.target.userData?.draggable) {
        dragTarget = data.target;
        dragTarget.alpha = 0.7;
    }
});

touchSystem.on('dragmove', (data) => {
    if (dragTarget) {
        dragTarget.x += data.deltaPosition.x;
        dragTarget.y += data.deltaPosition.y;
    }
});

touchSystem.on('dragend', (data) => {
    if (dragTarget) {
        dragTarget.alpha = 1;
        dragTarget = null;
    }
});
```

### 滚动容器

```javascript
let container = new PIXI.Container();
let initialPosition = { x: 0, y: 0 };

touchSystem.on('scroll', (data) => {
    container.x = initialPosition.x + data.position.x;
    container.y = initialPosition.y + data.position.y;
});

// 设置滚动边界
touchSystem.getScrollBounds = () => ({
    left: -500,
    right: 500,
    top: -300,
    bottom: 300
});
```

### 缩放功能

```javascript
let scaleContainer = new PIXI.Container();
let baseScale = 1;

touchSystem.on('pinch', (data) => {
    scaleContainer.scale.set(baseScale * data.scale);
    
    // 以缩放中心点为原点
    const localCenter = scaleContainer.toLocal(data.center);
    scaleContainer.pivot.set(localCenter.x, localCenter.y);
    scaleContainer.position.set(data.center.x, data.center.y);
});
```

### 长按上下文菜单

```javascript
touchSystem.on('longpress', (data) => {
    showContextMenu(data.position, data.target);
});

function showContextMenu(position, target) {
    const menu = new PIXI.Graphics();
    menu.beginFill(0x000000, 0.8);
    menu.drawRoundedRect(0, 0, 120, 100, 5);
    menu.endFill();
    
    // 添加菜单项...
    
    menu.x = position.x;
    menu.y = position.y;
    app.stage.addChild(menu);
    
    // 3秒后自动关闭
    setTimeout(() => {
        if (menu.parent) {
            app.stage.removeChild(menu);
        }
    }, 3000);
}
```

## 性能优化

### 节流设置

```javascript
// 调整节流延迟以平衡性能和响应性
const touchSystem = new TouchEventSystem(app, {
    throttleDelay: 16  // 60fps
});

// 对于性能要求更高的场景
const highPerfTouchSystem = new TouchEventSystem(app, {
    throttleDelay: 33  // 30fps
});
```

### 日志控制

```javascript
// 生产环境关闭详细日志
const touchSystem = new TouchEventSystem(app, {
    logLevel: 'error'  // 只记录错误
});

// 开发环境启用详细日志
const touchSystem = new TouchEventSystem(app, {
    logLevel: 'debug'  // 记录所有信息
});
```

## 兼容性

- **PIXI.js**: v8.x
- **浏览器**: 现代移动端浏览器
- **事件**: 支持 Pointer Events API
- **触摸**: 多点触控支持

## 故障排除

### 常见问题

1. **事件不触发**
   - 确保目标对象设置了 `eventMode = 'static'`
   - 检查 `hitArea` 是否正确设置

2. **滚动不流畅**
   - 调整 `scrollDecceleration` 参数
   - 检查 `throttleDelay` 设置

3. **手势识别不准确**
   - 调整相关阈值参数
   - 检查触摸移动距离和时间限制

### 调试技巧

```javascript
// 启用详细日志
const touchSystem = new TouchEventSystem(app, {
    logLevel: 'debug'
});

// 监听所有事件
const events = ['touchstart', 'touchmove', 'touchend', 'tap', 'longpress', 'swipe', 'drag', 'pinch', 'scroll'];
events.forEach(eventName => {
    touchSystem.on(eventName, (data) => {
        console.log(`${eventName}:`, data);
    });
});
```

## 扩展功能

### 自定义手势

```javascript
// 扩展系统添加自定义手势
class ExtendedTouchSystem extends TouchEventSystem {
    _handleSingleTouchEnd(touch, event) {
        super._handleSingleTouchEnd(touch, event);
        
        // 添加自定义手势检测
        if (this.isCustomGesture(touch)) {
            this._dispatchEvent('customgesture', {
                touch,
                target: event.target
            });
        }
    }
    
    isCustomGesture(touch) {
        // 实现自定义手势逻辑
        return false;
    }
}
```

### 与其他系统集成

```javascript
// 与动画系统集成
touchSystem.on('swipe', (data) => {
    if (data.direction === 'left') {
        animationSystem.playTransition('slideLeft');
    }
});

// 与物理引擎集成
touchSystem.on('dragmove', (data) => {
    physicsBody.setPosition(data.position.x, data.position.y);
});
```