/**
 * 虚拟滚动管理器 - 专为1000个元素高性能渲染优化
 * 
 * 核心优化原理：
 * 1. 只渲染可见区域+缓冲区的元素，减少DOM节点数量
 * 2. 元素池化复用，避免频繁创建销毁DOM
 * 3. 增量更新策略，只更新变化的元素
 * 4. 智能预加载，基于滚动方向提前准备元素
 */

export interface VirtualScrollItem {
  id: string;
  type: 'avatar' | 'message' | 'connection';
  height: number;
  data: any;
  rendered?: boolean;
  poolIndex?: number; // 元素池中的索引
}

export interface ScrollViewport {
  scrollTop: number;
  viewportHeight: number;
  scrollDirection: 'up' | 'down' | 'idle';
  velocity: number; // 滚动速度，用于预测和预加载
}

export interface VirtualScrollConfig {
  itemHeight: number; // 预估单个元素高度
  bufferSize: number; // 缓冲区大小（可见区域外的元素数量）
  preloadSize: number; // 预加载大小（基于滚动方向）
  poolSize: number; // 元素池大小
  throttleMs: number; // 滚动事件节流时间
  enableSmartPreload: boolean; // 是否启用智能预加载
  enableMemoryOptim: boolean; // 是否启用内存优化
}

export class VirtualScrollManager {
  private config: VirtualScrollConfig;
  private items: Map<string, VirtualScrollItem> = new Map();
  private viewport: ScrollViewport;
  private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
  private renderRange: { start: number; end: number } = { start: 0, end: 0 };
  
  // 元素池系统 - 复用DOM节点
  private avatarPool: HTMLElement[] = [];
  private messagePool: HTMLElement[] = [];
  private connectionPool: SVGPathElement[] = [];
  private poolUsage = new Map<string, boolean>(); // 跟踪池中元素使用状态
  
  // 性能监控
  private renderCount = 0;
  private lastRenderTime = 0;
  private frameRate = 0;
  private memoryPressure = 0;
  
  // 事件处理
  private scrollHandler: ((event: Event) => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  
  // 滚动预测和优化
  private lastScrollTime = 0;
  private scrollHistory: number[] = []; // 记录最近的滚动位置
  private velocityHistory: number[] = []; // 滚动速度历史
  
  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = {
      itemHeight: 60,
      bufferSize: 5,
      preloadSize: 10,
      poolSize: 50,
      throttleMs: 16, // 60fps
      enableSmartPreload: true,
      enableMemoryOptim: true,
      ...config
    };
    
    this.viewport = {
      scrollTop: 0,
      viewportHeight: window.innerHeight,
      scrollDirection: 'idle',
      velocity: 0
    };
    
    this.initializePools();
    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }
  
  /**
   * 初始化元素池 - 预创建DOM元素避免运行时开销
   */
  private initializePools(): void {
    console.log('🏊‍♀️ 初始化元素池系统...');
    
    // 头像元素池
    for (let i = 0; i < this.config.poolSize; i++) {
      const avatar = this.createAvatarElement();
      avatar.style.display = 'none';
      this.avatarPool.push(avatar);
      this.poolUsage.set(`avatar-${i}`, false);
    }
    
    // 消息气泡元素池
    for (let i = 0; i < this.config.poolSize; i++) {
      const message = this.createMessageElement();
      message.style.display = 'none';
      this.messagePool.push(message);
      this.poolUsage.set(`message-${i}`, false);
    }
    
    // SVG连接线元素池
    for (let i = 0; i < this.config.poolSize; i++) {
      const connection = this.createConnectionElement();
      connection.style.display = 'none';
      this.connectionPool.push(connection);
      this.poolUsage.set(`connection-${i}`, false);
    }
    
    console.log(`✅ 元素池初始化完成 - 头像:${this.avatarPool.length}, 消息:${this.messagePool.length}, 连接线:${this.connectionPool.length}`);
  }
  
  /**
   * 创建头像元素模板
   */
  private createAvatarElement(): HTMLElement {
    const avatar = document.createElement('div');
    avatar.className = 'virtual-avatar';
    avatar.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
        <span class="avatar-initial"></span>
      </div>
    `;
    return avatar;
  }
  
  /**
   * 创建消息气泡元素模板
   */
  private createMessageElement(): HTMLElement {
    const message = document.createElement('div');
    message.className = 'virtual-message';
    message.innerHTML = `
      <div class="message-bubble bg-white rounded-lg p-3 shadow-sm">
        <div class="message-content text-gray-900"></div>
        <div class="message-time text-xs text-gray-500 mt-1"></div>
      </div>
    `;
    return message;
  }
  
  /**
   * 创建连接线元素模板
   */
  private createConnectionElement(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'virtual-connection');
    path.setAttribute('stroke', 'rgba(59, 130, 246, 0.6)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    return path;
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 滚动事件 - 使用requestAnimationFrame节流
    let ticking = false;
    this.scrollHandler = (event: Event) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll(event);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    
    // 窗口大小变化监听
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === document.body) {
          this.viewport.viewportHeight = entry.contentRect.height;
          this.recalculateVisibleRange();
          this.scheduleRender();
        }
      }
    });
    
    this.resizeObserver.observe(document.body);
    
    // Intersection Observer - 精确检测可见性
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const itemId = entry.target.getAttribute('data-item-id');
          if (itemId) {
            const item = this.items.get(itemId);
            if (item) {
              // 更新元素可见性状态，用于优化连接线渲染
              const isVisible = entry.intersectionRatio > 0;
              this.updateItemVisibility(itemId, isVisible);
            }
          }
        }
      },
      {
        threshold: [0, 0.1, 0.5, 1.0], // 多个阈值，精确控制
        rootMargin: '100px 0px' // 提前100px开始处理
      }
    );
  }
  
  /**
   * 处理滚动事件 - 核心滚动优化逻辑
   */
  private handleScroll(event: Event): void {
    const now = performance.now();
    const target = event.target as Document;
    const scrollTop = target.documentElement.scrollTop || document.body.scrollTop;
    
    // 计算滚动速度和方向
    const deltaTime = now - this.lastScrollTime;
    const deltaScroll = scrollTop - this.viewport.scrollTop;
    
    if (deltaTime > 0) {
      this.viewport.velocity = Math.abs(deltaScroll) / deltaTime;
      
      // 更新滚动方向
      if (Math.abs(deltaScroll) > 1) {
        this.viewport.scrollDirection = deltaScroll > 0 ? 'down' : 'up';
      } else {
        this.viewport.scrollDirection = 'idle';
      }
      
      // 记录滚动历史用于预测
      this.scrollHistory.push(scrollTop);
      this.velocityHistory.push(this.viewport.velocity);
      
      // 只保留最近10次记录
      if (this.scrollHistory.length > 10) {
        this.scrollHistory.shift();
        this.velocityHistory.shift();
      }
    }
    
    this.viewport.scrollTop = scrollTop;
    this.lastScrollTime = now;
    
    // 重新计算可见范围
    this.recalculateVisibleRange();
    
    // 智能预加载
    if (this.config.enableSmartPreload) {
      this.performSmartPreload();
    }
    
    // 调度渲染
    this.scheduleRender();
  }
  
  /**
   * 重新计算可见范围
   */
  private recalculateVisibleRange(): void {
    const itemCount = this.items.size;
    if (itemCount === 0) return;
    
    // 计算可见区域的元素索引范围
    const startIndex = Math.floor(this.viewport.scrollTop / this.config.itemHeight);
    const visibleCount = Math.ceil(this.viewport.viewportHeight / this.config.itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, itemCount - 1);
    
    this.visibleRange = { start: startIndex, end: endIndex };
    
    // 计算渲染范围（包含缓冲区）
    const renderStart = Math.max(0, startIndex - this.config.bufferSize);
    const renderEnd = Math.min(itemCount - 1, endIndex + this.config.bufferSize);
    
    this.renderRange = { start: renderStart, end: renderEnd };
    
    console.log(`📏 可见范围更新: 可见(${startIndex}-${endIndex}), 渲染(${renderStart}-${renderEnd})`);
  }
  
  /**
   * 智能预加载 - 基于滚动方向和速度预测
   */
  private performSmartPreload(): void {
    if (this.viewport.scrollDirection === 'idle') return;
    
    // 基于速度预测未来位置
    const avgVelocity = this.velocityHistory.reduce((sum, v) => sum + v, 0) / this.velocityHistory.length;
    const predictedScroll = this.viewport.scrollTop + (avgVelocity * 100); // 预测100ms后位置
    
    // 计算预加载范围
    const predictedStartIndex = Math.floor(predictedScroll / this.config.itemHeight);
    let preloadStart: number, preloadEnd: number;
    
    if (this.viewport.scrollDirection === 'down') {
      preloadStart = this.renderRange.end + 1;
      preloadEnd = Math.min(this.items.size - 1, predictedStartIndex + this.config.preloadSize);
    } else {
      preloadStart = Math.max(0, predictedStartIndex - this.config.preloadSize);
      preloadEnd = this.renderRange.start - 1;
    }
    
    // 预加载元素到池中
    for (let i = preloadStart; i <= preloadEnd; i++) {
      const item = Array.from(this.items.values())[i];
      if (item && !item.rendered) {
        this.preloadItem(item);
      }
    }
  }
  
  /**
   * 预加载单个元素
   */
  private preloadItem(item: VirtualScrollItem): void {
    const poolElement = this.getPoolElement(item.type);
    if (poolElement) {
      // 准备元素数据但不显示
      this.updateElementContent(poolElement, item);
      poolElement.style.display = 'none';
      item.poolIndex = this.findPoolIndex(item.type, poolElement);
    }
  }
  
  /**
   * 调度渲染 - 使用requestAnimationFrame确保60fps
   */
  private scheduleRender(): void {
    if (this.renderScheduled) return;
    
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.performRender();
      this.renderScheduled = false;
    });
  }
  
  private renderScheduled = false;
  
  /**
   * 执行渲染 - 核心渲染逻辑
   */
  private performRender(): void {
    const renderStart = performance.now();
    
    // 收集需要渲染和回收的元素
    const itemsToRender: VirtualScrollItem[] = [];
    const itemsToRecycle: VirtualScrollItem[] = [];
    
    Array.from(this.items.values()).forEach((item, index) => {
      const inRenderRange = index >= this.renderRange.start && index <= this.renderRange.end;
      
      if (inRenderRange && !item.rendered) {
        itemsToRender.push(item);
      } else if (!inRenderRange && item.rendered) {
        itemsToRecycle.push(item);
      }
    });
    
    // 批量回收元素
    this.batchRecycleItems(itemsToRecycle);
    
    // 批量渲染元素
    this.batchRenderItems(itemsToRender);
    
    // 更新性能指标
    const renderTime = performance.now() - renderStart;
    this.updatePerformanceMetrics(renderTime, itemsToRender.length, itemsToRecycle.length);
    
    console.log(`🎨 渲染完成 - 耗时:${renderTime.toFixed(2)}ms, 渲染:${itemsToRender.length}, 回收:${itemsToRecycle.length}`);
  }
  
  /**
   * 批量渲染元素
   */
  private batchRenderItems(items: VirtualScrollItem[]): void {
    const fragment = document.createDocumentFragment();
    
    items.forEach((item, index) => {
      const element = this.getOrCreateElement(item);
      if (element) {
        this.updateElementContent(element, item);
        this.positionElement(element, this.renderRange.start + index);
        element.style.display = '';
        fragment.appendChild(element);
        item.rendered = true;
        
        // 注册到Intersection Observer
        this.intersectionObserver?.observe(element);
      }
    });
    
    // 一次性添加到DOM
    const container = this.getContainer();
    if (container && fragment.childNodes.length > 0) {
      container.appendChild(fragment);
    }
  }
  
  /**
   * 批量回收元素
   */
  private batchRecycleItems(items: VirtualScrollItem[]): void {
    items.forEach(item => {
      if (item.poolIndex !== undefined) {
        const element = this.getPoolElementByIndex(item.type, item.poolIndex);
        if (element) {
          element.style.display = 'none';
          element.remove();
          this.releasePoolElement(item.type, item.poolIndex);
          this.intersectionObserver?.unobserve(element);
        }
      }
      item.rendered = false;
      item.poolIndex = undefined;
    });
  }
  
  /**
   * 获取或创建元素
   */
  private getOrCreateElement(item: VirtualScrollItem): HTMLElement | SVGPathElement | null {
    // 尝试从池中获取
    let element = this.getPoolElement(item.type);
    
    if (!element) {
      // 池已满，创建新元素（但会记录内存压力）
      console.warn(`⚠️ 元素池不足，创建新${item.type}元素`);
      this.memoryPressure++;
      
      switch (item.type) {
        case 'avatar':
          element = this.createAvatarElement();
          break;
        case 'message':
          element = this.createMessageElement();
          break;
        case 'connection':
          element = this.createConnectionElement();
          break;
      }
    }
    
    return element;
  }
  
  /**
   * 从池中获取元素
   */
  private getPoolElement(type: VirtualScrollItem['type']): HTMLElement | SVGPathElement | null {
    let pool: (HTMLElement | SVGPathElement)[];
    let prefix: string;
    
    switch (type) {
      case 'avatar':
        pool = this.avatarPool;
        prefix = 'avatar';
        break;
      case 'message':
        pool = this.messagePool;
        prefix = 'message';
        break;
      case 'connection':
        pool = this.connectionPool;
        prefix = 'connection';
        break;
      default:
        return null;
    }
    
    // 找到第一个未使用的元素
    for (let i = 0; i < pool.length; i++) {
      const key = `${prefix}-${i}`;
      if (!this.poolUsage.get(key)) {
        this.poolUsage.set(key, true);
        return pool[i];
      }
    }
    
    return null; // 池已满
  }
  
  /**
   * 释放池中元素
   */
  private releasePoolElement(type: VirtualScrollItem['type'], index: number): void {
    const prefix = type;
    const key = `${prefix}-${index}`;
    this.poolUsage.set(key, false);
  }
  
  /**
   * 根据索引获取池中元素
   */
  private getPoolElementByIndex(type: VirtualScrollItem['type'], index: number): HTMLElement | SVGPathElement | null {
    switch (type) {
      case 'avatar':
        return this.avatarPool[index] || null;
      case 'message':
        return this.messagePool[index] || null;
      case 'connection':
        return this.connectionPool[index] || null;
      default:
        return null;
    }
  }
  
  /**
   * 找到元素在池中的索引
   */
  private findPoolIndex(type: VirtualScrollItem['type'], element: HTMLElement | SVGPathElement): number | undefined {
    let pool: (HTMLElement | SVGPathElement)[];
    
    switch (type) {
      case 'avatar':
        pool = this.avatarPool;
        break;
      case 'message':
        pool = this.messagePool;
        break;
      case 'connection':
        pool = this.connectionPool;
        break;
      default:
        return undefined;
    }
    
    return pool.indexOf(element);
  }
  
  /**
   * 更新元素内容
   */
  private updateElementContent(element: HTMLElement | SVGPathElement, item: VirtualScrollItem): void {
    element.setAttribute('data-item-id', item.id);
    
    switch (item.type) {
      case 'avatar':
        this.updateAvatarContent(element as HTMLElement, item);
        break;
      case 'message':
        this.updateMessageContent(element as HTMLElement, item);
        break;
      case 'connection':
        this.updateConnectionContent(element as SVGPathElement, item);
        break;
    }
  }
  
  /**
   * 更新头像内容
   */
  private updateAvatarContent(element: HTMLElement, item: VirtualScrollItem): void {
    const initial = element.querySelector('.avatar-initial') as HTMLElement;
    if (initial && item.data.name) {
      initial.textContent = item.data.name.charAt(0).toUpperCase();
    }
    
    if (item.data.color) {
      const avatarDiv = element.querySelector('div') as HTMLElement;
      avatarDiv.style.background = item.data.color;
    }
  }
  
  /**
   * 更新消息内容
   */
  private updateMessageContent(element: HTMLElement, item: VirtualScrollItem): void {
    const content = element.querySelector('.message-content') as HTMLElement;
    const time = element.querySelector('.message-time') as HTMLElement;
    
    if (content) content.textContent = item.data.content || '';
    if (time) time.textContent = item.data.time || '';
    
    // 设置消息类型样式
    const bubble = element.querySelector('.message-bubble') as HTMLElement;
    if (bubble) {
      bubble.className = `message-bubble ${item.data.type === 'self' ? 'bg-blue-500 text-white ml-auto' : 'bg-white text-gray-900'} rounded-lg p-3 shadow-sm`;
    }
  }
  
  /**
   * 更新连接线内容
   */
  private updateConnectionContent(element: SVGPathElement, item: VirtualScrollItem): void {
    if (item.data.path) {
      element.setAttribute('d', item.data.path);
    }
    
    if (item.data.color) {
      element.setAttribute('stroke', item.data.color);
    }
  }
  
  /**
   * 定位元素到正确位置
   */
  private positionElement(element: HTMLElement | SVGPathElement, index: number): void {
    const top = index * this.config.itemHeight;
    
    if (element instanceof HTMLElement) {
      element.style.position = 'absolute';
      element.style.top = `${top}px`;
      element.style.left = '0';
      element.style.right = '0';
      element.style.height = `${this.config.itemHeight}px`;
    }
  }
  
  /**
   * 获取容器元素
   */
  private getContainer(): HTMLElement | null {
    return document.getElementById('virtual-scroll-container') || document.body;
  }
  
  /**
   * 更新元素可见性状态
   */
  private updateItemVisibility(itemId: string, isVisible: boolean): void {
    const item = this.items.get(itemId);
    if (item && item.type === 'connection') {
      // 对连接线进行可见性优化
      if (item.poolIndex !== undefined) {
        const element = this.getPoolElementByIndex(item.type, item.poolIndex) as SVGPathElement;
        if (element) {
          element.style.display = isVisible ? '' : 'none';
        }
      }
    }
  }
  
  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.calculateFrameRate();
      this.checkMemoryPressure();
      this.optimizeIfNeeded();
    }, 1000);
  }
  
  /**
   * 计算帧率
   */
  private calculateFrameRate(): void {
    const now = performance.now();
    if (this.lastRenderTime > 0) {
      const deltaTime = now - this.lastRenderTime;
      this.frameRate = Math.round(1000 / deltaTime);
    }
    this.lastRenderTime = now;
  }
  
  /**
   * 检查内存压力
   */
  private checkMemoryPressure(): void {
    if (this.config.enableMemoryOptim) {
      // 检查是否需要扩展池大小或触发GC
      if (this.memoryPressure > 10) {
        console.warn('🔥 检测到内存压力，执行优化...');
        this.performMemoryOptimization();
      }
    }
  }
  
  /**
   * 执行内存优化
   */
  private performMemoryOptimization(): void {
    // 清理未使用的元素
    this.cleanupUnusedElements();
    
    // 重置内存压力计数
    this.memoryPressure = 0;
    
    // 触发垃圾回收（如果可用）
    if (window.gc) {
      window.gc();
    }
  }
  
  /**
   * 清理未使用的元素
   */
  private cleanupUnusedElements(): void {
    // 移除超出渲染范围很远的元素
    Array.from(this.items.values()).forEach((item, index) => {
      if (item.rendered && (index < this.renderRange.start - 20 || index > this.renderRange.end + 20)) {
        this.recycleItem(item);
      }
    });
  }
  
  /**
   * 回收单个元素
   */
  private recycleItem(item: VirtualScrollItem): void {
    if (item.poolIndex !== undefined) {
      const element = this.getPoolElementByIndex(item.type, item.poolIndex);
      if (element) {
        element.style.display = 'none';
        element.remove();
        this.releasePoolElement(item.type, item.poolIndex);
        this.intersectionObserver?.unobserve(element);
      }
    }
    item.rendered = false;
    item.poolIndex = undefined;
  }
  
  /**
   * 根据需要优化系统
   */
  private optimizeIfNeeded(): void {
    // 如果帧率低于30fps，启用降级模式
    if (this.frameRate < 30) {
      console.warn('📊 低帧率检测，启用性能降级模式');
      this.enablePerformanceDegradation();
    } else if (this.frameRate > 50) {
      // 帧率恢复正常，恢复全功能
      this.disablePerformanceDegradation();
    }
  }
  
  /**
   * 启用性能降级模式
   */
  private enablePerformanceDegradation(): void {
    // 减少缓冲区大小
    this.config.bufferSize = Math.max(2, Math.floor(this.config.bufferSize * 0.7));
    
    // 增加节流时间
    this.config.throttleMs = Math.min(32, this.config.throttleMs * 1.5);
    
    // 禁用智能预加载
    this.config.enableSmartPreload = false;
    
    console.log('⚡ 性能降级模式已启用', this.config);
  }
  
  /**
   * 禁用性能降级模式
   */
  private disablePerformanceDegradation(): void {
    // 恢复默认配置
    this.config.bufferSize = 5;
    this.config.throttleMs = 16;
    this.config.enableSmartPreload = true;
  }
  
  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(renderTime: number, rendered: number, recycled: number): void {
    this.renderCount++;
    
    // 每100次渲染输出性能报告
    if (this.renderCount % 100 === 0) {
      console.log('📊 性能报告', {
        renderCount: this.renderCount,
        frameRate: this.frameRate,
        lastRenderTime: renderTime.toFixed(2) + 'ms',
        itemsRendered: rendered,
        itemsRecycled: recycled,
        memoryPressure: this.memoryPressure,
        poolUsage: {
          avatar: this.getPoolUsage('avatar'),
          message: this.getPoolUsage('message'),
          connection: this.getPoolUsage('connection')
        }
      });
    }
  }
  
  /**
   * 获取池使用率
   */
  private getPoolUsage(type: string): string {
    let used = 0;
    let total = 0;
    
    this.poolUsage.forEach((inUse, key) => {
      if (key.startsWith(type)) {
        total++;
        if (inUse) used++;
      }
    });
    
    return `${used}/${total} (${Math.round((used / total) * 100)}%)`;
  }
  
  /**
   * 添加元素到虚拟列表
   */
  addItem(item: VirtualScrollItem): void {
    this.items.set(item.id, item);
    
    // 如果元素在当前渲染范围内，立即渲染
    const itemIndex = Array.from(this.items.keys()).indexOf(item.id);
    if (itemIndex >= this.renderRange.start && itemIndex <= this.renderRange.end) {
      this.scheduleRender();
    }
  }
  
  /**
   * 从虚拟列表移除元素
   */
  removeItem(itemId: string): void {
    const item = this.items.get(itemId);
    if (item && item.rendered) {
      this.recycleItem(item);
    }
    this.items.delete(itemId);
  }
  
  /**
   * 更新元素数据
   */
  updateItem(itemId: string, data: Partial<VirtualScrollItem>): void {
    const item = this.items.get(itemId);
    if (item) {
      Object.assign(item, data);
      
      // 如果元素正在渲染，更新其内容
      if (item.rendered && item.poolIndex !== undefined) {
        const element = this.getPoolElementByIndex(item.type, item.poolIndex);
        if (element) {
          this.updateElementContent(element, item);
        }
      }
    }
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    frameRate: number;
    renderCount: number;
    memoryPressure: number;
    visibleRange: { start: number; end: number };
    renderRange: { start: number; end: number };
    poolUsage: Record<string, string>;
  } {
    return {
      frameRate: this.frameRate,
      renderCount: this.renderCount,
      memoryPressure: this.memoryPressure,
      visibleRange: this.visibleRange,
      renderRange: this.renderRange,
      poolUsage: {
        avatar: this.getPoolUsage('avatar'),
        message: this.getPoolUsage('message'),
        connection: this.getPoolUsage('connection')
      }
    };
  }
  
  /**
   * 销毁虚拟滚动管理器
   */
  destroy(): void {
    // 移除事件监听器
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    
    // 清理DOM元素
    this.avatarPool.forEach(el => el.remove());
    this.messagePool.forEach(el => el.remove());
    this.connectionPool.forEach(el => el.remove());
    
    // 清理数据
    this.items.clear();
    this.poolUsage.clear();
    this.avatarPool.length = 0;
    this.messagePool.length = 0;
    this.connectionPool.length = 0;
    
    console.log('🧹 虚拟滚动管理器已销毁');
  }
}