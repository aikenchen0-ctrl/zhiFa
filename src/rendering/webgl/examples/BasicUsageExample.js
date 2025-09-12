/**
 * 基础使用示例
 * 展示如何使用ConnectionRenderingEngine创建实时跟随连接线
 */
import { createConnectionRenderingEngine } from '../ConnectionRenderingEngine.js';

export class BasicUsageExample {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.engine = null;
    this.connections = new Map();
    
    // 模拟的UI元素
    this.bubbles = new Map();
    this.avatars = new Map();
    
    // 动画和交互状态
    this.isRunning = false;
    this.animationId = null;
    
    this.init();
  }

  async init() {
    this.createCanvas();
    await this.initEngine();
    this.setupEventListeners();
    this.createMockElements();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'connection-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1000';
    
    this.container.appendChild(this.canvas);
    this.resizeCanvas();
  }

  async initEngine() {
    const options = {
      enablePerformanceOptimization: true,
      enableCollisionDetection: true,
      enableBranchConnections: true,
      enableOcclusion: true,
      debug: true,
      
      // 路径计算配置
      pathCalculator: {
        cornerRadius: 8,
        horizontalExtend: 5,
        pathPrecision: 0.1
      },
      
      // 性能优化配置
      performance: {
        targetFPS: 60,
        adaptiveQuality: true,
        batchSize: 100,
        cullingEnabled: true
      },
      
      // 碰撞检测配置
      collision: {
        precision: 2,
        enableCaching: true,
        cacheDuration: 100
      }
    };

    this.engine = createConnectionRenderingEngine(this.canvas, options);
    
    // 监听引擎事件
    this.engine.on('initialized', () => {
      console.log('Engine initialized successfully');
      this.start();
    });
    
    this.engine.on('connectionAdded', (data) => {
      console.log('Connection added:', data.id);
    });
    
    this.engine.on('rendered', (data) => {
      // 可以在这里处理渲染统计
      if (data.frameTime > 16.67) { // 超过60FPS阈值
        console.warn('Frame time high:', data.frameTime);
      }
    });
  }

  setupEventListeners() {
    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      if (this.engine) {
        this.engine.resize(window.innerWidth, window.innerHeight);
      }
    });

    // 滚动事件
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.updateScrollState();
      }, 16); // 约60FPS的频率更新滚动状态
    });

    // 鼠标移动事件（用于动态演示）
    this.canvas.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });

    // 点击事件（添加/移除连接线）
    this.canvas.addEventListener('click', (e) => {
      this.handleClick(e);
    });
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  }

  createMockElements() {
    // 创建模拟的聊天气泡
    for (let i = 0; i < 5; i++) {
      const bubble = {
        id: `bubble_${i}`,
        x: 100 + Math.random() * 300,
        y: 100 + i * 120,
        width: 200 + Math.random() * 100,
        height: 60 + Math.random() * 40,
        isSelf: Math.random() > 0.5
      };
      
      this.bubbles.set(bubble.id, bubble);
      
      // 创建对应的DOM元素用于可视化
      this.createBubbleElement(bubble);
    }

    // 创建模拟的头像
    for (let i = 0; i < 5; i++) {
      const avatar = {
        id: `avatar_${i}`,
        x: 50 + Math.random() * 50,
        y: 100 + i * 120,
        width: 40,
        height: 40
      };
      
      this.avatars.set(avatar.id, avatar);
      
      // 创建对应的DOM元素用于可视化
      this.createAvatarElement(avatar);
    }

    // 创建初始连接线
    this.createInitialConnections();
  }

  createBubbleElement(bubble) {
    const element = document.createElement('div');
    element.id = bubble.id;
    element.style.position = 'absolute';
    element.style.left = bubble.x + 'px';
    element.style.top = bubble.y + 'px';
    element.style.width = bubble.width + 'px';
    element.style.height = bubble.height + 'px';
    element.style.backgroundColor = bubble.isSelf ? '#007AFF' : '#E5E5EA';
    element.style.borderRadius = '18px';
    element.style.padding = '10px';
    element.style.color = bubble.isSelf ? 'white' : 'black';
    element.style.fontSize = '14px';
    element.style.cursor = 'pointer';
    element.textContent = `消息 ${bubble.id}`;
    
    // 添加拖拽功能
    this.makeDraggable(element, bubble, 'bubble');
    
    this.container.appendChild(element);
  }

  createAvatarElement(avatar) {
    const element = document.createElement('div');
    element.id = avatar.id;
    element.style.position = 'absolute';
    element.style.left = avatar.x + 'px';
    element.style.top = avatar.y + 'px';
    element.style.width = avatar.width + 'px';
    element.style.height = avatar.height + 'px';
    element.style.backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    element.style.borderRadius = '50%';
    element.style.cursor = 'pointer';
    element.textContent = 'A';
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
    element.style.color = 'white';
    element.style.fontWeight = 'bold';
    
    // 添加拖拽功能
    this.makeDraggable(element, avatar, 'avatar');
    
    this.container.appendChild(element);
  }

  makeDraggable(element, dataObject, type) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffset.x = e.clientX - dataObject.x;
      dragOffset.y = e.clientY - dataObject.y;
      element.style.zIndex = '9999';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      dataObject.x = Math.max(0, Math.min(window.innerWidth - dataObject.width, newX));
      dataObject.y = Math.max(0, Math.min(window.innerHeight - dataObject.height, newY));
      
      element.style.left = dataObject.x + 'px';
      element.style.top = dataObject.y + 'px';
      
      // 更新连接线
      this.updateConnectionsForElement(dataObject.id, type);
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.zIndex = 'auto';
      }
    });
  }

  createInitialConnections() {
    // 为每个气泡创建到对应头像的连接线
    let connectionIndex = 0;
    for (const [bubbleId, bubble] of this.bubbles) {
      const avatarId = `avatar_${connectionIndex}`;
      const avatar = this.avatars.get(avatarId);
      
      if (avatar) {
        const connectionId = `connection_${connectionIndex}`;
        this.engine.addConnection(connectionId, bubble, avatar, {
          isSelf: bubble.isSelf,
          style: {
            color: bubble.isSelf ? 0x007AFF : 0x8E8E93,
            width: 2,
            opacity: 0.8
          }
        });
        
        this.connections.set(connectionId, {
          bubbleId,
          avatarId,
          bubble,
          avatar
        });
      }
      
      connectionIndex++;
    }
  }

  updateConnectionsForElement(elementId, type) {
    // 找到相关的连接并更新
    for (const [connectionId, connection] of this.connections) {
      if ((type === 'bubble' && connection.bubbleId === elementId) ||
          (type === 'avatar' && connection.avatarId === elementId)) {
        
        // 更新数据对象引用
        if (type === 'bubble') {
          connection.bubble = this.bubbles.get(elementId);
        } else {
          connection.avatar = this.avatars.get(elementId);
        }
        
        // 更新引擎中的连接
        this.engine.updateConnection(connectionId, connection.bubble, connection.avatar);
      }
    }
  }

  updateScrollState() {
    if (!this.engine) return;
    
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // 假设气泡和头像在不同的容器中，可能有不同的滚动状态
    this.engine.updateScrollState(
      { x: scrollX, y: scrollY }, // 气泡容器滚动
      { x: scrollX, y: scrollY }  // 头像容器滚动
    );
  }

  handleMouseMove(e) {
    // 可以在这里添加一些交互效果
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 例如：高亮最近的连接线
    // this.highlightNearestConnection(x, y);
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 演示：在点击位置添加新的连接线
    this.addConnectionAtPosition(x, y);
  }

  addConnectionAtPosition(x, y) {
    const connectionId = `dynamic_${Date.now()}`;
    
    // 创建临时气泡和头像
    const bubble = {
      x: x - 50,
      y: y - 15,
      width: 100,
      height: 30
    };
    
    const avatar = {
      x: x + 100,
      y: y - 20,
      width: 40,
      height: 40
    };
    
    this.engine.addConnection(connectionId, bubble, avatar, {
      style: {
        color: 0xFF6B6B,
        width: 3,
        opacity: 1.0
      }
    });
    
    // 5秒后移除
    setTimeout(() => {
      this.engine.removeConnection(connectionId);
    }, 5000);
  }

  // 演示分支连接功能
  createBranchConnectionExample() {
    const mainConnection = this.connections.values().next().value;
    if (!mainConnection) return;

    // 创建弹出层元素
    const popupElements = [];
    for (let i = 0; i < 3; i++) {
      popupElements.push({
        x: mainConnection.bubble.x + 50 + i * 30,
        y: mainConnection.bubble.y - 50 - i * 20,
        width: 80,
        height: 30
      });
    }

    this.engine.createBranchConnections(
      'example_branches',
      mainConnection,
      popupElements,
      {
        branchColor: 0x9B59B6,
        branchWidth: 1.5,
        animationDuration: 500
      }
    );

    // 10秒后移除分支连接
    setTimeout(() => {
      this.engine.removeBranchConnections('example_branches');
    }, 10000);
  }

  start() {
    if (this.isRunning || !this.engine) return;
    
    this.isRunning = true;
    this.engine.start();
    
    // 启动动画循环
    const animate = () => {
      if (!this.isRunning) return;
      
      this.engine.render();
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // 演示分支连接（3秒后）
    setTimeout(() => {
      this.createBranchConnectionExample();
    }, 3000);
    
    console.log('BasicUsageExample started');
  }

  stop() {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.engine) {
      this.engine.stop();
    }
    
    console.log('BasicUsageExample stopped');
  }

  // 获取性能统计信息
  getStats() {
    return this.engine ? this.engine.getStats() : null;
  }

  // 显示调试信息
  showDebugInfo() {
    if (!this.engine) return;
    
    const stats = this.getStats();
    console.table({
      'Connections': stats.scene.activeConnections,
      'Visible Connections': stats.scene.visibleConnections,
      'Frame Time (ms)': stats.engine.frameTime.toFixed(2),
      'FPS': stats.performance?.fps?.toFixed(1) || 'N/A',
      'Memory Usage (MB)': (stats.performance?.memoryUsage / (1024 * 1024)).toFixed(2) || 'N/A'
    });
    
    return stats;
  }

  dispose() {
    this.stop();
    
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    
    // 清理DOM元素
    const elements = this.container.querySelectorAll('[id^="bubble_"], [id^="avatar_"]');
    elements.forEach(el => el.remove());
    
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    
    // 清理事件监听器
    window.removeEventListener('resize', this.resizeCanvas);
    
    console.log('BasicUsageExample disposed');
  }
}

// 便捷初始化函数
export function createBasicExample(containerId) {
  return new BasicUsageExample(containerId);
}

// 使用示例
// const example = createBasicExample('app-container');
// 
// // 显示性能统计
// setInterval(() => {
//   example.showDebugInfo();
// }, 5000);