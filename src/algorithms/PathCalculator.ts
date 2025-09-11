/**
 * 路径计算器
 * 负责计算连接线的贝塞尔曲线路径，包括避障和优化功能
 */

import { IPathCalculator } from '../core/interfaces';
import { Point, BezierPath, PathOptions, BoundingBox } from '../core/types';

export class PathCalculator implements IPathCalculator {
  
  calculateBezierPath(start: Point, end: Point, options: PathOptions = {}): BezierPath {
    const {
      curvature = 0.3,
      maxCurvature = 100,
      startDirection = 'right',
      endDirection = 'left'
    } = options;

    const distance = this.getDistance(start, end);
    const controlDistance = Math.min(distance * curvature, maxCurvature);

    const controlPoint1 = this.calculateControlPoint(start, startDirection, controlDistance);
    const controlPoint2 = this.calculateControlPoint(end, endDirection, controlDistance);

    return {
      start,
      controlPoint1,
      controlPoint2,
      end
    };
  }

  calculateAvoidancePath(start: Point, end: Point, obstacles: BoundingBox[]): BezierPath {
    // 首先尝试直接路径
    const directPath = this.calculateBezierPath(start, end);
    
    if (obstacles.length === 0 || !this.pathIntersectsObstacles(directPath, obstacles)) {
      return directPath;
    }

    // 如果有碰撞，寻找避障路径
    return this.findAvoidancePath(start, end, obstacles);
  }

  simplifyPath(path: BezierPath, tolerance: number): BezierPath {
    // 使用 Douglas-Peucker 算法简化路径
    const points = this.pathToPoints(path, 20); // 将贝塞尔曲线转换为点序列
    const simplifiedPoints = this.douglasPeucker(points, tolerance);
    
    // 将简化的点重新拟合为贝塞尔曲线
    return this.pointsToBezier(simplifiedPoints);
  }

  getPathLength(path: BezierPath): number {
    // 使用数值积分计算贝塞尔曲线长度
    let length = 0;
    const steps = 100;
    
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      
      const point1 = this.getPointOnPath(path, t1);
      const point2 = this.getPointOnPath(path, t2);
      
      length += this.getDistance(point1, point2);
    }
    
    return length;
  }

  getPointOnPath(path: BezierPath, t: number): Point {
    // 三次贝塞尔曲线参数方程
    const { start, controlPoint1, controlPoint2, end } = path;
    const u = 1 - t;
    
    const x = u * u * u * start.x + 
              3 * u * u * t * controlPoint1.x + 
              3 * u * t * t * controlPoint2.x + 
              t * t * t * end.x;
              
    const y = u * u * u * start.y + 
              3 * u * u * t * controlPoint1.y + 
              3 * u * t * t * controlPoint2.y + 
              t * t * t * end.y;
    
    return { x, y };
  }

  // 私有辅助方法

  private getDistance(point1: Point, point2: Point): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateControlPoint(point: Point, direction: string, distance: number): Point {
    switch (direction) {
      case 'right':
        return { x: point.x + distance, y: point.y };
      case 'left':
        return { x: point.x - distance, y: point.y };
      case 'top':
        return { x: point.x, y: point.y - distance };
      case 'bottom':
        return { x: point.x, y: point.y + distance };
      default:
        return { x: point.x + distance, y: point.y };
    }
  }

  private pathIntersectsObstacles(path: BezierPath, obstacles: BoundingBox[]): boolean {
    // 将贝塞尔曲线分解为线段序列进行碰撞检测
    const points = this.pathToPoints(path, 50);
    
    for (let i = 0; i < points.length - 1; i++) {
      const lineStart = points[i];
      const lineEnd = points[i + 1];
      
      for (const obstacle of obstacles) {
        if (this.lineIntersectsRect(lineStart, lineEnd, obstacle)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private lineIntersectsRect(lineStart: Point, lineEnd: Point, rect: BoundingBox): boolean {
    // 检查线段是否与矩形相交
    // 使用 Liang-Barsky 算法
    
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    const p = [-dx, dx, -dy, dy];
    const q = [
      lineStart.x - rect.x,
      rect.x + rect.width - lineStart.x,
      lineStart.y - rect.y,
      rect.y + rect.height - lineStart.y
    ];
    
    let u1 = 0;
    let u2 = 1;
    
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0 && u1 < t) {
          u1 = t;
        } else if (p[i] > 0 && u2 > t) {
          u2 = t;
        }
      }
    }
    
    return u1 < u2;
  }

  private findAvoidancePath(start: Point, end: Point, obstacles: BoundingBox[]): BezierPath {
    // 实现简单的避障算法
    // 在起点和终点之间找到一个安全的中间点
    
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };
    
    // 尝试在垂直方向上偏移中间点
    const offset = 100;
    const candidates = [
      { x: midPoint.x, y: midPoint.y - offset },
      { x: midPoint.x, y: midPoint.y + offset },
      { x: midPoint.x - offset, y: midPoint.y },
      { x: midPoint.x + offset, y: midPoint.y }
    ];
    
    for (const candidate of candidates) {
      const path1 = this.calculateBezierPath(start, candidate);
      const path2 = this.calculateBezierPath(candidate, end);
      
      if (!this.pathIntersectsObstacles(path1, obstacles) && 
          !this.pathIntersectsObstacles(path2, obstacles)) {
        
        // 组合两个路径为一个复合贝塞尔曲线
        return this.combinePaths(path1, path2);
      }
    }
    
    // 如果找不到避障路径，返回直接路径
    return this.calculateBezierPath(start, end);
  }

  private pathToPoints(path: BezierPath, numPoints: number): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      points.push(this.getPointOnPath(path, t));
    }
    
    return points;
  }

  private douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    
    let maxDistance = 0;
    let maxIndex = 0;
    
    // 找到距离起点和终点连线最远的点
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(
        points[i], 
        points[0], 
        points[points.length - 1]
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    // 如果最大距离超过容差，递归简化
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
      
      return left.slice(0, -1).concat(right);
    }
    
    return [points[0], points[points.length - 1]];
  }

  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = lineEnd.x - lineStart.x;
    const B = lineEnd.y - lineStart.y;
    const C = point.x - lineStart.x;
    const D = point.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = A * A + B * B;
    
    if (lenSq === 0) return this.getDistance(point, lineStart);
    
    const param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * A;
      yy = lineStart.y + param * B;
    }
    
    return this.getDistance(point, { x: xx, y: yy });
  }

  private pointsToBezier(points: Point[]): BezierPath {
    if (points.length < 2) {
      throw new Error('At least 2 points required to create a bezier path');
    }
    
    const start = points[0];
    const end = points[points.length - 1];
    
    // 简单的控制点计算
    const distance = this.getDistance(start, end);
    const controlDistance = distance * 0.25;
    
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const perpAngle1 = angle + Math.PI / 4;
    const perpAngle2 = angle - Math.PI / 4;
    
    const controlPoint1 = {
      x: start.x + Math.cos(perpAngle1) * controlDistance,
      y: start.y + Math.sin(perpAngle1) * controlDistance
    };
    
    const controlPoint2 = {
      x: end.x + Math.cos(perpAngle2) * controlDistance,
      y: end.y + Math.sin(perpAngle2) * controlDistance
    };
    
    return { start, controlPoint1, controlPoint2, end };
  }

  private combinePaths(path1: BezierPath, path2: BezierPath): BezierPath {
    // 简化的路径组合，实际应用中可能需要更复杂的算法
    return {
      start: path1.start,
      controlPoint1: path1.controlPoint1,
      controlPoint2: path2.controlPoint2,
      end: path2.end
    };
  }

  /**
   * 计算两点之间的最优曲线
   * 考虑起点和终点的方向约束
   */
  calculateOptimalCurve(
    start: Point, 
    end: Point, 
    startAngle?: number, 
    endAngle?: number,
    strength: number = 0.5
  ): BezierPath {
    const distance = this.getDistance(start, end);
    const controlDistance = distance * strength;
    
    let controlPoint1: Point;
    let controlPoint2: Point;
    
    if (startAngle !== undefined) {
      controlPoint1 = {
        x: start.x + Math.cos(startAngle) * controlDistance,
        y: start.y + Math.sin(startAngle) * controlDistance
      };
    } else {
      // 默认向右
      controlPoint1 = {
        x: start.x + controlDistance,
        y: start.y
      };
    }
    
    if (endAngle !== undefined) {
      controlPoint2 = {
        x: end.x + Math.cos(endAngle + Math.PI) * controlDistance,
        y: end.y + Math.sin(endAngle + Math.PI) * controlDistance
      };
    } else {
      // 默认向左
      controlPoint2 = {
        x: end.x - controlDistance,
        y: end.y
      };
    }
    
    return {
      start,
      controlPoint1,
      controlPoint2,
      end
    };
  }
}