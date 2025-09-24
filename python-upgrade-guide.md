# Python 环境升级指南

## 🚨 当前状况
- **当前Python**: 3.9.6 (系统版本)
- **项目需求**: Python 3.10+
- **目标**: 安装Python 3.11.9

## 🚀 解决方案选择

### 方案A: 安装Python 3.11 (推荐 ⭐⭐⭐⭐⭐)

**已下载安装包**: `python-installer.pkg` (44.9MB)

**安装步骤**:
```bash
# 1. 手动安装 (需要管理员权限)
sudo installer -pkg python-installer.pkg -target /

# 2. 验证安装
/usr/local/bin/python3.11 --version

# 3. 创建符号链接 (可选)
sudo ln -sf /usr/local/bin/python3.11 /usr/local/bin/python3-latest
```

**安装后路径**:
- Python: `/usr/local/bin/python3.11`
- pip: `/usr/local/bin/pip3.11`

### 方案B: 使用Docker (无需系统更改)

```bash
# 1. 构建Docker镜像
cd chrome-devtools-mcp
cat > Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 9222
CMD ["python", "server.py"]
EOF

# 2. 构建和运行
docker build -t chrome-devtools-mcp .
docker run -p 9222:9222 chrome-devtools-mcp
```

### 方案C: 立即可用的浏览器调试

```bash
# 启动Chrome调试模式
open -a "Google Chrome" --args --remote-debugging-port=9222 \\
file:///Users/liuyuyan/Development/claude-flow-workspace/pure-css-anchor-test.html

# 在浏览器中访问
# chrome://inspect/#devices
```

## 🎯 推荐流程

1. **立即调试**: 使用方案C快速查看CSS问题
2. **长期集成**: 安装Python 3.11 (方案A)
3. **完整部署**: Chrome DevTools MCP + Claude Flow集成

## ⚡ 快速命令

```bash
# 安装Python 3.11
sudo installer -pkg python-installer.pkg -target /

# 验证并继续部署
/usr/local/bin/python3.11 --version && echo "✅ Python 3.11 安装成功"

# 进入chrome-devtools-mcp目录
cd chrome-devtools-mcp

# 创建虚拟环境
/usr/local/bin/python3.11 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动MCP服务器
python server.py
```

**你倾向于哪个方案？我可以立即协助安装和配置。**