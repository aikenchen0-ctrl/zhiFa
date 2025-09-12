import { Position, Size } from '@/types/overlay';

export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateAngle(from: Position, to: Position): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function isPointInRect(point: Position, rect: Position & Size): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function clampPosition(position: Position, bounds: Size): Position {
  return {
    x: Math.max(0, Math.min(bounds.width, position.x)),
    y: Math.max(0, Math.min(bounds.height, position.y)),
  };
}

export function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function interpolatePosition(start: Position, end: Position, progress: number): Position {
  return {
    x: interpolate(start.x, end.x, progress),
    y: interpolate(start.y, end.y, progress),
  };
}