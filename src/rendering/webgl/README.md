# WebGL连接线渲染系统

一个高性能的WebGL实时连接线渲染引擎，专为聊天界面的气泡-头像连接线场景优化。

## 🚀 核心特性

### 高性能渲染
- **WebGL硬件加速**：利用GPU进行高效渲染
- **批量渲染**：智能合并渲染调用，减少GPU状态切换
- **视窗裁剪**：只渲染可见区域的连接线
- **自适应质量**：根据性能动态调整渲染质量
- **对象池优化**：重用对象减少垃圾回收

### 智能路径计算
- **圆角转折**：平滑的圆角过渡，避免生硬的直角
- **路径优化**：自动简化冗余点，提升渲染效率
- **实时跟随**：支持气泡和头像独立滚动时的连接线更新
- **多种连接模式**：支持左连接和右连接（自己/他人消息）

### 高级遮挡处理
- **智能遮挡**：连接线与头像、气泡重叠时自动隐藏
- **渐变过渡**：平滑的显示/隐藏动画效果
- **碰撞检测**：高效的空间索引算法进行碰撞检测
- **遮挡规则**：支持自定义遮挡策略

### 分支连接系统
- **异形弹出层**：支持复杂的分支连接线系统
- **动画效果**：流畅的分支展开/收起动画
- **多级分支**：支持多层级的分支结构
- **样式自定义**：灵活的分支样式配置

## 📦 系统架构

```
ConnectionRenderingEngine
├── core/
│   ├── WebGLRenderer.js          # WebGL核心渲染器
│   └── PathCalculator.js         # 路径计算引擎
├── renderers/
│   └── ConnectionLineRenderer.js # 连接线专用渲染器
├── managers/
│   └── SceneManager.js           # Three.js场景管理器
├── systems/
│   ├── CollisionDetector.js      # 碰撞检测系统
│   ├── BranchConnectionSystem.js # 分支连接系统
│   ├── OcclusionManager.js       # 遮挡管理系统
│   └── PerformanceOptimizer.js   # 性能优化器
└── examples/
    └── BasicUsageExample.js      # 使用示例
```

## 🛠️ 快速开始

### 基础用法

```javascript
import { createConnectionRenderingEngine } from './ConnectionRenderingEngine.js';

// 创建canvas元素
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

// 初始化引擎
const engine = createConnectionRenderingEngine(canvas, {
  enablePerformanceOptimization: true,
  enableCollisionDetection: true,
  enableBranchConnections: true,
  enableOcclusion: true
});

// 添加连接线
const bubbleInfo = { x: 100, y: 100, width: 200, height: 60 };
const avatarInfo = { x: 50, y: 100, width: 40, height: 40 };

await engine.addConnection('connection1', bubbleInfo, avatarInfo, {
  isSelf: false,
  style: {
    color: 0x4a90e2,
    width: 2,
    opacity: 0.8
  }
});

// 启动渲染
engine.start();
```

### 高级配置

```javascript
const options = {
  // 路径计算配置
  pathCalculator: {
    cornerRadius: 8,           // 圆角半径
    horizontalExtend: 5,       // 水平延伸距离
    pathPrecision: 0.1         // 路径精度
  },
  
  // 性能优化配置
  performance: {
    targetFPS: 60,             // 目标帧率
    adaptiveQuality: true,     // 自适应质量
    batchSize: 100,            // 批处理大小
    cullingEnabled: true       // 启用视窗裁剪
  },
  
  // 碰撞检测配置
  collision: {
    precision: 2,              // 检测精度
    enableCaching: true,       // 启用缓存
    cacheDuration: 100         // 缓存持续时间
  },
  
  // 遮挡配置
  occlusion: {
    fadeDistance: 10,          // 渐变距离
    minVisibleLength: 20,      // 最小可见长度
    occlusionAnimationDuration: 200 // 遮挡动画时长
  }
};

const engine = createConnectionRenderingEngine(canvas, options);
```

## 🎯 核心API

### 连接线管理

```javascript
// 添加连接线
await engine.addConnection(id, bubble, avatar, options);

// 更新连接线
engine.updateConnection(id, newBubble, newAvatar);

// 批量更新
const updates = [
  { id: 'conn1', bubble: bubble1, avatar: avatar1 },
  { id: 'conn2', bubble: bubble2, avatar: avatar2 }
];
engine.batchUpdateConnections(updates);

// 移除连接线
engine.removeConnection(id);

// 设置可见性
engine.setConnectionVisibility(id, visible);
```

### 分支连接系统

```javascript
// 创建分支连接
const popupElements = [
  { x: 150, y: 50, width: 80, height: 30 },
  { x: 180, y: 20, width: 80, height: 30 }
];

engine.createBranchConnections('branch1', mainConnection, popupElements, {
  branchColor: 0x9B59B6,
  branchWidth: 1.5,
  animationDuration: 500
});

// 更新分支连接
engine.updateBranchConnections('branch1', updatedMainConnection, newPopupElements);

// 移除分支连接
engine.removeBranchConnections('branch1');
```

### 状态管理

```javascript
// 更新滚动状态
engine.updateScrollState(
  { x: bubbleScrollX, y: bubbleScrollY },
  { x: avatarScrollX, y: avatarScrollY }
);

// 更新视窗
engine.updateViewport({ x: 0, y: 0, width: 1920, height: 1080 });

// 调整大小
engine.resize(newWidth, newHeight);
```

### 事件监听

```javascript
engine.on('initialized', () => {
  console.log('引擎初始化完成');
});

engine.on('connectionAdded', (data) => {
  console.log('连接线已添加:', data.id);
});

engine.on('rendered', (data) => {
  console.log('帧渲染时间:', data.frameTime);
});
```

## 🎨 样式配置

### 连接线样式

```javascript
const style = {
  color: 0x4a90e2,        // 颜色 (十六进制)
  width: 2,               // 线宽
  opacity: 0.8,           // 透明度
  dashed: false,          // 是否虚线
  dashSize: 5,            // 虚线段长度
  gapSize: 3              // 虚线间隔
};
```

### 分支样式

```javascript
const branchStyle = {
  branchColor: 0x6c5ce7,      // 分支颜色
  branchWidth: 1.5,           // 分支线宽
  branchOpacity: 0.6,         // 分支透明度
  branchAngle: Math.PI / 6,   // 分支角度 (30度)
  animationDuration: 300      // 动画持续时间
};
```

## 🔧 路径计算规则

### 他人消息连接
```
气泡左侧中心 → 水平左延5px → 圆角转折 → 垂直到头像高度 → 圆角转折 → 头像右侧中心
```

### 自己消息连接
```
气泡右侧中心 → 水平右延5px → 圆角转折 → 垂直到头像高度 → 圆角转折 → 头像左侧中心
```

## ⚡ 性能优化特性

### 渲染优化
- **批量渲染**：合并相同材质的连接线进行批量渲染
- **实例化渲染**：对大量相似连接线使用实例化渲染
- **视窗裁剪**：只渲染视窗内的连接线
- **LOD系统**：根据距离调整渲染质量

### 内存管理
- **对象池**：重用常用对象，减少垃圾回收
- **缓存系统**：缓存计算结果，避免重复计算
- **自动垃圾回收**：定期清理不再使用的资源

### 自适应质量
```javascript
// 系统会根据性能自动调整
// 低性能：减少线段数、降低精度
// 高性能：提升渲染质量、增加特效
```

## 🐛 调试工具

### 性能统计
```javascript
const stats = engine.getStats();
console.table({
  'Connections': stats.scene.activeConnections,
  'Visible': stats.scene.visibleConnections,
  'Frame Time': stats.engine.frameTime,
  'FPS': stats.performance.fps,
  'Memory (MB)': stats.performance.memoryUsage / (1024*1024)
});
```

### 调试信息
```javascript
// 启用调试模式
const engine = createConnectionRenderingEngine(canvas, { debug: true });

// 获取详细调试信息
const debugInfo = engine.getDebugInfo();
```

## 🎮 使用示例

查看 `examples/BasicUsageExample.js` 获取完整的使用示例，包括：
- 拖拽交互
- 动态添加/删除连接线
- 分支连接演示
- 性能监控
- 滚动同步

## 🔧 系统要求

- **WebGL支持**：需要浏览器支持WebGL 1.0+
- **Three.js**：需要Three.js库
- **现代浏览器**：Chrome 60+, Firefox 55+, Safari 12+

## 🚧 注意事项

1. **初始化顺序**：确保在DOM加载完成后初始化引擎
2. **内存管理**：及时调用`dispose()`清理资源
3. **性能监控**：定期检查性能统计，调整配置参数
4. **错误处理**：监听引擎事件，处理可能的错误情况

## 🔮 未来计划

- [ ] WebGL 2.0支持
- [ ] 更多连接线样式（箭头、流动效果）
- [ ] 3D连接线渲染
- [ ] 更高级的动画效果
- [ ] React/Vue组件封装

---

## 📄 License

MIT License - 详见LICENSE文件