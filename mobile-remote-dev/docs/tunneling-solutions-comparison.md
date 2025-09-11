# 内网穿透方案详细对比

## 1. ngrok - 最受欢迎的解决方案

### 优势
- **易用性**: 一条命令即可启动
- **稳定性**: 商业级别的基础设施
- **功能丰富**: HTTP/HTTPS/TCP隧道支持
- **调试友好**: 内置Web界面查看请求

### 配置步骤
```bash
# 安装ngrok
npm install -g ngrok

# 免费版本 - 随机域名
ngrok http 3000

# 付费版本 - 自定义域名
ngrok http 3000 --subdomain=myapp

# 配置文件方式
echo "authtoken: YOUR_AUTH_TOKEN" > ~/.ngrok2/ngrok.yml
```

### 版本对比
| 功能 | 免费版 | 付费版($5-$25/月) |
|-----|-------|------------------|
| 隧道数量 | 1个 | 无限制 |
| 自定义域名 | ❌ | ✅ |
| 密码保护 | ❌ | ✅ |
| 连接数 | 20个/分钟 | 无限制 |
| HTTPS | ✅ | ✅ |

### 最佳实践
```javascript
// package.json 脚本配置
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "tunnel": "ngrok http 3000",
    "dev:mobile": "concurrently \"npm run dev\" \"npm run tunnel\""
  }
}
```

## 2. frp - 高度可定制的自建方案

### 优势
- **完全控制**: 自建服务器，无流量限制
- **高性能**: 专为内网穿透优化
- **多协议支持**: HTTP/HTTPS/TCP/UDP
- **成本低**: 只需服务器费用

### 服务器端配置
```ini
# frps.ini (服务器配置)
[common]
bind_port = 7000
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = admin
vhost_http_port = 80
vhost_https_port = 443
```

### 客户端配置
```ini
# frpc.ini (客户端配置)
[common]
server_addr = your-server-ip
server_port = 7000

[web]
type = http
local_port = 3000
custom_domains = dev.yourdomain.com
```

### 自动化脚本
```bash
#!/bin/bash
# start-dev-tunnel.sh
echo "启动开发环境隧道..."
./frpc -c ./frpc.ini &
FRPC_PID=$!
echo "FRP客户端 PID: $FRPC_PID"

# 启动开发服务器
npm run dev

# 清理进程
kill $FRPC_PID
```

## 3. localtunnel - 零配置快速方案

### 特点
- **零配置**: 无需注册账号
- **开源**: MIT许可证
- **简单**: 一条命令启动

### 使用方法
```bash
# 安装
npm install -g localtunnel

# 启动隧道
lt --port 3000

# 自定义子域名
lt --port 3000 --subdomain myapp
```

### 限制和注意事项
- 连接不稳定，经常断开
- 域名可能被占用
- 适合临时测试，不适合长期开发

## 4. Cloudflare Tunnel - 企业级安全方案

### 优势
- **安全性**: 企业级安全保护
- **免费**: 基础功能完全免费
- **全球CDN**: 访问速度快
- **零信任**: 内置访问控制

### 配置步骤
```bash
# 安装 cloudflared
brew install cloudflared

# 登录 Cloudflare
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create dev-tunnel

# 配置路由
cloudflared tunnel route dns dev-tunnel dev.yourdomain.com

# 启动隧道
cloudflared tunnel run dev-tunnel
```

### 配置文件
```yaml
# config.yml
tunnel: dev-tunnel
credentials-file: /path/to/credentials.json

ingress:
  - hostname: dev.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

## 5. Serveo - 最简单的SSH隧道

### 特点
- **无需安装**: 使用系统SSH
- **即时使用**: 无需注册
- **多协议**: HTTP/HTTPS/TCP

### 使用方法
```bash
# HTTP隧道
ssh -R 80:localhost:3000 serveo.net

# HTTPS隧道
ssh -R 443:localhost:3000 serveo.net

# 自定义子域名
ssh -R myapp:80:localhost:3000 serveo.net
```

## 方案选择建议

### 快速开发测试
**推荐**: ngrok 或 localtunnel
- 适合短期测试
- 配置简单
- 立即可用

### 长期开发项目
**推荐**: frp 或 Cloudflare Tunnel
- 稳定可靠
- 性能优秀
- 成本可控

### 团队协作开发
**推荐**: Cloudflare Tunnel
- 访问控制
- 安全性高
- 全球加速

## 性能对比表

| 方案 | 稳定性 | 速度 | 安全性 | 配置复杂度 | 成本 |
|-----|-------|------|--------|------------|------|
| ngrok | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | 中 |
| frp | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 低 |
| localtunnel | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ | 免费 |
| Cloudflare | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 免费 |
| Serveo | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | 免费 |