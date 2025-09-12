/**
 * Canvas渲染器 - 适用于中等数量连接线（50-500条）
 * 优势：高性能绘制、像素级控制、动画支持
 */
class CanvasRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.mode = 'canvas';
    this.options = {
      strokeWidth: 2,
      strokeColor: '#333',
      antialias: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...options
    };

    this.canvas = null;
    this.ctx = null;
    this.connections = new Map();
    this.dirtyConnections = new Set();
    this.animationId = null;
    this.lastRenderTime = 0;
    
    this.init();
  }

  init() {
    this.createCanvas();
    this.setupContext();
    this.bindEvents();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1';
    
    this.container.appendChild(this.canvas);
    this.resize();
  }

  setupContext() {
    this.ctx = this.canvas.getContext('2d');
    
    // 高DPI支持
    const ratio = this.options.pixelRatio;
    if (ratio > 1) {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * ratio;
      this.canvas.height = rect.height * ratio;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.scale(ratio, ratio);
    }

    // 抗锯齿设置
    if (this.options.antialias) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }

    // 默认样式
    this.ctx.lineWidth = this.options.strokeWidth;
    this.ctx.strokeStyle = this.options.strokeColor;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  bindEvents() {
    // 窗口大小变化监听
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * 批量渲染连接线
   */
  batchRender(connections) {
    performance.mark('canvas-render-start');
    
    // 更新连接线数据
    this.updateConnections(connections);
    
    // 增量渲染：只重绘变化的部分
    if (this.dirtyConnections.size > 0 || connections.length !== this.connections.size) {
      this.render();
    }

    performance.mark('canvas-render-end');
    performance.measure('render-canvas', 'canvas-render-start', 'canvas-render-end');
  }

  updateConnections(connections) {
    const newConnections = new Map();
    
    connections.forEach(connection => {
      const existing = this.connections.get(connection.id);
      
      // 检查是否有变化
      if (!existing || this.hasConnectionChanged(connection, existing)) {
        this.dirtyConnections.add(connection.id);
      }
      
      newConnections.set(connection.id, { ...connection });
    });

    // 标记删除的连接为脏
    this.connections.forEach((_, id) => {
      if (!newConnections.has(id)) {
        this.dirtyConnections.add(id);
      }
    });

    this.connections = newConnections;
  }

  hasConnectionChanged(newConn, oldConn) {
    return (
      newConn.start.x !== oldConn.start.x ||
      newConn.start.y !== oldConn.start.y ||
      newConn.end.x !== oldConn.end.x ||
      newConn.end.y !== oldConn.end.y ||
      newConn.color !== oldConn.color ||
      newConn.strokeWidth !== oldConn.strokeWidth ||
      newConn.highlighted !== oldConn.highlighted ||
      newConn.animated !== oldConn.animated
    );
  }

  render() {
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 批量绘制所有连接线
    this.connections.forEach(connection => {
      this.drawConnection(connection);
    });

    this.dirtyConnections.clear();
    this.lastRenderTime = performance.now();
  }

  drawConnection(connection) {
    this.ctx.save();
    
    // 设置连接线样式
    this.applyConnectionStyle(connection);
    
    // 绘制路径
    this.ctx.beginPath();
    this.generatePath(connection);
    this.ctx.stroke();
    
    // 动画效果
    if (connection.animated) {
      this.drawAnimatedConnection(connection);
    }
    
    // 高亮效果
    if (connection.highlighted) {
      this.drawHighlightConnection(connection);
    }
    
    this.ctx.restore();
  }

  applyConnectionStyle(connection) {
    this.ctx.strokeStyle = connection.color || this.options.strokeColor;
    this.ctx.lineWidth = connection.strokeWidth || this.options.strokeWidth;
    
    if (connection.dashArray) {
      this.ctx.setLineDash(connection.dashArray);
    } else {
      this.ctx.setLineDash([]);
    }
  }

  generatePath(connection) {
    switch (connection.type || 'bezier') {
      case 'straight':
        this.drawStraightPath(connection);
        break;
      case 'bezier':
        this.drawBezierPath(connection);
        break;
      case 'stepped':
        this.drawSteppedPath(connection);
        break;
      case 'arc':
        this.drawArcPath(connection);
        break;
      default:
        this.drawBezierPath(connection);
    }
  }

  drawStraightPath(connection) {
    this.ctx.moveTo(connection.start.x, connection.start.y);
    this.ctx.lineTo(connection.end.x, connection.end.y);
  }

  drawBezierPath(connection) {
    const { start, end } = connection;
    const dx = end.x - start.x;
    
    const cp1x = start.x + dx * 0.3;
    const cp1y = start.y;
    const cp2x = end.x - dx * 0.3;
    const cp2y = end.y;

    this.ctx.moveTo(start.x, start.y);
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
  }

  drawSteppedPath(connection) {
    const { start, end } = connection;
    const midX = start.x + (end.x - start.x) / 2;
    
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(midX, start.y);
    this.ctx.lineTo(midX, end.y);
    this.ctx.lineTo(end.x, end.y);
  }

  drawArcPath(connection) {
    const { start, end } = connection;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2;
    
    const startAngle = Math.atan2(start.y - midY, start.x - midX);
    const endAngle = Math.atan2(end.y - midY, end.x - midX);
    
    this.ctx.arc(midX, midY, radius, startAngle, endAngle);
  }

  drawAnimatedConnection(connection) {
    const dashOffset = (Date.now() / 100) % 20;
    this.ctx.save();
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineDashOffset = -dashOffset;
    this.ctx.globalAlpha = 0.6;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawHighlightConnection(connection) {
    this.ctx.save();
    this.ctx.strokeStyle = '#007bff';
    this.ctx.lineWidth = (connection.strokeWidth || this.options.strokeWidth) + 2;
    this.ctx.globalAlpha = 0.8;
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * 高亮连接线
   */
  highlightConnection(connectionId, highlight = true) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.highlighted = highlight;
      this.dirtyConnections.add(connectionId);
      this.render();
    }
  }

  /**
   * 点击测试 - 检测点击位置的连接线
   */
  hitTest(x, y, tolerance = 5) {
    const hits = [];
    
    this.connections.forEach((connection, id) => {
      if (this.isPointNearConnection(x, y, connection, tolerance)) {
        hits.push({
          connectionId: id,
          connection: connection,
          distance: this.getDistanceToConnection(x, y, connection)
        });
      }
    });

    return hits.sort((a, b) => a.distance - b.distance);
  }

  isPointNearConnection(x, y, connection, tolerance) {
    // 简化的线段距离检测
    const { start, end } = connection;
    const distance = this.getPointToLineDistance(x, y, start.x, start.y, end.x, end.y);
    return distance <= tolerance;
  }

  getPointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  getDistanceToConnection(x, y, connection) {
    return this.getPointToLineDistance(x, y, 
      connection.start.x, connection.start.y, 
      connection.end.x, connection.end.y);
  }

  /**
   * 清除所有连接线
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.connections.clear();
    this.dirtyConnections.clear();
  }

  /**
   * 调整画布大小
   */
  resize() {
    const rect = this.container.getBoundingClientRect();
    const ratio = this.options.pixelRatio;
    
    this.canvas.width = rect.width * ratio;
    this.canvas.height = rect.height * ratio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.setupContext();
    this.render(); // 重新渲染
  }

  /**
   * 导出为图片
   */
  exportAsImage(format = 'png', quality = 1.0) {
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * 获取渲染统计信息
   */
  getStats() {
    return {
      mode: this.mode,
      connectionCount: this.connections.size,
      dirtyCount: this.dirtyConnections.size,
      canvasSize: {
        width: this.canvas.width,
        height: this.canvas.height
      },
      lastRenderTime: this.lastRenderTime,
      pixelRatio: this.options.pixelRatio
    };
  }

  destroy() {
    this.clear();
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.resizeHandler);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.connections.clear();
    this.dirtyConnections.clear();
  }
}

export default CanvasRenderer;