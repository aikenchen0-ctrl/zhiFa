/**
 * 核心类型定义
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export interface BoundingBox extends Rect {}

export type AnchorPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type Direction = 'left' | 'right' | 'top' | 'bottom';

export interface ConnectionPoint {
  element: HTMLElement;
  anchor: AnchorPosition;
  offset?: Point;
}

export interface BezierPath {
  start: Point;
  controlPoint1: Point;
  controlPoint2: Point;
  end: Point;
}

export interface PathOptions {
  curvature?: number;
  maxCurvature?: number;
  startDirection?: Direction;
  endDirection?: Direction;
  avoidObstacles?: boolean;
}

export interface ConnectionStyle {
  width: number;
  color: string;
  startColor?: string;
  endColor?: string;
  opacity?: number;
  gradient?: boolean;
  animated?: boolean;
  animationSpeed?: number;
  dashArray?: number[];
  arrowStart?: boolean;
  arrowEnd?: boolean;
}

export interface Connection {
  id: string;
  start: ConnectionPoint;
  end: ConnectionPoint;
  path?: BezierPath;
  style: ConnectionStyle;
  boundingBox?: BoundingBox;
  visible?: boolean;
  zIndex?: number;
}

export interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  repeat?: boolean;
}

export interface PerformanceConfig {
  targetFPS: number;
  maxConnections: number;
  enablePerformanceMonitoring: boolean;
  adaptiveQuality: boolean;
}

export type RenderQuality = 'low' | 'medium' | 'high';

export interface SystemConfig {
  canvas: HTMLCanvasElement;
  connectionCount?: number;
  performance?: PerformanceConfig;
  enableTouch?: boolean;
  enableCollisionDetection?: boolean;
}

export interface UpdateCallback {
  (id: string, position: DOMRect): void;
}

export interface CollisionPair extends Array<string> {
  0: string;
  1: string;
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  connectionCount: number;
  memoryUsage?: number;
}