/**
 * 连接线批量渲染器 - 专为1000条连接线优化
 * 
 * 核心优化原理：
 * 1. 批量Path更新：将多个SVG路径更新合并到一个渲染帧
 * 2. 视口裁剪：只渲染可见区域的连接线，提升性能
 * 3. 几何计算优化：缓存路径计算结果，避免重复计算
 * 4. 分层渲染：将连接线分层管理，按优先级渲染
 * 5. 自适应LOD：基于缩放级别调整连接线细节程度
 */

import { ConnectionLine, ConnectionPoint, ConnectionConfig } from '../core/ConnectionSystem';

export interface BatchRenderConfig extends ConnectionConfig {
  batchSize: number; // 每批处理的连接线数量
  maxFPS: number; // 最大帧率限制
  enableViewportCulling: boolean; // 视口裁剪
  enableLOD: boolean; // 细节级别优化
  enablePathCaching: boolean; // 路径缓存
  cullingMargin: number; // 视口裁剪边距
  lodThresholds: number[]; // LOD阈值数组
}

export interface RenderViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number; // 缩放级别
}

export interface ConnectionBatch {
  id: string;
  connections: ConnectionLine[];
  priority: 'high' | 'medium' | 'low';
  dirty: boolean; // 是否需要重新渲染
  lastUpdate: number;
}

export interface PathCache {
  key: string; // 路径缓存键（基于起止点和参数）
  path: string;
  timestamp: number;
  usage: number; // 使用次数
}

export class ConnectionBatchRenderer {
  private config: BatchRenderConfig;
  private svgContainer: SVGElement;
  private viewport: RenderViewport;
  
  // 批次管理
  private batches = new Map<string, ConnectionBatch>();
  private renderQueue: string[] = []; // 待渲染批次队列
  private isRendering = false;
  
  // 路径缓存系统
  private pathCache = new Map<string, PathCache>();
  private maxCacheSize = 1000;
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // 性能监控
  private frameCount = 0;
  private lastFrameTime = 0;
  private renderTimes: number[] = [];
  private droppedFrames = 0;
  
  // 几何计算优化
  private geometryWorker: Worker | null = null;
  private workerQueue: Array<{
    id: string;
    resolve: (path: string) => void;
    reject: (error: Error) => void;
  }> = [];
  
  // LOD系统
  private lodLevels: Array<{
    threshold: number;
    strokeWidth: number;
    opacity: number;
    simplifyFactor: number;
  }> = [];
  
  constructor(svgContainer: SVGElement, config: Partial<BatchRenderConfig> = {}) {
    this.svgContainer = svgContainer;
    this.config = {
      // 继承基础配置
      cornerRadius: 8,
      strokeWidth: 2,
      color: 'rgba(59, 130, 246, 0.6)',
      opacity: 0.8,
      animationDuration: 300,
      
      // 批量渲染配置
      batchSize: 50,
      maxFPS: 60,
      enableViewportCulling: true,
      enableLOD: true,
      enablePathCaching: true,
      cullingMargin: 100,
      lodThresholds: [0.5, 1.0, 2.0],
      ...config
    };
    
    this.viewport = {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: 1.0
    };
    
    this.initializeLODLevels();
    this.initializeGeometryWorker();
    this.startRenderLoop();
    this.setupEventListeners();
    
    console.log('🎨 连接线批量渲染器初始化完成', {
      batchSize: this.config.batchSize,
      maxFPS: this.config.maxFPS,
      features: {
        viewportCulling: this.config.enableViewportCulling,
        lod: this.config.enableLOD,
        pathCaching: this.config.enablePathCaching
      }
    });
  }
  
  /**
   * 初始化LOD级别配置
   */
  private initializeLODLevels(): void {
    this.lodLevels = [
      // 远距离视图 (scale < 0.5)
      {
        threshold: 0.5,
        strokeWidth: 1,
        opacity: 0.4,
        simplifyFactor: 0.3
      },
      // 中等距离视图 (0.5 <= scale < 1.0)
      {
        threshold: 1.0,
        strokeWidth: 1.5,
        opacity: 0.6,
        simplifyFactor: 0.6
      },
      // 近距离视图 (1.0 <= scale < 2.0)
      {
        threshold: 2.0,
        strokeWidth: 2,
        opacity: 0.8,
        simplifyFactor: 1.0
      },
      // 超近距离视图 (scale >= 2.0)
      {
        threshold: Infinity,
        strokeWidth: 3,
        opacity: 1.0,
        simplifyFactor: 1.0
      }
    ];
  }
  
  /**
   * 初始化几何计算Web Worker
   */
  private initializeGeometryWorker(): void {
    try {
      // 创建内联Web Worker用于几何计算
      const workerScript = `
        // Web Worker for geometry calculations
        self.onmessage = function(e) {
          const { id, start, end, config, type } = e.data;
          
          try {
            const path = calculateConnectionPath(start, end, config, type);
            self.postMessage({ id, path, success: true });
          } catch (error) {
            self.postMessage({ id, error: error.message, success: false });
          }
        };
        
        function calculateConnectionPath(start, end, config, type) {
          const { cornerRadius } = config;
          const horizontalDistance = type === 'other' ? -5 : 5;
          const verticalDistance = end.y - start.y;
          
          const corner1 = {
            x: start.x + horizontalDistance,
            y: start.y
          };
          
          const corner2 = {
            x: start.x + horizontalDistance,
            y: end.y
          };
          
          let path = "M " + start.x + " " + start.y;
          
          if (Math.abs(horizontalDistance) > cornerRadius) {
            path += " L " + (corner1.x + (horizontalDistance > 0 ? -cornerRadius : cornerRadius)) + " " + corner1.y;
            path += " Q " + corner1.x + " " + corner1.y + " " + corner1.x + " " + (corner1.y + (verticalDistance > 0 ? cornerRadius : -cornerRadius));
            
            if (Math.abs(verticalDistance) > 2 * cornerRadius) {
              path += " L " + corner2.x + " " + (corner2.y + (verticalDistance > 0 ? -cornerRadius : cornerRadius));
            }
            
            path += " Q " + corner2.x + " " + corner2.y + " " + (corner2.x + (horizontalDistance > 0 ? cornerRadius : -cornerRadius)) + " " + corner2.y;
            path += " L " + end.x + " " + end.y;
          } else {
            path += " L " + end.x + " " + end.y;
          }
          
          return path;
        }
      `;
      
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      this.geometryWorker = new Worker(URL.createObjectURL(blob));
      
      this.geometryWorker.onmessage = (e) => {
        const { id, path, success, error } = e.data;
        const queueItem = this.workerQueue.find(item => item.id === id);
        
        if (queueItem) {
          if (success) {
            queueItem.resolve(path);
          } else {
            queueItem.reject(new Error(error));
          }
          
          // 从队列中移除
          const index = this.workerQueue.indexOf(queueItem);
          if (index > -1) {
            this.workerQueue.splice(index, 1);
          }
        }
      };
      
      console.log('🧮 几何计算Worker初始化完成');
    } catch (error) {
      console.warn('⚠️ Worker初始化失败，使用主线程计算:', error);
      this.geometryWorker = null;
    }
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 视口变化监听
    window.addEventListener('resize', this.handleViewportChange.bind(this));
    window.addEventListener('scroll', this.handleViewportChange.bind(this));
    
    // 缩放变化监听（如果支持）
    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
        this.updateScale(this.viewport.scale * scaleDelta);
      }
    }, { passive: false });
  }
  
  /**
   * 处理视口变化
   */
  private handleViewportChange(): void {
    const newViewport: RenderViewport = {
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: this.viewport.scale
    };
    
    const hasChanged = (
      this.viewport.x !== newViewport.x ||
      this.viewport.y !== newViewport.y ||
      this.viewport.width !== newViewport.width ||
      this.viewport.height !== newViewport.height
    );
    
    if (hasChanged) {
      this.viewport = newViewport;
      this.markAllBatchesDirty();
      this.scheduleRender();
    }
  }
  
  /**
   * 更新缩放级别
   */
  private updateScale(newScale: number): void {
    const oldScale = this.viewport.scale;
    this.viewport.scale = Math.max(0.1, Math.min(5.0, newScale));
    
    if (oldScale !== this.viewport.scale) {
      this.markAllBatchesDirty();
      this.scheduleRender();
      console.log(`🔍 缩放级别变化: ${oldScale.toFixed(2)} → ${this.viewport.scale.toFixed(2)}`);
    }
  }
  
  /**
   * 创建连接线批次
   */
  createBatch(batchId: string, connections: ConnectionLine[], priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const batch: ConnectionBatch = {
      id: batchId,
      connections: [...connections],
      priority,
      dirty: true,
      lastUpdate: performance.now()
    };
    
    this.batches.set(batchId, batch);
    this.scheduleRender();
    
    console.log(`📦 创建连接线批次: ${batchId} (${connections.length}条连接线, 优先级:${priority})`);
  }
  
  /**
   * 更新批次中的连接线
   */
  updateBatch(batchId: string, connections: ConnectionLine[]): void {
    const batch = this.batches.get(batchId);
    if (batch) {
      batch.connections = [...connections];
      batch.dirty = true;
      batch.lastUpdate = performance.now();
      this.scheduleRender();
    }
  }
  
  /**
   * 删除批次
   */
  deleteBatch(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (batch) {
      // 从SVG中移除对应的元素
      batch.connections.forEach(connection => {
        const element = this.svgContainer.querySelector(`#path-${connection.id}`);
        if (element) {
          element.remove();
        }
      });
      
      this.batches.delete(batchId);
      
      // 从渲染队列中移除
      const queueIndex = this.renderQueue.indexOf(batchId);
      if (queueIndex > -1) {
        this.renderQueue.splice(queueIndex, 1);
      }
    }
  }
  
  /**
   * 标记所有批次为脏状态
   */
  private markAllBatchesDirty(): void {
    this.batches.forEach(batch => {
      batch.dirty = true;
    });
  }
  
  /**
   * 调度渲染
   */
  private scheduleRender(): void {
    // 收集需要渲染的批次
    this.batches.forEach((batch, batchId) => {
      if (batch.dirty && !this.renderQueue.includes(batchId)) {
        this.renderQueue.push(batchId);
      }
    });
    
    // 按优先级排序
    this.renderQueue.sort((a, b) => {
      const batchA = this.batches.get(a)!;
      const batchB = this.batches.get(b)!;
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[batchB.priority] - priorityOrder[batchA.priority];
    });
  }
  
  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    const targetFrameTime = 1000 / this.config.maxFPS;
    
    const renderFrame = () => {
      const frameStart = performance.now();
      
      if (!this.isRendering && this.renderQueue.length > 0) {
        this.performBatchRender();
      }
      
      // 性能统计
      const frameTime = performance.now() - frameStart;
      this.updateFrameStats(frameTime, targetFrameTime);
      
      requestAnimationFrame(renderFrame);
    };
    
    requestAnimationFrame(renderFrame);
  }
  
  /**
   * 执行批量渲染
   */
  private async performBatchRender(): Promise<void> {
    if (this.isRendering || this.renderQueue.length === 0) return;
    
    this.isRendering = true;
    const renderStart = performance.now();
    
    try {
      // 限制每帧处理的批次数量
      const batchesToProcess = this.renderQueue.splice(0, Math.min(3, this.renderQueue.length));
      
      for (const batchId of batchesToProcess) {
        const batch = this.batches.get(batchId);
        if (batch && batch.dirty) {
          await this.renderBatch(batch);
          batch.dirty = false;
        }
      }
      
      const renderTime = performance.now() - renderStart;
      console.log(`🎨 批量渲染完成 - 处理批次:${batchesToProcess.length}, 耗时:${renderTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ 批量渲染失败:', error);
    } finally {
      this.isRendering = false;
    }
  }
  
  /**
   * 渲染单个批次
   */
  private async renderBatch(batch: ConnectionBatch): Promise<void> {
    const culledConnections = this.config.enableViewportCulling 
      ? this.performViewportCulling(batch.connections)
      : batch.connections;
    
    if (culledConnections.length === 0) {
      return;
    }
    
    // 获取当前LOD级别
    const lodLevel = this.getCurrentLODLevel();
    
    // 分块处理连接线
    const chunks = this.chunkArray(culledConnections, this.config.batchSize);
    
    for (const chunk of chunks) {
      await this.renderConnectionChunk(chunk, lodLevel);
      
      // 让出控制权，避免长时间阻塞主线程
      await this.yieldToMainThread();
    }
  }
  
  /**
   * 视口裁剪 - 只保留可见区域的连接线
   */
  private performViewportCulling(connections: ConnectionLine[]): ConnectionLine[] {
    const margin = this.config.cullingMargin;
    const viewBounds = {
      left: this.viewport.x - margin,
      top: this.viewport.y - margin,
      right: this.viewport.x + this.viewport.width + margin,
      bottom: this.viewport.y + this.viewport.height + margin
    };
    
    return connections.filter(connection => {
      const fromRect = connection.from.element.getBoundingClientRect();
      const toRect = connection.to.element.getBoundingClientRect();
      
      // 检查连接线的边界框是否与视口相交
      const lineBounds = {
        left: Math.min(fromRect.left, toRect.left),
        top: Math.min(fromRect.top, toRect.top),
        right: Math.max(fromRect.right, toRect.right),
        bottom: Math.max(fromRect.bottom, toRect.bottom)
      };
      
      return !(
        lineBounds.right < viewBounds.left ||
        lineBounds.left > viewBounds.right ||
        lineBounds.bottom < viewBounds.top ||
        lineBounds.top > viewBounds.bottom
      );
    });
  }
  
  /**
   * 获取当前LOD级别
   */
  private getCurrentLODLevel(): typeof this.lodLevels[0] {
    const scale = this.viewport.scale;
    
    for (const level of this.lodLevels) {
      if (scale < level.threshold) {
        return level;
      }
    }
    
    return this.lodLevels[this.lodLevels.length - 1];
  }
  
  /**
   * 渲染连接线块
   */
  private async renderConnectionChunk(
    connections: ConnectionLine[], 
    lodLevel: typeof this.lodLevels[0]
  ): Promise<void> {
    const pathPromises = connections.map(async (connection) => {
      const pathKey = this.generatePathCacheKey(connection);
      
      let path: string;
      
      if (this.config.enablePathCaching) {
        const cached = this.pathCache.get(pathKey);
        if (cached && this.isPathCacheValid(cached)) {
          path = cached.path;
          cached.usage++;
          this.cacheHits++;
        } else {
          path = await this.calculateConnectionPath(connection, lodLevel);
          this.cacheConnectionPath(pathKey, path);
          this.cacheMisses++;
        }
      } else {
        path = await this.calculateConnectionPath(connection, lodLevel);
      }
      
      return { connection, path, lodLevel };
    });
    
    const results = await Promise.all(pathPromises);
    
    // 批量更新DOM
    this.batchUpdateSVGPaths(results);
  }
  
  /**
   * 生成路径缓存键
   */
  private generatePathCacheKey(connection: ConnectionLine): string {
    const fromRect = connection.from.element.getBoundingClientRect();
    const toRect = connection.to.element.getBoundingClientRect();
    
    return `${connection.type}-${Math.round(fromRect.left)}-${Math.round(fromRect.top)}-${Math.round(toRect.left)}-${Math.round(toRect.top)}-${this.viewport.scale.toFixed(2)}`;
  }
  
  /**
   * 检查路径缓存是否有效
   */
  private isPathCacheValid(cached: PathCache): boolean {
    const maxAge = 5000; // 5秒缓存过期时间
    return (performance.now() - cached.timestamp) < maxAge;
  }
  
  /**
   * 缓存连接路径
   */
  private cacheConnectionPath(key: string, path: string): void {
    // 如果缓存已满，清理最少使用的项
    if (this.pathCache.size >= this.maxCacheSize) {
      this.evictLeastUsedCache();
    }
    
    this.pathCache.set(key, {
      key,
      path,
      timestamp: performance.now(),
      usage: 1
    });
  }
  
  /**
   * 清理最少使用的缓存项
   */
  private evictLeastUsedCache(): void {
    let leastUsed: PathCache | null = null;
    let leastUsedKey: string = '';
    
    this.pathCache.forEach((cache, key) => {
      if (!leastUsed || cache.usage < leastUsed.usage) {
        leastUsed = cache;
        leastUsedKey = key;
      }
    });
    
    if (leastUsedKey) {
      this.pathCache.delete(leastUsedKey);
    }
  }
  
  /**
   * 计算连接路径
   */
  private async calculateConnectionPath(
    connection: ConnectionLine, 
    lodLevel: typeof this.lodLevels[0]
  ): Promise<string> {
    const fromRect = connection.from.element.getBoundingClientRect();
    const toRect = connection.to.element.getBoundingClientRect();
    
    let startPoint: ConnectionPoint;
    let endPoint: ConnectionPoint;
    
    if (connection.type === 'other') {
      startPoint = {
        x: fromRect.left,
        y: fromRect.top + fromRect.height / 2
      };
      endPoint = {
        x: toRect.right,
        y: toRect.top + toRect.height / 2
      };
    } else {
      startPoint = {
        x: fromRect.right,
        y: fromRect.top + fromRect.height / 2
      };
      endPoint = {
        x: toRect.left,
        y: toRect.top + toRect.height / 2
      };
    }
    
    // 根据LOD级别调整计算精度
    const simplifyFactor = lodLevel.simplifyFactor;
    const adjustedConfig = {
      ...this.config,
      cornerRadius: this.config.cornerRadius * simplifyFactor
    };
    
    // 如果有Web Worker，使用Worker计算
    if (this.geometryWorker && simplifyFactor < 1.0) {
      return this.calculatePathWithWorker(startPoint, endPoint, adjustedConfig, connection.type);
    }
    
    return this.calculatePathSync(startPoint, endPoint, adjustedConfig, connection.type);
  }
  
  /**
   * 使用Worker计算路径
   */
  private calculatePathWithWorker(
    start: ConnectionPoint,
    end: ConnectionPoint,
    config: BatchRenderConfig,
    type: 'self' | 'other'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = `path-${Date.now()}-${Math.random()}`;
      
      this.workerQueue.push({ id, resolve, reject });
      
      this.geometryWorker!.postMessage({
        id,
        start,
        end,
        config,
        type
      });
      
      // 超时处理
      setTimeout(() => {
        const queueIndex = this.workerQueue.findIndex(item => item.id === id);
        if (queueIndex > -1) {
          this.workerQueue.splice(queueIndex, 1);
          reject(new Error('Worker calculation timeout'));
        }
      }, 1000);
    });
  }
  
  /**
   * 同步计算路径
   */
  private calculatePathSync(
    start: ConnectionPoint,
    end: ConnectionPoint,
    config: BatchRenderConfig,
    type: 'self' | 'other'
  ): string {
    const { cornerRadius } = config;
    const horizontalDistance = type === 'other' ? -5 : 5;
    const verticalDistance = end.y - start.y;
    
    const corner1: ConnectionPoint = {
      x: start.x + horizontalDistance,
      y: start.y
    };
    
    const corner2: ConnectionPoint = {
      x: start.x + horizontalDistance,
      y: end.y
    };
    
    let path = `M ${start.x} ${start.y}`;
    
    if (Math.abs(horizontalDistance) > cornerRadius) {
      path += ` L ${corner1.x + (horizontalDistance > 0 ? -cornerRadius : cornerRadius)} ${corner1.y}`;
      path += ` Q ${corner1.x} ${corner1.y} ${corner1.x} ${corner1.y + (verticalDistance > 0 ? cornerRadius : -cornerRadius)}`;
      
      if (Math.abs(verticalDistance) > 2 * cornerRadius) {
        path += ` L ${corner2.x} ${corner2.y + (verticalDistance > 0 ? -cornerRadius : cornerRadius)}`;
      }
      
      path += ` Q ${corner2.x} ${corner2.y} ${corner2.x + (horizontalDistance > 0 ? cornerRadius : -cornerRadius)} ${corner2.y}`;
      path += ` L ${end.x} ${end.y}`;
    } else {
      path += ` L ${end.x} ${end.y}`;
    }
    
    return path;
  }
  
  /**
   * 批量更新SVG路径
   */
  private batchUpdateSVGPaths(
    results: Array<{
      connection: ConnectionLine;
      path: string;
      lodLevel: typeof this.lodLevels[0];
    }>
  ): void {
    const fragment = document.createDocumentFragment();
    
    results.forEach(({ connection, path, lodLevel }) => {
      let pathElement = this.svgContainer.querySelector(`#path-${connection.id}`) as SVGPathElement;
      
      if (!pathElement) {
        pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.id = `path-${connection.id}`;
        pathElement.setAttribute('class', 'batch-connection');
        fragment.appendChild(pathElement);
      }
      
      // 更新路径属性
      pathElement.setAttribute('d', path);
      pathElement.setAttribute('stroke', this.config.color);
      pathElement.setAttribute('stroke-width', lodLevel.strokeWidth.toString());
      pathElement.setAttribute('opacity', (lodLevel.opacity * this.config.opacity).toString());
      pathElement.setAttribute('fill', 'none');
      pathElement.setAttribute('stroke-linecap', 'round');
      pathElement.setAttribute('stroke-linejoin', 'round');
      
      // 应用LOD相关的优化
      if (lodLevel.simplifyFactor < 1.0) {
        pathElement.setAttribute('shape-rendering', 'optimizeSpeed');
      } else {
        pathElement.setAttribute('shape-rendering', 'geometricPrecision');
      }
    });
    
    if (fragment.childNodes.length > 0) {
      this.svgContainer.appendChild(fragment);
    }
  }
  
  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * 让出主线程控制权
   */
  private yieldToMainThread(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
  
  /**
   * 更新帧统计信息
   */
  private updateFrameStats(frameTime: number, targetFrameTime: number): void {
    this.frameCount++;
    
    // 记录渲染时间
    this.renderTimes.push(frameTime);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
    
    // 检测掉帧
    if (frameTime > targetFrameTime * 1.5) {
      this.droppedFrames++;
    }
    
    // 每秒输出一次性能报告
    const now = performance.now();
    if (now - this.lastFrameTime > 1000) {
      this.outputPerformanceReport();
      this.lastFrameTime = now;
    }
  }
  
  /**
   * 输出性能报告
   */
  private outputPerformanceReport(): void {
    const avgRenderTime = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
    const maxRenderTime = Math.max(...this.renderTimes);
    
    console.log('📊 连接线渲染性能报告', {
      frameCount: this.frameCount,
      avgRenderTime: avgRenderTime.toFixed(2) + 'ms',
      maxRenderTime: maxRenderTime.toFixed(2) + 'ms',
      droppedFrames: this.droppedFrames,
      activeBatches: this.batches.size,
      renderQueue: this.renderQueue.length,
      cacheStats: {
        size: this.pathCache.size,
        hitRate: ((this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100).toFixed(1) + '%',
        hits: this.cacheHits,
        misses: this.cacheMisses
      },
      lodLevel: this.getCurrentLODLevel().threshold,
      viewportCulling: this.config.enableViewportCulling
    });
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    frameCount: number;
    avgRenderTime: number;
    maxRenderTime: number;
    droppedFrames: number;
    activeBatches: number;
    cacheHitRate: number;
    lodLevel: number;
  } {
    const avgRenderTime = this.renderTimes.length > 0 
      ? this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length 
      : 0;
    
    const maxRenderTime = this.renderTimes.length > 0 
      ? Math.max(...this.renderTimes) 
      : 0;
      
    const cacheHitRate = (this.cacheHits + this.cacheMisses) > 0
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
      : 0;
    
    return {
      frameCount: this.frameCount,
      avgRenderTime,
      maxRenderTime,
      droppedFrames: this.droppedFrames,
      activeBatches: this.batches.size,
      cacheHitRate,
      lodLevel: this.getCurrentLODLevel().threshold
    };
  }
  
  /**
   * 清空所有批次
   */
  clearAllBatches(): void {
    this.batches.forEach((batch, batchId) => {
      this.deleteBatch(batchId);
    });
    
    this.renderQueue.length = 0;
    console.log('🧹 已清空所有连接线批次');
  }
  
  /**
   * 销毁渲染器
   */
  destroy(): void {
    // 清理Worker
    if (this.geometryWorker) {
      this.geometryWorker.terminate();
      this.geometryWorker = null;
    }
    
    // 清理事件监听器
    window.removeEventListener('resize', this.handleViewportChange.bind(this));
    window.removeEventListener('scroll', this.handleViewportChange.bind(this));
    
    // 清理批次和缓存
    this.clearAllBatches();
    this.pathCache.clear();
    this.workerQueue.length = 0;
    
    console.log('🧹 连接线批量渲染器已销毁');
  }
}