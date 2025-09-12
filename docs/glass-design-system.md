# Liquid Glass UI Design System

一个现代化的半透明玻璃材质UI设计系统，提供Vision UI和Glassmorphism风格的组件库。

## 🎨 设计理念

### 核心特点
- **玻璃材质效果**: 半透明白色玻璃和全透明玻璃质感
- **圆角气泡样式**: 详细气泡和简单气泡两种变体
- **层次化架构**: 悬浮蒙层 > 区域容器 > 功能组件
- **移动端优化**: 触控友好的交互体验
- **可访问性**: 支持高对比度和减少动画模式

### 视觉层次
```
Layer 4: 悬浮蒙层 (z-index: 1000+)
  ├── 模态框、弹出层
  └── 工具提示、下拉菜单

Layer 3: 区域容器 (z-index: 100+)  
  ├── 卡片、面板
  └── 导航、侧边栏

Layer 2: 功能组件 (z-index: 10+)
  ├── 按钮、输入框
  └── 标签、徽章

Layer 1: 背景基础 (z-index: 0)
  └── 页面背景、装饰元素
```

## 📁 目录结构

```
src/styles/design-system/
├── main.css                 # 主入口文件
├── tokens/                  # 设计tokens
│   ├── colors.css          # 颜色系统
│   ├── spacing.css         # 间距系统  
│   └── typography.css      # 字体系统
├── effects/                # 玻璃效果
│   ├── glass.css           # 玻璃材质效果
│   └── interactions.css    # 交互状态
├── themes/                 # 主题系统
│   └── glass-theme.css     # 玻璃主题
├── components/             # 组件规范
│   └── component-hierarchy.css # 组件层次
└── utils/                  # 工具类
    └── utilities.css       # 通用工具类
```

## 🎭 玻璃材质效果

### 基础玻璃类

#### `.glass` - 标准玻璃效果
- 背景: 20% 白色透明度
- 模糊: 8px backdrop-filter
- 边框: 淡白色边框
- 阴影: 中等深度阴影

```css
.glass {
  background: rgba(255, 255, 255, 0.20);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.10);
}
```

#### `.glass-transparent` - 全透明玻璃
- 背景: 完全透明
- 模糊: 12px backdrop-filter
- 适用于悬浮元素

#### `.glass-light/.glass-medium/.glass-heavy` - 透明度变体
- Light: 10% 透明度 + 4px模糊
- Medium: 30% 透明度 + 8px模糊  
- Heavy: 50% 透明度 + 12px模糊

### 气泡样式

#### `.glass-bubble` - 标准气泡
```css
.glass-bubble {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  /* 顶部高光效果 */
}
```

#### `.glass-bubble-simple` - 简单气泡
- 更小的圆角 (16px)
- 较轻的玻璃效果
- 适用于小型组件

#### `.glass-bubble-detailed` - 详细气泡
- 大圆角 (32px)
- 径向渐变背景
- 内部高光和阴影
- 适用于重要卡片

### 有色玻璃

#### `.glass-blue/.glass-purple/.glass-pink` - 有色玻璃变体
```css
.glass-blue {
  background: rgba(59, 130, 246, 0.20);
  border-color: rgba(59, 130, 246, 0.30);
}
```

## 🎨 颜色系统

### 玻璃材质颜色
```css
/* 白色玻璃 - 10个透明度等级 */
--glass-white-10: rgba(255, 255, 255, 0.10);
--glass-white-20: rgba(255, 255, 255, 0.20);
/* ... */
--glass-white-90: rgba(255, 255, 255, 0.90);

/* 有色玻璃 */
--glass-blue-20: rgba(59, 130, 246, 0.20);
--glass-purple-20: rgba(147, 51, 234, 0.20);
--glass-pink-20: rgba(236, 72, 153, 0.20);

/* 深色玻璃 */
--glass-dark-20: rgba(0, 0, 0, 0.20);
```

### 边框和文字颜色
```css
/* 边框颜色 */
--glass-border-light: rgba(255, 255, 255, 0.18);
--glass-border-medium: rgba(255, 255, 255, 0.25);
--glass-border-strong: rgba(255, 255, 255, 0.35);

/* 文字颜色 */
--glass-text-primary: rgba(255, 255, 255, 0.95);
--glass-text-secondary: rgba(255, 255, 255, 0.75);
--glass-text-tertiary: rgba(255, 255, 255, 0.55);
```

## 📏 间距系统

基于8pt网格系统：

```css
--space-1: 4px;    /* 0.25rem */
--space-2: 8px;    /* 0.5rem */
--space-3: 12px;   /* 0.75rem */
--space-4: 16px;   /* 1rem */
--space-6: 24px;   /* 1.5rem */
--space-8: 32px;   /* 2rem */
```

### 圆角系统
```css
/* 标准圆角 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;

/* 气泡专用圆角 */
--glass-radius-bubble-sm: 16px;
--glass-radius-bubble-md: 24px;
--glass-radius-bubble-lg: 32px;
```

## 🔤 字体系统

### 字体家族
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
```

### 字体大小
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
```

### 玻璃文字效果
```css
.text-glass {
  color: var(--glass-text-primary);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.text-frosted {
  backdrop-filter: blur(1px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.text-glow {
  text-shadow: 
    0 0 10px rgba(255, 255, 255, 0.3),
    0 0 20px rgba(255, 255, 255, 0.2);
}
```

## 🖱️ 交互状态

### 基础交互
所有交互元素添加 `.glass-interactive` 类：

```css
.glass-interactive {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  user-select: none;
}
```

### 状态变化
- **Hover**: 提升透明度、增加阴影、轻微上移
- **Active**: 降低透明度、减少阴影、轻微缩放  
- **Focus**: 蓝色焦点环
- **Disabled**: 降低透明度、禁用交互

### 特殊效果
- **涟漪效果**: `.glass-ripple` - 点击时的水波纹动画
- **脉冲效果**: `.glass-pulse` - 呼吸式动画
- **发光效果**: `.glass-glow` - 悬停时的外发光

## 🏗️ 组件层次

### Z-Index系统
```css
--z-base: 0;                    /* 基础层 */
--z-component: 10;              /* 组件层 */
--z-component-elevated: 20;     /* 提升组件 */
--z-container: 100;             /* 容器层 */
--z-container-elevated: 200;    /* 提升容器 */
--z-overlay: 1000;              /* 覆盖层 */
--z-modal: 2000;                /* 模态框 */
--z-toast: 3000;                /* 通知 */
--z-tooltip: 4000;              /* 工具提示 */
```

### 组件类型

#### 按钮
```css
.glass-button {
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  font-weight: 500;
  min-width: 44px; /* 触控友好 */
}
```

#### 输入框
```css
.glass-input {
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.10);
}

.glass-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
```

#### 卡片
```css
.glass-card {
  padding: 24px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

#### 模态框
```css
.glass-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 90vw;
  max-height: 90vh;
  z-index: 2000;
}

.glass-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.30);
  backdrop-filter: blur(8px);
}
```

## 🎭 主题系统

### 内置主题
1. **Light** (默认) - 明亮渐变背景
2. **Dark** - 深色渐变背景
3. **Aurora** - 极光多彩渐变
4. **Ocean** - 海洋蓝色主题
5. **Sunset** - 日落粉色主题
6. **Forest** - 森林绿色主题
7. **High Contrast** - 高对比度无障碍主题

### 使用方式
```html
<body data-theme="dark">
  <!-- 内容 -->
</body>
```

### 主题变量
```css
:root {
  --theme-bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --theme-glass-primary: var(--glass-white-25);
  --theme-text-primary: var(--glass-text-primary);
}
```

## 🛠️ 工具类

### 间距工具类
```css
.p-4 { padding: 16px; }
.px-6 { padding-left: 24px; padding-right: 24px; }
.m-auto { margin: auto; }
.gap-4 { gap: 16px; }
```

### 布局工具类
```css
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
```

### 玻璃特定工具类
```css
.glass-blur-md { backdrop-filter: blur(8px); }
.glass-shadow-lg { box-shadow: var(--glass-shadow-lg); }
.rounded-bubble-md { border-radius: 24px; }
```

## 📱 响应式设计

### 断点系统
- **sm**: 640px+
- **md**: 768px+  
- **lg**: 1024px+
- **xl**: 1280px+

### 移动端优化
- 触控目标最小44px
- 简化玻璃效果以提升性能
- 自适应间距和字体大小

```css
@media (max-width: 768px) {
  .glass-bubble {
    backdrop-filter: blur(4px); /* 减少模糊 */
  }
}
```

## ♿ 可访问性支持

### 减少动画
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 高对比度模式
```css
@media (prefers-contrast: high) {
  .glass-component {
    border-width: 2px;
    background: rgba(255, 255, 255, 0.95) !important;
  }
}
```

### 透明度偏好
```css
@media (prefers-reduced-transparency: reduce) {
  .glass-component {
    backdrop-filter: none;
    background: rgba(255, 255, 255, 0.95);
  }
}
```

## 🚀 使用指南

### 1. 引入设计系统
```css
@import './src/styles/design-system/main.css';
```

### 2. 基础HTML结构
```html
<div class="glass-app">
  <main class="glass-main">
    <div class="glass-page">
      <!-- 页面内容 -->
    </div>
  </main>
</div>
```

### 3. 创建玻璃组件
```html
<!-- 基础按钮 -->
<button class="glass-button glass-interactive">
  点击我
</button>

<!-- 气泡卡片 -->
<div class="glass-bubble-detailed p-6">
  <h2 class="text-xl font-semibold mb-4">卡片标题</h2>
  <p class="text-glass-secondary">卡片内容</p>
</div>

<!-- 输入框 -->
<input 
  type="text" 
  class="glass-input w-full" 
  placeholder="请输入内容"
>
```

### 4. 主题切换
```javascript
// 切换到暗色主题
document.documentElement.setAttribute('data-theme', 'dark');

// 切换到极光主题
document.documentElement.setAttribute('data-theme', 'aurora');
```

### 5. 自定义组件
```css
.my-custom-glass {
  @extend .glass-bubble;
  /* 自定义样式 */
  background: var(--glass-purple-30);
  border-color: var(--accent-secondary);
}
```

## 🎯 最佳实践

### 性能优化
1. 在低性能设备上禁用backdrop-filter
2. 使用will-change优化动画性能
3. 避免过深的玻璃层叠

### 设计原则  
1. 保持一致的层次感
2. 合理使用透明度避免文字难以阅读
3. 确保足够的触控目标大小
4. 考虑不同主题下的对比度

### 组件组合
1. 从基础玻璃类开始
2. 添加交互状态
3. 应用主题变量
4. 使用工具类微调

## 📈 性能考虑

### 硬件加速
```css
.glass-component {
  transform: translateZ(0); /* 启用硬件加速 */
  will-change: auto; /* 避免不必要的重绘 */
}
```

### 优雅降级
```css
@supports not (backdrop-filter: blur(8px)) {
  .glass {
    background: rgba(255, 255, 255, 0.9); /* 回退方案 */
  }
}
```

这个设计系统提供了完整的玻璃材质UI解决方案，支持现代浏览器的backdrop-filter效果，同时确保在不支持的环境中优雅降级。通过模块化的架构和丰富的工具类，可以快速构建美观且一致的玻璃质感界面。