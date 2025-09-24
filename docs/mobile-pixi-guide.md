# PixiJS 移动端优化系统

这是一个为移动设备优化的完整 PixiJS 系统，包含触摸处理、性能管理、设备适配和滚动管理等核心功能。

## 🌟 特性

### 触摸管理 (TouchManager)
- ✅ 多点触摸支持
- ✅ 手势识别（单击、双击、长按、滑动、缩放、拖拽）
- ✅ 防抖和节流优化
- ✅ 性能监控和统计
- ✅ 完整的事件系统

### 性能管理 (PerformanceManager)
- ✅ 视窗裁剪（Viewport Culling）
- ✅ 对象池管理
- ✅ 纹理压缩和管理
- ✅ 渲染批次优化
- ✅ 内存监控和清理
- ✅ 低端设备检测和优化

### 设备适配 (AdaptationManager)
- ✅ 多分辨率自适应
- ✅ 安全区域适配（iPhone X 刘海屏等）
- ✅ 横竖屏切换处理
- ✅ 设备像素比处理
- ✅ 坐标转换工具

### 滚动管理 (ScrollManager)
- ✅ 惯性滚动
- ✅ 边界回弹
- ✅ 滚动边界设置
- ✅ 平滑动画
- ✅ 性能优化

## 🚀 快速开始

### 基本使用

```javascript
import { MobilePixiApp } from './mobile/MobilePixiApp.js';

// 创建优化的移动端应用
const app = await MobilePixiApp.createOptimized({
    width: 1920,
    height: 1080,
    backgroundColor: 0x1099bb
});

// 添加画布到页面
document.body.appendChild(app.app.canvas);
```

### 高级配置

```javascript
const app = new MobilePixiApp({
    // 基础配置
    width: 1920,
    height: 1080,
    backgroundColor: 0x1099bb,
    
    // 启用/禁用功能模块
    enableTouch: true,
    enablePerformanceOptimization: true,
    enableAdaptation: true,
    enableScrolling: true,
    debugMode: false,
    
    // 触摸管理配置
    touchOptions: {
        enableMultiTouch: true,
        enableGestures: true,
        tapThreshold: 10,
        longPressDelay: 500,
        debugMode: false
    },
    
    // 性能管理配置
    performanceOptions: {
        enableViewportCulling: true,
        enableObjectPooling: true,
        targetFPS: 60,
        cullMargin: 100,
        maxPoolSize: 1000
    },
    
    // 设备适配配置
    adaptationOptions: {
        baseWidth: 1920,
        baseHeight: 1080,
        scaleMode: 'contain', // 'contain', 'cover', 'fill', 'none'
        enableSafeAreaDetection: true,
        enableOrientationHandling: true
    },
    
    // 滚动管理配置
    scrollOptions: {
        friction: 0.92,
        bounceStrength: 0.3,
        enableInertia: true,
        enableBounce: true,
        enableHorizontalScroll: true,
        enableVerticalScroll: true
    }
});
```

## 📱 触摸事件处理

### 监听触摸事件

```javascript
// 基础触摸事件
app.app.on('touch-tap', (data) => {
    console.log('单击:', data.x, data.y);
});

app.app.on('touch-doubletap', (data) => {
    console.log('双击:', data.x, data.y);
});

app.app.on('touch-longpress', (data) => {
    console.log('长按:', data.x, data.y);
});

// 手势事件
app.app.on('touch-swipe', (data) => {
    console.log('滑动:', data.deltaX, data.deltaY);
});

app.app.on('touch-pinch', (data) => {
    console.log('缩放:', data.scale, '中心:', data.centerX, data.centerY);
});

app.app.on('touch-pan', (data) => {
    console.log('拖拽:', data.deltaX, data.deltaY);
});
```

### 触摸状态查询

```javascript
const touchManager = app.getTouchManager();

// 获取当前触摸数量
const touchCount = touchManager.getTouchCount();

// 获取所有触摸点
const touches = touchManager.getAllTouches();

// 获取统计信息
const stats = touchManager.getStats();
console.log('触摸事件总数:', stats.touchEvents);
console.log('手势事件总数:', stats.gestureEvents);
```

## ⚡ 性能优化

### 对象池使用

```javascript
const performanceManager = app.getPerformanceManager();

// 从对象池获取对象
const sprite = performanceManager.getFromPool('Sprite', (sprite) => {
    // 重置函数，用于初始化对象
    sprite.texture = PIXI.Texture.WHITE;
    sprite.tint = 0xff0000;
});

// 使用完毕后归还对象池
performanceManager.returnToPool('Sprite', sprite);
```

### 视窗裁剪

```javascript
// 设置视窗（只渲染视窗内的对象）
performanceManager.setViewport(0, 0, 800, 600);

// 标记对象可被裁剪
sprite.cullable = true; // 默认为true

// 不希望被裁剪的对象
ui.cullable = false;
```

### 纹理管理

```javascript
// 清理未使用的纹理
const cleanedCount = performanceManager.cleanupUnusedTextures();

// 创建压缩纹理（WebP格式，质量80%）
const compressedTexture = await performanceManager.createCompressedTexture(
    'image.jpg', 'webp', 0.8
);

// 强制垃圾回收
performanceManager.forceGarbageCollection();
```

### 性能监控

```javascript
// 获取性能统计
const stats = performanceManager.getStats();
console.log('FPS:', stats.fps);
console.log('帧时间:', stats.frameTime);
console.log('绘制调用:', stats.drawCalls);
console.log('纹理内存:', stats.textureMemory);
console.log('渲染对象:', stats.objectsRendered);
console.log('裁剪对象:', stats.objectsCulled);
```

## 📐 设备适配

### 坐标转换

```javascript
const adaptationManager = app.getAdaptationManager();

// 屏幕坐标转换为画布坐标
const canvasPos = adaptationManager.screenToCanvas(screenX, screenY);

// 画布坐标转换为屏幕坐标
const screenPos = adaptationManager.canvasToScreen(canvasX, canvasY);
```

### 安全区域处理

```javascript
// 获取安全区域信息
const safeArea = adaptationManager.getSafeArea();
console.log('安全区域:', safeArea); // {top, right, bottom, left}

// 将容器应用安全区域
const uiContainer = new PIXI.Container();
adaptationManager.applySafeAreaToContainer(uiContainer);

// 获取画布坐标系中的安全区域
const safeAreaInCanvas = adaptationManager.getSafeAreaInCanvasSpace();
```

### 设备信息

```javascript
// 获取设备信息
const deviceInfo = adaptationManager.getDeviceInfo();
console.log('设备平台:', deviceInfo.platform);
console.log('是否移动设备:', deviceInfo.isMobile);
console.log('是否平板:', deviceInfo.isTablet);
console.log('像素比:', deviceInfo.pixelRatio);
console.log('屏幕方向:', deviceInfo.orientation);

// 监听方向变化
app.app.on('mobile-orientation-change', (data) => {
    console.log('方向改变:', data.from, '->', data.to);
});
```

## 📜 滚动控制

### 基本滚动操作

```javascript
const scrollManager = app.getScrollManager();

// 设置滚动边界
scrollManager.setBoundaries(0, 2000, 0, 1500); // minX, maxX, minY, maxY

// 滚动到指定位置
scrollManager.setScrollPosition(100, 200); // 立即滚动
scrollManager.setScrollPosition(100, 200, true); // 动画滚动

// 获取滚动位置
const position = scrollManager.getScrollPosition();

// 添加速度（用于程序化滚动）
scrollManager.addVelocity(10, -5); // velocityX, velocityY
```

### 滚动事件监听

```javascript
// 滚动位置改变
app.app.on('scroll-change', (data) => {
    console.log('滚动位置:', data.x, data.y);
    console.log('滚动增量:', data.deltaX, data.deltaY);
    console.log('滚动速度:', data.velocityX, data.velocityY);
});

// 滚动停止
app.app.on('scroll-stop', (data) => {
    console.log('滚动停止在:', data.x, data.y);
});
```

### 滚动配置

```javascript
// 运行时修改滚动配置
scrollManager.config.friction = 0.95; // 更低的摩擦力，滚动更远
scrollManager.config.bounceStrength = 0.5; // 更强的回弹效果
scrollManager.config.enableBounce = false; // 禁用回弹
```

## 🛠 调试和监控

### 启用调试模式

```javascript
// 全局调试模式
app.setDebugMode(true);

// 单独模块调试
app.getTouchManager().setDebugMode(true);
app.getPerformanceManager().setDebugMode(true);
app.getAdaptationManager().setDebugMode(true);
app.getScrollManager().setDebugMode(true);
```

### 获取综合统计

```javascript
// 获取所有模块的详细统计
const detailedStats = app.getDetailedStats();
console.log('详细统计:', detailedStats);

// 包含以下信息：
// - touch: 触摸事件统计
// - performance: 性能统计
// - adaptation: 适配信息
// - scroll: 滚动状态
// - device: 设备信息
```

## 🎯 最佳实践

### 1. 性能优化建议

```javascript
// 为经常创建/销毁的对象使用对象池
const bullet = performanceManager.getFromPool('Sprite');
// 使用完毕后归还
performanceManager.returnToPool('Sprite', bullet);

// 启用视窗裁剪减少不必要的渲染
sprite.cullable = true;

// 定期清理纹理
setInterval(() => {
    performanceManager.cleanupUnusedTextures();
}, 30000);
```

### 2. 触摸交互优化

```javascript
// 使用防抖减少频繁的触摸处理
let lastTouchTime = 0;
app.app.on('touch-swipe', (data) => {
    const now = performance.now();
    if (now - lastTouchTime < 16) return; // 限制为60fps
    lastTouchTime = now;
    
    // 处理滑动
});

// 区分不同的手势
app.app.on('touch-pinch', (data) => {
    if (data.scale > 1.1) {
        // 放大
    } else if (data.scale < 0.9) {
        // 缩小
    }
});
```

### 3. 设备适配优化

```javascript
// 根据设备性能调整质量
const deviceInfo = app.getAdaptationManager().getDeviceInfo();

if (deviceInfo.platform.startsWith('android') && !deviceInfo.isRetina) {
    // 安卓低端设备，降低渲染质量
    app.app.renderer.resolution = 0.75;
}

if (deviceInfo.isTablet) {
    // 平板设备，可以使用更高的目标帧率
    app.getPerformanceManager().config.targetFPS = 60;
} else {
    // 手机设备，降低目标帧率节省电量
    app.getPerformanceManager().config.targetFPS = 30;
}
```

### 4. 内存管理

```javascript
// 监控内存使用
setInterval(() => {
    const stats = app.getPerformanceManager().getStats();
    if (stats.textureMemory > 100 * 1024 * 1024) { // 100MB
        console.warn('纹理内存使用过高');
        app.getPerformanceManager().cleanupUnusedTextures();
    }
}, 10000);

// 页面隐藏时暂停应用
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        app.pause();
    } else {
        app.resume();
    }
});
```

## 🔧 故障排除

### 常见问题

1. **触摸事件不响应**
   - 确保元素的 `eventMode` 设置为 `'static'` 或 `'dynamic'`
   - 检查 CSS 中是否设置了 `touch-action: none`

2. **性能问题**
   - 启用视窗裁剪：`performanceManager.config.enableViewportCulling = true`
   - 使用对象池减少GC压力
   - 定期清理未使用的纹理

3. **适配问题**
   - 检查视口meta标签：`<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">`
   - 确保安全区域CSS变量可用

4. **滚动问题**
   - 检查滚动边界设置是否正确
   - 调整摩擦系数和回弹强度

### 调试工具

```javascript
// 启用详细日志
app.setDebugMode(true);

// 监控性能指标
const stats = app.getDetailedStats();
console.table(stats);

// 检查设备能力
const deviceInfo = app.getAdaptationManager().getDeviceInfo();
console.log('设备信息:', deviceInfo);

// 测试触摸功能
app.getTouchManager().config.debugMode = true;
```

## 📦 示例项目

查看 `src/mobile-demo.html` 获取完整的使用示例，包括：
- 完整的移动端优化配置
- 实时性能监控
- 交互式控制面板
- 各种触摸手势演示
- 自适应布局展示

## 📄 许可证

MIT License - 详见 LICENSE 文件
