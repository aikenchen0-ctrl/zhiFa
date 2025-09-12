/**
 * SVG渲染器 - 适用于少量连接线（<50条）
 * 优势：矢量图形、CSS样式、DOM集成
 */
class SVGRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.mode = 'svg';
    this.options = {
      strokeWidth: 2,
      strokeColor: '#333',
      animation: true,
      ...options
    };

    this.svg = null;
    this.connectionElements = new Map();
    this.pathCache = new Map();
    
    this.init();
  }

  init() {
    this.createSVGElement();
    this.setupStyles();
  }

  createSVGElement() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.pointerEvents = 'none';
    this.svg.style.zIndex = '1';
    
    this.container.appendChild(this.svg);
  }

  setupStyles() {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .connection-line {
        stroke-width: ${this.options.strokeWidth}px;
        stroke: ${this.options.strokeColor};
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      
      .connection-line.animated {
        stroke-dasharray: 5,5;
        animation: dash 1s linear infinite;
      }
      
      .connection-line.hover {
        stroke-width: ${this.options.strokeWidth + 1}px;
        stroke: #007bff;
      }
      
      @keyframes dash {
        to { stroke-dashoffset: -10; }
      }
    `;
    
    this.svg.appendChild(style);
  }

  /**
   * 批量渲染连接线
   */
  batchRender(connections) {
    performance.mark('svg-render-start');
    
    const fragment = document.createDocumentFragment();
    const updatedConnections = new Set();

    connections.forEach(connection => {
      const path = this.renderConnection(connection, fragment);
      if (path) {
        updatedConnections.add(connection.id);
      }
    });

    // 移除不再需要的连接线
    this.cleanupRemovedConnections(updatedConnections);
    
    // 批量添加到DOM
    if (fragment.hasChildNodes()) {
      this.svg.appendChild(fragment);
    }

    performance.mark('svg-render-end');
    performance.measure('render-svg', 'svg-render-start', 'svg-render-end');
  }

  renderConnection(connection, fragment) {
    const existingPath = this.connectionElements.get(connection.id);
    
    // 检查是否需要更新
    if (existingPath && !this.needsUpdate(connection, existingPath)) {
      return existingPath;
    }

    const pathData = this.generatePathData(connection);
    
    if (existingPath) {
      // 更新现有路径
      existingPath.setAttribute('d', pathData);
      this.updateConnectionStyle(existingPath, connection);
    } else {
      // 创建新路径
      const path = this.createPath(connection, pathData);
      fragment.appendChild(path);
      this.connectionElements.set(connection.id, path);
    }

    return this.connectionElements.get(connection.id);
  }

  createPath(connection, pathData) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'connection-line');
    path.setAttribute('data-connection-id', connection.id);
    
    this.updateConnectionStyle(path, connection);
    
    return path;
  }

  updateConnectionStyle(path, connection) {
    if (connection.animated) {
      path.classList.add('animated');
    } else {
      path.classList.remove('animated');
    }

    if (connection.highlighted) {
      path.classList.add('hover');
    } else {
      path.classList.remove('hover');
    }

    if (connection.strokeWidth) {
      path.style.strokeWidth = connection.strokeWidth + 'px';
    }

    if (connection.color) {
      path.style.stroke = connection.color;
    }
  }

  /**
   * 生成SVG路径数据
   */
  generatePathData(connection) {
    const cacheKey = this.getPathCacheKey(connection);
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey);
    }

    let pathData;
    
    switch (connection.type || 'bezier') {
      case 'straight':
        pathData = this.generateStraightPath(connection);
        break;
      case 'bezier':
        pathData = this.generateBezierPath(connection);
        break;
      case 'stepped':
        pathData = this.generateSteppedPath(connection);
        break;
      default:
        pathData = this.generateBezierPath(connection);
    }

    this.pathCache.set(cacheKey, pathData);
    return pathData;
  }

  generateStraightPath(connection) {
    return `M ${connection.start.x} ${connection.start.y} L ${connection.end.x} ${connection.end.y}`;
  }

  generateBezierPath(connection) {
    const { start, end } = connection;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // 控制点计算
    const cp1x = start.x + dx * 0.3;
    const cp1y = start.y;
    const cp2x = end.x - dx * 0.3;
    const cp2y = end.y;

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  generateSteppedPath(connection) {
    const { start, end } = connection;
    const midX = start.x + (end.x - start.x) / 2;
    
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  getPathCacheKey(connection) {
    return `${connection.start.x},${connection.start.y}-${connection.end.x},${connection.end.y}-${connection.type || 'bezier'}`;
  }

  needsUpdate(connection, path) {
    const currentPathData = path.getAttribute('d');
    const newPathData = this.generatePathData(connection);
    return currentPathData !== newPathData;
  }

  cleanupRemovedConnections(activeConnections) {
    const toRemove = [];
    
    this.connectionElements.forEach((element, id) => {
      if (!activeConnections.has(id)) {
        element.remove();
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => {
      this.connectionElements.delete(id);
    });
  }

  /**
   * 高亮连接线
   */
  highlightConnection(connectionId, highlight = true) {
    const path = this.connectionElements.get(connectionId);
    if (path) {
      if (highlight) {
        path.classList.add('hover');
      } else {
        path.classList.remove('hover');
      }
    }
  }

  /**
   * 获取连接线元素用于碰撞检测
   */
  getConnectionElement(connectionId) {
    return this.connectionElements.get(connectionId);
  }

  /**
   * 清除所有连接线
   */
  clear() {
    this.svg.innerHTML = '';
    this.connectionElements.clear();
    this.pathCache.clear();
    this.setupStyles(); // 重新添加样式
  }

  /**
   * 调整视图大小
   */
  resize() {
    // SVG会自动适应容器大小，这里可以添加额外的逻辑
    const rect = this.container.getBoundingClientRect();
    this.svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  }

  /**
   * 获取渲染统计信息
   */
  getStats() {
    return {
      mode: this.mode,
      connectionCount: this.connectionElements.size,
      cacheSize: this.pathCache.size,
      domElements: this.svg.children.length
    };
  }

  destroy() {
    this.clear();
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.connectionElements.clear();
    this.pathCache.clear();
  }
}

export default SVGRenderer;