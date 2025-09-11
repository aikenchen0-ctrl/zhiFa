/**
 * 连接线动画系统主类
 * 整合所有组件，提供统一的API接口
 */

import { 
  IRenderer, 
  IRealTimeTracker, 
  IPathCalculator, 
  IConnectionManager,
  IPerformanceMonitor 
} from './interfaces';
import { 
  Connection, 
  SystemConfig, 
  ConnectionPoint, 
  ConnectionStyle,
  Point,
  AnchorPosition
} from './types';

import { RealTimeTracker } from '../algorithms/RealTimeTracker';
import { PathCalculator } from '../algorithms/PathCalculator';
import { CanvasRenderer } from '../renderers/CanvasRenderer';

class ConnectionManager implements IConnectionManager {
  private connections = new Map<string, Connection>();

  addConnection(connection: Connection): void {
    this.connections.set(connection.id, connection);
  }

  removeConnection(id: string): void {
    this.connections.delete(id);
  }

  updateConnection(id: string, updates: Partial<Connection>): void {
    const connection = this.connections.get(id);
    if (connection) {
      Object.assign(connection, updates);
    }
  }

  getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  clear(): void {
    this.connections.clear();
  }
}

class PerformanceMonitor implements IPerformanceMonitor {
  private frameStartTime = 0;
  private frameCount = 0;
  private totalFrameTime = 0;
  private fpsHistory: number[] = [];
  private lastSecond = 0;

  startFrame(): void {
    this.frameStartTime = performance.now();
  }

  endFrame(): void {
    const frameTime = performance.now() - this.frameStartTime;
    this.totalFrameTime += frameTime;
    this.frameCount++;

    const now = Math.floor(performance.now() / 1000);
    if (now !== this.lastSecond) {
      this.fpsHistory.push(this.frameCount);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      this.frameCount = 0;
      this.lastSecond = now;
    }
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  getFrameTime(): number {
    return this.frameCount > 0 ? this.totalFrameTime / this.frameCount : 0;
  }

  getMemoryUsage(): number {
    // @ts-ignore - performance.memory may not be available in all browsers
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  reset(): void {
    this.frameCount = 0;
    this.totalFrameTime = 0;
    this.fpsHistory = [];
  }
}

export class ConnectionAnimationSystem {
  private renderer: IRenderer;
  private tracker: IRealTimeTracker;
  private pathCalculator: IPathCalculator;
  private connectionManager: IConnectionManager;
  private performanceMonitor: IPerformanceMonitor;
  
  private animationFrameId: number | null = null;
  private isRunning = false;
  private config: SystemConfig;

  constructor(config: SystemConfig) {
    this.config = config;
    
    // 初始化各个组件
    this.renderer = this.createRenderer(config);
    this.tracker = new RealTimeTracker();
    this.pathCalculator = new PathCalculator();
    this.connectionManager = new ConnectionManager();
    this.performanceMonitor = new PerformanceMonitor();
    
    // 绑定位置更新回调
    this.setupPositionTracking();
  }

  /**
   * 添加连接线
   */
  addConnection(
    id: string,
    startElement: HTMLElement,
    endElement: HTMLElement,
    style: ConnectionStyle,
    options?: {
      startAnchor?: AnchorPosition;
      endAnchor?: AnchorPosition;
      startOffset?: Point;
      endOffset?: Point;
    }
  ): void {
    const connection: Connection = {
      id,
      start: {
        element: startElement,
        anchor: options?.startAnchor || 'center',
        offset: options?.startOffset
      },
      end: {
        element: endElement,
        anchor: options?.endAnchor || 'center',
        offset: options?.endOffset
      },
      style,
      visible: true,
      zIndex: 0
    };

    this.connectionManager.addConnection(connection);

    // 开始追踪元素位置
    this.tracker.trackElement(`${id}-start`, startElement, this.onPositionUpdate.bind(this));
    this.tracker.trackElement(`${id}-end`, endElement, this.onPositionUpdate.bind(this));

    // 立即计算路径
    this.updateConnectionPath(connection);
  }

  /**
   * 移除连接线
   */
  removeConnection(id: string): void {
    this.tracker.untrackElement(`${id}-start`);
    this.tracker.untrackElement(`${id}-end`);
    this.connectionManager.removeConnection(id);
  }

  /**
   * 更新连接线样式
   */
  updateConnectionStyle(id: string, style: Partial<ConnectionStyle>): void {
    const connection = this.connectionManager.getConnection(id);
    if (connection) {
      connection.style = { ...connection.style, ...style };
    }
  }

  /**
   * 显示/隐藏连接线
   */
  setConnectionVisible(id: string, visible: boolean): void {
    this.connectionManager.updateConnection(id, { visible });
  }

  /**
   * 开始动画循环
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animationLoop();
  }

  /**
   * 停止动画循环
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      renderer: this.renderer.getStats(),
      monitor: {
        averageFPS: this.performanceMonitor.getAverageFPS(),
        frameTime: this.performanceMonitor.getFrameTime(),
        memoryUsage: this.performanceMonitor.getMemoryUsage()
      },
      connectionCount: this.connectionManager.getAllConnections().length
    };
  }

  /**
   * 设置渲染质量
   */
  setRenderQuality(quality: 'low' | 'medium' | 'high'): void {
    this.renderer.setQuality(quality);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stop();
    this.tracker.destroy();
    this.renderer.destroy();
    this.connectionManager.clear();
  }

  // 私有方法

  private createRenderer(config: SystemConfig): IRenderer {
    // 根据配置和连接数量选择最适合的渲染器
    const connectionCount = config.connectionCount || 0;
    
    if (connectionCount > 1000) {
      // TODO: 实现 WebGL 渲染器
      // return new WebGLRenderer(config.canvas);
      console.warn('WebGL renderer not implemented, falling back to Canvas');
    }
    
    return new CanvasRenderer(config.canvas);
  }

  private setupPositionTracking(): void {
    // 位置更新已在 addConnection 中设置
  }

  private onPositionUpdate = (elementId: string, position: DOMRect): void => {
    // 解析元素ID获取连接ID和类型
    const parts = elementId.split('-');
    const connectionId = parts.slice(0, -1).join('-');
    const type = parts[parts.length - 1]; // 'start' or 'end'
    
    const connection = this.connectionManager.getConnection(connectionId);
    if (connection) {
      this.updateConnectionPath(connection);
    }
  };

  private updateConnectionPath(connection: Connection): void {
    const startPos = this.getElementAnchorPosition(
      connection.start.element, 
      connection.start.anchor,
      connection.start.offset
    );
    
    const endPos = this.getElementAnchorPosition(
      connection.end.element, 
      connection.end.anchor,
      connection.end.offset
    );

    if (startPos && endPos) {
      const path = this.pathCalculator.calculateBezierPath(startPos, endPos, {
        curvature: 0.3,
        startDirection: this.getDirectionFromAnchor(connection.start.anchor),
        endDirection: this.getDirectionFromAnchor(connection.end.anchor)
      });

      connection.path = path;
      
      // 更新边界框用于碰撞检测
      connection.boundingBox = this.calculatePathBoundingBox(path);
    }
  }

  private getElementAnchorPosition(
    element: HTMLElement, 
    anchor: AnchorPosition,
    offset?: Point
  ): Point | null {
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    let x: number, y: number;
    
    switch (anchor) {
      case 'center':
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
        break;
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + rect.height / 2;
        break;
      case 'top-left':
        x = rect.left;
        y = rect.top;
        break;
      case 'top-right':
        x = rect.right;
        y = rect.top;
        break;
      case 'bottom-left':
        x = rect.left;
        y = rect.bottom;
        break;
      case 'bottom-right':
        x = rect.right;
        y = rect.bottom;
        break;
      default:
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }
    
    // 添加滚动偏移
    x += scrollX;
    y += scrollY;
    
    // 添加自定义偏移
    if (offset) {
      x += offset.x;
      y += offset.y;
    }
    
    return { x, y };
  }

  private getDirectionFromAnchor(anchor: AnchorPosition): 'left' | 'right' | 'top' | 'bottom' {
    switch (anchor) {
      case 'left':
      case 'top-left':
      case 'bottom-left':
        return 'left';
      case 'right':
      case 'top-right':
      case 'bottom-right':
        return 'right';
      case 'top':
        return 'top';
      case 'bottom':
        return 'bottom';
      default:
        return 'right';
    }
  }

  private calculatePathBoundingBox(path: any): any {
    // 简化的边界框计算
    const points = [path.start, path.controlPoint1, path.controlPoint2, path.end];
    
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private animationLoop = (): void => {
    if (!this.isRunning) return;

    this.performanceMonitor.startFrame();

    // 渲染所有连接线
    const connections = this.connectionManager.getAllConnections();
    this.renderer.render(connections);

    this.performanceMonitor.endFrame();

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  /**
   * 批量添加连接线（性能优化）
   */
  addConnections(connections: Array<{
    id: string;
    startElement: HTMLElement;
    endElement: HTMLElement;
    style: ConnectionStyle;
    options?: any;
  }>): void {
    // 批量处理以提高性能
    connections.forEach(conn => {
      this.addConnection(
        conn.id,
        conn.startElement,
        conn.endElement,
        conn.style,
        conn.options
      );
    });
  }

  /**
   * 强制更新所有连接线路径
   */
  updateAllPaths(): void {
    const connections = this.connectionManager.getAllConnections();
    connections.forEach(connection => {
      this.updateConnectionPath(connection);
    });
  }
}