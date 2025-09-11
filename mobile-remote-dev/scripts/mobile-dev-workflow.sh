#!/bin/bash

# 移动端开发自动化工作流脚本
# Mobile Development Automation Workflow Script

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置文件路径
CONFIG_DIR="$(dirname "$0")/../configs"
PROJECT_ROOT="$(dirname "$0")/.."

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# 检查依赖
check_dependencies() {
    log "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装。请访问 https://nodejs.org 安装"
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        error "npm 未安装"
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        error "Git 未安装"
    fi
    
    info "✅ 系统依赖检查完成"
}

# 检测项目类型
detect_project_type() {
    if [[ -f "package.json" ]]; then
        if grep -q "vite" package.json; then
            echo "vite"
        elif grep -q "react-scripts" package.json; then
            echo "cra"
        elif grep -q "next" package.json; then
            echo "nextjs"
        elif grep -q "@expo/cli" package.json; then
            echo "expo"
        else
            echo "node"
        fi
    else
        echo "unknown"
    fi
}

# 获取本机IP地址
get_local_ip() {
    # macOS/Linux通用获取IP方法
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1
    else
        # Linux
        ip route get 1 | awk '{print $7; exit}' 2>/dev/null || \
        hostname -I | awk '{print $1}'
    fi
}

# 设置环境变量
setup_environment() {
    log "设置开发环境变量..."
    
    # 创建或更新.env.development
    cat > .env.development << EOF
# 移动端开发环境配置
NODE_ENV=development
MOBILE_DEV=true

# 服务器配置
VITE_HOST=0.0.0.0
VITE_PORT=3000

# 本机IP地址
VITE_LOCAL_IP=$(get_local_ip)

# 调试工具配置
VITE_DEBUG_VCONSOLE=true
VITE_DEBUG_ERUDA=false
VITE_REMOTE_LOGGING=true

# API配置
VITE_API_URL=http://localhost:8080/api

# 性能监控
VITE_PERFORMANCE_MONITOR=true
VITE_PERF_INTERVAL=30000

# PWA支持
PWA=false
EOF

    info "✅ 环境变量配置完成"
}

# 选择并启动内网穿透
setup_tunneling() {
    log "配置内网穿透方案..."
    
    echo -e "\n${CYAN}请选择内网穿透方案:${NC}"
    echo "1) ngrok (推荐 - 稳定可靠)"
    echo "2) localtunnel (简单免费)"
    echo "3) Cloudflare Tunnel (企业级)"
    echo "4) serveo (SSH隧道)"
    echo "5) 跳过内网穿透"
    
    read -p "请输入选择 (1-5): " choice
    
    case $choice in
        1)
            setup_ngrok
            ;;
        2)
            setup_localtunnel
            ;;
        3)
            setup_cloudflare_tunnel
            ;;
        4)
            setup_serveo
            ;;
        5)
            info "跳过内网穿透配置"
            ;;
        *)
            warn "无效选择，跳过内网穿透配置"
            ;;
    esac
}

# 配置ngrok
setup_ngrok() {
    log "配置ngrok隧道..."
    
    # 检查ngrok是否安装
    if ! command -v ngrok &> /dev/null; then
        info "安装ngrok..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install ngrok/ngrok/ngrok
        else
            error "请手动安装ngrok: https://ngrok.com/download"
        fi
    fi
    
    # 检查认证token
    if [[ -z "${NGROK_AUTHTOKEN:-}" ]]; then
        echo -e "\n${YELLOW}请输入ngrok认证token (从 https://dashboard.ngrok.com/get-started/your-authtoken 获取):${NC}"
        read -p "Token: " ngrok_token
        
        if [[ -n "$ngrok_token" ]]; then
            ngrok authtoken "$ngrok_token"
            echo "NGROK_AUTHTOKEN=$ngrok_token" >> .env.development
        fi
    fi
    
    # 启动ngrok隧道
    start_ngrok_tunnel
}

# 启动ngrok隧道
start_ngrok_tunnel() {
    log "启动ngrok隧道..."
    
    # 在后台启动ngrok
    ngrok http 3000 --log=stdout > ngrok.log 2>&1 &
    NGROK_PID=$!
    echo $NGROK_PID > .ngrok.pid
    
    # 等待ngrok启动
    sleep 3
    
    # 获取ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
    
    if [[ -n "$NGROK_URL" ]]; then
        echo "TUNNEL_URL=$NGROK_URL" >> .env.development
        info "✅ ngrok隧道已启动: $NGROK_URL"
    else
        warn "⚠️  ngrok隧道启动失败，请检查日志"
    fi
}

# 配置localtunnel
setup_localtunnel() {
    log "配置localtunnel..."
    
    # 安装localtunnel
    if ! command -v lt &> /dev/null; then
        npm install -g localtunnel
    fi
    
    # 启动localtunnel
    lt --port 3000 --print-requests > localtunnel.log 2>&1 &
    LT_PID=$!
    echo $LT_PID > .localtunnel.pid
    
    sleep 2
    
    # 从日志获取URL
    if [[ -f "localtunnel.log" ]]; then
        LT_URL=$(grep -o 'https://[^[:space:]]*' localtunnel.log | head -1)
        if [[ -n "$LT_URL" ]]; then
            echo "TUNNEL_URL=$LT_URL" >> .env.development
            info "✅ localtunnel隧道已启动: $LT_URL"
        fi
    fi
}

# 配置Cloudflare Tunnel
setup_cloudflare_tunnel() {
    log "配置Cloudflare Tunnel..."
    
    if ! command -v cloudflared &> /dev/null; then
        info "请先安装cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
        return 1
    fi
    
    echo -e "\n${YELLOW}Cloudflare Tunnel需要预先配置，请参考文档进行设置${NC}"
    echo "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/"
    
    read -p "请输入隧道名称: " tunnel_name
    read -p "请输入自定义域名: " hostname
    
    if [[ -n "$tunnel_name" && -n "$hostname" ]]; then
        # 启动cloudflare隧道
        cloudflared tunnel run "$tunnel_name" &
        CF_PID=$!
        echo $CF_PID > .cloudflare.pid
        
        echo "TUNNEL_URL=https://$hostname" >> .env.development
        info "✅ Cloudflare隧道已启动: https://$hostname"
    fi
}

# 配置serveo
setup_serveo() {
    log "配置serveo SSH隧道..."
    
    # 启动serveo隧道
    ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 serveo.net > serveo.log 2>&1 &
    SERVEO_PID=$!
    echo $SERVEO_PID > .serveo.pid
    
    sleep 3
    
    # 从日志获取URL
    if [[ -f "serveo.log" ]]; then
        SERVEO_URL=$(grep -o 'https://[^[:space:]]*\.serveo\.net' serveo.log | head -1)
        if [[ -n "$SERVEO_URL" ]]; then
            echo "TUNNEL_URL=$SERVEO_URL" >> .env.development
            info "✅ serveo隧道已启动: $SERVEO_URL"
        fi
    fi
}

# 启动开发服务器
start_dev_server() {
    log "启动开发服务器..."
    
    PROJECT_TYPE=$(detect_project_type)
    
    case $PROJECT_TYPE in
        "vite")
            npm run dev -- --host 0.0.0.0 --port 3000
            ;;
        "cra")
            BROWSER=none HOST=0.0.0.0 PORT=3000 npm start
            ;;
        "nextjs")
            npm run dev -- -H 0.0.0.0 -p 3000
            ;;
        "expo")
            npx expo start --tunnel
            ;;
        *)
            npm start
            ;;
    esac
}

# 清理进程
cleanup() {
    log "清理后台进程..."
    
    # 清理各种隧道进程
    for pidfile in .ngrok.pid .localtunnel.pid .cloudflare.pid .serveo.pid; do
        if [[ -f "$pidfile" ]]; then
            PID=$(cat "$pidfile")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                info "已终止进程: $PID"
            fi
            rm -f "$pidfile"
        fi
    done
    
    # 清理日志文件
    rm -f ngrok.log localtunnel.log serveo.log
    
    info "✅ 清理完成"
}

# 显示开发环境信息
show_dev_info() {
    log "移动端开发环境信息:"
    
    LOCAL_IP=$(get_local_ip)
    
    echo -e "\n${CYAN}🌐 访问地址:${NC}"
    echo -e "   本地访问: ${GREEN}http://localhost:3000${NC}"
    echo -e "   局域网访问: ${GREEN}http://$LOCAL_IP:3000${NC}"
    
    if [[ -f ".env.development" ]] && grep -q "TUNNEL_URL" .env.development; then
        TUNNEL_URL=$(grep "TUNNEL_URL" .env.development | cut -d'=' -f2)
        echo -e "   外网访问: ${GREEN}$TUNNEL_URL${NC}"
    fi
    
    echo -e "\n${CYAN}📱 移动端测试:${NC}"
    echo -e "   1. 确保手机与电脑在同一网络"
    echo -e "   2. 在手机浏览器中访问上述地址"
    echo -e "   3. 如需外网访问，使用隧道地址"
    
    echo -e "\n${CYAN}🛠 调试工具:${NC}"
    echo -e "   Chrome DevTools: chrome://inspect"
    echo -e "   Safari Web Inspector: 开发 -> 设备名"
    echo -e "   vConsole: 已自动启用"
    
    echo -e "\n${CYAN}⚡ 快捷命令:${NC}"
    echo -e "   停止服务: ${YELLOW}Ctrl+C${NC}"
    echo -e "   清理进程: ${YELLOW}./mobile-dev-workflow.sh cleanup${NC}"
    echo -e "   查看日志: ${YELLOW}tail -f ngrok.log${NC}"
}

# 安装移动端开发依赖
install_mobile_deps() {
    log "安装移动端开发依赖..."
    
    # 检查package.json是否存在
    if [[ ! -f "package.json" ]]; then
        error "当前目录不是Node.js项目"
    fi
    
    # 安装开发依赖
    DEPS_TO_INSTALL=""
    
    # 检查并添加需要的依赖
    if ! grep -q "vconsole" package.json; then
        DEPS_TO_INSTALL="$DEPS_TO_INSTALL vconsole"
    fi
    
    if ! grep -q "eruda" package.json; then
        DEPS_TO_INSTALL="$DEPS_TO_INSTALL eruda"
    fi
    
    if ! grep -q "concurrently" package.json; then
        DEPS_TO_INSTALL="$DEPS_TO_INSTALL concurrently"
    fi
    
    if [[ -n "$DEPS_TO_INSTALL" ]]; then
        npm install --save-dev $DEPS_TO_INSTALL
        info "✅ 移动端开发依赖安装完成"
    else
        info "✅ 所有依赖已存在"
    fi
}

# 创建移动端调试配置
create_debug_config() {
    log "创建移动端调试配置..."
    
    # 创建调试工具初始化脚本
    cat > src/utils/debug-init.js << 'EOF'
// 移动端调试工具初始化
class MobileDebugManager {
  constructor() {
    this.config = {
      vconsole: process.env.NODE_ENV === 'development',
      eruda: false,
      performance: true,
      remoteLogging: false
    };
    
    this.init();
  }
  
  async init() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('debug') === 'true' || this.config.vconsole) {
      await this.loadVConsole();
    }
    
    if (urlParams.get('eruda') === 'true' || this.config.eruda) {
      await this.loadEruda();
    }
    
    if (this.config.performance) {
      this.initPerformanceMonitor();
    }
  }
  
  async loadVConsole() {
    try {
      const VConsole = await import('vconsole');
      new VConsole.default();
      console.log('📱 vConsole 调试工具已启动');
    } catch (error) {
      console.warn('vConsole 加载失败:', error);
    }
  }
  
  async loadEruda() {
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda@2.4.1/eruda.min.js';
      script.onload = () => {
        eruda.init();
        console.log('🛠 Eruda 调试工具已启动');
      };
      document.head.appendChild(script);
    } catch (error) {
      console.warn('Eruda 加载失败:', error);
    }
  }
  
  initPerformanceMonitor() {
    // 性能监控
    let fps = 0;
    let lastTime = performance.now();
    
    const updateFPS = () => {
      const now = performance.now();
      fps = Math.round(1000 / (now - lastTime));
      lastTime = now;
      requestAnimationFrame(updateFPS);
    };
    
    updateFPS();
    
    // 每30秒记录一次性能数据
    setInterval(() => {
      if (performance.memory) {
        const memory = performance.memory;
        console.log('📊 性能数据:', {
          fps: fps,
          memory: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
          timing: performance.timing
        });
      }
    }, 30000);
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  window.mobileDebug = new MobileDebugManager();
}

export default MobileDebugManager;
EOF

    info "✅ 移动端调试配置创建完成"
}

# 主函数
main() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 移动端开发自动化工作流                        ║"
    echo "║              Mobile Development Workflow                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    # 处理命令行参数
    case "${1:-}" in
        "cleanup")
            cleanup
            exit 0
            ;;
        "deps")
            install_mobile_deps
            exit 0
            ;;
        "debug")
            create_debug_config
            exit 0
            ;;
        "info")
            show_dev_info
            exit 0
            ;;
    esac
    
    # 主流程
    check_dependencies
    setup_environment
    install_mobile_deps
    create_debug_config
    setup_tunneling
    
    # 显示信息
    show_dev_info
    
    # 设置清理陷阱
    trap cleanup EXIT INT TERM
    
    # 启动开发服务器
    echo -e "\n${GREEN}🚀 启动开发服务器...${NC}"
    start_dev_server
}

# 运行主函数
main "$@"