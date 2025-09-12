/**
 * Three.js场景管理器
 * 负责场景组织、层级管理和渲染协调
 */
import * as THREE from 'three';
import { ConnectionLineRenderer } from '../renderers/ConnectionLineRenderer.js';
import { PathCalculator } from '../core/PathCalculator.js';

export class SceneManager {
  constructor(webglRenderer, options = {}) {
    this.webglRenderer = webglRenderer;
    this.options = {
      enableLayering: true,
      maxLayers: 10,
      autoOptimize: true,
      frustumCulling: true,
      ...options
    };

    // 场景层级
    this.layers = new Map();
    this.activeConnections = new Map();
    
    // 核心组件
    this.pathCalculator = new PathCalculator();
    this.connectionRenderer = new ConnectionLineRenderer(webglRenderer);
    
    // 视窗和相机
    this.viewport = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    this.camera = new THREE.OrthographicCamera();
    
    // 渲染状态
    this.needsRender = true;
    this.renderRequested = false;
    this.lastRenderTime = 0;
    this.frameRate = 60;
    this.minFrameInterval = 1000 / this.frameRate;
    
    // 滚动状态跟踪
    this.scrollState = {
      bubbleContainer: { x: 0, y: 0 },
      avatarContainer: { x: 0, y: 0 },
      lastUpdate: 0
    };

    // 性能监控
    this.stats = {
      frameCount: 0,
      renderTime: 0,
      updateTime: 0,
      visibleConnections: 0
    };

    this.init();
  }

  init() {
    this.setupCamera();
    this.setupLayers();
    this.bindEvents();
    this.startRenderLoop();
  }

  setupCamera() {
    this.updateCameraProjection();
  }

  setupLayers() {
    // 创建基础渲染层
    const layerConfigs = [
      { name: 'background', zIndex: 0, visible: true },
      { name: 'connections', zIndex: 1, visible: true },
      { name: 'ui', zIndex: 2, visible: true },
      { name: 'overlay', zIndex: 3, visible: true }
    ];

    for (const config of layerConfigs) {
      this.createLayer(config.name, config.zIndex, config.visible);
    }
  }

  createLayer(name, zIndex = 0, visible = true) {
    const layer = {
      scene: new THREE.Scene(),
      camera: new THREE.OrthographicCamera(),
      zIndex,
      visible,
      objects: new Set(),
      needsUpdate: false
    };

    layer.camera.copy(this.camera);
    this.layers.set(name, layer);
    return layer;
  }

  bindEvents() {
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // 监听滚动事件
    document.addEventListener('scroll', this.handleScroll.bind(this));
  }

  /**
   * 添加连接线
   * @param {string} id - 连接线唯一标识
   * @param {Object} bubble - 气泡元素信息
   * @param {Object} avatar - 头像元素信息
   * @param {boolean} isSelf - 是否为自己发送的消息
   * @param {Object} style - 样式配置
   */
  addConnection(id, bubble, avatar, isSelf = false, style = {}) {
    try {
      // 计算连接路径
      const path = this.pathCalculator.calculateConnectionPath(bubble, avatar, isSelf);
      
      if (path.length < 2) {
        console.warn(`Invalid path calculated for connection ${id}`);
        return;
      }

      // 存储连接信息
      const connection = {
        id,
        bubble: { ...bubble },
        avatar: { ...avatar },
        isSelf,
        style: { ...style },
        path,
        lastUpdate: Date.now(),
        visible: true
      };

      this.activeConnections.set(id, connection);
      
      // 更新渲染器
      this.connectionRenderer.updateLine(id, path, style);
      
      this.markNeedsRender();
    } catch (error) {
      console.error(`Failed to add connection ${id}:`, error);
    }
  }

  /**
   * 更新连接线
   * @param {string} id - 连接线标识
   * @param {Object} bubble - 更新的气泡信息
   * @param {Object} avatar - 更新的头像信息
   */
  updateConnection(id, bubble, avatar) {
    const connection = this.activeConnections.get(id);
    if (!connection) {
      console.warn(`Connection ${id} not found for update`);
      return;
    }

    try {
      // 检查是否需要更新
      if (this.isConnectionDataChanged(connection, bubble, avatar)) {
        connection.bubble = { ...bubble };
        connection.avatar = { ...avatar };
        connection.lastUpdate = Date.now();

        // 重新计算路径
        const path = this.pathCalculator.calculateConnectionPath(
          bubble, 
          avatar, 
          connection.isSelf
        );

        if (path.length >= 2) {
          connection.path = path;
          this.connectionRenderer.updateLine(id, path, connection.style);
          this.markNeedsRender();
        }
      }
    } catch (error) {
      console.error(`Failed to update connection ${id}:`, error);
    }
  }

  /**
   * 批量更新连接线
   * @param {Array} updates - 更新数组，格式：[{id, bubble, avatar}, ...]
   */
  batchUpdateConnections(updates) {
    const renderUpdates = [];
    
    for (const update of updates) {
      const connection = this.activeConnections.get(update.id);
      if (!connection) continue;

      if (this.isConnectionDataChanged(connection, update.bubble, update.avatar)) {
        connection.bubble = { ...update.bubble };
        connection.avatar = { ...update.avatar };
        connection.lastUpdate = Date.now();

        const path = this.pathCalculator.calculateConnectionPath(
          update.bubble, 
          update.avatar, 
          connection.isSelf
        );

        if (path.length >= 2) {
          connection.path = path;
          renderUpdates.push({
            id: update.id,
            path,
            style: connection.style
          });
        }
      }
    }

    if (renderUpdates.length > 0) {
      this.connectionRenderer.batchUpdateLines(renderUpdates);
      this.markNeedsRender();
    }
  }

  /**
   * 移除连接线
   * @param {string} id - 连接线标识
   */
  removeConnection(id) {
    if (this.activeConnections.has(id)) {
      this.activeConnections.delete(id);
      this.connectionRenderer.removeLine(id);
      this.markNeedsRender();
    }
  }

  /**
   * 设置连接线可见性
   * @param {string} id - 连接线标识
   * @param {boolean} visible - 是否可见
   */
  setConnectionVisibility(id, visible) {
    const connection = this.activeConnections.get(id);
    if (connection && connection.visible !== visible) {
      connection.visible = visible;
      this.connectionRenderer.setLineVisibility(id, visible);
      this.markNeedsRender();
    }
  }

  /**
   * 更新滚动状态
   * @param {Object} bubbleScroll - 气泡容器滚动位置 {x, y}
   * @param {Object} avatarScroll - 头像容器滚动位置 {x, y}
   */
  updateScrollState(bubbleScroll, avatarScroll) {
    const now = Date.now();
    
    // 检查滚动状态是否改变
    if (this.hasScrollStateChanged(bubbleScroll, avatarScroll)) {
      this.scrollState.bubbleContainer = { ...bubbleScroll };
      this.scrollState.avatarContainer = { ...avatarScroll };
      this.scrollState.lastUpdate = now;

      // 更新所有连接线的位置
      this.updateConnectionsForScroll();
    }
  }

  hasScrollStateChanged(bubbleScroll, avatarScroll) {
    const threshold = 1; // 1像素阈值，避免微小变化
    
    return Math.abs(this.scrollState.bubbleContainer.x - bubbleScroll.x) > threshold ||
           Math.abs(this.scrollState.bubbleContainer.y - bubbleScroll.y) > threshold ||
           Math.abs(this.scrollState.avatarContainer.x - avatarScroll.x) > threshold ||
           Math.abs(this.scrollState.avatarContainer.y - avatarScroll.y) > threshold;
  }

  updateConnectionsForScroll() {
    const updates = [];
    
    for (const [id, connection] of this.activeConnections) {
      // 应用滚动偏移到元素位置
      const adjustedBubble = {
        ...connection.bubble,
        x: connection.bubble.x - this.scrollState.bubbleContainer.x,
        y: connection.bubble.y - this.scrollState.bubbleContainer.y
      };

      const adjustedAvatar = {
        ...connection.avatar,
        x: connection.avatar.x - this.scrollState.avatarContainer.x,
        y: connection.avatar.y - this.scrollState.avatarContainer.y
      };

      // 重新计算路径
      const path = this.pathCalculator.calculateConnectionPath(
        adjustedBubble, 
        adjustedAvatar, 
        connection.isSelf
      );

      if (path.length >= 2) {
        connection.path = path;
        updates.push({ id, path, style: connection.style });
      }
    }

    if (updates.length > 0) {
      this.connectionRenderer.batchUpdateLines(updates);
      this.markNeedsRender();
    }
  }

  /**
   * 更新视窗
   * @param {Object} viewport - 新的视窗信息 {x, y, width, height}
   */
  updateViewport(viewport) {
    this.viewport = { ...viewport };
    this.updateCameraProjection();
    this.connectionRenderer.updateViewport(viewport);
    
    // 执行视窗裁剪
    this.performFrustumCulling();
    this.markNeedsRender();
  }

  updateCameraProjection() {
    this.camera.left = this.viewport.x;
    this.camera.right = this.viewport.x + this.viewport.width;
    this.camera.top = this.viewport.y;
    this.camera.bottom = this.viewport.y + this.viewport.height;
    this.camera.near = -1000;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();

    // 更新所有层的相机
    for (const layer of this.layers.values()) {
      layer.camera.copy(this.camera);
    }
  }

  performFrustumCulling() {
    if (!this.options.frustumCulling) return;

    let visibleCount = 0;
    
    for (const [id, connection] of this.activeConnections) {
      const bounds = this.pathCalculator.calculateBounds(connection.path);
      const isVisible = this.isInViewport(bounds);
      
      if (connection.visible !== isVisible) {
        this.setConnectionVisibility(id, isVisible);
      }
      
      if (isVisible) visibleCount++;
    }

    this.stats.visibleConnections = visibleCount;
  }

  isInViewport(bounds) {
    return !(
      bounds.maxX < this.viewport.x ||
      bounds.minX > this.viewport.x + this.viewport.width ||
      bounds.maxY < this.viewport.y ||
      bounds.minY > this.viewport.y + this.viewport.height
    );
  }

  /**
   * 渲染场景
   */
  render() {
    if (!this.webglRenderer.isInitialized) return;

    const startTime = performance.now();

    try {
      this.webglRenderer.clear();
      
      // 按层级顺序渲染
      const sortedLayers = Array.from(this.layers.entries())
        .sort(([, a], [, b]) => a.zIndex - b.zIndex);

      for (const [name, layer] of sortedLayers) {
        if (!layer.visible) continue;
        
        if (name === 'connections') {
          this.connectionRenderer.render(this.viewport);
        } else {
          this.webglRenderer.render(layer.scene, layer.camera);
        }
      }

      this.stats.frameCount++;
      this.stats.renderTime = performance.now() - startTime;
      this.needsRender = false;
    } catch (error) {
      console.error('Render error:', error);
    }
  }

  /**
   * 开始渲染循环
   */
  startRenderLoop() {
    const renderLoop = (currentTime) => {
      if (currentTime - this.lastRenderTime >= this.minFrameInterval) {
        if (this.needsRender) {
          this.render();
          this.lastRenderTime = currentTime;
        }
      }
      
      this.renderRequested = requestAnimationFrame(renderLoop);
    };

    this.renderRequested = requestAnimationFrame(renderLoop);
  }

  /**
   * 停止渲染循环
   */
  stopRenderLoop() {
    if (this.renderRequested) {
      cancelAnimationFrame(this.renderRequested);
      this.renderRequested = null;
    }
  }

  markNeedsRender() {
    this.needsRender = true;
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.viewport.width = width;
    this.viewport.height = height;
    
    this.webglRenderer.setSize(width, height);
    this.connectionRenderer.resize(width, height);
    this.updateCameraProjection();
    this.markNeedsRender();
  }

  /**
   * 处理滚动事件
   */
  handleScroll() {
    // 这里可以添加默认的滚动处理逻辑
    // 实际应用中应该由外部调用 updateScrollState 方法
  }

  /**
   * 检查连接数据是否改变
   * @param {Object} connection - 当前连接
   * @param {Object} newBubble - 新的气泡数据
   * @param {Object} newAvatar - 新的头像数据
   * @returns {boolean} 是否改变
   */
  isConnectionDataChanged(connection, newBubble, newAvatar) {
    const threshold = 1;
    
    return Math.abs(connection.bubble.x - newBubble.x) > threshold ||
           Math.abs(connection.bubble.y - newBubble.y) > threshold ||
           Math.abs(connection.bubble.width - newBubble.width) > threshold ||
           Math.abs(connection.bubble.height - newBubble.height) > threshold ||
           Math.abs(connection.avatar.x - newAvatar.x) > threshold ||
           Math.abs(connection.avatar.y - newAvatar.y) > threshold ||
           Math.abs(connection.avatar.width - newAvatar.width) > threshold ||
           Math.abs(connection.avatar.height - newAvatar.height) > threshold;
  }

  /**
   * 清除所有连接
   */
  clearConnections() {
    this.activeConnections.clear();
    this.connectionRenderer.clear();
    this.markNeedsRender();
  }

  /**
   * 获取渲染统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      ...this.connectionRenderer.getRenderStats(),
      activeConnections: this.activeConnections.size,
      layers: this.layers.size,
      viewport: { ...this.viewport }
    };
  }

  /**
   * 设置帧率限制
   * @param {number} fps - 目标帧率
   */
  setFrameRate(fps) {
    this.frameRate = Math.max(1, Math.min(144, fps));
    this.minFrameInterval = 1000 / this.frameRate;
  }

  /**
   * 销毁场景管理器
   */
  dispose() {
    this.stopRenderLoop();
    
    // 清理连接
    this.clearConnections();
    
    // 销毁渲染器
    this.connectionRenderer.dispose();
    
    // 清理层级
    for (const layer of this.layers.values()) {
      // Three.js场景清理
      layer.scene.clear();
    }
    this.layers.clear();
    
    // 移除事件监听
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}