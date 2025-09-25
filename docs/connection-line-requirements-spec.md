# 聊天界面连接线系统 - 需求规范文档

## 1. 系统概述

聊天界面连接线系统是一个基于SVG的动态连接线绘制系统，用于连接消息气泡与对应的头像/工具，实现光线动画效果。

### 1.1 核心功能
- 动态计算消息气泡与目标元素的连接路径
- 生成L形带圆角的连接路径
- 支持三种连接类型：左侧会话、右侧账号、右侧工具
- 实现光线流动动画效果
- 提供调试点和实时位置更新

## 2. 连接类型与路径规范

### 2.1 三种连接类型

#### 2.1.1 左侧会话连接 (left-to-right)
- **起点**: 左侧消息气泡左边缘中点
- **终点**: 对应会话头像右边缘中点
- **中轴线偏移**: `centerOffset = -15px`
- **水平延伸**: 向左延伸 `extend = 10px`
- **动画**: 绿色光线 (#00ff88)

#### 2.1.2 右侧账号连接 (right-to-left)
- **起点**: 右侧消息气泡右边缘中点
- **终点**: 账号头像左边缘中点
- **中轴线偏移**: `centerOffset = 20px`
- **水平延伸**: 向右延伸 `extend = 15px`
- **动画**: 橙色光线 (#ff6b35)

#### 2.1.3 右侧工具连接 (right-to-right)
- **起点**: 右侧消息气泡右边缘中点
- **终点**: 工具图标左边缘中点
- **中轴线偏移**: `centerOffset = 15px`
- **水平延伸**: 向右延伸 `extend = 10px`
- **动画**: 紫色光线 (#9c27b0)

## 3. 几何计算公式

### 3.1 基础参数
```javascript
const radius = 5;                                    // 圆角半径 (固定值)
const extend = Math.abs(centerOffset) - radius;      // 水平延伸距离公式
const centerX = startX + centerOffset;               // 中轴线X坐标
const verticalDirection = endY > startY ? 1 : -1;    // 垂直方向判断
const horizontalDirection = endX > centerX ? 1 : -1; // 水平方向判断
```

### 3.2 六步路径计算公式

#### Step 1: 起点坐标
```javascript
step1X = startX
step1Y = startY
```

#### Step 2: 水平延伸点
```javascript
// left-to-right: 向左延伸
step2X = startX - extend  
step2Y = startY

// right-to-left/right-to-right: 向右延伸  
step2X = startX + extend
step2Y = startY
```

#### Step 3: 第一转折点
```javascript
// 控制点 (L型角点)
turn1CenterX = centerX
turn1CenterY = startY

// 转折后位置
step3X = centerX  
step3Y = startY + (verticalDirection * radius)
```

#### Step 4: 垂直延伸终点
```javascript
step4X = centerX
step4Y = endY + radius  // 统一使用 endY + radius 作为中轴线终点
```

#### Step 5: 第二转折点 (45度对称圆角)
```javascript
// L形角点控制点
turn2CenterX = centerX
turn2CenterY = endY

// 第二水平延伸起点 (对称修正)
step5X = centerX + (horizontalDirection * radius)  // 使用radius确保45度对称
step5Y = endY
```

#### Step 6: 最终终点
```javascript
step6X = endX
step6Y = endY
```

### 3.3 SVG路径生成公式
```javascript
path = `M ${step1X} ${step1Y}                          // 移动到起点
        L ${step2X} ${step2Y}                          // 水平延伸
        Q ${turn1CenterX} ${turn1CenterY} ${step3X} ${step3Y}  // 第一转折 (二次贝塞尔)
        L ${step4X} ${step4Y}                          // 垂直延伸  
        Q ${turn2CenterX} ${turn2CenterY} ${step5X} ${step5Y}  // 第二转折 (二次贝塞尔)
        L ${step6X} ${step6Y}`;                        // 终点延伸
```

## 4. 核心算法改进

### 4.1 45度对称圆角修正 (关键改进)
**问题**: 原始算法中第二转折点使用 `extend` 距离，导致不对称
```javascript
// ❌ 原错误实现
step5X = centerX + (horizontalDirection * extend)  // 产生 10:5 不对称比例
```

**解决**: 使用 `radius` 确保完美对称
```javascript
// ✅ 正确对称实现
step5X = centerX + (horizontalDirection * radius)  // 实现 5:5 = 1:1 对称比例
```

### 4.2 对称性验证公式
```javascript
垂直控制距离 = |step4Y - turn2CenterY| = |endY + radius - endY| = radius
水平控制距离 = |step5X - turn2CenterX| = |centerX + radius - centerX| = radius
对称比例 = 垂直控制距离 : 水平控制距离 = radius : radius = 1:1 ✅
```

## 5. 数值规范表

| 参数 | left-to-right | right-to-left | right-to-right | 单位 |
|------|---------------|---------------|----------------|------|
| radius | 5 | 5 | 5 | px |
| centerOffset | -15 | 20 | 15 | px |
| extend | 10 | 15 | 10 | px |
| 水平延伸方向 | -1 (左) | +1 (右) | +1 (右) | - |
| 动画颜色 | #00ff88 | #ff6b35 | #9c27b0 | hex |
| 动画时长 | 4s | 3.5s | 3s | s |
| stroke-dasharray | 60,300 | 50,280 | 40,250 | px |

## 6. 调试点系统

### 6.1 调试点定义
```javascript
debugPoints = {
    start: { x: startX, y: startY, label: '起点', color: '#ff0000' },
    extend: { x: step2X, y: step2Y, label: '水平延伸', color: '#ff6600' },
    turn1Control: { x: turn1CenterX, y: turn1CenterY, label: '转折1控制点', color: '#ffaa00' },
    turn1End: { x: step3X, y: step3Y, label: '转折1终点', color: '#00ff00' },
    verticalStart: { x: step3X, y: step3Y, label: '垂直段起点', color: '#00aa00' },
    centerAxis: { x: centerX, y: (startY + endY) / 2, label: '中轴线中心', color: '#0088ff' },
    verticalEnd: { x: step4X, y: step4Y, label: '垂直段终点', color: '#0066aa' },
    turn2Control: { x: turn2CenterX, y: turn2CenterY, label: 'L形角点控制点', color: '#8800ff' },
    turn2End: { x: step5X, y: step5Y, label: '第二水平延伸起点(对称)', color: '#aa00ff' },
    end: { x: endX, y: endY, label: '终点', color: '#ff00aa' }
}
```

## 7. 性能规范

### 7.1 实时更新机制
- **节流函数**: 16ms (约60FPS)
- **DOM元素缓存**: 避免重复查询
- **增量更新**: 仅更新位置变化的路径
- **批量操作**: 一次性更新所有SVG元素

### 7.2 动画性能
- **硬件加速**: 使用 `transform` 和 `opacity` 属性
- **GPU合成**: `will-change: transform` 声明
- **避免重绘**: 使用 `stroke-dashoffset` 而非重新计算路径

## 8. 扩展性设计

### 8.1 可配置参数
```javascript
const CONFIG = {
    radius: 5,
    centerOffsets: {
        'left-to-right': -15,
        'right-to-left': 20, 
        'right-to-right': 15
    },
    animations: {
        'left-to-right': { color: '#00ff88', duration: '4s', dashArray: '60,300' },
        'right-to-left': { color: '#ff6b35', duration: '3.5s', dashArray: '50,280' },
        'right-to-right': { color: '#9c27b0', duration: '3s', dashArray: '40,250' }
    }
}
```

### 8.2 插件化接口
```javascript
interface ConnectionPlugin {
    calculatePath(startX, startY, endX, endY, type): PathData;
    createAnimation(path, animationType): AnimationConfig;  
    updateRealtime(connections): void;
}
```

## 9. 质量保证

### 9.1 几何精度要求
- 坐标计算精度: ±0.1px
- 角度对称性: 完全对称 (1:1比例)
- 路径连续性: 所有节点连续，无断点

### 9.2 性能指标
- 初始化时间: < 100ms
- 实时更新: < 16ms (60FPS)
- 内存使用: < 10MB (50条连接线)

## 10. 技术依赖

### 10.1 核心技术
- **SVG 2.0**: 路径绘制和动画
- **CSS3**: 样式和硬件加速
- **JavaScript ES6+**: 动态计算和DOM操作
- **WebAPI**: getBoundingClientRect, ResizeObserver

### 10.2 兼容性要求
- Chrome 60+, Firefox 55+, Safari 10+
- 移动端: iOS Safari 10+, Android Chrome 60+