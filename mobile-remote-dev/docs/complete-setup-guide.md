# 移动端远程开发完整安装指南

## 🚀 快速开始

### 一键启动脚本
```bash
# 克隆或下载项目文件到本地
cd mobile-remote-dev

# 给脚本执行权限
chmod +x scripts/mobile-dev-workflow.sh

# 启动移动端开发环境
./scripts/mobile-dev-workflow.sh
```

## 📋 详细配置步骤

### 1. 环境准备

#### 系统要求
- **Node.js**: 16.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **Git**: 用于版本控制
- **现代浏览器**: Chrome 60+, Safari 10+, Firefox 60+

#### 安装依赖
```bash
# 安装Node.js (推荐使用nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 验证安装
node --version
npm --version
```

### 2. 项目初始化

#### 使用React+Vite模板
```bash
# 创建新项目
npm create vite@latest my-mobile-app -- --template react

# 进入项目目录
cd my-mobile-app

# 复制配置文件
cp ../mobile-remote-dev/examples/react-mobile-starter/vite.config.js .
cp ../mobile-remote-dev/examples/react-mobile-starter/package.json .

# 安装依赖
npm install
```

#### 手动配置现有项目
```bash
# 安装移动端开发依赖
npm install --save-dev vconsole eruda concurrently

# 安装内网穿透工具
npm install -g ngrok localtunnel

# 创建环境配置文件
touch .env.development .env.production
```

### 3. 内网穿透配置

#### 方案A: ngrok (推荐)
```bash
# 1. 安装ngrok
brew install ngrok/ngrok/ngrok

# 2. 注册账号获取token
# 访问: https://dashboard.ngrok.com/get-started/your-authtoken

# 3. 配置token
ngrok authtoken YOUR_AUTH_TOKEN

# 4. 启动隧道
ngrok http 3000
```

#### 方案B: localtunnel (简单快速)
```bash
# 1. 安装localtunnel
npm install -g localtunnel

# 2. 启动隧道
lt --port 3000 --subdomain myapp
```

#### 方案C: Cloudflare Tunnel (企业级)
```bash
# 1. 安装cloudflared
brew install cloudflared

# 2. 登录Cloudflare
cloudflared tunnel login

# 3. 创建隧道
cloudflared tunnel create my-tunnel

# 4. 配置DNS
cloudflared tunnel route dns my-tunnel app.yourdomain.com

# 5. 启动隧道
cloudflared tunnel run my-tunnel
```

### 4. 开发环境配置

#### 环境变量设置
```bash
# .env.development
NODE_ENV=development
MOBILE_DEV=true

# 服务器配置
VITE_HOST=0.0.0.0
VITE_PORT=3000

# 调试工具
VITE_DEBUG_VCONSOLE=true
VITE_DEBUG_ERUDA=false
VITE_REMOTE_LOGGING=true

# 性能监控
VITE_PERFORMANCE_MONITOR=true
VITE_PERF_INTERVAL=30000

# 内网穿透
TUNNEL_PROVIDER=ngrok
NGROK_AUTHTOKEN=your_token_here
```

#### Vite配置优化
```javascript
// vite.config.js
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: false, // 根据需要启用HTTPS
    cors: true,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    target: ['es2015', 'chrome60', 'firefox60', 'safari10']
  }
});
```

### 5. 移动端调试工具集成

#### 自动化调试配置
```javascript
// src/utils/debug-init.js
import MobileDebugManager from './debug-init.js';

// 在应用入口文件中导入
// src/main.jsx 或 src/App.jsx
import './utils/debug-init.js';
```

#### 手动控制调试工具
```javascript
// 通过URL参数启用
// http://localhost:3000?debug=true&eruda=true

// 通过localStorage控制
localStorage.setItem('mobile-debug-config', JSON.stringify({
  vconsole: true,
  eruda: false,
  performance: true
}));
```

### 6. 项目脚本配置

#### package.json 脚本
```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "dev:mobile": "concurrently \"npm run dev\" \"ngrok http 3000\"",
    "dev:debug": "VITE_DEBUG_VCONSOLE=true npm run dev",
    "tunnel:ngrok": "ngrok http 3000",
    "tunnel:lt": "lt --port 3000",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0"
  }
}
```

### 7. 网络配置

#### 防火墙设置
```bash
# macOS
sudo pfctl -f /etc/pf.conf

# 或者系统偏好设置 -> 安全性与隐私 -> 防火墙 -> 选项
# 允许传入连接: Node, vite 等

# Windows
# 控制面板 -> 系统和安全 -> Windows Defender 防火墙
# 添加例外: 端口 3000
```

#### 路由器设置 (如需要)
```bash
# 端口转发配置 (高级用户)
# 路由器管理界面 -> 高级设置 -> 端口转发
# 内部端口: 3000
# 外部端口: 3000
# 协议: TCP
```

### 8. 移动设备配置

#### iOS设备调试
```bash
# 1. 启用Web检查器
# 设置 -> Safari -> 高级 -> Web检查器

# 2. 连接到Mac
# Safari -> 开发 -> 设备名 -> 页面

# 3. 使用模拟器
open -a Simulator
```

#### Android设备调试
```bash
# 1. 启用开发者选项
# 设置 -> 关于手机 -> 版本号 (点击7次)

# 2. 启用USB调试
# 设置 -> 开发者选项 -> USB调试

# 3. Chrome远程调试
# chrome://inspect/#devices
```

## 🔧 高级配置

### HTTPS配置 (用于现代Web API)
```bash
# 生成自签名证书
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# 配置环境变量
HTTPS=true
HTTPS_KEY=./key.pem
HTTPS_CERT=./cert.pem
```

### 性能优化配置
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production'
      }
    }
  }
});
```

### PWA配置 (可选)
```bash
# 安装PWA插件
npm install -D vite-plugin-pwa

# 配置manifest.json和service worker
# 参考: examples/react-mobile-starter/vite.config.js
```

## 📱 使用指南

### 开发流程
1. **启动开发服务器**
   ```bash
   npm run dev:mobile
   ```

2. **获取访问地址**
   ```bash
   # 本地网络
   http://192.168.1.100:3000
   
   # 内网穿透
   https://abc123.ngrok.io
   ```

3. **移动端访问**
   - 在手机浏览器中打开地址
   - 三指点击屏幕呼出调试面板
   - 摇一摇设备也可呼出调试面板

4. **实时调试**
   - 修改代码自动热更新
   - 查看控制台和网络请求
   - 检查页面元素和样式

### 调试技巧
- **vConsole**: 适合日常开发调试
- **Eruda**: 功能更丰富，适合深度调试
- **Chrome DevTools**: 最强大，需要USB或网络连接
- **Safari Web Inspector**: iOS专用，功能完整

### 性能监控
- 实时FPS显示
- 内存使用监控
- 网络请求分析
- 页面加载时间统计

## 🚨 常见问题解决

### 1. 无法访问开发服务器
**问题**: 手机无法访问电脑上的开发服务器

**解决方案**:
```bash
# 检查防火墙设置
# 确保使用 --host 0.0.0.0
# 检查网络连接是否在同一局域网

# 查看本机IP
ipconfig getifaddr en0  # macOS
ip route get 1 | awk '{print $7; exit}'  # Linux
```

### 2. 内网穿透连接失败
**问题**: ngrok或其他隧道工具连接失败

**解决方案**:
```bash
# 检查认证token
ngrok authtoken YOUR_TOKEN

# 重新启动隧道
pkill ngrok
ngrok http 3000

# 使用不同的隧道服务
lt --port 3000
```

### 3. 调试工具无法加载
**问题**: vConsole或Eruda无法正常加载

**解决方案**:
```bash
# 检查网络连接
# 确认CDN资源可访问
# 使用本地版本

npm install vconsole eruda
```

### 4. HTTPS相关问题
**问题**: 现代Web API需要HTTPS环境

**解决方案**:
```bash
# 使用ngrok的HTTPS功能
ngrok http 3000  # 自动提供HTTPS

# 或配置本地HTTPS证书
# 参考上面的HTTPS配置部分
```

### 5. 热更新不工作
**问题**: 代码修改后页面不自动刷新

**解决方案**:
```bash
# 检查HMR配置
# vite.config.js
server: {
  hmr: {
    overlay: false  # 如果使用隧道
  }
}
```

## 📚 扩展资源

### 推荐工具
- **Figma**: UI设计和原型制作
- **BrowserStack**: 真实设备测试
- **LambdaTest**: 跨浏览器测试
- **Sentry**: 错误监控和性能追踪

### 学习资源
- [MDN Web API文档](https://developer.mozilla.org/en-US/docs/Web/API)
- [Can I Use](https://caniuse.com/): 浏览器兼容性查询
- [Web.dev](https://web.dev/): 现代Web开发最佳实践
- [React Native文档](https://reactnative.dev/): 如果需要原生应用开发

### 社区和支持
- [Stack Overflow](https://stackoverflow.com/): 技术问题解答
- [GitHub Discussions](https://github.com/): 开源项目讨论
- [Discord/Slack社区](https://discord.com/): 实时技术交流

---

通过以上完整的配置指南，你可以快速建立一个高效的移动端开发环境，实现在外网环境下手机实时访问和调试开发页面。整个解决方案涵盖了从基础配置到高级优化的各个方面，确保开发体验流畅且功能完备。