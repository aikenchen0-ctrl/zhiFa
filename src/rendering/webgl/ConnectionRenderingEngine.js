/**
 * 连接线渲染引擎主入口
 * 整合所有子系统，提供统一的API接口
 */
import { WebGLRenderer } from './core/WebGLRenderer.js';
import { PathCalculator } from './core/PathCalculator.js';
import { SceneManager } from './managers/SceneManager.js';
import { CollisionDetector } from './systems/CollisionDetector.js';
import { BranchConnectionSystem } from './systems/BranchConnectionSystem.js';
import { OcclusionManager } from './systems/OcclusionManager.js';
import { PerformanceOptimizer } from './systems/PerformanceOptimizer.js';

export class ConnectionRenderingEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      enablePerformanceOptimization: true,
      enableCollisionDetection: true,
      enableBranchConnections: true,
      enableOcclusion: true,
      debug: false,
      ...options
    };

    // 核心组件
    this.webglRenderer = null;
    this.sceneManager = null;
    this.pathCalculator = null;
    this.collisionDetector = null;
    this.branchSystem = null;
    this.occlusionManager = null;
    this.performanceOptimizer = null;

    // 渲染状态
    this.isInitialized = false;
    this.isRunning = false;
    this.lastRenderTime = 0;
    
    // 事件系统
    this.eventListeners = new Map();
    
    // 调试信息
    this.debugInfo = {
      renderCalls: 0,
      frameTime: 0,
      connectionCount: 0,
      visibleConnections: 0
    };

    this.init();
  }

  async init() {
    try {
      console.log('Initializing ConnectionRenderingEngine...');
      
      // 初始化核心渲染器
      this.webglRenderer = new WebGLRenderer(this.canvas, {
        ...this.options.webgl,
        antialias: true,
        alpha: true
      });

      // 初始化路径计算器
      this.pathCalculator = new PathCalculator(this.options.pathCalculator);

      // 初始化场景管理器
      this.sceneManager = new SceneManager(this.webglRenderer, {
        ...this.options.scene,
        pathCalculator: this.pathCalculator
      });

      // 条件性初始化子系统
      if (this.options.enableCollisionDetection) {
        this.collisionDetector = new CollisionDetector(this.options.collision);
      }

      if (this.options.enableBranchConnections) {
        this.branchSystem = new BranchConnectionSystem(
          this.sceneManager, 
          this.options.branchSystem
        );
      }

      if (this.options.enableOcclusion && this.collisionDetector) {
        this.occlusionManager = new OcclusionManager(
          this.collisionDetector, 
          this.options.occlusion
        );
      }

      if (this.options.enablePerformanceOptimization) {
        this.performanceOptimizer = new PerformanceOptimizer(this.options.performance);
      }

      this.isInitialized = true;
      console.log('ConnectionRenderingEngine initialized successfully');
      
      this.emit('initialized', { engine: this });
    } catch (error) {
      console.error('Failed to initialize ConnectionRenderingEngine:', error);
      throw error;
    }
  }

  /**
   * 添加连接线
   * @param {string} id - 连接线唯一标识
   * @param {Object} bubble - 气泡元素信息 {x, y, width, height}
   * @param {Object} avatar - 头像元素信息 {x, y, width, height}
   * @param {Object} options - 连接选项
   * @returns {Promise<boolean>} 是否成功添加
   */
  async addConnection(id, bubble, avatar, options = {}) {
    if (!this.isInitialized) {
      console.warn('Engine not initialized');
      return false;
    }

    try {
      const connectionOptions = {
        isSelf: false,
        style: {
          color: 0x4a90e2,
          width: 2,
          opacity: 0.8,
          ...options.style
        },
        enableCollision: this.options.enableCollisionDetection,
        enableOcclusion: this.options.enableOcclusion,
        ...options
      };

      // 注册碰撞检测元素
      if (this.collisionDetector) {
        this.collisionDetector.registerElement(`${id}_bubble`, bubble, 'bubble');
        this.collisionDetector.registerElement(`${id}_avatar`, avatar, 'avatar');
      }

      // 添加连接到场景管理器
      this.sceneManager.addConnection(
        id, 
        bubble, 
        avatar, 
        connectionOptions.isSelf, 
        connectionOptions.style
      );

      this.debugInfo.connectionCount++;
      this.emit('connectionAdded', { id, bubble, avatar, options: connectionOptions });
      
      return true;
    } catch (error) {
      console.error(`Failed to add connection ${id}:`, error);
      return false;
    }
  }

  /**
   * 更新连接线
   * @param {string} id - 连接线标识
   * @param {Object} bubble - 更新的气泡信息
   * @param {Object} avatar - 更新的头像信息
   * @returns {boolean} 是否成功更新
   */
  updateConnection(id, bubble, avatar) {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // 更新碰撞检测元素
      if (this.collisionDetector) {
        this.collisionDetector.updateElement(`${id}_bubble`, bubble);
        this.collisionDetector.updateElement(`${id}_avatar`, avatar);
      }

      // 更新场景中的连接
      this.sceneManager.updateConnection(id, bubble, avatar);
      
      this.emit('connectionUpdated', { id, bubble, avatar });
      return true;
    } catch (error) {
      console.error(`Failed to update connection ${id}:`, error);
      return false;
    }
  }

  /**
   * 批量更新连接线
   * @param {Array} updates - 更新数组 [{id, bubble, avatar}, ...]
   * @returns {number} 成功更新的数量
   */
  batchUpdateConnections(updates) {
    if (!this.isInitialized || !Array.isArray(updates)) {
      return 0;
    }

    let successCount = 0;
    const validUpdates = [];

    for (const update of updates) {
      if (update.id && update.bubble && update.avatar) {
        try {
          // 更新碰撞检测
          if (this.collisionDetector) {
            this.collisionDetector.updateElement(`${update.id}_bubble`, update.bubble);
            this.collisionDetector.updateElement(`${update.id}_avatar`, update.avatar);
          }
          
          validUpdates.push(update);
          successCount++;
        } catch (error) {
          console.warn(`Failed to prepare update for connection ${update.id}:`, error);
        }
      }
    }

    if (validUpdates.length > 0) {
      // 批量更新场景
      this.sceneManager.batchUpdateConnections(validUpdates);
      this.emit('connectionsBatchUpdated', { updates: validUpdates, count: successCount });
    }

    return successCount;
  }

  /**
   * 移除连接线
   * @param {string} id - 连接线标识
   * @returns {boolean} 是否成功移除
   */
  removeConnection(id) {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // 移除碰撞检测元素
      if (this.collisionDetector) {
        this.collisionDetector.unregisterElement(`${id}_bubble`);
        this.collisionDetector.unregisterElement(`${id}_avatar`);
      }

      // 清除遮挡状态
      if (this.occlusionManager) {
        this.occlusionManager.clearOcclusionState(id);
      }

      // 从场景移除
      this.sceneManager.removeConnection(id);
      
      this.debugInfo.connectionCount--;
      this.emit('connectionRemoved', { id });
      
      return true;
    } catch (error) {
      console.error(`Failed to remove connection ${id}:`, error);
      return false;
    }
  }

  /**
   * 创建分支连接系统
   * @param {string} id - 分支系统ID
   * @param {Object} mainConnection - 主连接线信息
   * @param {Array} popupElements - 弹出层元素数组
   * @param {Object} style - 分支样式
   * @returns {boolean} 是否成功创建
   */
  createBranchConnections(id, mainConnection, popupElements, style = {}) {
    if (!this.isInitialized || !this.branchSystem) {
      return false;
    }

    try {
      this.branchSystem.createBranchSystem(id, mainConnection, popupElements, style);
      this.emit('branchSystemCreated', { id, mainConnection, popupElements, style });
      return true;
    } catch (error) {
      console.error(`Failed to create branch system ${id}:`, error);
      return false;
    }
  }

  /**
   * 更新分支连接系统
   * @param {string} id - 分支系统ID
   * @param {Object} mainConnection - 更新的主连接
   * @param {Array} popupElements - 更新的弹出元素
   * @returns {boolean} 是否成功更新
   */
  updateBranchConnections(id, mainConnection, popupElements) {
    if (!this.isInitialized || !this.branchSystem) {
      return false;
    }

    try {
      this.branchSystem.updateBranchSystem(id, mainConnection, popupElements);
      this.emit('branchSystemUpdated', { id, mainConnection, popupElements });
      return true;
    } catch (error) {
      console.error(`Failed to update branch system ${id}:`, error);
      return false;
    }
  }

  /**
   * 移除分支连接系统
   * @param {string} id - 分支系统ID
   * @returns {boolean} 是否成功移除
   */
  removeBranchConnections(id) {
    if (!this.isInitialized || !this.branchSystem) {
      return false;
    }

    try {
      this.branchSystem.removeBranchSystem(id);
      this.emit('branchSystemRemoved', { id });
      return true;
    } catch (error) {
      console.error(`Failed to remove branch system ${id}:`, error);
      return false;
    }
  }

  /**
   * 更新滚动状态
   * @param {Object} bubbleScroll - 气泡容器滚动 {x, y}
   * @param {Object} avatarScroll - 头像容器滚动 {x, y}
   */
  updateScrollState(bubbleScroll, avatarScroll) {
    if (!this.isInitialized) return;

    try {
      this.sceneManager.updateScrollState(bubbleScroll, avatarScroll);
      this.emit('scrollUpdated', { bubbleScroll, avatarScroll });
    } catch (error) {
      console.error('Failed to update scroll state:', error);
    }
  }

  /**
   * 更新视窗
   * @param {Object} viewport - 视窗信息 {x, y, width, height}
   */
  updateViewport(viewport) {
    if (!this.isInitialized) return;

    try {
      this.sceneManager.updateViewport(viewport);
      
      if (this.branchSystem) {
        this.branchSystem.resize(viewport.width, viewport.height);
      }
      
      this.emit('viewportUpdated', { viewport });
    } catch (error) {
      console.error('Failed to update viewport:', error);
    }
  }

  /**
   * 设置连接线可见性
   * @param {string} id - 连接线ID
   * @param {boolean} visible - 是否可见
   */
  setConnectionVisibility(id, visible) {
    if (!this.isInitialized) return;

    this.sceneManager.setConnectionVisibility(id, visible);
    this.emit('visibilityChanged', { id, visible });
  }

  /**
   * 手动触发渲染
   */
  render() {
    if (!this.isInitialized || !this.isRunning) return;

    const startTime = performance.now();

    try {
      // 渲染分支系统
      if (this.branchSystem) {
        this.branchSystem.render();
      }

      // 渲染主场景
      this.sceneManager.render();
      
      this.debugInfo.renderCalls++;
      this.debugInfo.frameTime = performance.now() - startTime;
      
      this.emit('rendered', { 
        frameTime: this.debugInfo.frameTime,
        renderCalls: this.debugInfo.renderCalls
      });
    } catch (error) {
      console.error('Render error:', error);
    }
  }

  /**
   * 开始渲染循环
   */
  start() {
    if (!this.isInitialized) {
      console.warn('Engine not initialized');
      return;
    }

    this.isRunning = true;
    console.log('ConnectionRenderingEngine started');
    this.emit('started');
  }

  /**
   * 停止渲染循环
   */
  stop() {
    this.isRunning = false;
    
    if (this.sceneManager) {
      this.sceneManager.stopRenderLoop();
    }
    
    console.log('ConnectionRenderingEngine stopped');
    this.emit('stopped');
  }

  /**
   * 清除所有连接线
   */
  clearAllConnections() {
    if (!this.isInitialized) return;

    try {
      this.sceneManager.clearConnections();
      
      if (this.branchSystem) {
        this.branchSystem.clear();
      }
      
      if (this.collisionDetector) {
        // 清除所有注册的元素
        const stats = this.collisionDetector.getStats();
        console.log('Clearing collision detector with', stats.registeredElements, 'elements');
      }
      
      if (this.occlusionManager) {
        this.occlusionManager.clearAll();
      }

      this.debugInfo.connectionCount = 0;
      this.emit('allConnectionsCleared');
    } catch (error) {
      console.error('Failed to clear all connections:', error);
    }
  }

  /**
   * 调整渲染器大小
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  resize(width, height) {
    if (!this.isInitialized) return;

    try {
      this.webglRenderer.setSize(width, height);
      
      if (this.sceneManager) {
        this.sceneManager.handleResize();
      }
      
      if (this.branchSystem) {
        this.branchSystem.resize(width, height);
      }
      
      this.emit('resized', { width, height });
    } catch (error) {
      console.error('Failed to resize:', error);
    }
  }

  /**
   * 获取渲染统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    if (!this.isInitialized) {
      return { error: 'Engine not initialized' };
    }

    const stats = {
      engine: {
        isInitialized: this.isInitialized,
        isRunning: this.isRunning,
        ...this.debugInfo
      },
      scene: this.sceneManager.getStats(),
      webgl: this.webglRenderer.getCapabilities()
    };

    if (this.collisionDetector) {
      stats.collision = this.collisionDetector.getStats();
    }

    if (this.branchSystem) {
      stats.branches = this.branchSystem.getStats();
    }

    if (this.occlusionManager) {
      stats.occlusion = this.occlusionManager.getStats();
    }

    if (this.performanceOptimizer) {
      stats.performance = this.performanceOptimizer.getPerformanceStats();
    }

    return stats;
  }

  /**
   * 获取调试信息
   * @returns {Object} 调试信息
   */
  getDebugInfo() {
    return {
      ...this.debugInfo,
      options: this.options,
      capabilities: this.webglRenderer?.getCapabilities(),
      stats: this.getStats()
    };
  }

  /**
   * 事件系统
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data = {}) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }

    if (this.options.debug) {
      console.log(`[ConnectionRenderingEngine] Event: ${event}`, data);
    }
  }

  /**
   * 销毁引擎
   */
  dispose() {
    console.log('Disposing ConnectionRenderingEngine...');
    
    this.stop();

    // 销毁所有子系统
    if (this.branchSystem) {
      this.branchSystem.dispose();
      this.branchSystem = null;
    }

    if (this.occlusionManager) {
      this.occlusionManager.dispose();
      this.occlusionManager = null;
    }

    if (this.collisionDetector) {
      this.collisionDetector.dispose();
      this.collisionDetector = null;
    }

    if (this.performanceOptimizer) {
      this.performanceOptimizer.dispose();
      this.performanceOptimizer = null;
    }

    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }

    if (this.webglRenderer) {
      this.webglRenderer.dispose();
      this.webglRenderer = null;
    }

    this.pathCalculator = null;

    // 清理事件监听器
    this.eventListeners.clear();

    this.isInitialized = false;
    this.isRunning = false;

    console.log('ConnectionRenderingEngine disposed');
  }
}

// 导出主类和辅助工具
export { WebGLRenderer, PathCalculator, SceneManager, CollisionDetector, BranchConnectionSystem, OcclusionManager, PerformanceOptimizer };

// 便捷创建函数
export function createConnectionRenderingEngine(canvas, options = {}) {
  return new ConnectionRenderingEngine(canvas, options);
}