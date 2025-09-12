/**
 * 遮挡管理系统
 * 负责处理连接线与UI元素重叠时的智能遮挡和显示策略
 */

export class OcclusionManager {
  constructor(collisionDetector, options = {}) {
    this.collisionDetector = collisionDetector;
    this.options = {
      enableSmartOcclusion: true,
      fadeDistance: 10, // 渐变距离
      minVisibleLength: 20, // 最小可见长度
      occlusionAnimationDuration: 200,
      clippingPrecision: 2,
      ...options
    };

    // 遮挡状态管理
    this.occlusionStates = new Map();
    this.visibilityMasks = new Map();
    this.fadeRegions = new Map();
    
    // 动画系统
    this.activeAnimations = new Map();
    this.needsUpdate = false;
    
    // 预计算的遮挡规则
    this.occlusionStrategies = new Map();
    
    this.init();
  }

  init() {
    this.setupDefaultStrategies();
  }

  setupDefaultStrategies() {
    // 头像遮挡策略：完全隐藏相交部分
    this.addOcclusionStrategy('avatar', {
      type: 'full_hide',
      fadeIn: true,
      fadeOut: true,
      priority: 10
    });

    // 气泡遮挡策略：渐变隐藏
    this.addOcclusionStrategy('bubble', {
      type: 'fade_hide',
      fadeDistance: this.options.fadeDistance,
      priority: 5
    });

    // UI元素遮挡策略：部分隐藏
    this.addOcclusionStrategy('ui', {
      type: 'partial_hide',
      fadeDistance: this.options.fadeDistance * 0.5,
      priority: 3
    });
  }

  /**
   * 添加遮挡策略
   * @param {string} elementType - 元素类型
   * @param {Object} strategy - 遮挡策略配置
   */
  addOcclusionStrategy(elementType, strategy) {
    this.occlusionStrategies.set(elementType, {
      fadeIn: false,
      fadeOut: false,
      fadeDistance: this.options.fadeDistance,
      priority: 1,
      ...strategy
    });
  }

  /**
   * 处理连接线的遮挡
   * @param {string} connectionId - 连接线ID
   * @param {Array} path - 连接线路径
   * @param {Array} excludeElements - 排除的元素ID
   * @returns {Object} 遮挡处理结果
   */
  processOcclusion(connectionId, path, excludeElements = []) {
    if (!path || path.length < 2) {
      return { visibleSegments: [], occludedSegments: [], needsClipping: false };
    }

    // 检测碰撞
    const collisionResult = this.collisionDetector.detectCollisions(path, excludeElements);
    
    if (!collisionResult.hasCollisions) {
      return { 
        visibleSegments: [{ path, opacity: 1.0 }], 
        occludedSegments: [], 
        needsClipping: false 
      };
    }

    // 处理遮挡
    const occlusionResult = this.calculateOcclusionMasks(path, collisionResult);
    
    // 更新遮挡状态
    this.updateOcclusionState(connectionId, occlusionResult);
    
    return occlusionResult;
  }

  /**
   * 计算遮挡蒙版
   * @param {Array} path - 连接线路径
   * @param {Object} collisionResult - 碰撞检测结果
   * @returns {Object} 遮挡结果
   */
  calculateOcclusionMasks(path, collisionResult) {
    const segments = this.pathToSegments(path);
    const visibleSegments = [];
    const occludedSegments = [];
    let needsClipping = false;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentCollisions = this.getSegmentCollisions(segment, collisionResult);
      
      if (segmentCollisions.length === 0) {
        // 无碰撞，完全可见
        visibleSegments.push({
          path: [segment.start, segment.end],
          opacity: 1.0,
          segmentIndex: i
        });
      } else {
        // 有碰撞，需要处理遮挡
        const processedSegment = this.processSegmentOcclusion(segment, segmentCollisions, i);
        
        visibleSegments.push(...processedSegment.visible);
        occludedSegments.push(...processedSegment.occluded);
        
        if (processedSegment.needsClipping) {
          needsClipping = true;
        }
      }
    }

    return {
      visibleSegments: this.mergeAdjacentSegments(visibleSegments),
      occludedSegments,
      needsClipping
    };
  }

  /**
   * 处理单个线段的遮挡
   * @param {Object} segment - 线段
   * @param {Array} collisions - 碰撞信息
   * @param {number} segmentIndex - 线段索引
   * @returns {Object} 处理结果
   */
  processSegmentOcclusion(segment, collisions, segmentIndex) {
    const visible = [];
    const occluded = [];
    let needsClipping = false;

    // 按优先级排序碰撞
    const sortedCollisions = collisions.sort((a, b) => {
      const strategyA = this.occlusionStrategies.get(a.element.type) || { priority: 0 };
      const strategyB = this.occlusionStrategies.get(b.element.type) || { priority: 0 };
      return strategyB.priority - strategyA.priority;
    });

    let currentSegment = { start: segment.start, end: segment.end };
    
    for (const collision of sortedCollisions) {
      const strategy = this.occlusionStrategies.get(collision.element.type);
      if (!strategy) continue;

      const result = this.applyOcclusionStrategy(currentSegment, collision, strategy, segmentIndex);
      
      if (result.visible.length > 0) {
        visible.push(...result.visible);
      }
      
      if (result.occluded.length > 0) {
        occluded.push(...result.occluded);
        needsClipping = true;
      }

      // 更新当前线段为剩余可见部分
      if (result.remaining) {
        currentSegment = result.remaining;
      } else {
        break; // 整个线段被遮挡
      }
    }

    // 添加剩余可见部分
    if (currentSegment && this.getSegmentLength(currentSegment) > this.options.minVisibleLength) {
      visible.push({
        path: [currentSegment.start, currentSegment.end],
        opacity: 1.0,
        segmentIndex
      });
    }

    return { visible, occluded, needsClipping };
  }

  /**
   * 应用遮挡策略
   * @param {Object} segment - 线段
   * @param {Object} collision - 碰撞信息
   * @param {Object} strategy - 遮挡策略
   * @param {number} segmentIndex - 线段索引
   * @returns {Object} 应用结果
   */
  applyOcclusionStrategy(segment, collision, strategy, segmentIndex) {
    switch (strategy.type) {
      case 'full_hide':
        return this.applyFullHideStrategy(segment, collision, strategy, segmentIndex);
      
      case 'fade_hide':
        return this.applyFadeHideStrategy(segment, collision, strategy, segmentIndex);
      
      case 'partial_hide':
        return this.applyPartialHideStrategy(segment, collision, strategy, segmentIndex);
      
      default:
        return { visible: [{ path: [segment.start, segment.end], opacity: 1.0, segmentIndex }], occluded: [] };
    }
  }

  /**
   * 完全隐藏策略
   * @param {Object} segment - 线段
   * @param {Object} collision - 碰撞信息
   * @param {Object} strategy - 策略配置
   * @param {number} segmentIndex - 线段索引
   * @returns {Object} 处理结果
   */
  applyFullHideStrategy(segment, collision, strategy, segmentIndex) {
    const intersections = collision.intersectionPoints || [];
    
    if (intersections.length === 0) {
      return { visible: [{ path: [segment.start, segment.end], opacity: 1.0, segmentIndex }], occluded: [] };
    }

    const visible = [];
    const occluded = [];
    
    // 如果有两个交点，线段穿过遮挡元素
    if (intersections.length >= 2) {
      const sortedIntersections = this.sortPointsAlongSegment(intersections, segment);
      
      // 第一个可见部分（起点到第一个交点）
      if (this.getSegmentLength({ start: segment.start, end: sortedIntersections[0] }) > this.options.minVisibleLength) {
        const fadeOutEnd = strategy.fadeOut ? 
          this.calculateFadePoint(segment.start, sortedIntersections[0], strategy.fadeDistance, false) : 
          sortedIntersections[0];
        
        visible.push({
          path: [segment.start, fadeOutEnd],
          opacity: 1.0,
          fadeOut: strategy.fadeOut,
          segmentIndex
        });
      }

      // 遮挡部分
      occluded.push({
        path: sortedIntersections.slice(0, 2),
        elementId: collision.elementId,
        elementType: collision.element.type,
        segmentIndex
      });

      // 第二个可见部分（第二个交点到终点）
      if (sortedIntersections.length >= 2 && 
          this.getSegmentLength({ start: sortedIntersections[1], end: segment.end }) > this.options.minVisibleLength) {
        const fadeInStart = strategy.fadeIn ? 
          this.calculateFadePoint(sortedIntersections[1], segment.end, strategy.fadeDistance, true) : 
          sortedIntersections[1];
        
        visible.push({
          path: [fadeInStart, segment.end],
          opacity: 1.0,
          fadeIn: strategy.fadeIn,
          segmentIndex
        });
      }
    }
    // 如果只有一个交点，线段的一端在遮挡元素内
    else if (intersections.length === 1) {
      const intersection = intersections[0];
      const startInside = this.collisionDetector.isPointInRect(segment.start, collision.element.bounds);
      
      if (startInside) {
        // 起点在内部，从交点开始可见
        if (this.getSegmentLength({ start: intersection, end: segment.end }) > this.options.minVisibleLength) {
          const fadeInStart = strategy.fadeIn ? 
            this.calculateFadePoint(intersection, segment.end, strategy.fadeDistance, true) : 
            intersection;
          
          visible.push({
            path: [fadeInStart, segment.end],
            opacity: 1.0,
            fadeIn: strategy.fadeIn,
            segmentIndex
          });
        }
        
        occluded.push({
          path: [segment.start, intersection],
          elementId: collision.elementId,
          elementType: collision.element.type,
          segmentIndex
        });
      } else {
        // 终点在内部，到交点可见
        if (this.getSegmentLength({ start: segment.start, end: intersection }) > this.options.minVisibleLength) {
          const fadeOutEnd = strategy.fadeOut ? 
            this.calculateFadePoint(segment.start, intersection, strategy.fadeDistance, false) : 
            intersection;
          
          visible.push({
            path: [segment.start, fadeOutEnd],
            opacity: 1.0,
            fadeOut: strategy.fadeOut,
            segmentIndex
          });
        }
        
        occluded.push({
          path: [intersection, segment.end],
          elementId: collision.elementId,
          elementType: collision.element.type,
          segmentIndex
        });
      }
    }

    return { visible, occluded };
  }

  /**
   * 渐变隐藏策略
   * @param {Object} segment - 线段
   * @param {Object} collision - 碰撞信息
   * @param {Object} strategy - 策略配置
   * @param {number} segmentIndex - 线段索引
   * @returns {Object} 处理结果
   */
  applyFadeHideStrategy(segment, collision, strategy, segmentIndex) {
    const result = this.applyFullHideStrategy(segment, collision, strategy, segmentIndex);
    
    // 为渐变隐藏策略添加半透明过渡段
    const fadeSegments = [];
    
    for (const visibleSegment of result.visible) {
      if (visibleSegment.fadeIn || visibleSegment.fadeOut) {
        const fadeLength = strategy.fadeDistance || this.options.fadeDistance;
        
        if (visibleSegment.fadeIn) {
          const fadeSegment = this.createFadeSegment(
            visibleSegment.path[0], 
            visibleSegment.path[1], 
            fadeLength, 
            0.0, 
            1.0,
            segmentIndex
          );
          fadeSegments.push(fadeSegment);
        }
        
        if (visibleSegment.fadeOut) {
          const fadeSegment = this.createFadeSegment(
            visibleSegment.path[0], 
            visibleSegment.path[1], 
            fadeLength, 
            1.0, 
            0.0,
            segmentIndex
          );
          fadeSegments.push(fadeSegment);
        }
      }
    }

    return {
      visible: [...result.visible, ...fadeSegments],
      occluded: result.occluded
    };
  }

  /**
   * 部分隐藏策略
   * @param {Object} segment - 线段
   * @param {Object} collision - 碰撞信息
   * @param {Object} strategy - 策略配置
   * @param {number} segmentIndex - 线段索引
   * @returns {Object} 处理结果
   */
  applyPartialHideStrategy(segment, collision, strategy, segmentIndex) {
    // 部分隐藏使用较低的透明度而不是完全隐藏
    const result = this.applyFullHideStrategy(segment, collision, strategy, segmentIndex);
    
    // 将完全遮挡的部分改为半透明
    const partialVisible = result.occluded.map(occludedSeg => ({
      path: occludedSeg.path,
      opacity: 0.3,
      segmentIndex: occludedSeg.segmentIndex,
      partial: true
    }));

    return {
      visible: [...result.visible, ...partialVisible],
      occluded: [] // 部分隐藏策略不产生完全遮挡的段
    };
  }

  /**
   * 创建渐变段
   * @param {Object} start - 起点
   * @param {Object} end - 终点
   * @param {number} fadeLength - 渐变长度
   * @param {number} startOpacity - 起始透明度
   * @param {number} endOpacity - 结束透明度
   * @param {number} segmentIndex - 线段索引
   * @returns {Object} 渐变段
   */
  createFadeSegment(start, end, fadeLength, startOpacity, endOpacity, segmentIndex) {
    const totalLength = this.getSegmentLength({ start, end });
    const fadeRatio = Math.min(fadeLength / totalLength, 0.5);
    
    return {
      path: [start, end],
      opacity: (startOpacity + endOpacity) / 2,
      fadeRatio,
      startOpacity,
      endOpacity,
      segmentIndex,
      fade: true
    };
  }

  /**
   * 计算渐变点
   * @param {Object} from - 起点
   * @param {Object} to - 终点
   * @param {number} distance - 渐变距离
   * @param {boolean} fromStart - 是否从起点开始
   * @returns {Object} 渐变点
   */
  calculateFadePoint(from, to, distance, fromStart) {
    const totalDistance = this.pointDistance(from, to);
    const ratio = Math.min(distance / totalDistance, 1.0);
    const t = fromStart ? ratio : 1.0 - ratio;
    
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t
    };
  }

  /**
   * 合并相邻的可见段
   * @param {Array} segments - 线段数组
   * @returns {Array} 合并后的线段数组
   */
  mergeAdjacentSegments(segments) {
    if (segments.length <= 1) return segments;

    const merged = [];
    let current = segments[0];

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      
      // 检查是否可以合并
      if (this.canMergeSegments(current, next)) {
        current = this.mergeSegments(current, next);
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }

  /**
   * 检查是否可以合并两个段
   * @param {Object} seg1 - 段1
   * @param {Object} seg2 - 段2
   * @returns {boolean} 是否可以合并
   */
  canMergeSegments(seg1, seg2) {
    return Math.abs(seg1.opacity - seg2.opacity) < 0.01 &&
           !seg1.fade && !seg2.fade &&
           this.pointDistance(seg1.path[seg1.path.length - 1], seg2.path[0]) < this.options.clippingPrecision;
  }

  /**
   * 合并两个段
   * @param {Object} seg1 - 段1
   * @param {Object} seg2 - 段2
   * @returns {Object} 合并后的段
   */
  mergeSegments(seg1, seg2) {
    return {
      path: [...seg1.path.slice(0, -1), ...seg2.path],
      opacity: seg1.opacity,
      segmentIndex: seg1.segmentIndex
    };
  }

  /**
   * 更新遮挡状态
   * @param {string} connectionId - 连接线ID
   * @param {Object} occlusionResult - 遮挡结果
   */
  updateOcclusionState(connectionId, occlusionResult) {
    const previousState = this.occlusionStates.get(connectionId);
    
    this.occlusionStates.set(connectionId, {
      ...occlusionResult,
      lastUpdate: Date.now()
    });

    // 如果状态有显著变化，触发动画
    if (this.hasSignificantOcclusionChange(previousState, occlusionResult)) {
      this.animateOcclusionTransition(connectionId, previousState, occlusionResult);
    }
  }

  /**
   * 检查遮挡变化是否显著
   * @param {Object} previous - 之前的状态
   * @param {Object} current - 当前状态
   * @returns {boolean} 是否有显著变化
   */
  hasSignificantOcclusionChange(previous, current) {
    if (!previous) return true;
    
    return previous.visibleSegments.length !== current.visibleSegments.length ||
           previous.occludedSegments.length !== current.occludedSegments.length;
  }

  /**
   * 动画化遮挡过渡
   * @param {string} connectionId - 连接线ID
   * @param {Object} fromState - 初始状态
   * @param {Object} toState - 目标状态
   */
  animateOcclusionTransition(connectionId, fromState, toState) {
    if (!this.options.occlusionAnimationDuration) return;

    const startTime = Date.now();
    const duration = this.options.occlusionAnimationDuration;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 插值计算中间状态
      const interpolatedState = this.interpolateOcclusionStates(fromState, toState, progress);
      
      // 更新状态
      this.occlusionStates.set(connectionId, {
        ...interpolatedState,
        animating: progress < 1,
        animationProgress: progress
      });

      this.needsUpdate = true;
      
      if (progress < 1) {
        this.activeAnimations.set(connectionId, requestAnimationFrame(animate));
      } else {
        this.activeAnimations.delete(connectionId);
      }
    };

    animate();
  }

  /**
   * 插值遮挡状态
   * @param {Object} from - 初始状态
   * @param {Object} to - 目标状态
   * @param {number} t - 插值参数 (0-1)
   * @returns {Object} 插值状态
   */
  interpolateOcclusionStates(from, to, t) {
    if (!from) return to;

    const visibleSegments = [];
    
    // 简化：对透明度进行插值
    for (let i = 0; i < Math.max(from.visibleSegments.length, to.visibleSegments.length); i++) {
      const fromSeg = from.visibleSegments[i];
      const toSeg = to.visibleSegments[i];
      
      if (fromSeg && toSeg) {
        visibleSegments.push({
          ...toSeg,
          opacity: fromSeg.opacity + (toSeg.opacity - fromSeg.opacity) * t
        });
      } else if (toSeg) {
        visibleSegments.push({
          ...toSeg,
          opacity: toSeg.opacity * t
        });
      } else if (fromSeg) {
        visibleSegments.push({
          ...fromSeg,
          opacity: fromSeg.opacity * (1 - t)
        });
      }
    }

    return {
      visibleSegments,
      occludedSegments: to.occludedSegments,
      needsClipping: to.needsClipping
    };
  }

  // 辅助方法
  pathToSegments(path) {
    const segments = [];
    for (let i = 0; i < path.length - 1; i++) {
      segments.push({ start: path[i], end: path[i + 1] });
    }
    return segments;
  }

  getSegmentCollisions(segment, collisionResult) {
    return collisionResult.occludedSegments
      .filter(occluded => this.isSegmentOverlapping(segment, occluded.segment))
      .map(occluded => ({
        elementId: occluded.elementId,
        element: { type: occluded.elementType },
        intersectionPoints: this.collisionDetector.calculateIntersectionPoints(segment, occluded.element.bounds)
      }));
  }

  isSegmentOverlapping(seg1, seg2) {
    // 简化的重叠检测
    return this.pointDistance(seg1.start, seg2.start) < 5 || 
           this.pointDistance(seg1.end, seg2.end) < 5;
  }

  getSegmentLength(segment) {
    return this.pointDistance(segment.start, segment.end);
  }

  pointDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  sortPointsAlongSegment(points, segment) {
    return points.sort((a, b) => {
      const distA = this.pointDistance(segment.start, a);
      const distB = this.pointDistance(segment.start, b);
      return distA - distB;
    });
  }

  /**
   * 获取连接线的遮挡状态
   * @param {string} connectionId - 连接线ID
   * @returns {Object} 遮挡状态
   */
  getOcclusionState(connectionId) {
    return this.occlusionStates.get(connectionId);
  }

  /**
   * 清除连接线的遮挡状态
   * @param {string} connectionId - 连接线ID
   */
  clearOcclusionState(connectionId) {
    this.occlusionStates.delete(connectionId);
    
    if (this.activeAnimations.has(connectionId)) {
      cancelAnimationFrame(this.activeAnimations.get(connectionId));
      this.activeAnimations.delete(connectionId);
    }
  }

  /**
   * 清除所有遮挡状态
   */
  clearAll() {
    this.occlusionStates.clear();
    
    for (const animationId of this.activeAnimations.keys()) {
      cancelAnimationFrame(this.activeAnimations.get(animationId));
    }
    this.activeAnimations.clear();
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let totalVisible = 0;
    let totalOccluded = 0;
    
    for (const state of this.occlusionStates.values()) {
      totalVisible += state.visibleSegments.length;
      totalOccluded += state.occludedSegments.length;
    }

    return {
      activeConnections: this.occlusionStates.size,
      totalVisibleSegments: totalVisible,
      totalOccludedSegments: totalOccluded,
      activeAnimations: this.activeAnimations.size,
      strategies: this.occlusionStrategies.size
    };
  }

  /**
   * 销毁遮挡管理器
   */
  dispose() {
    this.clearAll();
    this.occlusionStrategies.clear();
  }
}