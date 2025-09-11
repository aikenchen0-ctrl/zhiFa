# 云端开发环境解决方案

## 1. GitHub Codespaces - 最强集成体验

### 核心优势
- **完整开发环境**: VS Code + 完整Linux容器
- **GitHub集成**: 一键从仓库启动
- **规格可选**: 2-32核心配置
- **实时协作**: 支持多人同时开发

### 配置方法

#### 1. 仓库配置文件
```json
// .devcontainer/devcontainer.json
{
  "name": "React Native Dev",
  "image": "mcr.microsoft.com/vscode/devcontainers/javascript-node:16",
  "forwardPorts": [3000, 8081, 19000, 19001, 19002],
  "portsAttributes": {
    "3000": {
      "label": "Web Server",
      "visibility": "public"
    },
    "8081": {
      "label": "Metro Bundler",
      "visibility": "public"
    }
  },
  "postCreateCommand": "npm install && npm install -g @expo/cli",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-react-native",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode"
      ]
    }
  },
  "remoteEnv": {
    "EXPO_DEVTOOLS_LISTEN_ADDRESS": "0.0.0.0"
  }
}
```

#### 2. 启动脚本
```json
// package.json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "dev:expo": "expo start --tunnel",
    "codespace:setup": "chmod +x .devcontainer/setup.sh && .devcontainer/setup.sh"
  }
}
```

#### 3. 自动化设置脚本
```bash
#!/bin/bash
# .devcontainer/setup.sh
echo "设置 Codespace 开发环境..."

# 安装全局依赖
npm install -g serve http-server

# 配置Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 设置环境变量
echo 'export REACT_APP_API_URL="https://${CODESPACE_NAME}-3001-${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"' >> ~/.bashrc

echo "Codespace 环境配置完成！"
```

### 费用和限制
- **免费额度**: 每月120核心小时
- **个人版**: $0.18/核心小时
- **团队版**: $0.36/核心小时
- **存储**: $0.07/GB/月

## 2. Gitpod - 最快启动速度

### 特色功能
- **10秒启动**: 预构建工作区
- **浏览器原生**: 无需本地安装
- **多IDE支持**: VS Code、IntelliJ、Vim
- **协作友好**: 共享工作区

### 配置文件
```yaml
# .gitpod.yml
image:
  file: .gitpod.Dockerfile

ports:
  - port: 3000
    onOpen: open-preview
    visibility: public
  - port: 8081
    onOpen: ignore
    visibility: public

tasks:
  - name: Install Dependencies
    init: npm install
    command: npm run dev

vscode:
  extensions:
    - ms-vscode.vscode-react-native
    - bradlc.vscode-tailwindcss
    - esbenp.prettier-vscode

github:
  prebuilds:
    master: true
    branches: true
    pullRequests: true
```

### Dockerfile配置
```dockerfile
# .gitpod.Dockerfile
FROM gitpod/workspace-node:latest

# 安装React Native CLI
RUN npm install -g @react-native-community/cli @expo/cli

# 安装Android SDK (可选)
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-8092744_latest.zip \
    && unzip commandlinetools-linux-8092744_latest.zip \
    && mkdir -p /home/gitpod/android-sdk/cmdline-tools \
    && mv cmdline-tools /home/gitpod/android-sdk/cmdline-tools/latest

ENV ANDROID_SDK_ROOT=/home/gitpod/android-sdk
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools
```

## 3. CodeSandbox - 前端专属在线IDE

### 适用场景
- **React/Vue项目**: 原生支持
- **快速原型**: 模板丰富
- **实时预览**: 修改即时生效
- **移动端优化**: 响应式预览

### 项目配置
```json
// sandbox.config.json
{
  "infiniteLoopProtection": true,
  "hardReloadOnChange": false,
  "view": "browser",
  "template": "create-react-app",
  "container": {
    "port": 3000,
    "startScript": "start"
  }
}
```

### 移动端测试配置
```javascript
// 在项目中添加移动端检测
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  // 启用移动端调试
  import('eruda').then(eruda => eruda.default.init());
}
```

## 4. StackBlitz - WebContainer技术

### 技术优势
- **真实Node环境**: 浏览器内运行Node.js
- **即时启动**: 无需等待容器启动
- **本地感受**: 接近本地开发体验
- **包管理**: 支持npm/yarn完整功能

### 项目配置
```json
// .stackblitzrc
{
  "startCommand": "npm run dev",
  "env": {
    "NODE_ENV": "development",
    "VITE_API_URL": "https://api.example.com"
  },
  "installDependencies": true,
  "preview": {
    "port": 3000,
    "open": true
  }
}
```

## 5. Vercel - 专业预览部署

### 核心功能
- **Git集成**: 推送即部署
- **分支预览**: 每个分支独立URL
- **边缘网络**: 全球CDN加速
- **环境变量**: 安全配置管理

### 配置文件
```json
// vercel.json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "VITE_API_URL": "@api-url-dev"
  },
  "build": {
    "env": {
      "VITE_API_URL": "@api-url-prod"
    }
  },
  "preview": {
    "allowQuery": ["debug", "preview"]
  }
}
```

### 部署脚本
```bash
#!/bin/bash
# deploy-preview.sh
echo "部署预览环境..."

# 构建项目
npm run build

# 部署到Vercel
vercel --prod

echo "预览地址: $(vercel ls | grep -E 'https://.*\.vercel\.app' | head -1)"
```

## 方案选择建议

### 完整开发环境
**GitHub Codespaces**
- 适合大型项目
- 需要完整开发工具链
- 团队协作频繁

### 快速原型开发
**CodeSandbox + StackBlitz**
- 前端项目快速验证
- 在线演示和分享
- 教学和培训

### 持续集成测试
**Vercel + Gitpod**
- 自动化部署测试
- 多环境管理
- 性能监控

## 成本对比 (月费用)

| 平台 | 免费额度 | 付费起价 | 企业版 |
|-----|----------|----------|--------|
| GitHub Codespaces | 120核心时 | $4/月 | 定制 |
| Gitpod | 50小时 | $8/月 | $39/月 |
| CodeSandbox | 无限沙盒 | $7/月 | $24/月 |
| StackBlitz | 无限项目 | $7/月 | 定制 |
| Vercel | 100GB带宽 | $20/月 | $40/月 |

## 最佳实践建议

1. **混合使用**: 不同阶段使用不同平台
2. **环境变量**: 统一管理配置
3. **依赖缓存**: 加速构建时间
4. **预览分享**: 便于团队沟通
5. **监控告警**: 及时发现问题