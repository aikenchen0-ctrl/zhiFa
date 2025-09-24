#!/bin/bash

# Chrome调试模式启动脚本
# 使用方法: ./start-chrome-debug.sh [port] [url]

PORT=${1:-9222}
URL=${2:-"about:blank"}
DEBUG_DIR="/tmp/chrome-debug-$PORT"

echo "🔧 启动Chrome调试模式..."
echo "端口: $PORT"
echo "初始URL: $URL"
echo "数据目录: $DEBUG_DIR"

# 清理旧的调试目录
rm -rf "$DEBUG_DIR"

# 杀死现有Chrome进程
pkill -f "Google Chrome" || true
sleep 2

# 启动Chrome调试模式
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=$PORT \
  --user-data-dir="$DEBUG_DIR" \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --no-first-run \
  --no-default-browser-check \
  --disable-default-apps \
  --disable-popup-blocking \
  --disable-translate \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --disable-dev-shm-usage \
  --disable-ipc-flooding-protection \
  "$URL" &

# 等待Chrome启动
echo "⏳ 等待Chrome启动..."
sleep 3

# 验证调试端口
echo "🔍 验证调试端口..."
if curl -s "http://localhost:$PORT/json/version" > /dev/null; then
    echo "✅ Chrome调试模式启动成功！"
    echo "📱 DevTools: http://localhost:$PORT"
    curl -s "http://localhost:$PORT/json/version" | jq '.'
else
    echo "❌ Chrome调试模式启动失败"
    exit 1
fi