import { VirtualItem, VirtualScrollConfig, MemoryPoolConfig } from '../types';

/**
 * VirtualScrollManager - 高性能虚拟滚动管理器
 * 支持大量数据的流畅滚动，内存使用优化
 */
export class VirtualScrollManager {
  private items: VirtualItem[] = [];
  private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
  private config: VirtualScrollConfig;
  private container: HTMLElement | null = null;
  private scrollTop: number = 0;
  private cache: Map<string, any> = new Map();
  private recycledElements: HTMLElement[] = [];
  private activeElements: Map<string, HTMLElement> = new Map();

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = {
      itemHeight: 60,
      itemWidth: 60,
      containerHeight: 600,
      containerWidth: 800,
      overscan: 5,
      bufferSize: 20,
      recycleThreshold: 100,
      ...config
    };
  }

  /**
   * 初始化虚拟滚动容器
   */
  initialize(container: HTMLElement, totalItems: number): void {
    this.container = container;
    this.setupContainer();
    this.generateVirtualItems(totalItems);
    this.setupScrollListener();
    this.updateVisibleItems();
  }

  /**
   * 设置容器样式和属性
   */
  private setupContainer(): void {
    if (!this.container) return;

    this.container.style.cssText = `
      overflow: auto;
      height: ${this.config.containerHeight}px;
      width: ${this.config.containerWidth}px;
      contain: layout style paint;
      will-change: scroll-position;
    `;

    // 创建虚拟容器内容
    const totalHeight = this.getTotalHeight();
    const content = document.createElement('div');
    content.style.cssText = `
      height: ${totalHeight}px;
      width: 100%;
      position: relative;
      contain: layout;
    `;
    
    this.container.appendChild(content);
  }

  /**
   * 生成虚拟项目数据
   */
  private generateVirtualItems(totalItems: number): void {
    this.items = [];
    let offset = 0;

    for (let i = 0; i < totalItems; i++) {
      this.items.push({
        index: i,
        key: `item-${i}`,
        size: this.config.itemHeight,
        offset,
        data: null
      });
      offset += this.config.itemHeight;
    }
  }

  /**
   * 设置滚动监听器，使用防抖优化
   */
  private setupScrollListener(): void {
    if (!this.container) return;

    let rafId: number | null = null;
    let isScrolling = false;

    const onScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        this.container!.style.pointerEvents = 'none';
      }

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        this.scrollTop = this.container!.scrollTop;
        this.updateVisibleItems();
        
        // 滚动结束后恢复交互
        setTimeout(() => {
          if (this.container) {
            this.container.style.pointerEvents = 'auto';
          }
          isScrolling = false;
        }, 150);
      });
    };

    this.container.addEventListener('scroll', onScroll, { passive: true });
  }

  /**
   * 更新可见项目范围
   */
  private updateVisibleItems(): void {
    const visibleStart = Math.floor(this.scrollTop / this.config.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.config.containerHeight / this.config.itemHeight),
      this.items.length - 1
    );

    // 添加缓冲区
    const start = Math.max(0, visibleStart - this.config.overscan);
    const end = Math.min(this.items.length - 1, visibleEnd + this.config.overscan);

    // 只在范围变化时更新
    if (start !== this.visibleRange.start || end !== this.visibleRange.end) {
      this.visibleRange = { start, end };
      this.renderVisibleItems();
    }
  }

  /**
   * 渲染可见项目
   */
  private renderVisibleItems(): void {
    if (!this.container) return;

    const content = this.container.firstChild as HTMLElement;
    const newActiveElements = new Map<string, HTMLElement>();

    // 移除不再可见的元素并回收
    this.activeElements.forEach((element, key) => {
      const index = parseInt(key.split('-')[1]);
      if (index < this.visibleRange.start || index > this.visibleRange.end) {
        this.recycleElement(element);
      } else {
        newActiveElements.set(key, element);
      }
    });

    // 渲染新的可见项目
    for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
      const item = this.items[i];
      if (!newActiveElements.has(item.key)) {
        const element = this.createOrRecycleElement(item);
        newActiveElements.set(item.key, element);
        content.appendChild(element);
      }
    }

    this.activeElements = newActiveElements;
  }

  /**
   * 创建或回收DOM元素
   */
  private createOrRecycleElement(item: VirtualItem): HTMLElement {
    let element: HTMLElement;

    if (this.recycledElements.length > 0) {
      element = this.recycledElements.pop()!;
    } else {
      element = document.createElement('div');
      element.style.cssText = `
        position: absolute;
        width: ${this.config.itemWidth}px;
        height: ${this.config.itemHeight}px;
        contain: layout style paint;
        will-change: transform;
      `;
    }

    // 更新元素位置和内容
    element.style.transform = `translateY(${item.offset}px)`;
    element.dataset.index = item.index.toString();
    element.dataset.key = item.key;

    return element;
  }

  /**
   * 回收DOM元素
   */
  private recycleElement(element: HTMLElement): void {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    
    if (this.recycledElements.length < this.config.recycleThreshold) {
      this.recycledElements.push(element);
    }
  }

  /**
   * 获取总高度
   */
  private getTotalHeight(): number {
    return this.items.length * this.config.itemHeight;
  }

  /**
   * 滚动到指定项目
   */
  scrollToItem(index: number, align: 'start' | 'center' | 'end' = 'start'): void {
    if (!this.container || index < 0 || index >= this.items.length) return;

    const item = this.items[index];
    let scrollTop = item.offset;

    if (align === 'center') {
      scrollTop -= (this.config.containerHeight - this.config.itemHeight) / 2;
    } else if (align === 'end') {
      scrollTop -= this.config.containerHeight - this.config.itemHeight;
    }

    this.container.scrollTop = Math.max(0, scrollTop);
  }

  /**
   * 更新项目数据
   */
  updateItemData(index: number, data: any): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index].data = data;
      
      // 如果项目当前可见，更新显示
      if (index >= this.visibleRange.start && index <= this.visibleRange.end) {
        this.renderVisibleItems();
      }
    }
  }

  /**
   * 获取可见项目列表
   */
  getVisibleItems(): VirtualItem[] {
    return this.items.slice(this.visibleRange.start, this.visibleRange.end + 1);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.items = [];
    this.visibleRange = { start: 0, end: 0 };
    this.cache.clear();
    this.recycledElements = [];
    this.activeElements.clear();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): {
    totalItems: number;
    visibleItems: number;
    recycledElements: number;
    activeElements: number;
    cacheSize: number;
  } {
    return {
      totalItems: this.items.length,
      visibleItems: this.visibleRange.end - this.visibleRange.start + 1,
      recycledElements: this.recycledElements.length,
      activeElements: this.activeElements.size,
      cacheSize: this.cache.size
    };
  }
}