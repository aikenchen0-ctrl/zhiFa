/**
 * 高精度SVG路径计算器
 * 专门优化连接线的圆角转折算法，提供更平滑和精确的路径
 */

class PrecisionSVGPathCalculator {
  constructor(options = {}) {
    this.config = {
      cornerRadius: options.cornerRadius || 12,
      horizontalOffset: options.horizontalOffset || 4,
      minCornerRadius: options.minCornerRadius || 3,
      maxCornerRadius: options.maxCornerRadius || 20,
      smoothnessFactor: options.smoothnessFactor || 0.5,
      // 优化选项
      enableCaching: options.enableCaching !== false,
      enableGeometryValidation: options.enableGeometryValidation !== false,
      precisionDigits: options.precisionDigits || 2
    };
    
    // 路径缓存系统
    this.pathCache = new Map();
    this.geometryCache = new Map();
    
    // 性能统计
    this.performance = {
      cacheHits: 0,
      cacheMisses: 0,
      calculationsPerformed: 0,
      averageCalculationTime: 0
    };
  }

  /**
   * 计算精确的连接路径
   * @param {Object} messagePos - 消息位置信息
   * @param {Object} avatarPos - 头像位置信息  
   * @param {boolean} isFromAccount - 是否来自账号头像
   * @returns {string} SVG路径字符串
   */
  calculateConnectionPath(messagePos, avatarPos, isFromAccount = false) {
    const startTime = performance.now();
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey(messagePos, avatarPos, isFromAccount);
    
    // 检查缓存
    if (this.config.enableCaching && this.pathCache.has(cacheKey)) {
      this.performance.cacheHits++;
      return this.pathCache.get(cacheKey);
    }
    
    this.performance.cacheMisses++;
    this.performance.calculationsPerformed++;
    
    // 计算精确路径
    const pathData = isFromAccount 
      ? this.calculateAccountConnectionPath(messagePos, avatarPos)
      : this.calculateConversationConnectionPath(messagePos, avatarPos);
    
    // 缓存结果
    if (this.config.enableCaching) {
      this.pathCache.set(cacheKey, pathData);
      
      // 限制缓存大小
      if (this.pathCache.size > 1000) {
        const firstKey = this.pathCache.keys().next().value;
        this.pathCache.delete(firstKey);
      }
    }
    
    // 更新性能统计
    const calculationTime = performance.now() - startTime;
    this.updatePerformanceStats(calculationTime);
    
    return pathData;
  }

  /**
   * 计算账号头像连接路径（右侧连接）
   * 气泡右侧 → 右4px → 圆角转折 → 垂直到头像高度 → 圆角转折 → 水平到头像左边缘
   */
  calculateAccountConnectionPath(messagePos, avatarPos) {
    const geometry = this.calculateGeometry(messagePos, avatarPos, true);
    
    if (!this.validateGeometry(geometry)) {
      return this.generateFallbackPath(messagePos, avatarPos, true);
    }
    
    const {
      startX, startY, endX, endY,
      firstCornerX, firstCornerY,
      secondCornerX, secondCornerY,
      cornerRadius, direction
    } = geometry;
    
    // 使用三次贝塞尔曲线创建更平滑的圆角
    const path = this.buildSmoothPath([
      { type: 'M', x: startX, y: startY },
      { type: 'L', x: firstCornerX - cornerRadius, y: firstCornerY },
      { 
        type: 'C',
        cp1x: firstCornerX - cornerRadius * this.config.smoothnessFactor,
        cp1y: firstCornerY,
        cp2x: firstCornerX,
        cp2y: firstCornerY + (direction * cornerRadius * this.config.smoothnessFactor),
        x: firstCornerX,
        y: firstCornerY + (direction * cornerRadius)
      },
      { type: 'L', x: secondCornerX, y: secondCornerY - (direction * cornerRadius) },
      {
        type: 'C',
        cp1x: secondCornerX,
        cp1y: secondCornerY - (direction * cornerRadius * this.config.smoothnessFactor),
        cp2x: secondCornerX + (cornerRadius * this.config.smoothnessFactor),
        cp2y: secondCornerY,
        x: secondCornerX + cornerRadius,
        y: secondCornerY
      },
      { type: 'L', x: endX, y: endY }
    ]);
    
    return path;
  }

  /**
   * 计算会话头像连接路径（左侧连接）
   * 气泡左侧 → 左4px → 圆角转折 → 垂直到头像高度 → 圆角转折 → 水平到头像右边缘
   */
  calculateConversationConnectionPath(messagePos, avatarPos) {
    const geometry = this.calculateGeometry(messagePos, avatarPos, false);
    
    if (!this.validateGeometry(geometry)) {
      return this.generateFallbackPath(messagePos, avatarPos, false);
    }
    
    const {
      startX, startY, endX, endY,
      firstCornerX, firstCornerY,
      secondCornerX, secondCornerY,
      cornerRadius, direction
    } = geometry;
    
    const path = this.buildSmoothPath([
      { type: 'M', x: startX, y: startY },
      { type: 'L', x: firstCornerX + cornerRadius, y: firstCornerY },
      {
        type: 'C',
        cp1x: firstCornerX + cornerRadius * this.config.smoothnessFactor,
        cp1y: firstCornerY,
        cp2x: firstCornerX,
        cp2y: firstCornerY + (direction * cornerRadius * this.config.smoothnessFactor),
        x: firstCornerX,
        y: firstCornerY + (direction * cornerRadius)
      },
      { type: 'L', x: secondCornerX, y: secondCornerY - (direction * cornerRadius) },
      {
        type: 'C',
        cp1x: secondCornerX,
        cp1y: secondCornerY - (direction * cornerRadius * this.config.smoothnessFactor),
        cp2x: secondCornerX - (cornerRadius * this.config.smoothnessFactor),
        cp2y: secondCornerY,
        x: secondCornerX - cornerRadius,
        y: secondCornerY
      },
      { type: 'L', x: endX, y: endY }
    ]);
    
    return path;
  }

  /**
   * 计算几何参数
   */
  calculateGeometry(messagePos, avatarPos, isFromAccount) {
    const cacheKey = `geom_${this.generateCacheKey(messagePos, avatarPos, isFromAccount)}`;
    
    if (this.config.enableCaching && this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey);
    }
    
    const startX = isFromAccount ? messagePos.right : messagePos.left;
    const startY = messagePos.centerY;
    const endX = isFromAccount ? avatarPos.left : avatarPos.right;
    const endY = avatarPos.centerY;
    
    const horizontalOffset = this.config.horizontalOffset;
    const firstCornerX = isFromAccount 
      ? startX + horizontalOffset 
      : startX - horizontalOffset;
    const firstCornerY = startY;
    const secondCornerX = firstCornerX;
    const secondCornerY = endY;
    
    // 动态计算圆角半径
    const distance = Math.abs(endY - startY);
    const horizontalDistance = Math.abs(endX - firstCornerX);
    const maxAllowedRadius = Math.min(
      distance / 2,
      horizontalDistance / 2,
      this.config.maxCornerRadius
    );
    const cornerRadius = Math.max(
      this.config.minCornerRadius,
      Math.min(this.config.cornerRadius, maxAllowedRadius)
    );
    
    const direction = startY < endY ? 1 : -1;
    
    const geometry = {
      startX, startY, endX, endY,
      firstCornerX, firstCornerY,
      secondCornerX, secondCornerY,
      cornerRadius, direction,
      distance, horizontalDistance
    };
    
    if (this.config.enableCaching) {
      this.geometryCache.set(cacheKey, geometry);
    }
    
    return geometry;
  }

  /**
   * 验证几何参数有效性
   */
  validateGeometry(geometry) {
    if (!this.config.enableGeometryValidation) return true;
    
    const { distance, horizontalDistance, cornerRadius } = geometry;
    
    // 检查距离是否足够进行圆角转折
    if (distance < cornerRadius * 2) return false;
    if (horizontalDistance < cornerRadius) return false;
    
    // 检查坐标是否有效
    if (isNaN(geometry.startX) || isNaN(geometry.startY) || 
        isNaN(geometry.endX) || isNaN(geometry.endY)) return false;
    
    return true;
  }

  /**
   * 构建平滑路径
   */
  buildSmoothPath(pathPoints) {
    return pathPoints.map(point => {
      const x = this.roundToprecision(point.x);
      const y = this.roundToprecision(point.y);
      
      switch (point.type) {
        case 'M':
          return `M ${x} ${y}`;
        case 'L':
          return `L ${x} ${y}`;
        case 'C':
          const cp1x = this.roundToPrecision(point.cp1x);
          const cp1y = this.roundToPrecision(point.cp1y);
          const cp2x = this.roundToPrecision(point.cp2x);
          const cp2y = this.roundToPrecision(point.cp2y);
          return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y}`;
        case 'Q':
          const cpx = this.roundToPrecision(point.cpx);
          const cpy = this.roundToPrecision(point.cpy);
          return `Q ${cpx} ${cpy} ${x} ${y}`;
        default:
          return '';
      }
    }).join(' ');
  }

  /**
   * 生成备用路径（当几何验证失败时）
   */
  generateFallbackPath(messagePos, avatarPos, isFromAccount) {
    const startX = isFromAccount ? messagePos.right : messagePos.left;
    const startY = messagePos.centerY;
    const endX = isFromAccount ? avatarPos.left : avatarPos.right;
    const endY = avatarPos.centerY;
    
    // 简单的直线连接
    return `M ${this.roundToPrecision(startX)} ${this.roundToPrecision(startY)} L ${this.roundToPrecision(endX)} ${this.roundToPrecision(endY)}`;
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(messagePos, avatarPos, isFromAccount) {
    const key = [
      this.roundToPrecision(messagePos.left),
      this.roundToPrecision(messagePos.right),
      this.roundToPrecision(messagePos.centerY),
      this.roundToPrecision(avatarPos.left),
      this.roundToPrecision(avatarPos.right),
      this.roundToPrecision(avatarPos.centerY),
      isFromAccount ? 1 : 0
    ].join('_');
    
    return key;
  }

  /**
   * 数值精度处理
   */
  roundToPrecision(value) {
    const factor = Math.pow(10, this.config.precisionDigits);
    return Math.round(value * factor) / factor;
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats(calculationTime) {
    const count = this.performance.calculationsPerformed;
    this.performance.averageCalculationTime = 
      (this.performance.averageCalculationTime * (count - 1) + calculationTime) / count;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.pathCache.clear();
    this.geometryCache.clear();
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      cacheSize: this.pathCache.size,
      geometryCacheSize: this.geometryCache.size,
      cacheHitRate: this.performance.cacheHits / (this.performance.cacheHits + this.performance.cacheMisses) * 100
    };
  }

  /**
   * 预计算常用路径
   */
  precomputeCommonPaths(messagePositions, avatarPositions) {
    console.log('🚀 开始预计算常用路径...');
    
    const startTime = performance.now();
    let precomputedCount = 0;
    
    messagePositions.forEach(msgPos => {
      avatarPositions.forEach(avatarPos => {
        // 预计算两种类型的连接
        this.calculateConnectionPath(msgPos, avatarPos, true);
        this.calculateConnectionPath(msgPos, avatarPos, false);
        precomputedCount += 2;
      });
    });
    
    const endTime = performance.now();
    console.log(`✅ 预计算完成: ${precomputedCount} 条路径, 耗时 ${(endTime - startTime).toFixed(2)}ms`);
  }
}

export default PrecisionSVGPathCalculator;