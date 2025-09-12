/**
 * 性能优化器
 * 负责批量渲染、视窗裁剪和帧率优化
 */

export class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      targetFPS: 60,
      adaptiveQuality: true,
      batchSize: 100,
      cullingEnabled: true,
      frustumPadding: 50,
      lodEnabled: true, // Level of Detail
      instancedRenderingThreshold: 50,
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      ...options
    };

    // 性能监控
    this.performanceMonitor = {
      frameTime: 0,
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      fps: 0,
      droppedFrames: 0,
      lastFrameTime: 0,
      frameCount: 0
    };

    // 适应性质量控制
    this.qualityLevel = 1.0; // 0.0 - 1.0
    this.qualityHistory = [];
    this.performanceHistory = [];
    
    // 批处理系统
    this.batchQueues = new Map();
    this.renderBatches = [];
    
    // LOD系统
    this.lodLevels = new Map();
    
    // 视窗裁剪
    this.frustum = null;
    this.visibilityMap = new Map();
    
    // 对象池
    this.objectPools = new Map();
    
    // 内存管理
    this.memoryTracker = {
      geometries: new WeakMap(),
      materials: new WeakMap(),
      textures: new WeakMap()
    };

    this.init();
  }

  init() {
    this.setupPerformanceMonitoring();
    this.initializeObjectPools();
    this.setupLODLevels();
  }

  setupPerformanceMonitoring() {
    // 监控帧率和性能指标
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.adaptQuality();
    }, 1000);
  }

  initializeObjectPools() {
    // 创建常用对象的对象池
    this.createObjectPool('vector3', () => ({ x: 0, y: 0, z: 0 }), 1000);
    this.createObjectPool('vector2', () => ({ x: 0, y: 0 }), 1000);
    this.createObjectPool('matrix4', () => new Array(16).fill(0), 100);
    this.createObjectPool('bounds', () => ({ minX: 0, minY: 0, maxX: 0, maxY: 0 }), 500);
  }

  createObjectPool(name, factory, initialSize) {
    const pool = {
      objects: [],
      factory,
      activeCount: 0,
      totalCreated: 0
    };

    for (let i = 0; i < initialSize; i++) {
      pool.objects.push(factory());
    }

    this.objectPools.set(name, pool);
  }

  getFromPool(poolName) {
    const pool = this.objectPools.get(poolName);
    if (!pool) return null;

    if (pool.objects.length > 0) {
      pool.activeCount++;
      return pool.objects.pop();
    } else {
      pool.totalCreated++;
      pool.activeCount++;
      return pool.factory();
    }
  }

  returnToPool(poolName, object) {
    const pool = this.objectPools.get(poolName);
    if (!pool) return;

    pool.activeCount--;
    
    // 重置对象状态
    if (typeof object === 'object' && object !== null) {
      if (object.x !== undefined) object.x = 0;
      if (object.y !== undefined) object.y = 0;
      if (object.z !== undefined) object.z = 0;
      if (Array.isArray(object)) object.fill(0);
    }

    pool.objects.push(object);
  }

  setupLODLevels() {
    // 设置不同距离的细节层次
    this.lodLevels.set('high', {
      maxDistance: 500,
      lineWidth: 2.0,
      cornerRadius: 8,
      segmentCount: 20
    });

    this.lodLevels.set('medium', {
      maxDistance: 1500,
      lineWidth: 1.5,
      cornerRadius: 6,
      segmentCount: 12
    });

    this.lodLevels.set('low', {
      maxDistance: Infinity,
      lineWidth: 1.0,
      cornerRadius: 4,
      segmentCount: 6
    });
  }

  /**
   * 视窗裁剪优化
   * @param {Object} viewport - 视窗信息
   * @param {Array} connections - 连接线数组
   * @returns {Array} 可见的连接线
   */
  performFrustumCulling(viewport, connections) {
    const startTime = performance.now();
    
    // 扩展视窗边界以包含部分可见的连接线
    const expandedViewport = {
      x: viewport.x - this.options.frustumPadding,
      y: viewport.y - this.options.frustumPadding,
      width: viewport.width + this.options.frustumPadding * 2,
      height: viewport.height + this.options.frustumPadding * 2
    };

    const visibleConnections = [];
    
    for (const connection of connections) {
      if (this.isConnectionVisible(connection, expandedViewport)) {
        visibleConnections.push(connection);
        this.visibilityMap.set(connection.id, true);
      } else {
        this.visibilityMap.set(connection.id, false);
      }
    }

    this.performanceMonitor.updateTime += performance.now() - startTime;
    return visibleConnections;
  }

  /**
   * 检查连接线是否在视窗内可见
   * @param {Object} connection - 连接线
   * @param {Object} viewport - 视窗
   * @returns {boolean} 是否可见
   */
  isConnectionVisible(connection, viewport) {
    if (!connection.bounds) {
      connection.bounds = this.calculateConnectionBounds(connection);
    }

    const bounds = connection.bounds;
    
    return !(
      bounds.maxX < viewport.x ||
      bounds.minX > viewport.x + viewport.width ||
      bounds.maxY < viewport.y ||
      bounds.minY > viewport.y + viewport.height
    );
  }

  /**
   * 计算连接线边界
   * @param {Object} connection - 连接线
   * @returns {Object} 边界框
   */
  calculateConnectionBounds(connection) {
    if (!connection.path || connection.path.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let bounds = this.getFromPool('bounds');
    bounds.minX = connection.path[0].x;
    bounds.minY = connection.path[0].y;
    bounds.maxX = connection.path[0].x;
    bounds.maxY = connection.path[0].y;

    for (const point of connection.path) {
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.maxY = Math.max(bounds.maxY, point.y);
    }

    const result = { ...bounds };
    this.returnToPool('bounds', bounds);
    
    return result;
  }

  /**
   * 批处理优化
   * @param {Array} connections - 连接线数组
   * @param {number} batchSize - 批处理大小
   * @returns {Array} 批处理组
   */
  createRenderBatches(connections, batchSize = this.options.batchSize) {
    const batches = [];
    
    // 按材质和样式分组
    const groups = this.groupConnectionsByMaterial(connections);
    
    for (const [materialKey, groupConnections] of groups) {
      for (let i = 0; i < groupConnections.length; i += batchSize) {
        const batchConnections = groupConnections.slice(i, i + batchSize);
        
        batches.push({
          id: `batch_${batches.length}`,
          materialKey,
          connections: batchConnections,
          vertexCount: this.calculateBatchVertexCount(batchConnections),
          needsUpdate: true
        });
      }
    }

    return batches;
  }

  /**
   * 按材质分组连接线
   * @param {Array} connections - 连接线数组
   * @returns {Map} 分组结果
   */
  groupConnectionsByMaterial(connections) {
    const groups = new Map();
    
    for (const connection of connections) {
      const materialKey = this.generateMaterialKey(connection.style || {});
      
      if (!groups.has(materialKey)) {
        groups.set(materialKey, []);
      }
      
      groups.get(materialKey).push(connection);
    }

    return groups;
  }

  generateMaterialKey(style) {
    return `${style.color || 'default'}_${style.width || 2}_${style.opacity || 1}_${style.dashed || false}`;
  }

  calculateBatchVertexCount(connections) {
    let totalVertices = 0;
    
    for (const connection of connections) {
      if (connection.path) {
        // 每个线段6个顶点（2个三角形）
        totalVertices += (connection.path.length - 1) * 6;
      }
    }

    return totalVertices;
  }

  /**
   * LOD优化
   * @param {Array} connections - 连接线数组
   * @param {Object} viewport - 视窗信息
   * @returns {Array} 应用LOD的连接线
   */
  applyLevelOfDetail(connections, viewport) {
    if (!this.options.lodEnabled) return connections;

    const viewCenter = {
      x: viewport.x + viewport.width / 2,
      y: viewport.y + viewport.height / 2
    };

    return connections.map(connection => {
      const distance = this.calculateConnectionDistance(connection, viewCenter);
      const lodLevel = this.getLODLevel(distance);
      
      return {
        ...connection,
        lodLevel,
        style: {
          ...connection.style,
          ...lodLevel
        }
      };
    });
  }

  /**
   * 计算连接线到视窗中心的距离
   * @param {Object} connection - 连接线
   * @param {Object} viewCenter - 视窗中心
   * @returns {number} 距离
   */
  calculateConnectionDistance(connection, viewCenter) {
    if (!connection.bounds) {
      connection.bounds = this.calculateConnectionBounds(connection);
    }

    const bounds = connection.bounds;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return Math.sqrt((centerX - viewCenter.x) ** 2 + (centerY - viewCenter.y) ** 2);
  }

  /**
   * 获取LOD级别
   * @param {number} distance - 距离
   * @returns {Object} LOD配置
   */
  getLODLevel(distance) {
    for (const [level, config] of this.lodLevels) {
      if (distance <= config.maxDistance) {
        return { level, ...config };
      }
    }

    return { level: 'low', ...this.lodLevels.get('low') };
  }

  /**
   * 内存优化
   */
  optimizeMemory() {
    const memoryUsage = this.estimateMemoryUsage();
    
    if (memoryUsage > this.options.memoryThreshold) {
      console.warn('Memory usage high:', memoryUsage, 'bytes');
      
      // 触发垃圾回收优化
      this.runGarbageCollection();
      
      // 降低质量级别
      this.qualityLevel = Math.max(0.3, this.qualityLevel * 0.9);
    }
  }

  estimateMemoryUsage() {
    // 估算内存使用量
    let total = 0;
    
    // 估算几何体内存
    total += this.batchQueues.size * 1024 * 50; // 假设每个批次50KB
    
    // 估算纹理内存
    total += this.objectPools.size * 1024 * 10; // 假设每个对象池10KB
    
    return total;
  }

  runGarbageCollection() {
    // 清理未使用的对象池
    for (const [name, pool] of this.objectPools) {
      if (pool.activeCount === 0 && pool.objects.length > 100) {
        pool.objects.length = Math.floor(pool.objects.length / 2);
      }
    }

    // 清理旧的性能历史
    if (this.performanceHistory.length > 60) {
      this.performanceHistory = this.performanceHistory.slice(-30);
    }
    
    if (this.qualityHistory.length > 60) {
      this.qualityHistory = this.qualityHistory.slice(-30);
    }
  }

  /**
   * 自适应质量控制
   */
  adaptQuality() {
    if (!this.options.adaptiveQuality) return;

    const currentFPS = this.performanceMonitor.fps;
    const targetFPS = this.options.targetFPS;
    
    this.qualityHistory.push(this.qualityLevel);
    
    if (currentFPS < targetFPS * 0.8) {
      // 性能不足，降低质量
      this.qualityLevel = Math.max(0.2, this.qualityLevel * 0.95);
    } else if (currentFPS > targetFPS * 0.95) {
      // 性能充足，提升质量
      this.qualityLevel = Math.min(1.0, this.qualityLevel * 1.05);
    }

    // 应用质量变化
    this.applyQualitySettings();
  }

  applyQualitySettings() {
    const quality = this.qualityLevel;
    
    // 根据质量级别调整各种设置
    if (quality < 0.3) {
      // 低质量设置
      this.options.batchSize = 200;
      this.options.targetFPS = 30;
    } else if (quality < 0.7) {
      // 中等质量设置
      this.options.batchSize = 150;
      this.options.targetFPS = 45;
    } else {
      // 高质量设置
      this.options.batchSize = 100;
      this.options.targetFPS = 60;
    }
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics() {
    const currentTime = performance.now();
    
    if (this.performanceMonitor.lastFrameTime > 0) {
      const deltaTime = currentTime - this.performanceMonitor.lastFrameTime;
      this.performanceMonitor.frameTime = deltaTime;
      this.performanceMonitor.fps = 1000 / deltaTime;
      
      if (deltaTime > 1000 / this.options.targetFPS * 1.5) {
        this.performanceMonitor.droppedFrames++;
      }
    }
    
    this.performanceMonitor.lastFrameTime = currentTime;
    this.performanceMonitor.frameCount++;
    
    // 记录性能历史
    this.performanceHistory.push({
      time: currentTime,
      fps: this.performanceMonitor.fps,
      frameTime: this.performanceMonitor.frameTime,
      memoryUsage: this.estimateMemoryUsage(),
      quality: this.qualityLevel
    });

    // 内存优化检查
    if (this.performanceMonitor.frameCount % 300 === 0) { // 每5秒检查一次
      this.optimizeMemory();
    }
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    const poolStats = {};
    for (const [name, pool] of this.objectPools) {
      poolStats[name] = {
        available: pool.objects.length,
        active: pool.activeCount,
        totalCreated: pool.totalCreated
      };
    }

    return {
      ...this.performanceMonitor,
      qualityLevel: this.qualityLevel,
      memoryUsage: this.estimateMemoryUsage(),
      visibleConnections: this.visibilityMap.size,
      batchCount: this.renderBatches.length,
      objectPools: poolStats
    };
  }

  /**
   * 重置性能统计
   */
  resetStats() {
    this.performanceMonitor = {
      frameTime: 0,
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      fps: 0,
      droppedFrames: 0,
      lastFrameTime: 0,
      frameCount: 0
    };
    
    this.performanceHistory = [];
    this.qualityHistory = [];
  }

  /**
   * 设置性能配置
   * @param {Object} options - 新的配置选项
   */
  updateOptions(options) {
    Object.assign(this.options, options);
    this.applyQualitySettings();
  }

  /**
   * 销毁性能优化器
   */
  dispose() {
    // 清理对象池
    this.objectPools.clear();
    
    // 清理批处理队列
    this.batchQueues.clear();
    this.renderBatches = [];
    
    // 清理历史记录
    this.performanceHistory = [];
    this.qualityHistory = [];
    
    // 清理可见性映射
    this.visibilityMap.clear();
  }
}