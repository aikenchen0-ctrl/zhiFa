---
layout: home
title: 移动端IM悬浮组件
titleTemplate: 高性能WebGL渲染的移动IM组件

hero:
  name: Mobile IM Components
  text: 高性能移动端IM悬浮组件
  tagline: 使用Liquid Glass UI和WebGL渲染技术，打造极致的移动端即时通讯界面体验
  image:
    src: /hero-image.svg
    alt: Mobile IM Components
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/
    - theme: alt
      text: 查看组件
      link: /zh/components/
    - theme: alt
      text: GitHub
      link: https://github.com/your-org/mobile-im-components

features:
  - icon: 📱
    title: 移动优先设计
    details: 专为移动设备优化，支持触控交互、手势识别和响应式设计
  - icon: 🎨
    title: Liquid Glass UI
    details: 美丽的毛玻璃效果，高级背景滤镜和平滑动画
  - icon: ⚡
    title: WebGL渲染
    details: 高性能连接线和视觉效果，由WebGL着色器驱动
  - icon: 🔄
    title: 实时更新
    details: 高效的实时消息更新，优化的虚拟滚动
  - icon: 🎯
    title: TypeScript支持
    details: 完整的TypeScript支持，全面的类型定义和智能提示
  - icon: 🚀
    title: 性能优化
    details: 先进的内存管理、懒加载和电池效率优化
---

## 快速开始

在几分钟内开始使用Mobile IM Floating Components：

```bash
npm install @mobile-im/components
```

```tsx
import { MessageBubble, OverlayContainer } from '@mobile-im/components'
import '@mobile-im/components/styles'

function App() {
  return (
    <OverlayContainer>
      <MessageBubble
        message="你好，世界！"
        user={{ id: '1', name: '小明', avatar: '/avatar.jpg' }}
        timestamp={new Date()}
      />
    </OverlayContainer>
  )
}
```

## 核心特性

### 🎨 Liquid Glass UI主题
体验毛玻璃效果的美妙，我们的高级Liquid Glass UI主题采用现代CSS特性，包括背景滤镜和高级模糊效果。

### 📱 移动端优化
每个组件都为移动设备精心设计和优化：
- 触摸友好的交互
- 手势识别系统
- 电池效率渲染
- 响应式设计模式

### ⚡ WebGL驱动渲染
先进的连接线系统由WebGL驱动：
- 平滑60fps动画
- 动态连接更新
- 碰撞检测
- 性能优化

### 🔧 开发者体验
使用现代开发实践构建：
- 完整的TypeScript支持
- 全面的文档
- 交互式演练场
- Storybook组件库

## 架构概览

Mobile IM Floating Components系统采用模块化架构构建：

```mermaid
graph TD
    A[OverlayContainer] --> B[MessageBubble]
    A --> C[ConnectionLine]
    A --> D[GestureHandler]
    
    B --> E[MessageContent]
    B --> F[Avatar]
    B --> G[ActionMenu]
    
    C --> H[WebGLRenderer]
    C --> I[PathCalculator]
    
    D --> J[TouchRecognition]
    D --> K[GestureRecognition]
    
    H --> L[Shaders]
    H --> M[BufferManager]
```

## 性能指标

我们的组件专为移动端性能优化：

| 指标 | 数值 |
|------|------|
| 包大小 | < 50KB (gzipped) |
| 内存使用 | < 20MB (典型) |
| 帧率 | 60fps (流畅动画) |
| 电池影响 | 最小 (优化渲染) |
| 加载时间 | < 1s (首次渲染) |

## 浏览器支持

- **iOS Safari**: 14.0+
- **Chrome Mobile**: 90+
- **Firefox Mobile**: 88+
- **Samsung Internet**: 14.0+
- **UC Browser**: 最新版

## 获取帮助

- 📖 [文档](/zh/guide/)
- 🔧 [API参考](/zh/api/)
- 🎯 [组件库](/zh/components/)
- 🚀 [GitHub Issues](https://github.com/your-org/mobile-im-components/issues)

## 贡献

我们欢迎贡献！请查看我们的[贡献指南](https://github.com/your-org/mobile-im-components/blob/main/CONTRIBUTING.md)了解详情。

## 许可证

MIT © Mobile IM Components Team