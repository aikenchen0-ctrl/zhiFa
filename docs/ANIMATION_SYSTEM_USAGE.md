# AnimationSystem 使用指南

## 概述

AnimationSystem 是一个为 PIXI.js v8 设计的高性能滚动和动画系统，提供了平滑滚动、UI动画、连接线动画和性能优化功能。

## 主要特性

### 🎯 滚动动画系统
- **平滑滚动插值** - 支持缓动函数的平滑滚动过渡
- **惯性滚动物理** - 真实的物理滚动体验，支持摩擦力和惯性
- **边界回弹动画** - 弹性边界约束，自然的回弹效果
- **虚拟滚动优化** - 视口外对象自动剔除，性能优化

### 🎨 UI动画系统
- **气泡出现/消失动画** - 符合 bubble-demo.html 标准的气泡动画
- **按钮点击反馈动画** - 按钮交互的视觉反馈
- **弹出层展开/收起动画** - 模态框和弹出层的流畅动画
- **区域扩展动画** - 动态尺寸变化的平滑过渡

### 🔗 连接线动画系统
- **连接线绘制动画** - 路径的逐步绘制效果
- **位置变化过渡** - 连接线路径的平滑变化
- **批量更新优化** - 多个连接线的高效批量处理

### ⚡ 性能优化
- **PIXI.Ticker 集成** - 使用 PIXI 官方 ticker 确保 60fps
- **对象池管理** - 减少垃圾回收，提升性能
- **内存优化** - 智能内存管理和清理
- **详细性能日志** - 实时性能监控和分析

## 快速开始

### 1. 基础初始化

```javascript
import * as PIXI from 'pixi.js';
import { AnimationSystem } from './src/systems/AnimationSystem.js';

// 创建 PIXI 应用
const app = new PIXI.Application();
await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true
});

// 初始化动画系统
const animationSystem = new AnimationSystem(app, {
    debugMode: true,
    showPerformanceStats: true
});
```

### 2. 滚动功能

```javascript
// 平滑滚动到指定位置
animationSystem.scrollTo(500, 300, true);

// 设置滚动边界
animationSystem.setScrollBounds({
    x: 0, y: 0, 
    width: 3000, height: 2000
});

// 获取当前滚动位置
const position = animationSystem.getScrollPosition();
console.log('当前位置:', position);
```

### 3. 气泡动画

```javascript
// 创建气泡对象
const bubble = new PIXI.Container();
// ... 添加气泡内容 ...

// 气泡出现动画
animationSystem.animateBubble(bubble, 'appear', {
    fromSide: 'left'
});

// 气泡消失动画
animationSystem.animateBubble(bubble, 'disappear', {
    toSide: 'right'
});
```

### 4. 按钮动画

```javascript
// 按钮点击动画
button.on('pointerdown', () => {
    animationSystem.animateButton(button);
});
```

### 5. 弹出层动画

```javascript
// 展开弹出层
animationSystem.animatePopup(popup, 'expand');

// 收起弹出层
animationSystem.animatePopup(popup, 'collapse');
```

### 6. 连接线动画

```javascript
// 连接线绘制动画
const path = [
    { x: 100, y: 100 },
    { x: 200, y: 150 },
    { x: 300, y: 100 }
];

animationSystem.animateConnection(connectionLine, 'draw', path);

// 连接线移动动画
const newPath = [
    { x: 150, y: 120 },
    { x: 250, y: 180 },
    { x: 350, y: 120 }
];

animationSystem.animateConnection(connectionLine, 'move', newPath);
```

## 高级配置

### 配置选项

```javascript
const animationSystem = new AnimationSystem(app, {
    // 滚动配置
    scrollConfig: {
        friction: 0.92,              // 摩擦力系数
        elasticity: 0.85,            // 弹性系数
        inertiaDecay: 0.88,         // 惯性衰减
        bounceStrength: 0.15,        // 回弹强度
        maxVelocity: 40,            // 最大速度
        minVelocity: 0.1,           // 最小速度
        enableVirtualScrolling: true // 启用虚拟滚动
    },
    
    // 动画配置
    animationConfig: {
        enableGPUAcceleration: true, // GPU 加速
        targetFPS: 60,              // 目标帧率
        maxAnimations: 500,         // 最大动画数量
        defaultDuration: 300,       // 默认动画时长
        defaultEasing: 'easeOutCubic' // 默认缓动函数
    },
    
    // 性能配置
    performanceConfig: {
        enableObjectPooling: true,   // 启用对象池
        enableBatching: true,        // 启用批处理
        maxBatchSize: 100,          // 批处理大小
        memoryCleanupInterval: 30000, // 内存清理间隔
        adaptiveQuality: true        // 自适应质量
    }
});
```

### 性能监控

```javascript
// 启用性能监控
animationSystem.enableDebugMode(true);

// 获取性能指标
const metrics = animationSystem.getPerformanceMetrics();
console.log('性能指标:', metrics);

// 移动端优化
animationSystem.optimizeForMobile();
```

## 缓动函数

系统支持多种缓动函数：

- `linear` - 线性
- `easeInQuad` - 二次缓入
- `easeOutQuad` - 二次缓出
- `easeInOutQuad` - 二次缓入缓出
- `easeInCubic` - 三次缓入
- `easeOutCubic` - 三次缓出
- `easeInOutCubic` - 三次缓入缓出
- `easeInQuart` - 四次缓入
- `easeOutQuart` - 四次缓出
- `easeInBack` - 回弹缓入
- `easeOutBack` - 回弹缓出
- `easeOutElastic` - 弹性缓出

## 自定义动画

```javascript
// 创建自定义动画
const animation = animationSystem.createAnimation({
    target: sprite,
    to: { 
        x: 500, 
        y: 300, 
        rotation: Math.PI,
        alpha: 0.5 
    },
    duration: 1000,
    easing: 'easeOutBack',
    priority: 'high',
    onUpdate: (values, progress) => {
        console.log('动画进度:', progress);
    },
    onComplete: () => {
        console.log('动画完成');
    }
});

// 取消动画
animation.cancel();
```

## 动画序列

```javascript
// 创建动画序列
const sequence = animationSystem.createSequence([
    animationSystem.createAnimation({
        target: sprite,
        to: { x: 200 },
        duration: 500
    }),
    animationSystem.createAnimation({
        target: sprite,
        to: { y: 200 },
        duration: 500
    }),
    animationSystem.createAnimation({
        target: sprite,
        to: { rotation: Math.PI },
        duration: 300
    })
]);

// 等待序列完成
await sequence.promise;
```

## 事件处理

```javascript
// 滚动事件（自动处理）
// 系统会自动监听以下事件：
// - pointerdown/pointermove/pointerup (触摸/鼠标)
// - wheel (滚轮)

// 手动触发滚动
animationSystem.scrollState.velocity.x = 10;
animationSystem.scrollState.velocity.y = 5;
animationSystem.scrollState.isInertia = true;
```

## 性能优化建议

### 1. 对象池使用
```javascript
// 获取对象池中的对象
const bubble = animationSystem.objectPool.getBubble('Hello World');
const avatar = animationSystem.objectPool.getAvatar(texture);

// 使用完后释放回对象池
animationSystem.objectPool.release(bubble);
animationSystem.objectPool.release(avatar);
```

### 2. 批量操作
```javascript
// 批量释放对象
const objects = [bubble1, bubble2, bubble3];
animationSystem.objectPool.releaseBatch(objects);
```

### 3. 虚拟滚动
```javascript
// 为对象启用视口剔除
sprite.cullable = true;

// 系统会自动处理视口外对象的隐藏
```

### 4. 内存管理
```javascript
// 手动触发内存清理
animationSystem.performanceOptimizer.performMemoryCleanup();

// 启用自适应质量
animationSystem.config.performanceConfig.adaptiveQuality = true;
```

## 调试和故障排除

### 1. 启用调试模式
```javascript
animationSystem.enableDebugMode(true);
```

### 2. 性能统计
```javascript
// 查看实时性能统计
const stats = animationSystem.getPerformanceMetrics();
console.table({
    'FPS': stats.fps,
    '帧时间': `${stats.frameTime.toFixed(2)}ms`,
    '活跃动画': stats.animationsActive,
    '内存使用': `${stats.memoryUsage.used}MB`
});
```

### 3. 常见问题

**Q: 动画不流畅？**
A: 检查帧率和动画数量，考虑启用帧跳跃或减少同时运行的动画。

**Q: 内存使用过高？**
A: 确保正确释放对象到对象池，启用定期内存清理。

**Q: 滚动感觉不自然？**
A: 调整摩擦力、弹性等物理参数，或者修改缓动函数。

## 测试

运行测试页面：
```bash
# 启动本地服务器
npx http-server -p 3000

# 访问测试页面
http://localhost:3000/tests/animation-system-test.html
```

测试页面包含：
- 所有动画类型的演示
- 性能监控界面
- 交互式控制面板
- 实时统计信息

## API 参考

### 主要方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `scrollTo(x, y, smooth)` | x: number, y: number, smooth: boolean | Promise/void | 滚动到指定位置 |
| `animateBubble(bubble, type, options)` | bubble: Container, type: string, options: object | Animation | 气泡动画 |
| `animateButton(button)` | button: DisplayObject | Animation | 按钮动画 |
| `animatePopup(popup, type)` | popup: DisplayObject, type: string | Animation | 弹出层动画 |
| `createAnimation(options)` | options: object | Animation | 创建自定义动画 |
| `getPerformanceMetrics()` | - | object | 获取性能指标 |

### 配置属性

详细配置选项请参考源码中的配置对象注释。

## 许可证

本项目遵循 MIT 许可证。