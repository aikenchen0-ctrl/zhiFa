// Performance optimization types and interfaces
export interface VirtualItem {
  index: number;
  key: string;
  size: number;
  offset: number;
  data?: any;
}

export interface VirtualScrollConfig {
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  containerWidth: number;
  overscan: number;
  bufferSize: number;
  recycleThreshold: number;
}

export interface MemoryPoolConfig {
  maxSize: number;
  initialSize: number;
  growthFactor: number;
  shrinkThreshold: number;
}

export interface AnimationConfig {
  useGPU: boolean;
  batchSize: number;
  frameRateLimit: number;
  compositeMode: 'software' | 'hardware';
  willChange: string[];
}

export interface ImageOptimizationConfig {
  useWebP: boolean;
  progressive: boolean;
  quality: number;
  sizes: number[];
  lazyThreshold: number;
  placeholderBlur: number;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  domNodeCount: number;
  paintTime: number;
  scriptTime: number;
  renderTime: number;
  gcTime: number;
  cacheHitRate: number;
}

export interface WebGLConfig {
  antialias: boolean;
  alpha: boolean;
  depth: boolean;
  stencil: boolean;
  premultipliedAlpha: boolean;
  preserveDrawingBuffer: boolean;
  batchSize: number;
  maxTextures: number;
}

export interface DeviceCapability {
  isMobile: boolean;
  isLowEndDevice: boolean;
  maxMemory: number;
  gpuTier: 'low' | 'medium' | 'high';
  supportedFeatures: string[];
}

export interface BenchmarkResult {
  testName: string;
  duration: number;
  fps: number;
  memoryPeak: number;
  success: boolean;
  details: Record<string, any>;
}

export interface OptimizationStrategy {
  virtualScrolling: boolean;
  memoryPooling: boolean;
  webglRendering: boolean;
  imageOptimization: boolean;
  animationOptimization: boolean;
  codesplitting: boolean;
}