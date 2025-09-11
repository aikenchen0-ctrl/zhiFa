/**
 * Canvas 渲染器
 * 高性能的 2D Canvas 渲染实现，适合中等复杂度的连接线动画
 */

import { IRenderer } from '../core/interfaces';
import { Connection, RenderStats, Point, BezierPath } from '../core/types';

export class CanvasRenderer implements IRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private stats: RenderStats;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsHistory: number[] = [];
  private quality: 'low' | 'medium' | 'high' = 'high';
  
  // 性能优化缓存
  private pathCache = new Map<string, Path2D>();
  private gradientCache = new Map<string, CanvasGradient>();
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas');
    }
    this.ctx = ctx;
    
    this.stats = {
      fps: 0,
      frameTime: 0,
      connectionCount: 0
    };
    
    // 设置高DPI支持
    this.setupHighDPI();
    
    // 优化 Canvas 设置
    this.optimizeCanvasSettings();
  }

  render(connections: Connection[]): void {
    const startTime = performance.now();
    
    // 清空画布
    this.clearCanvas();
    
    // 过滤可见连接
    const visibleConnections = connections.filter(conn => 
      conn.visible !== false && conn.path
    );
    
    // 按 z-index 排序
    visibleConnections.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    // 渲染连接线
    visibleConnections.forEach(connection => {
      this.renderConnection(connection);
    });
    
    // 更新统计信息
    const endTime = performance.now();
    this.updateStats(endTime - startTime, connections.length);
  }

  setDimensions(width: number, height: number): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 设置实际画布大小（考虑设备像素比）
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
    
    // 设置CSS显示大小
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // 缩放上下文以处理高DPI
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // 重新优化设置
    this.optimizeCanvasSettings();
    
    // 清理缓存
    this.clearCache();
  }

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.quality = quality;
    this.optimizeCanvasSettings();
    this.clearCache();
  }

  getStats(): RenderStats {
    return { ...this.stats };
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearCache();
  }

  // 私有方法

  private setupHighDPI(): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  private optimizeCanvasSettings(): void {
    // 根据质量设置进行优化
    switch (this.quality) {
      case 'high':
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        break;
      case 'medium':
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'medium';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        break;
      case 'low':
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.lineCap = 'butt';
        this.ctx.lineJoin = 'miter';
        break;
    }
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderConnection(connection: Connection): void {
    if (!connection.path) return;
    
    const { path, style } = connection;
    
    // 设置样式
    this.applyConnectionStyle(connection);
    
    // 绘制主要路径
    this.drawPath(path);
    
    // 绘制动画效果
    if (style.animated && this.quality !== 'low') {
      this.drawAnimatedParticles(connection);
    }
    
    // 绘制箭头
    if (style.arrowEnd || style.arrowStart) {
      this.drawArrows(connection);
    }
  }

  private applyConnectionStyle(connection: Connection): void {
    const { style } = connection;
    
    // 设置线宽
    this.ctx.lineWidth = style.width;
    
    // 设置颜色和渐变
    if (style.gradient && style.startColor && style.endColor) {
      const gradient = this.getOrCreateGradient(connection);
      this.ctx.strokeStyle = gradient;
    } else {
      this.ctx.strokeStyle = style.color;
    }
    
    // 设置透明度
    this.ctx.globalAlpha = style.opacity || 1;
    
    // 设置虚线
    if (style.dashArray && style.dashArray.length > 0) {
      this.ctx.setLineDash(style.dashArray);
    } else {
      this.ctx.setLineDash([]);
    }
  }

  private drawPath(path: BezierPath): void {
    this.ctx.beginPath();
    this.ctx.moveTo(path.start.x, path.start.y);
    this.ctx.bezierCurveTo(
      path.controlPoint1.x, path.controlPoint1.y,
      path.controlPoint2.x, path.controlPoint2.y,
      path.end.x, path.end.y
    );
    this.ctx.stroke();
  }

  private drawAnimatedParticles(connection: Connection): void {
    if (!connection.path) return;
    
    const time = performance.now() / 1000;
    const speed = connection.style.animationSpeed || 1;
    const particleCount = Math.max(1, Math.floor(connection.style.width / 2));
    
    this.ctx.save();
    
    for (let i = 0; i < particleCount; i++) {
      const t = ((time * speed + i / particleCount) % 1);
      const point = this.getPointOnBezierCurve(connection.path, t);
      
      // 绘制粒子
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = connection.style.color;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawArrows(connection: Connection): void {
    if (!connection.path) return;
    
    const { style, path } = connection;
    const arrowSize = Math.max(style.width * 2, 8);
    
    this.ctx.save();
    this.ctx.fillStyle = style.color;
    
    if (style.arrowStart) {
      this.drawArrowHead(path.start, this.getPathAngle(path, 0), arrowSize);
    }
    
    if (style.arrowEnd) {
      this.drawArrowHead(path.end, this.getPathAngle(path, 1) + Math.PI, arrowSize);
    }
    
    this.ctx.restore();
  }

  private drawArrowHead(point: Point, angle: number, size: number): void {
    const arrowAngle = Math.PI / 6; // 30 degrees
    
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
    this.ctx.lineTo(
      point.x - size * Math.cos(angle - arrowAngle),
      point.y - size * Math.sin(angle - arrowAngle)
    );
    this.ctx.lineTo(
      point.x - size * Math.cos(angle + arrowAngle),
      point.y - size * Math.sin(angle + arrowAngle)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  private getOrCreateGradient(connection: Connection): CanvasGradient {
    const { style, path } = connection;
    if (!path || !style.startColor || !style.endColor) {
      return this.ctx.createLinearGradient(0, 0, 0, 0); // fallback
    }
    
    const cacheKey = `${path.start.x},${path.start.y},${path.end.x},${path.end.y},${style.startColor},${style.endColor}`;
    
    let gradient = this.gradientCache.get(cacheKey);
    if (!gradient) {
      gradient = this.ctx.createLinearGradient(
        path.start.x, path.start.y,
        path.end.x, path.end.y
      );
      gradient.addColorStop(0, style.startColor);
      gradient.addColorStop(1, style.endColor);
      this.gradientCache.set(cacheKey, gradient);
    }
    
    return gradient;
  }

  private getPointOnBezierCurve(path: BezierPath, t: number): Point {
    const { start, controlPoint1, controlPoint2, end } = path;
    const u = 1 - t;
    
    return {
      x: u * u * u * start.x + 
         3 * u * u * t * controlPoint1.x + 
         3 * u * t * t * controlPoint2.x + 
         t * t * t * end.x,
      y: u * u * u * start.y + 
         3 * u * u * t * controlPoint1.y + 
         3 * u * t * t * controlPoint2.y + 
         t * t * t * end.y
    };
  }

  private getPathAngle(path: BezierPath, t: number): number {
    const { start, controlPoint1, controlPoint2, end } = path;
    const u = 1 - t;
    
    // 贝塞尔曲线的导数
    const dx = 3 * u * u * (controlPoint1.x - start.x) + 
               6 * u * t * (controlPoint2.x - controlPoint1.x) + 
               3 * t * t * (end.x - controlPoint2.x);
               
    const dy = 3 * u * u * (controlPoint1.y - start.y) + 
               6 * u * t * (controlPoint2.y - controlPoint1.y) + 
               3 * t * t * (end.y - controlPoint2.y);
    
    return Math.atan2(dy, dx);
  }

  private updateStats(frameTime: number, connectionCount: number): void {
    this.frameCount++;
    this.stats.frameTime = frameTime;
    this.stats.connectionCount = connectionCount;
    
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    if (delta >= 1000) {
      const fps = (this.frameCount * 1000) / delta;
      this.stats.fps = Math.round(fps);
      
      // 维护FPS历史
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  private clearCache(): void {
    this.pathCache.clear();
    this.gradientCache.clear();
  }

  /**
   * 获取平均FPS
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * 批量渲染优化
   * 对大量连接线进行批量处理以提升性能
   */
  renderBatch(connections: Connection[]): void {
    if (connections.length === 0) return;
    
    // 按样式分组以减少状态切换
    const groupedConnections = this.groupConnectionsByStyle(connections);
    
    this.clearCanvas();
    
    groupedConnections.forEach(group => {
      // 设置一次样式，渲染所有相同样式的连接线
      this.applyConnectionStyle(group[0]);
      
      group.forEach(connection => {
        if (connection.path) {
          this.drawPath(connection.path);
        }
      });
    });
  }

  private groupConnectionsByStyle(connections: Connection[]): Connection[][] {
    const groups = new Map<string, Connection[]>();
    
    connections.forEach(connection => {
      const styleKey = this.getStyleKey(connection.style);
      if (!groups.has(styleKey)) {
        groups.set(styleKey, []);
      }
      groups.get(styleKey)!.push(connection);
    });
    
    return Array.from(groups.values());
  }

  private getStyleKey(style: any): string {
    return `${style.width}-${style.color}-${style.opacity || 1}-${style.gradient || false}`;
  }
}