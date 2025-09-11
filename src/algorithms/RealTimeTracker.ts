/**
 * 实时位置跟踪器
 * 使用 ResizeObserver 和 IntersectionObserver 的组合来高效跟踪元素位置变化
 */

import { IRealTimeTracker, UpdateCallback } from '../core/interfaces';

interface TrackedElement {
  element: HTMLElement;
  callback: UpdateCallback;
  resizeObserver: ResizeObserver;
  intersectionObserver: IntersectionObserver;
  mutationObserver: MutationObserver;
}

export class RealTimeTracker implements IRealTimeTracker {
  private trackedElements = new Map<string, TrackedElement>();
  private positions = new Map<string, DOMRect>();
  private animationFrameId: number | null = null;
  private isRunning = false;

  constructor() {
    this.startTracking();
  }

  trackElement(id: string, element: HTMLElement, callback: UpdateCallback): void {
    // 清理之前的追踪器
    if (this.trackedElements.has(id)) {
      this.untrackElement(id);
    }

    // 创建 ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === element) {
          this.updatePosition(id, element, callback);
        }
      }
    });

    // 创建 IntersectionObserver (用于检测滚动引起的位置变化)
    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === element) {
          this.updatePosition(id, element, callback);
        }
      }
    }, {
      threshold: [0, 0.1, 0.5, 0.9, 1.0] // 多个阈值确保位置变化被检测到
    });

    // 创建 MutationObserver (检测元素属性变化)
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || 
             mutation.attributeName === 'class' || 
             mutation.attributeName === 'transform')) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        this.updatePosition(id, element, callback);
      }
    });

    const trackedElement: TrackedElement = {
      element,
      callback,
      resizeObserver,
      intersectionObserver,
      mutationObserver
    };

    // 启动观察器
    resizeObserver.observe(element);
    intersectionObserver.observe(element);
    mutationObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class', 'transform']
    });

    this.trackedElements.set(id, trackedElement);

    // 立即更新一次位置
    this.updatePosition(id, element, callback);
  }

  untrackElement(id: string): void {
    const trackedElement = this.trackedElements.get(id);
    if (trackedElement) {
      // 清理所有观察器
      trackedElement.resizeObserver.disconnect();
      trackedElement.intersectionObserver.disconnect();
      trackedElement.mutationObserver.disconnect();

      this.trackedElements.delete(id);
      this.positions.delete(id);
    }
  }

  updateAll(): void {
    this.trackedElements.forEach((trackedElement, id) => {
      this.updatePosition(id, trackedElement.element, trackedElement.callback);
    });
  }

  getPosition(id: string): DOMRect | undefined {
    return this.positions.get(id);
  }

  destroy(): void {
    // 清理所有追踪的元素
    Array.from(this.trackedElements.keys()).forEach(id => {
      this.untrackElement(id);
    });

    // 停止动画循环
    this.stopTracking();
  }

  private updatePosition(id: string, element: HTMLElement, callback: UpdateCallback): void {
    try {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;

      // 计算绝对位置
      const absoluteRect = {
        left: rect.left + scrollX,
        top: rect.top + scrollY,
        right: rect.right + scrollX,
        bottom: rect.bottom + scrollY,
        width: rect.width,
        height: rect.height,
        x: rect.left + scrollX,
        y: rect.top + scrollY
      } as DOMRect;

      // 检查位置是否真的发生了变化
      const oldPosition = this.positions.get(id);
      if (oldPosition && this.positionsEqual(oldPosition, absoluteRect)) {
        return; // 位置未变化，跳过更新
      }

      this.positions.set(id, absoluteRect);
      callback(id, absoluteRect);
    } catch (error) {
      console.warn(`Failed to update position for element ${id}:`, error);
    }
  }

  private positionsEqual(pos1: DOMRect, pos2: DOMRect): boolean {
    const tolerance = 0.5; // 0.5px 容差
    return Math.abs(pos1.x - pos2.x) < tolerance &&
           Math.abs(pos1.y - pos2.y) < tolerance &&
           Math.abs(pos1.width - pos2.width) < tolerance &&
           Math.abs(pos1.height - pos2.height) < tolerance;
  }

  private startTracking(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.trackingLoop();
  }

  private stopTracking(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private trackingLoop = (): void => {
    if (!this.isRunning) return;

    // 定期检查所有元素位置（作为备选方案）
    // 主要依赖观察器，但这个循环可以捕获一些边缘情况
    this.updateAll();

    // 以较低频率运行（约 10fps），因为观察器会处理大部分更新
    setTimeout(() => {
      this.animationFrameId = requestAnimationFrame(this.trackingLoop);
    }, 100);
  };

  /**
   * 批量更新多个元素的位置
   * 用于性能优化，避免频繁的单个更新
   */
  batchUpdatePositions(ids: string[]): void {
    const updates: Array<{ id: string; position: DOMRect }> = [];

    ids.forEach(id => {
      const trackedElement = this.trackedElements.get(id);
      if (trackedElement) {
        try {
          const rect = trackedElement.element.getBoundingClientRect();
          const scrollX = window.scrollX || document.documentElement.scrollLeft;
          const scrollY = window.scrollY || document.documentElement.scrollTop;

          const absoluteRect = {
            left: rect.left + scrollX,
            top: rect.top + scrollY,
            right: rect.right + scrollX,
            bottom: rect.bottom + scrollY,
            width: rect.width,
            height: rect.height,
            x: rect.left + scrollX,
            y: rect.top + scrollY
          } as DOMRect;

          const oldPosition = this.positions.get(id);
          if (!oldPosition || !this.positionsEqual(oldPosition, absoluteRect)) {
            this.positions.set(id, absoluteRect);
            updates.push({ id, position: absoluteRect });
          }
        } catch (error) {
          console.warn(`Failed to batch update position for element ${id}:`, error);
        }
      }
    });

    // 批量回调
    updates.forEach(({ id, position }) => {
      const trackedElement = this.trackedElements.get(id);
      if (trackedElement) {
        trackedElement.callback(id, position);
      }
    });
  }
}