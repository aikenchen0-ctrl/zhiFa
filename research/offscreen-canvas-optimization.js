/**
 * OffscreenCanvas Complex Drawing Optimization for Mobile Overlay Systems
 * OffscreenCanvas在移动端蒙层系统复杂绘制中的优势和应用
 */

// OffscreenCanvas管理器
class OffscreenCanvasManager {
  constructor() {
    this.workers = new Map();
    this.canvases = new Map();
    this.isSupported = this.checkSupport();
    this.workerPool = [];
    this.maxWorkers = Math.min(4, navigator.hardwareConcurrency || 2);
  }

  // 检查OffscreenCanvas支持
  checkSupport() {
    return typeof OffscreenCanvas !== 'undefined' && 
           typeof Worker !== 'undefined';
  }

  // 创建OffscreenCanvas
  createOffscreenCanvas(width, height, options = {}) {
    if (!this.isSupported) {
      console.warn('OffscreenCanvas not supported, falling back to regular Canvas');
      return this.createFallbackCanvas(width, height);
    }

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', options);
    
    const canvasId = this.generateCanvasId();
    this.canvases.set(canvasId, { canvas, context, width, height });
    
    return { canvasId, canvas, context };
  }

  // 创建Fallback Canvas
  createFallbackCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    const canvasId = this.generateCanvasId();
    this.canvases.set(canvasId, { canvas, context, width, height, isFallback: true });
    
    return { canvasId, canvas, context };
  }

  // 获取Worker
  getWorker() {
    if (this.workerPool.length > 0) {
      return this.workerPool.pop();
    }

    if (this.workers.size < this.maxWorkers) {
      const worker = this.createDrawingWorker();
      const workerId = this.generateWorkerId();
      this.workers.set(workerId, worker);
      return worker;
    }

    // 如果达到最大Worker数量，返回现有的Worker
    const workersArray = Array.from(this.workers.values());
    return workersArray[Math.floor(Math.random() * workersArray.length)];
  }

  // 创建绘制Worker
  createDrawingWorker() {
    const workerCode = this.generateWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e) => {
      this.handleWorkerMessage(e);
    };
    
    worker.onerror = (error) => {
      console.error('Drawing worker error:', error);
    };
    
    return worker;
  }

  // 生成Worker代码
  generateWorkerCode() {
    return `
      // Drawing operations worker
      class OffscreenDrawer {
        constructor() {
          this.canvases = new Map();
        }

        // 创建OffscreenCanvas
        createCanvas(id, width, height, transferCanvas = null) {
          let canvas, context;
          
          if (transferCanvas) {
            canvas = transferCanvas;
            context = canvas.getContext('2d');
          } else {
            canvas = new OffscreenCanvas(width, height);
            context = canvas.getContext('2d');
          }
          
          this.canvases.set(id, { canvas, context });
          
          return {
            success: true,
            canvasId: id
          };
        }

        // 复杂图形绘制
        drawComplexShape(canvasId, operations) {
          const canvasData = this.canvases.get(canvasId);
          if (!canvasData) {
            return { success: false, error: 'Canvas not found' };
          }

          const { context } = canvasData;
          const startTime = performance.now();
          
          try {
            operations.forEach(op => {
              this.executeDrawOperation(context, op);
            });
            
            const endTime = performance.now();
            
            return {
              success: true,
              renderTime: endTime - startTime
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }

        // 执行绘制操作
        executeDrawOperation(ctx, operation) {
          const { type, params } = operation;
          
          switch (type) {
            case 'fillRect':
              ctx.fillStyle = params.fillStyle || '#000';
              ctx.fillRect(params.x, params.y, params.width, params.height);
              break;
              
            case 'strokeRect':
              ctx.strokeStyle = params.strokeStyle || '#000';
              ctx.lineWidth = params.lineWidth || 1;
              ctx.strokeRect(params.x, params.y, params.width, params.height);
              break;
              
            case 'circle':
              ctx.beginPath();
              ctx.arc(params.x, params.y, params.radius, 0, 2 * Math.PI);
              if (params.fillStyle) {
                ctx.fillStyle = params.fillStyle;
                ctx.fill();
              }
              if (params.strokeStyle) {
                ctx.strokeStyle = params.strokeStyle;
                ctx.lineWidth = params.lineWidth || 1;
                ctx.stroke();
              }
              break;
              
            case 'path':
              ctx.beginPath();
              params.commands.forEach(cmd => {
                switch (cmd.type) {
                  case 'moveTo':
                    ctx.moveTo(cmd.x, cmd.y);
                    break;
                  case 'lineTo':
                    ctx.lineTo(cmd.x, cmd.y);
                    break;
                  case 'bezierCurveTo':
                    ctx.bezierCurveTo(cmd.cp1x, cmd.cp1y, cmd.cp2x, cmd.cp2y, cmd.x, cmd.y);
                    break;
                  case 'quadraticCurveTo':
                    ctx.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y);
                    break;
                  case 'arc':
                    ctx.arc(cmd.x, cmd.y, cmd.radius, cmd.startAngle, cmd.endAngle);
                    break;
                }
              });
              
              if (params.fillStyle) {
                ctx.fillStyle = params.fillStyle;
                ctx.fill();
              }
              if (params.strokeStyle) {
                ctx.strokeStyle = params.strokeStyle;
                ctx.lineWidth = params.lineWidth || 1;
                ctx.stroke();
              }
              break;
              
            case 'text':
              ctx.font = params.font || '16px sans-serif';
              ctx.fillStyle = params.fillStyle || '#000';
              if (params.textAlign) ctx.textAlign = params.textAlign;
              if (params.textBaseline) ctx.textBaseline = params.textBaseline;
              
              if (params.fillText) {
                ctx.fillText(params.text, params.x, params.y, params.maxWidth);
              }
              if (params.strokeText) {
                ctx.strokeStyle = params.strokeStyle || '#000';
                ctx.strokeText(params.text, params.x, params.y, params.maxWidth);
              }
              break;
              
            case 'gradient':
              let gradient;
              if (params.type === 'linear') {
                gradient = ctx.createLinearGradient(params.x0, params.y0, params.x1, params.y1);
              } else if (params.type === 'radial') {
                gradient = ctx.createRadialGradient(params.x0, params.y0, params.r0, params.x1, params.y1, params.r1);
              }
              
              params.stops.forEach(stop => {
                gradient.addColorStop(stop.offset, stop.color);
              });
              
              ctx.fillStyle = gradient;
              break;
              
            case 'transform':
              if (params.reset) ctx.setTransform(1, 0, 0, 1, 0, 0);
              if (params.translate) ctx.translate(params.translate.x, params.translate.y);
              if (params.rotate) ctx.rotate(params.rotate);
              if (params.scale) ctx.scale(params.scale.x, params.scale.y);
              break;
              
            case 'save':
              ctx.save();
              break;
              
            case 'restore':
              ctx.restore();
              break;
              
            case 'clear':
              ctx.clearRect(params.x || 0, params.y || 0, 
                          params.width || ctx.canvas.width, 
                          params.height || ctx.canvas.height);
              break;
              
            default:
              console.warn('Unknown draw operation:', type);
          }
        }

        // 生成ImageBitmap
        async generateImageBitmap(canvasId) {
          const canvasData = this.canvases.get(canvasId);
          if (!canvasData) {
            return { success: false, error: 'Canvas not found' };
          }

          try {
            const bitmap = await createImageBitmap(canvasData.canvas);
            return {
              success: true,
              bitmap: bitmap
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }

        // 获取ImageData
        getImageData(canvasId, x = 0, y = 0, width = null, height = null) {
          const canvasData = this.canvases.get(canvasId);
          if (!canvasData) {
            return { success: false, error: 'Canvas not found' };
          }

          const { context, canvas } = canvasData;
          const w = width || canvas.width;
          const h = height || canvas.height;
          
          try {
            const imageData = context.getImageData(x, y, w, h);
            return {
              success: true,
              imageData: imageData
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }

        // 清理Canvas
        cleanup(canvasId) {
          if (this.canvases.has(canvasId)) {
            this.canvases.delete(canvasId);
            return { success: true };
          }
          return { success: false, error: 'Canvas not found' };
        }
      }

      const drawer = new OffscreenDrawer();

      self.onmessage = async function(e) {
        const { id, command, params } = e.data;
        let result;

        try {
          switch (command) {
            case 'createCanvas':
              result = drawer.createCanvas(params.id, params.width, params.height, params.canvas);
              break;
              
            case 'drawComplexShape':
              result = drawer.drawComplexShape(params.canvasId, params.operations);
              break;
              
            case 'generateImageBitmap':
              result = await drawer.generateImageBitmap(params.canvasId);
              break;
              
            case 'getImageData':
              result = drawer.getImageData(params.canvasId, params.x, params.y, params.width, params.height);
              break;
              
            case 'cleanup':
              result = drawer.cleanup(params.canvasId);
              break;
              
            default:
              result = { success: false, error: 'Unknown command: ' + command };
          }

          self.postMessage({
            id,
            success: result.success,
            data: result
          });

        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: error.message
          });
        }
      };
    `;
  }

  // 处理Worker消息
  handleWorkerMessage(e) {
    const { id, success, data, error } = e.data;
    
    // 这里应该有回调处理逻辑
    console.log('Worker message received:', { id, success, data, error });
  }

  // 在Worker中绘制复杂图形
  async drawComplexShapeInWorker(canvasId, operations) {
    if (!this.isSupported) {
      return this.drawComplexShapeOnMainThread(canvasId, operations);
    }

    const worker = this.getWorker();
    const messageId = this.generateMessageId();
    
    return new Promise((resolve, reject) => {
      const messageHandler = (e) => {
        if (e.data.id === messageId) {
          worker.removeEventListener('message', messageHandler);
          
          if (e.data.success) {
            resolve(e.data.data);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };
      
      worker.addEventListener('message', messageHandler);
      
      worker.postMessage({
        id: messageId,
        command: 'drawComplexShape',
        params: { canvasId, operations }
      });
      
      // 30秒超时
      setTimeout(() => {
        worker.removeEventListener('message', messageHandler);
        reject(new Error('Worker operation timeout'));
      }, 30000);
    });
  }

  // 主线程绘制回退
  drawComplexShapeOnMainThread(canvasId, operations) {
    const canvasData = this.canvases.get(canvasId);
    if (!canvasData) {
      throw new Error('Canvas not found');
    }

    const { context } = canvasData;
    const startTime = performance.now();
    
    operations.forEach(operation => {
      this.executeDrawOperation(context, operation);
    });
    
    const endTime = performance.now();
    
    return {
      success: true,
      renderTime: endTime - startTime
    };
  }

  // 执行绘制操作（主线程版本）
  executeDrawOperation(ctx, operation) {
    // 实现与Worker中相同的绘制逻辑
    // 这里可以复用Worker中的代码逻辑
  }

  // 将OffscreenCanvas转换为可见Canvas
  async transferToVisibleCanvas(offscreenCanvasId, targetCanvas) {
    const canvasData = this.canvases.get(offscreenCanvasId);
    if (!canvasData) {
      throw new Error('OffscreenCanvas not found');
    }

    if (canvasData.isFallback) {
      // Fallback Canvas直接绘制
      const targetCtx = targetCanvas.getContext('2d');
      targetCtx.drawImage(canvasData.canvas, 0, 0);
      return;
    }

    try {
      // 创建ImageBitmap
      const bitmap = await createImageBitmap(canvasData.canvas);
      
      // 绘制到目标Canvas
      const targetCtx = targetCanvas.getContext('2d');
      targetCtx.drawImage(bitmap, 0, 0);
      
      // 清理ImageBitmap
      bitmap.close();
    } catch (error) {
      console.error('Transfer to visible canvas failed:', error);
      throw error;
    }
  }

  // 生成ID
  generateCanvasId() {
    return 'canvas_' + Math.random().toString(36).substr(2, 9);
  }

  generateWorkerId() {
    return 'worker_' + Math.random().toString(36).substr(2, 9);
  }

  generateMessageId() {
    return 'msg_' + Math.random().toString(36).substr(2, 9);
  }

  // 清理资源
  cleanup() {
    // 终止所有Workers
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.workerPool.length = 0;
    
    // 清理Canvas缓存
    this.canvases.clear();
  }
}

// 移动端OffscreenCanvas优化策略
const MOBILE_OFFSCREEN_STRATEGIES = {
  advantages: {
    mainThreadRelief: {
      description: 'Offload complex drawing to background threads',
      benefit: 'Maintains 60fps UI interactions',
      useCase: 'Complex data visualizations, particle systems'
    },
    
    parallelProcessing: {
      description: 'Multiple workers for concurrent drawing',
      benefit: 'Better utilization of multi-core mobile CPUs',
      useCase: 'Batch image processing, multiple overlay layers'
    },
    
    memoryEfficiency: {
      description: 'Better memory management in workers',
      benefit: 'Reduced main thread memory pressure',
      useCase: 'Large canvas operations, image manipulations'
    },
    
    noBlocking: {
      description: 'Non-blocking complex operations',
      benefit: 'Responsive UI during heavy drawing tasks',
      useCase: 'Real-time chart updates, animated backgrounds'
    }
  },
  
  limitations: {
    browserSupport: {
      description: 'Limited browser support, especially Safari',
      mitigation: 'Implement fallback to main thread Canvas',
      impact: 'Need feature detection and graceful degradation'
    },
    
    transferCost: {
      description: 'Data transfer between main thread and worker',
      mitigation: 'Use transferable objects, minimize data transfer',
      impact: 'Can negate performance benefits for small operations'
    },
    
    apiLimitations: {
      description: 'Some Canvas features not available in workers',
      mitigation: 'Pre-process on main thread, transfer to worker',
      impact: 'Complex operations may need hybrid approach'
    },
    
    memoryOverhead: {
      description: 'Worker creation and maintenance costs',
      mitigation: 'Worker pooling, lazy initialization',
      impact: 'Consider cost/benefit for simple drawings'
    }
  },
  
  bestPractices: [
    'Use worker pools to avoid creation overhead',
    'Implement proper fallback for unsupported browsers',
    'Batch operations to minimize transfer costs',
    'Use transferable objects for large data',
    'Monitor worker performance and adjust strategy',
    'Clean up workers and ImageBitmaps properly',
    'Consider main thread for simple operations',
    'Test performance on actual mobile devices'
  ],
  
  performanceThresholds: {
    worthwhileComplexity: 'Operations taking > 16ms on main thread',
    dataTransferLimit: 'Minimize transfers > 1MB',
    workerCount: 'Limit to CPU cores - 1 for mobile',
    fallbackTrigger: 'Use main thread if worker setup > operation time'
  }
};

export {
  OffscreenCanvasManager,
  MOBILE_OFFSCREEN_STRATEGIES
};