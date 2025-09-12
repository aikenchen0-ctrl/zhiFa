# Quick Start

本指南将帮助你在5分钟内创建第一个使用Mobile IM Floating Components的应用。

## 1. 环境要求

确保你的开发环境满足以下要求：

```bash
node >= 16.0.0
npm >= 8.0.0
# 或
yarn >= 1.22.0
```

## 2. 创建新项目

### 使用Vite创建React项目

```bash
# 使用npm
npm create vite@latest my-im-app -- --template react-ts

# 使用yarn  
yarn create vite my-im-app --template react-ts

# 使用pnpm
pnpm create vite my-im-app --template react-ts
```

### 进入项目目录

```bash
cd my-im-app
npm install
```

## 3. 安装组件库

```bash
# 安装核心组件库
npm install @mobile-im/components

# 安装同级依赖
npm install react@^18.0.0 react-dom@^18.0.0 zustand@^4.4.0
```

## 4. 基础配置

### 配置Vite (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@mobile-im/components']
  },
  server: {
    host: '0.0.0.0', // 允许移动端访问
    port: 3000
  }
})
```

### 配置TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 5. 创建第一个组件

### 替换 src/App.tsx

```tsx
import { useState } from 'react'
import { 
  OverlayContainer,
  MessageBubble,
  ChatArea,
  GestureHandler
} from '@mobile-im/components'
import '@mobile-im/components/styles'
import './App.css'

interface Message {
  id: string
  content: string
  timestamp: Date
  userId: string
  type: 'text' | 'image' | 'voice'
}

interface User {
  id: string
  name: string
  avatar: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '你好！欢迎使用Mobile IM Components 🎉',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      userId: 'alice',
      type: 'text'
    },
    {
      id: '2', 
      content: '这是一个支持WebGL渲染的高性能IM组件库',
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      userId: 'bob',
      type: 'text'
    },
    {
      id: '3',
      content: '你可以尝试长按消息、滑动手势等交互操作',
      timestamp: new Date(),
      userId: 'alice', 
      type: 'text'
    }
  ])

  const users: Record<string, User> = {
    alice: {
      id: 'alice',
      name: 'Alice',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b772e234?w=100&h=100&fit=crop&crop=face'
    },
    bob: {
      id: 'bob', 
      name: 'Bob',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face'
    }
  }

  const currentUserId = 'current-user'

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      userId: currentUserId,
      type: 'text'
    }
    setMessages(prev => [...prev, newMessage])
  }

  return (
    <div className="app">
      <OverlayContainer
        theme="liquid-glass"
        enableAnimations={true}
        mobileOptimized={true}
      >
        <GestureHandler
          enableLongPress={true}
          enableSwipeActions={true}
          onLongPress={(messageId) => console.log('Long press:', messageId)}
          onSwipeLeft={(messageId) => console.log('Swipe left:', messageId)}
          onSwipeRight={(messageId) => console.log('Swipe right:', messageId)}
        >
          <ChatArea
            messages={messages}
            users={users}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
            renderMessage={(message, user, position) => (
              <MessageBubble
                key={message.id}
                message={message}
                user={user}
                position={position}
                theme="liquid-glass"
                showAvatar={true}
                showTimestamp={true}
                enableAnimations={true}
              />
            )}
          />
        </GestureHandler>
      </OverlayContainer>
    </div>
  )
}

export default App
```

### 添加样式 src/App.css

```css
.app {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .app {
    /* 防止iOS Safari地址栏影响高度 */
    height: 100dvh;
  }
}

/* Liquid Glass主题覆盖 */
:root {
  --glass-primary: rgba(255, 255, 255, 0.1);
  --glass-secondary: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: rgba(0, 0, 0, 0.1);
  
  /* 自定义颜色 */
  --primary-color: #646cff;
  --secondary-color: #747bff;
  --accent-color: #f97316;
  
  /* 动画时间 */
  --animation-fast: 0.15s;
  --animation-medium: 0.3s;
  --animation-slow: 0.5s;
}
```

### 更新 src/index.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

/* 移动端优化 */
body {
  /* 防止双击缩放 */
  touch-action: pan-x pan-y;
  /* 防止选中文本 */
  -webkit-user-select: none;
  user-select: none;
  /* 防止长按弹出菜单 */
  -webkit-touch-callout: none;
}

/* 允许消息内容选中 */
.message-content {
  -webkit-user-select: text;
  user-select: text;
}

/* 滚动条优化 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
```

## 6. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`，你应该能看到一个美丽的IM界面！

## 7. 移动端测试

### 在移动设备上预览

1. 确保手机和电脑在同一个网络
2. 找到你的电脑IP地址（如192.168.1.100）  
3. 在手机浏览器访问 `http://192.168.1.100:3000`

### 使用浏览器开发者工具

1. 打开Chrome开发者工具 (F12)
2. 点击设备切换按钮 (Ctrl+Shift+M)
3. 选择移动设备进行预览

## 8. 添加更多功能

### 语音消息支持

```tsx
import { VoiceMessageBubble } from '@mobile-im/components'

const voiceMessage = {
  id: '4',
  content: '', 
  timestamp: new Date(),
  userId: 'alice',
  type: 'voice' as const,
  voiceData: {
    url: '/audio/voice-message.mp3',
    duration: 15, // 秒
    waveform: [0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4] // 波形数据
  }
}

// 在渲染中使用
<VoiceMessageBubble
  message={voiceMessage}
  user={users.alice}
  onPlay={() => console.log('播放语音')}
  onPause={() => console.log('暂停语音')}
/>
```

### 图片消息支持

```tsx
import { ImageMessageBubble } from '@mobile-im/components'

const imageMessage = {
  id: '5',
  content: '',
  timestamp: new Date(), 
  userId: 'bob',
  type: 'image' as const,
  imageData: {
    url: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0',
    thumbnail: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=200&h=200',
    width: 800,
    height: 600
  }
}
```

### 连接线动画

```tsx
import { ConnectionLineLayer } from '@mobile-im/components'

<OverlayContainer>
  <ConnectionLineLayer
    connections={[
      {
        from: 'message-1',
        to: 'message-2', 
        type: 'reply',
        animated: true
      }
    ]}
    renderer="webgl" // 或 'canvas', 'svg'
    quality="high"
  />
  {/* 其他组件 */}
</OverlayContainer>
```

## 9. 下一步

恭喜！你已经成功创建了第一个Mobile IM应用。现在你可以：

### 深入学习
- **[基础用法](./basic-usage)** - 学习更多组件用法
- **[开发设置](./dev-setup)** - 配置完整的开发环境
- **[最佳实践](./best-practices)** - 掌握开发技巧

### 探索组件
- **[MessageBubble](../components/message-bubble)** - 消息气泡组件
- **[OverlayContainer](../components/overlay-container)** - 容器组件  
- **[GestureHandler](../components/gesture-handler)** - 手势处理组件

### 高级功能
- **[WebGL渲染](../webgl/)** - 高性能连接线系统
- **[移动端优化](../mobile/)** - 移动端性能调优
- **[主题定制](../themes/)** - 自定义Liquid Glass主题

### 获取帮助
- **[API文档](../api/)** - 完整的API参考
- **[常见问题](./faq)** - 解决常见问题  
- **[GitHub Issues](https://github.com/your-org/mobile-im-components/issues)** - 报告问题

## 示例代码仓库

完整的示例代码可以在以下仓库找到：

- **[基础示例](https://github.com/mobile-im/examples/tree/main/basic)**
- **[高级示例](https://github.com/mobile-im/examples/tree/main/advanced)**
- **[企业级示例](https://github.com/mobile-im/examples/tree/main/enterprise)**