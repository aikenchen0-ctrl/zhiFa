/**
 * 核心接口定义
 */

import { 
  Connection, 
  Point, 
  BoundingBox, 
  CollisionPair,
  RenderStats,
  BezierPath,
  PathOptions,
  UpdateCallback,
  Size
} from './types';

export interface IRenderer {
  render(connections: Connection[]): void;
  setDimensions(width: number, height: number): void;
  setQuality(quality: string): void;
  getStats(): RenderStats;
  destroy(): void;
}

export interface IPathCalculator {
  calculateBezierPath(start: Point, end: Point, options?: PathOptions): BezierPath;
  calculateAvoidancePath(start: Point, end: Point, obstacles: BoundingBox[]): BezierPath;
  simplifyPath(path: BezierPath, tolerance: number): BezierPath;
  getPathLength(path: BezierPath): number;
  getPointOnPath(path: BezierPath, t: number): Point;
}

export interface IRealTimeTracker {
  trackElement(id: string, element: HTMLElement, callback: UpdateCallback): void;
  untrackElement(id: string): void;
  updateAll(): void;
  getPosition(id: string): DOMRect | undefined;
  destroy(): void;
}

export interface ICollisionDetector {
  detectCollisions(connections: Connection[]): CollisionPair[];
  checkLineIntersection(line1: BezierPath, line2: BezierPath): boolean;
  updateSpatialGrid(connections: Connection[]): void;
  clear(): void;
}

export interface IPerformanceMonitor {
  startFrame(): void;
  endFrame(): void;
  getAverageFPS(): number;
  getFrameTime(): number;
  getMemoryUsage(): number;
  reset(): void;
}

export interface IAnimationEngine {
  animate(connection: Connection, config: any): void;
  stopAnimation(connectionId: string): void;
  pauseAll(): void;
  resumeAll(): void;
  setGlobalSpeed(speed: number): void;
}

export interface ISpatialGrid {
  insert(id: string, boundingBox: BoundingBox): void;
  remove(id: string): void;
  query(boundingBox: BoundingBox): string[];
  clear(): void;
  updateGrid(id: string, newBoundingBox: BoundingBox): void;
}

export interface ITouchHandler {
  setupTouchEvents(element: HTMLElement): void;
  enablePanZoom(): void;
  disablePanZoom(): void;
  getCurrentTransform(): { scale: number; translateX: number; translateY: number };
  destroy(): void;
}

export interface IConnectionManager {
  addConnection(connection: Connection): void;
  removeConnection(id: string): void;
  updateConnection(id: string, updates: Partial<Connection>): void;
  getConnection(id: string): Connection | undefined;
  getAllConnections(): Connection[];
  clear(): void;
}