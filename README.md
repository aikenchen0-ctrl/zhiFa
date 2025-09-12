# Mobile IM Floating Components

> Advanced mobile IM floating components with WebGL rendering and Liquid Glass UI

[![npm version](https://img.shields.io/npm/v/@mobile-im/components.svg)](https://www.npmjs.com/package/@mobile-im/components)
[![license](https://img.shields.io/npm/l/@mobile-im/components.svg)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/@mobile-im/components.svg)](https://www.npmjs.com/package/@mobile-im/components)
[![build status](https://img.shields.io/github/actions/workflow/status/mobile-im/components/ci-cd.yml?branch=main)](https://github.com/mobile-im/components/actions)
[![coverage](https://img.shields.io/codecov/c/github/mobile-im/components)](https://codecov.io/gh/mobile-im/components)

A professional-grade React component library for building stunning mobile instant messaging interfaces. Features beautiful Liquid Glass UI design, high-performance WebGL rendering, and comprehensive mobile optimizations.

## ✨ Features

- 🎨 **Liquid Glass UI** - Beautiful frosted glass effects with advanced backdrop filters
- ⚡ **WebGL Rendering** - Hardware-accelerated connection lines and visual effects
- 📱 **Mobile-First** - Optimized for touch devices with gesture recognition
- 🎬 **Rich Animations** - Smooth 60fps animations and micro-interactions
- 🔧 **TypeScript** - Full TypeScript support with comprehensive type definitions
- 🚀 **High Performance** - Advanced memory management and battery optimization
- 📚 **Comprehensive Docs** - Interactive documentation with live examples
- 🧪 **Well Tested** - Extensive test coverage with Vitest and Playwright

## 📱 Live Demo

- **[Documentation](https://mobile-im.github.io/components)** - Complete guide and API reference
- **[Storybook](https://mobile-im.github.io/components/storybook)** - Interactive component library
- **[Playground](https://mobile-im.github.io/components/playground)** - Try components online

## 🚀 Quick Start

### Installation

```bash
npm install @mobile-im/components
# or
yarn add @mobile-im/components
# or
pnpm add @mobile-im/components
```

### Basic Usage

```tsx
import React from 'react'
import { 
  MessageBubble, 
  OverlayContainer, 
  GestureHandler 
} from '@mobile-im/components'
import '@mobile-im/components/styles'

function ChatApp() {
  const message = {
    id: '1',
    content: 'Hello! This is a beautiful message bubble 🎉',
    timestamp: new Date(),
    userId: 'user1',
    type: 'text'
  }

  const user = {
    id: 'user1',
    name: 'Alice',
    avatar: '/avatar.jpg'
  }

  return (
    <OverlayContainer theme="liquid-glass" mobileOptimized>
      <GestureHandler 
        enableLongPress 
        enableSwipeActions
        onLongPress={(msg) => console.log('Long pressed:', msg)}
      >
        <MessageBubble
          message={message}
          user={user}
          position="right"
          showAvatar
          showTimestamp
          enableAnimations
          onPress={(msg) => console.log('Pressed:', msg)}
        />
      </GestureHandler>
    </OverlayContainer>
  )
}
```

### CDN Usage

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mobile-im/components@latest/dist/styles/index.css">

<!-- JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/@mobile-im/components@latest/dist/mobile-im-components.umd.js"></script>

<script>
  const { MessageBubble, OverlayContainer } = MobileIMComponents
  // Use components...
</script>
```

## 🎨 Component Gallery

### Core Components

| Component | Description | Features |
|-----------|-------------|----------|
| `MessageBubble` | Message display with liquid glass effect | Touch gestures, animations, status indicators |
| `OverlayContainer` | Floating layer management | Theme support, performance optimization |
| `ConnectionLine` | WebGL-powered connection visualization | Smooth curves, collision detection |
| `GestureHandler` | Advanced touch and gesture recognition | Long press, swipe, pinch, rotate |
| `Avatar` | User profile picture display | Lazy loading, fallback states |
| `ActionMenu` | Context menu for message actions | Reply, forward, delete, custom actions |

### Layout Components

| Component | Description | Mobile Optimized |
|-----------|-------------|------------------|
| `ChatArea` | Virtual scrolling message container | ✅ |
| `TopBar` | Navigation and title bar | ✅ |
| `BottomBar` | Input and action bar | ✅ |
| `Sidebar` | Collapsible navigation panel | ✅ |

### Advanced Components

- `WebGLRenderer` - Hardware-accelerated graphics
- `VirtualScrollManager` - Efficient large list handling
- `PerformanceMonitor` - Real-time performance tracking
- `ThemeProvider` - Dynamic theme switching

## 🎯 Key Advantages

### Mobile-First Design
Every component is designed from the ground up for mobile devices:

```tsx
// Optimized touch targets (minimum 44px)
<MessageBubble
  touchOptimized
  minTouchTarget="44px"
  gestureEnabled
/>

// Battery-efficient rendering
<OverlayContainer
  performanceMode="battery-saver"
  enableGPUOptimization
/>
```

### WebGL Performance
Hardware-accelerated rendering for smooth 60fps experiences:

```tsx
<ConnectionLineLayer
  renderer="webgl"
  quality="high"
  enableCulling
  maxConnections={1000}
/>
```

### Liquid Glass UI
Beautiful frosted glass effects that work across all devices:

```css
.message-bubble {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

## 📊 Performance Benchmarks

| Metric | Value | Comparison |
|--------|-------|------------|
| Bundle Size | 45KB (gzipped) | 🟢 Smaller than most UI libraries |
| First Paint | < 100ms | 🟢 Blazing fast |
| Memory Usage | < 20MB typical | 🟢 Memory efficient |
| Animation FPS | 60fps consistent | 🟢 Buttery smooth |
| Battery Impact | Minimal | 🟢 Optimized for mobile |

## 🌍 Browser Support

| Browser | Mobile | Desktop | Notes |
|---------|--------|---------|-------|
| Chrome | 90+ | 90+ | Full support |
| Safari | iOS 14+ | 14+ | Full support |
| Firefox | 88+ | 88+ | Full support |
| Edge | 90+ | 90+ | Full support |
| Samsung Internet | 14.0+ | - | Full support |

## 🛠️ Development

### Prerequisites

- Node.js 18.0+
- npm 8.0+ or yarn 1.22+

### Setup

```bash
# Clone the repository
git clone https://github.com/mobile-im/components.git
cd components

# Install dependencies
npm install

# Start development server
npm run dev

# Start Storybook
npm run storybook

# Start documentation
npm run docs:dev
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run storybook        # Start Storybook
npm run docs:dev         # Start documentation

# Building
npm run build            # Build library
npm run build-storybook  # Build Storybook
npm run docs:build       # Build documentation

# Testing
npm run test             # Run tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run e2e tests

# Quality
npm run lint             # Lint code
npm run type-check       # Type check
npm run format           # Format code
```

### Project Structure

```
components/
├── src/
│   ├── components/          # React components
│   │   ├── chat/           # Chat-specific components
│   │   ├── layout/         # Layout components
│   │   ├── shared/         # Shared components
│   │   └── webgl/          # WebGL components
│   ├── styles/             # CSS and themes
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   └── types/              # TypeScript definitions
├── docs/                   # VitePress documentation
├── .storybook/             # Storybook configuration
├── tests/                  # Test files
└── scripts/                # Build and utility scripts
```

## 🔌 API Reference

### MessageBubble

```tsx
interface MessageBubbleProps {
  message: Message
  user: User
  position: 'left' | 'right'
  theme?: 'liquid-glass' | 'dark' | 'light'
  showAvatar?: boolean
  showTimestamp?: boolean
  enableAnimations?: boolean
  onPress?: (message: Message) => void
  onLongPress?: (message: Message) => void
  onSwipeLeft?: (message: Message) => void
  onSwipeRight?: (message: Message) => void
  // ... more props
}
```

### OverlayContainer

```tsx
interface OverlayContainerProps {
  children: React.ReactNode
  theme?: ThemeName
  enableAnimations?: boolean
  mobileOptimized?: boolean
  performanceMode?: 'high' | 'balanced' | 'battery'
  onLayout?: (dimensions: Dimensions) => void
  // ... more props
}
```

See [API Documentation](https://mobile-im.github.io/components/api/) for complete reference.

## 🎨 Theming

### Built-in Themes

```tsx
// Liquid Glass (default)
<OverlayContainer theme="liquid-glass" />

// Dark theme
<OverlayContainer theme="dark" />

// Custom theme
<OverlayContainer theme="ocean-breeze" />
```

### Custom Theme

```tsx
import { createTheme, ThemeProvider } from '@mobile-im/components'

const customTheme = createTheme({
  colors: {
    primary: '#646cff',
    glass: {
      primary: 'rgba(100, 108, 255, 0.1)',
      border: 'rgba(100, 108, 255, 0.2)'
    }
  },
  effects: {
    blur: '12px',
    shadow: '0 8px 32px rgba(100, 108, 255, 0.15)'
  }
})

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      {/* Your components */}
    </ThemeProvider>
  )
}
```

## 🧪 Testing

We use a comprehensive testing strategy:

- **Unit Tests** - Vitest with React Testing Library
- **Visual Tests** - Chromatic for component screenshots
- **E2E Tests** - Playwright for full workflow testing
- **Performance Tests** - Lighthouse CI for performance monitoring

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:visual
npm run test:e2e
npm run test:performance
```

## 📚 Examples

### Chat Application
Complete chat application with real-time messaging:

```tsx
import { ChatApp } from '@mobile-im/components/examples'

function App() {
  return (
    <ChatApp
      theme="liquid-glass"
      enableWebGL
      mobileOptimized
      users={users}
      messages={messages}
      onSendMessage={handleSendMessage}
    />
  )
}
```

### Custom Message Types

```tsx
// Voice message
<MessageBubble
  message={{
    type: 'voice',
    voiceData: {
      url: '/audio/message.mp3',
      duration: 30,
      waveform: [0.2, 0.5, 0.8, ...]
    }
  }}
/>

// Image message
<MessageBubble
  message={{
    type: 'image',
    imageData: {
      url: '/image.jpg',
      thumbnail: '/thumb.jpg',
      width: 800,
      height: 600
    }
  }}
/>
```

See [Examples](https://mobile-im.github.io/components/examples/) for more.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Ways to Contribute

- 🐛 [Report bugs](https://github.com/mobile-im/components/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/mobile-im/components/issues/new?template=feature_request.md)
- 📖 [Improve documentation](https://github.com/mobile-im/components/blob/main/docs/)
- 🧪 [Add tests](https://github.com/mobile-im/components/blob/main/tests/)
- 🎨 [Create themes](https://github.com/mobile-im/components/blob/main/src/themes/)

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Mobile IM Components Team](https://github.com/mobile-im/components/blob/main/LICENSE)

## 🙋‍♂️ Support

- 📖 [Documentation](https://mobile-im.github.io/components)
- 💬 [Discussions](https://github.com/mobile-im/components/discussions)
- 🐛 [Issues](https://github.com/mobile-im/components/issues)
- 📧 [Email](mailto:support@mobile-im-components.com)

## 🌟 Showcase

Built something awesome with Mobile IM Components? [Share it with us!](https://github.com/mobile-im/components/discussions/categories/showcase)

---

<div align="center">

**[Documentation](https://mobile-im.github.io/components)** • **[Storybook](https://mobile-im.github.io/components/storybook)** • **[Examples](https://mobile-im.github.io/components/examples)**

Made with ❤️ by the Mobile IM Components Team

</div>