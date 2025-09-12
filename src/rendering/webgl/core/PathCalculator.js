/**
 * 路径计算引擎
 * 负责计算连接线的精确路径，包括圆角转折
 */

export class PathCalculator {
  constructor(options = {}) {
    this.options = {
      cornerRadius: 8,
      horizontalExtend: 5,
      minVerticalDistance: 10,
      pathPrecision: 0.1,
      ...options
    };
  }

  /**
   * 计算连接线路径
   * @param {Object} bubble - 气泡位置和尺寸信息
   * @param {Object} avatar - 头像位置和尺寸信息
   * @param {boolean} isSelf - 是否为自己发送的消息
   * @returns {Array} 路径点数组
   */
  calculateConnectionPath(bubble, avatar, isSelf = false) {
    if (!bubble || !avatar) {
      return [];
    }

    const { cornerRadius, horizontalExtend } = this.options;
    
    // 确定起点和终点
    const startPoint = this.getConnectionPoint(bubble, isSelf ? 'right' : 'left');
    const endPoint = this.getConnectionPoint(avatar, isSelf ? 'left' : 'right');

    // 计算中间控制点
    const controlPoints = this.calculateControlPoints(startPoint, endPoint, isSelf);
    
    // 生成完整路径
    return this.generateSmoothPath(startPoint, controlPoints, endPoint);
  }

  /**
   * 获取元素的连接点
   * @param {Object} element - 元素位置和尺寸
   * @param {string} side - 连接边 ('left', 'right', 'top', 'bottom')
   * @returns {Object} 连接点坐标
   */
  getConnectionPoint(element, side) {
    const { x, y, width, height } = element;
    
    switch (side) {
      case 'left':
        return { x, y: y + height / 2 };
      case 'right':
        return { x: x + width, y: y + height / 2 };
      case 'top':
        return { x: x + width / 2, y };
      case 'bottom':
        return { x: x + width / 2, y: y + height };
      default:
        return { x: x + width / 2, y: y + height / 2 };
    }
  }

  /**
   * 计算路径控制点
   * @param {Object} start - 起始点
   * @param {Object} end - 结束点
   * @param {boolean} isSelf - 是否为自己发送
   * @returns {Array} 控制点数组
   */
  calculateControlPoints(start, end, isSelf) {
    const { horizontalExtend, cornerRadius } = this.options;
    const direction = isSelf ? 1 : -1;
    
    // 水平延伸点
    const horizontalPoint = {
      x: start.x + (horizontalExtend * direction),
      y: start.y
    };

    // 垂直转折点
    const verticalPoint = {
      x: horizontalPoint.x,
      y: end.y
    };

    // 如果起点和终点在同一水平线上，简化路径
    if (Math.abs(start.y - end.y) < 5) {
      return [horizontalPoint];
    }

    // 添加圆角处理的控制点
    const controlPoints = [];
    
    // 第一个圆角（水平到垂直）
    if (Math.abs(verticalPoint.y - start.y) > cornerRadius * 2) {
      const cornerStart = {
        x: horizontalPoint.x,
        y: start.y + (start.y < end.y ? cornerRadius : -cornerRadius)
      };
      controlPoints.push(horizontalPoint, cornerStart);
    } else {
      controlPoints.push(horizontalPoint);
    }

    // 垂直段
    if (Math.abs(verticalPoint.y - start.y) > cornerRadius * 2) {
      const cornerEnd = {
        x: horizontalPoint.x,
        y: end.y + (start.y < end.y ? -cornerRadius : cornerRadius)
      };
      controlPoints.push(cornerEnd, verticalPoint);
    }

    return controlPoints;
  }

  /**
   * 生成平滑路径
   * @param {Object} start - 起始点
   * @param {Array} controlPoints - 控制点
   * @param {Object} end - 结束点
   * @returns {Array} 路径点数组
   */
  generateSmoothPath(start, controlPoints, end) {
    const path = [start];
    const { cornerRadius } = this.options;
    
    let currentPoint = start;
    
    for (let i = 0; i < controlPoints.length; i++) {
      const controlPoint = controlPoints[i];
      const nextPoint = i < controlPoints.length - 1 ? controlPoints[i + 1] : end;
      
      // 如果需要圆角过渡
      if (this.needsCornerTransition(currentPoint, controlPoint, nextPoint)) {
        const cornerPoints = this.generateCornerTransition(
          currentPoint, 
          controlPoint, 
          nextPoint, 
          cornerRadius
        );
        path.push(...cornerPoints);
      } else {
        path.push(controlPoint);
      }
      
      currentPoint = controlPoint;
    }
    
    // 添加终点的圆角过渡
    if (controlPoints.length > 0) {
      const lastControl = controlPoints[controlPoints.length - 1];
      if (this.needsCornerTransition(lastControl, end, null)) {
        const cornerPoints = this.generateCornerTransition(
          lastControl, 
          end, 
          null, 
          cornerRadius
        );
        path.push(...cornerPoints.slice(0, -1)); // 排除重复的终点
      }
    }
    
    path.push(end);
    return path;
  }

  /**
   * 判断是否需要圆角过渡
   * @param {Object} prev - 前一个点
   * @param {Object} current - 当前点
   * @param {Object} next - 下一个点
   * @returns {boolean} 是否需要圆角
   */
  needsCornerTransition(prev, current, next) {
    if (!prev || !current || !next) return false;
    
    const prevDirection = this.getDirection(prev, current);
    const nextDirection = this.getDirection(current, next);
    
    return prevDirection !== nextDirection;
  }

  /**
   * 获取两点间的方向
   * @param {Object} from - 起点
   * @param {Object} to - 终点
   * @returns {string} 方向 ('horizontal', 'vertical')
   */
  getDirection(from, to) {
    const deltaX = Math.abs(to.x - from.x);
    const deltaY = Math.abs(to.y - from.y);
    
    return deltaX > deltaY ? 'horizontal' : 'vertical';
  }

  /**
   * 生成圆角过渡点
   * @param {Object} prev - 前一个点
   * @param {Object} current - 转角点
   * @param {Object} next - 下一个点
   * @param {number} radius - 圆角半径
   * @returns {Array} 圆角过渡点
   */
  generateCornerTransition(prev, current, next, radius) {
    const points = [];
    const segments = 8; // 圆角分段数
    
    if (!next) {
      points.push(current);
      return points;
    }

    // 计算圆角的起始角度和结束角度
    const angle1 = Math.atan2(prev.y - current.y, prev.x - current.x);
    const angle2 = Math.atan2(next.y - current.y, next.x - current.x);
    
    let angleDiff = angle2 - angle1;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // 生成圆角点
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = angle1 + angleDiff * t;
      const x = current.x + radius * Math.cos(angle);
      const y = current.y + radius * Math.sin(angle);
      points.push({ x, y });
    }
    
    return points;
  }

  /**
   * 计算路径边界框
   * @param {Array} path - 路径点数组
   * @returns {Object} 边界框
   */
  calculateBounds(path) {
    if (!path || path.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = path[0].x;
    let minY = path[0].y;
    let maxX = path[0].x;
    let maxY = path[0].y;

    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 优化路径点（移除冗余点）
   * @param {Array} path - 原始路径
   * @param {number} tolerance - 简化容差
   * @returns {Array} 优化后的路径
   */
  simplifyPath(path, tolerance = 1) {
    if (!path || path.length <= 2) return path;

    const simplified = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const current = path[i];
      const next = path[i + 1];
      
      // 计算点到线段的距离
      const distance = this.pointToLineDistance(current, prev, next);
      
      if (distance > tolerance) {
        simplified.push(current);
      }
    }
    
    simplified.push(path[path.length - 1]);
    return simplified;
  }

  /**
   * 计算点到线段的距离
   * @param {Object} point - 点
   * @param {Object} lineStart - 线段起点
   * @param {Object} lineEnd - 线段终点
   * @returns {number} 距离
   */
  pointToLineDistance(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}