/**
 * 碰撞检测系统
 * 负责检测连接线与UI元素的重叠和遮挡处理
 */

export class CollisionDetector {
  constructor(options = {}) {
    this.options = {
      precision: 2, // 检测精度（像素）
      enableCaching: true,
      cacheDuration: 100, // 缓存持续时间（毫秒）
      maxQueries: 1000, // 最大查询数
      ...options
    };

    // 空间索引用于快速碰撞检测
    this.spatialGrid = new Map();
    this.gridSize = 100; // 网格大小
    
    // 缓存系统
    this.collisionCache = new Map();
    this.boundingBoxCache = new Map();
    
    // UI元素注册表
    this.registeredElements = new Map();
    this.elementBounds = new Map();
    
    // 遮挡规则
    this.occlusionRules = new Map();
    
    this.setupDefaultOcclusionRules();
  }

  setupDefaultOcclusionRules() {
    // 默认遮挡规则：连接线与头像、气泡重叠时隐藏连接线的对应部分
    this.addOcclusionRule('avatar', (connectionSegment, avatarBounds) => {
      return this.isLineSegmentIntersectingRect(connectionSegment, avatarBounds);
    });
    
    this.addOcclusionRule('bubble', (connectionSegment, bubbleBounds) => {
      return this.isLineSegmentIntersectingRect(connectionSegment, bubbleBounds);
    });
  }

  /**
   * 注册UI元素用于碰撞检测
   * @param {string} id - 元素ID
   * @param {Object} element - 元素信息
   * @param {string} type - 元素类型 ('avatar', 'bubble', 'ui', etc.)
   */
  registerElement(id, element, type) {
    const bounds = this.calculateElementBounds(element);
    
    this.registeredElements.set(id, {
      id,
      element,
      type,
      bounds,
      lastUpdate: Date.now()
    });
    
    this.updateElementInSpatialGrid(id, bounds);
  }

  /**
   * 更新已注册元素的位置和大小
   * @param {string} id - 元素ID
   * @param {Object} element - 更新的元素信息
   */
  updateElement(id, element) {
    const registered = this.registeredElements.get(id);
    if (!registered) {
      console.warn(`Element ${id} not registered for collision detection`);
      return;
    }

    const newBounds = this.calculateElementBounds(element);
    
    // 检查是否真的需要更新
    if (!this.areBoundsEqual(registered.bounds, newBounds)) {
      // 从旧位置的空间网格中移除
      this.removeElementFromSpatialGrid(id, registered.bounds);
      
      // 更新元素信息
      registered.element = element;
      registered.bounds = newBounds;
      registered.lastUpdate = Date.now();
      
      // 添加到新位置的空间网格
      this.updateElementInSpatialGrid(id, newBounds);
      
      // 清除相关缓存
      this.clearElementCache(id);
    }
  }

  /**
   * 移除注册的元素
   * @param {string} id - 元素ID
   */
  unregisterElement(id) {
    const registered = this.registeredElements.get(id);
    if (registered) {
      this.removeElementFromSpatialGrid(id, registered.bounds);
      this.registeredElements.delete(id);
      this.clearElementCache(id);
    }
  }

  /**
   * 检测连接线路径与注册元素的碰撞
   * @param {Array} path - 连接线路径点数组
   * @param {Array} excludeIds - 排除的元素ID数组
   * @returns {Object} 碰撞检测结果
   */
  detectCollisions(path, excludeIds = []) {
    if (!path || path.length < 2) {
      return { hasCollisions: false, collisions: [], occludedSegments: [] };
    }

    const cacheKey = this.generatePathCacheKey(path, excludeIds);
    
    if (this.options.enableCaching && this.collisionCache.has(cacheKey)) {
      const cached = this.collisionCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.options.cacheDuration) {
        return cached.result;
      }
    }

    const collisions = [];
    const occludedSegments = [];
    
    // 将路径分解为线段
    const segments = this.pathToSegments(path);
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentCollisions = this.detectSegmentCollisions(segment, excludeIds);
      
      if (segmentCollisions.length > 0) {
        collisions.push(...segmentCollisions);
        
        // 检查遮挡规则
        const occludedParts = this.processOcclusionRules(segment, segmentCollisions);
        if (occludedParts.length > 0) {
          occludedSegments.push({
            segmentIndex: i,
            segment,
            occludedParts
          });
        }
      }
    }

    const result = {
      hasCollisions: collisions.length > 0,
      collisions,
      occludedSegments,
      totalSegments: segments.length
    };

    // 缓存结果
    if (this.options.enableCaching) {
      this.collisionCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * 检测单个线段与元素的碰撞
   * @param {Object} segment - 线段 {start: {x, y}, end: {x, y}}
   * @param {Array} excludeIds - 排除的元素ID
   * @returns {Array} 碰撞的元素数组
   */
  detectSegmentCollisions(segment, excludeIds = []) {
    const collisions = [];
    const candidateElements = this.getSpatialGridCandidates(segment);
    
    for (const elementId of candidateElements) {
      if (excludeIds.includes(elementId)) continue;
      
      const element = this.registeredElements.get(elementId);
      if (!element) continue;
      
      if (this.isSegmentCollidingWithElement(segment, element)) {
        collisions.push({
          elementId,
          element,
          intersectionPoints: this.calculateIntersectionPoints(segment, element.bounds)
        });
      }
    }

    return collisions;
  }

  /**
   * 处理遮挡规则
   * @param {Object} segment - 线段
   * @param {Array} collisions - 碰撞信息
   * @returns {Array} 需要遮挡的部分
   */
  processOcclusionRules(segment, collisions) {
    const occludedParts = [];
    
    for (const collision of collisions) {
      const rule = this.occlusionRules.get(collision.element.type);
      if (rule && rule(segment, collision.element.bounds)) {
        // 计算需要隐藏的线段部分
        const occludedPart = this.calculateOccludedPart(segment, collision.element.bounds);
        if (occludedPart) {
          occludedParts.push({
            elementId: collision.elementId,
            elementType: collision.element.type,
            occludedSegment: occludedPart,
            originalSegment: segment
          });
        }
      }
    }

    return occludedParts;
  }

  /**
   * 计算被遮挡的线段部分
   * @param {Object} segment - 原始线段
   * @param {Object} bounds - 遮挡元素边界
   * @returns {Object|null} 被遮挡的线段部分
   */
  calculateOccludedPart(segment, bounds) {
    const intersections = this.calculateLineRectangleIntersections(segment, bounds);
    
    if (intersections.length === 0) return null;
    if (intersections.length === 1) {
      // 线段的一端在矩形内
      const insidePoint = this.isPointInRect(segment.start, bounds) ? segment.start : segment.end;
      return {
        start: insidePoint,
        end: intersections[0]
      };
    }
    
    // 线段穿过矩形
    return {
      start: intersections[0],
      end: intersections[1]
    };
  }

  /**
   * 计算线段与矩形的所有交点
   * @param {Object} segment - 线段
   * @param {Object} rect - 矩形边界
   * @returns {Array} 交点数组
   */
  calculateLineRectangleIntersections(segment, rect) {
    const intersections = [];
    
    // 检查与矩形四条边的交点
    const edges = [
      { start: { x: rect.minX, y: rect.minY }, end: { x: rect.maxX, y: rect.minY } }, // 上边
      { start: { x: rect.maxX, y: rect.minY }, end: { x: rect.maxX, y: rect.maxY } }, // 右边
      { start: { x: rect.maxX, y: rect.maxY }, end: { x: rect.minX, y: rect.maxY } }, // 下边
      { start: { x: rect.minX, y: rect.maxY }, end: { x: rect.minX, y: rect.minY } }  // 左边
    ];

    for (const edge of edges) {
      const intersection = this.calculateLineIntersection(segment, edge);
      if (intersection) {
        intersections.push(intersection);
      }
    }

    // 去重和排序
    return this.deduplicateAndSortIntersections(intersections, segment);
  }

  /**
   * 计算两条线段的交点
   * @param {Object} line1 - 线段1
   * @param {Object} line2 - 线段2
   * @returns {Object|null} 交点或null
   */
  calculateLineIntersection(line1, line2) {
    const x1 = line1.start.x, y1 = line1.start.y;
    const x2 = line1.end.x, y2 = line1.end.y;
    const x3 = line2.start.x, y3 = line2.start.y;
    const x4 = line2.end.x, y4 = line2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // 平行线

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  }

  /**
   * 去重并排序交点
   * @param {Array} intersections - 交点数组
   * @param {Object} segment - 参考线段
   * @returns {Array} 处理后的交点数组
   */
  deduplicateAndSortIntersections(intersections, segment) {
    if (intersections.length === 0) return intersections;

    // 去重
    const unique = [];
    for (const point of intersections) {
      const exists = unique.some(p => 
        Math.abs(p.x - point.x) < this.options.precision &&
        Math.abs(p.y - point.y) < this.options.precision
      );
      if (!exists) {
        unique.push(point);
      }
    }

    // 按沿线段的距离排序
    return unique.sort((a, b) => {
      const distA = this.pointDistance(segment.start, a);
      const distB = this.pointDistance(segment.start, b);
      return distA - distB;
    });
  }

  /**
   * 检查点是否在矩形内
   * @param {Object} point - 点
   * @param {Object} rect - 矩形
   * @returns {boolean} 是否在内部
   */
  isPointInRect(point, rect) {
    return point.x >= rect.minX && point.x <= rect.maxX &&
           point.y >= rect.minY && point.y <= rect.maxY;
  }

  /**
   * 将路径转换为线段数组
   * @param {Array} path - 路径点数组
   * @returns {Array} 线段数组
   */
  pathToSegments(path) {
    const segments = [];
    for (let i = 0; i < path.length - 1; i++) {
      segments.push({
        start: path[i],
        end: path[i + 1]
      });
    }
    return segments;
  }

  /**
   * 检查线段是否与元素碰撞
   * @param {Object} segment - 线段
   * @param {Object} element - 元素
   * @returns {boolean} 是否碰撞
   */
  isSegmentCollidingWithElement(segment, element) {
    return this.isLineSegmentIntersectingRect(segment, element.bounds);
  }

  /**
   * 检查线段是否与矩形相交
   * @param {Object} segment - 线段
   * @param {Object} rect - 矩形边界
   * @returns {boolean} 是否相交
   */
  isLineSegmentIntersectingRect(segment, rect) {
    // 快速边界检查
    const segmentBounds = {
      minX: Math.min(segment.start.x, segment.end.x),
      maxX: Math.max(segment.start.x, segment.end.x),
      minY: Math.min(segment.start.y, segment.end.y),
      maxY: Math.max(segment.start.y, segment.end.y)
    };

    if (!this.areBoundsOverlapping(segmentBounds, rect)) {
      return false;
    }

    // 检查端点是否在矩形内
    if (this.isPointInRect(segment.start, rect) || this.isPointInRect(segment.end, rect)) {
      return true;
    }

    // 检查线段是否与矩形边界相交
    return this.calculateLineRectangleIntersections(segment, rect).length > 0;
  }

  /**
   * 空间网格相关方法
   */
  getGridKey(x, y) {
    return `${Math.floor(x / this.gridSize)},${Math.floor(y / this.gridSize)}`;
  }

  updateElementInSpatialGrid(elementId, bounds) {
    const gridKeys = this.getBoundsGridKeys(bounds);
    
    for (const key of gridKeys) {
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, new Set());
      }
      this.spatialGrid.get(key).add(elementId);
    }
  }

  removeElementFromSpatialGrid(elementId, bounds) {
    const gridKeys = this.getBoundsGridKeys(bounds);
    
    for (const key of gridKeys) {
      if (this.spatialGrid.has(key)) {
        this.spatialGrid.get(key).delete(elementId);
        if (this.spatialGrid.get(key).size === 0) {
          this.spatialGrid.delete(key);
        }
      }
    }
  }

  getBoundsGridKeys(bounds) {
    const keys = [];
    const startX = Math.floor(bounds.minX / this.gridSize);
    const endX = Math.floor(bounds.maxX / this.gridSize);
    const startY = Math.floor(bounds.minY / this.gridSize);
    const endY = Math.floor(bounds.maxY / this.gridSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        keys.push(`${x},${y}`);
      }
    }

    return keys;
  }

  getSpatialGridCandidates(segment) {
    const bounds = {
      minX: Math.min(segment.start.x, segment.end.x),
      maxX: Math.max(segment.start.x, segment.end.x),
      minY: Math.min(segment.start.y, segment.end.y),
      maxY: Math.max(segment.start.y, segment.end.y)
    };

    const candidates = new Set();
    const gridKeys = this.getBoundsGridKeys(bounds);

    for (const key of gridKeys) {
      if (this.spatialGrid.has(key)) {
        for (const elementId of this.spatialGrid.get(key)) {
          candidates.add(elementId);
        }
      }
    }

    return candidates;
  }

  /**
   * 辅助方法
   */
  calculateElementBounds(element) {
    return {
      minX: element.x,
      minY: element.y,
      maxX: element.x + element.width,
      maxY: element.y + element.height
    };
  }

  areBoundsEqual(bounds1, bounds2, tolerance = this.options.precision) {
    return Math.abs(bounds1.minX - bounds2.minX) <= tolerance &&
           Math.abs(bounds1.minY - bounds2.minY) <= tolerance &&
           Math.abs(bounds1.maxX - bounds2.maxX) <= tolerance &&
           Math.abs(bounds1.maxY - bounds2.maxY) <= tolerance;
  }

  areBoundsOverlapping(bounds1, bounds2) {
    return !(bounds1.maxX < bounds2.minX || bounds1.minX > bounds2.maxX ||
             bounds1.maxY < bounds2.minY || bounds1.minY > bounds2.maxY);
  }

  pointDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  generatePathCacheKey(path, excludeIds) {
    const pathHash = path.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('-');
    const excludeHash = excludeIds.sort().join(',');
    return `${pathHash}:${excludeHash}`;
  }

  clearElementCache(elementId) {
    // 清除包含该元素的所有缓存项
    for (const [key, value] of this.collisionCache) {
      if (key.includes(elementId)) {
        this.collisionCache.delete(key);
      }
    }
  }

  calculateIntersectionPoints(segment, bounds) {
    return this.calculateLineRectangleIntersections(segment, bounds);
  }

  /**
   * 添加自定义遮挡规则
   * @param {string} elementType - 元素类型
   * @param {Function} rule - 遮挡规则函数
   */
  addOcclusionRule(elementType, rule) {
    this.occlusionRules.set(elementType, rule);
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.collisionCache.clear();
    this.boundingBoxCache.clear();
  }

  /**
   * 获取碰撞检测统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      registeredElements: this.registeredElements.size,
      spatialGridCells: this.spatialGrid.size,
      cacheSize: this.collisionCache.size,
      occlusionRules: this.occlusionRules.size
    };
  }

  /**
   * 销毁碰撞检测器
   */
  dispose() {
    this.registeredElements.clear();
    this.elementBounds.clear();
    this.spatialGrid.clear();
    this.collisionCache.clear();
    this.boundingBoxCache.clear();
    this.occlusionRules.clear();
  }
}