class BaseVirtualList {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemHeight: 60,
            estimatedItemHeight: 60,
            overscanCount: 3,
            threshold: 100,
            ...options
        };
        
        this.data = [];
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.renderedItems = new Map();
        
        this.setupContainer();
        this.bindEvents();
    }

    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.height = this.container.style.height || '400px';
        
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'relative';
        this.viewport.style.width = '100%';
        this.container.appendChild(this.viewport);
        
        this.measureContainer();
    }

    measureContainer() {
        const rect = this.container.getBoundingClientRect();
        this.containerHeight = rect.height;
        this.updateVisibleRange();
    }

    bindEvents() {
        let scrollTimer = null;
        let isScrolling = false;

        const scrollHandler = () => {
            this.scrollTop = this.container.scrollTop;
            
            if (!isScrolling) {
                isScrolling = true;
                this.onScrollStart();
            }

            this.updateVisibleRange();
            this.render();

            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                isScrolling = false;
                this.onScrollEnd();
            }, 150);
        };

        this.container.addEventListener('scroll', scrollHandler, { passive: true });
        
        window.addEventListener('resize', () => {
            this.measureContainer();
            this.render();
        });
    }

    setData(data) {
        this.data = data;
        this.calculateTotalHeight();
        this.updateVisibleRange();
        this.render();
    }

    calculateTotalHeight() {
        if (this.options.itemHeight) {
            this.totalHeight = this.data.length * this.options.itemHeight;
        } else {
            this.totalHeight = this.data.length * this.options.estimatedItemHeight;
        }
        this.viewport.style.height = `${this.totalHeight}px`;
    }

    getItemHeight(index) {
        if (typeof this.options.itemHeight === 'function') {
            return this.options.itemHeight(this.data[index], index);
        }
        return this.options.itemHeight || this.options.estimatedItemHeight;
    }

    getItemOffset(index) {
        if (this.options.itemHeight) {
            return index * this.options.itemHeight;
        }
        
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += this.getItemHeight(i);
        }
        return offset;
    }

    updateVisibleRange() {
        if (!this.data.length) {
            this.visibleRange = { start: 0, end: 0 };
            return;
        }

        const containerTop = this.scrollTop;
        const containerBottom = containerTop + this.containerHeight;

        let start = 0;
        let end = this.data.length - 1;

        if (this.options.itemHeight) {
            start = Math.floor(containerTop / this.options.itemHeight);
            end = Math.ceil(containerBottom / this.options.itemHeight) - 1;
        } else {
            let currentOffset = 0;
            for (let i = 0; i < this.data.length; i++) {
                const itemHeight = this.getItemHeight(i);
                if (currentOffset + itemHeight > containerTop && start === 0) {
                    start = i;
                }
                if (currentOffset > containerBottom) {
                    end = i - 1;
                    break;
                }
                currentOffset += itemHeight;
            }
        }

        start = Math.max(0, start - this.options.overscanCount);
        end = Math.min(this.data.length - 1, end + this.options.overscanCount);

        this.visibleRange = { start, end };
    }

    render() {
        if (!this.data.length) {
            this.viewport.innerHTML = '';
            return;
        }

        const fragment = document.createDocumentFragment();
        const itemsToRemove = new Set(this.renderedItems.keys());

        for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
            itemsToRemove.delete(i);

            if (!this.renderedItems.has(i)) {
                const item = this.createItem(this.data[i], i);
                const wrapper = this.createItemWrapper(item, i);
                this.renderedItems.set(i, wrapper);
                fragment.appendChild(wrapper);
            }
        }

        itemsToRemove.forEach(index => {
            const item = this.renderedItems.get(index);
            if (item && item.parentNode) {
                item.parentNode.removeChild(item);
            }
            this.renderedItems.delete(index);
        });

        if (fragment.children.length > 0) {
            this.viewport.appendChild(fragment);
        }
    }

    createItemWrapper(item, index) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = `${this.getItemOffset(index)}px`;
        wrapper.style.width = '100%';
        wrapper.style.height = `${this.getItemHeight(index)}px`;
        wrapper.appendChild(item);
        return wrapper;
    }

    createItem(data, index) {
        const item = document.createElement('div');
        item.className = 'virtual-list-item';
        item.textContent = `Item ${index}`;
        return item;
    }

    onScrollStart() {
        this.container.classList.add('scrolling');
    }

    onScrollEnd() {
        this.container.classList.remove('scrolling');
    }

    getItemElement(index) {
        return this.renderedItems.get(index);
    }

    getItemPosition(index) {
        const element = this.getItemElement(index);
        if (!element) return null;

        const containerRect = this.container.getBoundingClientRect();
        const itemRect = element.getBoundingClientRect();

        return {
            top: itemRect.top - containerRect.top,
            left: itemRect.left - containerRect.left,
            right: itemRect.right - containerRect.left,
            bottom: itemRect.bottom - containerRect.top,
            width: itemRect.width,
            height: itemRect.height,
            centerX: itemRect.left - containerRect.left + itemRect.width / 2,
            centerY: itemRect.top - containerRect.top + itemRect.height / 2
        };
    }

    destroy() {
        this.container.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('resize', this.resizeHandler);
        this.renderedItems.clear();
    }
}

export default BaseVirtualList;