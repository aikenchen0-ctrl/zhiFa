// Mobile Touch Interaction Types
export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
  radiusX?: number;
  radiusY?: number;
}

export interface GestureEvent {
  type: GestureType;
  touches: TouchPoint[];
  deltaX?: number;
  deltaY?: number;
  velocity?: number;
  direction?: Direction;
  distance?: number;
  scale?: number;
  rotation?: number;
  center?: { x: number; y: number };
}

export enum GestureType {
  TAP = 'tap',
  DOUBLE_TAP = 'doubleTap',
  LONG_PRESS = 'longPress',
  SWIPE = 'swipe',
  PAN = 'pan',
  PINCH = 'pinch',
  ROTATE = 'rotate',
  MULTI_TOUCH = 'multiTouch'
}

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

export interface ScrollConfig {
  itemHeight: number;
  containerHeight: number;
  bufferSize: number;
  threshold: number;
}

export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  visibleItems: any[];
  totalHeight: number;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
}

export interface MobileDeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  platform: 'ios' | 'android' | 'unknown';
  viewport: {
    width: number;
    height: number;
  };
  dpr: number;
  hasTouch: boolean;
}

export interface OverlayState {
  isVisible: boolean;
  translateX: number;
  opacity: number;
  isAnimating: boolean;
}

export interface AvatarListState {
  currentSessionId?: string;
  scrollPosition: number;
  fixedSession: boolean;
}

export interface SplitScrollState {
  topScrollY: number;
  bottomScrollY: number;
  isTopScrolling: boolean;
  isBottomScrolling: boolean;
}