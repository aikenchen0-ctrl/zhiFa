# 微前端架构设计

## 架构概述
采用Module Federation实现微前端架构，支持独立开发、部署和运行时组合，确保团队协作效率和系统可维护性。

## 微前端拆分策略

### 1. 应用边界划分
```
┌─────────────────────────────────────────┐
│              Shell App                  │
│            (容器应用)                    │
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │   IM    │ │ Account │ │ Visual  │   │
│  │ Module  │ │ Module  │ │ Module  │   │
│  │         │ │         │ │         │   │
│  │(消息聚合)│ │(账号管理)│ │(连接线)  │   │
│  └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────┤
│            Shared Libraries             │
│      (共享库: utils, components)        │
└─────────────────────────────────────────┘
```

### 2. 模块职责矩阵

| 模块 | 主要职责 | 技术栈 | 独立性 | 团队 |
|------|----------|--------|--------|------|
| **Shell** | 路由、认证、全局状态 | React + TypeScript | 核心框架 | 架构团队 |
| **IM Module** | 消息聚合、协议适配 | React + Socket.io | 高度独立 | IM团队 |
| **Account Module** | 账号伪装、权限管理 | React + Auth | 中度独立 | 安全团队 |
| **Visual Module** | 实时连接线渲染 | React + Canvas/WebGL | 高度独立 | 前端团队 |
| **Shared Libs** | 公共组件、工具函数 | TypeScript | 共享依赖 | 基础团队 |

## Module Federation 配置

### Shell App Configuration
```javascript
// shell/webpack.config.js
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  mode: "development",
  devServer: {
    port: 3000,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        imModule: "imModule@http://localhost:3001/remoteEntry.js",
        accountModule: "accountModule@http://localhost:3002/remoteEntry.js", 
        visualModule: "visualModule@http://localhost:3003/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, eager: true },
        "react-dom": { singleton: true, eager: true },
        "@overlay/shared": { singleton: true, eager: true },
      },
    }),
  ],
};
```

### IM Module Configuration  
```javascript
// im-module/webpack.config.js
new ModuleFederationPlugin({
  name: "imModule",
  filename: "remoteEntry.js",
  exposes: {
    "./IMContainer": "./src/IMContainer",
    "./IMProtocolAdapter": "./src/adapters/ProtocolAdapter",
    "./IMMessageBus": "./src/bus/MessageBus",
  },
  shared: {
    react: { singleton: true },
    "react-dom": { singleton: true },
    "@overlay/shared": { singleton: true },
    "socket.io-client": { singleton: true },
  },
}),
```

## 运行时组合策略

### 1. 动态导入和懒加载
```typescript
// shell/src/App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const IMModule = React.lazy(() => import('imModule/IMContainer'));
const AccountModule = React.lazy(() => import('accountModule/AccountContainer'));
const VisualModule = React.lazy(() => import('visualModule/VisualContainer'));

export default function App() {
  return (
    <BrowserRouter>
      <div className="overlay-shell">
        <Suspense fallback={<div>Loading IM Module...</div>}>
          <Routes>
            <Route path="/im/*" element={<IMModule />} />
            <Route path="/account/*" element={<AccountModule />} />
            <Route path="/visual/*" element={<VisualModule />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
```

### 2. 模块间通信协议
```typescript
// shared/src/types/communication.ts
export interface ModuleCommunicationProtocol {
  // 事件总线接口
  eventBus: {
    emit<T>(event: string, data: T): void;
    on<T>(event: string, handler: (data: T) => void): void;
    off(event: string, handler: Function): void;
  };
  
  // 共享状态接口
  sharedState: {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    subscribe<T>(key: string, callback: (value: T) => void): void;
  };
  
  // 服务注册接口
  serviceRegistry: {
    register(name: string, service: any): void;
    get<T>(name: string): T | undefined;
    unregister(name: string): void;
  };
}
```

## 开发工作流

### 1. 本地开发环境
```bash
# 启动所有微前端模块
npm run dev:shell     # Port 3000 - 容器应用
npm run dev:im        # Port 3001 - IM模块  
npm run dev:account   # Port 3002 - 账号模块
npm run dev:visual    # Port 3003 - 可视化模块
```

### 2. 独立开发模式
```typescript
// im-module/src/standalone.tsx
// 支持模块独立运行用于开发测试
import React from 'react';
import ReactDOM from 'react-dom/client';
import IMContainer from './IMContainer';

// 独立开发时的 Mock 环境
const mockCommunication = {
  eventBus: { emit: console.log, on: () => {}, off: () => {} },
  sharedState: { get: () => undefined, set: () => {}, subscribe: () => {} },
  serviceRegistry: { register: () => {}, get: () => undefined, unregister: () => {} }
};

if (process.env.NODE_ENV === 'development' && window.location.port === '3001') {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(<IMContainer communication={mockCommunication} />);
}
```

## 部署策略

### 1. 独立部署管道
```yaml
# .github/workflows/deploy-im-module.yml
name: Deploy IM Module
on:
  push:
    paths: ['im-module/**']
    
jobs:
  deploy-im-module:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build IM Module
        run: |
          cd im-module
          npm ci
          npm run build
          npm run deploy:cdn
```

### 2. 版本管理策略
```json
{
  "name": "@overlay/im-module",
  "version": "1.2.3",
  "federatedModule": {
    "name": "imModule",
    "version": "1.2.3",
    "remoteEntry": "https://cdn.overlay.com/im-module/1.2.3/remoteEntry.js"
  }
}
```

### 3. 渐进式发布
```typescript
// shell/src/config/federation.ts
export const federationConfig = {
  modules: {
    imModule: {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://cdn.overlay.com/im-module/1.2.3/remoteEntry.js'
        : 'http://localhost:3001/remoteEntry.js',
      fallback: 'https://cdn.overlay.com/im-module/1.1.0/remoteEntry.js' // 回退版本
    }
  }
};
```

## 性能优化

### 1. 代码分割和懒加载
- 路由级别的代码分割
- 组件级别的动态导入  
- 共享依赖去重优化

### 2. 缓存策略
- Module Federation 缓存
- CDN 静态资源缓存
- 浏览器持久化缓存

### 3. 预加载策略
```typescript
// shell/src/utils/preloader.ts
export class MicrofrontendPreloader {
  async preloadCriticalModules() {
    // 预加载关键模块
    const criticalModules = ['imModule'];
    await Promise.all(
      criticalModules.map(module => import(/* webpackPreload: true */ module))
    );
  }
}
```

## 错误处理和监控

### 1. 模块错误边界
```typescript
// shell/src/components/ModuleErrorBoundary.tsx
export class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, moduleName: props.moduleName };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 发送错误到监控系统
    window.analytics?.track('microfrontend_error', {
      moduleName: this.state.moduleName,
      error: error.message,
      stack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <div>模块 {this.state.moduleName} 加载失败，请刷新重试</div>;
    }

    return this.props.children;
  }
}
```

### 2. 模块健康检查
```typescript
// shared/src/utils/health-check.ts
export class ModuleHealthMonitor {
  private modules = new Map<string, ModuleHealth>();

  registerModule(name: string, checkFn: () => boolean) {
    this.modules.set(name, { name, isHealthy: true, checkFn });
    this.startHealthCheck(name);
  }

  private startHealthCheck(name: string) {
    setInterval(() => {
      const module = this.modules.get(name);
      if (module) {
        const isHealthy = module.checkFn();
        if (!isHealthy) {
          this.handleUnhealthyModule(name);
        }
      }
    }, 30000); // 30秒检查一次
  }
}
```

## 测试策略

### 1. 单元测试 (模块级别)
- 每个微前端模块独立的测试套件
- 模拟其他模块的依赖

### 2. 集成测试 (跨模块)
- 测试模块间通信协议
- 端到端用户场景测试

### 3. 契约测试
- 定义模块间接口契约
- 确保接口变更不破坏其他模块