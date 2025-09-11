/**
 * Virtual Scrolling & Lazy Loading for Mobile Overlay Systems
 * 虚拟滚动和懒加载在移动端蒙层系统中的实现方案
 */

// 虚拟滚动核心实现
class VirtualScrollingManager {
  constructor(options = {}) {
    this.container = options.container;
    this.itemHeight = options.itemHeight || 50;
    this.visibleCount = options.visibleCount || 10;
    this.bufferSize = options.bufferSize || 3;
    this.totalItems = options.totalItems || 0;
    this.renderItem = options.renderItem;
    
    this.scrollTop = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleItems = [];
    
    this.init();
  }

  init() {
    if (!this.container) return;
    
    // 创建虚拟容器
    this.createVirtualContainer();
    
    // 绑定滚动事件
    this.bindScrollEvents();
    
    // 初始渲染
    this.updateVisibleItems();
  }

  createVirtualContainer() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    this.container.style.height = `${this.visibleCount * this.itemHeight}px`;
    
    // 创建内容容器
    this.contentContainer = document.createElement('div');
    this.contentContainer.style.position = 'relative';
    this.contentContainer.style.height = `${this.totalItems * this.itemHeight}px`;
    
    // 创建可视区域容器
    this.viewportContainer = document.createElement('div');
    this.viewportContainer.style.position = 'absolute';
    this.viewportContainer.style.top = '0';
    this.viewportContainer.style.left = '0';
    this.viewportContainer.style.right = '0';
    
    this.contentContainer.appendChild(this.viewportContainer);
    this.container.appendChild(this.contentContainer);
  }

  bindScrollEvents() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    this.container.addEventListener('scroll', handleScroll, { passive: true });
  }

  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.updateVisibleItems();
  }

  updateVisibleItems() {
    // 计算可视区域的起始和结束索引
    this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
    this.endIndex = Math.min(
      this.startIndex + this.visibleCount + this.bufferSize * 2,
      this.totalItems - 1
    );
    
    // 添加缓冲区
    this.startIndex = Math.max(0, this.startIndex - this.bufferSize);
    
    // 更新视口位置
    this.viewportContainer.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
    
    // 渲染可视项目
    this.renderVisibleItems();
  }

  renderVisibleItems() {
    // 清空现有内容
    this.viewportContainer.innerHTML = '';
    
    // 渲染可视范围内的项目
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      if (i >= this.totalItems) break;
      
      const itemElement = this.renderItem(i);
      itemElement.style.position = 'absolute';
      itemElement.style.top = `${(i - this.startIndex) * this.itemHeight}px`;
      itemElement.style.height = `${this.itemHeight}px`;
      itemElement.style.left = '0';
      itemElement.style.right = '0';
      
      this.viewportContainer.appendChild(itemElement);
    }
  }

  // 更新总项目数
  updateTotalItems(count) {
    this.totalItems = count;
    this.contentContainer.style.height = `${this.totalItems * this.itemHeight}px`;
    this.updateVisibleItems();
  }

  // 滚动到指定项目
  scrollToItem(index) {
    const targetScrollTop = index * this.itemHeight;
    this.container.scrollTop = targetScrollTop;
  }
}

// 懒加载图片管理器
class LazyImageLoader {
  constructor(options = {}) {
    this.rootMargin = options.rootMargin || '50px';
    this.threshold = options.threshold || 0.1;
    this.placeholder = options.placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGNUY1RjUiLz48L3N2Zz4=';
    
    this.observer = null;
    this.loadedImages = new WeakSet();
    this.loadingImages = new WeakSet();
    
    this.init();
  }

  init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback for older browsers
      this.loadAllImages();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: this.rootMargin,
        threshold: this.threshold
      }
    );
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
      }
    });
  }

  observe(img) {
    if (!this.observer || this.loadedImages.has(img)) return;
    
    // 设置占位符
    if (!img.src || img.src === '') {
      img.src = this.placeholder;
    }
    
    // 存储原始图片URL
    if (img.dataset.src) {
      this.observer.observe(img);
    }
  }

  loadImage(img) {
    if (this.loadingImages.has(img) || this.loadedImages.has(img)) return;
    
    this.loadingImages.add(img);
    
    const imageUrl = img.dataset.src;
    if (!imageUrl) return;

    // 预加载图片
    const tempImage = new Image();
    
    tempImage.onload = () => {
      // 图片加载成功
      img.src = imageUrl;
      img.classList.add('lazy-loaded');
      
      this.loadedImages.add(img);
      this.loadingImages.delete(img);
      
      if (this.observer) {
        this.observer.unobserve(img);
      }
      
      // 触发自定义事件
      img.dispatchEvent(new CustomEvent('lazyloaded'));
    };
    
    tempImage.onerror = () => {
      // 图片加载失败
      img.classList.add('lazy-error');
      this.loadingImages.delete(img);
      
      if (this.observer) {
        this.observer.unobserve(img);
      }
      
      // 触发错误事件
      img.dispatchEvent(new CustomEvent('lazyerror'));
    };
    
    tempImage.src = imageUrl;
  }

  loadAllImages() {
    // Fallback: 直接加载所有图片
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.loadImage(img);
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// 内容懒加载管理器
class LazyContentLoader {
  constructor(options = {}) {
    this.rootMargin = options.rootMargin || '100px';
    this.threshold = options.threshold || 0;
    this.loadDelay = options.loadDelay || 0;
    
    this.observer = null;
    this.loadingElements = new WeakSet();
    this.loadedElements = new WeakSet();
    
    this.init();
  }

  init() {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: this.rootMargin,
        threshold: this.threshold
      }
    );
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadContent(entry.target);
      }
    });
  }

  observe(element) {
    if (!this.observer || this.loadedElements.has(element)) return;
    this.observer.observe(element);
  }

  loadContent(element) {
    if (this.loadingElements.has(element) || this.loadedElements.has(element)) {
      return;
    }
    
    this.loadingElements.add(element);
    
    // 添加加载状态
    element.classList.add('lazy-loading');
    
    const loadFn = () => {
      // 执行自定义加载函数
      const loadHandler = element.dataset.lazyLoad;
      if (loadHandler && window[loadHandler]) {
        window[loadHandler](element);
      }
      
      // 或者加载HTML内容
      const htmlContent = element.dataset.lazyHtml;
      if (htmlContent) {
        element.innerHTML = htmlContent;
      }
      
      // 更新状态
      element.classList.remove('lazy-loading');
      element.classList.add('lazy-loaded');
      
      this.loadedElements.add(element);
      this.loadingElements.delete(element);
      
      if (this.observer) {
        this.observer.unobserve(element);
      }
      
      // 触发加载完成事件
      element.dispatchEvent(new CustomEvent('lazycontentloaded'));
    };
    
    if (this.loadDelay > 0) {
      setTimeout(loadFn, this.loadDelay);
    } else {
      requestIdleCallback ? requestIdleCallback(loadFn) : loadFn();
    }
  }
}

// 移动端优化的无限滚动
class MobileInfiniteScroll {
  constructor(options = {}) {
    this.container = options.container;
    this.loadMore = options.loadMore;
    this.threshold = options.threshold || 100; // 距底部多少px触发加载
    this.loading = false;
    this.hasMore = true;
    
    this.init();
  }

  init() {
    if (!this.container) return;
    
    this.bindScrollEvents();
  }

  bindScrollEvents() {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking && !this.loading && this.hasMore) {
        requestAnimationFrame(() => {
          this.checkLoadMore();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    this.container.addEventListener('scroll', handleScroll, { passive: true });
  }

  checkLoadMore() {
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    
    if (scrollHeight - scrollTop - clientHeight < this.threshold) {
      this.triggerLoadMore();
    }
  }

  async triggerLoadMore() {
    if (this.loading || !this.hasMore) return;
    
    this.loading = true;
    
    try {
      const result = await this.loadMore();
      this.hasMore = result.hasMore !== false;
    } catch (error) {
      console.error('Failed to load more content:', error);
    } finally {
      this.loading = false;
    }
  }

  setHasMore(hasMore) {
    this.hasMore = hasMore;
  }
}

// 性能监控与优化建议
const VIRTUAL_SCROLL_PERFORMANCE_TIPS = {
  itemHeight: {
    tip: 'Use fixed item heights for better performance',
    reason: 'Variable heights require expensive measurements',
    solution: 'Calculate average height or use CSS flexbox with fixed heights'
  },
  
  bufferSize: {
    tip: 'Optimize buffer size based on scroll speed',
    reason: 'Too small causes flickering, too large wastes memory',
    solution: 'Use 2-5 items buffer, adjust based on scroll behavior'
  },
  
  renderOptimization: {
    tip: 'Minimize DOM operations in renderItem',
    reason: 'Called frequently during scrolling',
    solution: 'Use DocumentFragment, avoid expensive operations'
  },
  
  memoryManagement: {
    tip: 'Clean up event listeners and references',
    reason: 'Prevent memory leaks in long-lived components',
    solution: 'Implement proper cleanup in component destruction'
  }
};

export {
  VirtualScrollingManager,
  LazyImageLoader,
  LazyContentLoader,
  MobileInfiniteScroll,
  VIRTUAL_SCROLL_PERFORMANCE_TIPS
};